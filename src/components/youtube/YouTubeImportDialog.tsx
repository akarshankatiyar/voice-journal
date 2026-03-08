import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConversationStore } from '@/store/useConversationStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resolveNotes } from '@/utils/parseNotes';

type Stage = 'idle' | 'fetching' | 'generating' | 'done';

export function YouTubeImportDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [showAcademicBanner, setShowAcademicBanner] = useState(false);
  const { addConversation, addAcademicNote } = useConversationStore();

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

      addConversation({
        id: convId,
        userId: 'user1',
        title: data.title || 'YouTube Video Notes',
        fullTranscript: data.transcript || '',
        summary: data.summary || '',
        type: 'academic',
        subTypes: [],
        peopleMentioned: [],
        tags: ['youtube'],
        linkedSection: 'youtube_notes',
        images: [],
        isLive: false,
        startedAt: now,
        endedAt: now,
        createdAt: now,
      });

      const notes = resolveNotes(data.notes, data.title, data.summary);

      addAcademicNote({
        id: `an_${Date.now()}`,
        conversationId: convId,
        title: notes.title,
        subject: notes.subject,
        structuredNotes: notes.structured_notes,
        keyConcepts: notes.key_concepts,
        summary: notes.summary,
        createdAt: now,
        source: 'youtube',
        videoId: data.videoId,
        hasTranscript: data.hasTranscript !== false,
      });

      if (data.isAcademic && data.academicConfidence > 70) {
        setShowAcademicBanner(true);
      }

      setStage('done');
      toast.success('✅ Notes saved to YouTube Notes!');
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
    setShowAcademicBanner(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 px-3 py-1.5 text-xs"
      >
        <img src="/images/youtube-icon.svg" alt="YouTube" className="h-4 w-4" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/images/youtube-icon.svg" alt="YouTube" className="h-5 w-5" />
              Import from YouTube
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
                ✅ Notes saved to YouTube Notes!
              </p>

              {showAcademicBanner && (
                <div className="w-full bg-vc-blue/10 border border-vc-blue/20 rounded-lg p-3 text-center space-y-2">
                  <p className="text-sm text-foreground">
                    🎓 This looks like an academic video. Save to Academic Notes too?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowAcademicBanner(false);
                        toast.success('Already in Academic Notes!');
                      }}
                      className="text-xs"
                    >
                      <GraduationCap className="h-3 w-3 mr-1" /> Yes, Move it
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAcademicBanner(false)}
                      className="text-xs"
                    >
                      Keep in YouTube Notes
                    </Button>
                  </div>
                </div>
              )}

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
