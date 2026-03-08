import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Fetch the YouTube page to get caption tracks
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();

  // Extract captions JSON from page
  const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
  if (!captionMatch) {
    // Try alternative pattern
    const altMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
    if (!altMatch) throw new Error("No captions available for this video");
    const tracks = JSON.parse(altMatch[1]);
    if (!tracks.length) throw new Error("No caption tracks found");
    const captionUrl = tracks[0].baseUrl;
    return await fetchCaptionText(captionUrl);
  }

  let captionsJson;
  try {
    captionsJson = JSON.parse(captionMatch[1]);
  } catch {
    // Try extracting captionTracks directly
    const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
    if (!tracksMatch) throw new Error("Could not parse captions data");
    const tracks = JSON.parse(tracksMatch[1]);
    if (!tracks.length) throw new Error("No caption tracks found");
    const captionUrl = tracks[0].baseUrl;
    return await fetchCaptionText(captionUrl);
  }

  const tracks = captionsJson?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) throw new Error("No caption tracks found");

  // Prefer English, fallback to first
  const enTrack = tracks.find((t: any) => t.languageCode === "en") || tracks[0];
  return await fetchCaptionText(enTrack.baseUrl);
}

async function fetchCaptionText(captionUrl: string): Promise<string> {
  const res = await fetch(captionUrl);
  const xml = await res.text();

  // Parse XML transcript - extract text from <text> tags
  const textParts: string[] = [];
  const regex = /<text[^>]*>(.*?)<\/text>/gs;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (text) textParts.push(text);
  }

  if (textParts.length === 0) throw new Error("Could not extract transcript text");
  return textParts.join(" ");
}

async function getVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return data.title || "YouTube Video";
  } catch {
    return "YouTube Video";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Get transcript and title
    const [transcript, videoTitle] = await Promise.all([
      fetchYouTubeTranscript(videoId),
      getVideoTitle(videoId),
    ]);

    if (transcript.length < 50) {
      return new Response(JSON.stringify({ error: "Transcript too short to generate notes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Classify the content
    const classifyRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You classify video transcripts. Return ONLY valid JSON, no backticks." },
          {
            role: "user",
            content: `Classify this YouTube video transcript. Return:
{"type": "academic" | "meeting" | "personal" | "mixed", "confidence": 0.0-1.0}

Transcript (first 2000 chars): "${transcript.slice(0, 2000)}"`,
          },
        ],
      }),
    });

    const classData = await classifyRes.json();
    let classContent = classData.choices?.[0]?.message?.content || '{"type":"academic"}';
    classContent = classContent.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    let classification;
    try { classification = JSON.parse(classContent); } catch { classification = { type: "academic" }; }

    const type = classification.type || "academic";

    // Step 3: Generate structured notes based on type
    const notesPrompt = type === "meeting"
      ? `Convert this YouTube video transcript into structured meeting notes. Return ONLY valid JSON.

Transcript: "${transcript}"

Return:
{
  "title": "${videoTitle}",
  "attendees": ["speaker names if identifiable"],
  "agenda": "What the video/meeting was about",
  "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}],
  "decisions": ["Key decisions or conclusions"],
  "problems": ["Problems discussed"],
  "key_numbers": [{"label": "metric", "value": "number"}],
  "structured_notes": "Formatted notes in markdown with ## headings, bullet points",
  "summary": "2-3 sentence summary"
}`
      : `Convert this YouTube video transcript into structured academic notes. Return ONLY valid JSON.

Transcript: "${transcript}"

Return:
{
  "subject": "detected subject/topic",
  "title": "${videoTitle}",
  "structured_notes": "Full formatted notes in markdown with ## headings, bullet points, **bold** terms",
  "key_concepts": ["concept1", "concept2"],
  "summary": "2-3 sentence overview",
  "definitions": [{"term": "term1", "definition": "def1"}],
  "formulas": [{"name": "formula name", "formula": "formula text"}],
  "comparisons": [{"item1": "A", "item2": "B", "basis": "comparison basis"}]
}`;

    const notesRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate structured notes from video transcripts. Return ONLY valid JSON." },
          { role: "user", content: notesPrompt },
        ],
      }),
    });

    if (!notesRes.ok) {
      if (notesRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (notesRes.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const notesData = await notesRes.json();
    let notesContent = notesData.choices?.[0]?.message?.content || "{}";
    notesContent = notesContent.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    let notes;
    try { notes = JSON.parse(notesContent); } catch { notes = { parse_error: true, raw: notesContent }; }

    // Generate a quick summary
    const summary = notes.summary || "Notes generated from YouTube video";

    return new Response(JSON.stringify({
      type,
      title: videoTitle,
      transcript: transcript.slice(0, 5000),
      summary,
      notes,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
