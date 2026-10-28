import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ProgressStripProps {
  completedCount: number;
  totalCount: number;
  onBack: () => void;
  backText?: string;
  breakdownText?: string;
}

export const ProgressStrip: React.FC<ProgressStripProps> = ({
  completedCount,
  totalCount,
  onBack,
  backText = 'Back to exam list',
  breakdownText,
}) => {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-semibold text-teal-800 hover:text-teal-950 bg-white px-2.5 py-1.5 rounded border border-slate-300 hover:border-teal-500 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backText}</span>
        </button>
      </div>

      <div className="flex-1 max-w-md w-full flex flex-col gap-1.5 sm:items-end">
        <div className="flex items-center justify-between w-full text-slate-700 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Marks Entry Progress:</span>
          </span>
          <span className="font-mono">
            Completed:{' '}
            <strong className="text-teal-800 font-bold">{completedCount}</strong> / Total:{' '}
            <strong className="text-slate-900">{totalCount}</strong>{' '}
            <span className="text-slate-400 font-normal">({percentage}%)</span>
          </span>
        </div>

        {/* Slim Teal Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#0f766e] h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {breakdownText && (
          <div className="text-[11px] font-mono font-medium text-slate-500 flex items-center justify-between w-full pt-0.5">
            <span className="text-slate-400">Section Breakdown:</span>
            <span className="text-slate-700 font-semibold">{breakdownText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
