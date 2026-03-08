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

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\"/g, '"')
    .replace(/\\u0026/g, "&").replace(/\\u003c/g, "<").replace(/\\u003e/g, ">");
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
  return raw.replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();
}

// ===== STEP 1: Fetch YouTube page and extract ALL metadata =====
async function fetchPageContent(videoId: string): Promise<{
  title: string;
  description: string;
  chapters: string;
  captionTracks: any[] | null;
  rawMetadata: string;
}> {
  console.log("Step 1: Fetching YouTube page HTML...");
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJlbiACGgYIgJnOqwY; CONSENT=PENDING+987",
    },
  });

  if (!pageRes.ok) throw new Error(`Failed to fetch YouTube page: ${pageRes.status}`);
  const html = await pageRes.text();
  console.log(`  Got HTML: ${html.length} chars`);

  // Extract title
  let title = "YouTube Video";
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    title = decodeHtmlEntities(titleMatch[1]).replace(" - YouTube", "").trim();
  }
  console.log(`  Title: ${title}`);

  // Extract description from ytInitialPlayerResponse
  let description = "";
  let chapters = "";
  let captionTracks: any[] | null = null;

  // Try to get ytInitialPlayerResponse
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script)/s);
  if (playerMatch) {
    try {
      const playerData = JSON.parse(playerMatch[1]);
      
      // Get description
      const desc = playerData?.videoDetails?.shortDescription;
      if (desc) {
        description = decodeHtmlEntities(desc);
        console.log(`  Description: ${description.length} chars`);
      }

      // Get caption tracks
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        captionTracks = tracks;
        console.log(`  Found ${tracks.length} caption tracks!`);
      }
    } catch (e) {
      console.log(`  Failed to parse playerResponse: ${e}`);
    }
  }

  // Try to get ytInitialData for chapters
  const dataMatch = html.match(/ytInitialData\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script)/s);
  if (dataMatch) {
    try {
      const initialData = JSON.parse(dataMatch[1]);
      // Extract chapters from engagement panels
      const panels = initialData?.engagementPanels;
      if (panels) {
        const chaptersPanel = JSON.stringify(panels);
        const chapterMatches = chaptersPanel.match(/"title":\s*\{"simpleText":\s*"([^"]+)"\}/g);
        if (chapterMatches && chapterMatches.length > 2) {
          chapters = chapterMatches
            .map((m: string) => {
              const t = m.match(/"simpleText":\s*"([^"]+)"/);
              return t ? t[1] : "";
            })
            .filter(Boolean)
            .join("\n");
          console.log(`  Chapters: ${chapters.length} chars`);
        }
      }
    } catch (e) {
      console.log(`  Failed to parse initialData: ${e}`);
    }
  }

  // Also try extracting description from meta tags if not found
  if (!description) {
    const metaDesc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    if (metaDesc) description = decodeHtmlEntities(metaDesc[1]);
  }

  // Build raw metadata string with everything we found
  const rawMetadata = [
    `Title: ${title}`,
    description ? `\nDescription:\n${description}` : "",
    chapters ? `\nChapters:\n${chapters}` : "",
  ].filter(Boolean).join("\n");

  return { title, description, chapters, captionTracks, rawMetadata };
}

// ===== STEP 2: Try to get actual transcript from caption tracks =====
async function fetchTranscriptFromTracks(tracks: any[]): Promise<string | null> {
  console.log("Step 2: Fetching transcript from caption tracks...");
  
  const enTrack = tracks.find((t: any) => t.languageCode === "en" && t.kind !== "asr")
    || tracks.find((t: any) => t.languageCode === "en")
    || tracks.find((t: any) => t.languageCode?.startsWith("en"))
    || tracks[0];

  if (!enTrack?.baseUrl) return null;

  let captionUrl = enTrack.baseUrl;
  if (captionUrl.includes("fmt=")) {
    captionUrl = captionUrl.replace(/fmt=[^&]+/, "fmt=srv3");
  } else {
    captionUrl += "&fmt=srv3";
  }

  console.log(`  Fetching captions (lang: ${enTrack.languageCode})...`);
  const capRes = await fetch(captionUrl, { headers: { "User-Agent": UA } });
  if (!capRes.ok) {
    console.log(`  Caption fetch failed: ${capRes.status}`);
    return null;
  }

  const xml = await capRes.text();
  const text = extractTextFromXml(xml);
  if (text.length > 50) {
    console.log(`  ✅ Got transcript: ${text.length} chars`);
    return cleanTranscript(text);
  }
  return null;
}

