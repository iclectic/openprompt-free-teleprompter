import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getScript, getSettings } from '@/lib/storage';
import { PLAYER_THEMES, PlayerTheme } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, FlipHorizontal,
  Type, AlignJustify, Palette, Timer, Video, ChevronUp, ChevronDown, Sun,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Player = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settings = getSettings();
  const script = id ? getScript(id) : null;

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings.defaultSpeed);
  const [fontSize, setFontSize] = useState(settings.defaultFontSize);
  const [lineSpacing, setLineSpacing] = useState(settings.defaultLineSpacing);
  const [theme, setTheme] = useState<PlayerTheme>(settings.defaultTheme);
  const [mirrored, setMirrored] = useState(settings.mirrorMode);
  const [showControls, setShowControls] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [focusLine, setFocusLine] = useState(settings.focusLineEnabled);
  const [showPanel, setShowPanel] = useState<'none' | 'speed' | 'font' | 'theme'>('none');

  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const currentTheme = PLAYER_THEMES[theme];

  // Keep screen awake
  useEffect(() => {
    let wakeLock: any = null;
    if (settings.keepScreenAwake && 'wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLock = lock;
      }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, [settings.keepScreenAwake]);

  // Smooth scroll animation
  const scrollStep = useCallback((timestamp: number) => {
    if (!scrollRef.current) return;
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    // speed 1-10: pixels per second = speed * 20
    const pxPerSecond = speed * 20;
    const scrollAmount = (pxPerSecond * delta) / 1000;
    scrollRef.current.scrollTop += scrollAmount;

    // Check if reached end
    const el = scrollRef.current;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setPlaying(false);
      return;
    }

    animRef.current = requestAnimationFrame(scrollStep);
  }, [speed]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = 0;
      animRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, scrollStep]);

  // Countdown
  const startCountdown = (secs: number) => {
    setCountdown(secs);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setPlaying(true);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const rewind = () => {
    if (!scrollRef.current) return;
    const pxPerSecond = speed * 20;
    scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollTop - pxPerSecond * 5);
  };

  const forward = () => {
    if (!scrollRef.current) return;
    const pxPerSecond = speed * 20;
    scrollRef.current.scrollTop += pxPerSecond * 5;
  };

  const togglePlay = () => {
    if (!playing && scrollRef.current?.scrollTop === 0) {
      startCountdown(settings.countdownDuration);
    } else {
      setPlaying(!playing);
    }
  };

  if (!script) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Script not found</p>
          <Button onClick={() => navigate('/home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const lines = script.content.split('\n');


  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.fg }}
    >
      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: currentTheme.bg }}
          >
            <motion.span
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-8xl font-bold"
              style={{ color: currentTheme.fg }}
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-40 flex items-center gap-2 px-4 py-3"
            style={{ backgroundColor: `${currentTheme.bg}ee` }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              style={{ color: currentTheme.fg }}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="flex-1 text-sm font-medium truncate" style={{ color: currentTheme.fg }}>
              {script.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              style={{ color: mirrored ? '#10b981' : currentTheme.fg }}
              onClick={() => setMirrored(!mirrored)}
            >
              <FlipHorizontal className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              style={{ color: currentTheme.fg }}
              onClick={() => navigate(`/record/${id}`)}
            >
              <Video className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-16 pb-40 cursor-pointer"
        style={{
          transform: mirrored ? 'scaleX(-1)' : 'none',
        }}
        onClick={() => setShowControls(!showControls)}
      >
        {/* Focus line indicator */}
        {focusLine && (
          <div
            className="fixed left-0 right-0 pointer-events-none z-30"
            style={{
              top: '40%',
              height: `${fontSize * lineSpacing}px`,
              background: `linear-gradient(180deg, transparent, ${currentTheme.fg}08, transparent)`,
            }}
          />
        )}

        <div
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing,
            paddingTop: '30vh',
            paddingBottom: '60vh',
          }}
        >
          {lines.map((line, i) => (
            <p key={i} className="mb-1" style={{
              opacity: script.highlights.includes(i) ? 1 : 0.95,
              fontWeight: script.highlights.includes(i) ? 700 : 400,
            }}>
              {script.markers.includes(i) && (
                <span className="block w-12 h-0.5 mb-2 rounded" style={{ backgroundColor: `${currentTheme.fg}30` }} />
              )}
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-40 safe-area-padding"
            style={{ backgroundColor: `${currentTheme.bg}ee` }}
          >
            {/* Expandable panels */}
            <AnimatePresence>
              {showPanel !== 'none' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-6 pt-3"
                >
                  {showPanel === 'speed' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs" style={{ color: `${currentTheme.fg}88` }}>
                        <span>Scroll Speed</span>
                        <span>{speed}x</span>
                      </div>
                      <Slider
                        value={[speed]}
                        onValueChange={([v]) => setSpeed(v)}
                        min={1}
                        max={10}
                        step={0.5}
                        className="touch-target"
                      />
                    </div>
                  )}
                  {showPanel === 'font' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs" style={{ color: `${currentTheme.fg}88` }}>
                          <span>Font Size</span>
                          <span>{fontSize}px</span>
                        </div>
                        <Slider
                          value={[fontSize]}
                          onValueChange={([v]) => setFontSize(v)}
                          min={16}
                          max={72}
                          step={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs" style={{ color: `${currentTheme.fg}88` }}>
                          <span>Line Spacing</span>
                          <span>{lineSpacing.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[lineSpacing]}
                          onValueChange={([v]) => setLineSpacing(v)}
                          min={1}
                          max={3}
                          step={0.1}
                        />
                      </div>
                    </div>
                  )}
                  {showPanel === 'theme' && (
                    <div className="flex gap-2">
                      {(Object.keys(PLAYER_THEMES) as PlayerTheme[]).map(key => (
                        <button
                          key={key}
                          className={`flex-1 rounded-lg p-3 text-xs font-medium border-2 transition-colors ${
                            theme === key ? 'border-primary' : 'border-transparent'
                          }`}
                          style={{
                            backgroundColor: PLAYER_THEMES[key].bg,
                            color: PLAYER_THEMES[key].fg,
                            border: theme === key ? '2px solid #10b981' : '2px solid transparent',
                          }}
                          onClick={() => setTheme(key)}
                        >
                          {PLAYER_THEMES[key].label}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Panel toggles */}
            <div className="flex justify-center gap-1 px-6 pt-2">
              {[
                { key: 'speed' as const, icon: Sun, label: 'Speed' },
                { key: 'font' as const, icon: Type, label: 'Font' },
                { key: 'theme' as const, icon: Palette, label: 'Theme' },
              ].map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  style={{ color: showPanel === key ? '#10b981' : `${currentTheme.fg}88` }}
                  onClick={() => setShowPanel(showPanel === key ? 'none' : key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-center gap-3 px-6 py-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={() => startCountdown(settings.countdownDuration)}
              >
                <Timer className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={rewind}
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg"
                onClick={togglePlay}
              >
                {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={forward}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
                style={{ color: focusLine ? '#10b981' : currentTheme.fg }}
                onClick={() => setFocusLine(!focusLine)}
              >
                <AlignJustify className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Player;
