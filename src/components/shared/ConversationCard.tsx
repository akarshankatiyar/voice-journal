import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TagBadge } from './TagBadge';
import { ChevronDown, ChevronUp, Clock, Users as UsersIcon, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: conv.title,
    summary: conv.summary,
    fullTranscript: conv.fullTranscript,
  });

  const handleSave = () => {
    // In a real app, this would update the data in your backend/store
    setIsEditing(false);
  };

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
            <h3 className="font-display text-base text-foreground">{editData.title}</h3>
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
          <p className="text-sm text-muted-foreground line-clamp-2">{editData.summary}</p>
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
            {!isEditing ? (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-medium">Full Transcript</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{editData.fullTranscript}</p>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-primary/10 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Title</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-2 py-1.5 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Summary</label>
                  <textarea
                    value={editData.summary}
                    onChange={e => setEditData({ ...editData, summary: e.target.value })}
                    rows={2}
                    className="w-full px-2 py-1.5 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1">Transcript</label>
                  <textarea
                    value={editData.fullTranscript}
                    onChange={e => setEditData({ ...editData, fullTranscript: e.target.value })}
                    rows={4}
                    className="w-full px-2 py-1.5 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        title: conv.title,
                        summary: conv.summary,
                        fullTranscript: conv.fullTranscript,
                      });
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-muted text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
