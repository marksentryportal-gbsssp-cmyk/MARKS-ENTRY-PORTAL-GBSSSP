import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  Link2,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { PasswordInput } from './PasswordInput';
import { isValidPassword } from '../../services/authService';

interface SuperAdminSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminSetupModal: React.FC<SuperAdminSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setupSuperAdminAccount, linkSuperAdminUid, sendSuperAdminResetEmail, addToast } = usePortal();

  const superAdminEmail = 'gopinathschool2024@gmail.com';
  const schoolUdise = '18020200403';

  // Mode: 'linkUid' (default, when user has UID from Console) or 'password'
  const [activeTab, setActiveTab] = useState<'linkUid' | 'password'>('linkUid');

  // UID Linking State
  const [targetUid, setTargetUid] = useState('');
  const [isLinkingUid, setIsLinkingUid] = useState(false);

  // Password Setup State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetSending, setIsResetSending] = useState(false);
  const [resetSentMessage, setResetSentMessage] = useState<string | null>(null);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

  if (!isOpen) return null;

  // Handler for linking UID directly
  const handleLinkUid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSentMessage(null);

    const cleanUid = targetUid.trim();
    if (!cleanUid) {
      setErrorMessage('Please enter your exact Firebase Authentication UID.');
      return;
    }

    try {
      setIsLinkingUid(true);
      const res = await linkSuperAdminUid(cleanUid);
      setIsLinkingUid(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to link Super Admin UID in Firestore.');
        return;
      }

      addToast(
        res.alreadyLinked
          ? 'Super Admin profile was already linked and active! Signed in.'
          : 'Super Admin UID successfully linked and activated! Signed in.',
        'success'
      );
      onClose();
      window.location.replace('/#dashboard');
    } catch (err: any) {
      setIsLinkingUid(false);
      setErrorMessage(err?.message || 'An unexpected error occurred while linking UID.');
    }
  };

  // Handler for setting password & creating/logging in
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSentMessage(null);

    const validation = isValidPassword(password);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Password must be at least 8 characters with letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await setupSuperAdminAccount(password);
      setIsLoading(false);

      if (!res.success) {
        if (res.alreadyExists) {
          setAccountAlreadyExists(true);
        }
        setErrorMessage(res.error || 'Failed to setup Super Admin account.');
        return;
      }

      // Success: Modal will close and user is already logged in
      onClose();
      window.location.replace('/#dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'An unexpected error occurred during setup.');
    }
  };

  const handleSendResetEmail = async () => {
    setIsResetSending(true);
    setErrorMessage(null);
    try {
      const res = await sendSuperAdminResetEmail();
      setIsResetSending(false);
      if (res.success) {
        setResetSentMessage(res.message);
        addToast(res.message, 'success');
      } else {
        setErrorMessage(res.message || 'Could not send reset email');
      }
    } catch (e: any) {
      setIsResetSending(false);
      setErrorMessage(e?.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/30 rounded-lg border border-purple-400/40">
              <ShieldAlert className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Super Admin Provisioning</h3>
              <p className="text-[11px] text-purple-200/80">
                School UDISE: <span className="font-mono font-bold text-purple-100">{schoolUdise}</span> &bull; Project: <span className="font-mono text-purple-200">marks-entry-portal-512313</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('linkUid');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 px-4 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'linkUid'
                ? 'bg-white text-purple-900 border-b-2 border-purple-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Fingerprint className="w-4 h-4 text-purple-600" />
            <span>Link Existing Firebase UID</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 px-4 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'password'
                ? 'bg-white text-purple-900 border-b-2 border-purple-600 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4 text-purple-600" />
            <span>Email &amp; Password Flow</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Target Super Admin Identification */}
          <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-lg space-y-1 text-purple-950">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-700 shrink-0" />
              <span className="font-semibold text-xs">Designated Super Admin Email:</span>
            </div>
            <p className="font-mono font-bold text-xs text-purple-900 pl-6">
              {superAdminEmail}
            </p>
            <p className="text-[11px] text-purple-800/80 pl-6">
              This account receives role <code className="font-bold bg-purple-200/60 px-1 py-0.5 rounded">super_admin</code> and status <code className="font-bold bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded">active</code> in Firestore <code className="font-bold">users</code> collection.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{errorMessage}</span>
                {accountAlreadyExists && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isResetSending}
                      onClick={handleSendResetEmail}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isResetSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      <span>Send Firebase Password Reset Email</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reset Sent Message */}
          {resetSentMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resetSentMessage}</span>
            </div>
          )}

          {/* TAB 1: Link Existing Firebase UID */}
          {activeTab === 'linkUid' && (
            <form onSubmit={handleLinkUid} className="space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-xs">
                  Firebase Authentication UID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={targetUid}
                    onChange={(e) => setTargetUid(e.target.value.trim())}
                    placeholder="e.g. u4Xj9mK2LpQ01Zb7Yx3..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded font-mono text-xs focus:outline-purple-600"
                    disabled={isLinkingUid}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Copy and paste the exact UID of <strong className="text-slate-700">gopinathschool2024@gmail.com</strong> from Firebase Console &gt; Authentication &gt; Users.
                </p>
              </div>

              {/* Security & Authorization Summary */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Authorized Permissions Granted:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-800 pl-1">
                  <li>Full Access to Student Admissions &amp; Bulk Imports (2,000+ records)</li>
                  <li>Examination Setup, Marks Entry &amp; Marksheet Generation</li>
                  <li>User Account Creation, Activation &amp; Role Management</li>
                  <li>School Configuration, Final Lock &amp; Recycle Bin Restore</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLinkingUid}
                  className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinkingUid || !targetUid.trim()}
                  className="px-5 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLinkingUid ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Linking UID...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link UID &amp; Activate Super Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Email & Password Flow */}
          {activeTab === 'password' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-xs">
                  Super Admin Password <span className="text-red-500">*</span>
                </label>
                <PasswordInput
                  id="superAdminPassword"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter or create password (min. 8 characters)"
                  disabled={isLoading}
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Minimum 8 characters with at least one letter and one number.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-xs">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <PasswordInput
                  id="confirmSuperAdminPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter password to confirm"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Zero Plain Text Guarantee */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Zero Plain-Text Password Guarantee:</span>
                </div>
                <p>
                  Passwords are processed exclusively by Google Firebase Authentication. They are never stored in Firestore documents or client code.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="px-5 py-2 rounded bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Authenticate &amp; Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
