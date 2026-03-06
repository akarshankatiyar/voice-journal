import { useState } from 'react';
import { motion } from 'framer-motion';
import { mockShoppingItems } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { ShoppingCart, Check } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ShoppingList() {
  const [items, setItems] = useState(mockShoppingItems);
  const active = items.filter(i => !i.isBought);
  const bought = items.filter(i => i.isBought);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isBought: !i.isBought } : i));
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
              <motion.div key={si.id} variants={item} className="glass-card-hover p-4 flex items-center gap-3">
                <button
                  onClick={() => toggleItem(si.id)}
                  className="h-5 w-5 rounded border-2 border-primary/30 hover:border-primary transition-colors shrink-0"
                />
                <span className="text-sm text-foreground">{si.itemText}</span>
              </motion.div>
            ))}
          </div>

          {bought.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Bought</p>
              <div className="space-y-2">
                {bought.map(si => (
                  <motion.div key={si.id} variants={item} className="glass-card p-4 flex items-center gap-3 opacity-50">
                    <button
                      onClick={() => toggleItem(si.id)}
                      className="h-5 w-5 rounded border-2 border-primary/30 bg-primary/20 flex items-center justify-center shrink-0"
                    >
                      <Check className="h-3 w-3 text-primary" />
                    </button>
                    <span className="text-sm text-foreground line-through">{si.itemText}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
