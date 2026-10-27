import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { DEFAULT_LOGO_URL } from '../../utils/logoUtils';

export interface SchoolLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  shape?: 'circle' | 'square' | 'none';
  variant?: 'color' | 'white' | 'mono';
  darkBackground?: boolean;
  className?: string;
  alt?: string;
  onClick?: () => void;
  editable?: boolean;
  onEditClick?: () => void;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  size = 'md',
  shape = 'none',
  variant = 'color',
  darkBackground = false,
  className = '',
  alt = 'School Logo',
  onClick,
  editable = false,
  onEditClick,
}) => {
  const { schoolLogo, schoolInfo, currentUser } = usePortal();
  const [imgError, setImgError] = useState(false);

  // Size mapping (in Tailwind and exact pixel dimensions)
  const sizeMap: Record<string, { container: string; img: string; px: number }> = {
    xs: { container: 'w-6 h-6', img: 'w-6 h-6', px: 24 },
    sm: { container: 'w-10 h-10', img: 'w-10 h-10', px: 40 },
    md: { container: 'w-16 h-16', img: 'w-16 h-16', px: 64 },
    lg: { container: 'w-24 h-24', img: 'w-24 h-24', px: 96 },
    xl: { container: 'w-32 h-32', img: 'w-32 h-32', px: 128 },
  };

  const isNumericSize = typeof size === 'number';
  const sizeConfig = isNumericSize
    ? { container: '', img: '', px: size }
    : sizeMap[size] || sizeMap.md;

  const styleOverride = isNumericSize
    ? { width: `${size}px`, height: `${size}px` }
    : undefined;

  // Resolve image source: prefers schoolLogo.full or medium depending on size, fallback to default asset
  const logoSrc = React.useMemo(() => {
    if (schoolLogo?.full) {
      if (sizeConfig.px <= 64 && schoolLogo.icon) return schoolLogo.icon;
      if (sizeConfig.px <= 192 && schoolLogo.medium) return schoolLogo.medium;
      return schoolLogo.full;
    }
    if (schoolInfo?.logoUrl) return schoolInfo.logoUrl;
    return DEFAULT_LOGO_URL;
  }, [schoolLogo, schoolInfo?.logoUrl, sizeConfig.px]);

  // Shape class
  const shapeClass =
    shape === 'circle'
      ? 'rounded-full overflow-hidden'
      : shape === 'square'
      ? 'rounded-md overflow-hidden'
      : '';

  // Filter variants (white, monochrome for B&W prints)
  const variantClass =
    variant === 'white'
      ? 'brightness-0 invert'
      : variant === 'mono'
      ? 'grayscale contrast-125'
      : '';

  // Dark background enhancement: add a soft subtle white ring/drop-shadow so dark navy lozenges stand out clearly
  const darkBgClass = darkBackground
    ? 'p-0.5 bg-white/10 ring-1 ring-white/20 shadow-sm rounded-full backdrop-blur-xs'
    : '';

  const canEdit = editable && currentUser?.role === 'admin' && onEditClick;

  return (
    <div
      onClick={onClick}
      style={styleOverride}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        sizeConfig.container
      } ${shapeClass} ${darkBgClass} ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      title={schoolInfo?.name || 'School Logo'}
    >
      {!imgError && logoSrc ? (
        <img
          src={logoSrc}
          alt={alt}
          onError={() => setImgError(true)}
          style={styleOverride}
          className={`object-contain max-w-full max-h-full transition-transform ${
            sizeConfig.img
          } ${variantClass}`}
          loading="eager"
        />
      ) : (
        /* Fallback GBSSS seal badge */
        <div
          style={styleOverride}
          className={`w-full h-full rounded-full bg-slate-800 text-teal-300 border border-teal-500/40 flex flex-col items-center justify-center p-1 text-center shadow-xs`}
        >
          <GraduationCap
            style={{ width: `${Math.max(12, sizeConfig.px * 0.45)}px`, height: `${Math.max(12, sizeConfig.px * 0.45)}px` }}
            className="text-teal-400 mb-0.5"
          />
          {sizeConfig.px >= 48 && (
            <span
              style={{ fontSize: `${Math.max(8, Math.round(sizeConfig.px * 0.16))}px` }}
              className="font-bold tracking-wider text-slate-100 uppercase leading-none"
            >
              GBSSS
            </span>
          )}
        </div>
      )}

      {/* Admin Quick Edit Pencil Overlay */}
      {canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick();
          }}
          className="absolute inset-0 bg-slate-900/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold rounded-full transition-opacity cursor-pointer"
          title="Change School Logo"
        >
          Edit
        </button>
      )}
    </div>
  );
};
