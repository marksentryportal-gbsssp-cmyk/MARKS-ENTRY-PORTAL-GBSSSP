import React from 'react';
import { MarksStatus } from '../../types';
import { CheckCircle2, Clock } from 'lucide-react';

interface StatusPillProps {
  status: MarksStatus;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Completed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-medium text-xs text-slate-500">
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <span>Not Completed</span>
    </span>
  );
};
