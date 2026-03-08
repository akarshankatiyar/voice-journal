import { TagBadge } from './TagBadge';
import { Clock, Users as UsersIcon } from 'lucide-react';
import type { Conversation } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const sectionMap: Record<string, { label: string; path: string }> = {
  academic: { label: 'Academic Notes', path: '/academic-notes' },
  meeting: { label: 'Meeting Notes', path: '/meeting-notes' },
  personal: { label: "Today's Text", path: '/todays-text' },
  mixed: { label: "Today's Text", path: '/todays-text' },
};

const typeColors: Record<string, string> = {
  academic: 'text-vc-blue',
  meeting: 'text-emerald-500',
  personal: 'text-foreground',
  mixed: 'text-muted-foreground',
};

export function ConversationCard({ conv, onCardClick }: { conv: Conversation; onCardClick?: (conv: Conversation) => void }) {
  const navigate = useNavigate();
  const section = sectionMap[conv.type] || sectionMap.personal;

  const handleClick = () => {
    navigate(section.path);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left glass-card-hover p-4 transition-all hover:scale-[1.01]"
    >
      <h3 className={`font-display text-base ${typeColors[conv.type] || 'text-foreground'}`}>
        {conv.title}
      </h3>

      <div className="flex items-center gap-2 flex-wrap mt-2 mb-2">
        <TagBadge type={conv.type} />
        {conv.subTypes.map(st => <TagBadge key={st} type={st as any} />)}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(conv.startedAt)}
        </span>
        {conv.peopleMentioned.length > 0 && (
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            {conv.peopleMentioned.join(', ')}
          </span>
        )}
      </div>

      {conv.linkedSection && (
        <p className="text-xs text-primary mt-1">
          📚 Saved to {conv.linkedSection === 'academic_notes' ? 'Academic Notes' : 'Meeting Notes'} →
        </p>
      )}
    </button>
  );
}
