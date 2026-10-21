import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { getExamStatus } from '../../utils/dateUtils';

export const DashboardPage: React.FC = () => {
  const {
    importantNotifications,
    exams,
    classes,
    navigateTo,
    schoolInfo,
  } = usePortal();

  // Class filter for active marks entry processes
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Filter only exams that are currently open (today between start and end dates and not final submitted)
  const activeOpenExams = useMemo(() => {
    return exams.filter((exam) => {
      const status = getExamStatus(exam.startDate, exam.endDate, exam.isFinalSubmitted);
      if (status !== 'Open') return false;
      if (selectedClassFilter !== 'all' && exam.classId !== selectedClassFilter) {
        return false;
      }
      return true;
    });
  }, [exams, selectedClassFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(activeOpenExams.length / pageSize) || 1;
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeOpenExams.slice(start, start + pageSize);
  }, [activeOpenExams, currentPage]);

  const handleClassFilterChange = (val: string) => {
    setSelectedClassFilter(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Two cards side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* CARD A: IMPORTANT NOTIFICATION: (Preserved faithfully from Step 1) */}
        <section
          aria-labelledby="important-notifications-heading"
          className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
        >
          {/* Card Header with Dark Red Title (#b91c1c) & thin bottom border */}
          <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#b91c1c] shrink-0" />
              <h2
                id="important-notifications-heading"
                className="text-[#b91c1c] font-bold text-base md:text-lg tracking-tight uppercase"
              >
                IMPORTANT NOTIFICATION:
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              Mandatory Guidelines
            </span>
          </div>

          {/* Bulleted List */}
          <div className="space-y-3.5 text-sm leading-relaxed text-slate-700">
            <ul className="space-y-3 list-none">
              {importantNotifications.map((notification, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-2.5 rounded-md bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-[#b91c1c] text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="text-slate-800 text-sm leading-normal">
                    {notification}
                  </p>
                </li>
              ))}
            </ul>

            {/* Note box */}
            <div className="mt-4 p-3 rounded-md bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold">Important Reminder: </span>
                Please enter absolute marks scored by students only. The portal will automatically calculate the required weightages and grade points.
              </div>
            </div>
          </div>
        </section>

        {/* CARD B: PORTAL QUICK ACCESS & SYSTEM SNAPSHOT */}
        <section
          aria-labelledby="portal-snapshot-heading"
          className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
        >
          <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0f766e] shrink-0" />
              <h2
                id="portal-snapshot-heading"
                className="text-[#0f766e] font-bold text-base md:text-lg tracking-tight uppercase"
              >
                PORTAL OVERVIEW & SHORTCUTS
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              Academic Session {schoolInfo.academicSession}
            </span>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <p className="text-slate-600 leading-relaxed text-sm">
              Welcome to the centralized internal examination management system for <strong>{schoolInfo.name}</strong>. Use the navigation buttons below to select a class or configure examinations:
            </p>

            {/* Primary Action Buttons in Purple (#9333ea) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigateTo('/marks-entry')}
                className="flex items-center justify-between px-4 py-3 bg-[#9333ea] hover:bg-[#7e22ce] text-white font-semibold text-xs rounded-lg shadow-xs hover:shadow transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Marks Entry by Class</span>
                </span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => navigateTo('/exam-setup')}
                className="flex items-center justify-between px-4 py-3 bg-[#0f766e] hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs hover:shadow transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Exam Master Setup</span>
                </span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500 block text-[11px]">Total Classes</span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {classes.length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 text-center">
                <span className="text-teal-700 block text-[11px]">Active Open Exams</span>
                <span className="text-base font-bold text-teal-900 font-mono">
                  {activeOpenExams.length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500 block text-[11px]">Total Configured</span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {exams.length}
                </span>
              </div>
            </div>

            {/* Support reference note */}
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
              <strong>Need Help with Student Marks Entry?</strong> Contact our technical team via the WhatsApp support numbers at the bottom of the sidebar.
            </div>
          </div>
        </section>

      </div>

      {/* 5. DASHBOARD UPDATE: List of Active Marks Entry Process Table */}
      <section
        aria-labelledby="active-process-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        {/* Table Title & Class Filter Dropdown */}
        <div className="border-b border-slate-200 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="active-process-heading"
              className="text-[#0f766e] font-bold text-base md:text-lg tracking-tight uppercase"
            >
              List of Active Marks Entry Process
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exams currently open for marks entry (Today is within start and end date and not final submitted)
            </p>
          </div>

          {/* Class filter dropdown above table */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-class-filter"
              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Filter className="w-3.5 h-3.5 text-teal-700" />
              <span>Filter Class:</span>
            </label>
            <select
              id="dashboard-class-filter"
              value={selectedClassFilter}
              onChange={(e) => handleClassFilterChange(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-600 cursor-pointer"
            >
              <option value="all">All 14 Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table View */}
        {paginatedExams.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
            No active marks entry processes found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[200px]">
                    Exam Name
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-24">
                    Class
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-28">
                    Academic Year
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-28">
                    Start Date
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-28">
                    End Date
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paginatedExams.map((exam) => (
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
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo(`/marks-entry/${exam.classId}/${exam.id}`)
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-semibold rounded-md shadow-2xs hover:shadow transition-colors group cursor-pointer"
                        title="Go to marks entry for this exam"
                      >
                        <span>Go</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination at 10 rows per page */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {activeOpenExams.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, activeOpenExams.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800 font-mono">
              {activeOpenExams.length}
            </span>{' '}
            active examinations
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-slate-100 rounded text-slate-700 font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Quick Summary / Status Bar at bottom of Dashboard */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-teal-50 text-teal-700">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 block">
              Marks Submission Window: OPEN
            </span>
            <span className="text-slate-500">
              Assam State School Education Board, Div-I Internal Examination System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-100 font-mono text-slate-700 border border-slate-200">
            SCHOOL CODE: {schoolInfo.code}
          </span>
          <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 font-medium border border-teal-200">
            ASSEB-DI Affiliated
          </span>
        </div>
      </div>
    </div>
  );
};
