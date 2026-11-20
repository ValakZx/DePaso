import React from 'react';
import {ShieldCheck, X} from 'lucide-react';

interface LegalTermsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({open, onClose, onAccept}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 shadow-xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-neutral-900 shrink-0" aria-hidden="true" />
            <h2 id="terms-modal-title" className="text-base font-semibold text-neutral-950">
              Términos, Condiciones y Deslinde Legal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar términos y condiciones"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4 text-sm text-neutral-700 leading-relaxed">
          <p className="text-neutral-900 font-medium">
            Jurisdicción: República del Ecuador · Plataforma P2P comunitaria independiente.
          </p>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-neutral-950">1. Naturaleza de tablón de contacto</h3>
            <p>
              DePaso funciona exclusivamente como un tablón digital de contacto entre particulares mayores de edad o
              estudiantes verificados mediante credenciales institucionales. DePaso no es una empresa de transporte,
              mensajería ni intermediario financiero.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-neutral-950">2. Pagos directos P2P sin custodia</h3>
            <p>
              La plataforma no recibe, retiene, custodia ni intermedia dinero. Todo pago por productos o tarifas de
              envío se acuerda y ejecuta directamente entre las partes vía Deuna (Banco Pichincha) o efectivo.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-neutral-950">3. Artículos prohibidos y mayoría de edad (+18)</h3>
            <p>
              Queda estrictamente prohibido solicitar o transportar sustancias sujetas a fiscalización, armas, objetos
              ilícitos o paquetes sellados sin verificación previa. Cualquier encargo que incluya bebidas alcohólicas
              requiere mayoría de edad (+18) conforme a la ley ecuatoriana.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-neutral-950">4. Verificación y responsabilidad</h3>
            <p>
              DePaso no inspecciona físicamente los productos ni garantiza la calidad de terceros locales. En rutas
              intercantonales o interprovinciales (Ibarra y Quito), el repartidor debe verificar visualmente el
              contenido abierto antes de aceptarlo. La responsabilidad recae exclusivamente en comprador y repartidor.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-neutral-950">5. Privacidad y chats efímeros</h3>
            <p>
              Tu contraseña de Moodle nunca se almacena en texto plano; solo se verifica tu identidad real y nivel
              académico para una sesión segura de 30 días. Los chats de cada pedido pasan a solo lectura al entregarse
              y se purgan automáticamente a las 72 horas.
            </p>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-950 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Aceptar y continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
