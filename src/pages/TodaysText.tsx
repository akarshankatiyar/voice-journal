import { useState } from 'react';
import { motion } from 'framer-motion';
import { LiveTranscript } from '@/components/shared/LiveTranscript';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { ConversationDetailModal } from '@/components/shared/ConversationDetailModal';
import { useAppStore } from '@/store/useAppStore';
import { useConversationStore } from '@/store/useConversationStore';
import { MicButton } from '@/components/recording/MicButton';
import { format } from 'date-fns';
import type { Conversation } from '@/data/mockData';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function TodaysText() {
  const isRecording = useAppStore((s) => s.isRecording);
  const conversations = useConversationStore((s) => s.conversations);
  const [selected, setSelected] = useState<Conversation | null>(null);

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
        {conversations.map(conv => (
          <ConversationCard key={conv.id} conv={conv} onCardClick={setSelected} />
        ))}
      </motion.div>

      <ConversationDetailModal conversation={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </motion.div>
  );
}
