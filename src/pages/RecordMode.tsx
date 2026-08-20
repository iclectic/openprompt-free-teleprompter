import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getScript, getSettings } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { PLAYER_THEMES, PlayerTheme } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, FlipHorizontal,
  Camera, SwitchCamera, Columns, Layers, Type,
  Download,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

type RecordingStatus = 'idle' | 'preparing' | 'recording' | 'paused' | 'saving' | 'saved' | 'error';

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = reader.result;
    if (typeof result !== 'string') {
      reject(new Error('Unable to read recording data.'));
      return;
    }
    resolve(result.split(',')[1] || '');
  };
  reader.onerror = () => reject(new Error('Unable to read recording data.'));
  reader.readAsDataURL(blob);
});

const getRecordingExtension = (type: string) => type.includes('mp4') ? 'mp4' : 'webm';

const MEDIA_TIMEOUT_MS = 20000;

class MediaTimeoutError extends Error {}

const withMediaTimeout = <T,>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new MediaTimeoutError('Media request timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });

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
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [requestingMedia, setRequestingMedia] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [savedRecordingUri, setSavedRecordingUri] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const currentTheme = PLAYER_THEMES[theme];

  // Camera — request audio too so recordings have sound
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'Camera and microphone recording is not supported by this browser.';
      setCameraError(message);
      throw new Error(message);
    }

    try {
      const activeStream = streamRef.current;
      const hasLiveTracks = activeStream?.getTracks().some(track => track.readyState === 'live');
      if (activeStream && hasLiveTracks) {
        if (videoRef.current && videoRef.current.srcObject !== activeStream) {
          videoRef.current.srcObject = activeStream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraError(null);
        return activeStream;
      }

      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraError(null);
      return stream;
    } catch (err) {
      let message = 'Camera or microphone is unavailable. Please check your device and browser permissions.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          message = 'Camera or microphone permission was denied. Allow both permissions in Android Settings, then retry.';
        } else if (err.name === 'NotFoundError') {
          message = 'No usable camera or microphone was found on this device.';
        } else if (err.name === 'NotReadableError') {
          message = 'Camera or microphone is already in use by another app. Close the other app, then retry.';
        }
      }
      setCameraError(message);
      setCameraActive(false);
      throw err;
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Keep screen awake
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock;
      }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, []);

  // Recording logic
  const startRecording = useCallback(async () => {
    if (requestingMedia || recording) return;
    if (!window.MediaRecorder) {
      setRecordingError('Video recording is not supported by this browser. Try Chrome, Edge, Safari 14.1+, or Firefox.');
      setRecordingStatus('error');
      return;
    }

    void haptic('medium');
    setRequestingMedia(true);
    setRecordingStatus('preparing');
    setRecordingError(null);
    setSavedRecordingUri(null);

    let stream: MediaStream;
    try {
      stream = await withMediaTimeout(startCamera(), MEDIA_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof MediaTimeoutError) {
        setRecordingError('Camera and microphone did not respond. Confirm Cuevora has Camera and Microphone permissions in Android Settings, then retry.');
      }
      setRequestingMedia(false);
      setRecordingStatus('error');
      return;
    }

    // Clean up previous recording
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
      setRecordedBlob(null);
    }

    chunksRef.current = [];
    setRecordingDuration(0);

    // Pick a supported MIME type
    const mimeTypes = [
      'video/mp4',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 4_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecordingStatus('saving');
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
          if (blob.size === 0) {
            throw new Error('Recording was empty.');
          }

          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          setRecordedBlob(blob);
          chunksRef.current = [];

          if (Capacitor.isNativePlatform()) {
            const ext = getRecordingExtension(blob.type);
            const filename = `${(script?.title || 'recording').replace(/[^a-zA-Z0-9-_ ]/g, '') || 'recording'}-${Date.now()}.${ext}`;
            const base64 = await blobToBase64(blob);
            const writeResult = await Filesystem.writeFile({
              path: filename,
              data: base64,
              directory: Directory.Documents,
            });
            setSavedRecordingUri(writeResult.uri);
          }

          setRecordingStatus('saved');
        } catch {
          setRecordingStatus('error');
          setRecordingError('Recording stopped, but the video could not be saved. Check available storage and try again.');
        } finally {
          stopCamera();
        }
      };

      recorder.start(1000); // collect data every second
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingStatus('recording');
      setCameraActive(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      // Also start the teleprompter scrolling
      setPlaying(true);
    } catch {
      setRecordingError('Recording could not be started on this browser or device.');
      setRecordingStatus('error');
      setPlaying(false);
      stopCamera();
    } finally {
      setRequestingMedia(false);
    }
  }, [recordedVideoUrl, recording, requestingMedia, script?.title, startCamera, stopCamera]);

  const stopRecording = useCallback(() => {
    void haptic('medium');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setRecordingStatus('saving');
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    setPlaying(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const handleBack = useCallback(() => {
    if (recording) {
      setShowLeaveDialog(true);
    } else {
      navigate(-1);
    }
  }, [recording, navigate]);

  const confirmLeave = useCallback(() => {
    stopRecording();
    setShowLeaveDialog(false);
    navigate(-1);
  }, [stopRecording, navigate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      stopCamera();
    };
  }, [recordedVideoUrl, stopCamera]);

  const [saving, setSaving] = useState(false);

  const downloadRecording = useCallback(async () => {
    if (!recordedBlob || saving) return;
    setSaving(true);

    const ext = getRecordingExtension(recordedBlob.type);
    const filename = `${(script?.title || 'recording').replace(/[^a-zA-Z0-9-_ ]/g, '')}-${Date.now()}.${ext}`;

    try {
      if (Capacitor.isNativePlatform()) {
        let uri = savedRecordingUri;
        if (!uri) {
          const base64 = await blobToBase64(recordedBlob);
          const writeResult = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Documents,
          });
          uri = writeResult.uri;
          setSavedRecordingUri(uri);
        }

        // Share the file (opens Android share sheet — user can save to Files, Drive, etc.)
        await Share.share({
          title: script?.title || 'Recording',
          url: uri,
          dialogTitle: 'Share or save your recording',
        });
      } else {
        // Web fallback: standard download
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      void haptic('light');
    } catch {
      setRecordingStatus('error');
      setRecordingError('Failed to save or share the recording. Check available storage and try again.');
    } finally {
      setSaving(false);
    }
  }, [recordedBlob, savedRecordingUri, script?.title, saving]);

  const dismissRecording = useCallback(() => {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);
    setRecordedBlob(null);
    setSavedRecordingUri(null);
    setRecordingStatus('idle');
  }, [recordedVideoUrl]);

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
      // Auto-stop recording when script ends
      if (recording) stopRecording();
      return;
    }
    animRef.current = requestAnimationFrame(scrollStep);
  }, [speed, recording, stopRecording]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = 0;
      animRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, scrollStep]);

  const toggleCamera = () => {
    if (recording) return; // Don't switch camera while recording
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
  };

  if (!script) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-sm p-6 text-center">
          <Camera className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="mb-2 text-lg font-semibold text-foreground">Script not found</h1>
          <p className="mb-4 text-sm text-muted-foreground">The script may have been deleted or could not be loaded.</p>
          <Button onClick={() => navigate('/home')}>Back to Scripts</Button>
        </div>
      </div>
    );
  }

  const lines = script.content.split('\n');
  const statusLabel: Record<RecordingStatus, string> = {
    idle: 'Ready',
    preparing: 'Preparing camera...',
    recording: `Recording... ${formatDuration(recordingDuration)}`,
    paused: `Paused ${formatDuration(recordingDuration)}`,
    saving: 'Saving recording...',
    saved: 'Recording saved',
    error: 'Recording error',
  };
  const busyWithRecording = recordingStatus === 'preparing' || recordingStatus === 'saving';

  return (
    <div className="relative flex min-h-screen flex-col bg-black overflow-hidden">
      {/* Camera preview */}
      <div className={`${splitView ? 'h-1/2' : 'absolute inset-0'} z-0 bg-black`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
      </div>

      {/* Camera error overlay — must sit above the script layer */}
      {cameraError && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/95 p-8" role="alert">
          <div className="max-w-sm text-center">
            <Camera aria-hidden="true" className="h-10 w-10 text-white/80 mx-auto mb-3" />
            <p className="text-sm text-white">{cameraError}</p>
            <p className="mt-2 text-xs text-white/80">Open Android Settings if permissions were denied permanently, then return and retry.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" onClick={() => startCamera().catch(() => {})}>Retry</Button>
              <Button size="sm" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white" onClick={() => navigate(-1)}>Back</Button>
            </div>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {(recording || busyWithRecording) && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/70 rounded-full px-4 py-1.5">
          <div className={`h-3 w-3 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-violet-400'}`} />
          <span className="text-white text-sm font-mono font-medium">
            {statusLabel[recordingStatus]}
          </span>
        </div>
      )}

      {/* Script overlay / split view */}
      <div
        ref={scrollRef}
        className={`${splitView ? 'h-1/2' : 'absolute inset-0'} z-10 overflow-y-auto`}
        style={{
          backgroundColor: splitView ? currentTheme.bg : `${currentTheme.bg}${cameraActive ? '66' : '99'}`,
          color: currentTheme.fg,
          transform: mirrored ? 'scaleX(-1)' : 'none',
        }}
      >
        <div
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.5,
            padding: splitView ? '1rem 1.5rem' : '4rem 2rem 50vh 2rem',
            paddingTop: splitView ? '1.5rem' : 'clamp(7.5rem, 18vh, 10rem)',
            paddingBottom: '60vh',
          }}
        >
          {lines.map((line, i) => (
            <p key={i} className="mb-1">{line || '\u00A0'}</p>
          ))}
        </div>
      </div>

      {/* Recorded video preview overlay */}
      {recordedVideoUrl && (
        <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6">
          <p className="text-white text-lg font-medium mb-4">Recording Complete</p>
          <video
            src={recordedVideoUrl}
            controls
            className="w-full max-w-sm rounded-lg mb-6"
            style={{ maxHeight: '50vh' }}
          />
          <div className="flex gap-3">
            <Button
              onClick={downloadRecording}
              disabled={saving}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {saving ? 'Saving...' : Capacitor.isNativePlatform() ? 'Share or Save Video' : 'Save Video'}
            </Button>
            <Button
              variant="outline"
              onClick={dismissRecording}
              className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white"
            >
              Dismiss
            </Button>
          </div>
          <p className="text-white/80 text-xs mt-3 text-center">
            {savedRecordingUri ? 'Saved in app storage. Use Share or Save Video to export it.' : 'Ready to save.'} Duration: {formatDuration(recordingDuration)}
          </p>
        </div>
      )}

      {/* Top controls */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-4 py-3 bg-black/50" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}>
        <Button variant="ghost" size="icon" className="touch-target text-white hover:bg-white/15 hover:text-white" aria-label="Back" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1 text-sm font-medium text-white truncate">{script.title}</span>
        <Button variant="ghost" size="icon" className="touch-target text-white hover:bg-white/15 hover:text-white" aria-label="Switch camera" onClick={toggleCamera} disabled={recording}>
          <SwitchCamera className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="touch-target"
          style={{ color: mirrored ? '#a78bfa' : 'white' }}
          onClick={() => setMirrored(!mirrored)}
          aria-label="Mirror mode"
        >
          <FlipHorizontal className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="touch-target"
          style={{ color: splitView ? '#a78bfa' : 'white' }}
          onClick={() => setSplitView(!splitView)}
          aria-label="Toggle split view"
        >
          {splitView ? <Layers className="h-5 w-5" /> : <Columns className="h-5 w-5" />}
        </Button>
      </div>

      {/* Bottom controls */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 safe-area-padding">
        <div className="flex items-center gap-1 px-4 py-1">
          <Type aria-hidden="true" className="h-3 w-3 text-white/80" />
          <Slider
            aria-label="Font size"
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            min={16}
            max={72}
            step={2}
            className="flex-1"
          />
          <span className="text-xs text-white/80 w-8 text-right">{fontSize}</span>
        </div>
        <div className="flex items-center justify-center gap-4 px-6 py-3">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/15 hover:text-white" aria-label="Rewind"
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollTop - speed * 100); }}>
            <SkipBack className="h-5 w-5" />
          </Button>

          {/* Teleprompter preview only */}
          <Button
            size="sm"
            variant="ghost"
            className="h-11 rounded-full border border-white/25 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white"
            aria-label={playing ? 'Pause preview scroll' : 'Preview scroll'}
            onClick={() => setPlaying(!playing)}
            disabled={recording || busyWithRecording}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            <span className="ml-1 hidden sm:inline">{playing ? 'Pause Preview' : 'Preview Scroll'}</span>
          </Button>

          {/* Primary recording action */}
          {recording ? (
            <Button
              onClick={stopRecording}
              className="h-14 rounded-full bg-red-600 px-6 text-white hover:bg-red-700"
              aria-label="Stop recording"
            >
              Stop Recording
            </Button>
          ) : (
            <Button
              onClick={startRecording}
              disabled={busyWithRecording}
              className="h-14 rounded-full bg-red-600 px-6 text-white hover:bg-red-700"
              aria-label="Start recording"
            >
              {recordingStatus === 'preparing' ? 'Preparing...' : 'Start Recording'}
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/15 hover:text-white" aria-label="Forward"
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop += speed * 100; }}>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
        {recordingError && (
          <p className="px-4 pb-3 text-center text-xs text-red-200" role="alert">{recordingError}</p>
        )}
      </div>

      {/* Leave confirmation during recording */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop recording?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an active recording. Leaving will stop and discard it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Recording</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmLeave}
            >
              Stop & Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecordMode;
