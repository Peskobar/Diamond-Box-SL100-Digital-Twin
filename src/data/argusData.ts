export type EpistemicStatus =
  | 'user_reported'
  | 'document_reported'
  | 'derived'
  | 'planned'
  | 'unverified'
  | 'conflict_unresolved'
  | 'chronology_preserved_operator_correction';

export type Oct17Variant = 'CSV' | 'JSON18';

export type PlantId = 'KB-D' | 'KB-M' | 'MELO-D' | 'MELO-M';

export interface PlantMeasurementPoint {
  date: string;
  session: string;
  beforeKg: number | null;
  afterKg: number | null;
  deltaKg: number | null;
  waterL: number | null;
  runoffPh: number | null;
  runoffEc: number | null;
  sourceVariant?: Oct17Variant;
  epistemicStatus: EpistemicStatus;
  notes: string;
}

export interface PlantProfile {
  id: PlantId;
  displayName: string;
  cultivar: string;
  breeder: string;
  seedBatch: string;
  potPosition: 'NW' | 'NE' | 'SW' | 'SE';
  potLabel: string;
  potVolumeL: number;
  statusSummary: string;
  healthTier: 'good' | 'watch' | 'critical';
  defoliationHistory: string;
  microscopyNote: string | null;
  conflictIds: string[];
  /** Relative 3D coords inside 1.0 x 1.0 m tent footprint (x, z in meters from center) */
  position3D: [number, number];
  /** Structural canopy scale & posture for procedural 3D generator */
  canopyProfile: {
    heightM: number;
    radiusM: number;
    droopFactor: number;
    leafDensity: number;
    branchCount: number;
    hueShift: number;
  };
  measurements: PlantMeasurementPoint[];
}

export interface AuditConflict {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'info';
  status: 'unresolved' | 'chronology_preserved_operator_correction';
  affectedEntities: string[];
  claimA: { label: string; value: string };
  claimB: { label: string; value: string };
  epistemicRule: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  dayLabel: string;
  phase: 'start' | 'veg' | 'transplant' | 'training' | 'diagnostics' | 'ppfd_audit';
  title: string;
  summary: string;
  epistemicStatus: EpistemicStatus;
  conflictId?: string;
}

export interface EquipmentItem {
  id: string;
  category: 'Tent' | 'Lighting' | 'Ventilation' | 'Climate' | 'Sensors' | 'Nutrients & Water';
  name: string;
  spec: string;
  status: string;
  epistemicStatus: EpistemicStatus;
  conflictId?: string;
}

export interface AttachedAsset {
  id: string;
  title: string;
  subtitle: string;
  publicUrl: string;
  relativePath: string;
  fileType: 'image' | 'pdf';
  provenanceNote: string;
}

export const CYCLE_OVERVIEW = {
  cycleName: 'ARGUS Cykl 2',
  auditVersion: 'v1.1 (2026-10-23)',
  tentModel: 'DiamondBox Silver Line SL100',
  tentDimensionsCm: { width: 100, depth: 100, height: 200 },
  sowingDate: '2026-08-28',
  transplantDate: '2026-09-19',
  auditCutoffDate: '2026-10-22',
  photoperiodStatus: 'Ostatnio potwierdzony VEG (18/6); flip 12/12 nieudokumentowany',
  ppfdAudit22Oct: {
    fixtures: '4 × LUMii SWITCH BLADE 150 W',
    heightCm: 40,
    dimmerPct: 90,
    switchMode: 'BLOOM (tylko na czas pomiaru Photone PPFD)',
    sensorProfile: 'Photone LED Full Spectrum + Red',
    cornersPpfd: [700, 740] as [number, number],
    centerPpfd: [740, 760] as [number, number],
    wallOpenTentPpfd: 500,
    note: 'Moc z gniazdka niezmierzona watomierzem — 90% pokrętła nie równa się liniowo 540 W.',
  },
  mix22Oct13L: {
    confirmedBase: {
      tapWaterL: 10,
      distilledWaterL: 3,
      shogunSiliconMl: 13,
      measuredEc: 0.4,
      measuredPh: 7.8,
      epistemicStatus: 'user_reported' as EpistemicStatus,
    },
    plannedAdditives: [
      { name: 'Plagron Terra Bloom', dose: '13–26 ml', note: 'planowane, niepotwierdzone podanie' },
      { name: 'Shogun Katana Roots', dose: '2.6 ml', note: 'planowane' },
      { name: 'Plagron Pure Zym / Zenzym', dose: '32.5 ml', note: 'planowane' },
    ],
    targetEc: '1.1–1.2 mS/cm',
    targetPh: '6.3–6.5',
    emmerichTapBaseline: {
      caMgL: 76.5,
      mgMgL: 9.7,
      caToMgRatio: 7.89,
      note: 'Historyczny raport wodociągów Emmerich (brak badania próbki z kranu z 22.10).',
    },
  },
  sessionTotals22Oct: {
    totalBeforeKg: 16.2,
    totalAfterKg: 26.4,
    totalGainKg: 10.2,
    meanRunoffEc22Oct: 1.775,
    meanRunoffEc19Oct: 1.95,
    input19OctEc: 1.1,
    input19OctPh: 6.4,
  },
};

