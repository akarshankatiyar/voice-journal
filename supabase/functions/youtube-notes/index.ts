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
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
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

function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, "") // Remove [Music], [Applause] etc
    .replace(/\s+/g, " ")
    .trim();
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ===== METHOD 1: Direct timedtext API =====
async function fetchViaTimedtextAPI(videoId: string): Promise<string | null> {
  console.log("Method 1: Direct timedtext API...");
  const langs = ["en", "en-US", "en-GB", "a.en", "hi"];
  
  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      console.log(`  Trying lang=${lang}...`);
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      });
      if (res.ok) {
        const xml = await res.text();
        const text = extractTextFromXml(xml);
        if (text.length > 50) {
          console.log(`  ✅ timedtext worked! lang=${lang}, ${text.length} chars`);
          return text;
        }
        console.log(`  lang=${lang}: too short (${text.length} chars)`);
      } else {
        console.log(`  lang=${lang}: HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`  lang=${lang}: error ${e}`);
    }
  }
  return null;
}

// ===== METHOD 2: Scrape page HTML for caption track URLs =====
async function fetchViaPageScrape(videoId: string): Promise<string | null> {
  console.log("Method 2: Page scrape for captionTracks...");
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJlbiACGgYIgJnOqwY; CONSENT=PENDING+987",
      },
    });
    
    if (!pageRes.ok) {
      console.log(`  Page fetch failed: ${pageRes.status}`);
      return null;
    }
    
    const html = await pageRes.text();
    console.log(`  Got HTML (${html.length} chars)`);
    
    // Extract captionTracks from ytInitialPlayerResponse
    const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script)/s);
    if (!playerMatch) {
      console.log("  No ytInitialPlayerResponse found in HTML");
      
      // Try alternative: look for captions in the raw HTML
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionMatch) {
        console.log("  Found captionTracks via regex!");
        try {
          const tracks = JSON.parse(captionMatch[1]);
          return await fetchFromCaptionTracks(tracks);
        } catch (e) {
          console.log(`  Failed to parse captionTracks: ${e}`);
        }
      }
      return null;
    }
    
    try {
      const playerData = JSON.parse(playerMatch[1]);
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!tracks || tracks.length === 0) {
        console.log("  No caption tracks in player response");
        // Check if captions are disabled
        const playability = playerData?.playabilityStatus?.status;
        console.log(`  Playability status: ${playability}`);
        return null;
      }
      
      console.log(`  Found ${tracks.length} caption tracks!`);
      return await fetchFromCaptionTracks(tracks);
    } catch (e) {
      console.log(`  Failed to parse player response: ${e}`);
    }
    
    return null;
  } catch (e) {
    console.log(`  Page scrape error: ${e}`);
    return null;
  }
}

// ===== METHOD 3: Innertube player API with embedded client =====
async function fetchViaInnertubeAPI(videoId: string): Promise<string | null> {
  console.log("Method 3: Innertube API (WEB_EMBEDDED_PLAYER)...");
  
  const clients = [
    {
      name: "WEB_EMBEDDED_PLAYER",
      clientName: "WEB_EMBEDDED_PLAYER",
      clientVersion: "2.20241126.01.00",
      clientId: "56",
    },
    {
      name: "WEB",
      clientName: "WEB", 
      clientVersion: "2.20241120.00.00",
      clientId: "1",
    },
  ];
  
  for (const client of clients) {
    try {
      console.log(`  Trying ${client.name}...`);
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": UA,
            "X-YouTube-Client-Name": client.clientId,
            "X-YouTube-Client-Version": client.clientVersion,
            "Origin": "https://www.youtube.com",
            "Referer": `https://www.youtube.com/watch?v=${videoId}`,
          },
          body: JSON.stringify({
            context: {
              client: {
                hl: "en",
                gl: "US",
                clientName: client.clientName,
                clientVersion: client.clientVersion,
              },
            },
            videoId,
          }),
        }
      );
      
      if (!res.ok) {
        console.log(`  ${client.name}: HTTP ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (tracks && tracks.length > 0) {
        console.log(`  ✅ ${client.name}: found ${tracks.length} tracks`);
        return await fetchFromCaptionTracks(tracks);
      }
      
      console.log(`  ${client.name}: no caption tracks`);
    } catch (e) {
      console.log(`  ${client.name}: error ${e}`);
    }
  }
  
  return null;
}

// Helper: fetch transcript text from caption track objects
async function fetchFromCaptionTracks(tracks: any[]): Promise<string | null> {
  // Prefer English, then auto-generated English, then first available
  const enTrack = tracks.find((t: any) => t.languageCode === "en" && t.kind !== "asr")
    || tracks.find((t: any) => t.languageCode === "en")
    || tracks.find((t: any) => t.languageCode?.startsWith("en"))
    || tracks[0];
  
  if (!enTrack?.baseUrl) {
    console.log("  No valid track URL found");
    return null;
  }
  
  let captionUrl = enTrack.baseUrl;
  // Ensure srv3 format for XML parsing
  if (captionUrl.includes("fmt=")) {
    captionUrl = captionUrl.replace(/fmt=[^&]+/, "fmt=srv3");
  } else {
    captionUrl += "&fmt=srv3";
  }
  
  console.log(`  Fetching captions from track (lang: ${enTrack.languageCode})...`);
  const capRes = await fetch(captionUrl, { headers: { "User-Agent": UA } });
  
  if (!capRes.ok) {
    console.log(`  Caption fetch failed: ${capRes.status}`);
    return null;
  }
  
  const xml = await capRes.text();
  const text = extractTextFromXml(xml);
  
  if (text.length > 50) {
    console.log(`  ✅ Got transcript: ${text.length} chars`);
    return text;
  }
  
  console.log(`  Transcript too short: ${text.length} chars`);
  return null;
}

// ===== MAIN: Try all methods in sequence =====
async function fetchTranscript(videoId: string): Promise<string> {
  // Method 1: Direct timedtext API (simplest, fastest)
  let transcript = await fetchViaTimedtextAPI(videoId);
  if (transcript) return cleanTranscript(transcript);
  
  // Method 2: Scrape page HTML for caption track URLs
  transcript = await fetchViaPageScrape(videoId);
  if (transcript) return cleanTranscript(transcript);
  
  // Method 3: Innertube player API
  transcript = await fetchViaInnertubeAPI(videoId);
  if (transcript) return cleanTranscript(transcript);
  
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
