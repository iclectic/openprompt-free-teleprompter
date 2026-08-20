import { Script, ScriptRevision, AppSettings, DEFAULT_SETTINGS } from '@/types/script';
import { RehearsalSession, SpeechTranscriptEvent } from '@/types/studio';

const SCRIPTS_KEY = 'cuevora_scripts';
const REVISIONS_KEY = 'cuevora_revisions';
const SETTINGS_KEY = 'cuevora_settings';
const REHEARSAL_SESSIONS_KEY = 'cuevora_rehearsal_sessions';
const STORAGE_VERSION_KEY = 'cuevora_storage_version';
const STORAGE_VERSION = 1;
const MAX_REVISIONS = 10;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
  if (key !== STORAGE_VERSION_KEY) localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normaliseScript(value: unknown): Script | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  const now = Date.now();
  return {
    id: value.id,
    title: typeof value.title === 'string' && value.title.trim() ? value.title : 'Untitled Script',
    content: typeof value.content === 'string' ? value.content : '',
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : now,
    markers: Array.isArray(value.markers) ? value.markers.filter((marker): marker is number => typeof marker === 'number') : [],
    highlights: Array.isArray(value.highlights) ? value.highlights.filter((highlight): highlight is number => typeof highlight === 'number') : [],
  };
}

function normaliseRevision(value: unknown): ScriptRevision | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.scriptId !== 'string') return null;
  return {
    id: value.id,
    scriptId: value.scriptId,
    content: typeof value.content === 'string' ? value.content : '',
    timestamp: typeof value.timestamp === 'number' ? value.timestamp : Date.now(),
  };
}

function normaliseSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...value } as AppSettings;
}

function normaliseTranscriptEvent(value: unknown): SpeechTranscriptEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.transcript !== 'string') return null;
  if (typeof value.timestamp !== 'number') return null;
  return {
    transcript: value.transcript,
    confidence: typeof value.confidence === 'number' ? value.confidence : 0,
    isFinal: typeof value.isFinal === 'boolean' ? value.isFinal : true,
    timestamp: value.timestamp,
    source: 'web-speech',
  };
}

function normaliseRehearsalSession(value: unknown): RehearsalSession | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.scriptId !== 'string') return null;
  if (!isRecord(value.metrics)) return null;

  const transcriptEvents = Array.isArray(value.transcriptEvents)
    ? value.transcriptEvents.map(normaliseTranscriptEvent).filter((event): event is SpeechTranscriptEvent => Boolean(event))
    : [];

  if (Array.isArray(value.transcriptEvents) && transcriptEvents.length !== value.transcriptEvents.length) {
    return null;
  }

  const metrics = value.metrics;
  const unavailableMetrics = Array.isArray(metrics.unavailableMetrics)
    ? metrics.unavailableMetrics.filter((metric): metric is string => typeof metric === 'string')
    : [];
  const suggestions = Array.isArray(metrics.suggestions)
    ? metrics.suggestions.filter((suggestion): suggestion is string => typeof suggestion === 'string')
    : [];

  return {
    id: value.id,
    scriptId: value.scriptId,
    scriptTitle: typeof value.scriptTitle === 'string' ? value.scriptTitle : 'Untitled Script',
    startedAt: typeof value.startedAt === 'number' ? value.startedAt : Date.now(),
    endedAt: typeof value.endedAt === 'number' ? value.endedAt : Date.now(),
    transcriptEvents,
    metrics: {
      durationSeconds: typeof metrics.durationSeconds === 'number' ? metrics.durationSeconds : 0,
      transcriptWordCount: typeof metrics.transcriptWordCount === 'number' ? metrics.transcriptWordCount : 0,
      scriptWordCount: typeof metrics.scriptWordCount === 'number' ? metrics.scriptWordCount : 0,
      wordsPerMinute: typeof metrics.wordsPerMinute === 'number' ? metrics.wordsPerMinute : null,
      longPauseCount: typeof metrics.longPauseCount === 'number' ? metrics.longPauseCount : 0,
      fillerWordCount: typeof metrics.fillerWordCount === 'number' ? metrics.fillerWordCount : 0,
      scriptCoverage: typeof metrics.scriptCoverage === 'number' ? metrics.scriptCoverage : null,
      completionPercent: typeof metrics.completionPercent === 'number' ? metrics.completionPercent : 0,
      unavailableMetrics,
      suggestions,
    },
  };
}

// Scripts
export function getScripts(): Script[] {
  return safeParse<unknown[]>(localStorage.getItem(SCRIPTS_KEY), [])
    .map(normaliseScript)
    .filter((script): script is Script => Boolean(script));
}

export function getScript(id: string): Script | undefined {
  return getScripts().find(s => s.id === id);
}

export function saveScript(script: Partial<Script> & { id?: string }): Script {
  const scripts = getScripts();
  const now = Date.now();

  if (script.id) {
    const idx = scripts.findIndex(s => s.id === script.id);
    if (idx !== -1) {
      const existing = scripts[idx];
      // Save revision before updating
      if (script.content && script.content !== existing.content) {
        addRevision(existing.id, existing.content);
      }
      scripts[idx] = { ...existing, ...script, updatedAt: now };
      writeJson(SCRIPTS_KEY, scripts);
      return scripts[idx];
    }
  }

  const newScript: Script = {
    id: generateId(),
    title: script.title || 'Untitled Script',
    content: script.content || '',
    tags: script.tags || [],
    createdAt: now,
    updatedAt: now,
    markers: script.markers || [],
    highlights: script.highlights || [],
  };
  scripts.unshift(newScript);
  writeJson(SCRIPTS_KEY, scripts);
  return newScript;
}