export const PLANTS: PlantProfile[] = [
  {
    id: 'KB-D',
    displayName: "KB-D · Duży King's Banner",
    cultivar: "King's Banner (fem)",
    breeder: 'Pure Instinto',
    seedBatch: '2× wysiane 28.08',
    potPosition: 'NW',
    potLabel: 'Hero 19 L (tylny lewy)',
    potVolumeL: 19,
    statusSummary: 'Stabilny wigor, gruba łodyga główna po LST, równomierne przesychanie bryły.',
    healthTier: 'good',
    defoliationHistory: 'Umiarkowana defoliacja porządkowa; pełny wierzchołek roboczy.',
    microscopyNote: null,
    conflictIds: ['K-IDENTITY-LEGACY', 'K-OCT17-WEIGHTS'],
    position3D: [-0.25, -0.25],
    canopyProfile: {
      heightM: 0.56,
      radiusM: 0.24,
      droopFactor: 0.08,
      leafDensity: 1.0,
      branchCount: 8,
      hueShift: 0,
    },
    measurements: [
      {
        date: '2026-10-04',
        session: 'Podlewanie',
        beforeKg: 4.0,
        afterKg: 5.3,
        deltaKg: 1.3,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Pierwsza udokumentowana sesja wagowa przed/po.',
      },
      {
        date: '2026-10-13',
        session: 'Podlewanie',
        beforeKg: 4.6,
        afterKg: 5.85,
        deltaKg: 1.25,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Stabilny przyrost masy po podlaniu.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (CSV)',
        beforeKg: 3.8,
        afterKg: 6.4,
        deltaKg: 2.6,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'CSV',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Konflikt K-OCT17-WEIGHTS: CSV podaje wagę przed 3.8 kg.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (JSON18)',
        beforeKg: 4.0,
        afterKg: 6.4,
        deltaKg: 2.4,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'JSON18',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Konflikt K-OCT17-WEIGHTS: JSON18 podaje wagę przed 4.0 kg.',
      },
      {
        date: '2026-10-19',
        session: 'Runoff check',
        beforeKg: null,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: 6.5,
        runoffEc: 2.0,
        epistemicStatus: 'document_reported',
        notes: 'Wejście 1.1 mS/cm / pH 6.4; odpływ pH 6.5, EC 2.0.',
      },
      {
        date: '2026-10-21',
        session: 'Ważenie kontrolne',
        beforeKg: 4.43,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'user_reported',
        notes: 'Prawidłowe przesychanie przed sesją 22.10.',
      },
      {
        date: '2026-10-22',
        session: 'Podlewanie + Runoff',
        beforeKg: 3.8,
        afterKg: 6.47,
        deltaKg: 2.67,
        waterL: null,
        runoffPh: 6.5,
        runoffEc: 2.0,
        epistemicStatus: 'user_reported',
        notes: 'Przyrost +2.670 kg, najwyższy EC odpływu w tej sesji (2.000).',
      },
    ],
  },
  {
    id: 'KB-M',
    displayName: "KB-M · Mały King's Banner",
    cultivar: "King's Banner (fem)",
    breeder: 'Pure Instinto',
    seedBatch: '2× wysiane 28.08',
    potPosition: 'NE',
    potLabel: 'Hero 19 L (tylny prawy)',
    potVolumeL: 19,
    statusSummary: 'Niższa, gęsta korona po LST; 22.10 największe przyjęcie masy (+2.880 kg) przy umiarkowanym EC odpływu.',
    healthTier: 'good',
    defoliationHistory: 'Prześwietlanie środka korony zgodnie z planem LST.',
    microscopyNote: null,
    conflictIds: ['K-IDENTITY-LEGACY', 'K-OCT17-WEIGHTS'],
    position3D: [0.25, -0.25],
    canopyProfile: {
      heightM: 0.48,
      radiusM: 0.22,
      droopFactor: 0.1,
      leafDensity: 0.94,
      branchCount: 7,
      hueShift: 0.02,
    },
    measurements: [
      {
        date: '2026-10-04',
        session: 'Podlewanie',
        beforeKg: 4.0,
        afterKg: 5.2,
        deltaKg: 1.2,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Zbliżona retencja do KB-D.',
      },
      {
        date: '2026-10-13',
        session: 'Ważenie',
        beforeKg: 5.3,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Brak podlewania w tym zapisie.',
      },
      {
        date: '2026-10-14',
        session: 'Podlewanie',
        beforeKg: 4.4,
        afterKg: null,
        deltaKg: null,
        waterL: 1.2,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Podano 1.2 L pożywki (nie utożsamiać L z Δkg).',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (CSV)',
        beforeKg: 3.6,
        afterKg: 6.0,
        deltaKg: 2.4,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'CSV',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Konflikt K-OCT17-WEIGHTS: CSV podaje wagę przed 3.6 kg.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (JSON18)',
        beforeKg: 3.8,
        afterKg: 6.0,
        deltaKg: 2.2,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'JSON18',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Konflikt K-OCT17-WEIGHTS: JSON18 podaje wagę przed 3.8 kg.',
      },
      {
        date: '2026-10-19',
        session: 'Runoff check',
        beforeKg: null,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: 6.5,
        runoffEc: 1.8,
        epistemicStatus: 'document_reported',
        notes: 'Najniższe EC odpływu w grupie z 19.10.',
      },
      {
        date: '2026-10-21',
        session: 'Ważenie kontrolne',
        beforeKg: 5.0,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'user_reported',
        notes: 'Wolniejsze przesychanie przed 22.10.',
      },
      {
        date: '2026-10-22',
        session: 'Podlewanie + Runoff',
        beforeKg: 4.3,
        afterKg: 7.18,
        deltaKg: 2.88,
        waterL: null,
        runoffPh: 6.5,
        runoffEc: 1.7,
        epistemicStatus: 'user_reported',
        notes: 'Najwyższa masa końcowa 7.180 kg (+2.880 kg), EC 1.700.',
      },
    ],
  },
  {
    id: 'MELO-D',
    displayName: 'MELO-D · Duży Kushmallow',
    cultivar: 'Kushmallow / „Melo” (fem)',
    breeder: 'Pure Instinto',
    seedBatch: '2× wysiane 28.08',
    potPosition: 'SW',
    potLabel: 'Hero 19 L (przedni lewy)',
    potVolumeL: 19,
    statusSummary: 'Największa biomasa liściowa; w analizie zdjęć z 07.10 silne zagęszczenie szczytów (10–12 końcówek).',
    healthTier: 'watch',
    defoliationHistory: 'Silna masa liściowa — zalecana selektywna defoliacja bez przebudowy szkieletu LST.',
    microscopyNote: null,
    conflictIds: ['K-IDENTITY-LEGACY', 'K-WATERMELON', 'K-OCT17-WEIGHTS'],
    position3D: [-0.25, 0.25],
    canopyProfile: {
      heightM: 0.59,
      radiusM: 0.26,
      droopFactor: 0.12,
      leafDensity: 1.15,
      branchCount: 10,
      hueShift: -0.02,
    },
    measurements: [
      {
        date: '2026-10-13',
        session: 'Podlewanie',
        beforeKg: 4.7,
        afterKg: 6.0,
        deltaKg: 1.3,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Zbliżona masa do KB-D.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (CSV)',
        beforeKg: 4.0,
        afterKg: 6.4,
        deltaKg: 2.4,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'CSV',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Spójne przed 4.0 kg w CSV i JSON18.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (JSON18)',
        beforeKg: 4.0,
        afterKg: 6.4,
        deltaKg: 2.4,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'JSON18',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Spójne przed 4.0 kg w CSV i JSON18.',
      },
      {
        date: '2026-10-19',
        session: 'Runoff check',
        beforeKg: null,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: 6.5,
        runoffEc: 2.1,
        epistemicStatus: 'document_reported',
        notes: 'Najwyższe EC odpływu 19.10 (2.1 mS/cm).',
      },
      {
        date: '2026-10-21',
        session: 'Ważenie kontrolne',
        beforeKg: 4.74,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'user_reported',
        notes: 'Umiarkowane tempo poboru wody.',
      },
      {
        date: '2026-10-22',
        session: 'Podlewanie + Runoff',
        beforeKg: 4.1,
        afterKg: 6.66,
        deltaKg: 2.56,
        waterL: null,
        runoffPh: 6.6,
        runoffEc: 1.8,
        epistemicStatus: 'user_reported',
        notes: 'Spadek EC odpływu z 2.1 do 1.8 przy pH 6.600.',
      },
    ],
  },
  {
    id: 'MELO-M',
    displayName: 'MELO-M · Mały, słaby Melo',
    cultivar: 'Kushmallow / „Melo” (fem)',
    breeder: 'Pure Instinto',
    seedBatch: '2× wysiane 28.08',
    potPosition: 'SE',
    potLabel: 'Hero 19 L (przedni prawy)',
    potVolumeL: 19,
    statusSummary:
      'Przewlekłe oklapnięcie / zwijanie liści i przestoje dryback (09–19.10); po mocnej defoliacji i podejrzeniu „białych kropek” pod mikroskopem.',
    healthTier: 'critical',
    defoliationHistory: 'Mocna defoliacja po stresie i spowolnionym poborze (konflikt K-OCT19-DEFOLIATION).',
    microscopyNote: '18.10 (lub 19.10 — patrz K-MICRO-DATE): „białe kropki” pod mikroskopem — brak jednoznacznej identyfikacji patogenu/szkodnika.',
    conflictIds: [
      'K-IDENTITY-LEGACY',
      'K-OCT17-WEIGHTS',
      'K-MICRO-DATE',
      'K-OCT19-STATUS',
      'K-OCT19-DEFOLIATION',
    ],
    position3D: [0.25, 0.25],
    canopyProfile: {
      heightM: 0.41,
      radiusM: 0.19,
      droopFactor: 0.34,
      leafDensity: 0.62,
      branchCount: 6,
      hueShift: -0.05,
    },
    measurements: [
      {
        date: '2026-10-13',
        session: 'Ważenie',
        beforeKg: 5.4,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Ciężka donica mimo małej masy zielonej — sygnał wolnej transpiracji.',
      },
      {
        date: '2026-10-14',
        session: 'Podlewanie',
        beforeKg: 4.4,
        afterKg: null,
        deltaKg: null,
        waterL: 1.3,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'document_reported',
        notes: 'Podano 1.3 L.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (CSV)',
        beforeKg: 4.0,
        afterKg: 6.0,
        deltaKg: 2.0,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'CSV',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Konflikt K-OCT17-WEIGHTS: CSV podaje wagę przed 4.0 kg.',
      },
      {
        date: '2026-10-17',
        session: 'Podlewanie (JSON18)',
        beforeKg: 3.6,
        afterKg: 6.0,
        deltaKg: 2.4,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        sourceVariant: 'JSON18',
        epistemicStatus: 'conflict_unresolved',
        notes: 'Konflikt K-OCT17-WEIGHTS: JSON18 podaje wagę przed 3.6 kg (zamiana wierszy vs KB-M?).',
      },
      {
        date: '2026-10-19',
        session: 'Runoff check',
        beforeKg: null,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: 6.6,
        runoffEc: 1.9,
        epistemicStatus: 'document_reported',
        notes: 'EC 1.9, pH 6.6; sprzeczne raporty poprawy kondycji.',
      },
      {
        date: '2026-10-21',
        session: 'Ważenie kontrolne',
        beforeKg: 4.79,
        afterKg: null,
        deltaKg: null,
        waterL: null,
        runoffPh: null,
        runoffEc: null,
        epistemicStatus: 'unverified',
        notes: 'Oznaczone jako unverified_transcription (4.790 kg).',
      },
      {
        date: '2026-10-22',
        session: 'Podlewanie + Runoff',
        beforeKg: 4.0,
        afterKg: 6.09,
        deltaKg: 2.09,
        waterL: null,
        runoffPh: 6.5,
        runoffEc: 1.6,
        epistemicStatus: 'user_reported',
        notes: 'Najniższy przyrost (+2.090 kg) i najniższe EC odpływu (1.600) w grupie.',
      },
    ],
  },
];

