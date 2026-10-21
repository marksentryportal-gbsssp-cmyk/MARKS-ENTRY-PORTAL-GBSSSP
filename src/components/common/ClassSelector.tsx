import React from 'react';
import { GraduationCap } from 'lucide-react';
import { ClassInfo } from '../../types';
import { usePortal } from '../../store/portalStore';

interface ClassSelectorProps {
  selectedClassId?: string;
  onSelectClass?: (classId: string) => void;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({
  selectedClassId,
  onSelectClass,
}) => {
  const { classes, navigateTo } = usePortal();

  const handleSelect = (classId: string) => {
    if (onSelectClass) {
      onSelectClass(classId);
    } else {
      navigateTo(`/marks-entry/${classId}`);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 md:p-5">
      <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#0f766e]" />
          <h2 className="text-[#0f766e] font-bold text-base md:text-lg tracking-tight">
            Select Class
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {classes.length} Total Classes
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {classes.map((cls) => {
          const isSelected = selectedClassId === cls.id;

          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => handleSelect(cls.id)}
              className={`p-3 rounded-lg border text-center transition-all cursor-pointer relative group flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-[#0f766e] border-[#0f766e] text-white shadow-sm ring-2 ring-teal-300 ring-offset-1'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40 hover:shadow-xs'
              }`}
            >
              <span className="text-[11px] font-mono opacity-60 uppercase mb-0.5">
                Class
              </span>
              <span
                className={`text-sm font-bold tracking-tight ${
                  isSelected ? 'text-white' : 'text-slate-900 group-hover:text-teal-800'
                }`}
              >
                {cls.name}
              </span>
              {cls.hasStreams && (
                <span
                  className={`mt-1 text-[9px] px-1.5 py-0.2 rounded font-medium ${
                    isSelected
                      ? 'bg-teal-800/80 text-teal-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  Streams
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
