import { motion } from 'framer-motion';
import { LiveTranscript } from '@/components/shared/LiveTranscript';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { useAppStore } from '@/store/useAppStore';
import { MicButton } from '@/components/recording/MicButton';
import { mockConversations } from '@/data/mockData';
import { format } from 'date-fns';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function TodaysText() {
  const isRecording = useAppStore((s) => s.isRecording);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Today's Text</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <MicButton size="sm" />
      </motion.div>

      {isRecording && (
        <motion.div variants={item}>
          <LiveTranscript />
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-3">
        {mockConversations.map(conv => (
          <ConversationCard key={conv.id} conv={conv} />
        ))}
      </motion.div>
    </motion.div>
  );
}
