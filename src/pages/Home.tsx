import { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScripts, deleteScript, restoreScript, getWordCount } from '@/lib/storage';
import { haptic } from '@/lib/haptics';
import { Script } from '@/types/script';
import { Plus, Search, Play, MoreVertical, Trash2, Edit, FileText, RefreshCw, LayoutList, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SortMode = 'updated' | 'created' | 'az' | 'longest';
type ViewMode = 'detailed' | 'compact';

const Home = () => {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<Script[]>(getScripts());
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const pullStartY = useRef<number | null>(null);
  const allTags = useMemo(
    () => Array.from(new Set(scripts.flatMap(script => script.tags))).sort(),
    [scripts],
  );

  const filtered = useMemo(() => {
    let result = scripts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      );
    }
    if (selectedTag) {
      result = result.filter(s => s.tags.includes(selectedTag));
    }
    return [...result].sort((a, b) => {
      if (sortMode === 'created') return b.createdAt - a.createdAt;
      if (sortMode === 'az') return a.title.localeCompare(b.title);
      if (sortMode === 'longest') return getWordCount(b.content) - getWordCount(a.content);
      return b.updatedAt - a.updatedAt;
    });
  }, [scripts, search, selectedTag, sortMode]);

  const refreshScripts = async () => {
    setScripts(getScripts());
    await haptic('selection');
    toast.success('Scripts refreshed');
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 0) pullStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartY.current === null) return;
    const distance = event.changedTouches[0].clientY - pullStartY.current;
    pullStartY.current = null;
    if (window.scrollY <= 0 && distance > 70) void refreshScripts();
  };

  const handleDelete = async (script: Script) => {
    if (!window.confirm(`Delete “${script.title}”? This removes the script from this device.`)) return;
    await haptic('warning');
    const deleted = deleteScript(script.id);
    setScripts(getScripts());
    if (deleted) {
      toast('Script deleted', {
        description: deleted.title,
        action: {
          label: 'Undo',
          onClick: () => {
            restoreScript(deleted);
            setScripts(getScripts());
            toast.success('Script restored');
          },
        },
      });
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-background safe-area-padding"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="px-5 pb-2" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cuevora</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="touch-target" aria-label="Open settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Teleprompter features, actually free.</p>

        {/* Search */}
        <div className="relative mb-3">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search scripts"
            placeholder="Search scripts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-card pl-10"
          />
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Button variant="outline" size="sm" className="touch-target gap-2" onClick={refreshScripts}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="touch-target gap-2" aria-label="Sort and view options">
                <ListFilter className="h-4 w-4" />
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Sort</DropdownMenuLabel>
              {[
                ['updated', 'Recently updated'],
                ['created', 'Recently created'],
                ['az', 'A to Z'],
                ['longest', 'Longest script'],
              ].map(([value, label]) => (
                <DropdownMenuItem key={value} onClick={() => setSortMode(value as SortMode)}>
                  {sortMode === value ? '✓ ' : ''}{label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>View</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setViewMode('detailed')}>
                {viewMode === 'detailed' ? '✓ ' : ''}Detailed cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('compact')}>
                {viewMode === 'compact' ? '✓ ' : ''}Compact cards
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className="cursor-pointer shrink-0"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Badge>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer shrink-0"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Quick start */}
      {scripts.length > 0 && (
        <div className="px-5 py-3">
          <Button
            className="w-full touch-target justify-start gap-3"
            variant="secondary"
            onClick={() => navigate(`/player/${scripts[0].id}`)}
          >
            <Play className="h-4 w-4 text-primary" />
            <span className="truncate">Continue: {scripts[0].title}</span>
          </Button>
        </div>
      )}

      {/* Script List */}
      <div className="flex-1 px-5 pb-28">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                {scripts.length === 0 ? 'No scripts yet' : selectedTag ? `No scripts tagged “${selectedTag}”` : 'No search results'}
              </h2>
              <p className="mb-6 text-sm text-muted-foreground max-w-[260px]">
                {scripts.length === 0
                  ? 'Create your first script and start prompting in seconds.'
                  : selectedTag
                    ? 'Clear the tag filter or add this tag to another script.'
                    : 'Try a different search term or clear the search field.'}
              </p>
              {(scripts.length === 0 || !search) && (
                <Button onClick={() => navigate('/editor/new')} className="touch-target">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Script
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filtered.map((script, i) => (
                <motion.div
                  key={script.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm cursor-pointer active:scale-[0.98] transition-transform hover:bg-accent/40 ${viewMode === 'compact' ? 'p-3' : 'p-4'}`}
                  onClick={() => navigate(`/editor/${script.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-card-foreground truncate">{script.title}</h3>
                    {viewMode === 'detailed' && (
                      <p className="text-sm text-muted-foreground truncate">
                        {script.content.slice(0, 90) || 'Empty script'}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs text-muted-foreground">{formatDate(script.updatedAt)}</span>
                      <span className="text-xs text-muted-foreground">{getWordCount(script.content)} words</span>
                      {script.tags.map(t => (
                        <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target text-primary"
                      aria-label={`Play ${script.title}`}
                      onClick={e => { e.stopPropagation(); navigate(`/player/${script.id}`); }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="touch-target text-muted-foreground" aria-label={`Open options for ${script.title}`} onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/editor/${script.id}`)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive-emphasis focus:text-destructive-emphasis"
                          onClick={() => handleDelete(script)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <div className="fixed right-6" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg touch-target"
          onClick={() => navigate('/editor/new')}
          aria-label="Create script"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Home;
