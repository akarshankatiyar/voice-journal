import { useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';

export function LiveTranscript() {
  const { liveTranscript, interimText, isRecording } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveTranscript, interimText]);

  if (!isRecording && !liveTranscript) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        {isRecording && <span className="h-2 w-2 rounded-full bg-recording-red animate-pulse-recording" />}
        <span className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider">
          {isRecording ? 'Live Transcript' : 'Last Recording'}
        </span>
      </div>
      <div ref={scrollRef} className="max-h-40 overflow-y-auto text-sm font-body">
        <span className="text-foreground/90">{liveTranscript}</span>
        {interimText && <span className="text-muted-foreground/60">{interimText}</span>}
        {isRecording && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-blink" />}
      </div>
    </motion.div>
  );
}
