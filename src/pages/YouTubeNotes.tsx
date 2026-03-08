import { useState } from 'react';
import { motion } from 'framer-motion';
import { useConversationStore } from '@/store/useConversationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { Search, Monitor, GraduationCap, Filter } from 'lucide-react';
import { AcademicNoteDetailModal } from '@/components/notes/AcademicNoteDetailModal';
import { YouTubeImportDialog } from '@/components/youtube/YouTubeImportDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const FILTERS = ['All', 'Academic', 'Tutorial', 'Entertainment', 'Other'] as const;

export default function YouTubeNotes() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const academicNotes = useConversationStore((s) => s.academicNotes);
  const conversations = useConversationStore((s) => s.conversations);
  const deleteAcademicNote = useConversationStore((s) => s.deleteAcademicNote);

  // YouTube notes are those with source === 'youtube' or tagged 'youtube'
  const youtubeNotes = academicNotes.filter(n => 
    n.source === 'youtube' || 
    conversations.find(c => c.id === n.conversationId)?.tags?.includes('youtube')
  );

  const filtered = youtubeNotes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase());
    if (filter === 'All') return matchesSearch;
    if (filter === 'Academic') return matchesSearch && n.subject.toLowerCase().includes('academic');
    return matchesSearch;
  });

  const detail = academicNotes.find(n => n.id === selectedNote);
  const getConversation = (convId: string) => conversations.find(c => c.id === convId);

  const handleMoveToAcademic = (noteId: string) => {
    // Note is already in academic notes store, just toast confirmation
    toast.success('Note is saved in Academic Notes!');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground mb-1 flex items-center gap-2">
            <img src="/images/youtube-icon.svg" alt="" className="h-6 w-6" />
            YouTube Notes
          </h1>
          <p className="text-sm text-muted-foreground">AI-generated notes from YouTube videos</p>
        </div>
        <YouTubeImportDialog />
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search YouTube notes..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-primary/10 text-foreground placeholder:text-muted-foreground text-sm font-body focus:outline-none focus:border-primary/30"
        />
      </motion.div>

      {/* Filter chips */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-primary/10 text-muted-foreground hover:text-foreground hover:border-primary/20'
            }`}
          >
            {f}
          </button>
        ))}
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Monitor className="h-12 w-12" />}
          title="No YouTube notes yet"
          description="Import a YouTube video to generate AI-structured notes."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(note => {
            const conv = getConversation(note.conversationId);
            const videoId = note.videoId;
            const thumbnailUrl = videoId
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : null;

            return (
              <motion.div
                key={note.id}
                variants={item}
                onClick={() => setSelectedNote(note.id)}
                className="glass-card-hover overflow-hidden cursor-pointer"
              >
                {/* Thumbnail */}
                {thumbnailUrl && (
                  <div className="relative h-32 bg-muted overflow-hidden">
                    <img
                      src={thumbnailUrl}
                      alt={note.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                      <img src="/images/youtube-icon.svg" alt="" className="h-5 w-5" />
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-body font-medium text-destructive bg-destructive/15 px-2 py-0.5 rounded-full">
                      📺 YouTube
                    </span>
                    <span className="text-xs font-body text-muted-foreground">{note.subject}</span>
                  </div>

                  <h3 className="font-display text-base text-foreground mb-1 line-clamp-2">{note.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{note.summary}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToAcademic(note.id);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      title="Move to Academic Notes"
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AcademicNoteDetailModal
        detail={detail || null}
        onClose={() => setSelectedNote(null)}
        onEdit={() => {}}
        onDelete={(id) => {
          deleteAcademicNote(id);
          setSelectedNote(null);
        }}
      />
    </motion.div>
  );
}
