import { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultEntry {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResultEntry;
}

interface SpeechRecognitionEventPayload {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionAPI {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventPayload) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export type VoiceCommand = 'play' | 'pause' | 'stop' | 'faster' | 'slower' | 'reset' | 'unknown';

interface UseVoiceControlOptions {
  onCommand: (command: VoiceCommand) => void;
  enabled: boolean;
}

const COMMAND_MAP: Record<string, VoiceCommand> = {
  play: 'play',
  start: 'play',
  go: 'play',
  begin: 'play',
  resume: 'play',
  pause: 'pause',
  wait: 'pause',
  hold: 'pause',
  stop: 'stop',
  end: 'stop',
  faster: 'faster',
  'speed up': 'faster',
  quicker: 'faster',
  slower: 'slower',
  'slow down': 'slower',
  reset: 'reset',
  restart: 'reset',
  'go back': 'reset',
};

function parseCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();
  for (const [phrase, cmd] of Object.entries(COMMAND_MAP)) {
    if (lower.includes(phrase)) return cmd;
  }
  return 'unknown';
}

export function useVoiceControl({ onCommand, enabled }: UseVoiceControlOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (isAndroidNative) {
      setSupported(false);
      return;
    }
    const win = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupported(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const win = window as Window & { SpeechRecognition?: new () => SpeechRecognitionAPI; webkitSpeechRecognition?: new () => SpeechRecognitionAPI };
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition || !enabled) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEventPayload) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript;
        setLastTranscript(transcript);
        const cmd = parseCommand(transcript);
        if (cmd !== 'unknown') {
          onCommandRef.current(cmd);
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* noop */ }
      }
    };

    recognition.onerror = () => {
      // Silently handle errors, will auto-restart via onend
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch { /* noop */ }
  }, [enabled]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* noop */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  return { listening, supported, lastTranscript, start, stop, toggle };
}
