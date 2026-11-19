import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Droplets,
  Package,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  CONFLICTS,
  CYCLE_OVERVIEW,
  EQUIPMENT,
  PLANTS,
  TIMELINE_EVENTS,
  type Oct17Variant,
  type PlantId,
} from '../data/argusData';
import {
  calculateDli,
  calculateEpsomDosage,
  computeSessionSummary,
  getOct17Measurement,
} from '../utils/calculations';

interface AuditWorkspaceProps {
  selectedPlantId: PlantId;
  onSelectPlant: (id: PlantId) => void;
  onAskAiAboutConflict: (conflictId: string) => void;
}

type AuditSubTab = 'plants' | 'conflicts' | 'timeline' | 'calculators' | 'equipment';

export function AuditWorkspace({
  selectedPlantId,
  onSelectPlant,
  onAskAiAboutConflict,
}: AuditWorkspaceProps) {
  const [subTab, setSubTab] = useState<AuditSubTab>('plants');
  const [oct17Variant, setOct17Variant] = useState<Oct17Variant>('CSV');
  const [conflictFilter, setConflictFilter] = useState<'all' | 'high' | 'medium' | 'info'>('all');

  // Interactive Calculator State (DLI + Epsom Mg correction)
  const [ppfdInput, setPpfdInput] = useState<number>(740);
  const [hoursInput, setHoursInput] = useState<number>(12);
  const [targetMgDelta, setTargetMgDelta] = useState<number>(25);
  const [batchLiters, setBatchLiters] = useState<number>(13);

  const selectedPlant = useMemo(
    () => PLANTS.find((p) => p.id === selectedPlantId) ?? PLANTS[0],
    [selectedPlantId],
  );

  const oct17Summary = useMemo(
    () => computeSessionSummary('2026-10-17', oct17Variant),
    [oct17Variant],
  );
  const oct22Summary = useMemo(() => computeSessionSummary('2026-10-22'), []);

  const dli12 = useMemo(() => calculateDli(ppfdInput, 12), [ppfdInput]);
  const dli18 = useMemo(() => calculateDli(ppfdInput, 18), [ppfdInput]);
  const dliCustom = useMemo(() => calculateDli(ppfdInput, hoursInput), [ppfdInput, hoursInput]);
  const epsomResult = useMemo(
    () => calculateEpsomDosage(targetMgDelta, batchLiters),
    [targetMgDelta, batchLiters],
  );

  const filteredConflicts = useMemo(() => {
    if (conflictFilter === 'all') return CONFLICTS;
    return CONFLICTS.filter((c) => c.severity === conflictFilter);
  }, [conflictFilter]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      {/* Top Executive KPI Strip */}
      <section aria-label="Podsumowanie sesji audytu">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
              Audyt Dowodowy ARGUS Cykl 2 · v1.1
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {CYCLE_OVERVIEW.photoperiodStatus} · Próg odcięcia danych: {CYCLE_OVERVIEW.auditCutoffDate}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-400">Wariant 17.10 (K-OCT17-WEIGHTS):</span>
            <div className="inline-flex rounded-md border border-slate-700 bg-slate-900 p-0.5">
              {(['CSV', 'JSON18'] as const).map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => setOct17Variant(variant)}
                  className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                    oct17Variant === variant
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Suma wag 22.10 (4 donice)</span>
              <Scale className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-slate-100 tabular-nums">
              {oct22Summary.totalBeforeKg.toFixed(2)} → {oct22Summary.totalAfterKg.toFixed(2)} kg
            </div>
            <div className="mt-1 font-mono text-xs text-emerald-400 tabular-nums">
              +{oct22Summary.totalGainKg.toFixed(2)} kg · user_reported
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Średnia arytm. Runoff EC</span>
              <Droplets className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-slate-100 tabular-nums">
              {oct22Summary.meanRunoffEc?.toFixed(3)} mS/cm
            </div>
            <div className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
              19.10: {CYCLE_OVERVIEW.sessionTotals22Oct.meanRunoffEc19Oct.toFixed(2)} (wejście 1.1 / pH 6.4)
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Photone PPFD (22.10 · 40 cm · 90%)</span>
              <Calculator className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-slate-100 tabular-nums">
              700–760 µmol/m²/s
            </div>
            <div className="mt-1 font-mono text-xs text-amber-300 tabular-nums">
              DLI 12h: 30.24–32.83 · 18h: 45.36–49.25
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Suma 17.10 ({oct17Variant} · bez uśredniania)</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-slate-100 tabular-nums">
              {oct17Summary.totalBeforeKg.toFixed(2)} → {oct17Summary.totalAfterKg.toFixed(2)} kg
            </div>
            <div className="mt-1 font-mono text-xs text-amber-300 tabular-nums">
              +{oct17Summary.totalGainKg.toFixed(2)} kg · K-OCT17-WEIGHTS
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {(
          [
            { id: 'plants', label: 'Rośliny i Pomiary (4)' },
            { id: 'conflicts', label: `Rejestr Konfliktów (${CONFLICTS.length})` },
            { id: 'timeline', label: 'Oś Czasu (28.08–22.10)' },
            { id: 'calculators', label: 'Kalkulatory DLI i Ca:Mg' },
            { id: 'equipment', label: 'Sprzęt i Wsad 13 L' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: Plants & Raw Measurements Matrix */}
      {subTab === 'plants' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLANTS.map((plant) => {
              const isSelected = plant.id === selectedPlant.id;
              const oct22 = plant.measurements.find((m) => m.date === '2026-10-22');
              const oct17 = getOct17Measurement(plant, oct17Variant);
              return (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => onSelectPlant(plant.id)}
                  className={`flex flex-col rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-500/70 bg-slate-900'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {plant.id} · {plant.potPosition}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-medium ${
                        plant.healthTier === 'critical'
                          ? 'text-amber-300'
                          : plant.healthTier === 'watch'
                            ? 'text-sky-300'
                            : 'text-emerald-300'
                      }`}
                    >
                      {plant.healthTier === 'critical'
                        ? 'KRYTYCZNA OBSERWACJA'
                        : plant.healthTier === 'watch'
                          ? 'GĘSTA KORONA'
                          : 'STABILNA'}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-sm font-semibold text-slate-100">
                    {plant.cultivar}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">
                    {plant.statusSummary}
                  </p>
                  <div className="mt-3 grid w-full grid-cols-2 gap-2 border-t border-slate-800 pt-2.5 font-mono text-[11px] tabular-nums">
                    <div>
                      <div className="text-slate-500">22.10 Waga</div>
                      <div className="text-slate-200">
                        {oct22?.beforeKg?.toFixed(2)}→{oct22?.afterKg?.toFixed(2)} kg
                      </div>
                      <div className="text-emerald-400">+{oct22?.deltaKg?.toFixed(3)} kg</div>
                    </div>
                    <div>
                      <div className="text-slate-500">22.10 Runoff</div>
                      <div className="text-slate-200">EC {oct22?.runoffEc?.toFixed(3)}</div>
                      <div className="text-slate-400">pH {oct22?.runoffPh?.toFixed(3)}</div>
                    </div>
                  </div>
                  {oct17 && (
                    <div className="mt-2 w-full font-mono text-[11px] text-amber-300/90 tabular-nums">
                      17.10 ({oct17Variant}): {oct17.beforeKg}→{oct17.afterKg} kg (Δ+{oct17.deltaKg})
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Plant Full Measurement Ledger */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-100">
                  {selectedPlant.displayName} — Historia pomiarów i protokół epistemiczny
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Defoliacja: {selectedPlant.defoliationHistory}
                  {selectedPlant.microscopyNote ? ` · Mikroskop: ${selectedPlant.microscopyNote}` : ''}
                </p>
              </div>
              <div className="font-mono text-xs text-amber-300">
                Konflikty: {selectedPlant.conflictIds.join(' · ')}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[740px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 font-mono text-[11px] text-slate-400">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Sesja</th>
                    <th className="py-2 pr-3">Przed (kg)</th>
                    <th className="py-2 pr-3">Po (kg)</th>
                    <th className="py-2 pr-3">Przyrost (kg)</th>
                    <th className="py-2 pr-3">Woda (L)</th>
                    <th className="py-2 pr-3">Runoff EC / pH</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Uwagi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 tabular-nums">
                  {selectedPlant.measurements.map((m, idx) => (
                    <tr
                      key={`${m.date}-${m.session}-${idx}`}
                      className={
                        m.sourceVariant && m.sourceVariant !== oct17Variant
                          ? 'opacity-45'
                          : 'hover:bg-slate-800/30'
                      }
                    >
                      <td className="py-2.5 pr-3 font-mono text-slate-300">{m.date}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-200">{m.session}</td>
                      <td className="py-2.5 pr-3 font-mono text-slate-200">
                        {m.beforeKg !== null ? m.beforeKg.toFixed(3) : '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-200">
                        {m.afterKg !== null ? m.afterKg.toFixed(3) : '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-emerald-400">
                        {m.deltaKg !== null ? `+${m.deltaKg.toFixed(3)}` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-sky-300">
                        {m.waterL !== null ? `${m.waterL.toFixed(1)} L` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-200">
                        {m.runoffEc !== null || m.runoffPh !== null
                          ? `${m.runoffEc?.toFixed(3) ?? '—'} / ${m.runoffPh?.toFixed(3) ?? '—'}`
                          : '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-amber-300">
                        {m.epistemicStatus}
                      </td>
                      <td className="py-2.5 text-slate-400">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Conflict Ledger (K-*) */}
      {subTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Aneks B audytu v1.1: wszystkie {CONFLICTS.length} nazwanych konfliktów źródłowych zachowanych bez nadpisywania.
            </p>
            <div className="flex gap-1.5">
              {(['all', 'high', 'medium', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setConflictFilter(sev)}
                  className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                    conflictFilter === sev
                      ? 'bg-amber-600/25 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {sev === 'all' ? 'Wszystkie' : sev.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredConflicts.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-amber-300">
                      {c.id} · {c.status}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {c.affectedEntities.join(' / ')}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-sm font-semibold text-slate-100">
                    {c.title}
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
                      <div className="font-mono text-[10px] text-slate-400">{c.claimA.label}</div>
                      <div className="mt-1 text-slate-200">{c.claimA.value}</div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
                      <div className="font-mono text-[10px] text-slate-400">{c.claimB.label}</div>
                      <div className="mt-1 text-slate-200">{c.claimB.value}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
                  <span className="text-[11px] text-emerald-300/90">
                    Reguła: {c.epistemicRule}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAskAiAboutConflict(c.id)}
                    className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                  >
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    <span>Analizuj w AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Chronological Timeline */}
      {subTab === 'timeline' && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <CalendarClock className="h-4 w-4 text-emerald-400" />
            <span>Chronologia Cyklu 2 (28.08 – 22.10.2026)</span>
          </div>
          <div className="space-y-3">
            {TIMELINE_EVENTS.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col gap-2 rounded-md border border-slate-800/90 bg-slate-950/70 p-3.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="font-semibold text-emerald-400">{ev.date}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{ev.dayLabel}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-amber-300">{ev.epistemicStatus}</span>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-slate-100">{ev.title}</h3>
                  <p className="text-xs text-slate-400">{ev.summary}</p>
                </div>
                {ev.conflictId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubTab('conflicts');
                      setConflictFilter('all');
                    }}
                    className="shrink-0 self-start rounded border border-amber-700/50 bg-amber-950/40 px-2.5 py-1 font-mono text-[11px] text-amber-300 hover:bg-amber-900/40"
                  >
                    {ev.conflictId}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Deterministic Calculators (DLI + Epsom Mg Stoichiometry) */}
      {subTab === 'calculators' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* DLI Calculator */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Kalkulator DLI (Daily Light Integral) — Audyt Photone 22.10
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Konflikt K-OCT19-SCHEDULE: przełączenie na 12/12 jest nieudokumentowane, dlatego audyt podaje osobno hipotezy 12 h i 18 h.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-slate-300">Zmierzone PPFD (µmol/m²/s)</span>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={ppfdInput}
                  onChange={(e) => setPpfdInput(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-300">Własny fotoperiod (h/dobę)</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={hoursInput}
                  onChange={(e) => setHoursInput(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 font-mono tabular-nums">
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] text-slate-400">Hipotetycznie 12 h</div>
                <div className="mt-1 text-lg font-semibold text-amber-300">{dli12.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500">mol/m²/d</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] text-slate-400">Hipotetycznie 18 h</div>
                <div className="mt-1 text-lg font-semibold text-sky-300">{dli18.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500">mol/m²/d</div>
              </div>
              <div className="rounded border border-emerald-700/40 bg-emerald-950/30 p-3">
                <div className="text-[11px] text-emerald-300">Twój ({hoursInput} h)</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">
                  {dliCustom.toFixed(2)}
                </div>
                <div className="text-[10px] text-emerald-400/70">mol/m²/d</div>
              </div>
            </div>
          </div>

          {/* Ca:Mg Epsom Salt Calculator */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Stechiometria Ca:Mg i Sól Epsom (Weryfikacja K-SOFTWARE-EXECUTION)
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Baza wodociągów Emmerich: Ca 76.5 mg/L · Mg 9.7 mg/L (stosunek 7.89:1). Sól Epsom (MgSO₄·7H₂O) zawiera ~9.86% Mg.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-slate-300">Docelowe podbicie Mg (+mg/L)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={targetMgDelta}
                  onChange={(e) => setTargetMgDelta(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-300">Objętość zbiornika (L)</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={batchLiters}
                  onChange={(e) => setBatchLiters(Number(e.target.value) || 1)}
                  className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 font-mono tabular-nums">
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] text-slate-400">Dawka na 1 L</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">
                  {epsomResult.gramsPerLiter.toFixed(3)} g/L
                </div>
                <div className="text-[10px] text-slate-500">MgSO₄·7H₂O</div>
              </div>
              <div className="rounded border border-emerald-700/40 bg-emerald-950/30 p-3">
                <div className="text-[11px] text-emerald-300">Wsad ({batchLiters} L)</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">
                  {epsomResult.totalGrams.toFixed(2)} g
                </div>
                <div className="text-[10px] text-emerald-400/70">gramy (nie mg!)</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <div className="text-[11px] text-slate-400">Stosunek Ca : Mg</div>
                <div className="mt-1 text-lg font-semibold text-sky-300">
                  {epsomResult.caToMgRatioWithEmmerich}:1
                </div>
                <div className="text-[10px] text-slate-500">
                  Mg={epsomResult.resultingMgMgLWithEmmerich} mg/L
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Equipment & 13L Batch Breakdown */}
      {subTab === 'equipment' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Package className="h-4 w-4 text-emerald-400" />
              <span>Inwentarz Techniczny Cyklu 2</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {EQUIPMENT.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex items-center justify-between font-mono text-[11px] text-emerald-400">
                    <span>{item.category}</span>
                    <span className="text-slate-400">{item.epistemicStatus}</span>
                  </div>
                  <h3 className="mt-1 font-display text-sm font-semibold text-slate-100">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">{item.spec}</p>
                  <div className="mt-2 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Wsad 13 L z 22.10.2026
            </h3>
            <div className="mt-3 rounded border border-emerald-800/50 bg-emerald-950/30 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Potwierdzona baza (user_reported)</span>
              </div>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-200 tabular-nums">
                <li>• {CYCLE_OVERVIEW.mix22Oct13L.confirmedBase.tapWaterL} L woda kranowa Emmerich</li>
                <li>• {CYCLE_OVERVIEW.mix22Oct13L.confirmedBase.distilledWaterL} L woda destylowana</li>
                <li>• {CYCLE_OVERVIEW.mix22Oct13L.confirmedBase.shogunSiliconMl} ml Shogun Silicon</li>
                <li className="text-emerald-300">
                  → EC {CYCLE_OVERVIEW.mix22Oct13L.confirmedBase.measuredEc} mS/cm · pH{' '}
                  {CYCLE_OVERVIEW.mix22Oct13L.confirmedBase.measuredPh}
                </li>
              </ul>
            </div>

            <div className="mt-3 rounded border border-amber-800/50 bg-amber-950/30 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Dodatki oznaczone jako PLANNED</span>
              </div>
              <ul className="mt-2 space-y-1.5 font-mono text-[11px] text-slate-300 tabular-nums">
                {CYCLE_OVERVIEW.mix22Oct13L.plannedAdditives.map((add) => (
                  <li key={add.name}>
                    • {add.name}: {add.dose}
                  </li>
                ))}
                <li className="pt-1 text-amber-200">
                  Cel: EC {CYCLE_OVERVIEW.mix22Oct13L.targetEc} · pH {CYCLE_OVERVIEW.mix22Oct13L.targetPh}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
