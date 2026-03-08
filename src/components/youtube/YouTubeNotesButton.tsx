import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConversationStore } from '@/store/useConversationStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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
      // The edge function handles both transcript fetch + AI processing
      // data contains: { type, notes, classification, conversation }

      const now = new Date().toISOString();
      const convId = `yt_${Date.now()}`;
      const type = data.type || 'academic';
      const sectionMap: Record<string, { label: string; path: string }> = {
        academic: { label: 'Academic Notes', path: '/academic-notes' },
        meeting: { label: 'Meeting Notes', path: '/meeting-notes' },
        personal: { label: "Today's Text", path: '/todays-text' },
        mixed: { label: "Today's Text", path: '/todays-text' },
      };

      // Save conversation
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

      // Save to dedicated section
      if (type === 'academic' && data.notes) {
        addAcademicNote({
          id: `an_${Date.now()}`,
          conversationId: convId,
          title: data.notes.title || data.title || 'YouTube Lecture',
          subject: data.notes.subject || 'General',
          structuredNotes: data.notes.structured_notes || '',
          keyConcepts: data.notes.key_concepts || [],
          summary: data.notes.summary || data.summary || '',
          createdAt: now,
        });
      } else if (type === 'meeting' && data.notes) {
        addMeetingNote({
          id: `mn_${Date.now()}`,
          conversationId: convId,
          title: data.notes.title || data.title || 'YouTube Meeting',
          attendees: data.notes.attendees || [],
          agenda: data.notes.agenda || '',
          actionItems: (data.notes.action_items || []).map((a: any) => typeof a === 'string' ? a : a.task),
          decisions: data.notes.decisions || [],
          structuredNotes: data.notes.structured_notes || '',
          summary: data.notes.summary || data.summary || '',
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
        className="w-full glass-card-hover p-4 group flex items-center gap-3"
      >
        <div className="p-2.5 rounded-xl bg-destructive/10 shrink-0">
          <Play className="h-5 w-5 text-destructive fill-destructive" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-display text-foreground">Get Notes from YouTube</p>
          <p className="text-xs text-muted-foreground mt-0.5">Paste a video link to generate structured notes</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-destructive fill-destructive" />
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
