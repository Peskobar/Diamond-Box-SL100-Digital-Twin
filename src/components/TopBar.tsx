import { Box, FileSearch, FlaskConical, FolderArchive, Sparkles } from 'lucide-react';

export type AppTab = 'twin' | 'audit' | 'gemini' | 'bioscience' | 'archive';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  conflictCount: number;
  onQuickAiAudit: () => void;
}

const NAV_ITEMS: Array<{ id: AppTab; label: string; icon: typeof Box }> = [
  { id: 'twin', label: '3D Twin', icon: Box },
  { id: 'audit', label: 'Dane i Audyt', icon: FileSearch },
  { id: 'gemini', label: 'Analiza AI', icon: Sparkles },
  { id: 'bioscience', label: 'Bioscience', icon: FlaskConical },
  { id: 'archive', label: 'Archiwum', icon: FolderArchive },
];

export function TopBar({ activeTab, onSelectTab, conflictCount, onQuickAiAudit }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Brand */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-950/60 font-mono text-xs font-semibold text-emerald-300">
            A2
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="flex items-center gap-2">
              <span className="truncate font-display text-sm font-semibold tracking-tight text-slate-100">
                ARGUS Cykl 2
              </span>
              <span className="hidden font-mono text-[11px] text-slate-400 md:inline">
                · Audyt v1.1 · SL100
              </span>
            </div>
            <p className="hidden truncate text-[11px] text-slate-400 lg:block">
              28.08–22.10 · {conflictCount} konfliktów K-* · VEG potwierdzony / flip nieudokumentowany
            </p>
          </div>
        </div>

        {/* Center: Primary Navigation */}
        <nav aria-label="Główna nawigacja" className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Single Primary Action */}
        <div className="hidden shrink-0 items-center lg:flex">
          <button
            type="button"
            onClick={onQuickAiAudit}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Szybki Audyt AI</span>
          </button>
        </div>
      </div>
    </header>
  );
}
