import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/integrations/supabase/client';

const CHUNK_INTERVAL_MS = 8000; // Send audio every 8 seconds for transcription

export function useDeviceCapture() {
  const { setRecording, appendTranscript, setInterimText, clearTranscript } = useAppStore();
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);
  const onAutoStopRef = useRef<((transcript: string) => void) | null>(null);

  const transcribeChunk = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 1000) return; // Skip tiny chunks

    try {
      setInterimText('⏳ Transcribing...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('language', 'en');

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) {
        console.error('Transcription error:', error);
        setInterimText('');
        return;
      }

      const text = data?.text?.trim();
      if (text && text.length > 0) {
        appendTranscript(text);
      }
      setInterimText('');
    } catch (err) {
      console.error('Transcribe chunk error:', err);
      setInterimText('');
    }
  }, [appendTranscript, setInterimText]);

  const processAndSendChunks = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
    chunksRef.current = [];
    transcribeChunk(blob);
  }, [transcribeChunk]);

  const startDeviceCapture = useCallback(async (onAutoStop?: (transcript: string) => void) => {
    try {
      // Request screen/tab sharing with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true, // Required by browser, but we only use audio
      });

      // Check if audio track exists
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('No audio track available. Please make sure to check "Share audio" when selecting the tab.');
      }

      // Stop video tracks — we only need audio
      stream.getVideoTracks().forEach(t => t.stop());

      // Create audio-only stream
      const audioStream = new MediaStream(audioTracks);
      mediaStreamRef.current = audioStream;
      isActiveRef.current = true;
      onAutoStopRef.current = onAutoStop || null;

      clearTranscript();
      setRecording(true);

      // Set up MediaRecorder
      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Process remaining chunks
        if (chunksRef.current.length > 0) {
          processAndSendChunks();
        }
      };

      // Listen for track ending (user clicks "Stop sharing" in browser)
      audioTracks[0].onended = () => {
        if (isActiveRef.current) {
          const transcript = stopDeviceCapture();
          if (transcript && transcript.length > 10 && onAutoStopRef.current) {
            onAutoStopRef.current(transcript);
          }
        }
      };

      recorder.start(1000); // Collect data every 1 second

      // Send chunks for transcription periodically
      intervalRef.current = setInterval(processAndSendChunks, CHUNK_INTERVAL_MS);

    } catch (err: any) {
      console.error('Device capture error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Screen sharing was cancelled. Please try again and select a tab to capture audio from.');
      } else if (err.message?.includes('No audio track')) {
        alert(err.message);
      } else {
        alert('Failed to capture device audio. Please use Chrome and try again.');
      }
    }
  }, [clearTranscript, setRecording, processAndSendChunks]);

  const stopDeviceCapture = useCallback((): string => {
    isActiveRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    const transcript = useAppStore.getState().liveTranscript.trim();
    setRecording(false);
    setInterimText('');

    return transcript;
  }, [setRecording, setInterimText]);

  return { startDeviceCapture, stopDeviceCapture };
}
