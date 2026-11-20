import React, {useMemo, useRef, useState} from 'react';
import {
  AlertCircle,
  BellRing,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Lock,
  MessageCircle,
  PackageCheck,
  Star,
  Truck,
  Upload,
} from 'lucide-react';
import {getRouteConfig} from '../domain/routes';
import {canBuyerCancelOrder, formatCountdown, formatUsd} from '../domain/rules';
import {ChatMessage, DeliveryOrder, OrderStatus, StudentProfile, UserRoleView} from '../domain/types';
import {EphemeralChatDrawer} from './EphemeralChatDrawer';

interface ActiveOrderViewProps {
  orders: DeliveryOrder[];
  chats: Record<string, ChatMessage[]>;
  currentUser: StudentProfile;
  roleView: UserRoleView;
  onChangeRoleView: (role: UserRoleView) => void;
  now: number;
  selectedOrderId: string | null;
  onSelectOrderId: (id: string) => void;
  onSubmitReceipt: (orderId: string, photoUrl: string, adjustedCost?: number, note?: string) => void;
  onUploadDeunaProof: (orderId: string, proofUrl: string, reference: string) => void;
  onStartRoute: (orderId: string) => void;
  onMarkArrived: (orderId: string) => void;
  onVerifyPin: (orderId: string, pin: string) => {ok: boolean; error?: string};
  onCancelOrder: (orderId: string) => void;
  onRateOrder: (orderId: string, role: UserRoleView, stars: number) => void;
  onSendChat: (
    orderId: string,
    role: UserRoleView,
    text: string,
    options?: {imageUrl?: string; imageLabel?: string; whatsappShared?: string},
  ) => void;
  onMarkChatRead: (orderId: string, role: UserRoleView) => void;
  onNotify: (msg: string, tone?: 'neutral' | 'success' | 'warning' | 'error') => void;
}

const STEPS: {key: OrderStatus[]; label: string}[] = [
  {key: ['accepted'], label: 'Aceptado'},
  {key: ['purchased'], label: 'Comprado'},
  {key: ['en_route', 'arrived'], label: 'En camino'},
  {key: ['delivered'], label: 'Entregado'},
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'accepted') return 0;
  if (status === 'purchased') return 1;
  if (status === 'en_route' || status === 'arrived') return 2;
  if (status === 'delivered') return 3;
  return 0;
}

