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

  const buildAndStart = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !wantActiveRef.current) return;

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
          appendTranscript(result[0].transcript);
          resetSilenceTimer();
        } else {
          interim += result[0].transcript;
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
      // Immediately restart if we still want to be active
      if (wantActiveRef.current) {
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

  // Synchronous — no await, no getUserMedia — stays in user gesture context
  const startRecording = useCallback((onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    wantActiveRef.current = true;

    clearTranscript();
    setRecording(true);
    resetSilenceTimer();

    // Start immediately — synchronous, within gesture context
    buildAndStart();
  }, [clearTranscript, setRecording, resetSilenceTimer, buildAndStart]);

  const stopRecording = useCallback((): string => {
    wantActiveRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    setInterimText('');
    return transcript;
  }, [setInterimText, setRecording]);

  return { startRecording, stopRecording };
}
