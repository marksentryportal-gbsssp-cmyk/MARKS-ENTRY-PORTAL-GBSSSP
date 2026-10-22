import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MarksComponentInputProps {
  value: string;
  maxMarks: number;
  componentLabel: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  hasError?: boolean;
  errorMessage?: string;
}

export const MarksComponentInput: React.FC<MarksComponentInputProps> = ({
  value,
  maxMarks,
  componentLabel,
  onChange,
  onEnter,
  disabled = false,
  autoFocus = false,
  inputRef,
  hasError = false,
  errorMessage,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Auto convert lowercase 'a' to capital 'A'
    if (raw.toLowerCase() === 'a') {
      onChange('A');
      return;
    }
    onChange(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.();
    }
  };

  const isAbsent = value.trim().toUpperCase() === 'A';

  return (
    <div className="flex flex-col items-center justify-center py-1">
      <div className="inline-flex items-center gap-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            placeholder="0 or A"
            aria-invalid={hasError}
            data-has-error={hasError ? 'true' : undefined}
            className={`w-[130px] sm:w-[160px] md:w-[180px] h-9 px-3 py-1.5 text-center font-mono font-bold text-sm rounded border transition-all ${
              disabled
                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                : hasError
                ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-400 focus:outline-hidden'
                : isAbsent
                ? 'border-amber-400 bg-amber-50 text-amber-900 font-black'
                : value !== ''
                ? 'border-teal-500 bg-teal-50/20 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden'
                : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-[#9333ea] focus:outline-hidden'
            }`}
          />

          {isAbsent && (
            <span className="absolute -top-2 -right-2 px-1.5 py-0.2 bg-slate-600 text-white text-[9px] font-bold rounded shadow-xs uppercase tracking-wider">
              Absent
            </span>
          )}
        </div>

        {/* Out of N Label */}
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap min-w-[70px] text-left select-none">
          Out of <strong className="text-slate-800 font-mono">{maxMarks}</strong>
        </span>
      </div>

      {hasError && errorMessage && (
        <span className="flex items-center gap-1 text-[11px] text-red-600 font-medium mt-1 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </span>
      )}
    </div>
  );
};
