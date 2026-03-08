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

  // Extract title - try multiple patterns, prioritize videoDetails
  let title = "";
  
  // Try videoDetails.title from ytInitialPlayerResponse (most reliable)
  const videoDetailsTitle = html.match(/"videoDetails":\s*\{[^}]*"title"\s*:\s*"([^"]+)"/);
  if (videoDetailsTitle) title = decodeHtmlEntities(videoDetailsTitle[1]);
  
  // Try og:title
  if (!title || title.startsWith("@")) {
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (ogTitle) title = decodeHtmlEntities(ogTitle[1]);
  }
  
  // Try <title> tag
  if (!title || title.startsWith("@")) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const cleaned = decodeHtmlEntities(titleMatch[1]).replace(" - YouTube", "").trim();
      if (!cleaned.startsWith("@")) title = cleaned;
    }
  }
  
  // Try twitter:title
  if (!title || title.startsWith("@")) {
    const twTitle = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/);
    if (twTitle && !twTitle[1].startsWith("@")) title = decodeHtmlEntities(twTitle[1]);
  }

  // Filter out channel handles used as title
  if (!title || title.startsWith("@")) title = "YouTube Video";
  console.log(`  Title: ${title}`);

  // Extract description from multiple sources
  let description = "";
  let chapters = "";
  let captionTracks: any[] | null = null;
  let channelName = "";
  let keywords: string[] = [];

  // Try og:description
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
  if (ogDesc) description = decodeHtmlEntities(ogDesc[1]);

  // Try to get ytInitialPlayerResponse (primary source)
  const playerPatterns = [
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script)/s,
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s,
  ];
  
  for (const pattern of playerPatterns) {
    const playerMatch = html.match(pattern);
    if (playerMatch) {
      try {
        const playerData = JSON.parse(playerMatch[1]);
        
        // Get full description (much longer than og:description)
        const desc = playerData?.videoDetails?.shortDescription;
        if (desc && desc.length > description.length) {
          description = decodeHtmlEntities(desc);
        }

        // Get channel name
        const channel = playerData?.videoDetails?.author;
        if (channel) channelName = channel;

        // Get keywords
        const kw = playerData?.videoDetails?.keywords;
        if (kw) keywords = kw;

        // Get video length
        const lengthSeconds = playerData?.videoDetails?.lengthSeconds;
        if (lengthSeconds) {
          const mins = Math.floor(Number(lengthSeconds) / 60);
          console.log(`  Video length: ${mins} minutes`);
        }

        // Get caption tracks
        const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks && tracks.length > 0) {
          captionTracks = tracks;
          console.log(`  Found ${tracks.length} caption tracks!`);
        }
        break;
      } catch (e) {
        console.log(`  Failed to parse playerResponse: ${e}`);
      }
    }
  }

  // Try to get ytInitialData for chapters and more content
  const dataPatterns = [
    /ytInitialData\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script)/s,
    /ytInitialData\s*=\s*(\{.+?\})\s*;/s,
  ];
  
  for (const pattern of dataPatterns) {
    const dataMatch = html.match(pattern);
    if (dataMatch) {
      try {
        const initialData = JSON.parse(dataMatch[1]);
        const dataStr = JSON.stringify(initialData);
        
        // Extract chapters
        const chapterMatches = dataStr.match(/"title":\s*\{"simpleText":\s*"([^"]+)"\}/g);
        if (chapterMatches && chapterMatches.length > 2) {
          chapters = chapterMatches
            .map((m: string) => {
              const t = m.match(/"simpleText":\s*"([^"]+)"/);
              return t ? decodeHtmlEntities(t[1]) : "";
            })
            .filter(Boolean)
            .join("\n");
        }

        // Try to extract structured description with timestamps
        const descMatch = dataStr.match(/"attributedDescription":\s*\{"content":\s*"([^"]+)"/);
        if (descMatch && descMatch[1].length > description.length) {
          description = decodeHtmlEntities(descMatch[1]);
        }
        
        break;
      } catch (e) {
        console.log(`  Failed to parse initialData: ${e}`);
      }
    }
  }

  // Fallback: meta description
  if (!description) {
    const metaDesc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    if (metaDesc) description = decodeHtmlEntities(metaDesc[1]);
  }

  console.log(`  Description: ${description.length} chars`);
  console.log(`  Chapters: ${chapters.length} chars`);
  console.log(`  Channel: ${channelName}`);
  console.log(`  Keywords: ${keywords.length}`);

  // Build comprehensive raw metadata
  const rawMetadata = [
    `Video Title: ${title}`,
    channelName ? `Channel: ${channelName}` : "",
    keywords.length > 0 ? `Keywords: ${keywords.join(", ")}` : "",
    description ? `\nFull Description:\n${description}` : "",
    chapters ? `\nChapter List:\n${chapters}` : "",
  ].filter(Boolean).join("\n");

  return { title, description, chapters, captionTracks, rawMetadata };
}

