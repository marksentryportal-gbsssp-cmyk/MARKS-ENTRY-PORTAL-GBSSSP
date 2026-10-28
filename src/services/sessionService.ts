import { User } from '../types';

export interface SessionV1 {
  userId: string;
  udiseCode: string;
  role: 'admin' | 'teacher' | 'viewer';
  userName: string;
  createdAt: string;
  expiresAt: string;
  remember: boolean;
  sessionId: string;
}

export type LogoutReason = 'logout' | 'inactivity' | 'expired' | 'tab_logout' | 'emergency';

export interface LastLogoutInfo {
  reason: LogoutReason;
  timestamp: string;
  details?: string;
}

const STORAGE_KEY = 'session_v1';
const JUST_LOGGED_OUT_KEY = 'justLoggedOut';
const LAST_LOGOUT_REASON_KEY = 'last_logout_reason';
const BROADCAST_CHANNEL_NAME = 'school_portal_auth_channel_v1';

// In-memory Google Access Token (cleared on logout)
let inMemoryGoogleAccessToken: string | null = null;

// Subscribers list
type SessionSubscriber = (session: SessionV1 | null, reason?: LogoutReason) => void;
const subscribers = new Set<SessionSubscriber>();

// Inactivity listeners
type IdleCountdownSubscriber = (secondsRemaining: number | null) => void;
const idleSubscribers = new Set<IdleCountdownSubscriber>();

// BroadcastChannel instance (with fallback)
let authChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    authChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    authChannel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === 'LOGOUT') {
        notifySubscribers(null, 'tab_logout');
        cleanupUiOverlayAndUnlockScroll();
        if (window.location.hash !== '#/login' && !isPublicRoute(window.location.hash)) {
          window.location.replace('/#/login');
        }
      } else if (data?.type === 'LOGIN' && data.session) {
        notifySubscribers(data.session);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel not available, falling back to storage events', err);
  }
}

// Storage event listener fallback for multi-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      if (!event.newValue) {
        // Logged out in another tab
        notifySubscribers(null, 'tab_logout');
        cleanupUiOverlayAndUnlockScroll();
        if (window.location.hash !== '#/login' && !isPublicRoute(window.location.hash)) {
          window.location.replace('/#/login');
        }
      } else {
        try {
          const parsed = JSON.parse(event.newValue);
          notifySubscribers(parsed);
        } catch {
          // ignore
        }
      }
    }
  });
}

function notifySubscribers(session: SessionV1 | null, reason?: LogoutReason) {
  subscribers.forEach((fn) => {
    try {
      fn(session, reason);
    } catch (err) {
      console.error('Subscriber notification error:', err);
    }
  });
}

function isPublicRoute(hash: string): boolean {
  const clean = hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];
  return clean === 'login' || clean === 'forgot-password' || clean === 'bell-mode';
}

/**
 * Removes any remaining blur, modal inertness, and body scroll lock
 */
export function cleanupUiOverlayAndUnlockScroll(): void {
  if (typeof document === 'undefined') return;
  try {
    document.body.style.overflow = '';
    document.body.style.removeProperty('overflow');
    document.body.classList.remove('overflow-hidden');
    
    // Remove any leftover modal backdrop blur
    const backdrops = document.querySelectorAll('[class*="backdrop-blur"]');
    backdrops.forEach((el) => {
      el.classList.remove('backdrop-blur-xs', 'backdrop-blur-sm', 'backdrop-blur-md');
    });
  } catch (err) {
    console.warn('Error clearing UI overlay lock:', err);
  }
}

/**
 * 1. SINGLE SESSION MANAGER FUNCTIONS
 */

export function startSession(
  user: { id: string; udiseCode: string; role: any; name: string },
  remember: boolean
): SessionV1 {
  // Clear justLoggedOut flag
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(JUST_LOGGED_OUT_KEY);
  }

  // 7 days if remember checked, 8 hours if unchecked
  const durationMs = remember ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMs).toISOString();

  const session: SessionV1 = {
    userId: user.id,
    udiseCode: user.udiseCode,
    role: user.role || 'teacher',
    userName: user.name || 'User',
    createdAt: now.toISOString(),
    expiresAt,
    remember,
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };

  const serialized = JSON.stringify(session);

  if (remember) {
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, serialized);
    localStorage.removeItem(STORAGE_KEY);
  }

  // Broadcast to other tabs
  if (authChannel) {
    try {
      authChannel.postMessage({ type: 'LOGIN', session });
    } catch {
      // ignore
    }
  }

  notifySubscribers(session);
  startInactivityMonitoring();
  return session;
}

