interface TagBadgeProps {
  type: 'personal' | 'academic' | 'meeting' | 'mixed' | 'task' | 'idea' | 'health' | 'shopping';
  size?: 'sm' | 'md';
}

const tagStyles: Record<string, string> = {
  academic: 'bg-vc-blue/15 text-vc-blue-light border-vc-blue/20',
  meeting: 'bg-primary/15 text-gold-light border-primary/20',
  personal: 'bg-foreground/10 text-foreground/80 border-foreground/15',
  mixed: 'bg-muted text-muted-foreground border-muted',
  task: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  idea: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  health: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  shopping: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

export function TagBadge({ type, size = 'sm' }: TagBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center rounded-full border font-body font-medium capitalize ${sizeClasses} ${tagStyles[type] || tagStyles.mixed}`}>
      {type}
    </span>
  );
}
