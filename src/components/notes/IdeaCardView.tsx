import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

interface IdeaCardViewProps {
  idea: string;
  category: string;
  date: string;
}

const CAT_STYLES: Record<string, string> = {
  startup: 'bg-vc-blue/10 border-vc-blue/20',
  personal: 'bg-emerald-500/10 border-emerald-500/20',
  creative: 'bg-violet-500/10 border-violet-500/20',
  other: 'bg-muted border-muted',
};

const CAT_BADGE: Record<string, string> = {
  startup: 'bg-vc-blue/20 text-vc-blue',
  personal: 'bg-emerald-500/20 text-emerald-500',
  creative: 'bg-violet-500/20 text-violet-500',
  other: 'bg-muted text-muted-foreground',
};

export function IdeaCardView({ idea, category, date }: IdeaCardViewProps) {
  const style = CAT_STYLES[category] || CAT_STYLES.other;
  const badge = CAT_BADGE[category] || CAT_BADGE.other;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border p-4 ${style}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-body font-semibold ${badge}`}>
          {category}
        </span>
        <span className="text-xs font-body text-muted-foreground">{date}</span>
      </div>
      <p className="font-display text-base text-foreground" style={{ fontFamily: "'Dancing Script', cursive" }}>
        {idea}
      </p>
    </motion.div>
  );
}
