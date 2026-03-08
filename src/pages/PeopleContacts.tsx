import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockPeople } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, MessageSquare, Clock, Edit2, Save, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PeopleContacts() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const detail = mockPeople.find(p => p.id === selectedId);

  const handleOpenDetail = (person: any) => {
    setSelectedId(person.id);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (detail) {
      setEditData({ ...detail });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    setEditData(null);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">People & Contacts</h1>
        <p className="text-sm text-muted-foreground">{mockPeople.length} people mentioned in conversations</p>
      </motion.div>

      {mockPeople.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No contacts" description="People mentioned in conversations will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mockPeople.map(person => (
            <motion.button
              key={person.id}
              variants={item}
              onClick={() => handleOpenDetail(person)}
              className="w-full text-left glass-card-hover p-5 transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-display text-lg">
                  {person.name[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base text-foreground">{person.name}</h3>
                  <p className="text-xs text-muted-foreground">{person.relationship}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{person.notes}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last: {timeAgo(person.lastTalked)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{person.conversationIds.length} conversations</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && !isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-md w-full p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-display text-xl">
                    {detail.name[0]}
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-foreground">{detail.name}</h2>
                    <p className="text-xs text-muted-foreground">{detail.relationship}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleEdit} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground p-2">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground/80 mb-4">{detail.notes}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last: {timeAgo(detail.lastTalked)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{detail.conversationIds.length} conversations</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {detail && isEditing && editData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-md w-full p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-lg text-foreground">Edit Contact</h2>
                <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Name</label>
                  <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Relationship</label>
                  <input type="text" value={editData.relationship} onChange={e => setEditData({ ...editData, relationship: e.target.value })} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">Notes</label>
                  <textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded bg-background border border-primary/20 text-foreground text-sm font-body resize-none focus:outline-none focus:border-primary" />
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t border-primary/10">
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 text-sm px-3 py-2 rounded border border-muted text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button onClick={handleSave} className="flex items-center gap-1 text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Save className="h-4 w-4" /> Save
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
