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
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\\n/g, " ").replace(/\n/g, " ");
}

function extractTextFromXml(xml: string): string {
  const parts: string[] = [];
  const regex = /<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const t = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "")).trim();
    if (t) parts.push(t);
  }
  return parts.join(" ");
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Try multiple Innertube client types - ANDROID is least blocked
  const clients = [
    {
      clientName: "ANDROID",
      clientVersion: "19.29.37",
      apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      userAgent: "com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip",
    },
    {
      clientName: "IOS",
      clientVersion: "19.29.1",
      apiKey: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
      userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    },
    {
      clientName: "WEB",
      clientVersion: "2.20241120.00.00",
      apiKey: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    },
  ];

  for (const client of clients) {
    try {
      console.log(`Trying client: ${client.clientName}`);
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${client.apiKey}&prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": client.userAgent,
            "X-YouTube-Client-Name": client.clientName === "ANDROID" ? "3" : client.clientName === "IOS" ? "5" : "1",
            "X-YouTube-Client-Version": client.clientVersion,
          },
          body: JSON.stringify({
            context: {
              client: {
                hl: "en",
                gl: "US",
                clientName: client.clientName,
                clientVersion: client.clientVersion,
                ...(client.clientName === "ANDROID" ? { androidSdkVersion: 34, osName: "Android", osVersion: "14", platform: "MOBILE" } : {}),
                ...(client.clientName === "IOS" ? { deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "17.5.1.21F90", platform: "MOBILE" } : {}),
              },
            },
            videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
        }
      );

      if (!res.ok) {
        console.log(`${client.clientName} returned ${res.status}`);
        await res.text(); // consume body
        continue;
      }

      const data = await res.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (!tracks || tracks.length === 0) {
        console.log(`${client.clientName}: no caption tracks found`);
        continue;
      }

      console.log(`${client.clientName}: found ${tracks.length} caption tracks`);
      const enTrack = tracks.find((t: any) => t.languageCode === "en")
        || tracks.find((t: any) => t.languageCode?.startsWith("en"))
        || tracks[0];

      let captionUrl = enTrack.baseUrl;
      if (captionUrl.includes("fmt=")) captionUrl = captionUrl.replace(/fmt=[^&]+/, "fmt=srv3");
      else captionUrl += "&fmt=srv3";

      const capRes = await fetch(captionUrl, {
        headers: { "User-Agent": client.userAgent },
      });
      if (!capRes.ok) {
        console.log(`Failed to fetch captions XML: ${capRes.status}`);
        await capRes.text();
        continue;
      }

      const xml = await capRes.text();
      const text = extractTextFromXml(xml);
      if (text.length > 50) {
        console.log(`Got transcript (${text.length} chars) via ${client.clientName}`);
        return text;
      }
      console.log(`${client.clientName}: transcript too short (${text.length} chars)`);
    } catch (e) {
      console.log(`${client.clientName} failed:`, e);
    }
  }

  throw new Error("No captions available for this video. The video must have subtitles/CC enabled.");
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
      fetchTranscript(videoId),
      getVideoTitle(videoId),
    ]);

    console.log(`Got transcript (${transcript.length} chars) for: ${videoTitle}`);

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
      type, title: videoTitle,
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
