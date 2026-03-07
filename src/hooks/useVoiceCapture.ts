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

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      // 2 min silence — auto-stop and trigger processing
      const transcript = useAppStore.getState().liveTranscript.trim();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      useAppStore.getState().setRecording(false);
      useAppStore.getState().setInterimText('');
      if (transcript.length > 10 && onAutoStopRef.current) {
        onAutoStopRef.current(transcript);
      }
    }, SILENCE_TIMEOUT_MS);
  }, []);

  const startRecording = useCallback((onAutoStop?: (transcript: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          appendTranscript(result[0].transcript);
          resetSilenceTimer(); // Reset on new speech
        } else {
          interim += result[0].transcript;
          resetSilenceTimer(); // Reset on interim speech too
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onend = () => {
      if (useAppStore.getState().isRecording) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    clearTranscript();
    setRecording(true);
    recognition.start();
    resetSilenceTimer(); // Start the silence timer
  }, [appendTranscript, clearTranscript, setInterimText, setRecording, resetSilenceTimer]);

  const stopRecording = useCallback((): string => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setInterimText('');
    return transcript;
  }, [setInterimText, setRecording]);

  return { startRecording, stopRecording };
}
