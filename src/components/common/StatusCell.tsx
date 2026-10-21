import React from 'react';
import { ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { ExamRecord } from '../../types';
import { getExamStatus } from '../../utils/dateUtils';
import { usePortal } from '../../store/portalStore';

interface StatusCellProps {
  exam: ExamRecord;
  onNavigateToMarksEntry?: () => void;
}

export const StatusCell: React.FC<StatusCellProps> = ({
  exam,
  onNavigateToMarksEntry,
}) => {
  const { navigateTo, reopenExam } = usePortal();

  const status = getExamStatus(exam.startDate, exam.endDate, exam.isFinalSubmitted);

  const handleGo = () => {
    if (onNavigateToMarksEntry) {
      onNavigateToMarksEntry();
    } else {
      navigateTo(`/marks-entry/${exam.classId}/${exam.id}`);
    }
  };

  const handleReopen = (e: React.MouseEvent) => {
    e.stopPropagation();
    reopenExam(exam.id);
  };

  // a) Final Submitted
  if (status === 'FinalSubmitted') {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#b91c1c]">
        <CheckCircle2 className="w-4 h-4 text-[#b91c1c] shrink-0" />
        <span>Successfully Submitted</span>
      </div>
    );
  }

  // b) Open (today within start & end date)
  if (status === 'Open') {
    return (
      <button
        type="button"
        onClick={handleGo}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0f766e] hover:bg-teal-800 text-white text-xs font-medium rounded-md shadow-xs transition-colors group cursor-pointer"
        title="Open student marks entry"
      >
        <span>Go to marks Entry system</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  // c) Closed (end date passed)
  if (status === 'Closed') {
    return (
      <div className="inline-flex items-center justify-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">Closed</span>
        <button
          type="button"
          onClick={handleReopen}
          className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-semibold hover:underline bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 transition-colors"
          title="Admin: Reopen exam for marks entry (extends end date)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reopen</span>
        </button>
      </div>
    );
  }

  // d) Not started yet (start date in future)
  return (
    <span className="text-xs text-slate-400 font-medium italic">
      Not started yet
    </span>
  );
};