// ===== STEP 2: Try to get transcript from caption tracks =====
async function fetchTranscriptFromTracks(tracks: any[]): Promise<string | null> {
  console.log("Step 2: Fetching transcript from caption tracks...");
  
  const enTrack = tracks.find((t: any) => t.languageCode === "en" && t.kind !== "asr")
    || tracks.find((t: any) => t.languageCode === "en")
    || tracks.find((t: any) => t.languageCode?.startsWith("en"))
    || tracks.find((t: any) => t.languageCode === "hi")
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
  const langs = ["en", "en-US", "a.en", "hi", "en-IN"];
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
    } catch (_e) {
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

    // STEP 2: Try to get actual transcript from caption tracks
    let transcript: string | null = null;
    if (captionTracks) {
      transcript = await fetchTranscriptFromTracks(captionTracks);
    }

    // STEP 3: Try direct timedtext API as fallback
    if (!transcript) {
      transcript = await fetchViaTimedtext(videoId);
    }

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

    // Generate structured notes with COMPREHENSIVE prompt
    const sourceNote = hasTranscript
      ? "Below is the FULL TRANSCRIPT of a YouTube video. Use every detail from it."
      : "Below is the TITLE, DESCRIPTION, KEYWORDS, and CHAPTER TITLES from a YouTube video. No transcript was available. Use your knowledge of the topic to generate comprehensive, detailed educational notes that cover the subject matter thoroughly. Expand on every concept mentioned. Generate AT LEAST 800 words of structured notes.";

    const academicPrompt = `${sourceNote}

VIDEO CONTENT:
"""
${contentForAI.slice(0, 15000)}
"""

Generate COMPREHENSIVE, DETAILED academic notes. You MUST:

1. Write a clear 3-sentence summary at the top
2. Organize content with ## headings for EACH major topic/concept  
3. Under each heading, write detailed explanations (not just bullet points)
4. Mark important terms with **Definition:** prefix and explain them thoroughly
5. Include **Important:** callouts for critical concepts
6. Include **Key Takeaway:** at the end of major sections
7. Add a ## Key Concepts section listing ALL concepts covered
8. Add a ## Summary section with final takeaways
9. If the topic involves any formulas, syntax, or code, show them with **Formula:** prefix
10. Use bullet points for lists but write full sentences for explanations

${!hasTranscript ? `CRITICAL: Since no transcript is available, use your own knowledge about "${title}" to write thorough, educational notes. Cover the topic comprehensively as if writing a study guide. Include definitions, examples, best practices, and common pitfalls. The notes should be useful even without having watched the video.` : ""}

Return ONLY valid JSON (no markdown code blocks):
{
  "subject": "detected subject/topic area",
  "title": "${title}",
  "structured_notes": "FULL comprehensive notes in markdown format (at least 600 words)",
  "key_concepts": ["concept1", "concept2", "concept3", ...],
  "summary": "2-3 sentence overview of what this video covers",
  "definitions": [{"term": "term1", "definition": "detailed definition"}, ...]
}`;

    const meetingPrompt = `${sourceNote}

VIDEO CONTENT:
"""
${contentForAI.slice(0, 15000)}
"""

Generate COMPREHENSIVE meeting notes. Return ONLY valid JSON (no markdown code blocks):
{
  "title": "${title}",
  "attendees": ["speaker names if identifiable"],
  "agenda": "Detailed description of what the video/meeting covers",
  "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}],
  "decisions": ["Key decisions or conclusions"],
  "structured_notes": "Detailed formatted notes in markdown with ## headings, bullet points, and key quotes (at least 500 words)",
  "summary": "2-3 sentence summary"
}`;

    // Use tool calling for reliable structured output
    const academicTool = {
      type: "function",
      function: {
        name: "save_academic_notes",
        description: "Save structured academic notes from a video",
        parameters: {
          type: "object",
          properties: {
            subject: { type: "string", description: "Subject/topic area" },
            title: { type: "string", description: "Note title" },
            structured_notes: { type: "string", description: "Full comprehensive notes in markdown format with ## headings, **bold**, bullet points, callouts like Definition:, Important:, Key Takeaway:, Formula: prefixes. Use LaTeX for math: $inline$ and $$block$$. At least 600 words." },
            key_concepts: { type: "array", items: { type: "string" }, description: "List of key concepts covered" },
            summary: { type: "string", description: "2-3 sentence overview" },
          },
          required: ["subject", "title", "structured_notes", "key_concepts", "summary"],
          additionalProperties: false,
        },
      },
    };

    const meetingTool = {
      type: "function",
      function: {
        name: "save_meeting_notes",
        description: "Save structured meeting notes from a video",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            attendees: { type: "array", items: { type: "string" } },
            agenda: { type: "string" },
            action_items: { type: "array", items: { type: "object", properties: { task: { type: "string" }, owner: { type: "string" }, due: { type: "string" } }, required: ["task"] } },
            decisions: { type: "array", items: { type: "string" } },
            structured_notes: { type: "string", description: "Detailed notes in markdown with ## headings. At least 500 words." },
            summary: { type: "string" },
          },
          required: ["title", "structured_notes", "summary"],
          additionalProperties: false,
        },
      },
    };

    const tool = type === "meeting" ? meetingTool : academicTool;
    const toolName = type === "meeting" ? "save_meeting_notes" : "save_academic_notes";

    const notesRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert note-taker and educator. Generate thorough, detailed, well-structured notes from video content. Always produce comprehensive output with proper markdown formatting. Whenever writing any mathematical formula, equation, or scientific notation, always wrap it in LaTeX format using single dollar signs for inline math like $formula$ and double dollar signs for block/display math like $$formula$$. For example: sigmoid function should be written as $h_\\theta(x) = \\frac{1}{1 + e^{-\\theta^T x}}$. Always use proper LaTeX notation for Greek letters like $\\theta$, $\\alpha$, $\\sigma$, $\\mu$, superscripts, subscripts, fractions, and integrals.",
          },
          { role: "user", content: type === "meeting" ? meetingPrompt : academicPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
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
    
    // Extract from tool call response
    let notes: any;
    const toolCall = notesData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        notes = JSON.parse(toolCall.function.arguments);
      } catch {
        notes = { parse_error: true, raw: toolCall.function.arguments };
      }
    } else {
      // Fallback: try content field
      let notesContent = notesData.choices?.[0]?.message?.content || "{}";
      notesContent = notesContent.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      try {
        notes = JSON.parse(notesContent);
      } catch {
        notes = { parse_error: true, raw: notesContent };
      }
    }

    console.log(`✅ Done! Type: ${type}, has transcript: ${hasTranscript}, notes length: ${JSON.stringify(notes).length}`);

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
