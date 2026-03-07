import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MicButton } from '@/components/recording/MicButton';
import { LiveTranscript } from '@/components/shared/LiveTranscript';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { useAppStore } from '@/store/useAppStore';
import { useAIProcessing } from '@/hooks/useAIProcessing';
import { useConversationStore } from '@/store/useConversationStore';
import { MessageSquare, ArrowRight, Sparkles, RefreshCw, Lightbulb, Mic, GraduationCap, Users, CheckSquare, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function timeAgoShort(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Home() {
  const isRecording = useAppStore((s) => s.isRecording);
  const liveTranscript = useAppStore((s) => s.liveTranscript);
  const navigate = useNavigate();
  const { fetchDailySummary, dailySummary, isProcessing } = useAIProcessing();
  const conversations = useConversationStore((s) => s.conversations);
  const tasks = useConversationStore((s) => s.tasks);
  const academicNotes = useConversationStore((s) => s.academicNotes);
  const meetingNotes = useConversationStore((s) => s.meetingNotes);
  const ideas = useConversationStore((s) => s.ideas);

  const pendingTasks = tasks.filter(t => !t.isDone).length;
  const lecturesCaptured = academicNotes.length;
  const meetingsCaptured = meetingNotes.length;
  const ideasCaptured = ideas.length;

  const lastCaptured = conversations.length > 0
    ? timeAgoShort(conversations[0].startedAt)
    : null;

  const [summaryText, setSummaryText] = useState<string>('');
  const [smartPrompt, setSmartPrompt] = useState<string>('');
  const [promptLink, setPromptLink] = useState<string>('/tasks');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadDailySummary = useCallback(async () => {
    setSummaryLoading(true);
    const dayData = mockConversations.map(c => `[${c.type}] ${c.title}: ${c.summary}`).join('\n');
    if (dayData.length > 10) {
      const result = await fetchDailySummary(dayData);
      if (result) {
        setSummaryText(result.summary);
        setSmartPrompt(result.smart_prompt);
        setPromptLink(result.prompt_link || '/tasks');
      }
    }
    setSummaryLoading(false);
  }, [fetchDailySummary]);

  useEffect(() => {
    // Load summary on mount
    loadDailySummary();
    // Refresh smart prompt every 30 minutes
    const interval = setInterval(loadDailySummary, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDailySummary]);

  const hasData = mockConversations.length > 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Component 1 — Live Status Card */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-display text-lg text-foreground">EchoMind is Active</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: GraduationCap, label: 'Lectures', value: lecturesCaptured, color: 'text-vc-blue' },
            { icon: Users, label: 'Meetings', value: meetingsCaptured, color: 'text-gold' },
            { icon: Lightbulb, label: 'Ideas', value: ideasCaptured, color: 'text-violet-400' },
            { icon: CheckSquare, label: 'Tasks', value: pendingTasks, color: 'text-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card/60 rounded-lg p-3 text-center border border-primary/5">
              <stat.icon className={`h-4 w-4 mx-auto mb-1.5 ${stat.color}`} />
              <p className="font-display text-xl text-foreground">{stat.value}</p>
              <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-body text-muted-foreground mt-3">
          {lastCaptured ? `Last captured: ${lastCaptured}` : 'Waiting to capture your day...'}
        </p>
      </motion.div>

      {/* Component 2 — Daily Summary Card */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="font-display text-base text-foreground">Today's Brief</span>
          </div>
          <button
            onClick={loadDailySummary}
            disabled={summaryLoading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p
          className="text-sm text-foreground/80 leading-relaxed italic"
          style={{ fontFamily: "'Dancing Script', cursive, serif" }}
        >
          {summaryLoading
            ? 'Generating your daily brief...'
            : summaryText || (hasData ? 'Tap 🔄 to generate your daily brief.' : 'Your daily brief will appear here once you start capturing.')}
        </p>
      </motion.div>

      {/* Component 3 — Smart Prompt Card */}
      <motion.div variants={item}>
        <button
          onClick={() => navigate(promptLink)}
          className="w-full text-left glass-card-hover p-5 group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gold/10 shrink-0">
              <Lightbulb className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-body text-foreground group-hover:text-foreground/90 transition-colors">
                {smartPrompt || (hasData
                  ? `You have ${pendingTasks} pending tasks — want to review them?`
                  : 'Start recording to get personalized suggestions here.')}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Tap to explore <ArrowRight className="h-3 w-3" />
              </p>
            </div>
          </div>
        </button>
      </motion.div>

      {/* Manual Record Button (secondary) */}
      <motion.div variants={item} className="flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <MicButton size="sm" />
          <span className="text-xs font-body text-muted-foreground flex items-center gap-1">
            <Mic className="h-3 w-3" /> Manual Record
          </span>
        </div>
      </motion.div>

      {/* Live transcript (shown when recording) */}
      {(isRecording || liveTranscript) && (
        <motion.div variants={item}>
          <LiveTranscript />
        </motion.div>
      )}

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
    </motion.div>
  );
}
