import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import type { AcademicNote } from '@/data/mockData';

interface Props {
  detail: AcademicNote | null;
  editData: any;
  setEditData: (d: any) => void;
  onClose: () => void;
  onSave: () => void;
}

export function AcademicNoteEditModal({ detail, editData, setEditData, onClose, onSave }: Props) {
  if (!detail || !editData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
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
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Subject</label>
              <input type="text" value={editData.subject} onChange={e => setEditData({ ...editData, subject: e.target.value })} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Title</label>
              <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Summary</label>
              <textarea value={editData.summary} onChange={e => setEditData({ ...editData, summary: e.target.value })} rows={2} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Key Concepts (comma separated)</label>
              <input type="text" value={editData.keyConcepts} onChange={e => setEditData({ ...editData, keyConcepts: e.target.value })} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Notes</label>
              <textarea value={editData.structuredNotes} onChange={e => setEditData({ ...editData, structuredNotes: e.target.value })} rows={6} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t border-primary/10">
              <button onClick={onClose} className="flex items-center gap-1 text-sm px-3 py-2 rounded border border-muted text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" /> Cancel
              </button>
              <button onClick={onSave} className="flex items-center gap-1 text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
