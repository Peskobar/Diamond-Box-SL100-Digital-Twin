import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, FlaskConical, Loader2, Search } from 'lucide-react';
import { BIOSCIENCE_PRESETS } from '../data/argusData';

interface PubChemCompound {
  cid: number;
  title: string;
  formula: string;
  molecularWeight: number;
  smiles: string;
  inchiKey: string;
  xlogp: number | null;
  tpsa: number;
  hbd: number;
  hba: number;
  rotatableBonds: number;
  lipinskiViolations: number;
  veberCompliant: boolean;
  synonyms: string[];
  image2dUrl: string;
  pubchemUrl: string;
}

interface ChemblResult {
  molecule: {
    chemblId: string;
    prefName: string;
    maxPhase: number | null;
    moleculeType: string;
    url: string;
  } | null;
  activities: Array<{
    targetName: string;
    targetOrganism: string;
    standardType: string;
    standardValue: string;
    standardUnits: string;
    assayDescription: string;
  }>;
}

interface LiteraturePaper {
  source: 'Europe PMC' | 'OpenAlex';
  id: string;
  title: string;
  year: string;
  journal: string;
  authors: string;
  citations: number | null;
  abstract: string;
  url: string;
}

export function BioscienceLab() {
  const [query, setQuery] = useState('Magnesium sulfate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pubchem, setPubchem] = useState<PubChemCompound | null>(null);
  const [chembl, setChembl] = useState<ChemblResult | null>(null);
  const [papers, setPapers] = useState<LiteraturePaper[]>([]);
  const [imgFailed, setImgFailed] = useState(false);

  const runSearch = async (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setQuery(clean);
    setLoading(true);
    setError(null);
    setImgFailed(false);

    try {
      const litPromise = fetch(`/api/science/literature?q=${encodeURIComponent(clean)}`);
      const pubRes = await fetch(`/api/science/pubchem?q=${encodeURIComponent(clean)}`);
      const pubData = await pubRes.json();

      if (!pubRes.ok) {
        setPubchem(null);
        setChembl(null);
        setError(pubData.error || `Brak rekordu w PubChem dla „${clean}”.`);
      } else {
        setPubchem(pubData);
      }

      const [chemRes, litRes] = await Promise.allSettled([
        fetch(
          `/api/science/chembl?q=${encodeURIComponent(clean)}${
            pubData?.inchiKey ? `&inchiKey=${encodeURIComponent(pubData.inchiKey)}` : ''
          }`,
        ),
        litPromise,
      ]);

      if (chemRes.status === 'fulfilled' && chemRes.value.ok) {
        setChembl(await chemRes.value.json());
      } else {
        setChembl(null);
      }

      if (litRes.status === 'fulfilled' && litRes.value.ok) {
        const litJson = (await litRes.value.json()) as { papers?: LiteraturePaper[] };
        setPapers(litJson.papers ?? []);
      } else {
        setPapers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapytania Bioscience API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch('Magnesium sulfate');
  }, []);

  const activePreset = BIOSCIENCE_PRESETS.find(
    (p) => p.query.toLowerCase() === query.toLowerCase(),
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      {/* Header & Search Controls */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-xl font-bold text-slate-100">
              <FlaskConical className="h-5 w-5 text-emerald-400" />
              <span>Bioscience Lab · PubChem, ChEMBL i Literatura</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Zapytania na żywo przez proxy serwerowe do PubChem PUG-REST, EBI ChEMBL, Europe PMC i OpenAlex (zero danych testowych).
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
            className="flex w-full max-w-md gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wpisz związek lub substancję (np. Orthosilicic acid)..."
              aria-label="Nazwa związku chemicznego lub substancji"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>Szukaj</span>
            </button>
          </form>
        </div>

        {/* Presets relevant to ARGUS Cycle 2 */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {BIOSCIENCE_PRESETS.map((preset) => {
            const active = preset.query.toLowerCase() === query.toLowerCase();
            return (
              <button
                key={preset.query}
                type="button"
                onClick={() => void runSearch(preset.query)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600/25 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950 text-slate-300 ring-1 ring-slate-800 hover:bg-slate-800'
                }`}
              >
                {preset.polishLabel}
              </button>
            );
          })}
        </div>

        {activePreset && (
          <p className="mt-3 text-xs text-emerald-300/90">
            Kontekst ARGUS Cykl 2: {activePreset.relevance}
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-4 text-xs text-amber-200">
          {error}
        </div>
      )}

      {/* Split Workspace: Compound Identity & Properties + Bioactivity & Literature */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 5 cols: PubChem Structure & Lipinski/Veber */}
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-5">
          {loading && !pubchem ? (
            <div className="flex h-64 items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Pobieranie danych PubChem...</span>
            </div>
          ) : pubchem ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="font-mono text-[11px] text-emerald-400">
                    PubChem CID: {pubchem.cid} · {pubchem.formula}
                  </div>
                  <h2 className="mt-0.5 font-display text-lg font-semibold text-slate-100">
                    {pubchem.title}
                  </h2>
                </div>
                <a
                  href={pubchem.pubchemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  <span>PubChem</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center justify-center rounded-lg border border-slate-800 bg-white p-4">
                {!imgFailed ? (
                  <img
                    src={pubchem.image2dUrl}
                    alt={`Struktura 2D ${pubchem.title}`}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="h-52 w-52 object-contain"
                  />
                ) : (
                  <div className="py-12 font-mono text-xs text-slate-600">
                    Podgląd 2D niedostępny ({pubchem.formula})
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums sm:grid-cols-3">
                <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">Masa molowa</div>
                  <div className="mt-0.5 font-semibold text-slate-100">
                    {pubchem.molecularWeight} g/mol
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">XLogP / TPSA</div>
                  <div className="mt-0.5 font-semibold text-slate-100">
                    {pubchem.xlogp ?? '—'} / {pubchem.tpsa} Å²
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">Lipinski / Veber</div>
                  <div className="mt-0.5 font-semibold text-emerald-300">
                    {pubchem.lipinskiViolations} naruszeń · {pubchem.veberCompliant ? 'Veber OK' : 'Veber >limit'}
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">HBD / HBA</div>
                  <div className="mt-0.5 font-semibold text-slate-100">
                    {pubchem.hbd} / {pubchem.hba}
                  </div>
                </div>
                <div className="col-span-2 rounded border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">InChIKey</div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-300">
                    {pubchem.inchiKey || '—'}
                  </div>
                </div>
              </div>

              {pubchem.synonyms.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Synonimy: </span>
                  {pubchem.synonyms.join(' · ')}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Wyszukaj substancję, aby pobrać dane strukturalne z PubChem.
            </div>
          )}
        </section>

        {/* Right 7 cols: ChEMBL Targets & Literature Abstracts */}
        <div className="space-y-6 lg:col-span-7">
          {/* ChEMBL Bioactivity Panel */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h2 className="font-display text-base font-semibold text-slate-100">
                Bioaktywność EBI ChEMBL
              </h2>
              {chembl?.molecule && (
                <a
                  href={chembl.molecule.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 hover:underline"
                >
                  <span>{chembl.molecule.chemblId}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {chembl?.activities && chembl.activities.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 font-mono text-[11px] text-slate-400">
                      <th className="py-1.5 pr-3">Target</th>
                      <th className="py-1.5 pr-3">Organizm</th>
                      <th className="py-1.5 pr-3">Parametr</th>
                      <th className="py-1.5">Wartość</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 tabular-nums">
                    {chembl.activities.map((act, i) => (
                      <tr key={`${act.targetName}-${i}`}>
                        <td className="py-2 pr-3 font-medium text-slate-200">{act.targetName}</td>
                        <td className="py-2 pr-3 text-slate-400">{act.targetOrganism}</td>
                        <td className="py-2 pr-3 font-mono text-sky-300">{act.standardType}</td>
                        <td className="py-2 font-mono text-emerald-300">
                          {act.standardValue} {act.standardUnits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                {chembl?.molecule
                  ? `Zidentyfikowano ${chembl.molecule.chemblId} (${chembl.molecule.prefName}), brak ilościowych testów aktywności dla prostego związku nieorganicznego.`
                  : 'Brak dedykowanych rekordów aktywności ChEMBL dla tego zapytania (częste przy solach nieorganicznych).'}
              </p>
            )}
          </section>

          {/* Literature Abstracts Panel */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <BookOpen className="h-4 w-4 text-sky-400" />
              <h2 className="font-display text-base font-semibold text-slate-100">
                Literatura Naukowa (Europe PMC + OpenAlex)
              </h2>
            </div>

            {papers.length > 0 ? (
              <div className="mt-3 space-y-3">
                {papers.map((paper, idx) => (
                  <article
                    key={`${paper.source}-${paper.id}-${idx}`}
                    className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
                      <span className="text-sky-300">
                        {paper.source} · {paper.year} · {paper.journal}
                      </span>
                      {paper.citations !== null && (
                        <span className="tabular-nums">Cytowania: {paper.citations}</span>
                      )}
                    </div>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-start gap-1 text-xs font-semibold text-slate-100 hover:text-emerald-300"
                    >
                      <span>{paper.title}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    </a>
                    <div className="mt-1 text-[11px] text-slate-400">{paper.authors}</div>
                    {paper.abstract && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">
                        {paper.abstract}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                {loading ? 'Wyszukiwanie publikacji...' : 'Brak wyników literatury dla bieżącego zapytania.'}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
