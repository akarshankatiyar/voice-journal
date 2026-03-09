import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useAutoProcess } from '@/hooks/useAutoProcess';
import { useAppStore } from '@/store/useAppStore';

export function MicButton({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const { startRecording, stopRecording } = useVoiceCapture();
  const { processAndSave } = useAutoProcess();
  const isRecording = useAppStore((s) => s.isRecording);

  const dim = size === 'lg' ? 'h-24 w-24' : 'h-14 w-14';
  const iconSize = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';

  const handleClick = async () => {
    if (isRecording) {
      const transcript = stopRecording();
      if (transcript && transcript.length > 10) {
        processAndSave(transcript);
      }
    } else {
      await startRecording();
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={handleClick}
      className={`relative ${dim} rounded-full flex items-center justify-center transition-all duration-300 ${
        isRecording
          ? 'bg-recording-red/20 border-2 border-recording-red animate-pulse-recording'
          : 'bg-primary/10 border-2 border-primary/40 hover:border-primary hover:bg-primary/20 animate-pulse-gold'
      }`}
    >
      {isRecording && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-recording-red/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {isRecording ? (
        <Square className={`${iconSize} text-recording-red fill-recording-red`} />
      ) : (
        <Mic className={`${iconSize} text-primary`} />
      )}
    </motion.button>
  );
}
