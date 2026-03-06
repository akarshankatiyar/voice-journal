import { motion } from 'framer-motion';
import { mockPeople } from '@/data/mockData';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, MessageSquare, Clock } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PeopleContacts() {
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
            <motion.div key={person.id} variants={item} className="glass-card-hover p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-display text-lg">
                  {person.name[0]}
                </div>
                <div>
                  <h3 className="font-display text-base text-foreground">{person.name}</h3>
                  <p className="text-xs text-muted-foreground">{person.relationship}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{person.notes}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last: {timeAgo(person.lastTalked)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{person.conversationIds.length} conversations</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
