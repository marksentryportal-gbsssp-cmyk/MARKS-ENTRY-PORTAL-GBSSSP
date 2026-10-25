import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ConfirmSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  titleText?: string;
  regNo?: string;
  studentName?: string;
  fatherName?: string;
  examName?: string;
  summaryInfo?: {
    totalObtained: number;
    totalFullMarks: number;
    absentCount: number;
    absentSubjects?: string[];
  };
  confirmLabel?: string;
  closeLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export const ConfirmSubmitModal: React.FC<ConfirmSubmitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  titleText = 'Are you sure you want to Submit the marks of',
  regNo,
  studentName,
  fatherName,
  examName,
  summaryInfo,
  confirmLabel = 'SUBMIT',
  closeLabel = 'CLOSE',
  isSubmitting = false,
  error = null,
  onRetry,
  children,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scrolling while the modal is open without shifting the layout
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalGutter = document.body.style.scrollbarGutter;
    document.body.style.scrollbarGutter = 'stable';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.scrollbarGutter = originalGutter;
    };
  }, [isOpen]);

  // Focus starts on SUBMIT button when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation: Enter confirms, Esc closes, Tab cycles between two buttons (focus trap)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isSubmitting) {
          onClose();
        }
      } else if (e.key === 'Tab') {
        const confirmBtn = confirmButtonRef.current;
        const closeBtn = closeButtonRef.current;
        if (!confirmBtn || !closeBtn) return;

        if (e.shiftKey) {
          // Backward tab: if on close, go to confirm; if on confirm, go to close
          if (document.activeElement === closeBtn) {
            e.preventDefault();
            confirmBtn.focus();
          } else if (document.activeElement === confirmBtn) {
            e.preventDefault();
            closeBtn.focus();
          }
        } else {
          // Forward tab: if on confirm, go to close; if on close, go to confirm
          if (document.activeElement === confirmBtn) {
            e.preventDefault();
            closeBtn.focus();
          } else if (document.activeElement === closeBtn) {
            e.preventDefault();
            confirmBtn.focus();
          }
        }
      } else if (e.key === 'Enter') {
        // If Enter is pressed and the focused element is NOT the close button, confirm
        if (document.activeElement === closeButtonRef.current) {
          e.preventDefault();
          if (!isSubmitting) onClose();
        } else {
          e.preventDefault();
          if (!isSubmitting) {
            onConfirm();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-[450px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Body */}
        <div className="p-6 pb-5 space-y-1">
          {children ? (
            children
          ) : (
            <>
              {/* First line in red/pink text */}
              <p
                id="confirm-modal-title"
                className="text-[#f43f5e] font-semibold text-sm leading-snug"
              >
                {titleText}
              </p>

              {/* Next line in normal dark text: Registration No. */}
              {regNo && (
                <p className="text-slate-800 text-sm font-normal mt-0.5 font-mono select-all">
                  {regNo}
                </p>
              )}

              {/* A bit of space, then in bold: Student Name in capitals */}
              {studentName && (
                <p className="text-slate-900 font-bold uppercase text-base pt-2.5 tracking-wide">
                  {studentName}
                </p>
              )}

              {/* Next line in bold: Father Name */}
              {fatherName && (
                <p className="text-slate-900 font-bold uppercase text-sm">
                  Father Name : {fatherName}
                </p>
              )}

              {/* Summary row below the names in small grey text */}
              {summaryInfo && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="leading-relaxed">
                    {examName && (
                      <>
                        <span>
                          Exam: <strong className="text-slate-700 font-medium">{examName}</strong>
                        </span>
                        <span className="mx-1.5 text-slate-300">|</span>
                      </>
                    )}
                    <span>
                      Total Obtained:{' '}
                      <strong className="text-slate-800 font-bold">
                        {summaryInfo.totalObtained} / {summaryInfo.totalFullMarks}
                      </strong>
                    </span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span>
                      Absent in:{' '}
                      <strong
                        className={
                          summaryInfo.absentCount > 0
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-700 font-medium'
                        }
                      >
                        {summaryInfo.absentCount} subject(s)
                      </strong>
                    </span>
                  </div>

                  {summaryInfo.absentSubjects && summaryInfo.absentSubjects.length > 0 && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Absent in: {summaryInfo.absentSubjects.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Error Message with Retry */}
          {error && (
            <div className="mt-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span className="font-medium">{error}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-xs font-bold text-red-800 underline hover:text-red-950 ml-2 cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        {/* Thin divider */}
        <div className="border-t border-slate-200" />

        {/* Footer with right-aligned action buttons */}
        <div className="px-6 py-3.5 bg-slate-50/80 flex items-center justify-end gap-3">
          {/* CLOSE button: purple filled button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2 rounded text-xs font-bold tracking-wide uppercase bg-[#7e22ce] hover:bg-[#6b21a8] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {closeLabel}
          </button>

          {/* SUBMIT / UPDATE button: pink/red filled button */}
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 rounded text-xs font-bold tracking-wide uppercase bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
