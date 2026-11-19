import { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Image as ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import { ATTACHED_ASSETS } from '../data/argusData';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  thinkingUsed?: boolean;
  fallbackNote?: string | null;
}

interface GeminiWorkbenchProps {
  initialPrompt?: string | null;
  initialAssetId?: string | null;
  onClearInitialIntent?: () => void;
}

const QUICK_PROMPTS = [
  'Porównaj pobór wody i odpływ EC wszystkich 4 roślin z sesji 22.10 oraz wskaż anomalie MELO-M.',
  'Wyjaśnij konflikt K-OCT17-WEIGHTS (CSV vs JSON18) oraz dlaczego nie wolno go uśredniać.',
  'Oceń DLI z pomiaru Photone PPFD 700–760 µmol/m²/s w kontekście nieudokumentowanego flipu 12/12.',
  'Zweryfikuj poprawność korekty Mg solą Epsom dla wody z Emmerich (K-SOFTWARE-EXECUTION).',
];

export function GeminiWorkbench({
  initialPrompt,
  initialAssetId,
  onClearInitialIntent,
}: GeminiWorkbenchProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Gotowy do pracy nad audytem ARGUS Cykl 2 v1.1. Wszystkie odpowiedzi rozdzielają dane potwierdzone od planowanych i konfliktów K-*. Wybierz rolę ekspercką, zadaj pytanie albo przeanalizuj zdjęcie z namiotu.',
      modelUsed: 'ARGUS Kontekst v1.1',
    },
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'fast' | 'general' | 'deep'>('deep');
  const [role, setRole] = useState<'auditor' | 'botanist' | 'engineer'>('auditor');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Image Diagnostics State
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    initialAssetId || ATTACHED_ASSETS[0].id,
  );
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState<string>('image/jpeg');
  const [imagePrompt, setImagePrompt] = useState(
    'Przeanalizuj dokładnie ten materiał z ARGUS Cykl 2: wskaż stan korony, geometrię LST, oświetlenie/wentylację oraz oddziel obserwacje pewne od hipotez.',
  );
  const [imageDeepThinking, setImageDeepThinking] = useState(true);
  const [imageResult, setImageResult] = useState<{
    text: string;
    modelUsed: string;
    fallbackNote?: string | null;
  } | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      onClearInitialIntent?.();
    }
  }, [initialPrompt, onClearInitialIntent]);

  useEffect(() => {
    if (initialAssetId) {
      setSelectedAssetId(initialAssetId);
      setUploadedPreview(null);
      onClearInitialIntent?.();
    }
  }, [initialAssetId, onClearInitialIntent]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const sendChatMessage = async (textOverride?: string) => {
    const promptText = (textOverride ?? input).trim();
    if (!promptText || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textOverride) setInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(0, -1)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: historyPayload,
          mode,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.text,
          modelUsed: data.modelUsed,
          thinkingUsed: data.thinkingUsed,
          fallbackNote: data.fallbackNote,
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Błąd komunikacji z Gemini API');
    } finally {
      setChatLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const runImageAnalysis = async () => {
    if (imageLoading) return;
    setImageLoading(true);
    setImageError(null);

    try {
      const payload = uploadedPreview
        ? {
            imageBase64: uploadedPreview,
            mimeType: uploadedMime,
            prompt: imagePrompt,
            deepThinking: imageDeepThinking,
          }
        : {
            assetId: selectedAssetId,
            prompt: imagePrompt,
            deepThinking: imageDeepThinking,
          };

      const res = await fetch('/api/gemini/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setImageResult(data);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Błąd analizy obrazu');
    } finally {
      setImageLoading(false);
    }
  };

  const imageAssets = ATTACHED_ASSETS.filter((a) => a.fileType === 'image');
  const activeAsset = imageAssets.find((a) => a.id === selectedAssetId) ?? imageAssets[0];

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
      {/* Left 7 Cols: Multi-turn Gemini Chat + Deep Thinking */}
      <section
        aria-label="Czat wieloturowy Gemini i tryb myślenia"
        className="flex h-[740px] flex-col rounded-xl border border-slate-800 bg-slate-900/70 lg:col-span-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-base font-semibold text-slate-100">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Asystent Audytu ARGUS · Gemini</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Wywołanie po stronie serwera (@google/genai) z pełną bazą faktów i konfliktów K-*
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="gemini-role-select">
              Rola ekspercka
            </label>
            <select
              id="gemini-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as 'auditor' | 'botanist' | 'engineer')}
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="auditor">Rola: Audytor Dowodowy v1.1</option>
              <option value="botanist">Rola: Diagnosta Botaniczny</option>
              <option value="engineer">Rola: Inżynier Środowiska</option>
            </select>

            <label className="sr-only" htmlFor="gemini-mode-select">
              Tryb modelu Gemini
            </label>
            <select
              id="gemini-mode-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'fast' | 'general' | 'deep')}
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="deep">Głębokie Myślenie (HIGH)</option>
              <option value="general">Standardowy (3.8 Flash)</option>
              <option value="fast">Szybki (Flash Lite)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Multi-Turn Conversation */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-800 bg-slate-950/90 text-slate-200'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'model' && msg.modelUsed && (
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400">
                  <span>Model: {msg.modelUsed}</span>
                  {msg.thinkingUsed && <span className="text-emerald-400">· ThinkingLevel.HIGH</span>}
                  {msg.fallbackNote && <span className="text-amber-300">· {msg.fallbackNote}</span>}
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {mode === 'deep'
                  ? 'Analiza wieloetapowa (ThinkingLevel.HIGH)...'
                  : 'Generowanie odpowiedzi Gemini...'}
              </span>
            </div>
          )}

          {chatError && (
            <div className="rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {chatError}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Audit Prompts + Input Form */}
        <div className="border-t border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendChatMessage(q)}
                className="max-w-full truncate rounded border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-emerald-600/60 hover:text-white"
                title={q}
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChatMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Zadaj pytanie o rośliny KB-D/KB-M/MELO-D/MELO-M, pomiary lub konflikty K-*..."
              aria-label="Wpisz pytanie do asystenta Gemini"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !input.trim()}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Wyślij</span>
            </button>
          </form>
        </div>
      </section>

      {/* Right 5 Cols: Image Diagnostics & Visual Understanding */}
      <section
        aria-label="Diagnostyka obrazów Gemini Vision"
        className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-4 lg:col-span-5"
      >
        <div className="border-b border-slate-800 pb-3">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-100">
            <ImageIcon className="h-4 w-4 text-sky-400" />
            <span>Diagnostyka Obrazów · Vision + Thinking</span>
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Prześlij własne zdjęcie z namiotu albo przeanalizuj załączone materiały ARGUS Cykl 2.
          </p>
        </div>

        {/* Source Picker: Attached Assets or File Upload */}
        <div className="mt-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {imageAssets.map((asset) => {
              const active = !uploadedPreview && selectedAssetId === asset.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setUploadedPreview(null);
                    setSelectedAssetId(asset.id);
                  }}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-sky-600/25 text-sky-300 ring-1 ring-sky-500/50'
                      : 'bg-slate-950 text-slate-300 ring-1 ring-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {asset.title.split('—')[0].trim()}
                </button>
              );
            })}

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700">
              <Upload className="h-3 w-3" />
              <span>Wgraj plik</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            <img
              src={uploadedPreview || activeAsset.publicUrl}
              alt={uploadedPreview ? 'Przesłane zdjęcie do analizy' : activeAsset.title}
              referrerPolicy="no-referrer"
              className="h-52 w-full object-contain"
            />
          </div>

          <label className="block text-xs">
            <span className="text-slate-300">Instrukcja analizy wizualnej</span>
            <textarea
              rows={2}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={imageDeepThinking}
                onChange={(e) => setImageDeepThinking(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-emerald-500"
              />
              <Brain className="h-3.5 w-3.5 text-emerald-400" />
              <span>Głębokie myślenie (ThinkingLevel.HIGH)</span>
            </label>

            <button
              type="button"
              onClick={runImageAnalysis}
              disabled={imageLoading}
              className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
            >
              {imageLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Analizuj obraz</span>
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-xs leading-relaxed text-slate-200">
          {imageError && <div className="text-red-300">{imageError}</div>}
          {!imageResult && !imageLoading && !imageError && (
            <div className="text-slate-500">
              Wybierz obraz i kliknij „Analizuj obraz”, aby uzyskać raport diagnostyczny Gemini.
            </div>
          )}
          {imageLoading && (
            <div className="flex items-center gap-2 text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Przetwarzanie obrazu po stronie serwera...</span>
            </div>
          )}
          {imageResult && (
            <div className="space-y-2">
              <div className="border-b border-slate-800 pb-1.5 font-mono text-[10px] text-slate-400">
                Model: {imageResult.modelUsed}
                {imageResult.fallbackNote ? ` · ${imageResult.fallbackNote}` : ''}
              </div>
              <div className="whitespace-pre-wrap">{imageResult.text}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
