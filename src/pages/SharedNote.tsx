import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Mic, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

export default function SharedNote() {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from('shared_notes')
        .select('*')
        .eq('share_token', token)
        .single();

      if (err || !data) {
        setError('This shared note was not found or has expired.');
      } else {
        setNote(data);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-foreground text-center">{error}</p>
      </div>
    );
  }

  const noteData = note.note_data as any;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Mic className="h-5 w-5 text-primary" />
          <span className="font-display text-lg text-primary font-semibold">Shravix AI</span>
          <span className="text-xs text-muted-foreground ml-auto">Shared Note</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          {noteData.source === 'youtube' && (
            <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 mb-2">
              <img src="/images/youtube-icon.svg" alt="YouTube" className="h-4 w-4" />
            </span>
          )}
          <h1 className="font-display text-xl text-foreground mb-2">{note.title}</h1>
          {noteData.subject && (
            <span className="text-xs font-body font-medium text-vc-blue-light bg-vc-blue/15 px-2 py-0.5 rounded-full">
              {noteData.subject}
            </span>
          )}
          {noteData.summary && (
            <p className="text-sm text-muted-foreground mt-3 italic">{noteData.summary}</p>
          )}

          <div className="mt-6">
            <MarkdownRenderer content={noteData.structuredNotes || noteData.structured_notes || ''} />
          </div>

          {noteData.keyConcepts?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-primary/10">
              {noteData.keyConcepts.map((c: string) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
              ))}
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Generated with EchoMind — AI-powered voice notes
        </p>
      </div>
    </div>
  );
}