// ===== STEP 3: Try direct timedtext API =====
async function fetchViaTimedtext(videoId: string): Promise<string | null> {
  console.log("Step 3: Trying direct timedtext API...");
  const langs = ["en", "en-US", "a.en", "hi"];
  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const xml = await res.text();
        const text = extractTextFromXml(xml);
        if (text.length > 50) {
          console.log(`  ✅ timedtext worked (lang=${lang}): ${text.length} chars`);
          return cleanTranscript(text);
        }
      }
    } catch (e) {
      // continue
    }
  }
  return null;
}

// ===== MAIN FLOW =====
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

    // STEP 1: Fetch page and extract all metadata
    const { title, description, chapters, captionTracks, rawMetadata } = await fetchPageContent(videoId);

    // STEP 2: Try to get actual transcript from caption tracks found in page
    let transcript: string | null = null;
    if (captionTracks) {
      transcript = await fetchTranscriptFromTracks(captionTracks);
    }

    // STEP 3: Try direct timedtext API as fallback
    if (!transcript) {
      transcript = await fetchViaTimedtext(videoId);
    }

    // STEP 4: If no transcript, use description + chapters as content source
    const hasTranscript = !!transcript;
    const contentForAI = transcript || rawMetadata;

    if (!hasTranscript) {
      console.log("⚠️ No transcript available. Using description + metadata for notes.");
      if (contentForAI.length < 30) {
        throw new Error("Could not extract enough content from this video. Try a video with CC/subtitles enabled.");
      }
    }

    console.log(`Content for AI: ${contentForAI.length} chars (transcript: ${hasTranscript})`);

    // Classify content type
    const classifyRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You classify video content. Return ONLY valid JSON, no backticks." },
          { role: "user", content: `Classify this YouTube video content. Return: {"type": "academic" | "meeting" | "personal" | "mixed", "confidence": 0.0-1.0}\n\nContent (first 2000 chars): "${contentForAI.slice(0, 2000)}"` },
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
    const sourceNote = hasTranscript
      ? "This is a full transcript from a YouTube video."
      : "This is the title, description, and chapter information from a YouTube video (no transcript was available). Generate the best possible notes from this metadata.";

    const notesPrompt = type === "meeting"
      ? `${sourceNote} Convert it into structured meeting notes. Return ONLY valid JSON.\n\nContent: "${contentForAI.slice(0, 15000)}"\n\nReturn:\n{"title": "${title}", "attendees": ["speaker names if identifiable"], "agenda": "What the video/meeting was about", "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}], "decisions": ["Key decisions or conclusions"], "structured_notes": "Formatted notes in markdown with ## headings, bullet points", "summary": "2-3 sentence summary"}`
      : `${sourceNote} Convert it into rich structured academic notes with:\n- ## headings for each topic\n- bullet points for key concepts\n- important definitions marked with **Definition:** prefix\n- key takeaways section at the end\n- a 3-line summary at the top\nFormat the structured_notes field in markdown.\n\nReturn ONLY valid JSON.\n\nContent: "${contentForAI.slice(0, 15000)}"\n\nReturn:\n{"subject": "detected subject/topic", "title": "${title}", "structured_notes": "Full formatted notes in markdown", "key_concepts": ["concept1", "concept2"], "summary": "2-3 sentence overview", "definitions": [{"term": "term1", "definition": "def1"}]}`;

    const notesRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate structured notes from video content. Return ONLY valid JSON, no markdown code blocks." },
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

    console.log(`✅ Done! Type: ${type}, has transcript: ${hasTranscript}`);

    return new Response(JSON.stringify({
      type, title,
      transcript: (transcript || description).slice(0, 5000),
      summary: notes.summary || "Notes generated from YouTube video",
      notes,
      source: "youtube",
      videoId,
      hasTranscript,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-notes error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("No captions") || message.includes("Could not extract") ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
