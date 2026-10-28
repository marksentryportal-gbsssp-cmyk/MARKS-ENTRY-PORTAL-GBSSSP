import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Eye,
  Sliders,
  Printer,
  FileText,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { SchoolLogo } from './SchoolLogo';
import { DocumentHeader } from './DocumentHeader';
import {
  processLogoFile,
  loadDefaultSchoolLogoData,
  DEFAULT_LOGO_PRINT_SETTINGS,
  updateBrowserFaviconAndTitle,
  updateDynamicManifest,
} from '../../utils/logoUtils';
import { setIdleLimitMinutes, getIdleLimitMinutes } from '../../services/sessionService';
import { SchoolLogoData, LogoPrintSettings } from '../../types';

export const SchoolLogoSettingsCard: React.FC<{ isModal?: boolean; onClose?: () => void }> = ({
  isModal = false,
  onClose,
}) => {
  const {
    schoolLogo,
    updateSchoolLogo,
    schoolInfo,
    resultSettings,
    updateResultSettings,
    currentUser,
    addToast,
  } = usePortal();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Local print settings
  const currentPrintSettings: LogoPrintSettings =
    resultSettings.logoPrintSettings || DEFAULT_LOGO_PRINT_SETTINGS;
  const [localPrintSettings, setLocalPrintSettings] =
    useState<LogoPrintSettings>(currentPrintSettings);

  // Inactivity timeout setting
  const [idleMinutes, setLocalIdleMinutes] = useState<number>(() => getIdleLimitMinutes());

  const isAdmin = currentUser?.role === 'admin';

  const handleFileUpload = async (file: File) => {
    if (!isAdmin) {
      addToast('Only school administrators can update the official school logo.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      setWarnings([]);
      const { logoData, warnings: warnList } = await processLogoFile(file);
      setWarnings(warnList);

      updateSchoolLogo(logoData);
      updateBrowserFaviconAndTitle(logoData, schoolInfo.name);
      updateDynamicManifest(logoData, { name: schoolInfo.name, code: schoolInfo.code });

      addToast('Official School Logo updated and synchronized across all modules!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to process image file.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleResetToDefault = async () => {
    if (!isAdmin) return;
    try {
      setIsProcessing(true);
      const defLogo = await loadDefaultSchoolLogoData();
      if (defLogo) {
        updateSchoolLogo(defLogo);
        updateBrowserFaviconAndTitle(defLogo, schoolInfo.name);
        updateDynamicManifest(defLogo, { name: schoolInfo.name, code: schoolInfo.code });
        addToast('Restored official default school seal.', 'info');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLogo = () => {
    if (!isAdmin) return;
    updateSchoolLogo(null);
    updateBrowserFaviconAndTitle(null, schoolInfo.name);
    updateDynamicManifest(null, { name: schoolInfo.name, code: schoolInfo.code });
    addToast('Custom logo removed. Default badge will be displayed.', 'info');
  };

  const handleSavePrintSettings = () => {
    updateResultSettings({
      logoPrintSettings: localPrintSettings,
    });
    setIdleLimitMinutes(idleMinutes);
    addToast('Print header & session settings saved successfully.', 'success');
    if (onClose) onClose();
  };

  return (
    <div className="space-y-6">
      {/* 1. LOGO UPLOAD & PROCESSING CARD */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-teal-700" />
              <span>Official School Logo & Seal</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Single source of truth: uploaded once and applied automatically across all portal screens, marksheets, checklists, bell mode, and PDF exports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing || !isAdmin}
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              title="Reset to default official emblem"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
              <span>Reset to Default</span>
            </button>

            {schoolLogo && (
              <button
                type="button"
                disabled={isProcessing || !isAdmin}
                onClick={handleRemoveLogo}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-700 border border-rose-300 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Drag and drop upload zone */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDrop={handleDrop}
          onClick={() => isAdmin && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-teal-500 bg-teal-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-teal-500 bg-slate-50/50 hover:bg-slate-50'
          } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            className="hidden"
            disabled={!isAdmin || isProcessing}
          />

          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>

          <h3 className="text-sm font-bold text-slate-800">
            {isProcessing ? 'Processing & Optimizing Image...' : 'Click to Upload or Drag & Drop School Logo'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Supports PNG, JPG, SVG, or WebP &bull; Maximum file size: 2 MB &bull; Transparency preserved
          </p>
          <p className="text-[11px] text-teal-700 font-medium mt-1">
            Browser auto-trims whitespace borders and generates 512px, 192px, and 64px optimized versions
          </p>
        </div>

        {/* Warnings notice if any */}
        {warnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Image Recommendation Notice</span>
            </div>
            {warnings.map((w, idx) => (
              <p key={idx} className="pl-5 text-amber-800">
                &bull; {w}
              </p>
            ))}
          </div>
        )}

        {/* Live Multi-Background and Shape Previews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-teal-600" />
              <span>Live Contrast & Shape Previews</span>
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Zoom scale:</span>
              <input
                type="range"
                min="80"
                max="140"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-24 accent-teal-600 cursor-pointer"
              />
              <span className="font-mono text-slate-600 text-[11px]">{zoomLevel}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {/* 1. Light background (Square) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">Light Background (Original)</p>
              <div className="h-28 flex items-center justify-center overflow-hidden">
                <div style={{ transform: `scale(${zoomLevel / 100})` }} className="transition-transform">
                  <SchoolLogo size={80} shape="none" />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Unclipped Shape</span>
            </div>

            {/* 2. Light background (Circular Seal) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-2xs space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">Light Seal (Circular Badge)</p>
              <div className="h-28 flex items-center justify-center overflow-hidden">
                <div style={{ transform: `scale(${zoomLevel / 100})` }} className="transition-transform">
                  <SchoolLogo size={80} shape="circle" className="border border-slate-200" />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Circular Preview</span>
            </div>

            {/* 3. Dark Navy Background (Sidebar simulation) */}
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] text-slate-200 shadow-2xs space-y-2">
              <p className="text-[11px] font-semibold text-slate-300">Dark Navy (Sidebar / Banner)</p>
              <div className="h-28 flex items-center justify-center overflow-hidden">
                <div style={{ transform: `scale(${zoomLevel / 100})` }} className="transition-transform">
                  <SchoolLogo size={80} shape="circle" darkBackground={true} />
                </div>
              </div>
              <span className="text-[10px] text-teal-400 font-mono">Auto-glow Edge Active</span>
            </div>

            {/* 4. Monochrome (B&W Print Preview) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">B&W Print Mode (Monochrome)</p>
              <div className="h-28 flex items-center justify-center overflow-hidden">
                <div style={{ transform: `scale(${zoomLevel / 100})` }} className="transition-transform">
                  <SchoolLogo size={80} shape="none" variant="mono" />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">High-contrast Grayscale</span>
            </div>
          </div>
        </div>

        {/* PWA & Desktop Icon Note */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Desktop & Mobile App Icon Notice:</strong> The installed PWA icon is fixed at install time. After uploading a new school logo, replace the static asset files <code className="font-mono text-slate-800">public/icon-192.png</code> and <code className="font-mono text-slate-800">public/icon-512.png</code> and reinstall or refresh the app to update the desktop icon.
          </p>
        </div>
      </div>

      {/* 2. DOCUMENT HEADER & PRINT SETTINGS CARD */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6 space-y-6">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-700" />
            <span>Document Header & Print Layout Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controls how marksheets, checklists, tabulation registers, and PDF exports appear when printed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Column 1: Options */}
          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Logo Position in Document Header
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocalPrintSettings((prev) => ({ ...prev, position: 'left' }))}
                  className={`flex-1 py-2 px-3 rounded-md font-semibold text-center border transition-all cursor-pointer ${
                    localPrintSettings.position === 'left'
                      ? 'bg-teal-50 border-teal-700 text-teal-900 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Left Aligned (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalPrintSettings((prev) => ({ ...prev, position: 'center' }))}
                  className={`flex-1 py-2 px-3 rounded-md font-semibold text-center border transition-all cursor-pointer ${
                    localPrintSettings.position === 'center'
                      ? 'bg-teal-50 border-teal-700 text-teal-900 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Centered (Certificate Style)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Header Logo Print Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setLocalPrintSettings((prev) => ({ ...prev, size: sz }))}
                    className={`py-2 px-2.5 rounded-md font-semibold text-center border capitalize transition-all cursor-pointer ${
                      localPrintSettings.size === sz
                        ? 'bg-teal-50 border-teal-700 text-teal-900 shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sz} ({sz === 'small' ? '48px' : sz === 'medium' ? '64px' : '84px'})
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={localPrintSettings.showLogoInPrint !== false}
                  onChange={(e) =>
                    setLocalPrintSettings((prev) => ({
                      ...prev,
                      showLogoInPrint: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 border-slate-300"
                />
                <span>Include School Logo in Header</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(localPrintSettings.bwPrintMode)}
                  onChange={(e) =>
                    setLocalPrintSettings((prev) => ({
                      ...prev,
                      bwPrintMode: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 border-slate-300"
                />
                <span>Black & White Print Mode (High-contrast Grayscale)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={localPrintSettings.showWatermark !== false}
                  onChange={(e) =>
                    setLocalPrintSettings((prev) => ({
                      ...prev,
                      showWatermark: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 border-slate-300"
                />
                <span>Show Watermark Seal in Background of Marksheets & Documents</span>
              </label>

              {localPrintSettings.showWatermark !== false && (
                <div className="pl-6 space-y-1">
                  <div className="flex justify-between text-slate-500 font-medium text-[11px]">
                    <span>Watermark Opacity:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {Math.round((localPrintSettings.watermarkOpacity || 0.07) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.20"
                    step="0.01"
                    value={localPrintSettings.watermarkOpacity || 0.07}
                    onChange={(e) =>
                      setLocalPrintSettings((prev) => ({
                        ...prev,
                        watermarkOpacity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">
                    Recommended: 6% to 8% for crisp legibility behind student marks.
                  </p>
                </div>
              )}
            </div>

            {/* Inactivity setting */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">
                Inactivity Auto-Logout Timeout
              </label>
              <select
                value={idleMinutes}
                onChange={(e) => setLocalIdleMinutes(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-md border border-slate-300 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes (Recommended Standard)</option>
                <option value={60}>60 Minutes</option>
                <option value={0}>Never (Dedicated School Computer)</option>
              </select>
            </div>
          </div>

          {/* Column 2: Live Document Header Preview */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Live Document Header & Watermark Preview
            </span>

            <div className="border border-slate-300 rounded-lg p-4 bg-white shadow-inner relative overflow-hidden">
              <DocumentHeader
                title="ANNUAL EXAMINATION MARKSHEET 2026-2027"
                subtitle="Class X (Ten) • Verification Document"
                documentNo="OFFICIAL"
                showWatermarkOverride={localPrintSettings.showWatermark !== false}
              />

              <div className="text-center text-[11px] text-slate-400 italic py-2">
                [Candidate Bio-data and Subject Marks Table Area]
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSavePrintSettings}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Logo & Print Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
