import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const SILENCE_TIMEOUT_S = 120; // 2 minutes

export function LiveTranscript() {
  const { liveTranscript, interimText, isRecording, captureMode } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const lastActivityRef = useRef(Date.now());

  // Track speech activity
  useEffect(() => {
    if (liveTranscript || interimText) {
      lastActivityRef.current = Date.now();
      setSilenceSeconds(0);
    }
  }, [liveTranscript, interimText]);

  // Count silence seconds while recording
  useEffect(() => {
    if (!isRecording) {
      setSilenceSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setSilenceSeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveTranscript, interimText]);

  if (!isRecording && !liveTranscript) return null;

  const silencePercent = Math.min((silenceSeconds / SILENCE_TIMEOUT_S) * 100, 100);
  const remainingSeconds = Math.max(SILENCE_TIMEOUT_S - silenceSeconds, 0);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        {isRecording && <span className="h-2 w-2 rounded-full bg-recording-red animate-pulse-recording" />}
        <span className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider">
          {isRecording ? (captureMode === 'device' ? '📡 Lecture Capture' : 'Live Transcript') : 'Last Recording'}
        </span>
        {isRecording && silenceSeconds > 5 && (
          <span className="ml-auto text-[10px] font-body text-muted-foreground">
            Auto-save in {mins}:{secs.toString().padStart(2, '0')}
          </span>
        )}
      </div>

      {isRecording && silenceSeconds > 5 && (
        <div className="mb-3">
          <Progress value={silencePercent} className="h-1" />
        </div>
      )}

      <div ref={scrollRef} className="max-h-40 overflow-y-auto text-sm font-body">
        <span className="text-foreground/90">{liveTranscript}</span>
        {interimText && <span className="text-muted-foreground/60">{interimText}</span>}
        {isRecording && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-blink" />}
      </div>
    </motion.div>
  );
}
