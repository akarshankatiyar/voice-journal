import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

// ─── Config ──────────────────────────────────────────────────────────────────
const CHUNK_INTERVAL_MS = 5_000;       // send a chunk every 5 s
const SILENCE_TIMEOUT_MS = 2 * 60 * 1000; // auto-stop after 2 min silence
const SILENCE_VOLUME_THRESHOLD = 0.01; // RMS below this → silence
const LANGUAGE = 'hi';                 // Hindi / Hinglish / English

const TRANSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Compute RMS volume of an audio blob via AudioContext */
async function getBlobRMS(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const data = audioBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    await audioCtx.close();
    return Math.sqrt(sum / data.length);
  } catch {
    return 1; // on decode error assume non-silent
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceCapture() {
  const { setRecording, appendTranscript, setInterimText, clearTranscript } = useAppStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoStopRef = useRef<((transcript: string) => void) | null>(null);
  const wantActiveRef = useRef(false);
  const pendingChunksRef = useRef<Promise<void>[]>([]);

  // ── Silence timer ─────────────────────────────────────────────────────────

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

  // ── Send one chunk to Groq via edge function ──────────────────────────────

  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return; // skip tiny/empty blobs

    // Silence gate
    const rms = await getBlobRMS(blob);
    if (rms < SILENCE_VOLUME_THRESHOLD) return; // quiet — don't send

    try {
      const form = new FormData();
      form.append('audio', new File([blob], 'chunk.webm', { type: blob.type || 'audio/webm' }));
      form.append('language', LANGUAGE);

      const res = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: form,
      });

      if (!res.ok) {
        console.warn('[VoiceCapture] transcription error:', res.status, await res.text());
        return;
      }

      const { transcript } = await res.json();
      if (transcript && transcript.trim().length > 0) {
        appendTranscript(transcript.trim());
        resetSilenceTimer();
      }
    } catch (err) {
      console.warn('[VoiceCapture] chunk send failed:', err);
    }
  }, [appendTranscript, resetSilenceTimer]);

  // ── Start recording ───────────────────────────────────────────────────────

  const startRecording = useCallback(async (onAutoStop?: (transcript: string) => void) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Microphone access is not supported in this browser.');
      return;
    }

    onAutoStopRef.current = onAutoStop || null;
    wantActiveRef.current = true;
    pendingChunksRef.current = [];

    clearTranscript();
    setInterimText('');
    setRecording(true);
    resetSilenceTimer();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.error('[VoiceCapture] getUserMedia failed:', err);
      alert('Could not access microphone. Please grant permission.');
      setRecording(false);
      return;
    }

    streamRef.current = stream;

    // Pick best supported MIME
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ].find((m) => MediaRecorder.isTypeSupported(m)) || '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (!wantActiveRef.current) return;
      if (event.data && event.data.size > 0) {
        const p = transcribeChunk(event.data);
        pendingChunksRef.current.push(p);
      }
    };

    recorder.onerror = (e) => {
      console.error('[VoiceCapture] MediaRecorder error:', e);
    };

    recorder.start(CHUNK_INTERVAL_MS);
  }, [clearTranscript, setInterimText, setRecording, resetSilenceTimer, transcribeChunk]);

  // ── Stop recording ────────────────────────────────────────────────────────

  const stopRecording = useCallback((): string => {
    wantActiveRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Request final chunk before stopping
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData(); // flush buffered audio
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop all mic tracks (releases hardware)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);
    setInterimText('');
    return transcript;
  }, [setRecording, setInterimText]);

  return { startRecording, stopRecording };
}
