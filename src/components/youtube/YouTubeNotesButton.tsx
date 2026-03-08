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

const YT_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMMAAACUCAMAAAAZKm3XAAAAk1BMVEXdLCj////+/f3r6+v19fXu7u76+vrYAAD20NDx8fHo6OjdKCTr7+/dIx7bCQDdJiHcFxD98/PcHRjcEQjfVVL1vbztnp3jk5HeOzfp4uLlrqz87u7ro6Lo1NTmtbTpkI/kYV/43d3fSEXlcG7eQT7fTkv65eXnycnztLP1xcXkpaTnenjmv7/phILhe3nr9/fgZmQPVHCYAAAJyklEQVR4nN2dh7qiOhCA6dJCiY2miNgQ2/s/3U0B1KOeddcA5s7ufierOZjfJJM2mREUU5ZNTURiyLKs4pSKEjJOaDil4vcknEvBKZxfJqlvyaYJ9wxyzaBKD4+jD1Hk28d9Q7b/HYMpm5TBrGAklDJfV+uXZEMM/Iug3DUjCaVMiWDWPVzC7xn3NYpTb2aTmT7tabafDGqVT7zPpz4pnEh/U1XJZ4mybdskpaGErTQpmg2/SZ5rN9lUVa2fhlLiXWt/9aHPyvbAYDzke/hUSdIM0wxD34/jOAzD2WyDZXs4HObFeLzb75NkmiTJZDKZIplMSGIySZIdkn0URfNC1/XtdkZ/M96gh6CnISFFekD9WwbcU6p8+DuUJD+eYcky9LHz+TyKdqhw6fFUlmV+WYzWqyAQBAidoecNkTiOM6x+3kn9JnrX8zz6cwiAIATBcrkeLS5leTqmaTpN9rvxuNAPB8SYIcA4NGW76dhV2XB3lupeb7zo05qmxLPDfI9Kmy9Go/VyhUpqAe+mHEggBAC4rlWL8K5YN+KiZ0AIPfodUFIPWEKwQmiLHKNN9+MiM7TXffpWt9LKMM7ydp+Wi0CAwwEqKWhK+nYhPxXMRuEwmweF1aicFFKlW6WfuvVxjJOTyxI1D+B2V+Y/Caot6AaLSXy2q67wepxGb/sTwf2m4l/FAtA6hucn47RcMWCVJBt+Ap1vLH8tw+E0tB8Y7rqyfnHcvov5u1jOQn8+TldTpWI57LuMfxZvFck/dOtNdy4A7LuA7whwJ+cXY5xYBKDv4r0nrrc/PzKYpmnP1pwgIAhhfqZtCQliQJMgVdM0Mb54fRftfQHLDBfcQAXXbsbphCMENEMrw8cxLltz0Z9rsYTI/skgJU7fxfo78fLQ/sEQ86KTarHc+ZVB0jRJsfecVQOadZx8Ca/K1Fq32kuuegMWC2zo7k3FoGy5qwZBcJK7Me585GCe9FPgqKkHCYkSfPN8+5U4sYT7g0LGaTvjanyrxdmdcQVQ3XqecNejsXj5+To+nC+cDQ5UXMtuGOxwyWN3QBUxqxhQd9hy2aURQyTiiSvRrTuBTwaYnpu1aPrl+wCvBFzsZowruVRLqFOv0dyVMvh8qiU0ZVrNKIMmZiNeGYKDTcZp0z6sWPWHjlWDJeyq8cGes1Kt7tLrtkatpGbYs/r+BrvpqtPdWpDWDFNWammQiXrqdjiNB8dqz1ibspq1DnSk5PR80NlwA0qD7hlLKUMGSRQlXRh01KDgJVTJ+OAfWTJIeA9xF8BO6gIs0CCHGeKSLQOm8KfLLijAYlYx5Mz6dMWAKbK0AxUF1lubnO1mF/YMmEJPQdtLXHepa7hP27MFq4HplgE3qCJ32p1NIgaiW+0Zs+nSHQOlWLbaoKxVQRm2zM5OfjAQFTX2vPYorGBcMSxZaZAHBkwhpQFoS0WRSR9i0HRm09YnDERFHVct1YVl7ek4rQetMiAKST9a7cyiwISODwWzaf8LBty59UsrKgpO6VyjYGac8YoBU8TFugUTBJjS9XQB22cgddGCKQhM6dluBLpgoCpKYDyL8o6+iPq0vGfWUH9nICqqZDujxQx4HdcdA5lFnQSGsyhYxoSB2VL0DQY6ixow2znohYGqqBWrhR7MCYPPbCn6HgOh2DFSUfAyU4w+GEiLSi0WKh0v5HpiwBSbUvh8FtUrA56WF/nHFDUDs22Nv2LAFNouh58pFDAiDHJfDKRzj0cfqSgwyrANVnjqjQFPy+O9M/iIAevWXhmoivr3ifN3MWAN9e+t+SsYEEEC/70xVQy96SVKsPuoUyO9ZPSpWxGCtrt8plwr3drj+FBcPh3k+mVAzWjx+ZSpTwY0uh0HDDadKoYe9BJWRhYTC8K+dCuqgzmrfRq4oAzdtiU0Lo/ZbenDxab7eqAzblYf2DB0WA+imOUBsy05gTIoeA3EbDv3Dwx4k8xhSUDW012u4/Bm5YC1OTO4zLC9t8/MTOA3BrzcWbM/14I5YZAm7TOgZee4lc17mId439tgZ6D76gxFlIpTO+e88BiTe7tJywxIGZ2Clg6zqj3jlve9UTNKrdYOFb1UIgxRiwwivmjU4t2KhqG1MxSsjFYf7Fr8WbwJtcGaM7uffs9AjR3aNfCDE3LHT9RbORfFe5FHlsclT8VNiN1MO+fT+GQ9GLZt/GNZe3o+3YKdAOoIaRemZOS2ImZgZ2ZcMaBulgheF8ZwVjCvbLDY2i/hrix0ZFpprYraBouhHRk1Du3K2ri2wZJnTG3h9CPozki3YQjZ2SRuulBGN4K3NcjZbnhitkLPV93YtdYC0FKU3NtlZ2csuB1fygGL0DDIPRR2i6CuBVxCld5pYreA6FpALlMbLHHXoVMitgJO9Z2mMadX/PAdDsqgKuzuA3Ut7kSk/jXs7ZpThps7TeyMpTsWKygqBtXk9o5fkNX3do0TpwzuMpbIPXZNEqec9gewsI3avwa3d4/Lc3NvN+N0gPCSK4PPqXL1dLvxryHmfHZqqFUM2I0Xn7M+sL7xTWFnHLpqEQQnvWGQJS47tbO9+teQTZHduWJ34gaNDyniF07n0XdRqtR+4aiPwRV3mslyssY/H/WDxZtLNewxx7/3k6jOBM6GOQuOf/qrNHnzhOVd4gefzOx28DsRS4hu/LdWXoylKVc9Apah+ujPeMNs+7sDAStdeeaTmRv3rcRJovjUr/R5L3ACYQ2TynH/o0/msctFc3K99M7neuOTWebGJzN0E9l+6ZMZm6q1fCj+uTjBGIcieB13QFQj4as9fINBublG0HkR/8G2kwDA7/QV7wI40sUn8R8ewiaIfpR/nc9+C0AorI+F9iSCwrO4NLZtz6K0HAUWrII8kMgJnRfbxeETII4LAa1gfUl3Gxq+4p3YCaiqbFv0s2KcpMfyshjhCBYu9JrwFRCiv/AmfMWHhW0iWZDIGDiMBfoDcYiO9WhRHtNJsp9vw2t8oDfjNBFW7Ls8nG2yLNMPh3m0G+8SEkYkz69hRFwIf8YNcZwqosjL1+7eQ98HKu5quV4sLnl5PKbT6T4aF4Wuk4gpse9LCg6Pov3CgESrna1XMY5M8xoShwaWkW2ZhHORDDMMwxjHc8HRXGg4l9l2uz3oul4U8yiKxlgiHLuFJKPo+hqSXR3YhZRSR7+5pWFPQvpc328aidgEuMGFrGMcNWVDqY9jHGlkMXtNabUo9X+U68tKk2h+4ZqfvoT+/VtBrv7u67g0Zh37xazHwhpYkVGqyf/P2WSmTzMfxukn8YH+JtxQL9n+Twx1WxI7aEuss+GzXcNQaddCKbLpZBhVQjPqlzScS6lz0dS3ZFN+HR/eCAv4Bdm0/wDlqPGYIHaBlQAAAABJRU5ErkJggg==';

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
