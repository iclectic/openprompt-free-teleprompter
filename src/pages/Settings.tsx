import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, exportBackup, importBackup, clearLocalData } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { AppSettings, PLAYER_THEMES, PlayerTheme, ColorMode } from '@/types/script';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { resolveLegalUrl } from '@/lib/utils';
import { AccessibilityProfileSelector } from '@/components/AccessibilityProfileSelector';
import { ArrowLeft, Download, Upload, Shield, MessageSquare, LogOut, User, Sun, Moon, Monitor, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut, firebaseAvailable } = useAuth();
  const { colorMode, setColorMode } = useAppTheme();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const privacyUrl = resolveLegalUrl(import.meta.env.VITE_PRIVACY_URL, 'privacy.html');
  const termsUrl = resolveLegalUrl(import.meta.env.VITE_TERMS_URL, 'terms.html');

  const update = (partial: Partial<AppSettings>) => {
    const updated = saveSettings(partial);
    setSettings(updated);
    void haptic('selection');
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
    void haptic('light');
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
            void haptic('medium');
          } else {
            toast.error('Invalid backup file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClearLocalData = async () => {
    if (!window.confirm('Clear all local Cuevora scripts, settings and revisions from this device? This cannot be undone unless you have exported a backup.')) return;
    await haptic('warning');
    clearLocalData();
    setSettings(getSettings());
    toast.success('Local app data cleared');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-padding">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pb-2" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
        <Button variant="ghost" size="icon" className="touch-target" onClick={() => navigate('/home')} aria-label="Back to scripts">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
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
                  {user?.email || (isGuest ? 'Data stored locally only' : 'Sign in is optional')}
                </p>
              </div>
            </div>
          </div>
          {user ? (
            <>
              <Button
                variant="outline"
                className="w-full touch-target justify-start text-destructive-emphasis hover:text-destructive-emphasis"
                onClick={async () => {
                  await signOut();
                  navigate('/login', { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
              <Button variant="outline" className="w-full touch-target justify-start" asChild>
                <a href="mailto:ibimbraide@gmail.com?subject=Cuevora%20account%20deletion%20request">
                  <Trash2 className="h-4 w-4 mr-2" /> Request Account Deletion
                </a>
              </Button>
            </>
          ) : isGuest ? (
            <Button
              variant="outline"
              className="w-full touch-target justify-start"
              onClick={() => navigate('/login', { replace: true })}
            >
              <User className="h-4 w-4 mr-2" /> Sign In
            </Button>
          ) : null}
        </Section>

        <Section title="Appearance">
          <SettingRow label="Colour Mode">
            <div className="flex gap-1.5" role="radiogroup" aria-label="Colour mode">
              {([{ key: 'system', label: 'System', icon: Monitor }, { key: 'light', label: 'Light', icon: Sun }, { key: 'dark', label: 'Dark', icon: Moon }] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={colorMode === key}
                  className={`flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    colorMode === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => {
                    setColorMode(key as ColorMode);
                    void haptic('selection');
                  }}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Accessibility Profile">
            <AccessibilityProfileSelector
              value={settings.accessibilityProfile}
              onChange={profile => update({ accessibilityProfile: profile })}
            />
          </SettingRow>
        </Section>

        {/* Defaults */}
        <Section title="Teleprompter Defaults">
          <SettingRow label="Default Theme">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Default teleprompter theme">
              {(Object.keys(PLAYER_THEMES) as PlayerTheme[]).map(key => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={settings.defaultTheme === key}
                  className={`min-h-11 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    settings.defaultTheme === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
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
              aria-label="Default scroll speed"
              value={[settings.defaultSpeed]}
              onValueChange={([v]) => update({ defaultSpeed: v })}
              min={1} max={10} step={0.5}
            />
          </SettingRow>

          <SettingRow label={`Font Size: ${settings.defaultFontSize}px`}>
            <Slider
              aria-label="Default font size"
              value={[settings.defaultFontSize]}
              onValueChange={([v]) => update({ defaultFontSize: v })}
              min={16} max={72} step={2}
            />
          </SettingRow>

          <SettingRow label={`Line Spacing: ${settings.defaultLineSpacing.toFixed(1)}`}>
            <Slider
              aria-label="Default line spacing"
              value={[settings.defaultLineSpacing]}
              onValueChange={([v]) => update({ defaultLineSpacing: v })}
              min={1} max={3} step={0.1}
            />
          </SettingRow>

          <SettingRow label="Words Per Minute">
            <Input
              type="number"
              min={40}
              max={400}
              aria-label="Words per minute"
              value={settings.wpm}
              onChange={e => update({ wpm: Number(e.target.value) || 140 })}
              className="w-20 text-right"
            />
          </SettingRow>

          <SettingRow label="Countdown Duration">
            <div className="flex gap-1.5" role="radiogroup" aria-label="Countdown duration">
              {([3, 5, 10] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={settings.countdownDuration === v}
                  className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    settings.countdownDuration === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
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
        <Section title="Recording and Controls">
          <SettingRow label="Keep Screen Awake" inline>
            <Switch aria-label="Keep screen awake" checked={settings.keepScreenAwake} onCheckedChange={v => update({ keepScreenAwake: v })} />
          </SettingRow>
          <SettingRow label="Mirror Mode Default" inline>
            <Switch aria-label="Mirror mode default" checked={settings.mirrorMode} onCheckedChange={v => update({ mirrorMode: v })} />
          </SettingRow>
          <SettingRow label="Focus Line" inline>
            <Switch aria-label="Focus line" checked={settings.focusLineEnabled} onCheckedChange={v => update({ focusLineEnabled: v })} />
          </SettingRow>
          <SettingRow label="Haptics" inline>
            <Switch aria-label="Haptics" checked={settings.hapticsEnabled} onCheckedChange={v => update({ hapticsEnabled: v })} />
          </SettingRow>
          <SettingRow label="Gesture Controls" inline>
            <Switch aria-label="Gesture controls" checked={settings.gestureControlsEnabled} onCheckedChange={v => update({ gestureControlsEnabled: v })} />
          </SettingRow>
          <SettingRow label="Voice Controls" inline>
            <Switch aria-label="Voice controls" checked={settings.voiceControlsEnabled} onCheckedChange={v => update({ voiceControlsEnabled: v })} />
          </SettingRow>
          <SettingRow label="Adaptive Scroll" inline>
            <Switch checked={settings.adaptiveScrollEnabled} onCheckedChange={v => update({ adaptiveScrollEnabled: v })} />
          </SettingRow>
        </Section>

        {/* Data */}
        <Section title="Storage and Backup">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 touch-target" onClick={handleBackup}>
              <Download className="h-4 w-4 mr-2" /> Export Backup
            </Button>
            <Button variant="outline" className="flex-1 touch-target" onClick={handleRestore}>
              <Upload className="h-4 w-4 mr-2" /> Restore
            </Button>
          </div>
          <Button variant="outline" className="w-full touch-target justify-start text-destructive-emphasis hover:text-destructive-emphasis" onClick={handleClearLocalData}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear Local Data
          </Button>
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <SettingRow label="Analytics (opt-in)" inline>
            <Switch aria-label="Analytics opt-in" checked={settings.analyticsOptIn} onCheckedChange={v => update({ analyticsOptIn: v })} />
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

        {/* Support */}
        <Section title="Feedback">
          <Button variant="outline" className="w-full touch-target justify-start" asChild>
            <a href="mailto:ibimbraide@gmail.com">
              <MessageSquare className="h-4 w-4 mr-2" /> Send Feedback
            </a>
          </Button>
        </Section>

        <Section title="About Cuevora">
          <div className="rounded-xl bg-card p-4 border border-border/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Cuevora v1.0.0</p>
            <p>Build 1 · Package app.cuevora.teleprompter</p>
            <p className="mt-2">Offline-first teleprompter for creators, speakers and professionals.</p>
          </div>
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
