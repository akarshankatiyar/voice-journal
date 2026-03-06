import { useState } from 'react';
import { motion } from 'framer-motion';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { mockConversations } from '@/data/mockData';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AllConversations() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Filter conversations by selected date
  const filteredConversations = selectedDate
    ? mockConversations.filter(conv => {
        const convDate = new Date(conv.startedAt);
        return (
          convDate.getFullYear() === selectedDate.getFullYear() &&
          convDate.getMonth() === selectedDate.getMonth() &&
          convDate.getDate() === selectedDate.getDate()
        );
      })
    : [];

  const formatDateDisplay = selectedDate
    ? format(selectedDate, 'MMMM d, yyyy')
    : 'Select a date';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">All Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Select a date to view conversations
        </p>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <CalendarIcon className="h-4 w-4" />
              {formatDateDisplay}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-primary/20" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) =>
                date > new Date() || date < new Date('2024-01-01')
              }
            />
          </PopoverContent>
        </Popover>
      </motion.div>

      {selectedDate && (
        <motion.div variants={item} className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {filteredConversations.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No conversations recorded for {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            ) : (
              <>
                <p className="mb-4 font-medium">
                  {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} on {format(selectedDate, 'MMMM d, yyyy')}
                </p>
                <div className="space-y-3">
                  {filteredConversations.map(conv => (
                    <ConversationCard key={conv.id} conv={conv} />
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
