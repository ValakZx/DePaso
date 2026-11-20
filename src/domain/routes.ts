import {RouteConfig, RouteId} from './types';

export const ROUTES: RouteConfig[] = [
  {
    id: 'multis-bloques',
    label: 'Multis ↔ Bloques',
    shortLabel: 'Multis ↔ Bloques',
    typicalUse: 'Encebollado, bolón, almuerzos y café dentro del campus',
    minFee: 0.25,
    maxFee: 0.5,
    defaultFee: 0.35,
    paymentRuleSummary: 'Contra entrega (Efectivo o Deuna)',
    requiresOpenPackageWarning: false,
    requiresLevel2: false,
    defaultOrigins: ['Comedores Multis', 'Cafetería Multis', 'Minimarket Residencias'],
    defaultDestinations: ['Bloques Académicos B2', 'Biblioteca Central', 'Laboratorios Innopolis'],
    stageTimeoutMinutes: 25,
  },
  {
    id: 'urcuqui-campus',
    label: 'Urcuquí ↔ Campus',
    shortLabel: 'Urcuquí',
    typicalUse: 'Farmacia, comida, papelería y víveres (~15 min en bus)',
    minFee: 0.5,
    maxFee: 1.0,
    defaultFee: 0.75,
    paymentRuleSummary: 'Contra entrega si ≤ $6 · Pago en dos tiempos si > $6',
    requiresOpenPackageWarning: false,
    requiresLevel2: false,
    defaultOrigins: ['Farmacia Cruz Azul Urcuquí', 'Parque Central Urcuquí', 'Papelería El Estudiante'],
    defaultDestinations: ['Garita Principal Campus', 'Residencias Multis', 'Bloques Académicos'],
    stageTimeoutMinutes: 45,
  },
  {
    id: 'ibarra-campus',
    label: 'Ibarra ↔ Campus',
    shortLabel: 'Ibarra',
    typicalUse: 'Supermercado, compras específicas (viajeros diarios)',
    minFee: 1.0,
    maxFee: 2.5,
    defaultFee: 1.75,
    paymentRuleSummary: 'Pago en dos tiempos con foto de producto o factura',
    requiresOpenPackageWarning: true,
    requiresLevel2: true,
    defaultOrigins: ['Supermaxi Ibarra', 'Laguna Mall Ibarra', 'Terminal Terrestre Ibarra'],
    defaultDestinations: ['Garita Principal Campus', 'Residencias Multis', 'Bloques Académicos'],
    stageTimeoutMinutes: 90,
  },
  {
    id: 'quito-campus',
    label: 'Quito ↔ Campus',
    shortLabel: 'Quito',
    typicalUse: 'Encomiendas familiares y paquetes de fin de semana',
    minFee: 3.0,
    maxFee: 6.0,
    defaultFee: 4.5,
    paymentRuleSummary: 'Solo tarifa de envío contra entrega (verificación de paquete abierto)',
    requiresOpenPackageWarning: true,
    requiresLevel2: true,
    defaultOrigins: ['Terminal Carcelén Quito', 'Norte de Quito (CCI)', 'Cumbayá / Valles'],
    defaultDestinations: ['Garita Principal Campus', 'Residencias Multis'],
    stageTimeoutMinutes: 180,
  },
];

export const ROUTE_MAP: Record<RouteId, RouteConfig> = ROUTES.reduce(
  (acc, route) => {
    acc[route.id] = route;
    return acc;
  },
  {} as Record<RouteId, RouteConfig>,
);

export function getRouteConfig(routeId: RouteId): RouteConfig {
  return ROUTE_MAP[routeId] ?? ROUTES[0];
}
