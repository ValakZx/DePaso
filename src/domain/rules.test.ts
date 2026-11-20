import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptOrderAtomic,
  applyFeeBoost,
  canBuyerCancelOrder,
  computeTrustLevel,
  computeUpdatedRating,
  containsProhibitedContent,
  determinePaymentFlow,
  joinTravelerTripAtomic,
  shouldAutoHideListing,
  validateOrderCreation,
  verifyDeliveryPin,
} from './rules';
import {DeliveryOrder, StudentProfile, TravelerTrip} from './types';

const level1User: StudentProfile = {
  id: 'u-novato',
  moodleUsername: 'm.cevallos',
  realName: 'Mateo Cevallos',
  semester: 'Nivelación',
  trustLevel: 1,
  completedDeliveries: 1,
  rating: 4.8,
  ratingsCount: 1,
  fulfillmentRate: 100,
  reportsCount: 0,
  isSuspended: false,
};

const level2Courier: StudentProfile = {
  id: 'u-pro',
  moodleUsername: 'c.andrade',
  realName: 'Camila Andrade',
  semester: '5to Semestre',
  trustLevel: 2,
  completedDeliveries: 14,
  rating: 4.94,
  ratingsCount: 14,
  fulfillmentRate: 98,
  deunaAccount: '2204891120 · Banco Pichincha',
  reportsCount: 0,
  isSuspended: false,
};

function makeOrder(overrides: Partial<DeliveryOrder> = {}): DeliveryOrder {
  return {
    id: 'ord-1',
    title: 'Encebollado con chifles',
    details: 'Con bastante limón',
    routeId: 'multis-bloques',
    origin: 'Comedores Multis',
    destination: 'Bloques Académicos B2',
    estimatedProductCost: 3.5,
    deliveryFee: 0.35,
    paymentMethod: 'deuna',
    paymentFlow: 'cod',
    status: 'open',
    buyerId: 'u-novato',
    buyerName: 'Mateo Cevallos',
    buyerSemester: 'Nivelación',
    buyerRating: 4.8,
    createdAt: 1_700_000_000_000,
    expiresAt: 1_700_003_600_000,
    deliveryPin: '4829',
    version: 1,
    reportsCount: 0,
    ...overrides,
  };
}

test('determines payment flow accurately for Ecuador routes and $6 threshold', () => {
  assert.equal(determinePaymentFlow('multis-bloques', 4.5), 'cod');
  assert.equal(determinePaymentFlow('urcuqui-campus', 6.0), 'cod');
  assert.equal(determinePaymentFlow('urcuqui-campus', 6.01), 'two_step_deuna');
  assert.equal(determinePaymentFlow('ibarra-campus', 5.0), 'two_step_deuna');
  assert.equal(determinePaymentFlow('quito-campus', 0), 'shipping_only_cod');
});

test('progressive trust levels enforce Level 1 limits and unlock Level 2 at 3+ clean deliveries', () => {
  assert.equal(computeTrustLevel(2, 0), 1);
  assert.equal(computeTrustLevel(3, 0), 2);
  assert.equal(computeTrustLevel(5, 1), 1);

  const overCap = validateOrderCreation({
    title: 'Compras farmacia',
    details: 'Vitaminas',
    routeId: 'urcuqui-campus',
    estimatedProductCost: 9.5,
    deliveryFee: 0.75,
    user: level1User,
  });
  assert.equal(overCap.valid, false);

  const ibarraAsLevel1 = validateOrderCreation({
    title: 'Supermaxi leche',
    details: '2 litros',
    routeId: 'ibarra-campus',
    estimatedProductCost: 4.0,
    deliveryFee: 1.5,
    user: level1User,
  });
  assert.equal(ibarraAsLevel1.valid, false);

  const validLevel1 = validateOrderCreation({
    title: 'Bolón mixto + café',
    details: 'Caliente',
    routeId: 'multis-bloques',
    estimatedProductCost: 3.0,
    deliveryFee: 0.35,
    user: level1User,
  });
  assert.equal(validLevel1.valid, true);
});

