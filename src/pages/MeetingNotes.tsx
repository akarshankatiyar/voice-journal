import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockMeetingNotes } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { Handshake, Users, CheckCircle, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function MeetingNotes() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = mockMeetingNotes.find(m => m.id === selectedId);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Meeting Notes</h1>
        <p className="text-sm text-muted-foreground">AI-structured notes from your meetings</p>
      </motion.div>

      {mockMeetingNotes.length === 0 ? (
        <EmptyState icon={<Handshake className="h-12 w-12" />} title="No meeting notes" description="Record a meeting and AI will auto-generate structured notes." />
      ) : (
        <div className="space-y-4">
          {mockMeetingNotes.map(note => (
            <motion.div
              key={note.id}
              variants={item}
              onClick={() => setSelectedId(note.id)}
              className="glass-card-hover p-5 cursor-pointer"
            >
              <h3 className="font-display text-base text-foreground mb-2">{note.title}</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{note.attendees.join(', ')}</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{note.actionItems.length} actions</span>
              </div>
              <p className="text-sm text-muted-foreground">{note.summary}</p>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-display text-xl text-foreground">{detail.title}</h2>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{detail.summary}</p>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-body font-medium text-primary uppercase tracking-wider mb-2">Attendees</h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.attendees.map(a => <span key={a} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{a}</span>)}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-body font-medium text-emerald-400 uppercase tracking-wider mb-2">Action Items</h4>
                  <ul className="space-y-1.5">
                    {detail.actionItems.map((ai, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{ai}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-body font-medium text-gold-light uppercase tracking-wider mb-2">Decisions</h4>
                  <ul className="space-y-1.5">
                    {detail.decisions.map((d, i) => (
                      <li key={i} className="text-sm text-foreground/80">• {d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                  <div className="text-sm text-foreground/80 whitespace-pre-wrap">{detail.structuredNotes}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
