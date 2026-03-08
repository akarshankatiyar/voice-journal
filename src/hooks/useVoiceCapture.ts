import { useCallback, useRef } from 'use';
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

  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // For transient errors, onend will handle the restart
      if (event.error === 'aborted' || event.error === 'network') {
        // These are expected during restart cycles, ignore
        return;
      }
    };

    recognition.onend = () => {
      // Only restart if we're still supposed to be recording
      if (useAppStore.getState().isRecording && !isRestartingRef.current) {
        isRestartingRef.current = true;
        // Create a fresh instance to avoid stale state
        const newRecognition = createRecognition();
        if (newRecognition) {
          recognitionRef.current = newRecognition;
          try {
            newRecognition.start();
          } catch (e) {
            // If start fails, retry after a brief delay
            setTimeout(() => {
              if (useAppStore.getState().isRecording) {
                try { newRecognition.start(); } catch {}
              }
              isRestartingRef.current = false;
            }, 100);
            return;
          }
        }
        isRestartingRef.current = false;
      }
    };

    return recognition;
  }, [appendTranscript, setInterimText, resetSilenceTimer]);

  const startRecording = useCallback((onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    isRestartingRef.current = false;

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    clearTranscript();
    setRecording(true);
    recognition.start();
    resetSilenceTimer();
  }, [clearTranscript, setRecording, resetSilenceTimer, createRecognition]);

  const stopRecording = useCallback((): string => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);
    isRestartingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setInterimText('');
    return transcript;
  }, [setInterimText, setRecording]);

  return { startRecording, stopRecording };
}