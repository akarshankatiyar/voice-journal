import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2 } from 'lucide-react';
import type { AcademicNote } from '@/data/mockData';

interface Props {
  detail: AcademicNote | null;
  onClose: () => void;
  onEdit: () => void;
}

export function AcademicNoteDetailModal({ detail, onClose, onEdit }: Props) {
  return (
    <AnimatePresence>
      {detail && (
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
              <div>
                {detail.source === 'youtube' ? (
                  <span className="text-xs font-body font-medium text-destructive bg-destructive/15 px-2 py-0.5 rounded-full">📺 YouTube</span>
                ) : (
                  <span className="text-xs font-body font-medium text-vc-blue-light bg-vc-blue/15 px-2 py-0.5 rounded-full">{detail.subject}</span>
                )}
                <h2 className="font-display text-xl text-foreground mt-2">{detail.title}</h2>
                {detail.source === 'youtube' && (
                  <p className="text-xs text-muted-foreground mt-1">{detail.subject}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onEdit} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2">
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
  );
}
