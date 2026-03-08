import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '@/store/useConversationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { CheckSquare, Plus, Clock, Edit2, Save, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function TasksReminders() {
  const [tasks, setTasks] = useState(mockTasks);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const pending = tasks.filter(t => !t.isDone);
  const completed = tasks.filter(t => t.isDone);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t));
  };

  const handleEdit = (task: any) => {
    setEditData({ ...task });
    setEditingId(task.id);
  };

  const handleSave = () => {
    if (editData) {
      setTasks(prev => prev.map(t => t.id === editingId ? editData : t));
    }
    setEditingId(null);
    setEditData(null);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground mb-1">Tasks & Reminders</h1>
          <p className="text-sm text-muted-foreground">{pending.length} pending</p>
        </div>
      </motion.div>

      {pending.length === 0 && completed.length === 0 ? (
        <EmptyState icon={<CheckSquare className="h-12 w-12" />} title="No tasks" description="Tasks will be auto-extracted from your conversations." />
      ) : (
        <>
          <div className="space-y-2">
            {pending.map(task => (
              <motion.div key={task.id} variants={item} className="glass-card-hover p-4 flex items-start gap-3 group">
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 h-5 w-5 rounded border-2 border-primary/30 hover:border-primary transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{task.taskText}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{task.dueHint}</span>
                </div>
                <button
                  onClick={() => handleEdit(task)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all shrink-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          {completed.length > 0 && (
            <div>
              <button onClick={() => setShowCompleted(!showCompleted)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
                {showCompleted ? 'Hide' : 'Show'} completed ({completed.length})
              </button>
              {showCompleted && (
                <div className="space-y-2 mt-3">
                  {completed.map(task => (
                    <motion.div key={task.id} variants={item} className="glass-card p-4 flex items-start gap-3 opacity-60 group">
                      <button onClick={() => toggleTask(task.id)} className="mt-0.5 h-5 w-5 rounded border-2 border-primary/30 bg-primary/20 flex items-center justify-center shrink-0">
                        <CheckSquare className="h-3 w-3 text-primary" />
                      </button>
                      <p className="text-sm text-foreground line-through flex-1">{task.taskText}</p>
                      <button
                        onClick={() => handleEdit(task)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all shrink-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
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
                <h2 className="font-display text-lg text-foreground">Edit Task</h2>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Task</label>
                  <textarea
                    value={editData.taskText}
                    onChange={e => setEditData({ ...editData, taskText: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Due Hint</label>
                  <input
                    type="text"
                    value={editData.dueHint}
                    onChange={e => setEditData({ ...editData, dueHint: e.target.value })}
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
