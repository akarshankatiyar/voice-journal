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

// Recursively search a JSON object for a key
function findNestedKey(obj: any, targetKey: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  if (targetKey in obj) return obj[targetKey];
  for (const key of Object.keys(obj)) {
    const result = findNestedKey(obj[key], targetKey);
    if (result !== undefined) return result;
  }
  return undefined;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Method 1: Fetch page HTML, extract API key + caption tracks OR transcript token
async function fetchTranscriptFromPage(videoId: string): Promise<string> {
  console.log("Method 1: Fetching video page HTML...");
  
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJlbiACGgYIgJnOqwY; CONSENT=PENDING+987",
    },
  });
  
  if (!pageRes.ok) {
    throw new Error(`Page fetch failed: ${pageRes.status}`);
  }
  
  const html = await pageRes.text();
  console.log(`Got HTML (${html.length} chars)`);
  
  // Extract INNERTUBE_API_KEY from the page
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1] : "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
  console.log(`API Key: ${apiKey}`);
  
  // Extract client version from page
  const versionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  const clientVersion = versionMatch ? versionMatch[1] : "2.20241120.00.00";
  console.log(`Client version: ${clientVersion}`);
  
  // Try to extract ytInitialPlayerResponse for caption tracks
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
  if (playerMatch) {
    try {
      const playerData = JSON.parse(playerMatch[1]);
      
      // First try: direct caption tracks
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        console.log(`Found ${tracks.length} caption tracks from page`);
        return await fetchCaptionsFromTracks(tracks);
      }
      
      // Second try: get_transcript endpoint via continuation token
      const transcriptEndpoint = findNestedKey(playerData, "getTranscriptEndpoint");
      if (transcriptEndpoint?.params) {
        console.log("Found getTranscriptEndpoint, trying get_transcript...");
        const transcript = await fetchViaGetTranscript(transcriptEndpoint.params, apiKey, clientVersion);
        if (transcript) return transcript;
      }
    } catch (e) {
      console.log("Failed to parse ytInitialPlayerResponse:", e);
    }
  }
  
  // Third try: use the extracted API key with player endpoint
  console.log("Trying player endpoint with page-extracted API key...");
  const playerRes = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": clientVersion,
        "Origin": "https://www.youtube.com",
        "Referer": `https://www.youtube.com/watch?v=${videoId}`,
      },
      body: JSON.stringify({
        context: {
          client: {
            hl: "en",
            gl: "US",
            clientName: "WEB",
            clientVersion,
          },
        },
        videoId,
      }),
    }
  );
  
  if (playerRes.ok) {
    const data = await playerRes.json();
    
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) {
      console.log(`Player endpoint: found ${tracks.length} tracks`);
      return await fetchCaptionsFromTracks(tracks);
    }
    
    // Try get_transcript from player response
    const transcriptEndpoint = findNestedKey(data, "getTranscriptEndpoint");
    if (transcriptEndpoint?.params) {
      console.log("Found getTranscriptEndpoint in player response");
      const transcript = await fetchViaGetTranscript(transcriptEndpoint.params, apiKey, clientVersion);
      if (transcript) return transcript;
    }
    
    console.log("Player response has no captions or transcript endpoint");
  } else {
    const body = await playerRes.text();
    console.log(`Player endpoint failed: ${playerRes.status} ${body.slice(0, 200)}`);
  }
  
  // Fourth try: timedtext API directly
  console.log("Trying timedtext API directly...");
  for (const lang of ["en", "en-US", "a.en"]) {
    try {
      const ttRes = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`,
        { headers: { "User-Agent": UA } }
      );
      if (ttRes.ok) {
        const xml = await ttRes.text();
        const text = extractTextFromXml(xml);
        if (text.length > 50) {
          console.log(`Timedtext API worked with lang=${lang} (${text.length} chars)`);
          return text;
        }
      }
    } catch { /* continue */ }
  }
  
  throw new Error("No captions available for this video. The video must have subtitles/CC enabled.");
}

async function fetchCaptionsFromTracks(tracks: any[]): Promise<string> {
  const enTrack = tracks.find((t: any) => t.languageCode === "en")
    || tracks.find((t: any) => t.languageCode?.startsWith("en"))
    || tracks[0];
  
  let captionUrl = enTrack.baseUrl;
  if (captionUrl.includes("fmt=")) captionUrl = captionUrl.replace(/fmt=[^&]+/, "fmt=srv3");
  else captionUrl += "&fmt=srv3";
  
  const capRes = await fetch(captionUrl, { headers: { "User-Agent": UA } });
  if (!capRes.ok) throw new Error(`Caption fetch failed: ${capRes.status}`);
  
  const xml = await capRes.text();
  const text = extractTextFromXml(xml);
  if (text.length > 50) return text;
  throw new Error("Transcript too short");
}

async function fetchViaGetTranscript(params: string, apiKey: string, clientVersion: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}&prettyPrint=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": UA,
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": clientVersion,
        },
        body: JSON.stringify({
          context: {
            client: {
              hl: "en",
              gl: "US",
              clientName: "WEB",
              clientVersion,
            },
          },
          params,
        }),
      }
    );
    
    if (!res.ok) {
      const body = await res.text();
      console.log(`get_transcript failed: ${res.status} ${body.slice(0, 300)}`);
      return null;
    }
    
    const data = await res.json();
    console.log(`get_transcript response keys: ${JSON.stringify(Object.keys(data))}`);
    
    // Extract transcript segments from the response
    const segments: string[] = [];
    
    // The response structure has transcriptRenderer > body > transcriptBodyRenderer > cueGroups
    const cueGroups = findNestedKey(data, "cueGroups");
    if (Array.isArray(cueGroups)) {
      for (const group of cueGroups) {
        const cues = group?.transcriptCueGroupRenderer?.cues;
        if (Array.isArray(cues)) {
          for (const cue of cues) {
            const text = cue?.transcriptCueRenderer?.cue?.simpleText;
            if (text) segments.push(text.trim());
          }
        }
      }
    }
    
    // Also try initialSegments
    const initialSegments = findNestedKey(data, "initialSegments");
    if (Array.isArray(initialSegments) && segments.length === 0) {
      for (const seg of initialSegments) {
        const text = seg?.transcriptSectionHeaderRenderer?.sectionHeader?.simpleText
          || seg?.transcriptSegmentRenderer?.snippet?.runs?.map((r: any) => r.text).join("");
        if (text) segments.push(text.trim());
      }
    }
    
    if (segments.length > 0) {
      const transcript = segments.join(" ");
      console.log(`get_transcript extracted ${segments.length} segments (${transcript.length} chars)`);
      if (transcript.length > 50) return transcript;
    }
    
    console.log(`get_transcript: no usable segments found. Response preview: ${JSON.stringify(data).slice(0, 500)}`);
    return null;
  } catch (e) {
    console.log("get_transcript error:", e);
    return null;
  }
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
