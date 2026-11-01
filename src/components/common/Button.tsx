import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'add'           // Green + Teal
  | 'update'        // Blue + Purple
  | 'draft'         // Violet + Pink
  | 'updateNext'    // Purple + Blue
  | 'import'        // Cyan + Blue
  | 'print'         // Indigo + Purple
  | 'delete'        // Red + Crimson
  | 'back'          // Slate + Navy
  | 'finalSubmit'   // Green + Teal
  | 'primary'       // Deep Teal + Emerald
  | 'secondary'     // White with subtle slate border
  | 'outline'       // Outlined
  | 'ghost'         // Transparent ghost
  | 'amber'         // Amber + Orange
  | 'success'       // Emerald + Teal
  | 'danger';       // Red + Rose

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'compact';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  add: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs hover:shadow-md hover:shadow-emerald-600/25 border-0 focus-visible:ring-emerald-500',
  update: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs hover:shadow-md hover:shadow-blue-600/25 border-0 focus-visible:ring-blue-500',
  draft: 'bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-xs hover:shadow-md hover:shadow-violet-600/25 border-0 focus-visible:ring-violet-500',
  updateNext: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white shadow-xs hover:shadow-lg hover:shadow-purple-600/30 border-0 focus-visible:ring-purple-500',
  import: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xs hover:shadow-md hover:shadow-cyan-600/25 border-0 focus-visible:ring-cyan-500',
  print: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xs hover:shadow-md hover:shadow-indigo-600/25 border-0 focus-visible:ring-indigo-500',
  delete: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xs hover:shadow-md hover:shadow-red-600/25 border-0 focus-visible:ring-red-500',
  danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xs hover:shadow-md hover:shadow-red-600/25 border-0 focus-visible:ring-red-500',
  back: 'bg-gradient-to-r from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-white shadow-xs hover:shadow-md hover:shadow-slate-700/25 border-0 focus-visible:ring-slate-500',
  finalSubmit: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-500 hover:via-teal-500 hover:to-teal-600 text-white shadow-xs hover:shadow-lg hover:shadow-teal-700/30 border-0 focus-visible:ring-teal-500',
  primary: 'bg-gradient-to-r from-[#0f766e] to-[#047857] hover:from-[#115e59] hover:to-[#065f46] text-white shadow-xs hover:shadow-md hover:shadow-teal-800/25 border-0 focus-visible:ring-teal-600',
  success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs hover:shadow-md hover:shadow-emerald-600/25 border-0 focus-visible:ring-emerald-500',
  amber: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-xs hover:shadow-md hover:shadow-amber-600/25 border-0 focus-visible:ring-amber-500',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 shadow-2xs hover:shadow-xs focus-visible:ring-slate-400',
  outline: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 focus-visible:ring-slate-400',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-0 shadow-none focus-visible:ring-slate-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  compact: 'px-2 py-0.5 text-[11px] font-semibold rounded gap-1 min-h-[24px]',
  sm: 'px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md gap-1.5 min-h-[30px]',
  md: 'px-4 py-2 text-xs sm:text-[13px] font-bold rounded-lg gap-2 min-h-[36px]',
  lg: 'px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg gap-2.5 min-h-[42px]',
  icon: 'p-1.5 rounded-md min-h-[28px] min-w-[28px] flex items-center justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`
          relative font-btn inline-flex items-center justify-center
          whitespace-nowrap tracking-tight transition-all duration-200 ease-out
          select-none cursor-pointer outline-hidden
          hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
          focus-visible:ring-2 focus-visible:ring-offset-1
          disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:transform-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : 'w-auto'}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="shrink-0 flex items-center">{icon}</span>
            )}
            {children && <span>{children}</span>}
            {icon && iconPosition === 'right' && (
              <span className="shrink-0 flex items-center">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
