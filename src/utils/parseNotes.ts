/**
 * Extracts structured notes data from potentially malformed AI responses.
 * Handles: valid JSON, JSON in code blocks, raw JSON strings, and plain text fallback.
 */

interface ParsedNotes {
  title: string;
  subject: string;
  structured_notes: string;
  key_concepts: string[];
  summary: string;
  attendees?: string[];
  agenda?: string;
  action_items?: any[];
  decisions?: string[];
}

function tryParseJson(str: string): any | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractJsonFromRaw(raw: string): any | null {
  // Direct parse
  let result = tryParseJson(raw);
  if (result) return result;

  // Try stripping code blocks
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    result = tryParseJson(codeBlock[1].trim());
    if (result) return result;
  }

  // Try extracting JSON object with structured_notes key
  const jsonMatch = raw.match(/\{[\s\S]*"structured_notes"\s*:/);
  if (jsonMatch) {
    // Find the opening brace and try to extract the full object
    const startIdx = raw.indexOf('{');
    if (startIdx !== -1) {
      let braces = 0;
      let endIdx = -1;
      for (let i = startIdx; i < raw.length; i++) {
        if (raw[i] === '{') braces++;
        if (raw[i] === '}') braces--;
        if (braces === 0) { endIdx = i; break; }
      }
      
      let candidate = endIdx > 0 ? raw.substring(startIdx, endIdx + 1) : raw.substring(startIdx);
      
      // If unclosed, try to repair
      if (endIdx <= 0) {
        let b = 0, br = 0;
        for (const c of candidate) {
          if (c === '{') b++;
          if (c === '}') b--;
          if (c === '[') br++;
          if (c === ']') br--;
        }
        while (br > 0) { candidate += ']'; br--; }
        while (b > 0) { candidate += '}'; b--; }
      }

      // Clean control characters
      candidate = candidate.replace(/[\x00-\x1F\x7F]/g, ' ');
      result = tryParseJson(candidate);
      if (result) return result;
    }
  }

  // Try extracting just the structured_notes value using regex
  const notesMatch = raw.match(/"structured_notes"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (notesMatch) {
    try {
      const notesContent = JSON.parse(`"${notesMatch[1]}"`);
      return { structured_notes: notesContent };
    } catch {
      // Use the raw matched content, unescaping basic sequences
      return { structured_notes: notesMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
    }
  }

  return null;
}

export function resolveNotes(
  dataNotes: any,
  dataTitle: string,
  dataSummary: string
): ParsedNotes {
  const fallback: ParsedNotes = {
    title: dataTitle || 'YouTube Video',
    subject: 'General',
    structured_notes: '',
    key_concepts: [],
    summary: dataSummary || '',
  };

  if (!dataNotes) return fallback;

  // If notes were parsed successfully (no parse_error)
  if (!dataNotes.parse_error) {
    return {
      title: dataNotes.title || dataTitle || 'YouTube Video',
      subject: dataNotes.subject || 'General',
      structured_notes: dataNotes.structured_notes || '',
      key_concepts: dataNotes.key_concepts || [],
      summary: dataNotes.summary || dataSummary || '',
      attendees: dataNotes.attendees,
      agenda: dataNotes.agenda,
      action_items: dataNotes.action_items,
      decisions: dataNotes.decisions,
    };
  }

  // parse_error is true — try to extract from raw
  const raw = dataNotes.raw || '';
  if (!raw) return fallback;

  const extracted = extractJsonFromRaw(raw);
  if (extracted && extracted.structured_notes) {
    return {
      title: extracted.title || dataTitle || 'YouTube Video',
      subject: extracted.subject || 'General',
      structured_notes: extracted.structured_notes,
      key_concepts: extracted.key_concepts || [],
      summary: extracted.summary || dataSummary || '',
      attendees: extracted.attendees,
      agenda: extracted.agenda,
      action_items: extracted.action_items,
      decisions: extracted.decisions,
    };
  }

  // Last resort — if raw looks like JSON, it's probably the AI response
  // Try to strip the JSON wrapper and use content after "structured_notes": 
  if (raw.trimStart().startsWith('{')) {
    // The raw IS a JSON string being shown as text — try harder
    const snMatch = raw.match(/"structured_notes"\s*:\s*"([\s\S]+)/);
    if (snMatch) {
      // Get everything after "structured_notes": " until the next top-level key or end
      let content = snMatch[1];
      // Find the closing quote (not escaped)
      let end = -1;
      for (let i = 0; i < content.length; i++) {
        if (content[i] === '"' && content[i - 1] !== '\\') {
          end = i;
          break;
        }
      }
      if (end > 0) content = content.substring(0, end);
      content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      
      // Also try to get title and subject
      const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
      const subjectMatch = raw.match(/"subject"\s*:\s*"([^"]+)"/);
      const summaryMatch = raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      
      return {
        title: titleMatch?.[1] || dataTitle || 'YouTube Video',
        subject: subjectMatch?.[1] || 'General',
        structured_notes: content,
        key_concepts: [],
        summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : dataSummary || '',
      };
    }
  }

  // Absolute last resort: use raw as markdown
  return { ...fallback, structured_notes: raw };
}
