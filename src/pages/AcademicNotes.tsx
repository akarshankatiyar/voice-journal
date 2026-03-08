import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '@/store/useConversationStore';
import { TagBadge } from '@/components/shared/TagBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { GraduationCap, Search, X, Edit2, Save } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AcademicNotes() {
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const filtered = mockAcademicNotes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.subject.toLowerCase().includes(search.toLowerCase())
  );
  const detail = mockAcademicNotes.find(n => n.id === selectedNote);

  const handleEdit = () => {
    if (detail) {
      setEditData({
        title: detail.title,
        subject: detail.subject,
        keyConcepts: detail.keyConcepts.join(', '),
        structuredNotes: detail.structuredNotes,
        summary: detail.summary,
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
        <h1 className="font-display text-2xl text-foreground mb-1">Academic Notes</h1>
        <p className="text-sm text-muted-foreground">AI-structured notes from your lectures</p>
      </motion.div>

      <motion.div variants={item} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes or subjects..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-primary/10 text-foreground placeholder:text-muted-foreground text-sm font-body focus:outline-none focus:border-primary/30"
        />
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-12 w-12" />} title="No notes yet" description="Record a lecture and AI will auto-generate structured notes." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(note => (
            <motion.div
              key={note.id}
              variants={item}
              onClick={() => {
                setSelectedNote(note.id);
                setIsEditing(false);
              }}
              className="glass-card-hover p-5 cursor-pointer"
            >
              <span className="text-xs font-body font-medium text-vc-blue-light bg-vc-blue/15 px-2 py-0.5 rounded-full">{note.subject}</span>
              <h3 className="font-display text-base text-foreground mt-2 mb-1">{note.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{note.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {note.keyConcepts.slice(0, 3).map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && !isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedNote(null)}
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
                  <span className="text-xs font-body font-medium text-vc-blue-light bg-vc-blue/15 px-2 py-0.5 rounded-full">{detail.subject}</span>
                  <h2 className="font-display text-xl text-foreground mt-2">{detail.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelectedNote(null)} className="text-muted-foreground hover:text-foreground p-2">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {detail.keyConcepts.map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
                ))}
              </div>
              <div className="prose prose-invert prose-sm max-w-none font-body text-foreground/80 whitespace-pre-wrap">
                {detail.structuredNotes}
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
                <h2 className="font-display text-xl text-foreground">Edit Note</h2>
                <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={editData.subject}
                    onChange={e => setEditData({ ...editData, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
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
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Key Concepts (comma separated)</label>
                  <input
                    type="text"
                    value={editData.keyConcepts}
                    onChange={e => setEditData({ ...editData, keyConcepts: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Notes</label>
                  <textarea
                    value={editData.structuredNotes}
                    onChange={e => setEditData({ ...editData, structuredNotes: e.target.value })}
                    rows={6}
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
