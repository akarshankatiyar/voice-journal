

## Problem Analysis

The current implementation has **automatic mic stop** after 2 minutes of silence:
- `SILENCE_TIMEOUT_MS = 2 * 60 * 1000` (2 minutes)
- `resetSilenceTimer()` function triggers auto-stop
- `onAutoStopRef.current` callback processes transcript automatically
- Timer resets on each valid transcript chunk

The user wants **completely manual control** — mic stays on until the user manually clicks stop.

## Solution: Remove All Auto-Stop Logic

### File: `src/hooks/useVoiceCapture.ts`

**Changes:**
1. **Remove** `SILENCE_TIMEOUT_MS` constant
2. **Remove** `silenceTimerRef` ref
3. **Remove** `onAutoStopRef` ref
4. **Remove** `resetSilenceTimer` function entirely
5. **Remove** `onAutoStop` parameter from `startRecording`
6. **Remove** all `resetSilenceTimer()` calls in `transcribeChunk` and `startRecording`
7. **Remove** timer cleanup in `stopRecording`

**Result:** Mic runs continuously until user manually clicks stop button.

### File: `src/components/recording/MicButton.tsx`

**Changes:**
1. **Remove** the `onAutoStop` callback passed to `startRecording`
2. Call `startRecording()` with no parameters

**Before:**
```typescript
await startRecording((transcript) => processAndSave(transcript));
```

**After:**
```typescript
await startRecording();
```

### File: `src/pages/Home.tsx`

**Changes:**
1. Same as MicButton — remove `onAutoStop` callback from `startRecording` call

## Impact

✅ Mic stays on indefinitely until manual stop
✅ User has complete control
✅ No surprise auto-stops
✅ All transcript processing still works via manual stop button
❌ No auto-save on silence (user must remember to stop)

## Files Modified
- `src/hooks/useVoiceCapture.ts`
- `src/components/recording/MicButton.tsx`
- `src/pages/Home.tsx`