export const CONFLICTS: AuditConflict[] = [
  {
    id: 'K-C2-D1',
    title: 'Definicja dnia D1 (01.09 vs 29.08)',
    severity: 'high',
    status: 'unresolved',
    affectedEntities: ['Cały Cykl 2'],
    claimA: { label: 'Dziennik wschodów', value: 'D1 = 01.09.2026 (pierwsze 3 wschody)' },
    claimB: { label: 'Późniejszy licznik dni', value: 'D1 = 29.08.2026 (dzień po wysiewie 28.08)' },
    epistemicRule: 'Nie przeliczać automatycznie wieku roślin bez podania bazowego punktu D1.',
  },
  {
    id: 'K-IDENTITY-LEGACY',
    title: 'Mapowanie dawnych etykiet doniczek',
    severity: 'high',
    status: 'unresolved',
    affectedEntities: ['KB-D', 'KB-M', 'MELO-D', 'MELO-M'],
    claimA: { label: 'Etykiety wczesne', value: 'WM-D/M, KM-1/2, Melo pierwszy/drugi/ze stelażem, Banner z szeroką plakietką' },
    claimB: { label: 'Aktualne ID (od X)', value: 'KB-D, KB-M, MELO-D, MELO-M' },
    epistemicRule: 'ZAKAZ mapowania 1:1 wczesnych nazw na późniejsze doniczki bez nowej weryfikacji etykiet.',
  },
  {
    id: 'K-WATERMELON',
    title: 'Los 2 nasion Watermelon Zkittlez',
    severity: 'medium',
    status: 'unresolved',
    affectedEntities: ['MELO-D', 'MELO-M'],
    claimA: { label: 'Wysiew 28.08', value: '2× Watermelon Zkittlez, 2× King’s Banner, 2× Kushmallow (6 szt.)' },
    claimB: { label: 'Obsada końcowa 4 donic', value: 'Potwierdzono 2× KB i 2× MELO — los WM niejednoznacznie udokumentowany' },
    epistemicRule: 'Traktować obecność genetyki WM wśród „Melo” jako nieudowodnioną hipotezę.',
  },
  {
    id: 'K-SEP23-RECIPE',
    title: 'Rozbieżność receptury pożywki z 23.09',
    severity: 'medium',
    status: 'unresolved',
    affectedEntities: ['Nutrients & Water'],
    claimA: { label: 'Zapis A', value: 'Inne proporcje Terra Grow / Katana / Silicon' },
    claimB: { label: 'Zapis B', value: 'Alternatywna dawka w notatce równoległej' },
    epistemicRule: 'Zachować oba warianty historyczne bez uśredniania stężeń.',
  },
  {
    id: 'K-MICRO-DATE',
    title: 'Data mikroskopowania „białych kropek” na MELO-M',
    severity: 'medium',
    status: 'unresolved',
    affectedEntities: ['MELO-M'],
    claimA: { label: 'Źródło A', value: '18.10.2026' },
    claimB: { label: 'Źródło B', value: '19.10.2026' },
    epistemicRule: 'Nierozstrzygnięta dokładna data inspekcji; brak pewnej identyfikacji obiektu.',
  },
  {
    id: 'K-OCT11-BATCH',
    title: 'Objętość i skład wsadu z 11.10',
    severity: 'medium',
    status: 'unresolved',
    affectedEntities: ['Nutrients & Water'],
    claimA: { label: 'Wersja robocza', value: 'Rozbieżna objętość wody w mieszance' },
    claimB: { label: 'Wersja podsumowania', value: 'Różnica w bilansie podania na 4 doniczki' },
    epistemicRule: 'Oznaczyć jako niejednorodny rekord wsadu.',
  },
  {
    id: 'K-OCT17-WEIGHTS',
    title: 'Wagi przed podlaniem 17.10 (CSV vs JSON18)',
    severity: 'high',
    status: 'unresolved',
    affectedEntities: ['KB-D', 'KB-M', 'MELO-D', 'MELO-M'],
    claimA: { label: 'CSV (17.10)', value: 'KB-D: 3.8 | KB-M: 3.6 | MELO-D: 4.0 | MELO-M: 4.0 kg' },
    claimB: { label: 'JSON18 (17.10)', value: 'KB-D: 4.0 | KB-M: 3.8 | MELO-D: 4.0 | MELO-M: 3.6 kg' },
    epistemicRule: 'ZAKAZ uśredniania! Prezentuj wariant CSV lub JSON18 jawnie przez przełącznik.',
  },
  {
    id: 'K-FAN-MODEL',
    title: 'Wentylator wyciągowy przed 12–14.09',
    severity: 'info',
    status: 'unresolved',
    affectedEntities: ['Ventilation'],
    claimA: { label: 'Wczesna konfiguracja', value: 'Prima Klima wyciąg (pierwotny montaż)' },
    claimB: { label: 'Wymiana ~12–14.09', value: 'VENTS VK125 Ø125 (obecnie aktywny, potencjometr ~50%)' },
    epistemicRule: 'Rozróżniać okres przed i po wymianie wentylatora.',
  },
  {
    id: 'K-CONTROLLER',
    title: 'Sterownik klimatu i termostat wentylatora',
    severity: 'medium',
    status: 'chronology_preserved_operator_correction',
    affectedEntities: ['Ventilation', 'Lighting'],
    claimA: { label: 'Stan do 29.09', value: 'Podpięty termostat wentylatora wyciągowego' },
    claimB: { label: 'Korekta operatora (od 29.09)', value: 'Termostat odłączony; wyciąg na ręcznym potencjometrze ~50%, XLED do lamp' },
    epistemicRule: 'Chronologia zachowana z korektą operatora (chronology_preserved_operator_correction).',
  },
  {
    id: 'K-LAMP-PURCHASE',
    title: 'Historia zakupu i kolejności montażu 4× LUMii Switch Blade',
    severity: 'info',
    status: 'unresolved',
    affectedEntities: ['Lighting'],
    claimA: { label: 'Liczba aktywna', value: '4 × 150 W (nominalnie 600 W)' },
    claimB: { label: 'Różne daty włączenia modułów', value: 'Stopniowe dokładanie w trakcie VEG' },
    epistemicRule: 'PPFD z 22.10 dotyczy układu wszystkich 4 lamp na 40 cm / 90%.',
  },
  {
    id: 'K-SOIL',
    title: 'Szczegóły mieszanki podłoża w donicach 19 L',
    severity: 'info',
    status: 'unresolved',
    affectedEntities: ['KB-D', 'KB-M', 'MELO-D', 'MELO-M'],
    claimA: { label: 'Przesadzenie 19.09', value: '4 × 19 L Hero materiałowe + BioTabs Mycotrex' },
    claimB: { label: 'Proporcje medium bazowego', value: 'Brak jednoznacznej specyfikacji procentowej perlitu/ziemi' },
    epistemicRule: 'Nie zakładać stałej pojemności wodnej bez ważenia rzeczywistego.',
  },
  {
    id: 'K-OCT19-STATUS',
    title: 'Ocena stanu roślin na dzień 19.10',
    severity: 'high',
    status: 'chronology_preserved_operator_correction',
    affectedEntities: ['MELO-M'],
    claimA: { label: 'Pierwotna notatka', value: 'Wzmianka o stabilizacji po zabiegach' },
    claimB: { label: 'Korekta operatora', value: 'Utrzymujące się oklapnięcie / słaby dryback u MELO-M' },
    epistemicRule: 'Zachować oba wpisy z oznaczeniem korekty operatora.',
  },
  {
    id: 'K-OCT19-DEFOLIATION',
    title: 'Zakres defoliacji 19.10 na MELO-M',
    severity: 'medium',
    status: 'unresolved',
    affectedEntities: ['MELO-M'],
    claimA: { label: 'Opis A', value: 'Mocne oczyszczenie dolnych/chorych liści' },
    claimB: { label: 'Opis B', value: 'Niepełny bilans liczby usuniętych liści vs reakcja stresowa' },
    epistemicRule: 'Wiązać obniżony pobór wody 22.10 (+2.090 kg) m.in. ze zredukowaną powierzchnią transpiracji.',
  },
  {
    id: 'K-OCT19-SCHEDULE',
    title: 'Status harmonogramu fotoperiodu od 19.10',
    severity: 'high',
    status: 'unresolved',
    affectedEntities: ['Lighting', 'Cały Cykl 2'],
    claimA: { label: 'Stan potwierdzony', value: 'Ostatnio potwierdzony tryb VEG (18/6)' },
    claimB: { label: 'Wątpliwość audytowa', value: 'Przełączenie na 12/12 (flip) pozostaje NIEUDOKUMENTOWANE' },
    epistemicRule: 'DLI liczyć wyłącznie warunkowo dla wariantów 12h i 18h jako hipotezy.',
  },
  {
    id: 'K-SOFTWARE-EXECUTION',
    title: 'Błędne obliczenie Ca:Mg / Epsom w poprzednim skrypcie audytu',
    severity: 'high',
    status: 'unresolved',
    affectedEntities: ['Nutrients & Water'],
    claimA: { label: 'Błąd starego wyliczenia', value: 'Pomylenie jednostek mg/L z g/L przy przeliczaniu soli Epsom (~9.8% Mg)' },
    claimB: { label: 'Poprawna stechiometria', value: 'Docelowe +25 mg/L Mg wymaga 0.255 g MgSO₄·7H₂O na 1 L (3.32 g na 13 L)' },
    epistemicRule: 'Każdą korektę Mg weryfikować przelicznikiem 1000 mg = 1 g i udziałem masowym 9.86% Mg.',
  },
];

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'T-0828',
    date: '2026-08-28',
    dayLabel: 'Wysiew',
    phase: 'start',
    title: 'Wysiew 6 nasion Pure Instinto',
    summary: '2× Watermelon Zkittlez, 2× King’s Banner, 2× Kushmallow.',
    epistemicStatus: 'document_reported',
    conflictId: 'K-WATERMELON',
  },
  {
    id: 'T-0901',
    date: '2026-09-01',
    dayLabel: 'D1?',
    phase: 'start',
    title: 'Pierwsze 3 wschody (punkt odniesienia D1 vs 29.08)',
    summary: 'Rozbieżność definicji D1 w dokumentacji źródłowej.',
    epistemicStatus: 'conflict_unresolved',
    conflictId: 'K-C2-D1',
  },
  {
    id: 'T-0913',
    date: '2026-09-13',
    dayLabel: 'Wentylacja',
    phase: 'veg',
    title: 'Montaż VENTS VK125 Ø125 (~12–14.09)',
    summary: 'Zastąpienie wcześniejszego wentylatora wyciągowego w układzie z filtrem Prima Klima.',
    epistemicStatus: 'document_reported',
    conflictId: 'K-FAN-MODEL',
  },
  {
    id: 'T-0919',
    date: '2026-09-19',
    dayLabel: 'Przesadzenie',
    phase: 'transplant',
    title: 'Przesadzenie do 4 × 19 L Hero + BioTabs Mycotrex',
    summary: 'Docelowe donice materiałowe w namiocie DiamondBox SL100.',
    epistemicStatus: 'document_reported',
    conflictId: 'K-SOIL',
  },
  {
    id: 'T-0929',
    date: '2026-09-29',
    dayLabel: 'Korekta sterowania',
    phase: 'veg',
    title: 'Odłączenie termostatu wyciągu',
    summary: 'Przejście na ręczny potencjometr ~50% na VENTS VK125.',
    epistemicStatus: 'chronology_preserved_operator_correction',
    conflictId: 'K-CONTROLLER',
  },
  {
    id: 'T-1007',
    date: '2026-10-07',
    dayLabel: 'Deck 45 slajdów',
    phase: 'training',
    title: 'Fotodokumentacja LST (15:58–16:01, T=23.7 °C, RH=56%)',
    summary: 'Ocena architektury korony po gięciu; brak potrzeby przebudowy głównej struktury, selektywna defoliacja środka.',
    epistemicStatus: 'document_reported',
  },
  {
    id: 'T-1017',
    date: '2026-10-17',
    dayLabel: 'Konflikt wag',
    phase: 'diagnostics',
    title: 'Sesja ważenia przed/po — rozbieżność CSV vs JSON18',
    summary: 'Wyłączenie nawilżacza RAM 5L (~17–18.10); RH stabilizuje się w okolicach 55–62%.',
    epistemicStatus: 'conflict_unresolved',
    conflictId: 'K-OCT17-WEIGHTS',
  },
  {
    id: 'T-1018',
    date: '2026-10-18',
    dayLabel: 'Mikroskop',
    phase: 'diagnostics',
    title: 'Inspekcja „białych kropek” na MELO-M',
    summary: 'Zauważone punkty pod mikroskopem; data 18.10 vs 19.10 w konflikcie, obiekt niezidentyfikowany.',
    epistemicStatus: 'conflict_unresolved',
    conflictId: 'K-MICRO-DATE',
  },
  {
    id: 'T-1019',
    date: '2026-10-19',
    dayLabel: 'Runoff + Defoliacja',
    phase: 'diagnostics',
    title: 'Kontrola odpływu (średnia EC 1.95) i mocna defoliacja MELO-M',
    summary: 'Wejście EC 1.1 / pH 6.4 → odpływ KB-D 2.0, KB-M 1.8, MELO-D 2.1, MELO-M 1.9.',
    epistemicStatus: 'chronology_preserved_operator_correction',
    conflictId: 'K-OCT19-STATUS',
  },
  {
    id: 'T-1021',
    date: '2026-10-21',
    dayLabel: 'Ważenie',
    phase: 'diagnostics',
    title: 'Wagi suche przed kolejnym podlaniem',
    summary: 'KB-D 4.430 | KB-M 5.000 | MELO-D 4.740 | MELO-M 4.790 kg (unverified_transcription).',
    epistemicStatus: 'user_reported',
  },
  {
    id: 'T-1022',
    date: '2026-10-22',
    dayLabel: 'Audyt PPFD + 13 L',
    phase: 'ppfd_audit',
    title: 'Pomiar Photone (700–760 µmol/m²/s) i podlewanie (16.20 → 26.40 kg)',
    summary: 'Średnia arytmetyczna EC odpływu spadła do 1.775 mS/cm; przełącznik BLOOM użyty wyłącznie do pomiaru PPFD.',
    epistemicStatus: 'user_reported',
    conflictId: 'K-OCT19-SCHEDULE',
  },
];