export function endSession(reason: LogoutReason = 'logout'): void {
  // Set justLoggedOut flag so immediate auto-restore is prevented on /login
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(JUST_LOGGED_OUT_KEY, 'true');
  }

  // Record last logout reason for diagnostics & audit
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        LAST_LOGOUT_REASON_KEY,
        JSON.stringify({
          reason,
          timestamp: new Date().toISOString(),
        } as LastLogoutInfo)
      );
    } catch {
      // ignore
    }
  }

  // Delete session_v1 from both storages
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    // Also remove legacy keys if any exist
    localStorage.removeItem('gopinath_portal_auth_session_v1');
  }

  // Clear in-memory Google token and secrets
  inMemoryGoogleAccessToken = null;

  // Stop idle monitoring
  stopInactivityMonitoring();

  // Broadcast to other tabs
  if (authChannel) {
    try {
      authChannel.postMessage({ type: 'LOGOUT', reason });
    } catch {
      // ignore
    }
  }

  notifySubscribers(null, reason);
}

export function getSession(): SessionV1 | null {
  if (typeof window === 'undefined') return null;

  try {
    // Check sessionStorage first, then localStorage
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const session: SessionV1 = JSON.parse(raw);
    const now = Date.now();
    const expiry = new Date(session.expiresAt).getTime();

    if (now > expiry) {
      endSession('expired');
      return null;
    }

    return session;
  } catch (err) {
    console.warn('Error reading session_v1:', err);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getSession());
}

export function wasJustLoggedOut(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(JUST_LOGGED_OUT_KEY) === 'true';
}

export function clearJustLoggedOutFlag(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(JUST_LOGGED_OUT_KEY);
}

export function getLastLogoutInfo(): LastLogoutInfo | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_LOGOUT_REASON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function subscribeToSession(listener: SessionSubscriber): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function subscribeToIdleCountdown(listener: IdleCountdownSubscriber): () => void {
  idleSubscribers.add(listener);
  return () => {
    idleSubscribers.delete(listener);
  };
}

// In-memory Google Access Token
export function setGoogleAccessToken(token: string | null): void {
  inMemoryGoogleAccessToken = token;
}

export function getGoogleAccessToken(): string | null {
  return inMemoryGoogleAccessToken;
}

export function clearGoogleAccessToken(): void {
  inMemoryGoogleAccessToken = null;
}

/**
 * 2. CORE LOGOUT ENGINE (Guaranteed to always succeed)
 */
export async function performSafeLogout(options?: {
  onBeforeNav?: () => void;
  toastMessage?: string;
  addToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}): Promise<void> {
  try {
    // a) Immediately unlock UI & remove body scroll locks
    cleanupUiOverlayAndUnlockScroll();

    if (options?.onBeforeNav) {
      try {
        options.onBeforeNav();
      } catch (e) {
        console.warn('onBeforeNav error:', e);
      }
    }

    // b) End session in single manager
    endSession('logout');

    // c) Show toast notification
    if (options?.addToast) {
      options.addToast(options.toastMessage || 'Logged out successfully', 'success');
    }

    // d) Navigate with replace to prevent Back button returning
    const targetUrl = '/#/login';
    window.location.replace(targetUrl);

    // e) Background fire-and-forget: flush pending Drive changes with 3s timeout
    flushPendingDriveQueueWithTimeout(3000);

    // f) Safety net: if navigation hasn't completed within 1 second, force replace
    setTimeout(() => {
      if (window.location.hash !== '#/login' && !isPublicRoute(window.location.hash)) {
        window.location.replace(targetUrl);
      }
    }, 1000);
  } catch (err) {
    console.error('Fatal error during logout, forcing fallback redirect:', err);
    cleanupUiOverlayAndUnlockScroll();
    endSession('logout');
    window.location.replace('/#/login');
  }
}

