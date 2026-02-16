import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getScript, getSettings } from '@/lib/storage';
import { PLAYER_THEMES, PlayerTheme } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, FlipHorizontal,
  Camera, SwitchCamera, Columns, Layers, Type,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RecordMode = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settings = getSettings();
  const script = id ? getScript(id) : null;

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings.defaultSpeed);
  const [fontSize, setFontSize] = useState(Math.min(settings.defaultFontSize, 28));
  const [theme, setTheme] = useState<PlayerTheme>(settings.defaultTheme);
  const [mirrored, setMirrored] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const currentTheme = PLAYER_THEMES[theme];

  // Camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions.');
      setCameraActive(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  // Keep screen awake
  useEffect(() => {
    let wakeLock: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLock = lock;
      }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, []);

  // Scroll animation
  const scrollStep = useCallback((timestamp: number) => {
    if (!scrollRef.current) return;
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const pxPerSecond = speed * 20;
    scrollRef.current.scrollTop += (pxPerSecond * delta) / 1000;
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

  const toggleCamera = () => setFacingMode(f => f === 'user' ? 'environment' : 'user');

  if (!script) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Script not found</p>
      </div>
    );
  }

  const lines = script.content.split('\n');

  return (
    <div className="relative flex min-h-screen flex-col bg-black overflow-hidden">
      {/* Camera preview */}
      <div className={`${splitView ? 'h-1/2' : 'absolute inset-0'} bg-black`}>
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
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{cameraError}</p>
              <Button className="mt-3" size="sm" onClick={startCamera}>Retry</Button>
            </div>
          </div>
        )}
      </div>

      {/* Script overlay / split view */}
      <div
        ref={scrollRef}
        className={`${splitView ? 'h-1/2' : 'absolute inset-0'} overflow-y-auto`}
        style={{
          backgroundColor: splitView ? currentTheme.bg : `${currentTheme.bg}99`,
          color: currentTheme.fg,
          transform: mirrored ? 'scaleX(-1)' : 'none',
        }}
      >
        <div
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.5,
            padding: splitView ? '1rem 1.5rem' : '4rem 2rem 50vh 2rem',
            paddingTop: splitView ? '1rem' : '30vh',
            paddingBottom: '60vh',
          }}
        >
          {lines.map((line, i) => (
            <p key={i} className="mb-1">{line || '\u00A0'}</p>
          ))}
        </div>
      </div>

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center gap-2 px-4 py-3 bg-black/50">
        <Button variant="ghost" size="icon" className="touch-target text-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1 text-sm font-medium text-white truncate">{script.title}</span>
        <Button variant="ghost" size="icon" className="touch-target text-white" onClick={toggleCamera}>
          <SwitchCamera className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="touch-target"
          style={{ color: mirrored ? '#10b981' : 'white' }}
          onClick={() => setMirrored(!mirrored)}
        >
          <FlipHorizontal className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="touch-target"
          style={{ color: splitView ? '#10b981' : 'white' }}
          onClick={() => setSplitView(!splitView)}
        >
          {splitView ? <Layers className="h-5 w-5" /> : <Columns className="h-5 w-5" />}
        </Button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/60 safe-area-padding">
        <div className="flex items-center gap-1 px-4 py-1">
          <Type className="h-3 w-3 text-white/60" />
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            min={14}
            max={48}
            step={2}
            className="flex-1"
          />
          <span className="text-xs text-white/60 w-8 text-right">{fontSize}</span>
        </div>
        <div className="flex items-center justify-center gap-4 px-6 py-3">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white"
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollTop - speed * 100); }}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white"
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop += speed * 100; }}>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecordMode;
