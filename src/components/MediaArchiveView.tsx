import { useState } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ATTACHED_ASSETS } from '../data/argusData';

interface MediaArchiveViewProps {
  onSendAssetToAi: (assetId: string) => void;
}

export function MediaArchiveView({ onSendAssetToAi }: MediaArchiveViewProps) {
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-display text-xl font-bold text-slate-100">
          Archiwum Materiałów Źródłowych ARGUS Cykl 2
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Załączone obrazy referencyjne i 40-stronicowy dokument Master v1.1. Daty z nazw plików wideo (np. 20261007_160130.mp4) są traktowane wyłącznie jako nazwy robocze, bez fabrykowania brakujących metadanych EXIF.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {ATTACHED_ASSETS.map((asset) => {
          const isPdf = asset.fileType === 'pdf';
          const isBroken = brokenImages[asset.id];

          return (
            <article
              key={asset.id}
              className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
            >
              <div>
                {isPdf ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 border-b border-slate-800 bg-slate-950 p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-700/50 bg-emerald-950/50 text-emerald-300">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-emerald-400">PDF · 40 stron · v1.1</div>
                      <p className="mt-1 max-w-md text-xs text-slate-300">
                        Pełny raport źródłowy zawierający Aneks A (chronologia), Aneks B (15 konfliktów K-*) oraz tabele pomiarów wagowych i Photone PPFD.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-64 items-center justify-center border-b border-slate-800 bg-slate-950">
                    {!isBroken ? (
                      <img
                        src={asset.publicUrl}
                        alt={asset.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [asset.id]: true }))
                        }
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
                        <ImageIcon className="h-6 w-6" />
                        <span>Nie udało się załadować podglądu: {asset.publicUrl}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <h2 className="font-display text-base font-semibold text-slate-100">
                    {asset.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-300">{asset.subtitle}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{asset.provenanceNote}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/50 px-4 py-3">
                <a
                  href={asset.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 hover:text-sky-200"
                >
                  <span>Otwórz oryginał</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                {!isPdf && (
                  <button
                    type="button"
                    onClick={() => onSendAssetToAi(asset.id)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Analizuj w Gemini Vision</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
