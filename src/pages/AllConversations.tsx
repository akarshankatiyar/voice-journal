import { motion } from 'framer-motion';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { mockConversations } from '@/data/mockData';
import { MessageSquare } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AllConversations() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">All Conversations</h1>
        <p className="text-sm text-muted-foreground">{mockConversations.length} conversations recorded</p>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {mockConversations.map(conv => (
          <ConversationCard key={conv.id} conv={conv} />
        ))}
      </motion.div>
    </motion.div>
  );
}
