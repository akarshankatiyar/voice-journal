import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TagBadge } from './TagBadge';
import { ChevronDown, ChevronUp, Clock, Users as UsersIcon } from 'lucide-react';
import type { Conversation } from '@/data/mockData';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ConversationCard({ conv }: { conv: Conversation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="font-display text-base text-foreground">{conv.title}</h3>
            <TagBadge type={conv.type} />
            {conv.subTypes.map(st => <TagBadge key={st} type={st as any} />)}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(conv.startedAt)}</span>
            {conv.peopleMentioned.length > 0 && (
              <span className="flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {conv.peopleMentioned.join(', ')}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{conv.summary}</p>
          {conv.linkedSection && (
            <p className="text-xs text-primary mt-2">
              📚 Saved to {conv.linkedSection === 'academic_notes' ? 'Academic Notes' : 'Meeting Notes'} →
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-muted-foreground font-medium mb-1">Full Transcript</p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{conv.fullTranscript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
