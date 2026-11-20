import React, {useState} from 'react';
import {ImagePlus, Loader2, Sparkles, X, Zap} from 'lucide-react';
import {getRouteConfig, ROUTES} from '../domain/routes';
import {LEVEL_1_MAX_PRODUCT_COST} from '../domain/rules';
import {CampusItem, PaymentMethod, RouteId, StudentProfile} from '../domain/types';
import {generateProductPhoto, requestQuickEstimate} from '../services/aiService';

export type PublishMode = 'order' | 'trip' | 'item';

interface QuickPublishSheetProps {
  open: boolean;
  initialMode: PublishMode;
  currentUser: StudentProfile;
  onClose: () => void;
  onCreateOrder: (input: {
    title: string;
    details: string;
    routeId: RouteId;
    origin: string;
    destination: string;
    estimatedProductCost: number;
    deliveryFee: number;
    paymentMethod: PaymentMethod;
  }) => {ok: boolean; error?: string};
  onCreateTrip: (input: {
    routeId: RouteId;
    origin: string;
    destination: string;
    departureMinutes: number;
    feePerOrder: number;
    maxSlots: number;
    note: string;
  }) => {ok: boolean; error?: string};
  onCreateItem: (input: {
    title: string;
    description: string;
    price: number;
    location: string;
    stock: number;
    category: CampusItem['category'];
    imageUrl: string;
  }) => {ok: boolean; error?: string};
}

