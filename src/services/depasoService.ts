import {
  createSeedCampusItems,
  createSeedChats,
  createSeedOrders,
  createSeedTrips,
  DEMO_PROFILES,
} from '../data/seed';
import {CampusItem, ChatMessage, DeliveryOrder, StudentProfile, TravelerTrip} from '../domain/types';

const STORAGE_KEY = 'depaso_mvp_state_v1';
const SESSION_KEY = 'depaso_moodle_session_v1';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days persistent session

export interface PersistedAppState {
  profiles: StudentProfile[];
  orders: DeliveryOrder[];
  trips: TravelerTrip[];
  campusItems: CampusItem[];
  chats: Record<string, ChatMessage[]>;
  lastSyncedAt: number;
}

export interface MoodleSession {
  userId: string;
  moodleUsername: string;
  acceptedTermsAt: number;
  expiresAt: number;
}

/**
 * Service abstraction layer designed to connect directly to a REST + WebSocket/SSE backend
 * and Web Push Service Worker in production while persisting locally for intermittent campus signal.
 */
export const depasoService = {
  loadState(): PersistedAppState {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedAppState;
        if (parsed && Array.isArray(parsed.orders) && Array.isArray(parsed.profiles)) {
          return {
            ...parsed,
            lastSyncedAt: now,
          };
        }
      }
    } catch {
      // Fallback to clean seed state if localStorage is unavailable or corrupted
    }
    const fresh: PersistedAppState = {
      profiles: DEMO_PROFILES,
      orders: createSeedOrders(now),
      trips: createSeedTrips(now),
      campusItems: createSeedCampusItems(now),
      chats: createSeedChats(now),
      lastSyncedAt: now,
    };
    this.saveState(fresh);
    return fresh;
  },

  saveState(state: PersistedAppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors gracefully
    }
  },

  resetDemoData(): PersistedAppState {
    const now = Date.now();
    const fresh: PersistedAppState = {
      profiles: DEMO_PROFILES,
      orders: createSeedOrders(now),
      trips: createSeedTrips(now),
      campusItems: createSeedCampusItems(now),
      chats: createSeedChats(now),
      lastSyncedAt: now,
    };
    this.saveState(fresh);
    return fresh;
  },

  loadSession(): MoodleSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as MoodleSession;
      if (!session || session.expiresAt <= Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  saveSession(userId: string, moodleUsername: string): MoodleSession {
    const now = Date.now();
    const session: MoodleSession = {
      userId,
      moodleUsername,
      acceptedTermsAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage error
    }
    return session;
  },

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
  },

  /**
   * Simulates Moodle institutional endpoint verification without storing plaintext passwords.
   * Matches demo profiles or creates a real-named verified student profile from username.
   */
  authenticateMoodle(
    username: string,
    password: string,
    profiles: StudentProfile[],
  ): {ok: boolean; profile?: StudentProfile; isNew?: boolean; error?: string} {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      return {ok: false, error: 'Ingresa tu usuario institucional de Moodle.'};
    }
    if (!password || password.length < 4) {
      return {ok: false, error: 'Ingresa tu contraseña de Moodle (mínimo 4 caracteres).'};
    }

    const existing = profiles.find((p) => p.moodleUsername.toLowerCase() === cleanUser);
    if (existing) {
      return {ok: true, profile: existing, isNew: false};
    }

    // Format institutional username like "j.perez" -> "J. Perez"
    const formattedName = cleanUser
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const created: StudentProfile = {
      id: `stu-${Date.now()}`,
      moodleUsername: cleanUser,
      realName: formattedName || 'Estudiante Verificado',
      semester: 'Nivelación',
      trustLevel: 1,
      completedDeliveries: 0,
      rating: 5.0,
      ratingsCount: 0,
      fulfillmentRate: 100,
      reportsCount: 0,
      isSuspended: false,
    };
    return {ok: true, profile: created, isNew: true};
  },
};
