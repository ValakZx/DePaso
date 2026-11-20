import React, {useEffect, useRef, useState} from 'react';
import {Camera, Clock, Lock, MessageCircle, Phone, Send, X} from 'lucide-react';
import {CHAT_AUTO_PURGE_HOURS} from '../domain/rules';
import {ChatMessage, DeliveryOrder, UserRoleView} from '../domain/types';

interface EphemeralChatDrawerProps {
  open: boolean;
  onClose: () => void;
  order: DeliveryOrder;
  messages: ChatMessage[];
  viewerRole: UserRoleView;
  userWhatsapp?: string;
  onSendMessage: (
    text: string,
    options?: {imageUrl?: string; imageLabel?: string; whatsappShared?: string},
  ) => void;
}

const QUICK_REPLIES = ['Ya lo compré', 'Voy en camino', 'Ya llegué'];

export const EphemeralChatDrawer: React.FC<EphemeralChatDrawerProps> = ({
  open,
  onClose,
  order,
  messages,
  viewerRole,
  userWhatsapp,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isReadOnly = order.status === 'delivered' || order.status === 'cancelled';

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  if (!open) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isReadOnly) return;
    onSendMessage(draft);
    setDraft('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isReadOnly) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSendMessage(
          viewerRole === 'buyer' ? 'Adjunto captura de comprobante Deuna.' : 'Adjunto foto del producto / factura.',
          {
            imageUrl: reader.result,
            imageLabel: viewerRole === 'buyer' ? 'Comprobante Deuna' : 'Foto de recibo / producto',
          },
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleShareWhatsapp = () => {
    if (isReadOnly) return;
    const number = userWhatsapp || '+593 99 412 8830';
    onSendMessage(`Comparto mi WhatsApp de respaldo para coordinar punto exacto: ${number}`, {
      whatsappShared: number,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ephemeral-chat-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end bg-black/45 backdrop-blur-xs"
    >
      <div className="w-full sm:max-w-md h-[86vh] sm:h-full bg-white sm:border-l border-neutral-200 rounded-t-3xl sm:rounded-none flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-neutral-200 flex items-center justify-between gap-3 bg-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-neutral-900 shrink-0" aria-hidden="true" />
              <h2 id="ephemeral-chat-title" className="font-display text-sm font-bold text-neutral-950 truncate">
                Chat del pedido · {viewerRole === 'buyer' ? order.courierName || 'Repartidor' : order.buyerName}
              </h2>
            </div>
            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5 truncate">
              <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Efímero · Se auto-purga en {CHAT_AUTO_PURGE_HOURS}h tras entrega</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar chat del pedido"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message thread */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
          {messages.map((msg) => {
            if (msg.senderRole === 'system') {
              return (
                <div key={msg.id} className="text-center px-3 py-2 rounded-xl bg-neutral-100 border border-neutral-200">
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{msg.text}</p>
                </div>
              );
            }

            const isOwn = msg.senderRole === viewerRole;
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-neutral-500 mb-1 px-1">
                  {msg.senderName} ·{' '}
                  {new Date(msg.createdAt).toLocaleTimeString('es-EC', {hour: '2-digit', minute: '2-digit'})}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed space-y-2 ${
                    isOwn
                      ? 'bg-neutral-950 text-white rounded-br-md'
                      : 'bg-white border border-neutral-200 text-neutral-900 rounded-bl-md'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.imageUrl && (
                    <div className="space-y-1">
                      <img
                        src={msg.imageUrl}
                        alt={msg.imageLabel || 'Comprobante adjunto'}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-44 object-cover rounded-xl border border-black/10"
                      />
                      {msg.imageLabel && (
                        <p className={`text-[10px] ${isOwn ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {msg.imageLabel}
                        </p>
                      )}
                    </div>
                  )}
                  {msg.whatsappShared && (
                    <div
                      className={`text-xs font-mono-num pt-1 border-t ${
                        isOwn ? 'border-white/15 text-emerald-300' : 'border-neutral-100 text-emerald-700'
                      }`}
                    >
                      WhatsApp: {msg.whatsappShared}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        {isReadOnly ? (
          <div className="px-4 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-center gap-2 text-xs text-neutral-600">
            <Lock className="w-3.5 h-3.5 text-neutral-500" aria-hidden="true" />
            <span>Pedido cerrado · Chat en modo solo lectura (purga automática en 72h).</span>
          </div>
        ) : (
          <div className="p-3.5 border-t border-neutral-200 bg-white space-y-2.5 pb-safe">
            {/* Quick replies + WhatsApp backup */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => onSendMessage(reply)}
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-medium text-neutral-800 whitespace-nowrap shrink-0 transition-colors"
                >
                  {reply}
                </button>
              ))}
              <button
                type="button"
                onClick={handleShareWhatsapp}
                className="min-h-[34px] px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium text-emerald-800 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
              >
                <Phone className="w-3 h-3" aria-hidden="true" />
                <span>Compartir mi WhatsApp</span>
              </button>
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Subir foto de recibo o comprobante Deuna"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Adjuntar foto de recibo o comprobante Deuna"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 shrink-0 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe un mensaje..."
                aria-label="Mensaje del chat del pedido"
                className="flex-1 h-11 px-3.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-950"
              />

              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Enviar mensaje"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white shrink-0 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
