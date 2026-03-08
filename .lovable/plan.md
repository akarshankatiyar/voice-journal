

## Analysis of Voice Capture Issues

### Root Causes Found

**1. Transcript Repetition — Two bugs:**

- **Operator precedence bug on line 70**: The dedup condition `prev.trim() === text || text.startsWith(prev.trim()) && text.length < prev.trim().length * 1.5` is parsed as `A || (B && C)` instead of `(A || B) && C`. This means if the exact match fails, the startsWith check is too narrow and many duplicates slip through.
- **Session restart replays audio**: When `onend` fires and `buildAndStart()` creates a new `SpeechRecognition` instance, the browser may re-recognize buffered audio from the end of the previous session. The new session doesn't know about the old one, so the same words come through as "new" final results.

**2. Mic Closes & Words Lost:**

- When the browser ends the recognition session (e.g., after detecting a pause), there's an unavoidable gap between `onend` and the new `rec.start()`. Any audio during this gap is lost entirely.
- The `pendingInterimRef` only saves text already partially recognized — it can't capture audio that arrives during the restart window.
- The `no-speech` error is silently ignored (line 92), but on mobile it can trigger repeated restarts that compound the gap.

### Plan

**File: `src/hooks/useVoiceCapture.ts`** — Rewrite the core logic:

1. **Fix dedup with proper comparison**: Use normalized lowercase trimmed comparison. Track the last N characters of committed transcript (not individual phrases) to catch overlapping text from session restarts. Compare new final results against the tail of the full transcript.

2. **Add restart guard with small delay**: Add a 100ms delay before restart in `onend` to let the browser fully release the previous session. This prevents the rapid open/close loop on mobile. While 0ms delay was tried before and caused the open/close issue, 100ms is long enough for browser cleanup but short enough that word loss is minimal.

3. **Commit interim text before restart**: When `onend` fires, immediately commit `pendingInterimRef` to the transcript before starting a new session, so words recognized mid-phrase aren't lost.

4. **Handle `no-speech` error properly**: Instead of ignoring it, use it as a signal to restart cleanly with a longer delay (500ms) since there's no active speech to lose.

5. **Prevent overlapping instances**: Before calling `rec.start()`, abort any existing `recognitionRef.current` to ensure only one instance runs at a time.

