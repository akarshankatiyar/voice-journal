import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface TaskCardViewProps {
  task: string;
  dueHint: string;
  priority?: 'high' | 'medium' | 'low';
  isDone: boolean;
  onToggle?: () => void;
}

const DUE_COLORS: Record<string, string> = {
  today: 'bg-destructive/15 text-destructive border-destructive/30',
  tomorrow: 'bg-destructive/10 text-destructive/80 border-destructive/20',
  'this week': 'bg-gold/15 text-gold border-gold/30',
  'next week': 'bg-muted text-muted-foreground border-muted',
};

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-destructive',
  medium: 'border-l-gold',
  low: 'border-l-emerald-500',
};

export function TaskCardView({ task, dueHint, priority = 'medium', isDone, onToggle }: TaskCardViewProps) {
  const dueClass = DUE_COLORS[dueHint.toLowerCase()] || 'bg-muted text-muted-foreground border-muted';
  const borderClass = PRIORITY_BORDER[priority] || 'border-l-muted';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card border-l-4 ${borderClass} p-4 flex items-start gap-3 transition-all ${isDone ? 'opacity-50' : ''}`}
    >
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/30 hover:border-emerald-500'}`}>
          {isDone && <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />}
        </div>
      </button>
      <div className="flex-1">
        <p className={`text-sm font-body text-foreground ${isDone ? 'line-through' : ''}`}>{task}</p>
        <div className="flex gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${dueClass}`}>{dueHint}</span>
        </div>
      </div>
    </motion.div>
  );
}
