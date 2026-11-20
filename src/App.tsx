import React, {useMemo, useState} from 'react';
import {
  Bot,
  Compass,
  Package,
  Plus,
  ShieldCheck,
  User,
} from 'lucide-react';
import {ActiveOrderView} from './components/ActiveOrderView';
import {AssistantAndStudioView} from './components/AssistantAndStudioView';
import {DualFeedView} from './components/DualFeedView';
import {LegalTermsModal} from './components/LegalTermsModal';
import {MoodleLoginScreen} from './components/MoodleLoginScreen';
import {OfflineStatusBanner, PWABanner} from './components/PWABanner';
import {ProfileView} from './components/ProfileView';
import {PublishMode, QuickPublishSheet} from './components/QuickPublishSheet';
import {DeunaOnboardingModal, OpenPackageWarningModal} from './components/SafetyModals';
import {getRouteConfig, ROUTES} from './domain/routes';
import {formatUsd} from './domain/rules';
import {DeliveryOrder} from './domain/types';
import {useDePasoStore} from './store/useDePasoStore';

type AppSection = 'explorar' | 'activos' | 'asistente' | 'perfil';

export default function App() {
  const store = useDePasoStore();
  const [section, setSection] = useState<AppSection>('explorar');
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<PublishMode>('order');
  const [deunaModalOpen, setDeunaModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Pending accept flow states (lazy Deuna onboarding + Ibarra/Quito open-package safety confirmation)
  const [pendingAcceptOrder, setPendingAcceptOrder] = useState<DeliveryOrder | null>(null);
  const [openPackageOrder, setOpenPackageOrder] = useState<DeliveryOrder | null>(null);

  const activeOrders = useMemo(
    () => store.appState.orders.filter((o) => o.status !== 'open' && o.status !== 'cancelled'),
    [store.appState.orders],
  );

  const totalUnreadChats = useMemo(() => {
    let count = 0;
    for (const order of activeOrders) {
      const msgs = store.appState.chats[order.id] ?? [];
      count += msgs.filter((m) => (store.roleView === 'buyer' ? !m.readByBuyer : !m.readByCourier)).length;
    }
    return count;
  }, [activeOrders, store.appState.chats, store.roleView]);

  if (!store.currentUser) {
    return (
      <>
        <MoodleLoginScreen profiles={store.appState.profiles} onLogin={store.loginWithMoodle} />
        <OfflineStatusBanner />
      </>
    );
  }

  const currentUser = store.currentUser;

  const openPublish = (mode: PublishMode) => {
    setPublishMode(mode);
    setPublishOpen(true);
  };

  const executeAccept = (order: DeliveryOrder, openPackageAck: boolean) => {
    const res = store.acceptOrder(order.id, order.version, openPackageAck);
    if (!res.ok && res.error === 'NEEDS_DEUNA_ONBOARDING') {
      setPendingAcceptOrder({...order, openPackageAcknowledged: openPackageAck});
      setDeunaModalOpen(true);
      return;
    }
    if (res.ok && res.order) {
      setSelectedActiveOrderId(res.order.id);
      store.setRoleView('courier');
      setSection('activos');
    }
  };

  const handleRequestAcceptOrder = (order: DeliveryOrder) => {
    const route = getRouteConfig(order.routeId);
    if (route.requiresOpenPackageWarning) {
      setOpenPackageOrder(order);
      return;
    }
    executeAccept(order, false);
  };

  const handleConfirmOpenPackage = () => {
    if (!openPackageOrder) return;
    const target = openPackageOrder;
    setOpenPackageOrder(null);
    executeAccept(target, true);
  };

  const handleSaveDeuna = (account: string, whatsapp?: string) => {
    const res = store.saveDeunaAccount(account, whatsapp);
    if (res.ok && pendingAcceptOrder) {
      const pending = pendingAcceptOrder;
      setPendingAcceptOrder(null);
      // Defer slightly so state updates with new deunaAccount before retrying accept
      window.setTimeout(() => {
        store.notify('Deuna lista. Toca "Aceptar" nuevamente para confirmar el encargo.', 'success');
      }, 60);
    }
    return res;
  };

  const handleUseGeneratedPhoto = (imageUrl: string, prompt: string) => {
    const title = prompt.trim().slice(0, 60) || 'Producto del campus';
    store.createCampusItem({
      title,
      description: 'Publicado con foto de estudio desde Asistente DePaso.',
      price: 2.5,
      location: 'Residencias Multis',
      stock: 3,
      category: 'Café & Snacks',
      imageUrl,
    });
    setSection('explorar');
  };

  const navItems: {id: AppSection; label: string; icon: React.ComponentType<{className?: string}>; badge?: number}[] =
    [
      {id: 'explorar', label: 'Explorar', icon: Compass},
      {id: 'activos', label: 'Activos', icon: Package, badge: activeOrders.length},
      {id: 'asistente', label: 'Asistente', icon: Bot},
      {id: 'perfil', label: 'Perfil', icon: User},
    ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 flex flex-col">
      {/* Strict 3-Zone Top Navigation Header (52px mobile / 56px desktop) */}
      <header className="sticky top-0 z-30 h-[52px] sm:h-14 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setSection('explorar')}
            className="flex items-center gap-2 whitespace-nowrap shrink-0 text-left"
          >
            <img src="/icon.svg" alt="" className="w-6 h-6 rounded-md" aria-hidden="true" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-neutral-950">
              DePaso
            </span>
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links (Desktop) */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    active
                      ? 'text-neutral-950 border-neutral-950'
                      : 'text-neutral-500 border-transparent hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 ? ` (${item.badge})` : ''}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => openPublish('order')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Publicar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {section === 'asistente' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-950">
                Asistente y Estudio de Fotos
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600">
                Resuelve dudas sobre tarifas, pagos Deuna o genera fotografías de estudio 1K/2K/4K para Aquí Ya.
              </p>
            </div>
            <AssistantAndStudioView onUseGeneratedPhotoInItem={handleUseGeneratedPhoto} />
          </div>
        ) : section === 'perfil' ? (
          <div className="space-y-4">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-950">Tu perfil estudiantil</h1>
            <ProfileView
              currentUser={currentUser}
              profiles={store.appState.profiles}
              roleView={store.roleView}
              onChangeRoleView={store.setRoleView}
              onSwitchProfile={store.switchDemoProfile}
              onOpenDeunaModal={() => setDeunaModalOpen(true)}
              onOpenTerms={() => setTermsModalOpen(true)}
              onResetDemo={store.resetDemo}
              onLogout={store.logout}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Primary Feed or Active Order Column */}
            <div className="lg:col-span-8 space-y-4">
              {section === 'explorar' && (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-950">
                        Tablón en tiempo real
                      </h1>
                      <p className="text-xs sm:text-sm text-neutral-500">
                        {currentUser.realName} · {currentUser.semester} · Nivel {currentUser.trustLevel}
                      </p>
                    </div>
                  </div>
                  <div className="lg:hidden">
                    <PWABanner compact />
                  </div>
                  <DualFeedView
                    orders={store.appState.orders}
                    trips={store.appState.trips}
                    campusItems={store.appState.campusItems}
                    currentUser={currentUser}
                    roleView={store.roleView}
                    now={store.now}
                    onBoostOrder={store.boostOrderFee}
                    onRequestAcceptOrder={handleRequestAcceptOrder}
                    onJoinTrip={store.joinTrip}
                    onReserveItem={(itemId) => {
                      store.reserveCampusItem(itemId);
                      store.setRoleView('buyer');
                      setSection('activos');
                    }}
                    onReportListing={store.reportListing}
                    onOpenPublish={openPublish}
                  />
                </>
              )}

              {section === 'activos' && (
                <>
                  <div className="space-y-1">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-950">
                      Pedido activo P2P
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-500">
                      Flujo directo sin escrow · Chat efímero con comprobantes Deuna y PIN presencial.
                    </p>
                  </div>
                  <ActiveOrderView
                    orders={store.appState.orders}
                    chats={store.appState.chats}
                    currentUser={currentUser}
                    roleView={store.roleView}
                    onChangeRoleView={store.setRoleView}
                    now={store.now}
                    selectedOrderId={selectedActiveOrderId}
                    onSelectOrderId={setSelectedActiveOrderId}
                    onSubmitReceipt={store.submitReceiptAndPurchase}
                    onUploadDeunaProof={store.approvePriceAndUploadDeuna}
                    onStartRoute={store.confirmDeunaAndStartRoute}
                    onMarkArrived={store.markArrived}
                    onVerifyPin={store.completeDeliveryWithPin}
                    onCancelOrder={store.cancelOrder}
                    onRateOrder={store.submitMutualRating}
                    onSendChat={store.sendOrderChatMessage}
                    onMarkChatRead={store.markChatRead}
                    onNotify={store.notify}
                  />
                </>
              )}
            </div>

            {/* Contextual Desktop Right Rail (Full Desktop Presence) */}
            <aside className="hidden lg:block lg:col-span-4 space-y-4 sticky top-20">
              <PWABanner compact />

              {/* Quick Demo Role & Active Orders Card */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-neutral-950">{currentUser.realName}</p>
                    <p className="text-[11px] text-neutral-500">
                      {currentUser.semester} · Nivel {currentUser.trustLevel} · {currentUser.rating.toFixed(2)}★
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('perfil')}
                    className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 underline underline-offset-2"
                  >
                    Perfil
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                  <button
                    type="button"
                    onClick={() => store.setRoleView('courier')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      store.roleView === 'courier' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
                    }`}
                  >
                    Repartidor
                  </button>
                  <button
                    type="button"
                    onClick={() => store.setRoleView('buyer')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      store.roleView === 'buyer' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600'
                    }`}
                  >
                    Comprador
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-600">
                    {activeOrders.length} pedido{activeOrders.length === 1 ? '' : 's'} activo
                    {activeOrders.length === 1 ? '' : 's'}
                    {totalUnreadChats > 0 ? ` · ${totalUnreadChats} msg` : ''}
                  </span>
                  {section === 'activos' ? (
                    <button
                      type="button"
                      onClick={() => setSection('explorar')}
                      className="font-semibold text-neutral-950 hover:text-emerald-700"
                    >
                      Ver tablón →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSection('activos')}
                      className="font-semibold text-neutral-950 hover:text-emerald-700"
                    >
                      Ir a Activos →
                    </button>
                  )}
                </div>
              </div>

              {/* Fixed Routes Tariff Reference */}
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-neutral-950">Tarifas sugeridas (USD)</h2>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="divide-y divide-neutral-100">
                  {ROUTES.map((r) => (
                    <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">{r.label}</p>
                        <p className="text-[11px] text-neutral-500 truncate">{r.paymentRuleSummary}</p>
                      </div>
                      <span className="font-mono-num font-semibold text-neutral-950 shrink-0">
                        {formatUsd(r.minFee)}–{formatUsd(r.maxFee)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (<= 15% sticky aggregate height with 52px top bar) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`h-full flex flex-col items-center justify-center gap-1 relative transition-colors ${
                  active ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-neutral-950 text-white text-[10px] font-mono-num font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      {store.toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-sm z-50 px-4 py-3 rounded-xl text-xs font-semibold shadow-lg border ${
            store.toast.tone === 'success'
              ? 'bg-neutral-950 text-white border-neutral-800'
              : store.toast.tone === 'warning'
                ? 'bg-amber-50 text-amber-950 border-amber-300'
                : store.toast.tone === 'error'
                  ? 'bg-red-50 text-red-900 border-red-300'
                  : 'bg-white text-neutral-950 border-neutral-200'
          }`}
        >
          {store.toast.message}
        </div>
      )}

      {/* Modals & Sheets */}
      <QuickPublishSheet
        open={publishOpen}
        initialMode={publishMode}
        currentUser={currentUser}
        onClose={() => setPublishOpen(false)}
        onCreateOrder={(input) => {
          const res = store.createOrder(input);
          if (res.ok) setSection('explorar');
          return res;
        }}
        onCreateTrip={(input) => {
          const res = store.createTravelerTrip(input);
          if (res.ok) setSection('explorar');
          return res;
        }}
        onCreateItem={(input) => {
          const res = store.createCampusItem(input);
          if (res.ok) setSection('explorar');
          return res;
        }}
      />

      <DeunaOnboardingModal
        open={deunaModalOpen}
        initialAccount={currentUser.deunaAccount}
        initialWhatsapp={currentUser.whatsappNumber}
        onClose={() => {
          setDeunaModalOpen(false);
          setPendingAcceptOrder(null);
        }}
        onSave={handleSaveDeuna}
      />

      <OpenPackageWarningModal
        open={Boolean(openPackageOrder)}
        routeLabel={openPackageOrder ? getRouteConfig(openPackageOrder.routeId).label : ''}
        orderTitle={openPackageOrder?.title || ''}
        onCancel={() => setOpenPackageOrder(null)}
        onConfirm={handleConfirmOpenPackage}
      />

      <LegalTermsModal open={termsModalOpen} onClose={() => setTermsModalOpen(false)} />

      <OfflineStatusBanner />
    </div>
  );
}
