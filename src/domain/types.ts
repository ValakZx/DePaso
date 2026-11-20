export type RouteId = 'multis-bloques' | 'urcuqui-campus' | 'ibarra-campus' | 'quito-campus';

export type OrderStatus =
  | 'open'
  | 'accepted'
  | 'purchased'
  | 'en_route'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'deuna' | 'efectivo';

export type PaymentFlowType = 'cod' | 'two_step_deuna' | 'shipping_only_cod';

export type UserRoleView = 'buyer' | 'courier';

export type TrustLevel = 1 | 2;

export interface RouteConfig {
  id: RouteId;
  label: string;
  shortLabel: string;
  typicalUse: string;
  minFee: number;
  maxFee: number;
  defaultFee: number;
  paymentRuleSummary: string;
  requiresOpenPackageWarning: boolean;
  requiresLevel2: boolean;
  defaultOrigins: string[];
  defaultDestinations: string[];
  stageTimeoutMinutes: number;
}

export interface StudentProfile {
  id: string;
  moodleUsername: string;
  realName: string;
  semester: string;
  trustLevel: TrustLevel;
  completedDeliveries: number;
  rating: number;
  ratingsCount: number;
  fulfillmentRate: number;
  deunaAccount?: string;
  whatsappNumber?: string;
  reportsCount: number;
  isSuspended: boolean;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRoleView | 'system';
  text: string;
  imageUrl?: string;
  imageLabel?: string;
  whatsappShared?: string;
  createdAt: number;
  readByBuyer: boolean;
  readByCourier: boolean;
}

export interface DeliveryOrder {
  id: string;
  title: string;
  details: string;
  routeId: RouteId;
  origin: string;
  destination: string;
  estimatedProductCost: number;
  adjustedProductCost?: number;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  paymentFlow: PaymentFlowType;
  status: OrderStatus;
  buyerId: string;
  buyerName: string;
  buyerSemester: string;
  buyerRating: number;
  courierId?: string;
  courierName?: string;
  courierSemester?: string;
  courierDeuna?: string;
  createdAt: number;
  expiresAt: number;
  stageDeadlineAt?: number;
  arrivedAt?: number;
  arrivalDeadlineAt?: number;
  deliveryPin: string;
  receiptPhotoUrl?: string;
  receiptNote?: string;
  buyerPriceApproved?: boolean;
  deunaProofUrl?: string;
  deunaReference?: string;
  deunaConfirmedByCourier?: boolean;
  openPackageAcknowledged?: boolean;
  version: number;
  reportsCount: number;
  hiddenByModeration?: boolean;
  buyerRatedCourier?: number;
  courierRatedBuyer?: number;
  imageUrl?: string;
}

export interface TravelerTrip {
  id: string;
  travelerId: string;
  travelerName: string;
  travelerSemester: string;
  travelerRating: number;
  routeId: RouteId;
  origin: string;
  destination: string;
  departureMinutes: number;
  feePerOrder: number;
  maxSlots: number;
  occupiedSlots: number;
  joinedUserIds: string[];
  note: string;
  createdAt: number;
  expiresAt: number;
  reportsCount: number;
  hiddenByModeration?: boolean;
}

export interface CampusItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerSemester: string;
  sellerRating: number;
  title: string;
  description: string;
  price: number;
  location: string;
  stock: number;
  category: 'Comida' | 'Café & Snacks' | 'Tech & Impresiones';
  imageUrl: string;
  createdAt: number;
  reportsCount: number;
  hiddenByModeration?: boolean;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  model?: string;
  createdAt: number;
}
