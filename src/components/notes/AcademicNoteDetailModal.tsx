import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Share2, Trash2, Copy, MessageCircle, Mail, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { AcademicNote } from '@/data/mockData';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogPortal,
  AlertDialogOverlay,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  detail: AcademicNote | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: (id: string) => void;
}

export function AcademicNoteDetailModal({ detail, onClose, onEdit, onDelete }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShareLink = async () => {
    if (!detail) return;
    setSharing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Please sign in to share notes via link');
        setSharing(false);
        return;
      }

      const { data, error } = await supabase.from('shared_notes').insert({
        note_type: detail.source === 'youtube' ? 'youtube' : 'academic',
        note_data: {
          title: detail.title,
          subject: detail.subject,
          structuredNotes: detail.structuredNotes,
          keyConcepts: detail.keyConcepts,
          summary: detail.summary,
          source: detail.source,
        },
        title: detail.title,
        created_by: sessionData.session.user.id,
      }).select('share_token').single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/shared/${data.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (err: any) {
      console.error('Share error:', err);
      toast.error('Failed to create share link');
    }
    setSharing(false);
  };

  const handleShare = (method: string) => {
    if (!detail) return;
    const text = `${detail.title}\n\n${detail.structuredNotes}`;
    
    if (method === 'copy') {
      navigator.clipboard.writeText(text);
      toast.success('Notes copied to clipboard');
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (method === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(detail.title)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleDelete = () => {
    if (detail && onDelete) {
      onDelete(detail.id);
      setDeleteOpen(false);
      onClose();
      toast.success('Note deleted');
    }
  };

  return (
    <>
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
              className="glass-card max-w-2xl w-full max-h-[80vh] flex flex-col p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  {detail.source === 'youtube' ? (
                    <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5">
                      <img src="/images/youtube-icon.svg" alt="YouTube" className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="text-xs font-body font-medium text-vc-blue-light bg-vc-blue/15 px-2 py-0.5 rounded-full">{detail.subject}</span>
                  )}
                  <h2 className="font-display text-xl text-foreground mt-2">{detail.title}</h2>
                  {detail.source === 'youtube' && (
                    <p className="text-xs text-muted-foreground mt-1">{detail.subject}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Share */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-[70]">
                      <DropdownMenuItem onClick={handleShareLink} className="gap-2" disabled={sharing}>
                        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                        Share Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')} className="gap-2">
                        <Copy className="h-4 w-4" /> Copy to Clipboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="gap-2">
                        <MessageCircle className="h-4 w-4" /> Share via WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('email')} className="gap-2">
                        <Mail className="h-4 w-4" /> Share via Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Edit */}
                  <button onClick={onEdit} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {/* Delete */}
                  {onDelete && (
                    <button onClick={() => setDeleteOpen(true)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {/* Close */}
                  <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {detail.keyConcepts.map(c => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
                  ))}
                </div>
                <MarkdownRenderer content={detail.structuredNotes} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="z-[65]" />
          <AlertDialogContent className="z-[70]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This note will be permanently deleted and cannot be restored.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </>
  );
}