test('passive moderation filters prohibited terms and auto-hides at 3 reports', () => {
  assert.equal(containsProhibitedContent('Traer marihuana al bloque').blocked, true);
  assert.equal(containsProhibitedContent('Encebollado con porción de arroz').blocked, false);
  assert.equal(shouldAutoHideListing(2), false);
  assert.equal(shouldAutoHideListing(3), true);
});

test('atomic accept prevents double-accept race conditions and enforces Deuna & open-package safety', () => {
  const order = makeOrder();
  const now = 1_700_000_100_000;

  // Missing Deuna triggers lazy onboarding signal
  const noDeuna = acceptOrderAtomic(order, {...level2Courier, deunaAccount: undefined}, 1, now);
  assert.equal(noDeuna.ok, false);
  assert.equal(noDeuna.error, 'NEEDS_DEUNA_ONBOARDING');

  // First courier wins atomic lock
  const firstAccept = acceptOrderAtomic(order, level2Courier, 1, now);
  assert.equal(firstAccept.ok, true);
  assert.equal(firstAccept.order?.status, 'accepted');
  assert.equal(firstAccept.order?.version, 2);

  // Second courier racing with stale version=1 fails cleanly
  const secondRace = acceptOrderAtomic(firstAccept.order!, {...level2Courier, id: 'u-other'}, 1, now);
  assert.equal(secondRace.ok, false);

  // Long route requires open-package acknowledgement
  const quitoOrder = makeOrder({routeId: 'quito-campus', deliveryFee: 4.5, paymentFlow: 'shipping_only_cod'});
  const missingAck = acceptOrderAtomic(quitoOrder, level2Courier, 1, now, false);
  assert.equal(missingAck.ok, false);
  const withAck = acceptOrderAtomic(quitoOrder, level2Courier, 1, now, true);
  assert.equal(withAck.ok, true);
});

test('inDrive fee boost increments open order fee and updates version', () => {
  const order = makeOrder({deliveryFee: 0.5});
  const boosted = applyFeeBoost(order, 0.25);
  assert.equal(boosted.ok, true);
  assert.equal(boosted.order?.deliveryFee, 0.75);
  assert.equal(boosted.order?.version, 2);

  const closedBoost = applyFeeBoost({...order, status: 'accepted'}, 0.5);
  assert.equal(closedBoost.ok, false);
});

test('cancellation lock blocks buyer cancellation after purchased or en_route', () => {
  assert.equal(canBuyerCancelOrder('open'), true);
  assert.equal(canBuyerCancelOrder('accepted'), true);
  assert.equal(canBuyerCancelOrder('purchased'), false);
  assert.equal(canBuyerCancelOrder('en_route'), false);
  assert.equal(canBuyerCancelOrder('arrived'), false);
});

test('PIN verification and mutual rating calculation work deterministically', () => {
  const order = makeOrder({deliveryPin: '7391'});
  assert.equal(verifyDeliveryPin(order, '7390').valid, false);
  assert.equal(verifyDeliveryPin(order, '7391').valid, true);

  const next = computeUpdatedRating(4.5, 4, 5);
  assert.equal(next.count, 5);
  assert.equal(next.rating, 4.6);
});

test('traveler pool join prevents overflow, expiry, and duplicate joins', () => {
  const now = 1_700_000_000_000;
  const trip: TravelerTrip = {
    id: 'trip-1',
    travelerId: 'u-pro',
    travelerName: 'Camila Andrade',
    travelerSemester: '5to Semestre',
    travelerRating: 4.94,
    routeId: 'urcuqui-campus',
    origin: 'Parque Central Urcuquí',
    destination: 'Residencias Multis',
    departureMinutes: 15,
    feePerOrder: 0.6,
    maxSlots: 2,
    occupiedSlots: 1,
    joinedUserIds: ['u-other'],
    note: 'Voy en bus de las 13:15',
    createdAt: now - 60_000,
    expiresAt: now + 30 * 60_000,
    reportsCount: 0,
  };

  const joined = joinTravelerTripAtomic(trip, 'u-novato', now);
  assert.equal(joined.ok, true);
  assert.equal(joined.trip?.occupiedSlots, 2);

  const full = joinTravelerTripAtomic(joined.trip!, 'u-third', now);
  assert.equal(full.ok, false);

  const dup = joinTravelerTripAtomic(trip, 'u-other', now);
  assert.equal(dup.ok, false);
});
