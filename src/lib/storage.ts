import { Script, ScriptRevision, AppSettings, DEFAULT_SETTINGS } from '@/types/script';

const SCRIPTS_KEY = 'openprompt_scripts';
const REVISIONS_KEY = 'openprompt_revisions';
const SETTINGS_KEY = 'openprompt_settings';
const MAX_REVISIONS = 10;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Scripts
export function getScripts(): Script[] {
  try {
    const data = localStorage.getItem(SCRIPTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
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
      localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
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
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
  return newScript;
}

export function deleteScript(id: string): void {
  const scripts = getScripts().filter(s => s.id !== id);
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
  // Clean up revisions
  const revisions = getRevisions(id);
  if (revisions.length) {
    const allRevisions: ScriptRevision[] = JSON.parse(localStorage.getItem(REVISIONS_KEY) || '[]');
    localStorage.setItem(REVISIONS_KEY, JSON.stringify(allRevisions.filter(r => r.scriptId !== id)));
  }
}

// Revisions
export function getRevisions(scriptId: string): ScriptRevision[] {
  try {
    const data = localStorage.getItem(REVISIONS_KEY);
    const all: ScriptRevision[] = data ? JSON.parse(data) : [];
    return all.filter(r => r.scriptId === scriptId).sort((a, b) => b.timestamp - a.timestamp);
  } catch { return []; }
}

function addRevision(scriptId: string, content: string): void {
  try {
    const data = localStorage.getItem(REVISIONS_KEY);
    const all: ScriptRevision[] = data ? JSON.parse(data) : [];
    const rev: ScriptRevision = { id: generateId(), scriptId, content, timestamp: Date.now() };
    all.push(rev);
    // Keep only last MAX_REVISIONS per script
    const scriptRevs = all.filter(r => r.scriptId === scriptId).sort((a, b) => b.timestamp - a.timestamp);
    if (scriptRevs.length > MAX_REVISIONS) {
      const toRemove = new Set(scriptRevs.slice(MAX_REVISIONS).map(r => r.id));
      const filtered = all.filter(r => !toRemove.has(r.id));
      localStorage.setItem(REVISIONS_KEY, JSON.stringify(filtered));
    } else {
      localStorage.setItem(REVISIONS_KEY, JSON.stringify(all));
    }
  } catch { }
}

// Settings
export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

// Backup & Restore
export function exportBackup(): string {
  return JSON.stringify({
    scripts: getScripts(),
    revisions: JSON.parse(localStorage.getItem(REVISIONS_KEY) || '[]'),
    settings: getSettings(),
    exportedAt: Date.now(),
  }, null, 2);
}

export function importBackup(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.scripts) localStorage.setItem(SCRIPTS_KEY, JSON.stringify(data.scripts));
    if (data.revisions) localStorage.setItem(REVISIONS_KEY, JSON.stringify(data.revisions));
    if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    return true;
  } catch { return false; }
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
