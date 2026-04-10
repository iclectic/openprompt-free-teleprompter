import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getScript, getSettings, getWordCount } from '@/lib/storage';
import { PLAYER_THEMES, PlayerTheme } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, FlipHorizontal,
  Type, AlignJustify, Palette, Timer, Video, Mic, MicOff,
  RotateCcw, Gauge, Hand, Camera, SwitchCamera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceControl, VoiceCommand } from '@/hooks/use-voice-control';
import { useGestureControls } from '@/hooks/use-gesture-controls';

const SPEED_PRESETS = [
  { label: 'Slow', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Fast', value: 7 },
  { label: 'Turbo', value: 10 },
];

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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Camera state
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentTheme = PLAYER_THEMES[theme];

  // Word count & estimated read time
  const wordCount = useMemo(() => script ? getWordCount(script.content) : 0, [script]);
  const totalReadTimeSec = useMemo(() => Math.ceil((wordCount / settings.wpm) * 60), [wordCount, settings.wpm]);

  const timeRemaining = useMemo(() => {
    const remaining = Math.max(0, Math.ceil(totalReadTimeSec * (1 - scrollProgress)));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, [totalReadTimeSec, scrollProgress]);

  // Elapsed timer
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [playing]);

  const formatElapsed = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keep screen awake
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if (settings.keepScreenAwake && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock;
      }).catch(() => { /* noop */ });
    }
    return () => { wakeLock?.release(); };
  }, [settings.keepScreenAwake]);

  // Auto-hide controls after 4s of playback
  useEffect(() => {
    if (playing && showControls) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [playing, showControls]);

  // Smooth scroll animation
  const scrollStep = useCallback((timestamp: number) => {
    if (!scrollRef.current) return;
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const pxPerSecond = speed * 20;
    const scrollAmount = (pxPerSecond * delta) / 1000;
    scrollRef.current.scrollTop += scrollAmount;

    // Update progress
    const el = scrollRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(el.scrollTop / maxScroll);
    }

    // Check if reached end
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

  // Track scroll progress on manual scroll too
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(el.scrollTop / maxScroll);
    }
  }, []);

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

  const rewind = useCallback(() => {
    if (!scrollRef.current) return;
    const pxPerSecond = speed * 20;
    scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollTop - pxPerSecond * 5);
  }, [speed]);

  const forward = useCallback(() => {
    if (!scrollRef.current) return;
    const pxPerSecond = speed * 20;
    scrollRef.current.scrollTop += pxPerSecond * 5;
  }, [speed]);

  const resetScroll = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
    setPlaying(false);
    setElapsedSeconds(0);
    setScrollProgress(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (!playing && scrollRef.current?.scrollTop === 0) {
      startCountdown(settings.countdownDuration);
    } else {
      setPlaying(p => !p);
    }
  }, [playing, settings.countdownDuration]);

  // Voice control
  const handleVoiceCommand = useCallback((cmd: VoiceCommand) => {
    switch (cmd) {
      case 'play': setPlaying(true); break;
      case 'pause': setPlaying(false); break;
      case 'stop': setPlaying(false); break;
      case 'faster': setSpeed(s => Math.min(10, s + 1)); break;
      case 'slower': setSpeed(s => Math.max(1, s - 1)); break;
      case 'reset': resetScroll(); break;
    }
  }, [resetScroll]);

  const voice = useVoiceControl({
    onCommand: handleVoiceCommand,
    enabled: voiceEnabled,
  });

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) {
      voice.stop();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      setTimeout(() => voice.start(), 100);
    }
  }, [voiceEnabled, voice]);

  // Gesture controls
  useGestureControls({
    elementRef: containerRef,
    enabled: gesturesEnabled,
    onTapCenter: () => setShowControls(s => !s),
    onTapLeft: rewind,
    onTapRight: forward,
    onDoubleTap: togglePlay,
    onSwipeUp: () => setSpeed(s => Math.min(10, s + 0.5)),
    onSwipeDown: () => setSpeed(s => Math.max(1, s - 0.5)),
    onPinchOut: () => setFontSize(s => Math.min(72, s + 2)),
    onPinchIn: () => setFontSize(s => Math.max(16, s - 2)),
  });

  // Camera
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch {
      setCameraError('Camera access denied.');
      setCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
      setCameraOn(false);
    } else {
      setCameraOn(true);
      startCamera(facingMode);
    }
  }, [cameraOn, facingMode, startCamera, stopCamera]);

  const switchCamera = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (cameraOn) startCamera(next);
  }, [facingMode, cameraOn, startCamera]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSpeed(s => Math.min(10, s + 0.5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSpeed(s => Math.max(1, s - 0.5));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          rewind();
          break;
        case 'ArrowRight':
          e.preventDefault();
          forward();
          break;
        case 'm':
          setMirrored(m => !m);
          break;
        case 'f':
          setFocusLine(f => !f);
          break;
        case 'r':
          resetScroll();
          break;
        case 'Escape':
          navigate(-1);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, rewind, forward, resetScroll, navigate]);

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
      ref={containerRef}
      className="relative flex min-h-screen flex-col overflow-hidden select-none"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.fg }}
    >
      {/* Camera preview (behind everything) */}
      {cameraOn && (
        <div className="absolute inset-0 z-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8">
              <div className="text-center">
                <Camera className="h-10 w-10 text-white/50 mx-auto mb-3" />
                <p className="text-sm text-white/70">{cameraError}</p>
                <Button className="mt-3" size="sm" onClick={() => startCamera(facingMode)}>Retry</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scroll progress bar */}
      <div
        className="absolute top-0 left-0 z-50 h-1 transition-all duration-150"
        style={{
          width: `${scrollProgress * 100}%`,
          backgroundColor: '#a78bfa',
        }}
      />

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
            style={{ backgroundColor: `${currentTheme.bg}ee`, paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
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
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate" style={{ color: currentTheme.fg }}>
                {script.title}
              </span>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: `${currentTheme.fg}66` }}>
                <span>{formatElapsed(elapsedSeconds)}</span>
                <span>{Math.round(scrollProgress * 100)}%</span>
                <span>{timeRemaining} left</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              style={{ color: mirrored ? '#a78bfa' : currentTheme.fg }}
              onClick={() => setMirrored(!mirrored)}
            >
              <FlipHorizontal className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              style={{ color: cameraOn ? '#a78bfa' : currentTheme.fg }}
              onClick={toggleCamera}
            >
              <Camera className="h-5 w-5" />
            </Button>
            {cameraOn && (
              <Button
                variant="ghost"
                size="icon"
                className="touch-target"
                style={{ color: currentTheme.fg }}
                onClick={switchCamera}
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            )}
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

      {/* Voice control indicator */}
      <AnimatePresence>
        {voice.listening && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${currentTheme.bg}dd`, border: '1px solid #a78bfa44' }}
          >
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-medium" style={{ color: '#a78bfa' }}>
              Listening{voice.lastTranscript ? `: "${voice.lastTranscript}"` : '...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-16 pb-40"
        style={{
          transform: mirrored ? 'scaleX(-1)' : 'none',
          backgroundColor: cameraOn ? `${currentTheme.bg}cc` : 'transparent',
          position: 'relative',
          zIndex: 1,
        }}
        onScroll={handleScroll}
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
                    <div className="space-y-3">
                      {/* Speed presets */}
                      <div className="flex gap-2">
                        {SPEED_PRESETS.map(preset => (
                          <button
                            key={preset.label}
                            className="flex-1 rounded-lg py-2 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: speed === preset.value ? '#7c3aed' : `${currentTheme.fg}11`,
                              color: speed === preset.value ? '#fff' : `${currentTheme.fg}88`,
                            }}
                            onClick={() => setSpeed(preset.value)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs" style={{ color: `${currentTheme.fg}88` }}>
                          <span>Custom Speed</span>
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
                            border: theme === key ? '2px solid #a78bfa' : '2px solid transparent',
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
                { key: 'speed' as const, icon: Gauge, label: 'Speed' },
                { key: 'font' as const, icon: Type, label: 'Font' },
                { key: 'theme' as const, icon: Palette, label: 'Theme' },
              ].map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  style={{ color: showPanel === key ? '#a78bfa' : `${currentTheme.fg}88` }}
                  onClick={() => setShowPanel(showPanel === key ? 'none' : key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-center gap-2 px-6 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={resetScroll}
                title="Reset to start"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={() => startCountdown(settings.countdownDuration)}
                title="Countdown"
              >
                <Timer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={rewind}
                title="Rewind"
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
                className="h-11 w-11 rounded-full"
                style={{ color: currentTheme.fg }}
                onClick={forward}
                title="Forward"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              {voice.supported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  style={{ color: voice.listening ? '#a78bfa' : currentTheme.fg }}
                  onClick={toggleVoice}
                  title="Voice control"
                >
                  {voice.listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                style={{ color: focusLine ? '#a78bfa' : currentTheme.fg }}
                onClick={() => setFocusLine(!focusLine)}
                title="Focus line"
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                style={{ color: gesturesEnabled ? '#a78bfa' : currentTheme.fg }}
                onClick={() => setGesturesEnabled(!gesturesEnabled)}
                title="Gesture controls"
              >
                <Hand className="h-4 w-4" />
              </Button>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-center gap-4 px-6 pb-3 text-[10px]" style={{ color: `${currentTheme.fg}55` }}>
              <span>{wordCount} words</span>
              <span>{speed}x speed</span>
              <span>{fontSize}px</span>
              <span>{Math.round(scrollProgress * 100)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Player;
