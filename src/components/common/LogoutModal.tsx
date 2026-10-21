import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { usePortal } from '../../store/portalStore';

export const LogoutModal: React.FC = () => {
  const { isLogoutModalOpen, setIsLogoutModalOpen, schoolInfo } = usePortal();

  if (!isLogoutModalOpen) return null;

  const handleLogout = () => {
    // In government portal, sign out confirmation
    setIsLogoutModalOpen(false);
    // Refresh session or show prompt
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <LogOut className="w-4 h-4 text-[#b91c1c]" />
            <span>Sign Out Confirmation</span>
          </div>
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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
                School session for <span className="font-semibold text-slate-700">{schoolInfo.name}</span> (<span className="font-mono text-[#b91c1c] font-bold">{schoolInfo.code}</span>) will be terminated. Any unsaved data will be saved to your local storage session.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-medium text-white bg-[#b91c1c] hover:bg-red-800 rounded-md transition-colors shadow-xs"
          >
            Confirm Logout
          </button>
        </div>
      </div>
    </div>
  );
};
