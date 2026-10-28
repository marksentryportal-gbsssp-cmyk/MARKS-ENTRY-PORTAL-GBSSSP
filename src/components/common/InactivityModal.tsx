import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { subscribeToIdleCountdown, staySignedIn, performSafeLogout } from '../../services/sessionService';

export const InactivityModal: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToIdleCountdown((sec) => {
      setSecondsLeft(sec);
    });
    return unsubscribe;
  }, []);

  if (secondsLeft === null || secondsLeft <= 0) {
    return null;
  }

  const handleStaySignedIn = () => {
    staySignedIn();
    setSecondsLeft(null);
  };

  const handleSignOutNow = () => {
    setSecondsLeft(null);
    performSafeLogout({
      toastMessage: 'Signed out due to inactivity.',
    });
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-xl shadow-2xl border-2 border-amber-400 max-w-md w-full overflow-hidden p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-7 h-7 animate-pulse text-amber-600" />
        </div>

        <div>
          <h3 id="inactivity-title" className="text-base font-bold text-slate-900">
            You will be signed out due to inactivity
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            No activity has been detected for 30 minutes. To protect school examination and student marks data, your session will automatically terminate in:
          </p>
        </div>

        {/* Big countdown badge */}
        <div className="py-2">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-100 text-amber-900 font-mono text-2xl font-black tracking-widest border border-amber-300">
            00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSignOutNow}
            className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-slate-100 border border-slate-300 transition-colors"
          >
            Sign out now
          </button>
          <button
            type="button"
            onClick={handleStaySignedIn}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay signed in</span>
          </button>
        </div>
      </div>
    </div>
  );
};
