import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Profile() {
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName, avatar_url: avatarUrl });
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
    }
    setSaving(false);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-lg mx-auto">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl text-foreground mb-1">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details</p>
      </motion.div>

      {/* Avatar */}
      <motion.div variants={item} className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-primary" />
          )}
        </div>
      </motion.div>

      {/* Fields */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <div>
          <label className="text-xs font-body text-muted-foreground mb-1 block">Display Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-body text-muted-foreground mb-1 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={user.email || ''} disabled className="pl-10 opacity-60" />
          </div>
        </div>

        <div>
          <label className="text-xs font-body text-muted-foreground mb-1 block">Avatar URL</label>
          <div className="relative">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="pl-10"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
        </Button>
      </motion.div>

      {/* Sign out */}
      <motion.div variants={item}>
        <Button variant="outline" onClick={signOut} className="w-full border-destructive/30 text-destructive hover:bg-destructive/10">
          Sign Out
        </Button>
      </motion.div>
    </motion.div>
  );
}
