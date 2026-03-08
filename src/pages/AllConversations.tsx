import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockConversations } from '@/data/mockData';
import type { Conversation } from '@/data/mockData';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock, Users as UsersIcon, X, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { TagBadge } from '@/components/shared/TagBadge';
import { ConversationDetailModal } from '@/components/shared/ConversationDetailModal';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const typeColors: Record<string, string> = {
  academic: 'text-vc-blue',
  meeting: 'text-emerald-500',
  personal: 'text-foreground',
  mixed: 'text-muted-foreground',
};

export default function AllConversations() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const filteredConversations = selectedDate
    ? mockConversations.filter(conv => {
        const convDate = new Date(conv.startedAt);
        return (
          convDate.getFullYear() === selectedDate.getFullYear() &&
          convDate.getMonth() === selectedDate.getMonth() &&
          convDate.getDate() === selectedDate.getDate()
        );
      })
    : [];

  const formatDateDisplay = selectedDate
    ? format(selectedDate, 'MMMM d, yyyy')
    : 'Select a date';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">All Conversations</h1>
        <p className="text-sm text-muted-foreground">Select a date to view conversations</p>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
              <CalendarIcon className="h-4 w-4" />
              {formatDateDisplay}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-primary/20" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date > new Date() || date < new Date('2024-01-01')}
            />
          </PopoverContent>
        </Popover>
      </motion.div>

      {selectedDate && (
        <motion.div variants={item} className="space-y-3">
          {filteredConversations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No conversations recorded for {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground font-medium mb-4">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} on {format(selectedDate, 'MMMM d, yyyy')}
              </p>
              <div className="space-y-3">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className="w-full text-left glass-card-hover p-4 transition-all hover:scale-[1.01]"
                  >
                    <h3 className={`font-display text-base ${typeColors[conv.type] || 'text-foreground'}`}>
                      {conv.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mt-2 mb-2">
                      <TagBadge type={conv.type} />
                      {conv.subTypes.map(st => <TagBadge key={st} type={st as any} />)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(conv.startedAt)}
                      </span>
                      {conv.peopleMentioned.length > 0 && (
                        <span className="flex items-center gap-1">
                          <UsersIcon className="h-3 w-3" />
                          {conv.peopleMentioned.join(', ')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedConv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedConv(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className={`font-display text-xl ${typeColors[selectedConv.type] || 'text-foreground'}`}>
                    {selectedConv.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <TagBadge type={selectedConv.type} />
                    {selectedConv.subTypes.map(st => <TagBadge key={st} type={st as any} />)}
                  </div>
                </div>
                <button onClick={() => setSelectedConv(null)} className="text-muted-foreground hover:text-foreground p-2">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(selectedConv.startedAt)}
                  </span>
                  {selectedConv.peopleMentioned.length > 0 && (
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" />
                      {selectedConv.peopleMentioned.join(', ')}
                    </span>
                  )}
                </div>

              {selectedConv.summary && (
                  <div>
                    <h4 className="text-xs font-body font-medium text-primary uppercase tracking-wider mb-2">Summary</h4>
                    <MarkdownRenderer content={selectedConv.summary} showToc={false} />
                  </div>
                )}

                {selectedConv.fullTranscript && (
                  <div>
                    <h4 className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-2">Transcript</h4>
                    <MarkdownRenderer content={selectedConv.fullTranscript} />
                  </div>
                )}

                {selectedConv.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-primary/10">
                    {selectedConv.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
