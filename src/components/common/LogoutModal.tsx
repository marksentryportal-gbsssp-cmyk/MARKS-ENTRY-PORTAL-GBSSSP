import React, { useState, useEffect } from 'react';
import { LogOut, X, AlertTriangle, Loader2 } from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { performSafeLogout, cleanupUiOverlayAndUnlockScroll } from '../../services/sessionService';

export const LogoutModal: React.FC = () => {
  const { isLogoutModalOpen, setIsLogoutModalOpen, schoolInfo, addToast } = usePortal();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Close on Escape key & restore body scroll
  useEffect(() => {
    if (!isLogoutModalOpen) {
      cleanupUiOverlayAndUnlockScroll();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSigningOut) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanupUiOverlayAndUnlockScroll();
    };
  }, [isLogoutModalOpen, isSigningOut]);

  if (!isLogoutModalOpen) return null;

  const handleCancel = () => {
    setIsSigningOut(false);
    setIsLogoutModalOpen(false);
    cleanupUiOverlayAndUnlockScroll();
  };

  const handleConfirmLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    // a) Immediately close the modal and unlock page scrolling
    setIsLogoutModalOpen(false);
    cleanupUiOverlayAndUnlockScroll();

    // b, c, d, e) Execute guaranteed safe logout engine
    await performSafeLogout({
      onBeforeNav: () => {
        cleanupUiOverlayAndUnlockScroll();
      },
      addToast: (msg, type) => {
        addToast(msg, type || 'success');
      },
      toastMessage: 'Logged out successfully',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm" id="logout-dialog-title">
            <LogOut className="w-4 h-4 text-[#b91c1c]" />
            <span>Sign Out Confirmation</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSigningOut}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-sm text-slate-600 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-100 text-[#b91c1c] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                Are you sure you want to log out?
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                School session for <span className="font-semibold text-slate-700">{schoolInfo.name}</span> (<span className="font-mono text-[#b91c1c] font-bold">{schoolInfo.code}</span>) will be safely closed. All saved student marks and portal records remain securely preserved.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSigningOut}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={isSigningOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#b91c1c] hover:bg-red-800 rounded-md transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
