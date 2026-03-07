import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!transcript || transcript.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Transcript too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "classify") {
      systemPrompt = "You are an AI that classifies voice transcripts. Return ONLY valid JSON, no markdown backticks.";
      userPrompt = `Analyze this transcript and classify it.

Transcript: "${transcript}"

Return this exact JSON structure:
{
  "type": "personal" | "academic" | "meeting" | "mixed",
  "sub_types": ["task", "idea", "health", "shopping", "people"],
  "confidence": 0.0-1.0,
  "people_mentioned": ["name1", "name2"],
  "title": "Short descriptive title (max 6 words)",
  "corrected_transcript": "The full transcript with any unclear words corrected to make it meaningful. Only correct if 70-80% context is clear, otherwise keep original."
}

Classification rules:
- "academic": lecture, study, professor, syllabus, exam keywords
- "meeting": agenda, attendees, professional discussion
- "personal": casual conversation, family, friends
- sub_types: additional tags (task, idea, health, shopping, people)
- "task": "need to", "don't forget", "remind me"
- "idea": "what if", brainstorm, creative thought
- "health": doctor, medicine, symptoms
- "shopping": "buy", product names
- "people": person's name + conversation`;
    } else if (action === "summarize") {
      systemPrompt = "You are an AI that summarizes conversations. Return ONLY valid JSON.";
      userPrompt = `Summarize this conversation concisely. Return ONLY valid JSON.

Transcript: "${transcript}"

Return:
{
  "summary": "2-4 sentence summary",
  "key_points": ["point1", "point2", "point3"],
  "action_items": ["action1"],
  "decisions": ["decision1"]
}`;
    } else if (action === "academic_notes") {
      systemPrompt = "You are an AI that converts lectures into structured academic notes. Return ONLY valid JSON.";
      userPrompt = `Convert this lecture transcript into structured notes. Return ONLY valid JSON.

Transcript: "${transcript}"

Return:
{
  "subject": "detected subject name",
  "title": "Lecture title",
  "structured_notes": "Full formatted notes in markdown with ## headings, bullet points, **bold** important terms, formulas in code blocks",
  "key_concepts": ["concept1", "concept2"],
  "summary": "2 sentence overview",
  "definitions": [{"term": "term1", "definition": "def1"}],
  "formulas": [{"name": "formula name", "formula": "formula text"}],
  "comparisons": [{"item1": "A", "item2": "B", "basis": "comparison basis"}]
}`;
    } else if (action === "meeting_notes") {
      systemPrompt = "You are an AI that converts meeting transcripts into structured meeting notes. Return ONLY valid JSON.";
      userPrompt = `Convert this meeting transcript into structured meeting notes. Return ONLY valid JSON.

Transcript: "${transcript}"

Return:
{
  "title": "Meeting title",
  "attendees": ["name1", "name2"],
  "agenda": "What the meeting was about",
  "action_items": [{"task": "task text", "owner": "person", "due": "due date hint"}],
  "decisions": ["Key decisions made"],
  "problems": ["Problems discussed"],
  "key_numbers": [{"label": "metric", "value": "number"}],
  "structured_notes": "Formatted notes in markdown",
  "summary": "2-3 sentence executive summary"
}`;
    } else if (action === "extract_tasks") {
      systemPrompt = "You are an AI that extracts tasks from text. Return ONLY valid JSON.";
      userPrompt = `Extract all tasks, reminders, to-dos from this text. Return ONLY valid JSON array.

Text: "${transcript}"

Return: [
  { "task": "task description", "due_hint": "tomorrow/next week/no date", "priority": "high/medium/low" }
]

Return empty array [] if no tasks found.`;
    } else if (action === "extract_ideas") {
      systemPrompt = "You are an AI that extracts ideas from text. Return ONLY valid JSON.";
      userPrompt = `Extract all ideas, insights, creative thoughts. Return ONLY valid JSON array.

Text: "${transcript}"

Return: [{"idea": "text", "category": "startup/personal/creative/other"}]
Return empty array [] if nothing found.`;
    } else if (action === "daily_summary") {
      systemPrompt = "You are an AI that creates elegant daily summaries. Return ONLY valid JSON.";
      userPrompt = `Create a brief 3-line summary of everything captured today based on this data. Be warm and helpful.

Data: "${transcript}"

Return:
{
  "summary": "3 line elegant summary of the day so far",
  "smart_prompt": "A contextual nudge/suggestion based on the data (e.g. 'You have 3 pending tasks from this morning — want to review?')",
  "prompt_link": "/tasks or /academic-notes or /conversations etc"
}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean markdown backticks if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: cleaned, parse_error: true };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-transcript error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