export function deleteScript(id: string): Script | undefined {
  const scripts = getScripts();
  const deleted = scripts.find(s => s.id === id);
  writeJson(SCRIPTS_KEY, scripts.filter(s => s.id !== id));
  // Clean up revisions
  const revisions = getRevisions(id);
  if (revisions.length) {
    const allRevisions = safeParse<unknown[]>(localStorage.getItem(REVISIONS_KEY), [])
      .map(normaliseRevision)
      .filter((revision): revision is ScriptRevision => Boolean(revision));
    writeJson(REVISIONS_KEY, allRevisions.filter(r => r.scriptId !== id));
  }
  return deleted;
}

export function restoreScript(script: Script): void {
  const scripts = getScripts();
  if (scripts.some(s => s.id === script.id)) return;
  writeJson(SCRIPTS_KEY, [script, ...scripts]);
}

// Revisions
export function getRevisions(scriptId: string): ScriptRevision[] {
  return safeParse<unknown[]>(localStorage.getItem(REVISIONS_KEY), [])
    .map(normaliseRevision)
    .filter((revision): revision is ScriptRevision => Boolean(revision) && revision.scriptId === scriptId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function addRevision(scriptId: string, content: string): void {
  try {
    const all = safeParse<unknown[]>(localStorage.getItem(REVISIONS_KEY), [])
      .map(normaliseRevision)
      .filter((revision): revision is ScriptRevision => Boolean(revision));
    const rev: ScriptRevision = { id: generateId(), scriptId, content, timestamp: Date.now() };
    all.push(rev);
    // Keep only last MAX_REVISIONS per script
    const scriptRevs = all.filter(r => r.scriptId === scriptId).sort((a, b) => b.timestamp - a.timestamp);
    if (scriptRevs.length > MAX_REVISIONS) {
      const toRemove = new Set(scriptRevs.slice(MAX_REVISIONS).map(r => r.id));
      const filtered = all.filter(r => !toRemove.has(r.id));
      writeJson(REVISIONS_KEY, filtered);
    } else {
      writeJson(REVISIONS_KEY, all);
    }
  } catch {
    // Revision history is best-effort; script saving should continue.
  }
}

// Settings
export function getSettings(): AppSettings {
  return normaliseSettings(safeParse<unknown>(localStorage.getItem(SETTINGS_KEY), DEFAULT_SETTINGS));
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  writeJson(SETTINGS_KEY, updated);
  window.dispatchEvent(new Event('cuevora-settings-changed'));
  return updated;
}

// Rehearsal sessions
export function getRehearsalSessions(scriptId?: string): RehearsalSession[] {
  const sessions = safeParse<unknown[]>(localStorage.getItem(REHEARSAL_SESSIONS_KEY), [])
    .map(normaliseRehearsalSession)
    .filter((session): session is RehearsalSession => Boolean(session))
    .sort((a, b) => b.endedAt - a.endedAt);

  return scriptId ? sessions.filter(session => session.scriptId === scriptId) : sessions;
}

export function saveRehearsalSession(session: Omit<RehearsalSession, 'id'> & { id?: string }): RehearsalSession {
  const sessions = getRehearsalSessions();
  const nextSession: RehearsalSession = {
    ...session,
    id: session.id || generateId(),
  };

  const existingIndex = sessions.findIndex(existing => existing.id === nextSession.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = nextSession;
  } else {
    sessions.unshift(nextSession);
  }

  writeJson(REHEARSAL_SESSIONS_KEY, sessions);
  return nextSession;
}

// Backup & Restore
export function exportBackup(): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    scripts: getScripts(),
    revisions: safeParse<unknown[]>(localStorage.getItem(REVISIONS_KEY), [])
      .map(normaliseRevision)
      .filter((revision): revision is ScriptRevision => Boolean(revision)),
    settings: getSettings(),
    rehearsalSessions: getRehearsalSessions(),
    exportedAt: Date.now(),
  }, null, 2);
}

export function importBackup(json: string): boolean {
  try {
    const data = JSON.parse(json) as unknown;
    if (!isRecord(data)) return false;
    if (!Array.isArray(data.scripts)) return false;

    const scripts = data.scripts
      .map(normaliseScript)
      .filter((script): script is Script => Boolean(script));
    if (scripts.length !== data.scripts.length) return false;

    const revisions = Array.isArray(data.revisions)
      ? data.revisions.map(normaliseRevision).filter((revision): revision is ScriptRevision => Boolean(revision))
      : [];
    const rehearsalSessions = Array.isArray(data.rehearsalSessions)
      ? data.rehearsalSessions.map(normaliseRehearsalSession).filter((session): session is RehearsalSession => Boolean(session))
      : [];
    if (Array.isArray(data.rehearsalSessions) && rehearsalSessions.length !== data.rehearsalSessions.length) return false;
    const settings = normaliseSettings(data.settings);

    writeJson(SCRIPTS_KEY, scripts);
    writeJson(REVISIONS_KEY, revisions);
    writeJson(SETTINGS_KEY, settings);
    writeJson(REHEARSAL_SESSIONS_KEY, rehearsalSessions);
    window.dispatchEvent(new Event('cuevora-settings-changed'));
    return true;
  } catch {
    return false;
  }
}

export function clearLocalData(): void {
  localStorage.removeItem(SCRIPTS_KEY);
  localStorage.removeItem(REVISIONS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(REHEARSAL_SESSIONS_KEY);
  localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  window.dispatchEvent(new Event('cuevora-settings-changed'));
}

// Utility
export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getReadTime(text: string, wpm: number = 140): number {
  const words = getWordCount(text);
  return Math.ceil((words / wpm) * 60); // seconds
}

export function getAllTags(): string[] {
  const scripts = getScripts();
  const tags = new Set<string>();
  scripts.forEach(s => s.tags.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
}
