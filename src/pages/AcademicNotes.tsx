import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '@/store/useConversationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { GraduationCap, Search, X, Edit2, Save } from 'lucide-react';
import { AcademicNoteDetailModal } from '@/components/notes/AcademicNoteDetailModal';
import { AcademicNoteEditModal } from '@/components/notes/AcademicNoteEditModal';
import { YouTubeImportDialog } from '@/components/youtube/YouTubeImportDialog';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AcademicNotes() {
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const academicNotes = useConversationStore((s) => s.academicNotes);
  const filtered = academicNotes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.subject.toLowerCase().includes(search.toLowerCase())
  );
  const detail = academicNotes.find(n => n.id === selectedNote);

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
    setIsEditing(false);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground mb-1">Academic Notes</h1>
          <p className="text-sm text-muted-foreground">AI-structured notes from your lectures</p>
        </div>
        <YouTubeImportDialog />
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
              <div className="flex items-center gap-2 mb-2">
                {note.source === 'youtube' ? (
                  <span className="text-xs font-body font-medium text-destructive bg-destructive/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <img src="/images/youtube-icon.svg" alt="YouTube" className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="text-xs font-body font-medium text-vc-blue-light bg-vc-blue/15 px-2 py-0.5 rounded-full">
                    🎓 {note.subject}
                  </span>
                )}
                {note.source === 'youtube' && (
                  <span className="text-xs font-body text-muted-foreground">{note.subject}</span>
                )}
              </div>
              <h3 className="font-display text-base text-foreground mb-1">{note.title}</h3>
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

      <AcademicNoteDetailModal
        detail={detail && !isEditing ? detail : null}
        onClose={() => setSelectedNote(null)}
        onEdit={handleEdit}
      />

      <AcademicNoteEditModal
        detail={detail && isEditing ? detail : null}
        editData={editData}
        setEditData={setEditData}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
      />
    </motion.div>
  );
}
