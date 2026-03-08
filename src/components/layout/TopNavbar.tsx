import { useState } from 'react';
import { Bell, Crown, Menu, Mic } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useAutoProcess } from '@/hooks/useAutoProcess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function TopNavbar() {
  const { toggleSidebar, isRecording } = useAppStore();
  const { startRecording, stopRecording } = useVoiceCapture();
  const { processAndSave } = useAutoProcess();
  const conversations = useConversationStore((s) => s.conversations);
  const tasks = useConversationStore((s) => s.tasks);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const pendingTasks = tasks.filter(t => !t.isDone).length;
  const recentNotes = conversations.slice(0, 3);

  const notifications = [
    ...(recentNotes.length > 0
      ? recentNotes.map(c => ({
          id: c.id,
          text: `📝 "${c.title}" notes are ready`,
          time: new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
      : []),
    ...(pendingTasks > 0
      ? [{ id: 'tasks', text: `⚡ ${pendingTasks} pending tasks to review`, time: 'now' }]
      : []),
  ];

  const handleRecordClick = () => {
    if (isRecording) {
      const transcript = stopRecording();
      if (transcript && transcript.length > 10) {
        processAndSave(transcript);
      }
    } else {
      startRecording((transcript) => {
        processAndSave(transcript);
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Bell — Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {notifications.length === 0 ? (
                <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5">
                    <span className="text-sm text-foreground">{n.text}</span>
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Crown — Premium */}
          <button
            onClick={() => setPremiumOpen(true)}
            className="p-2 rounded-lg text-gold hover:text-gold-light hover:bg-card transition-colors"
          >
            <Crown className="h-5 w-5" />
          </button>

          {/* Profile Avatar */}
          <button
            onClick={() => setProfileOpen(true)}
            className="rounded-full"
          >
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-display">U</AvatarFallback>
            </Avatar>
          </button>

          {/* Record Button */}
          <button
            onClick={handleRecordClick}
            className={`relative p-2 rounded-full transition-all ${
              isRecording
                ? 'bg-destructive/20 text-destructive'
                : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            }`}
          >
            <Mic className="h-4 w-4" />
            {isRecording && (
              <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Premium Modal */}
      <Dialog open={premiumOpen} onOpenChange={setPremiumOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-gold" /> Upgrade to Premium
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Unlock the full power of EchoMind with Premium features:</p>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2">✨ Unlimited AI processing</li>
              <li className="flex items-center gap-2">📊 Advanced analytics & insights</li>
              <li className="flex items-center gap-2">☁️ Cloud sync across devices</li>
              <li className="flex items-center gap-2">🎯 Priority AI model access</li>
            </ul>
            <Button className="w-full bg-gradient-to-r from-gold to-gold-light text-foreground font-medium">
              Coming Soon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Panel */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile & Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-display">U</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display text-foreground">User</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-card text-foreground transition-colors">Account Settings</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-card text-foreground transition-colors">Notification Preferences</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-card text-foreground transition-colors">Data & Privacy</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-card text-destructive transition-colors">Sign Out</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
