import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConversationStore } from '@/store/useConversationStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { resolveNotes } from '@/utils/parseNotes';

const YT_ICON = '/images/youtube-icon.svg';

type ProcessingStage = 'idle' | 'fetching' | 'generating' | 'done';

export function YouTubeNotesButton() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [savedSection, setSavedSection] = useState<{ label: string; path: string } | null>(null);
  const { addConversation, addAcademicNote, addMeetingNote } = useConversationStore();

  const handleSubmit = async () => {
    if (!url.trim()) return;
    const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    if (!ytRegex.test(url)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    try {
      setStage('fetching');
      const { data, error } = await supabase.functions.invoke('youtube-notes', {
        body: { url: url.trim() },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStage('generating');

      const now = new Date().toISOString();
      const convId = `yt_${Date.now()}`;
      const type = data.type || 'academic';
      const sectionMap: Record<string, { label: string; path: string }> = {
        academic: { label: 'Academic Notes', path: '/academic-notes' },
        meeting: { label: 'Meeting Notes', path: '/meeting-notes' },
        personal: { label: "Today's Text", path: '/todays-text' },
        mixed: { label: "Today's Text", path: '/todays-text' },
      };

      addConversation({
        id: convId,
        userId: 'user1',
        title: data.title || 'YouTube Video Notes',
        fullTranscript: data.transcript || '',
        summary: data.summary || '',
        type,
        subTypes: [],
        peopleMentioned: [],
        tags: ['youtube'],
        linkedSection: type === 'academic' ? 'academic_notes' : type === 'meeting' ? 'meeting_notes' : null,
        images: [],
        isLive: false,
        startedAt: now,
        endedAt: now,
        createdAt: now,
      });

      const notes = resolveNotes(data.notes, data.title, data.summary);

      if (type === 'academic') {
        addAcademicNote({
          id: `an_${Date.now()}`,
          conversationId: convId,
          title: notes.title,
          subject: notes.subject,
          structuredNotes: notes.structured_notes,
          keyConcepts: notes.key_concepts,
          summary: notes.summary,
          createdAt: now,
        });
      } else if (type === 'meeting') {
        addMeetingNote({
          id: `mn_${Date.now()}`,
          conversationId: convId,
          title: notes.title,
          attendees: notes.attendees || [],
          agenda: notes.agenda || '',
          actionItems: (notes.action_items || []).map((a: any) => typeof a === 'string' ? a : a.task),
          decisions: notes.decisions || [],
          structuredNotes: notes.structured_notes,
          summary: notes.summary,
          createdAt: now,
        });
      }

      const section = sectionMap[type] || sectionMap.academic;
      setSavedSection(section);
      setStage('done');
      toast.success(`✅ Notes saved to ${section.label}`);
    } catch (err: any) {
      console.error('YouTube notes error:', err);
      toast.error(err.message || 'Failed to generate notes from YouTube video');
      setStage('idle');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setUrl('');
    setStage('idle');
    setSavedSection(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-2"
      >
        <div className="h-16 w-16 rounded-full border-2 border-destructive/30 bg-destructive/5 flex items-center justify-center hover:bg-destructive/10 transition-colors">
          <img src={YT_ICON} alt="YouTube" className="h-7 w-7 object-contain" />
        </div>
        <span className="text-xs font-body text-muted-foreground">YouTube Notes</span>
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={YT_ICON} alt="YouTube" className="h-5 w-5 object-contain" />
              YouTube Notes
            </DialogTitle>
          </DialogHeader>

          {stage === 'idle' && (
            <div className="space-y-4 py-2">
              <Input
                placeholder="Paste YouTube video link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button onClick={handleSubmit} className="w-full" disabled={!url.trim()}>
                Generate Notes
              </Button>
            </div>
          )}

          {stage === 'fetching' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-foreground">🎬 Fetching transcript...</p>
              <p className="text-xs text-muted-foreground">Extracting audio content from the video</p>
            </div>
          )}

          {stage === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 text-gold animate-spin" />
              <p className="text-sm text-foreground">🧠 Generating notes...</p>
              <p className="text-xs text-muted-foreground">AI is structuring your notes</p>
            </div>
          )}

          {stage === 'done' && savedSection && (
            <div className="flex flex-col items-center gap-4 py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <p className="text-sm text-foreground text-center">
                ✅ Notes saved to <strong>{savedSection.label}</strong>
              </p>
              <Link
                to={savedSection.path}
                onClick={handleClose}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                View Notes <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
