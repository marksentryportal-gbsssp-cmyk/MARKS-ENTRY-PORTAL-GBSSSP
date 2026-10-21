import React from 'react';
import { ListChecks, ArrowLeft } from 'lucide-react';
import { usePortal } from '../../store/portalStore';

export const ChecklistPage: React.FC = () => {
  const { navigateTo, schoolInfo } = usePortal();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6">
      <div className="border-b border-slate-200 pb-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 text-[#0f766e]">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Verification Checklist
            </h2>
            <p className="text-xs text-slate-500">
              {schoolInfo.name} ({schoolInfo.code})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-teal-700 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-full bg-teal-50 text-[#0f766e] flex items-center justify-center mx-auto">
          <ListChecks className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Verification & Scrutiny Checklist
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          This module will provide headmaster/teacher-in-charge verification reports, discrepancy finders (missing marks, absent candidates), and printable marks summary sheets before final submission.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigateTo('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333ea] hover:bg-[#7e22ce] text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
