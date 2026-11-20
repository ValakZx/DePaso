import {getRouteConfig} from './routes';
import {
  DeliveryOrder,
  OrderStatus,
  PaymentFlowType,
  RouteId,
  StudentProfile,
  TravelerTrip,
  TrustLevel,
} from './types';

export const LEVEL_1_MAX_PRODUCT_COST = 6.0;
export const LEVEL_2_MIN_DELIVERIES = 3;
export const AUTO_SUSPEND_REPORTS_THRESHOLD = 3;
export const ARRIVAL_COURTESY_MS = 5 * 60 * 1000; // 5 minutes
export const CHAT_AUTO_PURGE_HOURS = 72;

export const PROHIBITED_TERMS = [
  'marihuana',
  'weed',
  'cocaína',
  'cocaina',
  'droga',
  'drogas',
  'lsd',
  'vape ilegal',
  'arma',
  'pistola',
  'cuchillo',
  'explosivo',
  'pólvora',
  'polvora',
  'sustancia ilícita',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function containsProhibitedContent(text: string): {blocked: boolean; matchedTerm?: string} {
  const normalized = normalizeText(text);
  for (const term of PROHIBITED_TERMS) {
    const normalizedTerm = normalizeText(term);
    const pattern = new RegExp(`(^|[^a-z0-9])${normalizedTerm}([^a-z0-9]|$)`, 'i');
    if (pattern.test(normalized)) {
      return {blocked: true, matchedTerm: term};
    }
  }
  return {blocked: false};
}

export function computeTrustLevel(completedDeliveries: number, reportsCount: number): TrustLevel {
  if (completedDeliveries >= LEVEL_2_MIN_DELIVERIES && reportsCount === 0) {
    return 2;
  }
  return 1;
}

export function determinePaymentFlow(routeId: RouteId, estimatedProductCost: number): PaymentFlowType {
  if (routeId === 'quito-campus') {
    return 'shipping_only_cod';
  }
  if (routeId === 'ibarra-campus') {
    return 'two_step_deuna';
  }
  if (routeId === 'urcuqui-campus' && estimatedProductCost > LEVEL_1_MAX_PRODUCT_COST) {
    return 'two_step_deuna';
  }
  return 'cod';
}

export function validateOrderCreation(params: {
  title: string;
  details: string;
  routeId: RouteId;
  estimatedProductCost: number;
  deliveryFee: number;
  user: StudentProfile;
}): ValidationResult {
  const {title, details, routeId, estimatedProductCost, deliveryFee, user} = params;

  if (user.isSuspended) {
    return {valid: false, error: 'Tu cuenta se encuentra suspendida temporalmente por reportes acumulados.'};
  }

  if (!title.trim() || title.trim().length < 3) {
    return {valid: false, error: 'Escribe qué necesitas (mínimo 3 caracteres).'};
  }

  const modCheck = containsProhibitedContent(`${title} ${details}`);
  if (modCheck.blocked) {
    return {
      valid: false,
      error: `Publicación bloqueada por moderación: el término "${modCheck.matchedTerm}" no está permitido en DePaso.`,
    };
  }

  if (Number.isNaN(estimatedProductCost) || estimatedProductCost < 0 || estimatedProductCost > 150) {
    return {valid: false, error: 'Ingresa un costo estimado entre $0.00 y $150.00 USD.'};
  }

  if (Number.isNaN(deliveryFee) || deliveryFee < 0.25 || deliveryFee > 25) {
    return {valid: false, error: 'La tarifa de envío debe ser al menos $0.25 USD.'};
  }

  const route = getRouteConfig(routeId);
  if (user.trustLevel === 1) {
    if (route.requiresLevel2) {
      return {
        valid: false,
        error: `La ruta ${route.label} requiere Nivel 2 (${LEVEL_2_MIN_DELIVERIES}+ entregas exitosas sin reportes).`,
      };
    }
    if (estimatedProductCost > LEVEL_1_MAX_PRODUCT_COST) {
      return {
        valid: false,
        error: `Cuentas Nivel 1 tienen límite sugerido de $${LEVEL_1_MAX_PRODUCT_COST.toFixed(2)} USD. Completa ${LEVEL_2_MIN_DELIVERIES} entregas para desbloquear montos mayores.`,
      };
    }
  }

  return {valid: true};
}

export function applyFeeBoost(
  order: DeliveryOrder,
  increment: 0.25 | 0.5,
): {ok: boolean; order?: DeliveryOrder; error?: string} {
  if (order.status !== 'open') {
    return {ok: false, error: 'Solo puedes impulsar pedidos que aún están abiertos.'};
  }
  const nextFee = Number((order.deliveryFee + increment).toFixed(2));
  if (nextFee > 25) {
    return {ok: false, error: 'Se alcanzó el tope máximo de tarifa para este pedido.'};
  }
  return {
    ok: true,
    order: {
      ...order,
      deliveryFee: nextFee,
      version: order.version + 1,
    },
  };
}

export function canAcceptOrder(
  order: DeliveryOrder,
  courier: StudentProfile,
  expectedVersion: number,
  openPackageAcknowledged?: boolean,
): ValidationResult {
  if (courier.isSuspended) {
    return {valid: false, error: 'Cuenta suspendida por reportes.'};
  }
  if (order.status !== 'open') {
    return {valid: false, error: 'Este pedido ya fue tomado por otro repartidor.'};
  }
  if (order.version !== expectedVersion) {
    return {
      valid: false,
      error: 'Conflicto de concurrencia: otro estudiante acaba de actualizar o tomar este pedido.',
    };
  }
  if (order.buyerId === courier.id) {
    return {valid: false, error: 'No puedes aceptar tu propio pedido. Cambia de perfil demo para probar ambos lados.'};
  }
  const route = getRouteConfig(order.routeId);
  if (route.requiresLevel2 && courier.trustLevel < 2) {
    return {
      valid: false,
      error: `Necesitas Nivel 2 (${LEVEL_2_MIN_DELIVERIES}+ entregas exitosas) para aceptar pedidos en ${route.label}.`,
    };
  }
  if (route.requiresOpenPackageWarning && !openPackageAcknowledged) {
    return {
      valid: false,
      error: 'Debes confirmar el aviso de seguridad de paquete abierto antes de aceptar rutas Ibarra/Quito.',
    };
  }
  if (!courier.deunaAccount || courier.deunaAccount.trim().length < 5) {
    return {
      valid: false,
      error: 'NEEDS_DEUNA_ONBOARDING',
    };
  }
  return {valid: true};
}

export function acceptOrderAtomic(
  order: DeliveryOrder,
  courier: StudentProfile,
  expectedVersion: number,
  now: number,
  openPackageAcknowledged?: boolean,
): {ok: boolean; order?: DeliveryOrder; error?: string} {
  const check = canAcceptOrder(order, courier, expectedVersion, openPackageAcknowledged);
  if (!check.valid) {
    return {ok: false, error: check.error};
  }
  const route = getRouteConfig(order.routeId);
  return {
    ok: true,
    order: {
      ...order,
      status: 'accepted',
      courierId: courier.id,
      courierName: courier.realName,
      courierSemester: courier.semester,
      courierDeuna: courier.deunaAccount,
      openPackageAcknowledged: Boolean(openPackageAcknowledged),
      stageDeadlineAt: now + route.stageTimeoutMinutes * 60 * 1000,
      version: order.version + 1,
    },
  };
}

export function canBuyerCancelOrder(status: OrderStatus): boolean {
  return status === 'open' || status === 'accepted';
}

export function verifyDeliveryPin(order: DeliveryOrder, enteredPin: string): ValidationResult {
  const cleaned = enteredPin.replace(/\D/g, '');
  if (cleaned.length !== 4) {
    return {valid: false, error: 'Ingresa los 4 dígitos del PIN presencial del comprador.'};
  }
  if (cleaned !== order.deliveryPin) {
    return {valid: false, error: 'PIN incorrecto. Verifica el código directamente con el comprador.'};
  }
  return {valid: true};
}

export function joinTravelerTripAtomic(
  trip: TravelerTrip,
  userId: string,
  now: number,
): {ok: boolean; trip?: TravelerTrip; error?: string} {
  if (trip.expiresAt <= now) {
    return {ok: false, error: 'Este anuncio de viaje ya expiró.'};
  }
  if (trip.travelerId === userId) {
    return {ok: false, error: 'No puedes sumarte a tu propio viaje.'};
  }
  if (trip.joinedUserIds.includes(userId)) {
    return {ok: false, error: 'Ya tienes un cupo reservado en este viaje.'};
  }
  if (trip.occupiedSlots >= trip.maxSlots) {
    return {ok: false, error: 'Todos los cupos de este viaje ya fueron ocupados.'};
  }
  return {
    ok: true,
    trip: {
      ...trip,
      occupiedSlots: trip.occupiedSlots + 1,
      joinedUserIds: [...trip.joinedUserIds, userId],
    },
  };
}

export function computeUpdatedRating(currentRating: number, currentCount: number, newStars: number): {
  rating: number;
  count: number;
} {
  const clamped = Math.max(1, Math.min(5, Math.round(newStars)));
  const total = currentRating * currentCount + clamped;
  const count = currentCount + 1;
  return {
    rating: Number((total / count).toFixed(2)),
    count,
  };
}

export function shouldAutoHideListing(reportsCount: number): boolean {
  return reportsCount >= AUTO_SUSPEND_REPORTS_THRESHOLD;
}

export function generateFourDigitPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
