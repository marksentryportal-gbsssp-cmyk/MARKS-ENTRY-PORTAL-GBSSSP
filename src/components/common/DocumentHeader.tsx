import React from 'react';
import { usePortal } from '../../store/portalStore';
import { SchoolLogo } from './SchoolLogo';
import { DEFAULT_LOGO_PRINT_SETTINGS } from '../../utils/logoUtils';

export interface DocumentHeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
  documentNo?: string;
  isDraft?: boolean;
  draftText?: string;
  className?: string;
  showWatermarkOverride?: boolean;
  children?: React.ReactNode;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  title,
  subtitle,
  date,
  documentNo,
  isDraft = false,
  draftText = '*** DRAFT DOCUMENT - FOR SCRUTINY & VERIFICATION ONLY - NOT FINAL SUBMITTED ***',
  className = '',
  showWatermarkOverride,
  children,
}) => {
  const { schoolInfo, resultSettings } = usePortal();

  const printSettings = resultSettings.logoPrintSettings || DEFAULT_LOGO_PRINT_SETTINGS;
  const isCentered = printSettings.position === 'center';
  const logoVariant = printSettings.bwPrintMode ? 'mono' : 'color';

  const logoPixelSize =
    printSettings.size === 'small' ? 48 : printSettings.size === 'large' ? 84 : 64;

  const showWatermark =
    showWatermarkOverride !== undefined
      ? showWatermarkOverride
      : printSettings.showWatermark;

  const watermarkOpacity = printSettings.watermarkOpacity || 0.07;

  return (
    <header className={`relative pb-4 mb-4 border-b-2 border-slate-800 text-slate-900 select-none ${className}`}>
      {/* Light watermark in centre of the page/card */}
      {showWatermark && (
        <div
          aria-hidden="true"
          style={{ opacity: watermarkOpacity }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none"
        >
          <SchoolLogo
            size={240}
            shape="none"
            variant={logoVariant}
            alt="School Watermark"
            className="filter grayscale"
          />
        </div>
      )}

      {/* Prominent Draft Notice if applicable */}
      {isDraft && (
        <div className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold py-1 px-3 mb-3 rounded text-center tracking-wider uppercase">
          {draftText}
        </div>
      )}

      {/* Main Header Content */}
      <div
        className={`relative z-1 flex gap-4 ${
          isCentered
            ? 'flex-col items-center text-center'
            : 'items-center justify-between text-left'
        }`}
      >
        {/* Left / Top Logo */}
        {printSettings.showLogoInPrint !== false && (
          <div className="shrink-0 flex items-center justify-center">
            <SchoolLogo
              size={logoPixelSize}
              shape="none"
              variant={logoVariant}
              alt={schoolInfo.name}
            />
          </div>
        )}

        {/* Central Titles */}
        <div className={`flex-1 ${isCentered ? 'text-center' : 'text-center'}`}>
          <p className="text-[11px] sm:text-xs font-bold text-slate-600 tracking-wider uppercase">
            {schoolInfo.boardName || 'MARKS ENTRY PORTAL , CLASS: ANKUR TO XII (ARTS)'}
          </p>
          <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight uppercase leading-snug">
            {schoolInfo.name}
          </h1>
          <p className="text-[10px] sm:text-xs font-medium text-slate-600">
            P.O. PAGLAHAT, DIST: DHUBRI (ASSAM) - PIN: 783334
          </p>
          <div className="mt-1 flex items-center justify-center gap-2 sm:gap-3 text-[10px] font-mono font-bold text-slate-700 flex-wrap">
            <span>ASSEB CODE: {schoolInfo.code}</span>
            <span>•</span>
            <span>UDISE CODE: {schoolInfo.udiseCode}</span>
            <span>•</span>
            <span>SESSION: {schoolInfo.academicSession || '2026-2027'}</span>
          </div>
        </div>

        {/* Right Corner metadata (if not centered) */}
        {!isCentered && (
          <div className="w-20 shrink-0 text-right text-[10px] font-mono text-slate-500 hidden sm:block">
            <div>Date: {date || new Date().toLocaleDateString('en-GB')}</div>
            {documentNo && (
              <div className="mt-1 text-[9px] font-bold text-teal-800 border border-teal-700/50 px-1 py-0.5 rounded text-center truncate">
                {documentNo}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Title Line */}
      <div className="mt-3 pt-2.5 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs">
        <h2 className="font-bold text-[#0f766e] tracking-tight uppercase text-center sm:text-left">
          {title}
        </h2>
        {subtitle && (
          <span className="text-[11px] text-slate-600 font-mono text-center sm:text-right">
            {subtitle}
          </span>
        )}
      </div>

      {/* Optional Children/Extra Details Strip */}
      {children && <div className="mt-2">{children}</div>}
    </header>
  );
};
