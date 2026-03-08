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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ");
}

function extractTextFromXml(xml: string): string {
  const textParts: string[] = [];
  const regex = /<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "")).trim();
    if (text) textParts.push(text);
  }
  return textParts.join(" ");
}

async function fetchTranscriptFromPage(videoId: string): Promise<string> {
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const pageRes = await fetch(pageUrl, { headers });
  if (!pageRes.ok) throw new Error(`Failed to fetch YouTube page: ${pageRes.status}`);
  const html = await pageRes.text();

  // Extract captions from ytInitialPlayerResponse
  const playerRespMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!playerRespMatch) {
    throw new Error("Could not find player response in page");
  }

  let playerResp: any;
  try {
    playerResp = JSON.parse(playerRespMatch[1]);
  } catch {
    throw new Error("Failed to parse player response");
  }

  const captions = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error("No captions available for this video. The video must have subtitles/CC enabled.");
  }

  // Prefer English, fallback to first available
  const enTrack = captions.find((t: any) => t.languageCode?.startsWith("en")) || captions[0];
  let captionUrl = enTrack.baseUrl;

  // Ensure srv3 format for XML parsing
  if (captionUrl.includes("fmt=")) {
    captionUrl = captionUrl.replace(/fmt=[^&]+/, "fmt=srv3");
  } else {
    captionUrl += "&fmt=srv3";
  }

  const capRes = await fetch(captionUrl, { headers });
  if (!capRes.ok) throw new Error(`Failed to fetch caption track: ${capRes.status}`);
  const xml = await capRes.text();
  const text = extractTextFromXml(xml);

  if (text.length < 50) {
    throw new Error("Transcript too short or empty");
  }

  return text;
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

    console.log(`Processing video: ${videoId}`);

    const [transcript, videoTitle] = await Promise.all([
      fetchTranscriptFromPage(videoId),
      getVideoTitle(videoId),
    ]);

    console.log(`Got transcript (${transcript.length} chars) for: ${videoTitle}`);

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
      ? `Convert this YouTube video transcript into structured meeting notes. Return ONLY valid JSON.\n\nTranscript: "${transcript.slice(0, 15000)}"\n\nReturn:\n{"title": "${videoTitle}", "attendees": ["speaker names if identifiable"], "agenda": "What the video/meeting was about", "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}], "decisions": ["Key decisions or conclusions"], "structured_notes": "Formatted notes in markdown with ## headings, bullet points", "summary": "2-3 sentence summary"}`
      : `Convert this YouTube video transcript into structured academic notes. Return ONLY valid JSON.\n\nTranscript: "${transcript.slice(0, 15000)}"\n\nReturn:\n{"subject": "detected subject/topic", "title": "${videoTitle}", "structured_notes": "Full formatted notes in markdown with ## headings, bullet points, **bold** terms", "key_concepts": ["concept1", "concept2"], "summary": "2-3 sentence overview", "definitions": [{"term": "term1", "definition": "def1"}]}`;

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
