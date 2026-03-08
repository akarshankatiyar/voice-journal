import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TagBadge } from './TagBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Clock, Users as UsersIcon } from 'lucide-react';
import type { Conversation } from '@/data/mockData';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversationDetailModal({ conversation, open, onOpenChange }: Props) {
  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            {conversation.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <TagBadge type={conversation.type} />
                {conversation.subTypes.map(st => <TagBadge key={st} type={st as any} />)}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(conversation.startedAt)}
                </span>
                {conversation.peopleMentioned.length > 0 && (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" />
                    {conversation.peopleMentioned.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {conversation.summary && (
            <div>
              <h4 className="text-xs font-body font-medium text-primary uppercase tracking-wider mb-2">Summary</h4>
              <MarkdownRenderer content={conversation.summary} showToc={false} />
            </div>
          )}

          {conversation.fullTranscript && (
            <div>
              <h4 className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-2">Transcript</h4>
              <MarkdownRenderer content={conversation.fullTranscript} />
            </div>
          )}

          {conversation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-primary/10">
              {conversation.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
