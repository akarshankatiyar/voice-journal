import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockShoppingItems } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { ShoppingCart, Check, Edit2, Save, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ShoppingList() {
  const [items, setItems] = useState(mockShoppingItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const active = items.filter(i => !i.isBought);
  const bought = items.filter(i => i.isBought);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isBought: !i.isBought } : i));
  };

  const handleEdit = (item: any) => {
    setEditData({ ...item });
    setEditingId(item.id);
  };

  const handleSave = () => {
    if (editData) {
      setItems(prev => prev.map(i => i.id === editingId ? editData : i));
    }
    setEditingId(null);
    setEditData(null);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Shopping List</h1>
        <p className="text-sm text-muted-foreground">{active.length} items to buy</p>
      </motion.div>

      {items.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-12 w-12" />} title="List is empty" description="Shopping items from conversations will appear here." />
      ) : (
        <>
          <div className="space-y-2">
            {active.map(si => (
              <motion.div key={si.id} variants={item} className="glass-card-hover p-4 flex items-center gap-3 group">
                <button
                  onClick={() => toggleItem(si.id)}
                  className="h-5 w-5 rounded border-2 border-primary/30 hover:border-primary transition-colors shrink-0"
                />
                <span className="text-sm text-foreground flex-1">{si.itemText}</span>
                <button
                  onClick={() => handleEdit(si)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          {bought.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Bought</p>
              <div className="space-y-2">
                {bought.map(si => (
                  <motion.div key={si.id} variants={item} className="glass-card p-4 flex items-center gap-3 opacity-50 group">
                    <button
                      onClick={() => toggleItem(si.id)}
                      className="h-5 w-5 rounded border-2 border-primary/30 bg-primary/20 flex items-center justify-center shrink-0"
                    >
                      <Check className="h-3 w-3 text-primary" />
                    </button>
                    <span className="text-sm text-foreground line-through flex-1">{si.itemText}</span>
                    <button
                      onClick={() => handleEdit(si)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
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
                <h2 className="font-display text-lg text-foreground">Edit Item</h2>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Item Text</label>
                  <input
                    type="text"
                    value={editData.itemText}
                    onChange={e => setEditData({ ...editData, itemText: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  />
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