export const EQUIPMENT: EquipmentItem[] = [
  {
    id: 'EQ-TENT',
    category: 'Tent',
    name: 'DiamondBox Silver Line SL100',
    spec: '100 × 100 × 200 cm, wnętrze srebrny Mylar, dolna taca wodoodporna',
    status: 'Aktywny · bazowa geometria 3D Twin',
    epistemicStatus: 'document_reported',
  },
  {
    id: 'EQ-LIGHTS',
    category: 'Lighting',
    name: '4 × LUMii SWITCH BLADE 150 W',
    spec: '600 W nom., PPF 375 (VEG) / 390 (BLOOM) µmol/s na oprawę, zawieszenie ~40 cm, 90% na pokrętle',
    status: 'Aktywne · XLED Controller + LUMii Green Work Light 10 W',
    epistemicStatus: 'document_reported',
    conflictId: 'K-OCT19-SCHEDULE',
  },
  {
    id: 'EQ-FAN',
    category: 'Ventilation',
    name: 'VENTS VK125 Ø125 + Prima Klima Economy Line Ø125',
    spec: 'Wyciąg na ręcznym potencjometrze ~50% (termostat odłączony 29.09) + filtr węglowy',
    status: 'Aktywny (zastąpił Prima Klima ~12–14.09)',
    epistemicStatus: 'chronology_preserved_operator_correction',
    conflictId: 'K-CONTROLLER',
  },
  {
    id: 'EQ-CLIMATE',
    category: 'Climate',
    name: '2× Princess Mini + 2× klipsowy + RAM Ultrasonic 5 L',
    spec: '4 wentylatory mieszające; nawilżacz wyłączony ~17–18.10 (RH 55–62%)',
    status: 'Mieszające aktywne · nawilżacz OFF',
    epistemicStatus: 'document_reported',
  },
  {
    id: 'EQ-SENSOR',
    category: 'Sensors',
    name: 'Aqua Master P110 (pH/EC/T) + Photone App',
    spec: 'Pomiar pożywki i odpływu; Photone LED Full Spectrum + Red',
    status: 'Kalibracja ręczna · brak watomierza sieciowego',
    epistemicStatus: 'user_reported',
  },
  {
    id: 'EQ-WATER',
    category: 'Nutrients & Water',
    name: 'Woda Emmerich + Shogun Silicon + Plagron / Katana',
    spec: 'Baza 22.10: 10 L kranówki + 3 L destylowanej + 13 ml Silicon (EC 0.4, pH 7.8)',
    status: 'Dodatki BLOOM z 22.10 jako planned',
    epistemicStatus: 'planned',
    conflictId: 'K-SOFTWARE-EXECUTION',
  },
];

