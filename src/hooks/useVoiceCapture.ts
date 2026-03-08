import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const SILENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const RESTART_DELAY_MS = 100; // small delay to let browser release mic
const NO_SPEECH_RESTART_DELAY_MS = 500; // longer delay when no speech detected

export function useVoiceCapture() {
  const { setRecording, appendTranscript, setInterimText, clearTranscript } = useAppStore();
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoStopRef = useRef<((transcript: string) => void) | null>(null);
  const wantActiveRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInterimRef = useRef('');
  const lastErrorRef = useRef<string | null>(null);
  // Track when buildAndStart fires to detect replayed audio
  const restartTimestampRef = useRef<number>(0);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const transcript = useAppStore.getState().liveTranscript.trim();
      if (transcript.length > 10 && onAutoStopRef.current) {
        onAutoStopRef.current(transcript);
      }
      useAppStore.getState().clearTranscript();
      resetSilenceTimer();
    }, SILENCE_TIMEOUT_MS);
  }, []);

  // Check if newText is already present at the tail of the existing transcript
  const isDuplicateOfTail = useCallback((newText: string): boolean => {
    const fullTranscript = useAppStore.getState().liveTranscript;
    if (!fullTranscript || !newText) return false;

    const normalizedNew = newText.trim().toLowerCase();
    const normalizedFull = fullTranscript.trim().toLowerCase();

    if (normalizedNew.length === 0) return true;

    // Check if the tail of the transcript already contains this text
    // Use last 300 chars for comparison to catch overlaps from restarts
    const tail = normalizedFull.slice(-300);

    // Exact match at tail end
    if (tail.endsWith(normalizedNew)) return true;

    // Check if new text significantly overlaps with the tail
    // e.g. tail ends with "we apply external voltage" and new text is "external voltage across"
    // Find the longest suffix of tail that is a prefix of newText
    const minOverlap = Math.min(normalizedNew.length, 15); // at least 15 chars overlap
    for (let i = Math.min(tail.length, normalizedNew.length); i >= minOverlap; i--) {
      const tailSuffix = tail.slice(-i);
      if (normalizedNew.startsWith(tailSuffix)) {
        // The new text overlaps — only append the non-overlapping part
        return true; // treat as duplicate; the overlap handling below will add the new part
      }
    }

    return false;
  }, []);

  // Get the non-overlapping portion of newText relative to the transcript tail
  const getNonOverlappingText = useCallback((newText: string): string => {
    const fullTranscript = useAppStore.getState().liveTranscript;
    if (!fullTranscript || !newText) return newText;

    const normalizedNew = newText.trim().toLowerCase();
    const normalizedFull = fullTranscript.trim().toLowerCase();
    const tail = normalizedFull.slice(-300);

    // Find overlapping prefix
    const minOverlap = Math.min(normalizedNew.length, 10);
    for (let i = Math.min(tail.length, normalizedNew.length); i >= minOverlap; i--) {
      const tailSuffix = tail.slice(-i);
      if (normalizedNew.startsWith(tailSuffix)) {
        // Return only the new portion (preserving original casing)
        const remaining = newText.trim().slice(i);
        return remaining;
      }
    }

    return newText;
  }, []);

  const abortCurrent = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const buildAndStart = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !wantActiveRef.current) return;

    // Abort any existing instance to prevent overlapping
    abortCurrent();

    // Commit any pending interim text from the previous session
    if (pendingInterimRef.current.trim()) {
      const pending = pendingInterimRef.current.trim();
      if (!isDuplicateOfTail(pending)) {
        const nonOverlapping = getNonOverlappingText(pending);
        if (nonOverlapping.trim()) {
          appendTranscript(nonOverlapping);
        }
      }
      pendingInterimRef.current = '';
      setInterimText('');
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) continue;

          // Check against the full transcript tail for dedup
          if (!isDuplicateOfTail(text)) {
            const nonOverlapping = getNonOverlappingText(text);
            if (nonOverlapping.trim()) {
              appendTranscript(nonOverlapping);
            } else {
              // Even if fully overlapping, still append the original
              // to avoid losing genuinely repeated speech
              appendTranscript(result[0].transcript);
            }
          }
          pendingInterimRef.current = '';
          resetSilenceTimer();
        } else {
          interim += result[0].transcript;
          pendingInterimRef.current = interim;
          resetSilenceTimer();
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (event: any) => {
      lastErrorRef.current = event.error;
      if (event.error === 'aborted') return; // intentional abort, onend will handle restart
      if (event.error === 'no-speech') return; // onend will restart with longer delay
      console.warn('SpeechRecognition error:', event.error);
    };

    rec.onend = () => {
      if (!wantActiveRef.current) return;

      // Commit any pending interim before restarting
      if (pendingInterimRef.current.trim()) {
        const pending = pendingInterimRef.current.trim();
        if (!isDuplicateOfTail(pending)) {
          const nonOverlapping = getNonOverlappingText(pending);
          if (nonOverlapping.trim()) {
            appendTranscript(nonOverlapping);
          }
        }
        pendingInterimRef.current = '';
        setInterimText('');
      }

      // Use longer delay for no-speech errors, shorter for normal restarts
      const delay = lastErrorRef.current === 'no-speech' ? NO_SPEECH_RESTART_DELAY_MS : RESTART_DELAY_MS;
      lastErrorRef.current = null;

      // Clear any pending restart timer
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (wantActiveRef.current) {
          buildAndStart();
        }
      }, delay);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
      // Retry after a delay
      if (wantActiveRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (wantActiveRef.current) buildAndStart();
        }, NO_SPEECH_RESTART_DELAY_MS);
      }
    }
  }, [appendTranscript, setInterimText, resetSilenceTimer, abortCurrent, isDuplicateOfTail, getNonOverlappingText]);

  const startRecording = useCallback((onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    wantActiveRef.current = true;
    pendingInterimRef.current = '';
    lastErrorRef.current = null;

    clearTranscript();
    setRecording(true);
    resetSilenceTimer();

    buildAndStart();
  }, [clearTranscript, setRecording, resetSilenceTimer, buildAndStart]);

  const stopRecording = useCallback((): string => {
    wantActiveRef.current = false;

    // Clear any pending restart
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Commit any pending interim text before stopping
    if (pendingInterimRef.current.trim()) {
      appendTranscript(pendingInterimRef.current.trim());
      pendingInterimRef.current = '';
    }

    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);

    abortCurrent();

    setInterimText('');
    lastErrorRef.current = null;
    return transcript;
  }, [setInterimText, setRecording, appendTranscript, abortCurrent]);

  return { startRecording, stopRecording };
}
