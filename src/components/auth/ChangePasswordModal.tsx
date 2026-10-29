import React, { useState } from 'react';
import { KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { PasswordInput } from './PasswordInput';
import { isValidPassword } from '../../services/authService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  isForced?: boolean; // When forced on first login, cannot be dismissed
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  isForced = false,
  onClose,
}) => {
  const { currentUser, changePassword, addToast } = usePortal();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If voluntary change, verify current password entered
    if (!isForced && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    // Validate new password rules
    const validation = isValidPassword(newPassword);
    if (!validation.isValid) {
      setError(validation.error || 'Password does not meet the requirements.');
      return;
    }

    if (newPassword.toLowerCase().includes('password')) {
      setError('New password cannot contain the word "password".');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changePassword(currentUser.id, newPassword, isForced ? undefined : currentPassword);
      setIsSubmitting(false);

      if (!res.success) {
        setError(res.error || 'Failed to update password.');
        return;
      }

      addToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose?.();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
      onClick={() => {
        if (!isForced && onClose) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {isForced ? 'Mandatory First-Time Password Change' : 'Change Your Password'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isForced
                  ? 'For security, please set a new password before accessing the portal'
                  : 'Update your account access password'}
              </p>
            </div>
          </div>

          {!isForced && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isForced && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                You have logged in using the default system password. You must configure a secure personal password to continue.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password (only if voluntary) */}
          {!isForced && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Current Password <span className="text-red-500">*</span>
              </label>
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter current password"
                required
              />
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              New Password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password (min. 8 characters)"
              showStrengthMeter
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter new password"
              required
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Password...' : 'Save & Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
