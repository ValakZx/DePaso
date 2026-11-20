import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  acceptOrderAtomic,
  applyFeeBoost,
  ARRIVAL_COURTESY_MS,
  canBuyerCancelOrder,
  computeTrustLevel,
  computeUpdatedRating,
  containsProhibitedContent,
  determinePaymentFlow,
  generateFourDigitPin,
  joinTravelerTripAtomic,
  shouldAutoHideListing,
  validateOrderCreation,
  verifyDeliveryPin,
} from '../domain/rules';
import {getRouteConfig} from '../domain/routes';
import {
  CampusItem,
  ChatMessage,
  DeliveryOrder,
  PaymentMethod,
  RouteId,
  StudentProfile,
  TravelerTrip,
  UserRoleView,
} from '../domain/types';
import {depasoService, PersistedAppState} from '../services/depasoService';

export interface ToastNotice {
  id: string;
  tone: 'neutral' | 'success' | 'warning' | 'error';
  message: string;
}

export function useDePasoStore() {
  const [appState, setAppState] = useState<PersistedAppState>(() => depasoService.loadState());
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'stu-camila';
      }
    }
    const existing = depasoService.loadSession();
    return existing?.userId ?? null;
  });

  const [roleView, setRoleView] = useState<UserRoleView>('courier');
  const [now, setNow] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const notify = useCallback((message: string, tone: ToastNotice['tone'] = 'neutral') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToast({id, tone, message});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 1s live timer for stage deadlines, trip expiration, and 5-min arrival courtesy clock
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Resync active state cleanly when returning from background / intermittent campus signal
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const refreshed = depasoService.loadState();
        setAppState(refreshed);
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const updateAppState = useCallback((updater: (prev: PersistedAppState) => PersistedAppState) => {
    setAppState((prev) => {
      const next = {
        ...updater(prev),
        lastSyncedAt: Date.now(),
      };
      depasoService.saveState(next);
      return next;
    });
  }, []);

  const currentUser = useMemo<StudentProfile | null>(() => {
    if (!sessionUserId) return null;
    return appState.profiles.find((p) => p.id === sessionUserId) ?? appState.profiles[0] ?? null;
  }, [appState.profiles, sessionUserId]);

  const loginWithMoodle = useCallback(
    (username: string, password: string, acceptedTerms: boolean) => {
      if (!acceptedTerms) {
        return {ok: false, error: 'Debes aceptar los Términos y Condiciones para continuar.'};
      }
      const auth = depasoService.authenticateMoodle(username, password, appState.profiles);
      if (!auth.ok || !auth.profile) {
        return {ok: false, error: auth.error || 'Error de autenticación Moodle.'};
      }
      if (auth.isNew) {
        updateAppState((prev) => ({
          ...prev,
          profiles: [auth.profile!, ...prev.profiles],
        }));
      }
      depasoService.saveSession(auth.profile.id, auth.profile.moodleUsername);
      setSessionUserId(auth.profile.id);
      notify(`Sesión verificada: ${auth.profile.realName} (${auth.profile.semester})`, 'success');
      return {ok: true};
    },
    [appState.profiles, notify, updateAppState],
  );

  const switchDemoProfile = useCallback(
    (profileId: string) => {
      const target = appState.profiles.find((p) => p.id === profileId);
      if (!target) return;
      depasoService.saveSession(target.id, target.moodleUsername);
      setSessionUserId(target.id);
      notify(`Perfil activo: ${target.realName} · Nivel ${target.trustLevel}`, 'neutral');
    },
    [appState.profiles, notify],
  );

  const logout = useCallback(() => {
    depasoService.clearSession();
    setSessionUserId(null);
  }, []);

  const saveDeunaAccount = useCallback(
    (deunaAccount: string, whatsappNumber?: string) => {
      if (!currentUser) return {ok: false, error: 'Inicia sesión primero.'};
      const cleaned = deunaAccount.trim();
      if (cleaned.length < 6) {
        return {ok: false, error: 'Ingresa tu número de cuenta o celular vinculado a Deuna.'};
      }
      updateAppState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === currentUser.id
            ? {
                ...p,
                deunaAccount: cleaned,
                whatsappNumber: whatsappNumber?.trim() || p.whatsappNumber,
              }
            : p,
        ),
      }));
      notify('Cuenta Deuna guardada para recibir pagos P2P.', 'success');
      return {ok: true};
    },
    [currentUser, notify, updateAppState],
  );

  const createOrder = useCallback(
    (input: {
      title: string;
      details: string;
      routeId: RouteId;
      origin: string;
      destination: string;
      estimatedProductCost: number;
      deliveryFee: number;
      paymentMethod: PaymentMethod;
    }) => {
      if (!currentUser) return {ok: false, error: 'Debes iniciar sesión.'};
      const validation = validateOrderCreation({
        title: input.title,
        details: input.details,
        routeId: input.routeId,
        estimatedProductCost: input.estimatedProductCost,
        deliveryFee: input.deliveryFee,
        user: currentUser,
      });
      if (!validation.valid) {
        return {ok: false, error: validation.error};
      }

      const route = getRouteConfig(input.routeId);
      const createdNow = Date.now();
      const newOrder: DeliveryOrder = {
        id: `ord-${createdNow}`,
        title: input.title.trim(),
        details: input.details.trim() || 'Coordinación rápida por chat del pedido.',
        routeId: input.routeId,
        origin: input.origin.trim() || route.defaultOrigins[0],
        destination: input.destination.trim() || route.defaultDestinations[0],
        estimatedProductCost: Number(input.estimatedProductCost.toFixed(2)),
        deliveryFee: Number(input.deliveryFee.toFixed(2)),
        paymentMethod: input.paymentMethod,
        paymentFlow: determinePaymentFlow(input.routeId, input.estimatedProductCost),
        status: 'open',
        buyerId: currentUser.id,
        buyerName: currentUser.realName,
        buyerSemester: currentUser.semester,
        buyerRating: currentUser.rating,
        createdAt: createdNow,
        expiresAt: createdNow + route.stageTimeoutMinutes * 2 * 60_000,
        deliveryPin: generateFourDigitPin(),
        version: 1,
        reportsCount: 0,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: [newOrder, ...prev.orders],
      }));
      notify('Encargo publicado en el feed en tiempo real.', 'success');
      return {ok: true, order: newOrder};
    },
    [currentUser, notify, updateAppState],
  );

  const boostOrderFee = useCallback(
    (orderId: string, increment: 0.25 | 0.5) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      const result = applyFeeBoost(target, increment);
      if (!result.ok || !result.order) {
        notify(result.error || 'No se pudo subir la tarifa.', 'error');
        return;
      }
      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? result.order! : o)),
      }));
      notify(`Tarifa impulsada a $${result.order.deliveryFee.toFixed(2)} (+$${increment.toFixed(2)}).`, 'success');
    },
    [appState.orders, notify, updateAppState],
  );

  const acceptOrder = useCallback(
    (orderId: string, expectedVersion: number, openPackageAcknowledged?: boolean) => {
      if (!currentUser) return {ok: false, error: 'Inicia sesión.'};
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return {ok: false, error: 'Pedido no encontrado.'};

      const res = acceptOrderAtomic(target, currentUser, expectedVersion, Date.now(), openPackageAcknowledged);
      if (!res.ok || !res.order) {
        if (res.error !== 'NEEDS_DEUNA_ONBOARDING') {
          notify(res.error || 'No se pudo aceptar el pedido.', 'warning');
        }
        return {ok: false, error: res.error};
      }

      const systemMsg: ChatMessage = {
        id: `msg-sys-${Date.now()}`,
        orderId,
        senderId: 'system',
        senderName: 'DePaso',
        senderRole: 'system',
        text: `${currentUser.realName} aceptó el encargo. Este chat efímero se auto-purgará 72h después de la entrega.`,
        createdAt: Date.now(),
        readByBuyer: false,
        readByCourier: true,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? res.order! : o)),
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), systemMsg],
        },
      }));
      notify('Pedido aceptado y agregado a tu lista de activos.', 'success');
      return {ok: true, order: res.order};
    },
    [appState.orders, currentUser, notify, updateAppState],
  );

  const submitReceiptAndPurchase = useCallback(
    (orderId: string, receiptPhotoUrl: string, adjustedCost?: number, receiptNote?: string) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      const route = getRouteConfig(target.routeId);
      const updatedCost =
        typeof adjustedCost === 'number' && !Number.isNaN(adjustedCost) && adjustedCost >= 0
          ? Number(adjustedCost.toFixed(2))
          : target.estimatedProductCost;

      const updatedOrder: DeliveryOrder = {
        ...target,
        status: 'purchased',
        receiptPhotoUrl,
        receiptNote: receiptNote?.trim() || 'Foto de producto / factura cargada en local.',
        adjustedProductCost: updatedCost,
        buyerPriceApproved: updatedCost === target.estimatedProductCost,
        stageDeadlineAt: Date.now() + route.stageTimeoutMinutes * 60_000,
        version: target.version + 1,
      };

      const chatMsg: ChatMessage = {
        id: `msg-rec-${Date.now()}`,
        orderId,
        senderId: target.courierId || 'courier',
        senderName: target.courierName || 'Repartidor',
        senderRole: 'courier',
        text: `Ya lo compré. Total del producto: $${updatedCost.toFixed(2)}. Adjunto foto del producto/factura.`,
        imageUrl: receiptPhotoUrl,
        imageLabel: 'Foto de producto / factura',
        createdAt: Date.now(),
        readByBuyer: false,
        readByCourier: true,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), chatMsg],
        },
      }));
      notify('Estado actualizado a Comprado. Cancelación unilateral bloqueada.', 'success');
    },
    [appState.orders, notify, updateAppState],
  );

  const approvePriceAndUploadDeuna = useCallback(
    (orderId: string, proofUrl: string, reference: string) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      const updatedOrder: DeliveryOrder = {
        ...target,
        buyerPriceApproved: true,
        deunaProofUrl: proofUrl,
        deunaReference: reference.trim() || `DEUNA-${Math.floor(100000 + Math.random() * 899999)}`,
        version: target.version + 1,
      };

      const chatMsg: ChatMessage = {
        id: `msg-deuna-${Date.now()}`,
        orderId,
        senderId: target.buyerId,
        senderName: target.buyerName,
        senderRole: 'buyer',
        text: `Transferencia Deuna enviada (${updatedOrder.deunaReference}). Adjunto comprobante.`,
        imageUrl: proofUrl,
        imageLabel: 'Comprobante Deuna',
        createdAt: Date.now(),
        readByBuyer: true,
        readByCourier: false,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), chatMsg],
        },
      }));
      notify('Comprobante Deuna adjuntado al pedido.', 'success');
    },
    [appState.orders, notify, updateAppState],
  );

  const confirmDeunaAndStartRoute = useCallback(
    (orderId: string) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      const route = getRouteConfig(target.routeId);
      const updatedOrder: DeliveryOrder = {
        ...target,
        deunaConfirmedByCourier: target.deunaProofUrl ? true : target.deunaConfirmedByCourier,
        status: 'en_route',
        stageDeadlineAt: Date.now() + route.stageTimeoutMinutes * 60_000,
        version: target.version + 1,
      };

      const chatMsg: ChatMessage = {
        id: `msg-route-${Date.now()}`,
        orderId,
        senderId: target.courierId || 'courier',
        senderName: target.courierName || 'Repartidor',
        senderRole: 'courier',
        text: 'Voy en camino al punto de entrega.',
        createdAt: Date.now(),
        readByBuyer: false,
        readByCourier: true,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), chatMsg],
        },
      }));
      notify('Pedido marcado como En camino.', 'success');
    },
    [appState.orders, notify, updateAppState],
  );

  const markArrived = useCallback(
    (orderId: string) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      const arrivedNow = Date.now();
      const updatedOrder: DeliveryOrder = {
        ...target,
        status: 'arrived',
        arrivedAt: arrivedNow,
        arrivalDeadlineAt: arrivedNow + ARRIVAL_COURTESY_MS,
        version: target.version + 1,
      };

      const chatMsg: ChatMessage = {
        id: `msg-arr-${arrivedNow}`,
        orderId,
        senderId: target.courierId || 'courier',
        senderName: target.courierName || 'Repartidor',
        senderRole: 'courier',
        text: 'Ya llegué al punto de entrega. Inició el reloj de cortesía de 5 minutos.',
        createdAt: arrivedNow,
        readByBuyer: false,
        readByCourier: true,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), chatMsg],
        },
      }));
      notify('Alerta "Ya llegué" enviada. Reloj de cortesía 05:00 iniciado.', 'warning');
    },
    [appState.orders, notify, updateAppState],
  );

  const completeDeliveryWithPin = useCallback(
    (orderId: string, enteredPin: string) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return {ok: false, error: 'Pedido no encontrado.'};
      const check = verifyDeliveryPin(target, enteredPin);
      if (!check.valid) {
        return {ok: false, error: check.error};
      }

      const deliveredOrder: DeliveryOrder = {
        ...target,
        status: 'delivered',
        version: target.version + 1,
      };

      const sysMsg: ChatMessage = {
        id: `msg-del-${Date.now()}`,
        orderId,
        senderId: 'system',
        senderName: 'DePaso',
        senderRole: 'system',
        text: 'Entrega verificada con PIN de 4 dígitos. Este chat pasó a modo solo lectura y se auto-purgará en 72h.',
        createdAt: Date.now(),
        readByBuyer: true,
        readByCourier: true,
      };

      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? deliveredOrder : o)),
        profiles: prev.profiles.map((p) => {
          if (p.id === target.courierId || p.id === target.buyerId) {
            const nextDeliveries = p.completedDeliveries + 1;
            return {
              ...p,
              completedDeliveries: nextDeliveries,
              trustLevel: computeTrustLevel(nextDeliveries, p.reportsCount),
            };
          }
          return p;
        }),
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), sysMsg],
        },
      }));
      notify('Entrega verificada con PIN. Ahora pueden calificarse mutuamente.', 'success');
      return {ok: true};
    },
    [appState.orders, notify, updateAppState],
  );

  const cancelOrder = useCallback(
    (orderId: string) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      if (!canBuyerCancelOrder(target.status)) {
        notify('Cancelación bloqueada: el producto ya fue comprado o está en camino.', 'error');
        return;
      }
      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId ? {...o, status: 'cancelled', version: o.version + 1} : o,
        ),
      }));
      notify('Pedido cancelado correctamente.', 'neutral');
    },
    [appState.orders, notify, updateAppState],
  );

  const submitMutualRating = useCallback(
    (orderId: string, raterRole: UserRoleView, stars: number) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target) return;
      const targetProfileId = raterRole === 'buyer' ? target.courierId : target.buyerId;
      updateAppState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId
            ? raterRole === 'buyer'
              ? {...o, buyerRatedCourier: stars}
              : {...o, courierRatedBuyer: stars}
            : o,
        ),
        profiles: prev.profiles.map((p) => {
          if (p.id !== targetProfileId) return p;
          const updated = computeUpdatedRating(p.rating, p.ratingsCount, stars);
          return {...p, rating: updated.rating, ratingsCount: updated.count};
        }),
      }));
      notify(`Calificación de ${stars} estrellas registrada.`, 'success');
    },
    [appState.orders, notify, updateAppState],
  );

  const sendOrderChatMessage = useCallback(
    (
      orderId: string,
      senderRole: UserRoleView,
      text: string,
      options?: {imageUrl?: string; imageLabel?: string; whatsappShared?: string},
    ) => {
      const target = appState.orders.find((o) => o.id === orderId);
      if (!target || target.status === 'delivered' || target.status === 'cancelled') return;
      const senderName =
        senderRole === 'buyer'
          ? target.buyerName
          : target.courierName || currentUser?.realName || 'Repartidor';
      const senderId =
        senderRole === 'buyer' ? target.buyerId : target.courierId || currentUser?.id || 'courier';

      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        orderId,
        senderId,
        senderName,
        senderRole,
        text: text.trim(),
        imageUrl: options?.imageUrl,
        imageLabel: options?.imageLabel,
        whatsappShared: options?.whatsappShared,
        createdAt: Date.now(),
        readByBuyer: senderRole === 'buyer',
        readByCourier: senderRole === 'courier',
      };

      updateAppState((prev) => ({
        ...prev,
        chats: {
          ...prev.chats,
          [orderId]: [...(prev.chats[orderId] ?? []), msg],
        },
      }));
    },
    [appState.orders, currentUser, updateAppState],
  );

  const markChatRead = useCallback(
    (orderId: string, viewerRole: UserRoleView) => {
      updateAppState((prev) => {
        const list = prev.chats[orderId];
        if (!list) return prev;
        const changed = list.some((m) => (viewerRole === 'buyer' ? !m.readByBuyer : !m.readByCourier));
        if (!changed) return prev;
        return {
          ...prev,
          chats: {
            ...prev.chats,
            [orderId]: list.map((m) =>
              viewerRole === 'buyer' ? {...m, readByBuyer: true} : {...m, readByCourier: true},
            ),
          },
        };
      });
    },
    [updateAppState],
  );

  const createTravelerTrip = useCallback(
    (input: {
      routeId: RouteId;
      origin: string;
      destination: string;
      departureMinutes: number;
      feePerOrder: number;
      maxSlots: number;
      note: string;
    }) => {
      if (!currentUser) return {ok: false, error: 'Inicia sesión.'};
      const mod = containsProhibitedContent(`${input.origin} ${input.destination} ${input.note}`);
      if (mod.blocked) {
        return {ok: false, error: `Contenido bloqueado: "${mod.matchedTerm}" no está permitido.`};
      }
      const createdNow = Date.now();
      const ttlMinutes = Math.min(45, Math.max(30, input.departureMinutes + 20));
      const newTrip: TravelerTrip = {
        id: `trip-${createdNow}`,
        travelerId: currentUser.id,
        travelerName: currentUser.realName,
        travelerSemester: currentUser.semester,
        travelerRating: currentUser.rating,
        routeId: input.routeId,
        origin: input.origin.trim() || getRouteConfig(input.routeId).defaultOrigins[0],
        destination: input.destination.trim() || getRouteConfig(input.routeId).defaultDestinations[0],
        departureMinutes: input.departureMinutes,
        feePerOrder: Number(input.feePerOrder.toFixed(2)),
        maxSlots: input.maxSlots,
        occupiedSlots: 0,
        joinedUserIds: [],
        note: input.note.trim() || 'Salgo pronto, escríbeme tu encargo al sumarte.',
        createdAt: createdNow,
        expiresAt: createdNow + ttlMinutes * 60_000,
        reportsCount: 0,
      };
      updateAppState((prev) => ({
        ...prev,
        trips: [newTrip, ...prev.trips],
      }));
      notify(`Viaje publicado (auto-expira en ${ttlMinutes} min).`, 'success');
      return {ok: true};
    },
    [currentUser, notify, updateAppState],
  );

  const joinTrip = useCallback(
    (tripId: string) => {
      if (!currentUser) return;
      const trip = appState.trips.find((t) => t.id === tripId);
      if (!trip) return;
      const res = joinTravelerTripAtomic(trip, currentUser.id, Date.now());
      if (!res.ok || !res.trip) {
        notify(res.error || 'No se pudo ocupar el cupo.', 'warning');
        return;
      }
      updateAppState((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === tripId ? res.trip! : t)),
      }));
      notify(
        `Te sumaste al viaje de ${trip.travelerName} (${res.trip.occupiedSlots}/${res.trip.maxSlots} cupos).`,
        'success',
      );
    },
    [appState.trips, currentUser, notify, updateAppState],
  );

  const createCampusItem = useCallback(
    (input: {
      title: string;
      description: string;
      price: number;
      location: string;
      stock: number;
      category: CampusItem['category'];
      imageUrl: string;
    }) => {
      if (!currentUser) return {ok: false, error: 'Inicia sesión.'};
      if (!input.title.trim()) return {ok: false, error: 'Ingresa el nombre del producto.'};
      const mod = containsProhibitedContent(`${input.title} ${input.description}`);
      if (mod.blocked) {
        return {ok: false, error: `Publicación bloqueada por término prohibido ("${mod.matchedTerm}").`};
      }
      const item: CampusItem = {
        id: `item-${Date.now()}`,
        sellerId: currentUser.id,
        sellerName: currentUser.realName,
        sellerSemester: currentUser.semester,
        sellerRating: currentUser.rating,
        title: input.title.trim(),
        description: input.description.trim() || 'Disponible para entrega inmediata dentro del campus.',
        price: Number(input.price.toFixed(2)),
        location: input.location.trim() || 'Residencias Multis',
        stock: Math.max(1, input.stock),
        category: input.category,
        imageUrl: input.imageUrl || '/src/assets/images/campus_snacks_combo_1795204115529.jpg',
        createdAt: Date.now(),
        reportsCount: 0,
      };
      updateAppState((prev) => ({
        ...prev,
        campusItems: [item, ...prev.campusItems],
      }));
      notify('Producto publicado en Aquí Ya.', 'success');
      return {ok: true};
    },
    [currentUser, notify, updateAppState],
  );

  const reserveCampusItem = useCallback(
    (itemId: string) => {
      if (!currentUser) return;
      const item = appState.campusItems.find((i) => i.id === itemId);
      if (!item || item.stock <= 0) {
        notify('Este artículo ya no tiene unidades disponibles.', 'warning');
        return;
      }
      const createdNow = Date.now();
      const instantOrder: DeliveryOrder = {
        id: `ord-ya-${createdNow}`,
        title: `[Aquí Ya] ${item.title}`,
        details: `Entrega inmediata en ${item.location}. Vendedor: ${item.sellerName}.`,
        routeId: 'multis-bloques',
        origin: item.location,
        destination: 'Entrega presencial en campus',
        estimatedProductCost: item.price,
        deliveryFee: 0,
        paymentMethod: 'deuna',
        paymentFlow: 'cod',
        status: 'en_route',
        buyerId: currentUser.id,
        buyerName: currentUser.realName,
        buyerSemester: currentUser.semester,
        buyerRating: currentUser.rating,
        courierId: item.sellerId,
        courierName: item.sellerName,
        courierSemester: item.sellerSemester,
        courierDeuna:
          appState.profiles.find((p) => p.id === item.sellerId)?.deunaAccount || 'Deuna en entrega',
        createdAt: createdNow,
        expiresAt: createdNow + 25 * 60_000,
        stageDeadlineAt: createdNow + 15 * 60_000,
        deliveryPin: generateFourDigitPin(),
        version: 1,
        reportsCount: 0,
        imageUrl: item.imageUrl,
      };

      updateAppState((prev) => ({
        ...prev,
        campusItems: prev.campusItems.map((i) =>
          i.id === itemId ? {...i, stock: Math.max(0, i.stock - 1)} : i,
        ),
        orders: [instantOrder, ...prev.orders],
        chats: {
          ...prev.chats,
          [instantOrder.id]: [
            {
              id: `msg-ya-${createdNow}`,
              orderId: instantOrder.id,
              senderId: 'system',
              senderName: 'DePaso',
              senderRole: 'system',
              text: `Reserva inmediata de "${item.title}". Coordina la entrega en ${item.location} y verifica con PIN.`,
              createdAt: createdNow,
              readByBuyer: true,
              readByCourier: false,
            },
          ],
        },
      }));
      notify(`Reservaste "${item.title}". Revisa Activos para coordinar la entrega.`, 'success');
    },
    [appState.campusItems, appState.profiles, currentUser, notify, updateAppState],
  );

  const reportListing = useCallback(
    (kind: 'order' | 'trip' | 'item', id: string) => {
      updateAppState((prev) => {
        if (kind === 'order') {
          return {
            ...prev,
            orders: prev.orders.map((o) => {
              if (o.id !== id) return o;
              const reportsCount = o.reportsCount + 1;
              return {
                ...o,
                reportsCount,
                hiddenByModeration: shouldAutoHideListing(reportsCount),
              };
            }),
          };
        }
        if (kind === 'trip') {
          return {
            ...prev,
            trips: prev.trips.map((t) => {
              if (t.id !== id) return t;
              const reportsCount = t.reportsCount + 1;
              return {
                ...t,
                reportsCount,
                hiddenByModeration: shouldAutoHideListing(reportsCount),
              };
            }),
          };
        }
        return {
          ...prev,
          campusItems: prev.campusItems.map((i) => {
            if (i.id !== id) return i;
            const reportsCount = i.reportsCount + 1;
            return {
              ...i,
              reportsCount,
              hiddenByModeration: shouldAutoHideListing(reportsCount),
            };
          }),
        };
      });
      notify('Reporte registrado. Al acumular 3 reportes se suspende automáticamente.', 'warning');
    },
    [notify, updateAppState],
  );

  const resetDemo = useCallback(() => {
    const fresh = depasoService.resetDemoData();
    setAppState(fresh);
    notify('Datos de demostración restaurados.', 'neutral');
  }, [notify]);

  return {
    appState,
    currentUser,
    roleView,
    setRoleView,
    now,
    toast,
    notify,
    loginWithMoodle,
    switchDemoProfile,
    logout,
    saveDeunaAccount,
    createOrder,
    boostOrderFee,
    acceptOrder,
    submitReceiptAndPurchase,
    approvePriceAndUploadDeuna,
    confirmDeunaAndStartRoute,
    markArrived,
    completeDeliveryWithPin,
    cancelOrder,
    submitMutualRating,
    sendOrderChatMessage,
    markChatRead,
    createTravelerTrip,
    joinTrip,
    createCampusItem,
    reserveCampusItem,
    reportListing,
    resetDemo,
  };
}
