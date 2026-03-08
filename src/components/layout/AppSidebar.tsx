import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import {
  Home, Calendar, GraduationCap, Handshake, MessageSquare,
  CheckSquare, Lightbulb, Users, Heart, ShoppingCart, Settings, User, Mic, X, Menu, Monitor, LogIn
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/todays-text', icon: Calendar, label: 'Daily Capture' },
  { to: '/academic-notes', icon: GraduationCap, label: 'Study Notes' },
  { to: '/youtube-notes', icon: Monitor, label: 'Video Notes' },
  { to: '/meeting-notes', icon: Handshake, label: 'Meeting Notes' },
  { to: '/conversations', icon: MessageSquare, label: 'Memory Archive' },
  { to: '/tasks', icon: CheckSquare, label: 'Action Items' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideas Vault' },
  { to: '/people', icon: Users, label: 'My People' },
  { to: '/health', icon: Heart, label: 'Health Log' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping List' },
];

export function AppSidebar() {
  const { sidebarOpen, toggleSidebar, isRecording } = useAppStore();
  const { user, profile } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 bottom-0 w-[260px] z-50 flex flex-col border-r border-primary/10 bg-sidebar"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="font-display text-lg text-primary font-semibold tracking-wide">EchoMind</span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.label === "Today's Text" && isRecording && (
                <span className="ml-auto h-2 w-2 rounded-full bg-recording-red animate-pulse-recording" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-primary/10 p-3 space-y-1">
          {user ? (
            <>
              <NavLink
                to="/settings"
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors w-full ${
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                  }`
                }
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
              <NavLink
                to="/profile"
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors w-full ${
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                  }`
                }
              >
                <User className="h-4 w-4" />
                <span>{profile?.display_name || 'Profile'}</span>
              </NavLink>
            </>
          ) : (
            <NavLink
              to="/auth"
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-primary hover:bg-primary/10 w-full transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </NavLink>
          )}
        </div>
      </motion.aside>

      {/* Toggle button when closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-primary/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
