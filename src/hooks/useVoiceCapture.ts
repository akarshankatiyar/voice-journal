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
  const isActiveRef = useRef(false); // tracks desired recording state
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  const startNewRecognitionInstance = useCallback(() => {
    if (!isActiveRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Clean up old instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

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
      console.warn('Speech recognition error:', event.error);
      // Don't do anything here — let onend handle restart
    };

    recognition.onend = () => {
      // The API stopped on its own (phrase end, network blip, etc.)
      // Restart immediately if we're still supposed to be recording
      if (isActiveRef.current) {
        // Clear any pending restart
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        // Small delay to avoid rapid-fire restarts
        restartTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current) {
            startNewRecognitionInstance();
          }
        }, 50);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      // If it fails, retry once after a brief delay
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          startNewRecognitionInstance();
        }
      }, 200);
    }
  }, [appendTranscript, setInterimText, resetSilenceTimer]);

  const startRecording = useCallback(async (onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    // CRITICAL: Request microphone directly in user gesture handler
    // This keeps the audio stream alive and prevents permission issues on mobile
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      alert('Microphone permission is required for voice capture.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    isActiveRef.current = true;

    clearTranscript();
    setRecording(true);
    resetSilenceTimer();
    startNewRecognitionInstance();
  }, [clearTranscript, setRecording, resetSilenceTimer, startNewRecognitionInstance]);

  const stopRecording = useCallback((): string => {
    isActiveRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    // Release the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setInterimText('');
    return transcript;
  }, [setInterimText, setRecording]);

  return { startRecording, stopRecording };
}
