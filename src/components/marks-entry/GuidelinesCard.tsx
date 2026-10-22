import React, { useState } from 'react';
import { AlertCircle, Edit3, X, Check, RotateCcw } from 'lucide-react';
import { usePortal } from '../../store/portalStore';

export const GuidelinesCard: React.FC = () => {
  const { marksEntryGuidelines, updateMarksEntryGuidelines } = usePortal();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLines, setEditLines] = useState<string>('');

  const handleOpenEdit = () => {
    setEditLines(marksEntryGuidelines.join('\n'));
    setIsEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = editLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (updated.length > 0) {
      updateMarksEntryGuidelines(updated);
    }
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-red-200 shadow-2xs p-4 md:p-5 relative">
        <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-red-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <h2 className="text-xs md:text-sm font-extrabold uppercase tracking-wide text-red-600">
              GUIDELINES FOR MARKS ENTRY:
            </h2>
          </div>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
            title="Edit marks entry guidelines (Admin/Staff)"
          >
            <Edit3 className="w-3 h-3" />
            <span className="hidden sm:inline">Edit Guidelines</span>
          </button>
        </div>

        <ul className="space-y-1.5 text-xs md:text-[13px] text-red-600 font-medium leading-relaxed list-none">
          {marksEntryGuidelines.map((guideline, idx) => {
            const isSubHeader =
              guideline.toLowerCase().includes('for absent candidate') ||
              guideline.startsWith('FOR_ABSENT_HEADER:');
            const cleanText = guideline.replace(/^FOR_ABSENT_HEADER:/, '');

            if (isSubHeader) {
              return (
                <li key={idx} className="pt-1.5 font-bold underline text-red-700 tracking-tight">
                  {cleanText}
                </li>
              );
            }

            return (
              <li key={idx} className="flex items-start gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>{cleanText}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Quick Edit Guidelines Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-red-50/70 border-b border-red-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-950">
                  Edit Guidelines for Marks Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bullet Points (one line per bullet point):
                </label>
                <textarea
                  rows={8}
                  value={editLines}
                  onChange={(e) => setEditLines(e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:outline-teal-600 text-slate-800 leading-relaxed"
                  placeholder="Enter each rule on a new line..."
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Use "For absent candidates:" on its own line to format it as an underlined sub-heading.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const defaults = [
                      'Do not enter any calculated weightage marks.',
                      'Please enter only the absolute marks secured by the students against each subject in Theory / Practical / IA part.',
                      'Please confirm the Student, Examination, Registration Number, Name and Class of each and every student properly before entering the marks.',
                      'Please enter "0" (Zero) if a student has scored "0" after appearing in the examination.',
                      'For absent candidates:',
                      'If any student is absent in any particular subject(s), then please enter "A" (single "A", in capitals) against that particular subject(s).',
                      'If any student is absent in all the subjects, then mark him as absent using the Mark Absent button.',
                    ];
                    setEditLines(defaults.join('\n'));
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Guidelines
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
