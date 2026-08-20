import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getScript, saveScript, getRevisions, getWordCount, getReadTime, getSettings } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { Script, ScriptRevision } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, Download, Upload, History, Copy, X, Plus, Clock, FileText, Check
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const Editor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const settings = getSettings();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<ScriptRevision[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'error'>(
    navigator.onLine ? 'idle' : 'offline',
  );
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isNew && id) {
      const script = getScript(id);
      if (script) {
        setTitle(script.title);
        setContent(script.content);
        setTags(script.tags);
        setScriptId(script.id);
        setRevisions(getRevisions(script.id));
      }
    }
  }, [id, isNew]);

  useEffect(() => {
    const updateOnlineStatus = () => setSaveStatus(navigator.onLine ? 'idle' : 'offline');
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const warnOnExit = (event: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnOnExit);
    return () => window.removeEventListener('beforeunload', warnOnExit);
  }, [saveStatus]);

  const autoSave = useCallback((t: string, c: string, tg: string[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaveStatus(navigator.onLine ? 'saving' : 'offline');
    saveTimeout.current = setTimeout(() => {
      try {
        const saved = saveScript({ id: scriptId || undefined, title: t || 'Untitled Script', content: c, tags: tg });
        if (!scriptId) setScriptId(saved.id);
        setSaveStatus('saved');
        void haptic('selection');
      } catch {
        setSaveStatus('error');
        toast.error('Error saving. Your changes are still on screen.');
      }
    }, 800);
  }, [scriptId]);

  const handleTitleChange = (v: string) => { setTitle(v); autoSave(v, content, tags); };
  const handleContentChange = (v: string) => { setContent(v); autoSave(title, v, tags); };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      const updated = [...tags, t];
      setTags(updated);
      setNewTag('');
      autoSave(title, content, updated);
    }
  };

  const removeTag = (tag: string) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    autoSave(title, content, updated);
  };

  const handleImportTxt = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          setContent(text);
          if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
          autoSave(title || file.name.replace(/\.[^.]+$/, ''), text, tags);
          toast.success('File imported');
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportTxt = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'script'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as .txt');
    void haptic('light');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
    void haptic('light');
  };

  const restoreRevision = (rev: ScriptRevision) => {
    setContent(rev.content);
    autoSave(title, rev.content, tags);
    setShowHistory(false);
    toast.success('Revision restored');
  };

  const wordCount = getWordCount(content);
  const readTimeSec = getReadTime(content, settings.wpm);
  const readTimeMin = Math.floor(readTimeSec / 60);
  const readTimeSecs = readTimeSec % 60;

  const saveStatusLabel = {
    idle: 'Autosave on',
    saving: 'Saving...',
    saved: 'Saved',
    offline: 'Offline',
    error: 'Error saving',
  }[saveStatus];

  const goBack = () => {
    if (saveStatus === 'saving' && !window.confirm('Cuevora is still saving. Leave this editor?')) return;
    navigate('/home');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-padding">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pb-2" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
        <Button variant="ghost" size="icon" className="touch-target" onClick={goBack} aria-label="Back to scripts">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground" role="status" aria-live="polite">
          {saveStatus === 'saved' && <Check aria-hidden="true" className="h-3 w-3 text-primary" />}
          {saveStatusLabel}
        </div>
      </div>

      {/* Title */}
      <div className="px-5">
        <Input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Script title..."
          aria-label="Script title"
          className="border-none text-xl font-bold bg-transparent px-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 px-5 py-2">
        {tags.map(t => (
          <button key={t} type="button" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Badge variant="secondary" className="gap-1">
              {t} <X aria-hidden="true" className="h-3 w-3" />
            </Badge>
          </button>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Add tag..."
            aria-label="Add tag"
            className="h-7 w-24 text-xs bg-transparent border-dashed"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-2">
        <Textarea
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="Paste or type your script here..."
          aria-label="Script content"
          className="min-h-[300px] flex-1 resize-none border-none bg-transparent text-base leading-relaxed focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-5 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{wordCount} words</span>
        <span>{content.length} chars</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {readTimeMin > 0 ? `${readTimeMin}m ` : ''}{readTimeSecs}s @ {settings.wpm} wpm
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-border" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {scriptId && (
          <Button
            className="flex-1 touch-target"
            onClick={() => {
              void haptic('medium');
              navigate(`/player/${scriptId}`);
            }}
          >
            <Play className="h-4 w-4 mr-2" /> Prompt
          </Button>
        )}
        <Button variant="outline" size="icon" className="touch-target" onClick={handleImportTxt} aria-label="Import text file">
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="touch-target" onClick={handleExportTxt} aria-label="Export as text file">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="touch-target" onClick={handleCopy} aria-label="Copy script to clipboard">
          <Copy className="h-4 w-4" />
        </Button>

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="touch-target" aria-label="Open version history">
              <History className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No revisions yet. Edits are saved automatically.</p>
              ) : (
                revisions.map(rev => (
                  <button
                    key={rev.id}
                    type="button"
                    className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => restoreRevision(rev)}
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(rev.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-foreground truncate">{rev.content.slice(0, 100)}</p>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Editor;
