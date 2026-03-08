import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConversationStore } from '@/store/useConversationStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Stage = 'idle' | 'fetching' | 'generating' | 'done';

export function YouTubeImportDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
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
          source: 'youtube',
          videoId: data.videoId,
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

      setStage('done');
      toast.success('✅ Notes generated successfully!');
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
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="flex items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        📺 Import from YouTube
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📺 Import from YouTube
            </DialogTitle>
          </DialogHeader>

          {stage === 'idle' && (
            <div className="space-y-4 py-2">
              <Input
                placeholder="Paste YouTube video URL..."
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
              <p className="text-xs text-muted-foreground">Extracting captions from the video</p>
            </div>
          )}

          {stage === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-sm text-foreground">🧠 Generating notes...</p>
              <p className="text-xs text-muted-foreground">AI is structuring your notes</p>
            </div>
          )}

          {stage === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <p className="text-sm text-foreground text-center">
                ✅ Notes saved to <strong>Academic Notes</strong>
              </p>
              <Button variant="ghost" onClick={handleClose} className="text-sm">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
