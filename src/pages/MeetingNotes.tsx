import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '@/store/useConversationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { Handshake, Users, CheckCircle, X, Edit2, Save } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function MeetingNotes() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const meetingNotes = useConversationStore((s) => s.meetingNotes);
  const detail = meetingNotes.find(m => m.id === selectedId);

  const handleEdit = () => {
    if (detail) {
      setEditData({
        title: detail.title,
        summary: detail.summary,
        attendees: detail.attendees.join(', '),
        actionItems: detail.actionItems.join('\n'),
        decisions: detail.decisions.join('\n'),
        structuredNotes: detail.structuredNotes,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    // In a real app, this would update the data in your backend/store
    setIsEditing(false);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Meeting Notes</h1>
        <p className="text-sm text-muted-foreground">AI-structured notes from your meetings</p>
      </motion.div>

      {meetingNotes.length === 0 ? (
        <EmptyState icon={<Handshake className="h-12 w-12" />} title="No meeting notes" description="Record a meeting and AI will auto-generate structured notes." />
      ) : (
        <div className="space-y-4">
          {mockMeetingNotes.map(note => (
            <motion.div
              key={note.id}
              variants={item}
              onClick={() => {
                setSelectedId(note.id);
                setIsEditing(false);
              }}
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
        {detail && !isEditing && (
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground p-2"><X className="h-5 w-5" /></button>
                </div>
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

      {/* Edit Modal */}
      <AnimatePresence>
        {detail && isEditing && editData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-xl text-foreground">Edit Meeting Note</h2>
                <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Title</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Summary</label>
                  <textarea
                    value={editData.summary}
                    onChange={e => setEditData({ ...editData, summary: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Attendees (comma separated)</label>
                  <input
                    type="text"
                    value={editData.attendees}
                    onChange={e => setEditData({ ...editData, attendees: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Action Items (one per line)</label>
                  <textarea
                    value={editData.actionItems}
                    onChange={e => setEditData({ ...editData, actionItems: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Decisions (one per line)</label>
                  <textarea
                    value={editData.decisions}
                    onChange={e => setEditData({ ...editData, decisions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Notes</label>
                  <textarea
                    value={editData.structuredNotes}
                    onChange={e => setEditData({ ...editData, structuredNotes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t border-primary/10">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 text-sm px-3 py-2 rounded border border-muted text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
