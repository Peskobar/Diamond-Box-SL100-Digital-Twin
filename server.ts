import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, type Content } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePort(): number {
  const portFlagIndex = process.argv.indexOf('--port');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsed = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    const parsed = Number(process.env.PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const PORT = resolvePort();

const ALLOWED_LOCAL_ASSETS: Record<string, { file: string; mimeType: string }> = {
  'asset-tent-interior': {
    file: path.join(__dirname, 'public/assets/aistudio/image-gen-1_4__01908dc1.png'),
    mimeType: 'image/png',
  },
  'asset-deck-montage': {
    file: path.join(__dirname, 'public/assets/aistudio/argus_deck_montage_52a02fb8.jpg'),
    mimeType: 'image/jpeg',
  },
  'asset-stages-4k': {
    file: path.join(__dirname, 'public/assets/aistudio/ARGUS_etapy_wyostrzone_4K_25e2070d.png'),
    mimeType: 'image/png',
  },
};

const ARGUS_AUDIT_CONTEXT = `
Jesteś asystentem systemu ARGUS Cykl 2 — Audyt Dowodowy v1.1 (2026-10-23).
ZASADY EPISTEMICZNE (BEZWZGLĘDNE):
1. Rozdzielaj fakty potwierdzone (user_reported, document_reported) od obliczeń (derived), planów (planned), hipotez (unverified) i konfliktów (unresolved).
2. NIGDY nie uśredniaj sprzecznych danych (szczególnie wag z 17.10: K-OCT17-WEIGHTS — CSV vs JSON18).
3. NIGDY nie mapuj dawnych etykiet doniczek (WM-D/M, KM-1/2, Melo pierwszy/drugi/ze stelażem, Banner z szeroką plakietką) na KB-D, KB-M, MELO-D, MELO-M.
4. Przełączenie fotoperiodu na 12/12 (flip) pozostaje NIEUDOKUMENTOWANE (K-OCT19-SCHEDULE); ostatnio potwierdzony tryb to VEG (18/6). Przełącznik BLOOM na 4× LUMii Switch Blade 150 W dnia 22.10 był użyty tylko do pomiaru Photone PPFD.
5. Nie utożsamiaj nastawy pokrętła 90% z mocą z gniazdka (brak watomierza) ani przyrostu masy w kg z objętością wody w L.
6. Baza danych Cyklu 2 (stan na 22.10.2026):
   - Namiot: DiamondBox SL100 (100×100×200 cm), 4× LUMii Switch Blade 150 W (~40 cm, 90%, PPFD narożniki 700–740, środek 740–760, otwarta ściana 500 µmol/m²/s), wyciąg VENTS VK125 Ø125 na potencjometrze ~50% (termostat odłączony 29.09), filtr Prima Klima Economy Ø125, nawilżacz RAM 5L wyłączony ~17–18.10 (RH 55–62%).
   - Rośliny w donicach 19L Hero (od 19.09):
     * KB-D: 22.10 3.800 -> 6.470 kg (+2.670 kg), runoff EC 2.000, pH 6.500 (19.10: EC 2.0, pH 6.5).
     * KB-M: 22.10 4.300 -> 7.180 kg (+2.880 kg), runoff EC 1.700, pH 6.500 (19.10: EC 1.8, pH 6.5).
     * MELO-D: 22.10 4.100 -> 6.660 kg (+2.560 kg), runoff EC 1.800, pH 6.600 (19.10: EC 2.1, pH 6.5).
     * MELO-M: przewlekłe oklapnięcie / słaby dryback (09–19.10), mocna defoliacja, "białe kropki" pod mikroskopem 18/19.10 (niezidentyfikowane), 22.10 4.000 -> 6.090 kg (+2.090 kg), runoff EC 1.600, pH 6.500.
   - Sumy 22.10: 16.20 -> 26.40 kg (+10.20 kg), średnia arytmetyczna EC odpływu 1.775 mS/cm (19.10: 1.95 przy wejściu 1.1 / pH 6.4).
   - Wsady 22.10 (13L): potwierdzone 10 L kranówki Emmerich (historycznie Ca 76.5, Mg 9.7 mg/L) + 3 L destylowanej + 13 ml Shogun Silicon (EC 0.4, pH 7.8). Dodatki Terra Bloom 13–26 ml, Katana Roots 2.6 ml, Zenzym 32.5 ml tylko jako PLANNED.
   - Błąd K-SOFTWARE-EXECUTION: w starym skrypcie pomylono mg z g przy soli Epsom (9.86% Mg); +25 mg/L Mg wymaga ok. 0.254 g/L (~3.30 g na 13 L).
Odpowiadaj po polsku, precyzyjnie, technicznie, z powołaniem na konkretne ID roślin i konfliktów K-*.
`.trim();

const ROLE_INSTRUCTIONS: Record<string, string> = {
  auditor: 'Rola: Audytor Dowodowy v1.1. Pilnuj rygoru dowodowego, wskazuj braki danych i konflikty K-* bez zgadywania.',
  botanist: 'Rola: Diagnosta Botaniczny. Analizuj fizjologię transpiracji, EC odpływu, architekturę LST i objawy na MELO-M przy zachowaniu zastrzeżeń dowodowych.',
  engineer: 'Rola: Inżynier Środowiska i Pożywki. Skup się na PPFD/DLI, wentylacji VK125, twardości wody Emmerich, Ca:Mg i stechiometrii roztworu.',
};

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

async function fetchWithRetry(url: string, init: RequestInit = {}, retries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'User-Agent': 'ARGUS-Cykl2-Workbench/1.1 (bioscience-proxy)',
          ...(init.headers || {}),
        },
      });
      clearTimeout(timer);
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Upstream request failed');
}

function reconstructOpenAlexAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.filter(Boolean).join(' ').slice(0, 750);
}

async function generateWithFallback(
  ai: GoogleGenAI,
  mode: 'fast' | 'general' | 'deep',
  contents: Content[] | string,
  systemInstruction: string,
) {
  const candidates =
    mode === 'fast'
      ? ['gemini-3.1-flash-lite', 'gemini-3.8-flash']
      : mode === 'deep'
        ? ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite']
        : ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  let lastErr: unknown;
  const primaryModel = candidates[0];

  for (const model of candidates) {
    const config: Record<string, unknown> = { systemInstruction };
    if (mode === 'deep' && !model.includes('lite')) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return {
        text: response.text ?? '',
        modelUsed: model,
        thinkingUsed: mode === 'deep' && !model.includes('lite'),
        fallbackNote:
          model === primaryModel
            ? null
            : `Model ${primaryModel} chwilowo niedostępny — użyto ${model}${mode === 'deep' ? ' (ThinkingLevel.HIGH)' : ''}.`,
      };
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Wszystkie modele Gemini odrzuciły żądanie.');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'argus-cykl2-server',
      geminiConfigured: Boolean(getAiClient()),
    });
  });

  app.post('/api/gemini/chat', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Brak skonfigurowanego klucza GEMINI_API_KEY po stronie serwera.',
      });
      return;
    }

    const {
      message,
      history = [],
      mode = 'general',
      role = 'auditor',
    } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
      mode?: 'fast' | 'general' | 'deep';
      role?: string;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Wiadomość nie może być pusta.' });
      return;
    }

    const roleHint = ROLE_INSTRUCTIONS[role] ?? ROLE_INSTRUCTIONS.auditor;
    const systemInstruction = `${ARGUS_AUDIT_CONTEXT}\n\n${roleHint}`;

    const contents: Content[] = [
      ...history
        .filter((h) => h.text && h.text.trim())
        .slice(-16)
        .map((h) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    try {
      const result = await generateWithFallback(ai, mode, contents, systemInstruction);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd wywołania Gemini API';
      res.status(502).json({ error: msg });
    }
  });

  app.post('/api/gemini/analyze-image', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Brak skonfigurowanego klucza GEMINI_API_KEY po stronie serwera.',
      });
      return;
    }

    const {
      imageBase64,
      mimeType,
      assetId,
      prompt = 'Przeprowadź rygorystyczną analizę wizualną materiału z ARGUS Cykl 2: wskaż obiekty, kondycję korony/sprzętu oraz wyraźnie oddziel obserwacje pewne od hipotez.',
      deepThinking = true,
    } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      assetId?: string;
      prompt?: string;
      deepThinking?: boolean;
    };

    try {
      let resolvedData = '';
      let resolvedMime = 'image/png';

      if (assetId && ALLOWED_LOCAL_ASSETS[assetId]) {
        const asset = ALLOWED_LOCAL_ASSETS[assetId];
        const fileBuffer = await fs.readFile(asset.file);
        resolvedData = fileBuffer.toString('base64');
        resolvedMime = asset.mimeType;
      } else if (imageBase64 && mimeType) {
        resolvedData = imageBase64.replace(/^data:[^;]+;base64,/, '');
        resolvedMime = mimeType;
      } else {
        res.status(400).json({ error: 'Prześlij obraz lub wybierz załącznik z archiwum ARGUS.' });
        return;
      }

      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { inlineData: { data: resolvedData, mimeType: resolvedMime } },
            { text: prompt },
          ],
        },
      ];

      const mode = deepThinking ? 'deep' : 'general';
      const result = await generateWithFallback(
        ai,
        mode,
        contents,
        `${ARGUS_AUDIT_CONTEXT}\n\n${ROLE_INSTRUCTIONS.botanist}`,
      );
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd analizy obrazu';
      res.status(502).json({ error: msg });
    }
  });

  // --- Bioscience Live API Proxies (PubChem, ChEMBL, Literature) ---

  app.get('/api/science/pubchem', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Wymagany parametr ?q=' });
      return;
    }
    try {
      const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
        q,
      )}/property/Title,MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount/JSON`;

      const propRes = await fetchWithRetry(propUrl);
      if (!propRes.ok) {
        res.status(404).json({ error: `Nie znaleziono związku „${q}” w PubChem.` });
        return;
      }
      const propJson = (await propRes.json()) as {
        PropertyTable?: { Properties?: Array<Record<string, unknown>> };
      };
      const props = propJson.PropertyTable?.Properties?.[0];
      if (!props || !props.CID) {
        res.status(404).json({ error: `Brak rekordów CID w PubChem dla „${q}”.` });
        return;
      }

      const cid = Number(props.CID);
      let synonyms: string[] = [];
      try {
        const synRes = await fetchWithRetry(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
        );
        if (synRes.ok) {
          const synJson = (await synRes.json()) as {
            InformationList?: { Information?: Array<{ Synonym?: string[] }> };
          };
          synonyms = (synJson.InformationList?.Information?.[0]?.Synonym ?? []).slice(0, 8);
        }
      } catch {
        // Optional enrichment; continue safely
      }

      const mw = Number(props.MolecularWeight ?? 0);
      const xlogp = typeof props.XLogP === 'number' ? props.XLogP : null;
      const hbd = Number(props.HBondDonorCount ?? 0);
      const hba = Number(props.HBondAcceptorCount ?? 0);
      const tpsa = Number(props.TPSA ?? 0);
      const rot = Number(props.RotatableBondCount ?? 0);

      const lipinskiViolations =
        (mw > 500 ? 1 : 0) +
        (xlogp !== null && xlogp > 5 ? 1 : 0) +
        (hbd > 5 ? 1 : 0) +
        (hba > 10 ? 1 : 0);

      res.json({
        cid,
        title: props.Title ?? q,
        formula: props.MolecularFormula ?? '—',
        molecularWeight: mw,
        smiles: props.CanonicalSMILES ?? '',
        inchiKey: props.InChIKey ?? '',
        xlogp,
        tpsa,
        hbd,
        hba,
        rotatableBonds: rot,
        lipinskiViolations,
        veberCompliant: rot <= 10 && tpsa <= 140,
        synonyms,
        image2dUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=2d&image_size=360x360`,
        pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Błąd połączenia z PubChem REST API',
      });
    }
  });

  app.get('/api/science/chembl', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const inchiKey = String(req.query.inchiKey ?? '').trim();
    if (!q && !inchiKey) {
      res.status(400).json({ error: 'Wymagany parametr ?q= lub ?inchiKey=' });
      return;
    }

    try {
      const searchUrl = inchiKey
        ? `https://www.ebi.ac.uk/chembl/api/data/molecule.json?molecule_structures__standard_inchi_key=${encodeURIComponent(
            inchiKey,
          )}`
        : `https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(q)}&limit=3`;

      const molRes = await fetchWithRetry(searchUrl);
      if (!molRes.ok) {
        res.json({ molecule: null, activities: [] });
        return;
      }
      const molJson = (await molRes.json()) as {
        molecules?: Array<{
          molecule_chembl_id: string;
          pref_name?: string | null;
          max_phase?: number | null;
          molecule_type?: string | null;
        }>;
      };

      const mol = molJson.molecules?.[0];
      if (!mol) {
        res.json({ molecule: null, activities: [] });
        return;
      }

      let activities: Array<{
        targetName: string;
        targetOrganism: string;
        standardType: string;
        standardValue: string;
        standardUnits: string;
        assayDescription: string;
      }> = [];

      try {
        const actRes = await fetchWithRetry(
          `https://www.ebi.ac.uk/chembl/api/data/activity.json?molecule_chembl_id=${encodeURIComponent(
            mol.molecule_chembl_id,
          )}&limit=8`,
        );
        if (actRes.ok) {
          const actJson = (await actRes.json()) as {
            activities?: Array<Record<string, unknown>>;
          };
          activities = (actJson.activities ?? [])
            .filter((a) => a.standard_value !== null && a.standard_value !== undefined)
            .slice(0, 6)
            .map((a) => ({
              targetName: String(a.target_pref_name ?? 'Target nieznany'),
              targetOrganism: String(a.target_organism ?? '—'),
              standardType: String(a.standard_type ?? '—'),
              standardValue: String(a.standard_value ?? '—'),
              standardUnits: String(a.standard_units ?? ''),
              assayDescription: String(a.assay_description ?? '').slice(0, 140),
            }));
        }
      } catch {
        // Activities optional if ChEMBL activity endpoint times out
      }

      res.json({
        molecule: {
          chemblId: mol.molecule_chembl_id,
          prefName: mol.pref_name ?? q,
          maxPhase: mol.max_phase ?? null,
          moleculeType: mol.molecule_type ?? 'Small molecule',
          url: `https://www.ebi.ac.uk/chembl/compound_report_card/${mol.molecule_chembl_id}/`,
        },
        activities,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Błąd połączenia z ChEMBL REST API',
      });
    }
  });

  app.get('/api/science/literature', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Wymagany parametr ?q=' });
      return;
    }

    try {
      const [epmcRes, oaRes] = await Promise.allSettled([
        fetchWithRetry(
          `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
            q,
          )}&format=json&resultType=core&pageSize=4`,
        ),
        fetchWithRetry(
          `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=4&sort=cited_by_count:desc`,
        ),
      ]);

      const papers: Array<{
        source: 'Europe PMC' | 'OpenAlex';
        id: string;
        title: string;
        year: string;
        journal: string;
        authors: string;
        citations: number | null;
        abstract: string;
        url: string;
      }> = [];

      if (epmcRes.status === 'fulfilled' && epmcRes.value.ok) {
        const epmcJson = (await epmcRes.value.json()) as {
          resultList?: { result?: Array<Record<string, unknown>> };
        };
        for (const r of epmcJson.resultList?.result ?? []) {
          const pmid = r.pmid ? String(r.pmid) : '';
          const doi = r.doi ? String(r.doi) : '';
          papers.push({
            source: 'Europe PMC',
            id: pmid || String(r.id ?? ''),
            title: String(r.title ?? 'Bez tytułu'),
            year: String(r.pubYear ?? '—'),
            journal: String(r.journalTitle ?? '—'),
            authors: String(r.authorString ?? '—').slice(0, 120),
            citations: typeof r.citedByCount === 'number' ? r.citedByCount : null,
            abstract: String(r.abstractText ?? '').replace(/<[^>]+>/g, '').slice(0, 520),
            url: pmid
              ? `https://europepmc.org/article/MED/${pmid}`
              : doi
                ? `https://doi.org/${doi}`
                : 'https://europepmc.org/',
          });
        }
      }

      if (oaRes.status === 'fulfilled' && oaRes.value.ok) {
        const oaJson = (await oaRes.value.json()) as {
          results?: Array<Record<string, unknown>>;
        };
        for (const w of oaJson.results ?? []) {
          const abstract = reconstructOpenAlexAbstract(
            w.abstract_inverted_index as Record<string, number[]> | undefined,
          );
          const primaryLoc = w.primary_location as
            | { source?: { display_name?: string }; landing_page_url?: string }
            | undefined;
          const authorships = (w.authorships as Array<{ author?: { display_name?: string } }> | undefined) ?? [];
          papers.push({
            source: 'OpenAlex',
            id: String(w.id ?? ''),
            title: String(w.title ?? 'Bez tytułu'),
            year: String(w.publication_year ?? '—'),
            journal: primaryLoc?.source?.display_name ?? 'OpenAlex Index',
            authors:
              authorships
                .slice(0, 3)
                .map((a) => a.author?.display_name)
                .filter(Boolean)
                .join(', ') || '—',
            citations: typeof w.cited_by_count === 'number' ? w.cited_by_count : null,
            abstract: abstract.slice(0, 520),
            url: String(w.doi || primaryLoc?.landing_page_url || w.id || 'https://openalex.org/'),
          });
        }
      }

      res.json({ query: q, papers });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Błąd pobierania literatury naukowej',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARGUS Cykl 2 server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ARGUS server:', err);
  process.exit(1);
});
