import { useState } from 'react';
import { motion } from 'framer-motion';
import { mockTasks } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { CheckSquare, Plus, Clock } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function TasksReminders() {
  const [tasks, setTasks] = useState(mockTasks);
  const [showCompleted, setShowCompleted] = useState(false);
  const pending = tasks.filter(t => !t.isDone);
  const completed = tasks.filter(t => t.isDone);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t));
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
              <motion.div key={task.id} variants={item} className="glass-card-hover p-4 flex items-start gap-3">
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 h-5 w-5 rounded border-2 border-primary/30 hover:border-primary transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{task.taskText}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{task.dueHint}</span>
                </div>
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
                    <motion.div key={task.id} variants={item} className="glass-card p-4 flex items-start gap-3 opacity-60">
                      <button onClick={() => toggleTask(task.id)} className="mt-0.5 h-5 w-5 rounded border-2 border-primary/30 bg-primary/20 flex items-center justify-center shrink-0">
                        <CheckSquare className="h-3 w-3 text-primary" />
                      </button>
                      <p className="text-sm text-foreground line-through">{task.taskText}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
