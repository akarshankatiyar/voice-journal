import { useState } from 'react';
import { motion } from 'framer-motion';
import { mockHealthLogs } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { Heart } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const categories = ['all', 'symptom', 'medicine', 'appointment', 'general'];

const catColors: Record<string, string> = {
  symptom: 'bg-rose-500/15 text-rose-400',
  medicine: 'bg-emerald-500/15 text-emerald-400',
  appointment: 'bg-vc-blue/15 text-vc-blue-light',
  general: 'bg-muted text-muted-foreground',
};

export default function HealthLog() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? mockHealthLogs : mockHealthLogs.filter(h => h.category === filter);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Health Log</h1>
        <p className="text-sm text-muted-foreground">{mockHealthLogs.length} entries</p>
      </motion.div>

      <motion.div variants={item} className="flex gap-2 flex-wrap">
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
        <EmptyState icon={<Heart className="h-12 w-12" />} title="No entries" description="Health mentions from conversations will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map(log => (
            <motion.div key={log.id} variants={item} className="glass-card-hover p-4 flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-rose-400 shrink-0" />
              <div>
                <p className="text-sm text-foreground">{log.healthText}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${catColors[log.category]}`}>{log.category}</span>
                  <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
