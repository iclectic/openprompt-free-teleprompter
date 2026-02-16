import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScripts, deleteScript, getAllTags } from '@/lib/storage';
import { Script } from '@/types/script';
import { Plus, Search, Play, MoreVertical, Trash2, Edit, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Home = () => {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<Script[]>(getScripts());
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const allTags = useMemo(() => getAllTags(), [scripts]);

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
    return result;
  }, [scripts, search, selectedTag]);

  const handleDelete = (id: string) => {
    deleteScript(id);
    setScripts(getScripts());
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
    <div className="flex min-h-screen flex-col bg-background safe-area-padding">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">OpenPrompt</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="touch-target">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Teleprompter features, actually free.</p>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scripts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-surface border-border"
          />
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
      <div className="flex-1 px-5">
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
                {scripts.length === 0 ? 'No scripts yet' : 'No results'}
              </h2>
              <p className="mb-6 text-sm text-muted-foreground max-w-[260px]">
                {scripts.length === 0
                  ? 'Create your first script and start prompting in seconds.'
                  : 'Try a different search term.'}
              </p>
              {scripts.length === 0 && (
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
                  className="flex items-center gap-3 rounded-xl bg-card p-4 border border-border/50 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => navigate(`/editor/${script.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{script.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {script.content.slice(0, 60) || 'Empty script'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{formatDate(script.updatedAt)}</span>
                      {script.tags.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
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
                      onClick={e => { e.stopPropagation(); navigate(`/player/${script.id}`); }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="touch-target" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/editor/${script.id}`)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(script.id)}
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
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg touch-target"
          onClick={() => navigate('/editor/new')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Home;
