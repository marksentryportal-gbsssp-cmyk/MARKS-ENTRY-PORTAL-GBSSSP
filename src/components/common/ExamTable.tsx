import React from 'react';
import { ExamRecord } from '../../types';
import { StatusCell } from './StatusCell';

interface ExamTableProps {
  exams: ExamRecord[];
  emptyMessage?: string;
}

export const ExamTable: React.FC<ExamTableProps> = ({
  exams,
  emptyMessage = 'No examination records found for this selection.',
}) => {
  if (exams.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
      <table className="w-full text-xs text-center border-collapse">
        <thead>
          <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
            <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[220px]">
              Exam Name
            </th>
            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[80px]">
              Class
            </th>
            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">
              Academic Year
            </th>
            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">
              Start date
            </th>
            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">
              End date
            </th>
            <th className="py-2.5 px-4 min-w-[200px]">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {exams.map((exam) => (
            <tr
              key={exam.id}
              className="hover:bg-slate-50/80 transition-colors"
            >
              <td className="py-2.5 px-3 border-r border-slate-200 text-left font-semibold text-slate-800">
                {exam.name}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700 font-medium">
                {exam.className}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                {exam.academicYear}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                {exam.startDate}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                {exam.endDate}
              </td>
              <td className="py-2.5 px-4">
                <StatusCell exam={exam} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
