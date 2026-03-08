import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { YoutubeTranscript } from "npm:youtube-transcript@1.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, "") // Remove [Music], [Applause] etc
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTranscript(videoId: string): Promise<string> {
  console.log(`Fetching transcript for ${videoId} using youtube-transcript package...`);

  // Try multiple language codes
  const langAttempts = [
    undefined, // default (auto-detect)
    "en",
    "en-US",
    "hi",
  ];

  for (const lang of langAttempts) {
    try {
      const config = lang ? { lang } : undefined;
      console.log(`  Trying lang=${lang || "auto"}...`);
      const segments = await YoutubeTranscript.fetchTranscript(videoId, config);

      if (segments && segments.length > 0) {
        const text = segments.map((s: any) => s.text).join(" ");
        const cleaned = cleanTranscript(text);
        if (cleaned.length > 50) {
          console.log(`  ✅ Got transcript: ${cleaned.length} chars (lang=${lang || "auto"})`);
          return cleaned;
        }
      }
      console.log(`  lang=${lang || "auto"}: no usable content`);
    } catch (e: any) {
      console.log(`  lang=${lang || "auto"}: ${e.message || e}`);
    }
  }

  throw new Error("No captions available for this video. The video must have subtitles/CC enabled.");
}

async function getVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
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

    console.log(`=== Processing video: ${videoId} ===`);

    const [transcript, videoTitle] = await Promise.all([
      fetchTranscript(videoId),
      getVideoTitle(videoId),
    ]);

    console.log(`Got transcript (${transcript.length} chars) for: ${videoTitle}`);

    // Classify the content type
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

    // Generate structured notes using Gemini
    const notesPrompt = type === "meeting"
      ? `This is a transcript from a YouTube video. Convert it into structured meeting notes. Return ONLY valid JSON.\n\nTranscript: "${transcript.slice(0, 15000)}"\n\nReturn:\n{"title": "${videoTitle}", "attendees": ["speaker names if identifiable"], "agenda": "What the video/meeting was about", "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}], "decisions": ["Key decisions or conclusions"], "structured_notes": "Formatted notes in markdown with ## headings, bullet points", "summary": "2-3 sentence summary"}`
      : `This is a transcript from a YouTube educational video. Convert it into rich structured academic notes with:\n- ## headings for each topic\n- bullet points for key concepts\n- important definitions marked with **Definition:** prefix\n- key takeaways section at the end\n- a 3-line summary at the top\nFormat the structured_notes field in markdown.\n\nReturn ONLY valid JSON.\n\nTranscript: "${transcript.slice(0, 15000)}"\n\nReturn:\n{"subject": "detected subject/topic", "title": "${videoTitle}", "structured_notes": "Full formatted notes in markdown", "key_concepts": ["concept1", "concept2"], "summary": "2-3 sentence overview", "definitions": [{"term": "term1", "definition": "def1"}]}`;

    const notesRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate structured notes from video transcripts. Return ONLY valid JSON, no markdown code blocks." },
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
      if (notesRes.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      type, title: videoTitle,
      transcript: transcript.slice(0, 5000),
      summary: notes.summary || "Notes generated from YouTube video",
      notes,
      source: "youtube",
      videoId,
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
