import { motion } from 'framer-motion';
import { MicButton } from '@/components/recording/MicButton';
import { LiveTranscript } from '@/components/shared/LiveTranscript';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { useAppStore } from '@/store/useAppStore';
import { mockConversations, mockTasks, mockIdeas } from '@/data/mockData';
import { MessageSquare, CheckSquare, Lightbulb, Calendar, GraduationCap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  const isRecording = useAppStore((s) => s.isRecording);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const pendingTasks = mockTasks.filter(t => !t.isDone).length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-1">{greeting}</h1>
        <p className="text-muted-foreground font-body">What's on your mind today?</p>
      </motion.div>

      {/* Recording Card */}
      <motion.div variants={item} className="glass-card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center gap-5">
          <MicButton size="lg" />
          <div>
            <p className="font-display text-lg text-foreground">
              {isRecording ? 'Recording...' : 'Tap to start recording'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRecording ? 'Speak naturally. Your voice is being transcribed live.' : 'Your voice will be transcribed, classified, and organized by AI.'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <LiveTranscript />
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        {[
          { icon: MessageSquare, label: "Today's Conversations", value: mockConversations.length, color: 'text-primary' },
          { icon: CheckSquare, label: 'Pending Tasks', value: pendingTasks, color: 'text-emerald-400' },
          { icon: Lightbulb, label: 'Ideas Captured', value: mockIdeas.length, color: 'text-violet-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
            <p className="font-display text-2xl text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-foreground">Recent Activity</h2>
          <Link to="/conversations" className="text-sm text-primary hover:text-gold-light transition-colors flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {mockConversations.slice(0, 3).map(conv => (
            <ConversationCard key={conv.id} conv={conv} />
          ))}
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/todays-text', icon: Calendar, label: "Today's Text", desc: 'View all recordings from today' },
          { to: '/academic-notes', icon: GraduationCap, label: 'Academic Notes', desc: 'AI-structured study notes' },
          { to: '/conversations', icon: MessageSquare, label: 'All Conversations', desc: 'Browse your full history' },
        ].map((link) => (
          <Link key={link.to} to={link.to} className="glass-card-hover p-4 group">
            <link.icon className="h-5 w-5 text-primary mb-2 group-hover:text-gold-light transition-colors" />
            <p className="font-display text-sm text-foreground">{link.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
