import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MicButton } from '@/components/recording/MicButton';
import { LiveTranscript } from '@/components/shared/LiveTranscript';
import { ConversationCard } from '@/components/shared/ConversationCard';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { YouTubeImportDialog } from '@/components/youtube/YouTubeImportDialog';
import { useAppStore } from '@/store/useAppStore';
import { useAIProcessing } from '@/hooks/useAIProcessing';
import { useConversationStore } from '@/store/useConversationStore';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useDeviceCapture } from '@/hooks/useDeviceCapture';
import { useAutoProcess } from '@/hooks/useAutoProcess';
import { ArrowRight, Sparkles, RefreshCw, GraduationCap, Users, CheckSquare, Lightbulb, Calendar, Brain, Monitor, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

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

const typeColorBorder: Record<string, string> = {
  academic: 'border-l-[hsl(215,100%,50%)]',
  meeting: 'border-l-[hsl(42,100%,50%)]',
  personal: 'border-l-[hsl(0,0%,60%)]',
  mixed: 'border-l-[hsl(0,0%,60%)]',
};

export default function Home() {
  const isRecording = useAppStore((s) => s.isRecording);
  const captureMode = useAppStore((s) => s.captureMode);
  const liveTranscript = useAppStore((s) => s.liveTranscript);
  const setCaptureMode = useAppStore((s) => s.setCaptureMode);
  const { fetchDailySummary } = useAIProcessing();
  const conversations = useConversationStore((s) => s.conversations);
  const tasks = useConversationStore((s) => s.tasks);
  const academicNotes = useConversationStore((s) => s.academicNotes);
  const meetingNotes = useConversationStore((s) => s.meetingNotes);
  const ideas = useConversationStore((s) => s.ideas);
  const { startRecording, stopRecording } = useVoiceCapture();
  const { startDeviceCapture, stopDeviceCapture } = useDeviceCapture();
  const { processAndSave } = useAutoProcess();

  const pendingTasks = tasks.filter(t => !t.isDone).length;
  const lecturesCaptured = academicNotes.length;
  const meetingsCaptured = meetingNotes.length;
  const ideasCaptured = ideas.length;

  const lastCaptured = conversations.length > 0
    ? timeAgoShort(conversations[0].startedAt)
    : null;

  const [summaryText, setSummaryText] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  const loadDailySummary = useCallback(async () => {
    setSummaryLoading(true);
    const dayData = conversations.map(c => `[${c.type}] ${c.title}: ${c.summary}`).join('\n');
    if (dayData.length > 10) {
      const result = await fetchDailySummary(dayData);
      if (result) setSummaryText(result.summary);
    }
    setSummaryLoading(false);
  }, [fetchDailySummary, conversations]);

  useEffect(() => {
    loadDailySummary();
    const interval = setInterval(loadDailySummary, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDailySummary]);

  const hasData = conversations.length > 0;

  const handleMicClick = () => {
    if (isRecording && captureMode === 'mic') {
      setCaptureMode(null);
      const transcript = stopRecording();
      if (transcript && transcript.length > 10) processAndSave(transcript);
    } else if (!isRecording) {
      setCaptureMode('mic');
      startRecording((transcript) => processAndSave(transcript));
    }
  };

  const handleLectureClick = () => {
    if (isRecording && captureMode === 'device') {
      setCaptureMode(null);
      const transcript = stopDeviceCapture();
      if (transcript && transcript.length > 10) processAndSave(transcript);
    } else if (!isRecording) {
      setCaptureMode('device');
      startDeviceCapture((transcript) => processAndSave(transcript));
    }
  };

  const statTiles = [
    { icon: GraduationCap, label: 'Lectures', value: lecturesCaptured, bg: 'bg-[hsl(215,100%,50%,0.12)]', color: 'text-vc-blue', path: '/academic-notes' },
    { icon: Users, label: 'Meetings', value: meetingsCaptured, bg: 'bg-[hsl(42,100%,50%,0.12)]', color: 'text-gold', path: '/meeting-notes' },
    { icon: Lightbulb, label: 'Ideas', value: ideasCaptured, bg: 'bg-[hsl(270,60%,50%,0.12)]', color: 'text-violet-400', path: '/ideas' },
    { icon: CheckSquare, label: 'Tasks', value: pendingTasks, bg: 'bg-[hsl(142,70%,45%,0.12)]', color: 'text-emerald-500', path: '/tasks' },
  ];

  const quickAccess = [
    { icon: Calendar, label: 'Daily Capture', path: '/todays-text' },
    { icon: GraduationCap, label: 'Study Notes', path: '/academic-notes' },
    { icon: Brain, label: 'Memory Archive', path: '/conversations' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 overflow-x-hidden w-full min-w-0">
      <TopNavbar />

      {/* Live transcript */}
      {(isRecording || liveTranscript) && (
        <motion.div variants={item}>
          <LiveTranscript />
        </motion.div>
      )}

      {/* Capture Bar */}
      <motion.div variants={item}>
        <div className="rounded-2xl overflow-hidden border border-primary/10" style={{
          background: 'linear-gradient(90deg, hsl(215 100% 50% / 0.08) 0%, hsl(0 100% 50% / 0.08) 100%)'
        }}>
          <div className="flex items-stretch">
            {/* Record half */}
            <button
              onClick={handleMicClick}
              className="flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-3 sm:px-6 hover:bg-primary/5 transition-colors min-w-0"
            >
              <span className={`text-xl sm:text-2xl ${isRecording ? 'animate-pulse' : ''}`}>🎙️</span>
              <span className="font-display text-sm sm:text-base text-foreground truncate">
                {isRecording ? 'Stop' : 'Record'}
              </span>
              {isRecording && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />}
            </button>

            {/* Divider */}
            <div className="w-px bg-primary/10 my-3" />

            {/* Video to Notes — opens YouTube import */}
            <button
              onClick={() => setYoutubeOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-3 sm:px-6 hover:bg-primary/5 transition-colors min-w-0"
            >
              <img src="/images/youtube-icon.svg" alt="YouTube" className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="font-display text-sm sm:text-base text-foreground truncate">Video to Notes</span>
            </button>
          </div>
        </div>
      </motion.div>

      <YouTubeImportDialog open={youtubeOpen} onOpenChange={setYoutubeOpen} />

      {/* Status Card */}
      <motion.div variants={item} className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="font-display text-lg sm:text-xl text-foreground font-bold">Shravix AI is Active</span>
          </div>
          {lastCaptured && (
            <span className="text-[10px] font-body text-muted-foreground bg-card/60 px-2 py-1 rounded-full border border-primary/5">
              Last: {lastCaptured}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {statTiles.map((stat) => (
            <Link
              key={stat.label}
              to={stat.path}
              className={`${stat.bg} rounded-xl p-3 text-center border border-primary/5 hover:border-primary/20 transition-all cursor-pointer`}
            >
              <stat.icon className={`h-4 w-4 mx-auto mb-1.5 ${stat.color}`} />
              <p className="font-display text-2xl text-foreground font-bold">{stat.value}</p>
              <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
              {/* Mini activity bar */}
              <div className="flex items-end justify-center gap-[2px] mt-2 h-3">
                {[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${stat.color.replace('text-', 'bg-')} opacity-40`}
                    style={{ height: `${h * 100}%` }}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Today's Brief — Premium diary style */}
      <motion.div variants={item} className="rounded-xl p-4 sm:p-5 relative overflow-hidden" style={{ background: '#0D1B2A' }}>
        <Quote className="absolute top-3 left-4 h-8 w-8 text-[hsl(var(--gold))] opacity-30" />
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" />
            <span className="font-display text-base text-[hsl(var(--gold))]">Today's Brief</span>
          </div>
          <button
            onClick={loadDailySummary}
            disabled={summaryLoading}
            className="p-1.5 rounded-md text-white/40 hover:text-white/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p
          className="text-lg text-white/80 leading-relaxed italic relative z-10"
          style={{ fontFamily: "'Dancing Script', cursive, serif" }}
        >
          {summaryLoading
            ? 'Generating your daily brief...'
            : summaryText || (hasData ? 'Tap 🔄 to generate your daily brief.' : 'Your daily brief will appear here once you start capturing.')}
        </p>
      </motion.div>

      {/* Quick Access */}
      <motion.div variants={item}>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {quickAccess.map((qa) => (
            <Link
              key={qa.path}
              to={qa.path}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/10 text-foreground text-sm font-body whitespace-nowrap hover:from-primary/25 hover:to-primary/10 transition-all shrink-0"
            >
              <qa.icon className="h-4 w-4 text-primary" />
              {qa.label}
            </Link>
          ))}
        </div>
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
          {conversations.slice(0, 3).map(conv => (
            <div key={conv.id} className={`border-l-4 rounded-r-xl ${typeColorBorder[conv.type] || typeColorBorder.personal}`}>
              <ConversationCard conv={conv} />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
