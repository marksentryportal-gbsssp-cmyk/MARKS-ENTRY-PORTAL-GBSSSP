import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Phone,
  Mail,
  HelpCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { NotificationBoard } from './NotificationBoard';
import { PasswordInput } from './PasswordInput';
import { sanitizeInstitutionCode } from '../../utils/validators';

export const LoginPage: React.FC = () => {
  const {
    schoolInfo,
    login,
    navigateTo,
    defaultFirstTimePassword,
    setIsSupportModalOpen,
  } = usePortal();

  const [institutionCode, setInstitutionCode] = useState('06H1003');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lockout countdown timer
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Lockout timer effect
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstitutionCode(sanitizeInstitutionCode(e.target.value));
    if (errorMessage && lockoutSeconds <= 0) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    if (!institutionCode.trim()) {
      setErrorMessage('Please enter your Institution Code.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await login(institutionCode, password, keepSignedIn);
      setIsLoading(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Invalid Institution code or password');
        if (res.lockedSeconds) {
          setLockoutSeconds(res.lockedSeconds);
        }
        return;
      }

      // Success! Navigate to dashboard
      navigateTo('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('An unexpected error occurred during login. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-between selection:bg-purple-200">
      {/* 1. Full-width White Header Band */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-8 sm:py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          {/* Left: School Logo Badge & Text */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 border-2 border-teal-600 flex items-center justify-center text-teal-400 shrink-0 shadow-xs">
              {schoolInfo.logoUrl ? (
                <img
                  src={schoolInfo.logoUrl}
                  alt="School Logo"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-0.5">
              <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase">
                {schoolInfo.name}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-teal-800">
                Paglahat, {schoolInfo.district || 'Dhubri, Assam'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Internal Examination Marks Entry Portal {schoolInfo.academicSession || '2026-2027'}
              </p>
            </div>
          </div>

          {/* Right: Rounded "Contact us" badge */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-300 hover:border-teal-600 text-slate-700 hover:text-teal-900 transition-colors shadow-2xs text-xs font-semibold cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Contact us</span>
              <span className="hidden lg:inline text-slate-400">|</span>
              <span className="hidden lg:inline text-[11px] font-mono text-slate-500">
                {schoolInfo.email || 'gopinathschool2024@gmail.com'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Navy Bar below Header */}
      <div className="bg-[#1e293b] text-white py-2 px-4 shadow-inner text-center">
        <span className="font-bold tracking-wider text-xs sm:text-sm uppercase text-slate-100">
          Marks Entry Portal
        </span>
      </div>

      {/* 3. Centered Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[1000px] bg-white rounded-lg shadow-xl border border-slate-200/90 overflow-hidden">
          {/* Responsive Layout: On mobile login form first, notification board below */}
          <div className="flex flex-col md:flex-row items-stretch">
            {/* LEFT half: Notification Board (Desktop Left, Mobile Bottom) */}
            <div className="w-full md:w-1/2 order-2 md:order-1">
              <NotificationBoard onOpenSupport={() => setIsSupportModalOpen(true)} />
            </div>

            {/* RIGHT half: Institution Login Form (Desktop Right, Mobile Top) */}
            <div className="w-full md:w-1/2 p-6 sm:p-10 order-1 md:order-2 flex flex-col justify-center">
              <div className="space-y-6 max-w-sm mx-auto w-full">
                {/* Title */}
                <div className="text-center space-y-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Institution Login
                  </h2>
                  <div className="h-0.5 w-16 bg-purple-600 mx-auto rounded-full" />
                </div>

                {/* Error Banner / Lockout Warning */}
                {errorMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 animate-in fade-in ${
                      lockoutSeconds > 0
                        ? 'bg-amber-50 border border-amber-300 text-amber-900'
                        : 'bg-red-50 border border-red-300 text-red-800'
                    }`}
                  >
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        lockoutSeconds > 0 ? 'text-amber-600' : 'text-red-600'
                      }`}
                    />
                    <div className="space-y-0.5 flex-1">
                      <span>{errorMessage}</span>
                      {lockoutSeconds > 0 && (
                        <p className="font-bold font-mono text-[11px] text-amber-800">
                          Cooldown remaining: {lockoutSeconds} seconds
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Institution Code Input */}
                  <div className="space-y-1">
                    <label
                      htmlFor="instCode"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Institution Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="instCode"
                        type="text"
                        maxLength={7}
                        value={institutionCode}
                        onChange={handleCodeChange}
                        disabled={isLoading || lockoutSeconds > 0}
                        placeholder="Enter Institution 6 Digit code"
                        className="w-full pl-10 pr-3 py-2.5 text-sm font-mono uppercase text-slate-800 placeholder-slate-400 rounded-md border-b-2 border-slate-300 bg-slate-50/70 hover:bg-slate-50 focus:border-purple-600 focus:bg-white border-t border-l border-r border-slate-200 transition-all focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1">
                    <label
                      htmlFor="instPassword"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Password <span className="text-red-500">*</span>
                    </label>
                    <PasswordInput
                      id="instPassword"
                      value={password}
                      onChange={(val) => {
                        setPassword(val);
                        if (errorMessage && lockoutSeconds <= 0) setErrorMessage(null);
                      }}
                      placeholder="Enter your password"
                      disabled={isLoading || lockoutSeconds > 0}
                      variant="underline"
                      required
                    />
                  </div>

                  {/* Keep me signed in & Forgot Password Link */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Keep me signed in</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => navigateTo('/forgot-password')}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || lockoutSeconds > 0}
                      className="w-full py-2.5 px-4 rounded-md bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Authenticating...</span>
                        </>
                      ) : lockoutSeconds > 0 ? (
                        <span>Locked ({lockoutSeconds}s)</span>
                      ) : (
                        <span>LOGIN</span>
                      )}
                    </button>
                  </div>

                  {/* Teal Default Password Note */}
                  <div className="pt-3 text-center">
                    <p className="text-[11px] font-semibold text-[#0f766e] bg-teal-50/80 border border-teal-200/60 rounded px-2.5 py-1.5 leading-snug">
                      Note: The default password for first-time login will be "{defaultFirstTimePassword || '123456'}".
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Simple clean footer copyright */}
      <footer className="text-center py-3 text-xs text-slate-500">
        Internal Examination Marks Entry Portal &bull; Government of Assam
      </footer>
    </div>
  );
};
