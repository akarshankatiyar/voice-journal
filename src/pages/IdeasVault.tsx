import { useState } from 'react';
import { motion } from 'framer-motion';
import { mockIdeas } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { Lightbulb } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const categories = ['all', 'startup', 'personal', 'creative'];

export default function IdeasVault() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? mockIdeas : mockIdeas.filter(i => i.category === filter);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Ideas Vault</h1>
        <p className="text-sm text-muted-foreground">{mockIdeas.length} ideas captured</p>
      </motion.div>

      <motion.div variants={item} className="flex gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-body capitalize transition-colors ${
              filter === cat ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Lightbulb className="h-12 w-12" />} title="No ideas yet" description="Ideas will be auto-extracted from your conversations." />
      ) : (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          {filtered.map(idea => (
            <motion.div key={idea.id} variants={item} className="glass-card-hover p-4 break-inside-avoid">
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 capitalize">{idea.category}</span>
              <p className="text-sm text-foreground mt-2">{idea.ideaText}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(idea.createdAt).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
