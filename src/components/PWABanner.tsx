import React, {useState} from 'react';
import {Bell, Download, PlusSquare, Share, Smartphone, WifiOff, X} from 'lucide-react';
import {useOnlineStatus, usePWAInstall} from '../hooks/usePWAInstall';

interface PWABannerProps {
  compact?: boolean;
}

export const PWABanner: React.FC<PWABannerProps> = ({compact = false}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) return null;

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <div
        className={`bg-white border border-neutral-200 rounded-2xl ${
          compact ? 'p-3.5 space-y-2.5' : 'px-4 py-3.5 flex items-center justify-between gap-3'
        }`}
      >
        <div className="flex items-start justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-neutral-900" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-950 leading-tight">
                {isIOS ? 'Instala DePaso en iPhone' : 'Instala DePaso (PWA)'}
              </p>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Activa Web Push para alertas de "Ya llegué" y chat.
              </p>
            </div>
          </div>

          {compact && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Ocultar aviso de instalación PWA"
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`flex items-center gap-1.5 shrink-0 ${compact ? 'w-full' : ''}`}>
          <button
            type="button"
            onClick={handleAction}
            className={`${
              compact ? 'w-full justify-center' : ''
            } min-h-[38px] px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors`}
          >
            {isInstallable ? (
              <>
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Instalar App</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isIOS ? 'Ver guía iOS (2 pasos)' : 'Instalar y activar Push'}</span>
              </>
            )}
          </button>
          {!compact && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Ocultar aviso de instalación PWA"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-pwa-guide-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="ios-pwa-guide-title" className="font-display text-base font-bold text-neutral-950">
                Instala DePaso y activa Push
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Cerrar guía de instalación"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              En iOS (Safari) y navegadores móviles, agregar DePaso a tu pantalla de inicio habilita las alertas Push
              en segundo plano cuando tu repartidor toca <strong>"Ya llegué"</strong>.
            </p>

            <ol className="space-y-3 text-sm text-neutral-800">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <Share className="w-4 h-4 text-neutral-900 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-neutral-950">Paso 1 · Toca Compartir</p>
                  <p className="text-xs text-neutral-600">En la barra inferior de Safari (o menú ⋮ en Chrome Android).</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <PlusSquare className="w-4 h-4 text-neutral-900 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-neutral-950">Paso 2 · Agregar a pantalla de inicio</p>
                  <p className="text-xs text-neutral-600">Confirma "DePaso" y ábrela desde tu inicio para activar notificaciones.</p>
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineStatusBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>Sin señal estable — Usando estado local. Se sincronizará automáticamente al volver.</span>
    </div>
  );
};
