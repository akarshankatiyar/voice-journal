import { useState } from 'react';
import { Bell, Crown, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/store/useAppStore';
import { useConversationStore } from '@/store/useConversationStore';
import { format } from 'date-fns';
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
  const { sidebarOpen, toggleSidebar } = useAppStore();
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

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        {/* Left — Hamburger */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {sidebarOpen && <div />}

        {/* Center — Date */}
        <p className="text-sm font-body text-muted-foreground tracking-wide hidden sm:block">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
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

          <button
            onClick={() => setPremiumOpen(true)}
            className="p-2 rounded-lg text-gold hover:text-gold-light hover:bg-card transition-colors"
          >
            <Crown className="h-5 w-5" />
          </button>

          <button
            onClick={() => setProfileOpen(true)}
            className="rounded-full"
          >
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-display">U</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      {/* Date on mobile */}
      <p className="text-center text-sm font-body text-muted-foreground tracking-wide sm:hidden -mt-4 mb-4">
        {format(new Date(), 'EEEE, MMMM d')}
      </p>

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
