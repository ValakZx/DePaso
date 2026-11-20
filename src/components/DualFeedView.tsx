import React, {useMemo, useState} from 'react';
import {
  ArrowRight,
  Clock,
  Flag,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import {getRouteConfig, ROUTES} from '../domain/routes';
import {formatCountdown, formatUsd} from '../domain/rules';
import {CampusItem, DeliveryOrder, RouteId, StudentProfile, TravelerTrip, UserRoleView} from '../domain/types';
import {PublishMode} from './QuickPublishSheet';

export type FeedTab = 'pedidos' | 'viajes' | 'aqui-ya';

interface DualFeedViewProps {
  orders: DeliveryOrder[];
  trips: TravelerTrip[];
  campusItems: CampusItem[];
  currentUser: StudentProfile;
  roleView: UserRoleView;
  now: number;
  onBoostOrder: (orderId: string, increment: 0.25 | 0.5) => void;
  onRequestAcceptOrder: (order: DeliveryOrder) => void;
  onJoinTrip: (tripId: string) => void;
  onReserveItem: (itemId: string) => void;
  onReportListing: (kind: 'order' | 'trip' | 'item', id: string) => void;
  onOpenPublish: (mode: PublishMode) => void;
}

export const DualFeedView: React.FC<DualFeedViewProps> = ({
  orders,
  trips,
  campusItems,
  currentUser,
  roleView,
  now,
  onBoostOrder,
  onRequestAcceptOrder,
  onJoinTrip,
  onReserveItem,
  onReportListing,
  onOpenPublish,
}) => {
  const [selectedRoute, setSelectedRoute] = useState<'all' | RouteId>('all');
  const [activeTab, setActiveTab] = useState<FeedTab>('pedidos');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const openOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === 'open' &&
          !o.hiddenByModeration &&
          (selectedRoute === 'all' || o.routeId === selectedRoute),
      ),
    [orders, selectedRoute],
  );

  const activeTrips = useMemo(
    () =>
      trips.filter(
        (t) =>
          !t.hiddenByModeration &&
          t.expiresAt > now &&
          (selectedRoute === 'all' || t.routeId === selectedRoute),
      ),
    [trips, selectedRoute, now],
  );

  const visibleItems = useMemo(
    () => campusItems.filter((i) => !i.hiddenByModeration),
    [campusItems],
  );

  return (
    <div className="space-y-5">
      {/* Top Route Filter Bar */}
      <div className="space-y-3">
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
          role="group"
          aria-label="Filtrar por ruta fija"
        >
          <button
            type="button"
            onClick={() => setSelectedRoute('all')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedRoute === 'all'
                ? 'bg-neutral-950 text-white'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Todas las rutas
          </button>
          {ROUTES.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => setSelectedRoute(route.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedRoute === route.id
                  ? 'bg-neutral-950 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {route.shortLabel}
            </button>
          ))}
        </div>

        {/* Dual Feed + Micro-Marketplace Segmented Tabs */}
        <div
          role="tablist"
          aria-label="Secciones del tablón"
          className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-neutral-100 border border-neutral-200"
        >
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'pedidos'}
            onClick={() => setActiveTab('pedidos')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'pedidos'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pedidos ({openOrders.length})
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'viajes'}
            onClick={() => setActiveTab('viajes')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'viajes'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Voy Bajando ({activeTrips.length})
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'aqui-ya'}
            onClick={() => setActiveTab('aqui-ya')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'aqui-ya'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Aquí Ya ({visibleItems.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PEDIDOS (Demanda) */}
      {activeTab === 'pedidos' && (
        <section aria-label="Pedidos abiertos" className="space-y-3">
          {openOrders.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-3">
              <Package className="w-8 h-8 text-neutral-400 mx-auto" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-950">No hay encargos abiertos en esta ruta</p>
                <p className="text-xs text-neutral-500">
                  Publica lo que necesitas y alguien que ya viene de camino lo trae por una tarifa justa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenPublish('order')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar primer encargo</span>
              </button>
            </div>
          ) : (
            openOrders.map((order) => {
              const route = getRouteConfig(order.routeId);
              const remainingMs = Math.max(0, order.expiresAt - now);
              const isOwnOrder = order.buyerId === currentUser.id;
              const requiresTwoStep = order.paymentFlow === 'two_step_deuna';

              return (
                <article
                  key={order.id}
                  data-testid={`order-card-${order.id}`}
                  className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-colors hover:border-neutral-300"
                >
                  {/* Unboxed typographic kicker metadata (Zero-Pill discipline) */}
                  <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-semibold text-neutral-900">{route.label}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {requiresTwoStep
                          ? 'Pago en 2 tiempos (Deuna)'
                          : order.paymentFlow === 'shipping_only_cod'
                            ? 'Solo envío contra entrega'
                            : `Contra entrega (${order.paymentMethod === 'deuna' ? 'Deuna' : 'Efectivo'})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono-num text-neutral-600 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                      <span>{formatCountdown(remainingMs)}</span>
                    </div>
                  </div>

                  {/* Title + optional thumbnail */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="font-display text-base font-bold text-neutral-950 leading-snug">
                        {order.title}
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">{order.details}</p>
                      <p className="text-xs text-neutral-700 flex flex-wrap items-center gap-1 pt-0.5 leading-snug">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
                        <span>{order.origin}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" aria-hidden="true" />
                        <span className="font-medium text-neutral-950">{order.destination}</span>
                      </p>
                    </div>
                    {order.imageUrl && !failedImages[order.id] && (
                      <img
                        src={order.imageUrl}
                        alt={order.title}
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImages((prev) => ({...prev, [order.id]: true}))}
                        className="w-20 h-16 sm:w-24 sm:h-18 object-cover rounded-xl border border-neutral-200 shrink-0"
                      />
                    )}
                  </div>

                  {/* Pricing & requester metadata row */}
                  <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[11px] text-neutral-500">Envío ofrecido</p>
                        <p
                          data-testid={`order-fee-${order.id}`}
                          className="text-lg font-bold text-emerald-700 font-mono-num leading-tight"
                        >
                          {formatUsd(order.deliveryFee)}
                        </p>
                      </div>
                      <div className="h-7 w-px bg-neutral-200" aria-hidden="true" />
                      <div>
                        <p className="text-[11px] text-neutral-500">Costo aprox.</p>
                        <p className="text-sm font-semibold text-neutral-900 font-mono-num leading-tight">
                          {order.estimatedProductCost > 0 ? formatUsd(order.estimatedProductCost) : 'Encomienda'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-neutral-600">
                      <p className="font-semibold text-neutral-950">{order.buyerName}</p>
                      <p className="text-[11px] text-neutral-500 flex items-center justify-end gap-1">
                        <span>{order.buyerSemester}</span>
                        <span aria-hidden="true">·</span>
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500 inline" aria-hidden="true" />
                        <span className="font-mono-num">{order.buyerRating.toFixed(1)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions row: inDrive Boost + Accept / Report */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onBoostOrder(order.id, 0.25)}
                        aria-label={`Subir tarifa 25 centavos en ${order.title}`}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-900 font-mono-num inline-flex items-center gap-1 transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>+$0.25</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onBoostOrder(order.id, 0.5)}
                        aria-label={`Subir tarifa 50 centavos en ${order.title}`}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-900 font-mono-num transition-colors"
                      >
                        +$0.50
                      </button>
                      <button
                        type="button"
                        onClick={() => onReportListing('order', order.id)}
                        aria-label={`Reportar anuncio ${order.title}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isOwnOrder && roleView === 'buyer' ? (
                      <span className="text-xs font-medium text-neutral-500">
                        Tu pedido activo · Esperando repartidor
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestAcceptOrder(order)}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap text-center"
                      >
                        Aceptar por {formatUsd(order.deliveryFee)}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* TAB 2: VOY BAJANDO (Oferta / Pool) */}
      {activeTab === 'viajes' && (
        <section aria-label="Viajeros disponibles" className="space-y-3">
          {activeTrips.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-3">
              <Users className="w-8 h-8 text-neutral-400 mx-auto" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-950">No hay viajeros anunciados en esta ruta</p>
                <p className="text-xs text-neutral-500">
                  ¿Ya vas a bajar a Multis, Urcuquí o Ibarra? Anuncia tus cupos y gana con tu trayecto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenPublish('trip')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Anunciar "Voy bajando"</span>
              </button>
            </div>
          ) : (
            activeTrips.map((trip) => {
              const route = getRouteConfig(trip.routeId);
              const remainingMs = Math.max(0, trip.expiresAt - now);
              const isJoined = trip.joinedUserIds.includes(currentUser.id);
              const isFull = trip.occupiedSlots >= trip.maxSlots;
              const isOwn = trip.travelerId === currentUser.id;
              const pct = Math.round((trip.occupiedSlots / trip.maxSlots) * 100);

              return (
                <article
                  key={trip.id}
                  data-testid={`trip-card-${trip.id}`}
                  className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-900">
                      {route.label} · Sale en {trip.departureMinutes} min
                    </span>
                    <span className="font-mono-num">Expira {formatCountdown(remainingMs)}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-display text-base font-bold text-neutral-950">
                      {trip.origin} → {trip.destination}
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">{trip.note}</p>
                  </div>

                  {/* Pool slot progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span data-testid={`trip-slots-${trip.id}`} className="font-semibold text-neutral-900 font-mono-num">
                        {trip.occupiedSlots}/{trip.maxSlots} cupos ocupados
                      </span>
                      <span className="font-semibold text-emerald-700 font-mono-num">
                        {formatUsd(trip.feePerOrder)} c/u
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full bg-neutral-950 rounded-full transition-all"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-600">
                      <span className="font-semibold text-neutral-950">{trip.travelerName}</span>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      <span>{trip.travelerSemester}</span>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      <span className="font-mono-num">{trip.travelerRating.toFixed(2)}★</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onReportListing('trip', trip.id)}
                        aria-label={`Reportar viaje de ${trip.travelerName}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isJoined || isFull || isOwn}
                        onClick={() => onJoinTrip(trip.id)}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        {isOwn ? 'Tu viaje' : isJoined ? 'Cupo reservado' : isFull ? 'Lleno' : 'Me sumo'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* TAB 3: AQUÍ YA (Micro-Marketplace inmediato en campus) */}
      {activeTab === 'aqui-ya' && (
        <section aria-label="Micro-marketplace Aquí Ya" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-600">
              Productos que otros estudiantes ya tienen listos en el campus · Entrega inmediata sin espera de bus.
            </p>
            <button
              type="button"
              onClick={() => onOpenPublish('item')}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-900 whitespace-nowrap shrink-0"
            >
              Vender Aquí Ya
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-neutral-200 rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden relative">
                  {!failedImages[item.id] ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({...prev, [item.id]: true}))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-500 p-4 text-center">
                      <ShoppingBag className="w-7 h-7 mb-2 text-neutral-400" />
                      <span className="text-xs font-medium">{item.title}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-neutral-500">
                      {item.category} · {item.location}
                    </p>
                    <h3 className="font-display text-sm font-bold text-neutral-950 leading-snug">{item.title}</h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-neutral-950 font-mono-num">{formatUsd(item.price)}</p>
                      <p className="text-[11px] text-neutral-500">
                        {item.sellerName} · {item.stock > 0 ? `${item.stock} disp.` : 'Agotado'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={item.stock <= 0}
                      onClick={() => onReserveItem(item.id)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      {item.stock > 0 ? 'Pedir ya' : 'Agotado'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
