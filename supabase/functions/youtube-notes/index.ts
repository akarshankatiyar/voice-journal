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
  // Method 1: Try fetching via timedtext API directly (works for auto-captions)
  const langs = ["en", "en-US", "en-GB", ""];
  for (const lang of langs) {
    try {
      const ttUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      const res = await fetch(ttUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      if (res.ok) {
        const xml = await res.text();
        const text = extractTextFromXml(xml);
        if (text.length > 50) return text;
      } else {
        await res.text(); // consume body
      }
    } catch { /* try next */ }
  }

  // Method 2: Scrape the watch page for caption track URLs
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  const html = await pageRes.text();

  // Extract captionTracks from ytInitialPlayerResponse
  const tracksMatch = html.match(/"captionTracks"\s*:\s*(\[.*?\])/s);
  if (tracksMatch) {
    try {
      const tracks = JSON.parse(tracksMatch[1]);
      if (tracks.length > 0) {
        // Prefer English
        const enTrack = tracks.find((t: any) => t.languageCode?.startsWith("en")) || tracks[0];
        let captionUrl = enTrack.baseUrl;
        // Ensure we get srv3 format
        if (!captionUrl.includes("fmt=")) captionUrl += "&fmt=srv3";
        const capRes = await fetch(captionUrl);
        const xml = await capRes.text();
        const text = extractTextFromXml(xml);
        if (text.length > 50) return text;
      }
    } catch { /* fall through */ }
  }

  // Method 3: Try auto-generated captions via asr_langs
  const asrMatch = html.match(/"defaultAudioTrackIndex"\s*:\s*\d+|"captionTracks"\s*:/);
  if (!asrMatch) {
    // Try fetching with asr (auto-generated) param
    try {
      const ttUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`;
      const res = await fetch(ttUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      if (res.ok) {
        const xml = await res.text();
        const text = extractTextFromXml(xml);
        if (text.length > 50) return text;
      } else {
        await res.text();
      }
    } catch { /* fall through */ }
  }

  throw new Error("No captions available for this video. Please try a video with subtitles/CC enabled.");
}

function extractTextFromXml(xml: string): string {
  const textParts: string[] = [];
  // Handle both <text> and <p> tags (different XML formats)
  const regex = /<(?:text|p)[^>]*>(.*?)<\/(?:text|p)>/gs;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let text = match[1]
      .replace(/<[^>]+>/g, "") // strip nested tags
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n/g, " ")
      .trim();
    if (text) textParts.push(text);
  }
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [transcript, videoTitle] = await Promise.all([
      fetchYouTubeTranscript(videoId),
      getVideoTitle(videoId),
    ]);

    if (transcript.length < 50) {
      return new Response(JSON.stringify({ error: "Transcript too short to generate notes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Classify content
    const classifyRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You classify video transcripts. Return ONLY valid JSON, no backticks." },
          { role: "user", content: `Classify this YouTube video transcript. Return: {"type": "academic" | "meeting" | "personal" | "mixed", "confidence": 0.0-1.0}\n\nTranscript (first 2000 chars): "${transcript.slice(0, 2000)}"` },
        ],
      }),
    });

    const classData = await classifyRes.json();
    let classContent = classData.choices?.[0]?.message?.content || '{"type":"academic"}';
    classContent = classContent.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    let classification;
    try { classification = JSON.parse(classContent); } catch { classification = { type: "academic" }; }
    const type = classification.type || "academic";

    // Generate structured notes
    const notesPrompt = type === "meeting"
      ? `Convert this YouTube video transcript into structured meeting notes. Return ONLY valid JSON.\n\nTranscript: "${transcript}"\n\nReturn:\n{"title": "${videoTitle}", "attendees": ["speaker names if identifiable"], "agenda": "What the video/meeting was about", "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}], "decisions": ["Key decisions or conclusions"], "structured_notes": "Formatted notes in markdown with ## headings, bullet points", "summary": "2-3 sentence summary"}`
      : `Convert this YouTube video transcript into structured academic notes. Return ONLY valid JSON.\n\nTranscript: "${transcript}"\n\nReturn:\n{"subject": "detected subject/topic", "title": "${videoTitle}", "structured_notes": "Full formatted notes in markdown with ## headings, bullet points, **bold** terms", "key_concepts": ["concept1", "concept2"], "summary": "2-3 sentence overview", "definitions": [{"term": "term1", "definition": "def1"}]}`;

    const notesRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate structured notes from video transcripts. Return ONLY valid JSON." },
          { role: "user", content: notesPrompt },
        ],
      }),
    });

    if (!notesRes.ok) {
      const errBody = await notesRes.text();
      console.error("AI gateway error:", notesRes.status, errBody);
      if (notesRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI processing failed");
    }

    const notesData = await notesRes.json();
    let notesContent = notesData.choices?.[0]?.message?.content || "{}";
    notesContent = notesContent.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    let notes;
    try { notes = JSON.parse(notesContent); } catch { notes = { parse_error: true, raw: notesContent }; }

    return new Response(JSON.stringify({
      type,
      title: videoTitle,
      transcript: transcript.slice(0, 5000),
      summary: notes.summary || "Notes generated from YouTube video",
      notes,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-notes error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("No captions") ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
