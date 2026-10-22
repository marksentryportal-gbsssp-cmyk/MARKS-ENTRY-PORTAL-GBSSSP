import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { evaluatePasswordStrength } from '../../services/authService';

interface PasswordInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  variant?: 'underline' | 'pill';
  showStrengthMeter?: boolean;
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter your password',
  id,
  name,
  autoComplete = 'current-password',
  variant = 'underline',
  showStrengthMeter = false,
  required = false,
  disabled = false,
  hasError = false,
  errorMessage,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const strength = showStrengthMeter && value ? evaluatePasswordStrength(value) : null;

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative flex items-center">
        {/* Left Lock Icon */}
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
          <Lock className="w-4 h-4 text-slate-400" />
        </div>

        {/* Password input field */}
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-hidden ${
            variant === 'pill'
              ? 'rounded-full border bg-white focus:ring-2 focus:ring-blue-500/20'
              : 'rounded-md border-b-2 border-slate-300 bg-slate-50/70 hover:bg-slate-50 focus:border-purple-600 focus:bg-white border-t border-l border-r border-slate-200'
          } ${
            hasError
              ? 'border-red-500 focus:border-red-600 bg-red-50/20'
              : ''
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />

        {/* Right Show/Hide Eye Toggle */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-hidden p-1 rounded cursor-pointer"
          title={showPassword ? 'Hide password' : 'Show password'}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-slate-500" />
          ) : (
            <Eye className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Caps lock warning */}
      {isCapsLockOn && (
        <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 px-1">
          <span>⚠️ Caps Lock is ON</span>
        </p>
      )}

      {/* Error message */}
      {hasError && errorMessage && (
        <p className="text-xs text-red-600 font-medium px-1 animate-in fade-in">
          {errorMessage}
        </p>
      )}

      {/* Password Strength Meter */}
      {strength && showStrengthMeter && (
        <div className="pt-1.5 space-y-1 animate-in fade-in">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Strength:</span>
            <span className="font-bold" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${strength.score}%`,
                backgroundColor: strength.color,
              }}
            />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 pt-0.5">
            <span className={strength.hasMinLength ? 'text-emerald-700 font-bold' : ''}>
              {strength.hasMinLength ? '✓' : '•'} 8+ characters
            </span>
            <span className={strength.hasLetter ? 'text-emerald-700 font-bold' : ''}>
              {strength.hasLetter ? '✓' : '•'} Letters (a-z)
            </span>
            <span className={strength.hasNumber ? 'text-emerald-700 font-bold' : ''}>
              {strength.hasNumber ? '✓' : '•'} Numbers (0-9)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
