import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { PasswordInput } from './PasswordInput';
import {
  requestOtpForSchool,
  verifyOtp,
} from '../../services/otpService';
import { isValidPassword } from '../../services/authService';
import { sanitizeUdiseCode, isValidUdiseCode } from '../../utils/validators';
import { SchoolLogo } from '../common/SchoolLogo';

export const ForgotPasswordPage: React.FC = () => {
  const {
    schoolInfo,
    users,
    otpDeliveryMode,
    resetUserPasswordByCode,
    navigateTo,
    addToast,
  } = usePortal();

  const [udiseCode, setUdiseCode] = useState(
    schoolInfo.udiseCode && schoolInfo.udiseCode !== '18000000000'
      ? schoolInfo.udiseCode
      : '18020200403'
  );
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Timers
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [udiseInlineError, setUdiseInlineError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Resend OTP countdown effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Redirect after success effect
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      navigateTo('/login');
      return;
    }
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [redirectCountdown]);

  const handleUdiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeUdiseCode(e.target.value);
    setUdiseCode(sanitized);
    setErrorMessage(null);

    if (sanitized.length > 0 && sanitized.length < 11) {
      setUdiseInlineError('School UDISE Code must be 11 digits');
    } else {
      setUdiseInlineError(null);
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = () => {
    setErrorMessage(null);
    const code = sanitizeUdiseCode(udiseCode);
    if (!code) {
      setErrorMessage('Please enter your School UDISE Code.');
      return;
    }

    if (!isValidUdiseCode(code)) {
      setErrorMessage('School UDISE Code must be 11 digits');
      setUdiseInlineError('School UDISE Code must be 11 digits');
      return;
    }

    // Verify code exists in system
    const user = users.find(
      (u) => (u.udiseCode || u.institutionCode || '').toUpperCase() === code
    );
    if (!user) {
      setErrorMessage('School UDISE Code not found in the system. Please verify.');
      return;
    }

    try {
      setIsSendingOtp(true);
      const destination = {
        phone: schoolInfo.phone || '+91 94350 12345',
        email: schoolInfo.email || 'gopinathschool2024@gmail.com',
      };

      const result = requestOtpForSchool(code, destination, otpDeliveryMode);
      setIsSendingOtp(false);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setResendCountdown(30); // 30 second resend timer
      setOtpSentMessage(result.message);

      if (otpDeliveryMode === 'demo' && result.otp) {
        setDemoOtpCode(result.otp);
      } else {
        setDemoOtpCode(null);
      }

      addToast(result.message, 'info');
    } catch (e: any) {
      setIsSendingOtp(false);
      setErrorMessage('Failed to send OTP. Please try again.');
    }
  };

  // Step 2: Submit New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const code = sanitizeUdiseCode(udiseCode);
    if (!code || !isValidUdiseCode(code)) {
      setErrorMessage('School UDISE Code must be 11 digits');
      setUdiseInlineError('School UDISE Code must be 11 digits');
      return;
    }

    if (!otp.trim()) {
      setErrorMessage('Please enter the 6-digit OTP.');
      return;
    }

    // Verify OTP
    const otpVerification = verifyOtp(code, otp.trim());
    if (!otpVerification.success) {
      setErrorMessage(otpVerification.message);
      return;
    }

    // Verify password criteria
    const validation = isValidPassword(newPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Password does not meet requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    try {
      setIsUpdating(true);
      const res = await resetUserPasswordByCode(code, newPassword);
      setIsUpdating(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password.');
        return;
      }

      setSuccessMessage('Password updated successfully!');
      setRedirectCountdown(3);
      addToast('Password updated successfully! Redirecting to login...', 'success');
    } catch (err: any) {
      setIsUpdating(false);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#dbeafe] flex flex-col items-center justify-center p-4">
      {/* Centered White Card (max-w-[420px], 16px radius, soft shadow, p-8) */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-blue-100 p-8 space-y-6">
        {/* Top: School Logo centered */}
        <div className="flex flex-col items-center text-center space-y-2">
          <SchoolLogo size={64} shape="circle" alt="School Logo" />

          {/* Title in bold royal blue (#0b57d0) with horizontal lines on both sides */}
          <div className="w-full flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-blue-200" />
            <h2 className="text-base font-bold text-[#0b57d0] tracking-tight whitespace-nowrap">
              School Forgot Password
            </h2>
            <div className="h-px flex-1 bg-blue-200" />
          </div>
        </div>

        {/* Success State */}
        {successMessage ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-950">{successMessage}</h3>
            <p className="text-xs text-emerald-700">
              Redirecting to login in{' '}
              <span className="font-mono font-bold">{redirectCountdown}s</span>...
            </p>
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b57d0] text-white rounded-full text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
            >
              <span>Go to Login Now</span>
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Demo OTP Banner if in demo mode */}
            {demoOtpCode && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between animate-in fade-in">
                <div className="space-y-0.5">
                  <span className="font-bold flex items-center gap-1 text-amber-800">
                    <Info className="w-3.5 h-3.5" /> Demo Mode Active
                  </span>
                  <span>
                    Your verification OTP is:{' '}
                    <strong className="font-mono text-sm tracking-widest text-slate-900">
                      {demoOtpCode}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(demoOtpCode)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-200 hover:bg-amber-300 rounded text-amber-900 transition-colors cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* Field 1: School UDISE Code */}
            <div className="space-y-1">
              <label
                htmlFor="forgotUdise"
                className="block text-xs font-bold text-slate-700 px-1"
              >
                School UDISE Code
              </label>
              <div className="flex gap-2">
                <input
                  id="forgotUdise"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={udiseCode}
                  onChange={handleUdiseChange}
                  placeholder="Enter your School UDISE Code"
                  className="w-full px-4 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-400 rounded-full border border-slate-300 bg-white hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all focus:outline-hidden"
                  required
                />
                <button
                  type="button"
                  disabled={isSendingOtp || resendCountdown > 0}
                  onClick={handleSendOtp}
                  className="px-3.5 py-2 rounded-full bg-blue-100 hover:bg-blue-200 text-[#0b57d0] font-bold text-xs whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : resendCountdown > 0 ? (
                    `Resend in ${resendCountdown}s`
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </div>
              {udiseInlineError && (
                <p className="text-[11px] text-red-600 font-medium px-2">
                  {udiseInlineError}
                </p>
              )}
              {otpSentMessage && (
                <p className="text-[11px] text-emerald-700 font-medium px-2">
                  ✓ {otpSentMessage}
                </p>
              )}
            </div>

            {/* Field 2: OTP */}
            <div className="space-y-1">
              <label htmlFor="forgotOtp" className="block text-xs font-bold text-slate-700 px-1">
                Enter 6-Digit OTP
              </label>
              <input
                id="forgotOtp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit verification code"
                className="w-full px-4 py-2.5 text-sm font-mono text-center tracking-widest text-slate-800 placeholder-slate-400 rounded-full border border-slate-300 bg-white hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all focus:outline-hidden"
                required
              />
            </div>

            {/* Field 3: Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 px-1">
                New Password
              </label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password (min. 8 characters)"
                variant="pill"
                showStrengthMeter
                required
              />
            </div>

            {/* Field 4: Confirm Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 px-1">
                Confirm Password
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                variant="pill"
                required
              />
            </div>

            {/* Full-width pill-shaped blue UPDATE button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 px-4 rounded-full bg-[#0b57d0] hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wide transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>UPDATE</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigateTo('/login')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b57d0] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
