import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

interface AcademicNoteViewProps {
  title: string;
  subject: string;
  structuredNotes: string;
  keyConcepts: string[];
  summary: string;
  definitions?: { term: string; definition: string }[];
  formulas?: { name: string; formula: string }[];
  comparisons?: { item1: string; item2: string; basis: string }[];
}

export function AcademicNoteView({
  title, subject, structuredNotes, keyConcepts, summary,
  definitions = [], formulas = [], comparisons = [],
}: AcademicNoteViewProps) {
  // Parse markdown headings and content
  const sections = structuredNotes.split(/(?=^## )/m).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Subject Badge */}
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-body font-semibold bg-vc-blue/20 text-vc-blue">
          {subject}
        </span>
      </div>

      {/* Title */}
      <h2 className="font-display text-2xl text-foreground border-l-4 border-vc-blue pl-4">
        {title}
      </h2>

      {/* Key Concepts */}
      {keyConcepts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keyConcepts.map((c) => (
            <span key={c} className="px-2 py-1 text-xs font-body rounded-md bg-vc-blue/10 text-vc-blue border border-vc-blue/20">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Definitions */}
      {definitions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-body font-semibold text-muted-foreground uppercase tracking-wider">Definitions</h3>
          {definitions.map((d) => (
            <div key={d.term} className="bg-vc-blue/10 border border-vc-blue/20 rounded-lg p-3">
              <span className="font-display text-sm text-foreground font-bold">{d.term}</span>
              <p className="text-sm font-body text-foreground/80 mt-1">{d.definition}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulas */}
      {formulas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-body font-semibold text-muted-foreground uppercase tracking-wider">Formulas</h3>
          {formulas.map((f) => (
            <div key={f.name} className="border-2 border-gold/30 rounded-lg p-3 bg-gold/5">
              <p className="text-xs font-body text-muted-foreground mb-1">{f.name}</p>
              <code className="font-mono text-sm text-foreground">{f.formula}</code>
            </div>
          ))}
        </div>
      )}

      {/* Comparisons */}
      {comparisons.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-body font-semibold text-muted-foreground uppercase tracking-wider">Comparisons</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body border border-primary/10 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-primary/5">
                  <th className="text-left p-2 text-muted-foreground">Basis</th>
                  <th className="text-left p-2 text-vc-blue">Item A</th>
                  <th className="text-left p-2 text-gold">Item B</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={i} className="border-t border-primary/5">
                    <td className="p-2 text-muted-foreground">{c.basis}</td>
                    <td className="p-2 text-foreground">{c.item1}</td>
                    <td className="p-2 text-foreground">{c.item2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Structured Notes - Full Markdown */}
      <MarkdownRenderer content={structuredNotes} showToc={false} />

      {/* Summary */}
      <div className="bg-vc-blue/5 border border-vc-blue/15 rounded-xl p-4">
        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
        <p className="text-sm font-body italic text-foreground/80" style={{ fontFamily: "'Dancing Script', cursive" }}>
          {summary}
        </p>
      </div>
    </motion.div>
  );
}
