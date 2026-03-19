import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, exportBackup, importBackup } from '@/lib/storage';
import { AppSettings, PLAYER_THEMES, PlayerTheme } from '@/types/script';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { resolveLegalUrl } from '@/lib/utils';
import { ArrowLeft, Download, Upload, Shield, MessageSquare, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut, firebaseAvailable } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const privacyUrl = resolveLegalUrl(import.meta.env.VITE_PRIVACY_URL, 'privacy.html');
  const termsUrl = resolveLegalUrl(import.meta.env.VITE_TERMS_URL, 'terms.html');

  const update = (partial: Partial<AppSettings>) => {
    const updated = saveSettings(partial);
    setSettings(updated);
  };

  const handleBackup = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuevora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exported');
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const success = importBackup(ev.target?.result as string);
          if (success) {
            setSettings(getSettings());
            toast.success('Backup restored');
          } else {
            toast.error('Invalid backup file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-padding">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pb-2" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
        <Button variant="ghost" size="icon" className="touch-target text-white" onClick={() => navigate('/home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Defaults */}
        <Section title="Defaults">
          <SettingRow label="Default Theme">
            <div className="flex gap-1.5">
              {(Object.keys(PLAYER_THEMES) as PlayerTheme[]).map(key => (
                <button
                  key={key}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    settings.defaultTheme === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                  onClick={() => update({ defaultTheme: key })}
                >
                  {PLAYER_THEMES[key].label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label={`Scroll Speed: ${settings.defaultSpeed}x`}>
            <Slider
              value={[settings.defaultSpeed]}
              onValueChange={([v]) => update({ defaultSpeed: v })}
              min={1} max={10} step={0.5}
            />
          </SettingRow>

          <SettingRow label={`Font Size: ${settings.defaultFontSize}px`}>
            <Slider
              value={[settings.defaultFontSize]}
              onValueChange={([v]) => update({ defaultFontSize: v })}
              min={16} max={72} step={2}
            />
          </SettingRow>

          <SettingRow label={`Line Spacing: ${settings.defaultLineSpacing.toFixed(1)}`}>
            <Slider
              value={[settings.defaultLineSpacing]}
              onValueChange={([v]) => update({ defaultLineSpacing: v })}
              min={1} max={3} step={0.1}
            />
          </SettingRow>

          <SettingRow label="Words Per Minute">
            <Input
              type="number"
              value={settings.wpm}
              onChange={e => update({ wpm: Number(e.target.value) || 140 })}
              className="w-20 text-right bg-surface"
            />
          </SettingRow>

          <SettingRow label="Countdown Duration">
            <div className="flex gap-1.5">
              {([3, 5, 10] as const).map(v => (
                <button
                  key={v}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.countdownDuration === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                  onClick={() => update({ countdownDuration: v })}
                >
                  {v}s
                </button>
              ))}
            </div>
          </SettingRow>
        </Section>

        {/* Display */}
        <Section title="Display">
          <SettingRow label="Keep Screen Awake" inline>
            <Switch checked={settings.keepScreenAwake} onCheckedChange={v => update({ keepScreenAwake: v })} />
          </SettingRow>
          <SettingRow label="Mirror Mode Default" inline>
            <Switch checked={settings.mirrorMode} onCheckedChange={v => update({ mirrorMode: v })} />
          </SettingRow>
          <SettingRow label="Focus Line" inline>
            <Switch checked={settings.focusLineEnabled} onCheckedChange={v => update({ focusLineEnabled: v })} />
          </SettingRow>
        </Section>

        {/* Data */}
        <Section title="Data & Backup">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 touch-target" onClick={handleBackup}>
              <Download className="h-4 w-4 mr-2" /> Export Backup
            </Button>
            <Button variant="outline" className="flex-1 touch-target" onClick={handleRestore}>
              <Upload className="h-4 w-4 mr-2" /> Restore
            </Button>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <SettingRow label="Analytics (opt-in)" inline>
            <Switch checked={settings.analyticsOptIn} onCheckedChange={v => update({ analyticsOptIn: v })} />
          </SettingRow>
          <div className="rounded-xl bg-card p-4 border border-border/50">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Privacy Promise</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your scripts are stored locally on your device and never uploaded. No account is required.
                  {firebaseAvailable && (
                    <> If you sign in, Firebase Authentication processes basic account info (such as name and email) to provide login.</>
                  )} Cuevora does not share your script content.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {(privacyUrl || termsUrl) && (
          <Section title="Legal">
            {termsUrl && (
              <Button variant="outline" className="w-full touch-target justify-start" asChild>
                <a href={termsUrl} target="_blank" rel="noreferrer">
                  Terms of Service
                </a>
              </Button>
            )}
            {privacyUrl && (
              <Button variant="outline" className="w-full touch-target justify-start" asChild>
                <a href={privacyUrl} target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
              </Button>
            )}
          </Section>
        )}

        {/* Account */}
        <Section title="Account">
          <div className="rounded-xl bg-card p-4 border border-border/50">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.displayName || (isGuest ? 'Guest User' : 'Not signed in')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || (isGuest ? 'Data stored locally only' : '')}
                </p>
              </div>
            </div>
          </div>
          {user ? (
            <Button
              variant="outline"
              className="w-full touch-target justify-start text-destructive"
              onClick={async () => {
                await signOut();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          ) : isGuest ? (
            <Button
              variant="outline"
              className="w-full touch-target justify-start"
              onClick={() => navigate('/login', { replace: true })}
            >
              <User className="h-4 w-4 mr-2" /> Sign In to Sync
            </Button>
          ) : null}
        </Section>

        {/* Support */}
        <Section title="Support">
          <Button variant="outline" className="w-full touch-target justify-start" asChild>
            <a href="mailto:ibimbraide@gmail.com">
              <MessageSquare className="h-4 w-4 mr-2" /> Send Feedback
            </a>
          </Button>
        </Section>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Cuevora v1.0 · Teleprompter features, actually free.
        </p>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
    {children}
  </div>
);

const SettingRow = ({ label, children, inline }: { label: string; children: React.ReactNode; inline?: boolean }) => (
  <div className={`rounded-xl bg-card p-4 border border-border/50 ${inline ? 'flex items-center justify-between' : 'space-y-2'}`}>
    <span className="text-sm text-foreground">{label}</span>
    {children}
  </div>
);

export default Settings;
