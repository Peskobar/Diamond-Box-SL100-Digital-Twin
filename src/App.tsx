import { useCallback, useState } from 'react';
import { CONFLICTS, type PlantId } from './data/argusData';
import { TopBar, type AppTab } from './components/TopBar';
import { TentScene3D } from './components/TentScene3D';
import { AuditWorkspace } from './components/AuditWorkspace';
import { GeminiWorkbench } from './components/GeminiWorkbench';
import { BioscienceLab } from './components/BioscienceLab';
import { MediaArchiveView } from './components/MediaArchiveView';

function resolveInitialTab(): AppTab {
  if (typeof window === 'undefined') return 'twin';
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (
    tabParam === 'twin' ||
    tabParam === 'audit' ||
    tabParam === 'gemini' ||
    tabParam === 'bioscience' ||
    tabParam === 'archive'
  ) {
    return tabParam;
  }
  return 'twin';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(resolveInitialTab);
  const [selectedPlantId, setSelectedPlantId] = useState<PlantId>('KB-D');
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);
  const [aiInitialAssetId, setAiInitialAssetId] = useState<string | null>(null);

  const handleOpenPlantInAudit = useCallback((id: PlantId) => {
    setSelectedPlantId(id);
    setActiveTab('audit');
  }, []);

  const handleAskAiAboutPlant = useCallback((id: PlantId) => {
    setSelectedPlantId(id);
    setAiInitialPrompt(
      `Przeprowadź szczegółową ocenę dowodową rośliny ${id} (wagi przed/po, odpływ EC/pH, kondycja korony i powiązane konflikty K-*).`,
    );
    setActiveTab('gemini');
  }, []);

  const handleAskAiAboutConflict = useCallback((conflictId: string) => {
    setAiInitialPrompt(
      `Przeanalizuj konflikt ${conflictId}: podaj oba konkurencyjne zapisy źródłowe, wskaż regułę epistemiczną i bezpieczne wnioski dla Cyklu 2.`,
    );
    setActiveTab('gemini');
  }, []);

  const handleSendAssetToAi = useCallback((assetId: string) => {
    setAiInitialAssetId(assetId);
    setActiveTab('gemini');
  }, []);

  const handleQuickAiAudit = useCallback(() => {
    setAiInitialPrompt(
      'Wygeneruj zwięzły audyt wykonawczy na dzień 22.10.2026: podsumuj bilans masy (+10.20 kg), średnie EC odpływu (1.775), status MELO-M oraz otwarte braki danych (flip 12/12 i woda Emmerich).',
    );
    setActiveTab('gemini');
  }, []);

  const clearAiInitialIntent = useCallback(() => {
    setAiInitialPrompt(null);
    setAiInitialAssetId(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-active-tab={activeTab}>
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        conflictCount={CONFLICTS.length}
        onQuickAiAudit={handleQuickAiAudit}
      />

      <main>
        {activeTab === 'twin' && (
          <TentScene3D
            selectedPlantId={selectedPlantId}
            onSelectPlant={setSelectedPlantId}
            onOpenPlantInAudit={handleOpenPlantInAudit}
            onAskAiAboutPlant={handleAskAiAboutPlant}
          />
        )}

        {activeTab === 'audit' && (
          <AuditWorkspace
            selectedPlantId={selectedPlantId}
            onSelectPlant={setSelectedPlantId}
            onAskAiAboutConflict={handleAskAiAboutConflict}
          />
        )}

        {activeTab === 'gemini' && (
          <GeminiWorkbench
            initialPrompt={aiInitialPrompt}
            initialAssetId={aiInitialAssetId}
            onClearInitialIntent={clearAiInitialIntent}
          />
        )}

        {activeTab === 'bioscience' && <BioscienceLab />}

        {activeTab === 'archive' && (
          <MediaArchiveView onSendAssetToAi={handleSendAssetToAi} />
        )}
      </main>
    </div>
  );
}
