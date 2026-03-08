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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isRestartingRef = useRef(false);

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

  const buildRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

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
      // 'aborted' is expected when we manually stop; 'no-speech' is normal silence
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      console.warn('SpeechRecognition error:', event.error);
    };

    rec.onend = () => {
      // Only auto-restart if we still want to be active and aren't already restarting
      if (!wantActiveRef.current || isRestartingRef.current) return;
      
      isRestartingRef.current = true;
      // Build a fresh instance and start it
      const fresh = buildRecognition();
      if (fresh) {
        recognitionRef.current = fresh;
        try {
          fresh.start();
        } catch {
          // If start fails, try once more after a tick
          setTimeout(() => {
            if (wantActiveRef.current) {
              try { fresh.start(); } catch {}
            }
            isRestartingRef.current = false;
          }, 100);
          return;
        }
      }
      isRestartingRef.current = false;
    };

    return rec;
  }, [appendTranscript, setInterimText, resetSilenceTimer]);

  const startRecording = useCallback(async (onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    // Acquire mic permission directly in user gesture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;
    } catch (err) {
      console.error('Mic permission denied:', err);
      alert('Microphone permission is required.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    wantActiveRef.current = true;
    isRestartingRef.current = false;

    clearTranscript();
    setRecording(true);
    resetSilenceTimer();

    const rec = buildRecognition();
    if (rec) {
      recognitionRef.current = rec;
      rec.start();
    }
  }, [clearTranscript, setRecording, resetSilenceTimer, buildRecognition]);

  const stopRecording = useCallback((): string => {
    // Signal we no longer want to be active BEFORE aborting
    wantActiveRef.current = false;
    isRestartingRef.current = false;

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

    // Release media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    setInterimText('');
    return transcript;
  }, [setInterimText, setRecording]);

  return { startRecording, stopRecording };
}