export const ATTACHED_ASSETS: AttachedAsset[] = [
  {
    id: 'asset-tent-interior',
    title: 'Referencja wnętrza DiamondBox SL100',
    subtitle: 'Srebrny Mylar, rękawy wentylacyjne Ø125/150, okno wlotowe i stelaż',
    publicUrl: '/assets/aistudio/image-gen-1_4__01908dc1.png',
    relativePath: 'public/assets/aistudio/image-gen-1_4__01908dc1.png',
    fileType: 'image',
    provenanceNote: 'Załącznik referencyjny użyty do kalibracji materiałów i portów wentylacyjnych w scenie 3D.',
  },
  {
    id: 'asset-deck-montage',
    title: 'Montaż 45 slajdów — Inspekcja 07.10.2026',
    subtitle: 'Sekwencja 15:58–16:01, ocena LST, gęstość korony, T=23.7 °C / RH=56%',
    publicUrl: '/assets/aistudio/argus_deck_montage_52a02fb8.jpg',
    relativePath: 'public/assets/aistudio/argus_deck_montage_52a02fb8.jpg',
    fileType: 'image',
    provenanceNote: 'Zestawienie 45 kart audytu fotograficznego z 07.10.2026.',
  },
  {
    id: 'asset-stages-4k',
    title: 'Infografika 4K — Etapy rozwoju, trichomy i nasiona',
    subtitle: '6-etapowy schemat faz rozwojowych oraz kryteria dojrzałości',
    publicUrl: '/assets/aistudio/ARGUS_etapy_wyostrzone_4K_25e2070d.png',
    relativePath: 'public/assets/aistudio/ARGUS_etapy_wyostrzone_4K_25e2070d.png',
    fileType: 'image',
    provenanceNote: 'Wizualna mapa etapów Cyklu 2 (materiał poglądowy — nie nadpisuje braków dat flipu).',
  },
  {
    id: 'asset-master-pdf',
    title: 'ARGUS_CYKL2_NOTEBOOKLM_MASTER_2026-10-23_v1.1.pdf',
    subtitle: '40-stronicowy audyt źródłowy Cyklu 2 (Aneks A, Aneks B K-*, protokoły pomiarowe)',
    publicUrl: '/assets/aistudio/ARGUS_CYKL2_NOTEBOOKLM_MASTER_2026-10-23_v1.1_eb387523.pdf',
    relativePath: 'public/assets/aistudio/ARGUS_CYKL2_NOTEBOOKLM_MASTER_2026-10-23_v1.1_eb387523.pdf',
    fileType: 'pdf',
    provenanceNote: 'Dokument nadrzędny v1.1 z 23.10.2026.',
  },
];