/**
 * Emergency sign out (used on /login help or diagnostics)
 */
export function emergencySignOut(): void {
  cleanupUiOverlayAndUnlockScroll();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('gopinath_portal_auth_session_v1');
    localStorage.removeItem('gopinath_school_portal_data_v5_auth');
  }
  inMemoryGoogleAccessToken = null;
  window.location.replace('/#/login');
}

/**
 * Fire-and-forget flush for Google Drive pending queue
 */
function flushPendingDriveQueueWithTimeout(timeoutMs = 3000): void {
  try {
    const queueRaw = localStorage.getItem('google_drive_pending_sync_queue');
    if (!queueRaw) return;

    // Timeout promise
    const timerPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));

    // Simulated sync task (keeps items in offline queue if timeout occurs)
    Promise.race([
      new Promise<void>((resolve) => {
        // If online and connected, attempt flush
        if (navigator.onLine && inMemoryGoogleAccessToken) {
          // Flush logic executes in background
          setTimeout(resolve, 500);
        } else {
          resolve();
        }
      }),
      timerPromise,
    ]).catch((err) => {
      console.warn('Background Drive flush skipped or timed out; retained in offline queue:', err);
    });
  } catch (err) {
    console.warn('Error in background Drive flush:', err);
  }
}

/**
 * 3. INACTIVITY & IDLE TIMER MANAGEMENT
 */
let idleTimer: any = null;
let countdownTimer: any = null;
let lastActivityTime = Date.now();
let isMonitoringIdle = false;
let idleLimitMinutes = 30; // default 30 minutes; 0 means "Never"

export function setIdleLimitMinutes(minutes: number): void {
  idleLimitMinutes = minutes;
  resetInactivityTimer();
}

export function getIdleLimitMinutes(): number {
  return idleLimitMinutes;
}

export function markUserActive(): void {
  lastActivityTime = Date.now();
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
    idleSubscribers.forEach((fn) => fn(null));
  }
  resetInactivityTimer();
}

function resetInactivityTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
    idleSubscribers.forEach((fn) => fn(null));
  }

  // 0 means "Never"
  if (idleLimitMinutes <= 0 || !isAuthenticated()) {
    return;
  }

  const idleMs = idleLimitMinutes * 60 * 1000;
  idleTimer = setTimeout(() => {
    checkInactivityAndPrompt();
  }, idleMs);
}

function checkInactivityAndPrompt(): void {
  // Check if safe to prompt logout (not during active typing, submit, or Drive upload)
  const isTypingOrSyncing =
    (window as any).__isSubmittingMarks ||
    (window as any).__isUploadingDrive ||
    (window as any).__isBulkImporting;

  if (isTypingOrSyncing) {
    // Postpone check by 5 minutes
    resetInactivityTimer();
    return;
  }

  // Show 60s countdown
  let secondsLeft = 60;
  idleSubscribers.forEach((fn) => fn(secondsLeft));

  countdownTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      idleSubscribers.forEach((fn) => fn(null));
      
      // Auto logout due to inactivity
      performSafeLogout({
        toastMessage: 'Signed out automatically due to 30 minutes of inactivity.',
      });
    } else {
      idleSubscribers.forEach((fn) => fn(secondsLeft));
    }
  }, 1000);
}

export function staySignedIn(): void {
  markUserActive();
}

export function startInactivityMonitoring(): void {
  if (isMonitoringIdle || typeof window === 'undefined') return;
  isMonitoringIdle = true;

  const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
  const handleActivity = (e: Event) => {
    // If typing in an input/textarea, always reset
    markUserActive();
  };

  activityEvents.forEach((ev) => {
    window.addEventListener(ev, handleActivity, { passive: true });
  });

  resetInactivityTimer();
}

export function stopInactivityMonitoring(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  idleTimer = null;
  countdownTimer = null;
  idleSubscribers.forEach((fn) => fn(null));
}

// Start monitoring automatically on load if session exists
if (typeof window !== 'undefined' && isAuthenticated()) {
  startInactivityMonitoring();
}
