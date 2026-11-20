import React, {useState} from 'react';
import {ArrowRight, Lock, ShieldCheck, UserCheck} from 'lucide-react';
import {ROUTES} from '../domain/routes';
import {StudentProfile} from '../domain/types';
import {LegalTermsModal} from './LegalTermsModal';
import {PWABanner} from './PWABanner';

interface MoodleLoginScreenProps {
  profiles: StudentProfile[];
  onLogin: (username: string, password: string, acceptedTerms: boolean) => {ok: boolean; error?: string};
}

export const MoodleLoginScreen: React.FC<MoodleLoginScreenProps> = ({profiles, onLogin}) => {
  const [username, setUsername] = useState('c.andrade');
  const [password, setPassword] = useState('moodle2026');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onLogin(username, password, acceptedTerms);
    if (!res.ok && res.error) {
      setError(res.error);
    }
  };

  const applyDemoProfile = (profile: StudentProfile) => {
    setUsername(profile.moodleUsername);
    setPassword('moodle2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 flex flex-col">
      <header className="w-full border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <img
              src="/icon.svg"
              alt="DePaso"
              className="w-7 h-7 rounded-lg"
            />
            <span className="font-display text-lg font-bold tracking-tight text-neutral-950">DePaso</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            <a href="#rutas-tarifas" className="hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0">
              Rutas y tarifas
            </a>
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0"
            >
              Deslinde legal
            </button>
          </nav>
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('moodle-username');
              input?.focus();
            }}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Ingresar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product value proposition & Ecuador fixed routes */}
        <section className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-neutral-500">
              Comunidad universitaria · Pagos directos en USD · Sin pasarela ni KYC
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 leading-[1.1] max-w-2xl">
              Encargos de camino entre estudiantes, a tarifa justa.
            </h1>
            <p className="text-base text-neutral-600 max-w-xl leading-relaxed">
              Conecta con compañeros que ya están bajando de Multis, Urcuquí, Ibarra o Quito. Negocia rápido, coordina
              por chat efímero y valida cada entrega presencial con PIN de 4 dígitos.
            </p>
          </div>

          <PWABanner />

          <div id="rutas-tarifas" className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-950">Rutas fijas y tarifas sugeridas</h2>
              <span className="text-xs text-neutral-500 font-mono-num">USD ($)</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {ROUTES.map((route) => (
                <div
                  key={route.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-950">{route.label}</p>
                    <p className="text-xs text-neutral-500">{route.typicalUse}</p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-950 font-mono-num">
                      ${route.minFee.toFixed(2)} – ${route.maxFee.toFixed(2)}
                    </p>
                    <p className="text-xs text-neutral-500">{route.paymentRuleSummary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Fast Moodle Login Card */}
        <section className="lg:col-span-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-bold text-neutral-950">Acceso con Moodle</h2>
              <p className="text-sm text-neutral-600">
                Verificamos tu nombre real y semestre sin formularios largos. Tu sesión dura 30 días.
              </p>
            </div>

            {/* Quick Demo Profile Selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500">Perfiles de prueba rápidos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profiles.slice(0, 2).map((profile) => {
                  const active = username.toLowerCase() === profile.moodleUsername.toLowerCase();
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => applyDemoProfile(profile)}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-colors min-h-[44px] ${
                        active
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      <p className="text-xs font-semibold truncate">{profile.realName}</p>
                      <p className={`text-[11px] truncate ${active ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {profile.semester} · Nivel {profile.trustLevel}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="moodle-username" className="block text-xs font-medium text-neutral-700">
                  Usuario de Moodle
                </label>
                <div className="relative">
                  <UserCheck
                    className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="moodle-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. c.andrade"
                    autoComplete="username"
                    className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 focus:border-neutral-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="moodle-password" className="block text-xs font-medium text-neutral-700">
                  Contraseña institucional
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="moodle-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-neutral-300 rounded-xl text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 focus:border-neutral-950"
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  No almacenamos tu contraseña. Tampoco te pediremos datos bancarios hasta que cobres tu primer encargo.
                </p>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input
                  id="accept-terms-checkbox"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  className="mt-0.5 h-5 w-5 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 shrink-0 cursor-pointer"
                />
                <label htmlFor="accept-terms-checkbox" className="text-xs text-neutral-600 leading-relaxed">
                  Acepto los{' '}
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className="font-semibold text-neutral-950 underline underline-offset-2 hover:text-neutral-700"
                  >
                    Términos, Condiciones y Deslinde Legal
                  </button>{' '}
                  de DePaso (tablón P2P entre particulares, +18 alcohol, cero sustancias ilícitas).
                </label>
              </div>

              {error && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:scale-[0.99] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Entrar con Moodle</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            <div className="pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>Identidad real verificada · Cero anonimato en el campus</span>
            </div>
          </div>
        </section>
      </main>

      <LegalTermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => setAcceptedTerms(true)}
      />
    </div>
  );
};
