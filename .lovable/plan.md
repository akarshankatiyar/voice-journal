

## Problems Found

Two bugs are causing the empty notes:

### 1. Title extraction picks up wrong content
The edge function extracts "@PortaeTenebrarum" (a channel handle) as the title instead of the actual video title. The `og:title` regex pattern fails on some pages, and fallback patterns also miss. The title then gets baked into the AI prompt as `"title": "@PortaeTenebrarum"`, so the AI returns that as the note title too.

**Fix**: Improve title extraction in the edge function — add a pattern for `"title":"..."` from `videoDetails` in `ytInitialPlayerResponse`, which is the most reliable source. Also filter out titles that look like channel handles (starting with `@`).

### 2. JSON parse fails → notes content is lost
The AI returns JSON but parsing fails (`parse_error: true`). When this happens, notes go into `{ parse_error: true, raw: "..." }`. The client code reads `data.notes.structured_notes` which is `undefined`, so the academic note is created with empty content.

**Fix in edge function**: After the initial JSON parse fails, try harder — strip more artifacts (leading/trailing text, escaped characters). Also try extracting JSON from within the raw string using regex.

**Fix in client**: When `data.notes.parse_error` is true, parse `data.notes.raw` to extract the structured notes. As a last resort, use `data.notes.raw` directly as the structured notes content since it contains the full markdown.

### Files to modify

1. **`supabase/functions/youtube-notes/index.ts`**:
   - Use `videoDetails.title` from playerResponse as primary title source
   - Filter out `@channel` handles from title
   - Add robust JSON parse recovery (strip escaped newlines, extract JSON substring)

2. **`src/components/youtube/YouTubeNotesButton.tsx`**:
   - Handle `parse_error` case: try parsing `raw`, or use raw content as structured notes
   
3. **`src/components/youtube/YouTubeImportDialog.tsx`**:
   - Same parse_error handling