export const BIOSCIENCE_PRESETS = [
  {
    query: 'Orthosilicic acid',
    polishLabel: 'Kwas ortokrzemowy (Si)',
    relevance: 'Shogun Silicon — wzmocnienie ścian komórkowych, redukcja wylegania i stresu abiotycznego.',
  },
  {
    query: 'Magnesium sulfate',
    polishLabel: 'Siarczan magnezu (Sól Epsom)',
    relevance: 'Korekta stosunku Ca:Mg (woda Emmerich 76.5 : 9.7 mg/L) — weryfikacja K-SOFTWARE-EXECUTION.',
  },
  {
    query: 'Calcium nitrate',
    polishLabel: 'Azotan wapnia',
    relevance: 'Źródło biodostępnego Ca²⁺ i azotu azotanowego w twardości ogólnej wody.',
  },
  {
    query: 'Phosphoric acid',
    polishLabel: 'Kwas fosforowy (pH-)',
    relevance: 'Korekta pH pożywki z 7.8 (po Shogun Silicon) do zakresu docelowego 6.3–6.5.',
  },
  {
    query: 'Beta-Caryophyllene',
    polishLabel: 'β-Kariofilen',
    relevance: 'Główny seskwiterpen aromatyczny profilu King’s Banner / Kushmallow (ligand CB2).',
  },
  {
    query: 'Cannabidiol',
    polishLabel: 'Kannabidiol (CBD)',
    relevance: 'Wzorzec fitokannabinoidowy w bazach ChEMBL i Europe PMC.',
  },
];
