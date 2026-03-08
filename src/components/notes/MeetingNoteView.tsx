import { motion } from 'framer-motion';
import { CheckSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

interface ActionItem {
  task: string;
  owner?: string;
  due?: string;
}

interface KeyNumber {
  label: string;
  value: string;
}

interface MeetingNoteViewProps {
  title: string;
  attendees: string[];
  agenda: string;
  actionItems: (string | ActionItem)[];
  decisions: string[];
  problems?: string[];
  keyNumbers?: KeyNumber[];
  structuredNotes: string;
  summary: string;
}

const AVATAR_COLORS = [
  'bg-gold text-foreground',
  'bg-vc-blue text-primary-foreground',
  'bg-emerald-500 text-primary-foreground',
  'bg-violet-500 text-primary-foreground',
  'bg-rose-500 text-primary-foreground',
];

export function MeetingNoteView({
  title, attendees, agenda, actionItems, decisions,
  problems = [], keyNumbers = [], structuredNotes, summary,
}: MeetingNoteViewProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleCheck = (i: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Title */}
      <h2 className="font-display text-2xl text-foreground border-l-4 border-gold pl-4">
        {title}
      </h2>

      {/* Attendees */}
      <div className="flex flex-wrap gap-2">
        {attendees.map((a, i) => (
          <span key={a} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">
              {a.charAt(0).toUpperCase()}
            </span>
            {a}
          </span>
        ))}
      </div>

      {/* Agenda */}
      {agenda && (
        <div className="bg-gold/5 border border-gold/15 rounded-lg p-3">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-1">Agenda</p>
          <p className="text-sm font-body text-foreground/85">{agenda}</p>
        </div>
      )}

      {/* Key Numbers */}
      {keyNumbers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {keyNumbers.map((kn) => (
            <div key={kn.label} className="glass-card p-4 text-center">
              <p className="font-display text-2xl text-gold">{kn.value}</p>
              <p className="text-xs font-body text-muted-foreground mt-1">{kn.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-body font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-500" /> Action Items
          </h3>
          {actionItems.map((item, i) => {
            const text = typeof item === 'string' ? item : item.task;
            const owner = typeof item === 'string' ? null : item.owner;
            const due = typeof item === 'string' ? null : item.due;
            const done = checkedItems.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className={`w-full text-left glass-card p-3 flex items-start gap-3 transition-all ${done ? 'opacity-60' : ''}`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}>
                  {done && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-body text-foreground ${done ? 'line-through' : ''}`}>{text}</p>
                  <div className="flex gap-2 mt-1">
                    {owner && <span className="text-xs px-1.5 py-0.5 rounded bg-vc-blue/10 text-vc-blue">{owner}</span>}
                    {due && <span className="text-xs px-1.5 py-0.5 rounded bg-gold/10 text-gold">{due}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Decisions */}
      {decisions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-body font-semibold text-muted-foreground uppercase tracking-wider">Decisions</h3>
          {decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm font-body text-foreground/85">{d}</p>
            </div>
          ))}
        </div>
      )}

      {/* Problems */}
      {problems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-body font-semibold text-muted-foreground uppercase tracking-wider">Issues Discussed</h3>
          {problems.map((p, i) => (
            <div key={i} className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm font-body text-foreground/85">{p}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gold/5 border-l-4 border-gold rounded-r-xl p-4">
        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
        <p className="text-sm font-body text-foreground/80" style={{ fontFamily: "'Dancing Script', cursive" }}>
          {summary}
        </p>
      </div>
    </motion.div>
  );
}
