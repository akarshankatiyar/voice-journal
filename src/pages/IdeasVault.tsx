import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '@/store/useConversationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { Lightbulb, Edit2, Save, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const categories = ['all', 'startup', 'personal', 'creative'];

export default function IdeasVault() {
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const ideas = useConversationStore((s) => s.ideas);
  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.category === filter);

  const handleEdit = (idea: any) => {
    setEditData({ ...idea });
    setEditingId(idea.id);
  };

  const handleSave = () => {
    // In a real app, this would update the data in your backend/store
    setEditingId(null);
    setEditData(null);
  };

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
            <motion.div key={idea.id} variants={item} className="glass-card-hover p-4 break-inside-avoid group relative">
              <button
                onClick={() => handleEdit(idea)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 capitalize">{idea.category}</span>
              <p className="text-sm text-foreground mt-2">{idea.ideaText}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(idea.createdAt).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && editData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setEditingId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-md w-full p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-lg text-foreground">Edit Idea</h2>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Idea</label>
                  <textarea
                    value={editData.ideaText}
                    onChange={e => setEditData({ ...editData, ideaText: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Category</label>
                  <select
                    value={editData.category}
                    onChange={e => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    <option>startup</option>
                    <option>personal</option>
                    <option>creative</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t border-primary/10">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1 text-sm px-3 py-2 rounded border border-muted text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
