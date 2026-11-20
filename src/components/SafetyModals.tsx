import React, {useState} from 'react';
import {AlertTriangle, Landmark, ShieldAlert, X} from 'lucide-react';

interface DeunaOnboardingModalProps {
  open: boolean;
  initialAccount?: string;
  initialWhatsapp?: string;
  onClose: () => void;
  onSave: (deunaAccount: string, whatsappNumber?: string) => {ok: boolean; error?: string};
}

export const DeunaOnboardingModal: React.FC<DeunaOnboardingModalProps> = ({
  open,
  initialAccount = '',
  initialWhatsapp = '',
  onClose,
  onSave,
}) => {
  const [account, setAccount] = useState(initialAccount);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onSave(account, whatsapp);
    if (!res.ok) {
      setError(res.error || 'Ingresa un dato válido.');
      return;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deuna-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <h2 id="deuna-modal-title" className="font-display text-base font-bold text-neutral-950">
                Configura tu Deuna para cobrar
              </h2>
              <p className="text-xs text-neutral-500">Solo te lo pedimos la primera vez que aceptas llevar un pedido.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración Deuna"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="deuna-account-input" className="block text-xs font-medium text-neutral-700">
              Cuenta Banco Pichincha o celular Deuna
            </label>
            <input
              id="deuna-account-input"
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="ej. 2205123490 · Banco Pichincha o 0991234567"
              className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 focus:border-neutral-950"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="deuna-whatsapp-input" className="block text-xs font-medium text-neutral-700">
              WhatsApp de respaldo (opcional, solo se comparte si tú lo eliges)
            </label>
            <input
              id="deuna-whatsapp-input"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+593 99 000 0000"
              className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 focus:border-neutral-950"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-950 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Guardar y continuar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface OpenPackageWarningModalProps {
  open: boolean;
  routeLabel: string;
  orderTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const OpenPackageWarningModal: React.FC<OpenPackageWarningModalProps> = ({
  open,
  routeLabel,
  orderTitle,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-package-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-700" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 id="open-package-title" className="font-display text-base font-bold text-neutral-950">
              Aviso obligatorio de seguridad ({routeLabel})
            </h2>
            <p className="text-xs text-neutral-500 truncate">{orderTitle}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-950 leading-relaxed">
            "Por tu seguridad, nunca recibas paquetes sellados sin verificar su contenido."
          </p>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Al aceptar este encargo en ruta larga confirmas que revisarás visualmente el contenido junto a quien entrega
          el paquete y que no transportarás artículos prohibidos.
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-950 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            Entendido, aceptar encargo
          </button>
        </div>
      </div>
    </div>
  );
};
