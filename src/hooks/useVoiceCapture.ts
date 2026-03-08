import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const SILENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export function useVoiceCapture() {
  const { setRecording, appendTranscript, setInterimText, clearTranscript } = useAppStore();
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoStopRef = useRef<((transcript: string) => void) | null>(null);
  const wantActiveRef = useRef(false);
  // Deduplication: track last few final results to prevent repeats on restart
  const lastFinalsRef = useRef<string[]>([]);
  // Track pending interim text so we can carry it across restarts
  const pendingInterimRef = useRef('');

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const transcript = useAppStore.getState().liveTranscript.trim();
      if (transcript.length > 10 && onAutoStopRef.current) {
        onAutoStopRef.current(transcript);
      }
      useAppStore.getState().clearTranscript();
      lastFinalsRef.current = [];
      resetSilenceTimer();
    }, SILENCE_TIMEOUT_MS);
  }, []);

  const buildAndStart = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !wantActiveRef.current) return;

    // If there was interim text when the previous session ended, commit it
    // so words aren't lost between restarts
    if (pendingInterimRef.current.trim()) {
      const text = pendingInterimRef.current.trim();
      // Only append if it's not a duplicate of the last final
      const lastFinal = lastFinalsRef.current[lastFinalsRef.current.length - 1] || '';
      if (text !== lastFinal.trim()) {
        appendTranscript(text);
        lastFinalsRef.current.push(text);
        if (lastFinalsRef.current.length > 5) lastFinalsRef.current.shift();
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

          // Dedup: skip if this exact text matches any recent final result
          const isDuplicate = lastFinalsRef.current.some(
            (prev) => prev.trim() === text || text.startsWith(prev.trim()) && text.length < prev.trim().length * 1.5
          );

          if (!isDuplicate) {
            appendTranscript(result[0].transcript);
            lastFinalsRef.current.push(text);
            // Keep only last 5 finals for comparison
            if (lastFinalsRef.current.length > 5) lastFinalsRef.current.shift();
          }
          pendingInterimRef.current = '';
          resetSilenceTimer();
        } else {
          interim += result[0].transcript;
          // Save interim so we can recover it if session ends mid-phrase
          pendingInterimRef.current = interim;
          resetSilenceTimer();
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      console.warn('SpeechRecognition error:', event.error);
    };

    rec.onend = () => {
      if (wantActiveRef.current) {
        // Restart immediately to minimize gap between phrases
        buildAndStart();
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
    }
  }, [appendTranscript, setInterimText, resetSilenceTimer]);

  const startRecording = useCallback((onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    wantActiveRef.current = true;
    lastFinalsRef.current = [];
    pendingInterimRef.current = '';

    clearTranscript();
    setRecording(true);
    resetSilenceTimer();

    buildAndStart();
  }, [clearTranscript, setRecording, resetSilenceTimer, buildAndStart]);

  const stopRecording = useCallback((): string => {
    wantActiveRef.current = false;

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

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    setInterimText('');
    lastFinalsRef.current = [];
    return transcript;
  }, [setInterimText, setRecording, appendTranscript]);

  return { startRecording, stopRecording };
}
