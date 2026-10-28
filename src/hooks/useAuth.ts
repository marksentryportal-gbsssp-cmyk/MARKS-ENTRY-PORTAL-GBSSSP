import { useState, useEffect, useCallback } from 'react';
import {
  getSession,
  isAuthenticated as checkIsAuthenticated,
  subscribeToSession,
  performSafeLogout,
  emergencySignOut as runEmergencySignOut,
  SessionV1,
  LogoutReason,
} from '../services/sessionService';
import { usePortal } from '../store/portalStore';

export function useAuth() {
  const portal = usePortal();
  const [session, setSession] = useState<SessionV1 | null>(() => getSession());

  useEffect(() => {
    // Initial sync
    setSession(getSession());

    // Subscribe to session changes (including multi-tab broadcasts)
    const unsubscribe = subscribeToSession((newSession, reason) => {
      setSession(newSession);
      if (!newSession && reason === 'tab_logout') {
        portal.addToast('You have been logged out in another tab.', 'info');
      }
    });

    return unsubscribe;
  }, [portal]);

  const logout = useCallback(
    async (reason = 'logout') => {
      await performSafeLogout({
        onBeforeNav: () => {
          portal.setIsLogoutModalOpen(false);
        },
        addToast: (msg, type) => {
          portal.addToast(msg, type || 'success');
        },
      });
    },
    [portal]
  );

  const emergencySignOut = useCallback(() => {
    runEmergencySignOut();
  }, []);

  return {
    session,
    user: portal.currentUser,
    isAuthenticated: Boolean(session),
    logout,
    emergencySignOut,
    login: portal.login,
  };
}
