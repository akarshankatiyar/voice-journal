import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockAcademicNotes } from '@/data/mockData';
import { TagBadge } from '@/components/shared/TagBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { GraduationCap, Search, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AcademicNotes() {
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const filtered = mockAcademicNotes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.subject.toLowerCase().includes(search.toLowerCase())
  );
  const detail = mockAcademicNotes.find(n => n.id === selectedNote);

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
              onClick={() => setSelectedNote(note.id)}
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
        {detail && (
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
                <button onClick={() => setSelectedNote(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
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
    </motion.div>
  );
}
