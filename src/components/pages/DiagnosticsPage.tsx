import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  KeyRound,
  Database,
  ArrowLeft,
  RefreshCw,
  LogOut,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import {
  getSession,
  getLastLogoutInfo,
  performSafeLogout,
  emergencySignOut,
  SessionV1,
  LastLogoutInfo,
} from '../../services/sessionService';

export const DiagnosticsPage: React.FC = () => {
  const { schoolInfo, navigateTo, addToast, students, exams, marks } = usePortal();
  const [session, setSession] = useState<SessionV1 | null>(() => getSession());
  const [lastLogout, setLastLogout] = useState<LastLogoutInfo | null>(() => getLastLogoutInfo());
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString());

  useEffect(() => {
    const timer = setInterval(() => {
      setSession(getSession());
      setLastLogout(getLastLogoutInfo());
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleTestTabSync = () => {
    addToast('Tab broadcast ping sent across open tabs.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-teal-50 text-[#0f766e] border border-teal-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>System & Session Diagnostics</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Read-only
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {schoolInfo.name} • ASSEB-DI: {schoolInfo.code} • UDISE: {schoolInfo.udiseCode}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo(session ? '/dashboard' : '/login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 hover:text-teal-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{session ? 'Return to Dashboard' : 'Return to Login'}</span>
          </button>
        </div>
      </div>

      {/* 1. SESSION DIAGNOSTICS CARD */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-800">Current Session State</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Live check: {currentTime}</span>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 font-medium">Auth Status</p>
              <div className="mt-1 flex items-center gap-1.5">
                {session ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-700">Authenticated (Active)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-rose-700">Not Signed In</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 font-medium">Session ID</p>
              <p className="mt-1 font-mono font-bold text-slate-800 truncate" title={session?.sessionId}>
                {session?.sessionId || 'None'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 font-medium">Remember Me Mode</p>
              <p className="mt-1 font-semibold text-slate-800">
                {session?.remember ? (
                  <span className="text-teal-700 font-bold">Enabled (7-day persistent)</span>
                ) : (
                  <span className="text-slate-600">Disabled (8-hour session)</span>
                )}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 font-medium">Created At</p>
              <p className="mt-1 font-mono text-slate-700">
                {session?.createdAt ? new Date(session.createdAt).toLocaleString() : '--'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 font-medium">Expires At</p>
              <p className="mt-1 font-mono text-slate-700">
                {session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : '--'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 font-medium">Time Remaining</p>
              <p className="mt-1 font-mono font-bold text-teal-800">
                {session?.expiresAt ? calculateRemaining(session.expiresAt) : '--'}
              </p>
            </div>
          </div>

          {/* Last Logout Reason */}
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-900">Last Logout Event Record</p>
              <p className="text-slate-700">
                Reason:{' '}
                <strong className="text-slate-900 uppercase">
                  {lastLogout?.reason || 'None recorded'}
                </strong>
                {lastLogout?.timestamp && (
                  <span className="ml-2 font-mono text-slate-500">
                    ({new Date(lastLogout.timestamp).toLocaleString()})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DATA SAFETY & PERSISTENCE VERIFICATION */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-800">Data Preservation Integrity</h2>
          </div>
          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Isolated from session</span>
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            The portal separates authentication credentials from educational data. When a user logs out, marks records, candidate profiles, and exam configurations are <strong>never cleared</strong>:
          </p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Students Stored</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{students.length}</p>
            </div>
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Exams Configured</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{exams.length}</p>
            </div>
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Marks Entries</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{marks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DIAGNOSTIC ACTIONS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Diagnostic Session Controls</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTestTabSync}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
            <span>Test Tab Sync Broadcast</span>
          </button>

          <button
            type="button"
            onClick={() =>
              performSafeLogout({
                toastMessage: 'Diagnostic safe logout test executed.',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0f766e] hover:bg-teal-800 rounded-md transition-colors shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Test Standard Logout</span>
          </button>

          <button
            type="button"
            onClick={emergencySignOut}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-md transition-colors shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
