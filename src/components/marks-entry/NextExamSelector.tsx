import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';

interface NextExamSelectorProps {
  includeInNextExam: boolean;
  onChange: (include: boolean) => void;
  nextExamName?: string | null;
  disabled?: boolean;
}

export const NextExamSelector: React.FC<NextExamSelectorProps> = ({
  includeInNextExam,
  onChange,
  nextExamName,
  disabled = false,
}) => {
  return (
    <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 md:p-5 space-y-3">
      {/* Notice header */}
      <div className="text-xs text-slate-700 leading-relaxed font-medium">
        <strong className="text-slate-900 font-bold">Note:</strong> Please select
        below <strong>"Yes"</strong> if you want to add student to Next Examination,
        Select <strong>"No"</strong> if you don't want to add student to Next
        Examination.
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-800 whitespace-nowrap">
            Add student to next exam :
          </label>

          <select
            disabled={disabled}
            value={includeInNextExam ? 'yes' : 'no'}
            onChange={(e) => onChange(e.target.value === 'yes')}
            className={`px-3 py-1.5 rounded-md border text-xs font-bold font-mono transition-colors focus:ring-2 focus:ring-[#9333ea] focus:outline-hidden ${
              includeInNextExam
                ? 'bg-teal-50 text-teal-900 border-teal-400 font-black'
                : 'bg-red-50 text-red-900 border-red-400 font-black'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <option value="yes">YES</option>
            <option value="no">NO</option>
          </select>
        </div>

        {/* Helper Note Showing Next Exam Name */}
        {nextExamName ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white/80 px-3 py-1.5 rounded border border-slate-200">
            <ArrowRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>
              Next exam:{' '}
              <strong className="text-slate-900 font-semibold">{nextExamName}</strong>
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 italic">
            This is the final examination scheduled for this academic session.
          </div>
        )}
      </div>
    </div>
  );
};
