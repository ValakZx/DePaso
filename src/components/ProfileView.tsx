import React from 'react';
import {
  Award,
  CheckCircle2,
  Landmark,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import {LEVEL_1_MAX_PRODUCT_COST, LEVEL_2_MIN_DELIVERIES} from '../domain/rules';
import {StudentProfile, UserRoleView} from '../domain/types';

interface ProfileViewProps {
  currentUser: StudentProfile;
  profiles: StudentProfile[];
  roleView: UserRoleView;
  onChangeRoleView: (role: UserRoleView) => void;
  onSwitchProfile: (profileId: string) => void;
  onOpenDeunaModal: () => void;
  onOpenTerms: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  profiles,
  roleView,
  onChangeRoleView,
  onSwitchProfile,
  onOpenDeunaModal,
  onOpenTerms,
  onResetDemo,
  onLogout,
}) => {
  const deliveriesToLevel2 = Math.max(0, LEVEL_2_MIN_DELIVERIES - currentUser.completedDeliveries);
  const progressPct = Math.min(100, Math.round((currentUser.completedDeliveries / LEVEL_2_MIN_DELIVERIES) * 100));

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Identity & Reputation Summary */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>Identidad verificada vía Moodle · @{currentUser.moodleUsername}</span>
            </p>
            <h2 className="font-display text-2xl font-bold text-neutral-950">{currentUser.realName}</h2>
            <p className="text-sm text-neutral-600">
              {currentUser.semester} · Nivel de confianza {currentUser.trustLevel}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>

        {/* Quantitative Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100">
          <div>
            <p className="text-xs text-neutral-500">Calificación</p>
            <p className="text-xl font-bold text-neutral-950 font-mono-num flex items-center gap-1 mt-0.5">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" aria-hidden="true" />
              <span>{currentUser.rating.toFixed(2)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Entregas</p>
            <p className="text-xl font-bold text-neutral-950 font-mono-num mt-0.5">
              {currentUser.completedDeliveries}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Cumplimiento</p>
            <p className="text-xl font-bold text-emerald-700 font-mono-num mt-0.5">
              {currentUser.fulfillmentRate}%
            </p>
          </div>
        </div>
      </section>

      {/* Progressive Trust Level Card */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-neutral-900" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-neutral-950">
              Nivel progresivo de confianza · Nivel {currentUser.trustLevel}
            </h3>
          </div>
          <span className="text-xs font-mono-num text-neutral-600">
            {Math.min(currentUser.completedDeliveries, LEVEL_2_MIN_DELIVERIES)}/{LEVEL_2_MIN_DELIVERIES} entregas
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              currentUser.trustLevel === 2 ? 'bg-emerald-600' : 'bg-neutral-950'
            }`}
            style={{width: `${progressPct}%`}}
          />
        </div>

        {currentUser.trustLevel === 2 ? (
          <p className="text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Nivel 2 desbloqueado: acceso completo a compras &gt; ${LEVEL_1_MAX_PRODUCT_COST.toFixed(2)} USD y rutas
              Ibarra / Quito.
            </span>
          </p>
        ) : (
          <p className="text-xs text-neutral-600 leading-relaxed">
            Nivel 1 activo (límite sugerido de ${LEVEL_1_MAX_PRODUCT_COST.toFixed(2)} USD en Multis y Urcuquí). Te
            faltan <strong className="text-neutral-950">{deliveriesToLevel2}</strong> entregas exitosas sin reportes
            para desbloquear Nivel 2 (montos mayores y rutas Ibarra/Quito).
          </p>
        )}
      </section>

      {/* Lazy Onboarding Deuna Account Card */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4 text-neutral-900" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-950">Cuenta Deuna (Banco Pichincha)</h3>
            <p className="text-xs text-neutral-600 font-mono-num mt-0.5">
              {currentUser.deunaAccount || 'Aún no configurada (se solicita al aceptar tu primer encargo)'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenDeunaModal}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-950 transition-colors"
        >
          {currentUser.deunaAccount ? 'Actualizar cuenta' : 'Configurar Deuna'}
        </button>
      </section>

      {/* Discrete MVP Demo / Testing Controls */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="font-display text-sm font-bold text-neutral-950">
            Controles de prueba de flujo completo (MVP)
          </h3>
          <p className="text-xs text-neutral-500">
            Alterna entre vista Comprador / Repartidor o cambia de perfil estudiantil para probar todos los escenarios en
            el navegador.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-700">Rol activo en pantalla de pedidos</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeRoleView('courier')}
              className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                roleView === 'courier'
                  ? 'border-neutral-950 bg-neutral-950 text-white'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700'
              }`}
            >
              Vista Repartidor
            </button>
            <button
              type="button"
              onClick={() => onChangeRoleView('buyer')}
              className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                roleView === 'buyer'
                  ? 'border-neutral-950 bg-neutral-950 text-white'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700'
              }`}
            >
              Vista Comprador
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-700">Cambiar cuenta Moodle simulada</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {profiles.map((p) => {
              const active = p.id === currentUser.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSwitchProfile(p.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    active
                      ? 'border-neutral-950 bg-neutral-950 text-white'
                      : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 text-neutral-900'
                  }`}
                >
                  <p className="text-xs font-semibold truncate">{p.realName}</p>
                  <p className={`text-[11px] truncate ${active ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {p.semester} · Nivel {p.trustLevel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenTerms}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Términos y deslinde legal (Ecuador)</span>
          </button>
          <button
            type="button"
            onClick={onResetDemo}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restaurar datos demo</span>
          </button>
        </div>
      </section>
    </div>
  );
};