export const ActiveOrderView: React.FC<ActiveOrderViewProps> = ({
  orders,
  chats,
  currentUser,
  roleView,
  onChangeRoleView,
  now,
  selectedOrderId,
  onSelectOrderId,
  onSubmitReceipt,
  onUploadDeunaProof,
  onStartRoute,
  onMarkArrived,
  onVerifyPin,
  onCancelOrder,
  onRateOrder,
  onSendChat,
  onMarkChatRead,
  onNotify,
}) => {
  const activePoolOrders = useMemo(
    () => orders.filter((o) => o.status !== 'open' && o.status !== 'cancelled'),
    [orders],
  );

  const selectedOrder =
    activePoolOrders.find((o) => o.id === selectedOrderId) ?? activePoolOrders[0] ?? null;

  const [chatOpen, setChatOpen] = useState(false);
  const [adjustedCostInput, setAdjustedCostInput] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [deunaRef, setDeunaRef] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [hoverStars, setHoverStars] = useState(0);

  const receiptFileRef = useRef<HTMLInputElement | null>(null);
  const deunaFileRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (selectedOrder) {
      setAdjustedCostInput((selectedOrder.adjustedProductCost ?? selectedOrder.estimatedProductCost).toFixed(2));
      setPinError(null);
      setPinInput('');
    }
  }, [selectedOrder?.id]);

  if (!selectedOrder) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-2">
        <PackageCheck className="w-8 h-8 text-neutral-400 mx-auto" aria-hidden="true" />
        <h2 className="font-display text-base font-bold text-neutral-950">Sin pedidos activos ahora</h2>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Acepta un encargo desde el tablón o publica uno nuevo para ver el flujo estilo Binance P2P con chat efímero y
          PIN presencial.
        </p>
      </div>
    );
  }

  const route = getRouteConfig(selectedOrder.routeId);
  const stepIndex = getStepIndex(selectedOrder.status);
  const orderMessages = chats[selectedOrder.id] ?? [];
  const unreadCount = orderMessages.filter((m) =>
    roleView === 'buyer' ? !m.readByBuyer : !m.readByCourier,
  ).length;

  const stageRemainingMs = selectedOrder.stageDeadlineAt ? Math.max(0, selectedOrder.stageDeadlineAt - now) : 0;
  const arrivalRemainingMs = selectedOrder.arrivalDeadlineAt
    ? Math.max(0, selectedOrder.arrivalDeadlineAt - now)
    : 0;

  const finalProductCost = selectedOrder.adjustedProductCost ?? selectedOrder.estimatedProductCost;
  const isTwoStepDeuna = selectedOrder.paymentFlow === 'two_step_deuna';
  const cancelAllowed = canBuyerCancelOrder(selectedOrder.status);

  const handleOpenChat = () => {
    setChatOpen(true);
    onMarkChatRead(selectedOrder.id, roleView);
  };

  const handleReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSubmitReceipt(selectedOrder.id, reader.result, parseFloat(adjustedCostInput), receiptNote);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickDemoReceipt = () => {
    const sampleImg = selectedOrder.imageUrl || '/src/assets/images/bolon_verde_cafe_1795204121295.jpg';
    onSubmitReceipt(
      selectedOrder.id,
      sampleImg,
      parseFloat(adjustedCostInput || String(selectedOrder.estimatedProductCost)),
      receiptNote || 'Factura verificada en caja del local.',
    );
  };

  const handleDeunaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadDeunaProof(selectedOrder.id, reader.result, deunaRef);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickDemoDeuna = () => {
    const sampleProof = '/src/assets/images/campus_snacks_combo_1795204115529.jpg';
    onUploadDeunaProof(
      selectedOrder.id,
      sampleProof,
      deunaRef || `DEUNA-${Math.floor(100000 + Math.random() * 899999)}`,
    );
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const res = onVerifyPin(selectedOrder.id, pinInput);
    if (!res.ok) {
      setPinError(res.error || 'PIN inválido');
    }
  };

  const handleCopyDeuna = async () => {
    const text = selectedOrder.courierDeuna || '2204891120 · Banco Pichincha';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API may be unavailable in headless mode
    }
    onNotify('Cuenta Deuna copiada al portapapeles.', 'success');
  };

  const myRatingGiven =
    roleView === 'buyer' ? selectedOrder.buyerRatedCourier : selectedOrder.courierRatedBuyer;

  return (
    <div className="space-y-4 relative">
      {/* Multi-order Pool Switcher (Binance P2P / Pool support) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-neutral-700">
            Pedidos en curso ({activePoolOrders.length})
          </p>
          {/* Discrete role toggle on mobile/tablet (desktop has it in right rail) */}
          <div
            className="inline-flex lg:hidden items-center p-0.5 rounded-xl bg-neutral-100 border border-neutral-200"
            role="group"
            aria-label="Alternar vista comprador o repartidor"
          >
            <button
              type="button"
              onClick={() => onChangeRoleView('courier')}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                roleView === 'courier' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Vista Repartidor
            </button>
            <button
              type="button"
              onClick={() => onChangeRoleView('buyer')}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                roleView === 'buyer' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Vista Comprador
            </button>
          </div>
        </div>

        {activePoolOrders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {activePoolOrders.map((ord, idx) => {
              const isSelected = ord.id === selectedOrder.id;
              const ordUnread = (chats[ord.id] ?? []).filter((m) =>
                roleView === 'buyer' ? !m.readByBuyer : !m.readByCourier,
              ).length;
              return (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => onSelectOrderId(ord.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left transition-colors shrink-0 max-w-[240px] ${
                    isSelected
                      ? 'border-neutral-950 bg-neutral-950 text-white'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono-num opacity-75">Pedido #{idx + 1}</span>
                    {ordUnread > 0 && (
                      <span className="text-[10px] font-mono-num font-bold text-emerald-400">
                        {ordUnread} nuevo{ordUnread > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate">{ord.title}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Binance P2P Order Card with Top-Right Floating Chat Bubble */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 space-y-5 relative">
        {/* Top bar inside order card + Floating Chat Bubble (Top Right, Binance P2P style) */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 pr-20 sm:pr-28">
            <p className="text-xs text-neutral-500">
              {route.label} · {selectedOrder.origin} → {selectedOrder.destination}
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-neutral-950 leading-snug">
              {selectedOrder.title}
            </h2>
            <p className="text-xs text-neutral-600">{selectedOrder.details}</p>
          </div>

          {/* Floating Chat Bubble - Top Right */}
          <button
            type="button"
            onClick={handleOpenChat}
            data-testid="floating-chat-bubble"
            aria-label={`Abrir chat efímero del pedido${unreadCount > 0 ? `, ${unreadCount} mensajes sin leer` : ''}`}
            className="absolute top-4 right-4 min-h-[48px] min-w-[48px] px-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-semibold hidden sm:inline">Chat</span>
            {unreadCount > 0 && (
              <span
                data-testid="chat-unread-badge"
                className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-neutral-950 text-[11px] font-bold font-mono-num flex items-center justify-center"
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Clear 4-Step Progress Stepper + Stage Timer */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-950">
              Estado:{' '}
              {selectedOrder.status === 'accepted'
                ? 'Aceptado · En compra'
                : selectedOrder.status === 'purchased'
                  ? 'Comprado · Verificando pago'
                  : selectedOrder.status === 'en_route'
                    ? 'En camino al punto'
                    : selectedOrder.status === 'arrived'
                      ? 'Repartidor en punto de entrega'
                      : 'Entregado y verificado'}
            </span>
            {selectedOrder.status !== 'delivered' && (
              <span className="font-mono-num text-neutral-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                <span>Límite etapa: {formatCountdown(stageRemainingMs)}</span>
              </span>
            )}
          </div>

          <ol className="grid grid-cols-4 gap-2" aria-label="Progreso del pedido">
            {STEPS.map((step, idx) => {
              const completed = idx < stepIndex || selectedOrder.status === 'delivered';
              const active = idx === stepIndex && selectedOrder.status !== 'delivered';
              return (
                <li key={step.label} className="space-y-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      completed
                        ? 'bg-emerald-600'
                        : active
                          ? 'bg-neutral-950'
                          : 'bg-neutral-200'
                    }`}
                  />
                  <p
                    className={`text-[11px] font-medium truncate ${
                      completed || active ? 'text-neutral-950 font-semibold' : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Financial Summary Strip (100% P2P, no escrow) */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
          <div>
            <p className="text-[11px] text-neutral-500">Producto</p>
            <p className="text-base font-bold text-neutral-950 font-mono-num">
              {finalProductCost > 0 ? formatUsd(finalProductCost) : '$0.00'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-500">Tarifa envío</p>
            <p className="text-base font-bold text-emerald-700 font-mono-num">
              {formatUsd(selectedOrder.deliveryFee)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-500">Total P2P</p>
            <p className="text-base font-bold text-neutral-950 font-mono-num">
              {formatUsd(finalProductCost + selectedOrder.deliveryFee)}
            </p>
          </div>
        </div>

        {/* Counterparty & Deuna Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-y border-neutral-100 py-3">
          <div>
            <p className="text-neutral-500">
              {roleView === 'buyer' ? 'Repartidor verificado' : 'Comprador verificado'}
            </p>
            <p className="font-semibold text-neutral-950">
              {roleView === 'buyer'
                ? `${selectedOrder.courierName || 'Asignado'} · ${selectedOrder.courierSemester || ''}`
                : `${selectedOrder.buyerName} · ${selectedOrder.buyerSemester}`}
            </p>
          </div>
          {selectedOrder.courierDeuna && (
            <button
              type="button"
              onClick={handleCopyDeuna}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-mono-num text-neutral-800 inline-flex items-center gap-1.5"
            >
              <span>Deuna: {selectedOrder.courierDeuna}</span>
              <Copy className="w-3.5 h-3.5 text-neutral-500" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Arrival 5-minute Courtesy Timer Alert (Uber Eats style) */}
        {selectedOrder.status === 'arrived' && (
          <div
            role="status"
            data-testid="arrival-courtesy-banner"
            className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4"
          >
            <div className="flex items-start gap-2.5">
              <BellRing className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-amber-950">
                  {roleView === 'buyer'
                    ? 'Tu repartidor ya llegó al punto de entrega'
                    : 'Alerta "Ya llegué" activa'}
                </p>
                <p className="text-xs text-amber-800">
                  Reloj de cortesía de 5 minutos para bajar a recibir y validar con el PIN.
                </p>
              </div>
            </div>
            <span className="text-xl font-bold font-mono-num text-amber-950 shrink-0">
              {formatCountdown(arrivalRemainingMs)}
            </span>
          </div>
        )}

        {/* STAGE 1: ACCEPTED -> Courier buys product & uploads receipt/photo */}
        {selectedOrder.status === 'accepted' && (
          <div className="space-y-3">
            {roleView === 'courier' ? (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-neutral-950">
                    Paso 1: Confirma la compra en el local
                  </h3>
                  <p className="text-xs text-neutral-600">
                    {isTwoStepDeuna
                      ? 'Compra > $6: sube foto del producto o factura y ajusta el monto exacto para que el comprador transfiera el producto por Deuna.'
                      : 'Adjunta foto rápida del producto o confirma la compra para bloquear cancelaciones unilaterales.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label htmlFor="adjusted-cost" className="text-xs font-medium text-neutral-700">
                      Monto exacto en tienda (USD)
                    </label>
                    <input
                      id="adjusted-cost"
                      type="number"
                      step="0.05"
                      min="0"
                      value={adjustedCostInput}
                      onChange={(e) => setAdjustedCostInput(e.target.value)}
                      className="w-full h-10 px-3 text-sm font-mono-num bg-white border border-neutral-300 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="receipt-note" className="text-xs font-medium text-neutral-700">
                      Nota de factura (opcional)
                    </label>
                    <input
                      id="receipt-note"
                      type="text"
                      value={receiptNote}
                      onChange={(e) => setReceiptNote(e.target.value)}
                      placeholder="ej. Todo completo en farmacia"
                      className="w-full h-10 px-3 text-sm bg-white border border-neutral-300 rounded-xl"
                    />
                  </div>
                </div>

                <input
                  ref={receiptFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptFile}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickDemoReceipt}
                    className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span>Subir foto de factura y marcar Comprado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => receiptFileRef.current?.click()}
                    className="min-h-[46px] px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-800 inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Galería</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-neutral-950">Tu repartidor está adquiriendo el pedido</p>
                  <p className="text-xs text-neutral-600">
                    Recibirás la foto del producto/factura apenas lo compre en {selectedOrder.origin}.
                  </p>
                </div>
                {cancelAllowed && (
                  <button
                    type="button"
                    onClick={() => onCancelOrder(selectedOrder.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-xs font-semibold text-red-700 shrink-0"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: PURCHASED -> Two-step Deuna payment flow (> $6) or start route */}
        {selectedOrder.status === 'purchased' && (
          <div className="space-y-3">
            {selectedOrder.receiptPhotoUrl && (
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center gap-3">
                <img
                  src={selectedOrder.receiptPhotoUrl}
                  alt="Foto de factura o producto"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-neutral-950">
                    Foto de producto / factura adjunta · {formatUsd(finalProductCost)}
                  </p>
                  <p className="text-xs text-neutral-600">{selectedOrder.receiptNote}</p>
                </div>
              </div>
            )}

            {isTwoStepDeuna && !selectedOrder.deunaProofUrl ? (
              roleView === 'buyer' ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-950">
                      Pago en dos tiempos · Transfiere {formatUsd(finalProductCost)} por Deuna
                    </h3>
                    <p className="text-xs text-emerald-900">
                      Transfiere el costo del producto a la cuenta Deuna del repartidor y adjunta tu captura. La tarifa
                      de envío ({formatUsd(selectedOrder.deliveryFee)}) la pagas al recibir.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={deunaRef}
                    onChange={(e) => setDeunaRef(e.target.value)}
                    placeholder="Referencia Deuna (opcional, ej. DEUNA-482190)"
                    aria-label="Referencia de transferencia Deuna"
                    className="w-full h-10 px-3 text-sm font-mono-num bg-white border border-emerald-300 rounded-xl"
                  />
                  <input
                    ref={deunaFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDeunaFile}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickDemoDeuna}
                      className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>Aprobar monto y adjuntar comprobante Deuna</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deunaFileRef.current?.click()}
                      className="min-h-[46px] px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-semibold text-emerald-900"
                    >
                      Subir captura
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-xs font-semibold text-amber-950">
                    Esperando comprobante Deuna del comprador ({formatUsd(finalProductCost)}).
                  </p>
                  <p className="text-xs text-amber-800">
                    Puedes cambiar a "Vista Comprador" arriba para simular el envío del comprobante o salir ya en
                    camino.
                  </p>
                  <button
                    type="button"
                    onClick={() => onStartRoute(selectedOrder.id)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4" aria-hidden="true" />
                    <span>Iniciar viaje (En camino)</span>
                  </button>
                </div>
              )
            ) : (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                {selectedOrder.deunaProofUrl && (
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Comprobante Deuna recibido ({selectedOrder.deunaReference})</span>
                  </p>
                )}
                {roleView === 'courier' ? (
                  <button
                    type="button"
                    onClick={() => onStartRoute(selectedOrder.id)}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Truck className="w-4 h-4" aria-hidden="true" />
                    <span>Confirmar pago y marcar "En camino"</span>
                  </button>
                ) : (
                  <p className="text-xs text-neutral-600">
                    Comprobante enviado. Esperando a que el repartidor inicie el trayecto hacia {selectedOrder.destination}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STAGE 3: EN ROUTE OR ARRIVED -> "Ya llegué" button + 4-digit PIN verification */}
        {(selectedOrder.status === 'en_route' || selectedOrder.status === 'arrived') && (
          <div className="space-y-4">
            {roleView === 'buyer' ? (
              <div className="p-4 rounded-2xl bg-neutral-950 text-white flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Tu PIN presencial de entrega</span>
                  </p>
                  <p className="text-xs text-neutral-400">
                    Dicta este código de 4 dígitos al repartidor únicamente cuando tengas el encargo en mano.
                  </p>
                </div>
                <div
                  data-testid="buyer-delivery-pin"
                  className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 font-mono-num text-2xl font-bold tracking-[0.2em]"
                >
                  {selectedOrder.deliveryPin}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOrder.status === 'en_route' && (
                  <button
                    type="button"
                    onClick={() => onMarkArrived(selectedOrder.id)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <BellRing className="w-4 h-4" aria-hidden="true" />
                    <span>Ya llegué (iniciar reloj de cortesía 05:00)</span>
                  </button>
                )}

                <form
                  onSubmit={handlePinSubmit}
                  className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="pin-verify-input" className="text-xs font-semibold text-neutral-950">
                      Ingresar PIN de 4 dígitos del comprador
                    </label>
                    <span className="text-[11px] font-mono-num text-neutral-500">
                      PIN demo: {selectedOrder.deliveryPin}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="pin-verify-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="0000"
                      className="w-32 h-12 px-3 text-center text-lg font-mono-num font-bold tracking-[0.25em] bg-white border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                    />
                    <button
                      type="submit"
                      className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-colors"
                    >
                      Confirmar entrega
                    </button>
                  </div>
                  {pinError && (
                    <p role="alert" className="text-xs font-medium text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{pinError}</span>
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* STAGE 4: DELIVERED -> Mutual 1-5 Star Rating */}
        {selectedOrder.status === 'delivered' && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold">Entrega verificada con PIN</h3>
                <p className="text-xs text-emerald-800">
                  Pedido completado. Califica tu experiencia para actualizar el nivel de confianza en el campus.
                </p>
              </div>
            </div>

            {myRatingGiven ? (
              <p className="text-xs font-semibold text-emerald-900">
                Calificación enviada: {myRatingGiven} / 5 estrellas. ¡Gracias por fortalecer la comunidad!
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs font-medium text-emerald-950">
                  Calificar a {roleView === 'buyer' ? selectedOrder.courierName : selectedOrder.buyerName}:
                </span>
                <div className="flex items-center gap-1" role="group" aria-label="Calificar de 1 a 5 estrellas">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverStars(star)}
                      onMouseLeave={() => setHoverStars(0)}
                      onClick={() => onRateOrder(selectedOrder.id, roleView, star)}
                      aria-label={`Calificar con ${star} estrellas`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= hoverStars ? 'fill-amber-500 text-amber-500' : 'text-emerald-700/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancellation lock indicator when purchased or en_route */}
        {!cancelAllowed && selectedOrder.status !== 'delivered' && (
          <div className="pt-2 border-t border-neutral-100 flex items-center gap-2 text-[11px] text-neutral-500">
            <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
            <span>
              Protección anti-cancelación activa: al estar Comprado o En camino no se permite cancelación unilateral.
            </span>
          </div>
        )}
      </section>

      {/* Ephemeral Chat Drawer */}
      <EphemeralChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        order={selectedOrder}
        messages={orderMessages}
        viewerRole={roleView}
        userWhatsapp={currentUser.whatsappNumber}
        onSendMessage={(text, opts) => onSendChat(selectedOrder.id, roleView, text, opts)}
      />
    </div>
  );
};