export const QuickPublishSheet: React.FC<QuickPublishSheetProps> = ({
  open,
  initialMode,
  currentUser,
  onClose,
  onCreateOrder,
  onCreateTrip,
  onCreateItem,
}) => {
  const [mode, setMode] = useState<PublishMode>(initialMode);
  const [error, setError] = useState<string | null>(null);

  // Order state
  const [orderRoute, setOrderRoute] = useState<RouteId>('multis-bloques');
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [orderOrigin, setOrderOrigin] = useState(ROUTES[0].defaultOrigins[0]);
  const [orderDest, setOrderDest] = useState(ROUTES[0].defaultDestinations[0]);
  const [orderCost, setOrderCost] = useState('3.50');
  const [orderFee, setOrderFee] = useState('0.35');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('deuna');
  const [estimating, setEstimating] = useState(false);
  const [estimateTip, setEstimateTip] = useState<string | null>(null);

  // Trip state
  const [tripRoute, setTripRoute] = useState<RouteId>('urcuqui-campus');
  const [tripOrigin, setTripOrigin] = useState(ROUTES[1].defaultOrigins[0]);
  const [tripDest, setTripDest] = useState(ROUTES[1].defaultDestinations[0]);
  const [departureMinutes, setDepartureMinutes] = useState(15);
  const [tripFee, setTripFee] = useState('0.60');
  const [maxSlots, setMaxSlots] = useState(3);
  const [tripNote, setTripNote] = useState('');

  // Campus item state
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('2.50');
  const [itemLocation, setItemLocation] = useState('Residencias Multis · Torre A');
  const [itemStock, setItemStock] = useState(4);
  const [itemCategory, setItemCategory] = useState<CampusItem['category']>('Café & Snacks');
  const [itemImageUrl, setItemImageUrl] = useState('/src/assets/images/campus_snacks_combo_1795204115529.jpg');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatingPhoto, setGeneratingPhoto] = useState(false);

  React.useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setEstimateTip(null);
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleRouteChange = (nextRoute: RouteId) => {
    const cfg = getRouteConfig(nextRoute);
    setOrderRoute(nextRoute);
    setOrderOrigin(cfg.defaultOrigins[0]);
    setOrderDest(cfg.defaultDestinations[0]);
    setOrderFee(cfg.defaultFee.toFixed(2));
    if (nextRoute === 'quito-campus') {
      setOrderCost('0.00');
    }
  };

  const handleTripRouteChange = (nextRoute: RouteId) => {
    const cfg = getRouteConfig(nextRoute);
    setTripRoute(nextRoute);
    setTripOrigin(cfg.defaultOrigins[0]);
    setTripDest(cfg.defaultDestinations[0]);
    setTripFee(cfg.defaultFee.toFixed(2));
  };

  const handleFastEstimate = async () => {
    if (!orderTitle.trim() || orderTitle.trim().length < 3) {
      setError('Escribe primero qué producto o encargo necesitas para estimar ruta y tarifa.');
      return;
    }
    setError(null);
    setEstimating(true);
    try {
      const res = await requestQuickEstimate(orderTitle, orderRoute);
      const validRoute = ROUTES.some((r) => r.id === res.estimate.routeId) ? res.estimate.routeId : orderRoute;
      setOrderRoute(validRoute);
      if (res.estimate.origin) setOrderOrigin(res.estimate.origin);
      if (res.estimate.destination) setOrderDest(res.estimate.destination);
      if (typeof res.estimate.estimatedProductCost === 'number') {
        setOrderCost(res.estimate.estimatedProductCost.toFixed(2));
      }
      if (typeof res.estimate.suggestedFee === 'number') {
        setOrderFee(Math.max(0.25, res.estimate.suggestedFee).toFixed(2));
      }
      setEstimateTip(res.estimate.tip);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo estimar automáticamente.');
    } finally {
      setEstimating(false);
    }
  };

  const handleGenerateItemPhoto = async () => {
    const prompt = itemTitle.trim() || itemDesc.trim();
    if (prompt.length < 3) {
      setError('Escribe el nombre del producto antes de generar la fotografía.');
      return;
    }
    setError(null);
    setGeneratingPhoto(true);
    try {
      const result = await generateProductPhoto({
        prompt: `${itemTitle}. ${itemDesc}`.trim(),
        imageSize,
        aspectRatio: '4:3',
      });
      setItemImageUrl(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la fotografía.');
    } finally {
      setGeneratingPhoto(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'order') {
      const res = onCreateOrder({
        title: orderTitle,
        details: orderDetails,
        routeId: orderRoute,
        origin: orderOrigin,
        destination: orderDest,
        estimatedProductCost: parseFloat(orderCost || '0'),
        deliveryFee: parseFloat(orderFee || '0'),
        paymentMethod,
      });
      if (!res.ok) {
        setError(res.error || 'Verifica los campos del encargo.');
        return;
      }
      setOrderTitle('');
      setOrderDetails('');
      onClose();
      return;
    }

    if (mode === 'trip') {
      const res = onCreateTrip({
        routeId: tripRoute,
        origin: tripOrigin,
        destination: tripDest,
        departureMinutes,
        feePerOrder: parseFloat(tripFee || '0.5'),
        maxSlots,
        note: tripNote,
      });
      if (!res.ok) {
        setError(res.error || 'No se pudo publicar el viaje.');
        return;
      }
      setTripNote('');
      onClose();
      return;
    }

    const res = onCreateItem({
      title: itemTitle,
      description: itemDesc,
      price: parseFloat(itemPrice || '1'),
      location: itemLocation,
      stock: itemStock,
      category: itemCategory,
      imageUrl: itemImageUrl,
    });
    if (!res.ok) {
      setError(res.error || 'No se pudo publicar el artículo.');
      return;
    }
    setItemTitle('');
    setItemDesc('');
    onClose();
  };

  const selectedRouteCfg = getRouteConfig(orderRoute);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-publish-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Grab handle on mobile */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-neutral-300" />
        </div>

        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between gap-3">
          <div>
            <h2 id="quick-publish-title" className="font-display text-base font-bold text-neutral-950">
              Publicar en menos de 15 segundos
            </h2>
            <p className="text-xs text-neutral-500">
              {currentUser.realName} · {currentUser.semester} · Nivel {currentUser.trustLevel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de publicación"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode segmented control */}
        <div className="px-5 pt-3.5">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
            {[
              {id: 'order' as const, label: 'Pedir encargo'},
              {id: 'trip' as const, label: 'Voy bajando'},
              {id: 'item' as const, label: 'Aquí Ya'},
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  mode === tab.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {mode === 'order' && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="pub-order-title" className="text-xs font-medium text-neutral-700">
                    ¿Qué necesitas?
                  </label>
                  <button
                    type="button"
                    onClick={handleFastEstimate}
                    disabled={estimating}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:text-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {estimating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{estimating ? 'Estimando...' : 'Sugerir tarifa rápida'}</span>
                  </button>
                </div>
                <input
                  id="pub-order-title"
                  type="text"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="ej. Encebollado con chifles o paracetamol en Urcuquí"
                  className="w-full h-11 px-3.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                />
                {estimateTip && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    Sugerencia rápida: {estimateTip}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">Ruta fija</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTES.map((r) => {
                    const locked = currentUser.trustLevel === 1 && r.requiresLevel2;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRouteChange(r.id)}
                        className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                          orderRoute === r.id
                            ? 'border-neutral-950 bg-neutral-950 text-white'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-900'
                        }`}
                      >
                        <p className="text-xs font-semibold truncate">{r.label}</p>
                        <p className={`text-[11px] font-mono-num ${orderRoute === r.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          ${r.minFee.toFixed(2)}–${r.maxFee.toFixed(2)} {locked ? '· Nivel 2' : ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-neutral-500">{selectedRouteCfg.paymentRuleSummary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="pub-origin" className="text-xs font-medium text-neutral-700">
                    Origen
                  </label>
                  <input
                    id="pub-origin"
                    type="text"
                    value={orderOrigin}
                    onChange={(e) => setOrderOrigin(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="pub-dest" className="text-xs font-medium text-neutral-700">
                    Destino
                  </label>
                  <input
                    id="pub-dest"
                    type="text"
                    value={orderDest}
                    onChange={(e) => setOrderDest(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="pub-cost" className="text-xs font-medium text-neutral-700">
                    Costo producto (USD)
                  </label>
                  <input
                    id="pub-cost"
                    type="number"
                    step="0.05"
                    min="0"
                    max="150"
                    value={orderCost}
                    onChange={(e) => setOrderCost(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono-num border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="pub-fee" className="text-xs font-medium text-neutral-700">
                    Tarifa envío ofrecida (USD)
                  </label>
                  <input
                    id="pub-fee"
                    type="number"
                    step="0.05"
                    min="0.25"
                    max="25"
                    value={orderFee}
                    onChange={(e) => setOrderFee(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono-num border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              {currentUser.trustLevel === 1 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Tu cuenta es Nivel 1: límite sugerido de hasta ${LEVEL_1_MAX_PRODUCT_COST.toFixed(2)} USD en compras
                  locales. Completa 3 entregas para desbloquear Ibarra/Quito y montos mayores.
                </p>
              )}

              <div className="space-y-1">
                <label htmlFor="pub-details" className="text-xs font-medium text-neutral-700">
                  Detalles breves (opcional)
                </label>
                <input
                  id="pub-details"
                  type="text"
                  value={orderDetails}
                  onChange={(e) => setOrderDetails(e.target.value)}
                  placeholder="ej. Sin cebolla, punto de encuentro en gradas del bloque"
                  className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-700">Pago P2P:</span>
                {(['deuna', 'efectivo'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      paymentMethod === method
                        ? 'border-neutral-950 bg-neutral-950 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    {method === 'deuna' ? 'Deuna (Pichincha)' : 'Efectivo exacto'}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'trip' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">¿Qué ruta vas a hacer?</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleTripRouteChange(r.id)}
                      className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                        tripRoute === r.id
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-200 bg-white text-neutral-900'
                      }`}
                    >
                      <p className="text-xs font-semibold truncate">{r.label}</p>
                      <p className={`text-[11px] font-mono-num ${tripRoute === r.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        Sugerido ${r.defaultFee.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="trip-origin" className="text-xs font-medium text-neutral-700">
                    Salgo desde
                  </label>
                  <input
                    id="trip-origin"
                    type="text"
                    value={tripOrigin}
                    onChange={(e) => setTripOrigin(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="trip-dest" className="text-xs font-medium text-neutral-700">
                    Llego hacia
                  </label>
                  <input
                    id="trip-dest"
                    type="text"
                    value={tripDest}
                    onChange={(e) => setTripDest(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="trip-mins" className="text-xs font-medium text-neutral-700">
                    Salgo en (min)
                  </label>
                  <select
                    id="trip-mins"
                    value={departureMinutes}
                    onChange={(e) => setDepartureMinutes(Number(e.target.value))}
                    className="w-full h-10 px-2.5 text-sm font-mono-num border border-neutral-300 rounded-xl bg-white"
                  >
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="trip-slots" className="text-xs font-medium text-neutral-700">
                    Cupos pool
                  </label>
                  <select
                    id="trip-slots"
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(Number(e.target.value))}
                    className="w-full h-10 px-2.5 text-sm font-mono-num border border-neutral-300 rounded-xl bg-white"
                  >
                    <option value={1}>1 encargo</option>
                    <option value={2}>2 encargos</option>
                    <option value={3}>3 encargos</option>
                    <option value={4}>4 encargos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="trip-fee" className="text-xs font-medium text-neutral-700">
                    Tarifa c/u ($)
                  </label>
                  <input
                    id="trip-fee"
                    type="number"
                    step="0.05"
                    min="0.25"
                    value={tripFee}
                    onChange={(e) => setTripFee(e.target.value)}
                    className="w-full h-10 px-2.5 text-sm font-mono-num border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="trip-note" className="text-xs font-medium text-neutral-700">
                  Nota para tus compañeros
                </label>
                <input
                  id="trip-note"
                  type="text"
                  value={tripNote}
                  onChange={(e) => setTripNote(e.target.value)}
                  placeholder="ej. Paso por farmacia y papelería antes de subir en bus"
                  className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl"
                />
                <p className="text-[11px] text-neutral-500">
                  Tu anuncio se auto-expira automáticamente entre 30 y 45 min para evitar publicaciones zombis.
                </p>
              </div>
            </>
          )}

          {mode === 'item' && (
            <>
              <div className="space-y-1">
                <label htmlFor="item-title" className="text-xs font-medium text-neutral-700">
                  Producto disponible ya en el campus
                </label>
                <input
                  id="item-title"
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="ej. Brownies de cacao + café frío o cable USB-C"
                  className="w-full h-11 px-3.5 text-sm border border-neutral-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="item-price" className="text-xs font-medium text-neutral-700">
                    Precio ($)
                  </label>
                  <input
                    id="item-price"
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono-num border border-neutral-300 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="item-stock" className="text-xs font-medium text-neutral-700">
                    Unidades
                  </label>
                  <input
                    id="item-stock"
                    type="number"
                    min="1"
                    max="30"
                    value={itemStock}
                    onChange={(e) => setItemStock(Number(e.target.value))}
                    className="w-full h-10 px-3 text-sm font-mono-num border border-neutral-300 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="item-cat" className="text-xs font-medium text-neutral-700">
                    Categoría
                  </label>
                  <select
                    id="item-cat"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as CampusItem['category'])}
                    className="w-full h-10 px-2 text-xs border border-neutral-300 rounded-xl bg-white"
                  >
                    <option value="Café & Snacks">Café & Snacks</option>
                    <option value="Comida">Comida</option>
                    <option value="Tech & Impresiones">Tech & Impresiones</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="item-loc" className="text-xs font-medium text-neutral-700">
                    Ubicación actual
                  </label>
                  <input
                    id="item-loc"
                    type="text"
                    value={itemLocation}
                    onChange={(e) => setItemLocation(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="item-desc" className="text-xs font-medium text-neutral-700">
                    Descripción corta
                  </label>
                  <input
                    id="item-desc"
                    type="text"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    placeholder="Entrega en 5 min"
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              {/* AI Product Photo Generator (gemini-3-pro-image-preview with 1K / 2K / 4K) */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-neutral-900" aria-hidden="true" />
                    <span className="text-xs font-semibold text-neutral-950">Foto de producto con IA</span>
                  </div>
                  <div className="flex items-center gap-1" role="group" aria-label="Resolución de imagen">
                    {(['1K', '2K', '4K'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setImageSize(sz)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono-num font-semibold transition-colors ${
                          imageSize === sz
                            ? 'bg-neutral-950 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-950'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={itemImageUrl}
                    alt="Vista previa del producto"
                    referrerPolicy="no-referrer"
                    className="w-20 h-16 object-cover rounded-lg border border-neutral-200 bg-neutral-100 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateItemPhoto}
                    disabled={generatingPhoto}
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-900 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {generatingPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando foto {imageSize}...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generar foto de estudio ({imageSize})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <div className="pt-2 pb-safe">
            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-semibold transition-colors"
            >
              {mode === 'order'
                ? 'Publicar encargo ahora'
                : mode === 'trip'
                  ? 'Anunciar mi viaje'
                  : 'Publicar en Aquí Ya'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
