import React from 'react';
import { usePortal } from '../../store/portalStore';

export const PageHeader: React.FC = () => {
  const { schoolInfo } = usePortal();

  return (
    <div className="no-print bg-white rounded-lg border border-slate-200/80 shadow-xs p-4 md:p-5 mb-6">
      {/* Portal Main Title in Teal */}
      <h1 className="text-xl md:text-2xl font-bold text-[#0f766e] tracking-tight">
        {schoolInfo.portalTitle}
      </h1>

      {/* Thin horizontal divider */}
      <hr className="border-t border-slate-200 my-3" />

      {/* School metadata lines */}
      <div className="space-y-1.5 text-sm md:text-base leading-relaxed">
        <div>
          <span className="font-bold text-slate-800">My School name : </span>
          <span className="text-[#0f766e] font-semibold">
            {schoolInfo.name}
          </span>
        </div>

        <div>
          <span className="font-bold text-slate-800">ASSEB-DI : Code : </span>
          <span className="text-[#0f766e] font-bold font-mono">
            {schoolInfo.code}
          </span>
        </div>
      </div>
    </div>
  );
};
