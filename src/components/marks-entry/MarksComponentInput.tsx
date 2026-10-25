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
  density?: 'compact' | 'comfortable';
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
  density = 'compact',
}) => {
  const isCompact = density === 'compact';

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
    <div className={`flex flex-col items-center justify-center ${isCompact ? 'py-0.5' : 'py-1'}`}>
      <div className="inline-flex items-center gap-1.5">
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
            title={hasError ? errorMessage : undefined}
            className={`w-[110px] sm:w-[130px] md:w-[150px] ${
              isCompact ? 'h-7 text-xs px-2 py-0.5' : 'h-8.5 text-sm px-3 py-1'
            } text-center font-mono font-bold rounded border transition-all ${
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
            <span className="absolute -top-1.5 -right-1.5 px-1 py-0.1 bg-slate-600 text-white text-[8px] font-bold rounded shadow-xs uppercase tracking-wider">
              Absent
            </span>
          )}
        </div>

        {/* Out of N Label */}
        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap min-w-[55px] text-left select-none">
          / <strong className="text-slate-800 font-mono">{maxMarks}</strong>
        </span>
      </div>

      {/* Reserved height for validation error to prevent layout shift */}
      <div className={`h-3.5 flex items-center justify-center ${hasError ? 'visible' : 'invisible'}`}>
        <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium truncate max-w-[170px]" title={errorMessage}>
          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{errorMessage || 'Invalid marks'}</span>
        </span>
      </div>
    </div>
  );
};
