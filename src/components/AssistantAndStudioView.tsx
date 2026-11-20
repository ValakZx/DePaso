import React, {useEffect, useRef, useState} from 'react';
import {Bot, ImagePlus, Loader2, Send, Sparkles, Zap} from 'lucide-react';
import {AssistantMessage} from '../domain/types';
import {generateProductPhoto, sendAssistantMessage} from '../services/aiService';

interface AssistantAndStudioViewProps {
  onUseGeneratedPhotoInItem: (imageUrl: string, prompt: string) => void;
}

const STARTER_PROMPTS = [
  '¿Cuánto debo ofrecer de envío desde Urcuquí por una medicina de $8?',
  '¿Cómo funciona el pago en dos tiempos con Deuna?',
  '¿Qué precauciones debo tomar si traigo una encomienda desde Quito?',
];

export const AssistantAndStudioView: React.FC<AssistantAndStudioViewProps> = ({
  onUseGeneratedPhotoInItem,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Hola, soy el Asistente de DePaso. Puedo ayudarte a calcular tarifas justas en USD, explicar el pago en dos tiempos por Deuna o revisar reglas de seguridad en rutas Multis, Urcuquí, Ibarra y Quito.',
      model: 'gemini-4-hydrogen',
      createdAt: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState<'balanced' | 'fast'>('balanced');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Image generation studio state (gemini-3-pro-image-preview with 1K, 2K, 4K)
  const [photoPrompt, setPhotoPrompt] = useState('Bolón de verde mixto recién hecho con café pasado ecuatoriano');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'4:3' | '1:1' | '16:9'>('4:3');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages.length, chatLoading]);

  const handleSendChat = async (textToSend?: string) => {
    const content = (textToSend ?? chatInput).trim();
    if (!content || chatLoading) return;

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: content,
      createdAt: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setChatInput('');
    setChatError(null);
    setChatLoading(true);

    try {
      const res = await sendAssistantMessage({
        message: content,
        history: messages,
        mode: chatMode,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: res.reply,
          model: res.model,
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Error al consultar el asistente.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleGeneratePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPrompt.trim() || photoLoading) return;
    setPhotoError(null);
    setPhotoLoading(true);
    try {
      const res = await generateProductPhoto({
        prompt: photoPrompt,
        imageSize,
        aspectRatio,
      });
      setGeneratedUrl(res.imageUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo generar la imagen.');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Multi-turn Gemini Assistant */}
      <section className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl flex flex-col overflow-hidden h-[560px]">
        <div className="px-4 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-neutral-950">Asistente DePaso</h2>
              <p className="text-[11px] text-neutral-500">Consultas de tarifas, Deuna y seguridad P2P</p>
            </div>
          </div>

          <div
            className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200"
            role="group"
            aria-label="Velocidad de respuesta del asistente"
          >
            <button
              type="button"
              onClick={() => setChatMode('balanced')}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                chatMode === 'balanced' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Detallado
            </button>
            <button
              type="button"
              onClick={() => setChatMode('fast')}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                chatMode === 'fast' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-600" aria-hidden="true" />
              <span>Baja latencia</span>
            </button>
          </div>
        </div>

        {/* Scrollable multi-turn history */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-neutral-950 text-white rounded-br-md'
                      : 'bg-white border border-neutral-200 text-neutral-900 rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          {chatLoading && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Escribiendo respuesta...</span>
            </div>
          )}
          {chatError && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {chatError}
            </div>
          )}
        </div>

        {/* Starter suggestions & input */}
        <div className="p-3.5 border-t border-neutral-200 bg-white space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STARTER_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendChat(q)}
                className="min-h-[34px] px-3 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs text-neutral-700 whitespace-nowrap shrink-0 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pregunta sobre tarifas, rutas o reglas de DePaso..."
              aria-label="Consulta para el asistente DePaso"
              className="flex-1 h-11 px-3.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-950 focus:outline-none focus:bg-white focus:border-neutral-950"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              aria-label="Enviar consulta al asistente"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* High-Quality Image Studio (gemini-3-pro-image-preview with 1K, 2K, 4K) */}
      <section className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
            <ImagePlus className="w-4 h-4 text-neutral-900" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-neutral-950">Estudio de Fotos · Aquí Ya</h2>
            <p className="text-xs text-neutral-500">
              Crea fotografías limpias de estudio para tus snacks, café o artículos del campus.
            </p>
          </div>
        </div>

        <form onSubmit={handleGeneratePhoto} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="studio-photo-prompt" className="block text-xs font-medium text-neutral-700">
              Describe tu producto
            </label>
            <textarea
              id="studio-photo-prompt"
              rows={3}
              value={photoPrompt}
              onChange={(e) => setPhotoPrompt(e.target.value)}
              placeholder="ej. Combo de 2 empanadas de viento recién fritas con vaso de morocho caliente"
              className="w-full p-3 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-950 focus:outline-none focus:bg-white focus:border-neutral-950 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-neutral-700">Resolución de imagen</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setImageSize(sz)}
                    className={`min-h-[34px] rounded-lg text-xs font-mono-num font-semibold transition-colors ${
                      imageSize === sz ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-neutral-700">Formato</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                {(['4:3', '1:1', '16:9'] as const).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAspectRatio(ar)}
                    className={`min-h-[34px] rounded-lg text-xs font-mono-num font-semibold transition-colors ${
                      aspectRatio === ar ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {photoError && (
            <div
              role="alert"
              className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {photoError}
            </div>
          )}

          <button
            type="submit"
            disabled={photoLoading || !photoPrompt.trim()}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            {photoLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando imagen {imageSize}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generar foto ({imageSize})</span>
              </>
            )}
          </button>
        </form>

        {generatedUrl && (
          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            <img
              src={generatedUrl}
              alt={photoPrompt}
              referrerPolicy="no-referrer"
              className="w-full rounded-xl border border-neutral-200 object-cover max-h-60"
            />
            <button
              type="button"
              onClick={() => onUseGeneratedPhotoInItem(generatedUrl, photoPrompt)}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-950 transition-colors"
            >
              Usar esta foto para publicar en Aquí Ya
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
