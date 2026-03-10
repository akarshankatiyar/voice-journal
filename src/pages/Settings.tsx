import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Moon, Globe, Shield, HelpCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Settings() {
  const { user, loading } = useAuth();

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const settingsGroups = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Push Notifications', description: 'Get notified about new notes', key: 'push' },
        { label: 'Email Digest', description: 'Daily summary of your activity', key: 'email' },
      ],
    },
    {
      title: 'Appearance',
      icon: Moon,
      items: [
        { label: 'Auto-process recordings', description: 'Automatically generate notes from recordings', key: 'autoProcess' },
      ],
    },
    {
      title: 'Language',
      icon: Globe,
      items: [
        { label: 'Transcription Language', description: 'Primary language for voice recognition', key: 'lang' },
      ],
    },
    {
      title: 'Privacy',
      icon: Shield,
      items: [
        { label: 'Store recordings locally', description: 'Keep audio files on device', key: 'localStore' },
      ],
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-lg mx-auto">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your experience</p>
      </motion.div>

      {settingsGroups.map(group => (
        <motion.div key={group.title} variants={item} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <group.icon className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base text-foreground">{group.title}</h2>
          </div>
          <div className="space-y-4">
            {group.items.map(settingItem => (
              <div key={settingItem.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-foreground">{settingItem.label}</p>
                  <p className="text-xs text-muted-foreground">{settingItem.description}</p>
                </div>
                <Switch />
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base text-foreground">About</h2>
        </div>
        <p className="text-xs text-muted-foreground">EchoMind v1.0 — AI-powered voice notes</p>
      </motion.div>
    </motion.div>
  );
}
