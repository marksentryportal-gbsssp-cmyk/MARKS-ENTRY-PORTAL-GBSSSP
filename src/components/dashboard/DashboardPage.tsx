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
  ClipboardList,
  Building2,
  Edit2,
  CheckCircle2,
  Lock,
  X,
  ShieldCheck,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { getExamStatus } from '../../utils/dateUtils';
import { sanitizeUdiseCode, isValidUdiseCode } from '../../utils/validators';
import { verifyPassword } from '../../services/authService';

export const DashboardPage: React.FC = () => {
  const {
    importantNotifications,
    exams,
    classes,
    navigateTo,
    schoolInfo,
    updateSchoolInfo,
    currentUser,
    addToast,
  } = usePortal();

  // Class filter for active marks entry processes
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // School Details Edit Modal State
  const [isEditSchoolModalOpen, setIsEditSchoolModalOpen] = useState(false);
  const [editSchoolName, setEditSchoolName] = useState(schoolInfo.name);
  const [editSchoolCode, setEditSchoolCode] = useState(schoolInfo.code);
  const [editUdiseCode, setEditUdiseCode] = useState(schoolInfo.udiseCode);
  const [editDistrict, setEditDistrict] = useState(schoolInfo.district);
  const [editSession, setEditSession] = useState(schoolInfo.academicSession);
  const [editEmail, setEditEmail] = useState(schoolInfo.email || '');
  const [editPhone, setEditPhone] = useState(schoolInfo.phone || '');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [schoolEditError, setSchoolEditError] = useState<string | null>(null);
  const [isSavingSchool, setIsSavingSchool] = useState(false);

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

  const handleOpenEditSchoolModal = () => {
    setEditSchoolName(schoolInfo.name);
    setEditSchoolCode(schoolInfo.code);
    setEditUdiseCode(schoolInfo.udiseCode);
    setEditDistrict(schoolInfo.district);
    setEditSession(schoolInfo.academicSession);
    setEditEmail(schoolInfo.email || '');
    setEditPhone(schoolInfo.phone || '');
    setAdminPasswordConfirm('');
    setSchoolEditError(null);
    setIsEditSchoolModalOpen(true);
  };

  const handleSaveSchoolDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolEditError(null);

    const cleanUdise = sanitizeUdiseCode(editUdiseCode);
    if (!isValidUdiseCode(cleanUdise)) {
      setSchoolEditError('School UDISE Code must be exactly 11 digits.');
      return;
    }

    // If UDISE Code is being modified, confirm admin password
    const isUdiseChanged = cleanUdise !== schoolInfo.udiseCode;
    if (isUdiseChanged) {
      if (!adminPasswordConfirm) {
        setSchoolEditError('Please enter your password to confirm changing the School UDISE Code (login identifier).');
        return;
      }

      if (currentUser) {
        const isPasswordCorrect = await verifyPassword(
          adminPasswordConfirm,
          currentUser.passwordHash,
          currentUser.salt
        );
        if (!isPasswordCorrect) {
          setSchoolEditError('Password confirmation failed. Please check your password.');
          return;
        }
      }
    }

    try {
      setIsSavingSchool(true);
      updateSchoolInfo({
        name: editSchoolName.trim().toUpperCase(),
        code: editSchoolCode.trim().toUpperCase(),
        udiseCode: cleanUdise,
        district: editDistrict.trim(),
        academicSession: editSession.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
      });
      setIsSavingSchool(false);
      setIsEditSchoolModalOpen(false);
      addToast('School details and UDISE Code updated successfully!', 'success');
    } catch (err: any) {
      setIsSavingSchool(false);
      setSchoolEditError('Failed to save school details. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. Yellow Warning Banner if UDISE Code is still placeholder (18000000000) */}
      {(schoolInfo.udiseCode === '18000000000' || currentUser?.udiseCode === '18000000000') && (
        <div className="bg-amber-100 border-2 border-amber-400 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-amber-950 uppercase tracking-wide">
                Please set your real School UDISE Code in School Details.
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                The portal is currently using the placeholder UDISE code <span className="font-mono font-bold">18000000000</span>. Please update it to your institution's official 11-digit UDISE code.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditSchoolModal}
            className="px-3.5 py-1.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shrink-0 shadow-2xs hover:shadow transition-colors cursor-pointer"
          >
            Update School Details
          </button>
        </div>
      )}

      {/* Two cards side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* CARD A: IMPORTANT NOTIFICATION: */}
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

        {/* CARD B: PORTAL QUICK ACCESS & SCHOOL DETAILS */}
        <div className="space-y-6">
          {/* Card B1: Quick Shortcuts */}
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
            </div>
          </section>

          {/* Card B2: School Details Card with School UDISE Code & EDIT button */}
          <section
            aria-labelledby="school-details-heading"
            className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
          >
            <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0f766e] shrink-0" />
                <h2
                  id="school-details-heading"
                  className="text-[#0f766e] font-bold text-sm md:text-base tracking-tight uppercase"
                >
                  School Details
                </h2>
              </div>
              <button
                type="button"
                onClick={handleOpenEditSchoolModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                <span>EDIT</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">
                  School Name
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {schoolInfo.name}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">
                  School Code (ASSEB-DI)
                </span>
                <span className="font-bold text-[#b91c1c] font-mono text-sm">
                  {schoolInfo.code}
                </span>
              </div>

              <div className="p-2.5 rounded bg-teal-50/70 border border-teal-200">
                <span className="text-[10px] text-teal-800 font-bold block uppercase tracking-wider">
                  School UDISE Code (11 Digits)
                </span>
                <span className="font-bold text-teal-950 font-mono text-sm tracking-wider">
                  {schoolInfo.udiseCode || '18000000000'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">
                  District & State
                </span>
                <span className="font-semibold text-slate-800">
                  {schoolInfo.district}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">
                  Academic Session
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {schoolInfo.academicSession}
                </span>
              </div>
            </div>
          </section>
        </div>

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
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
          <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 font-mono font-medium border border-teal-200">
            UDISE: {schoolInfo.udiseCode || '18000000000'}
          </span>
          <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 font-medium border border-teal-200">
            ASSEB-DI Affiliated
          </span>
        </div>
      </div>

      {/* EDIT SCHOOL DETAILS MODAL */}
      {isEditSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm tracking-tight">
                  Edit School Details & UDISE Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditSchoolModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolDetails} className="p-6 space-y-4">
              {schoolEditError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{schoolEditError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School Code (ASSEB-DI)
                  </label>
                  <input
                    type="text"
                    required
                    value={editSchoolCode}
                    onChange={(e) => setEditSchoolCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold text-[#b91c1c] px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School UDISE Code (11 Digits)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    required
                    value={editUdiseCode}
                    onChange={(e) => setEditUdiseCode(sanitizeUdiseCode(e.target.value))}
                    className="w-full text-xs font-mono font-bold text-teal-800 px-3 py-2 border border-teal-500 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    placeholder="11 digits (e.g. 18000000000)"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {editUdiseCode.length}/11 digits
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District, State
                  </label>
                  <input
                    type="text"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    value={editSession}
                    onChange={(e) => setEditSession(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Password confirmation if UDISE code is modified */}
              {editUdiseCode !== schoolInfo.udiseCode && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Password Required to Update Login Identifier</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Changing the School UDISE Code will update the primary login identifier for administrative access. Please enter your password to confirm:
                  </p>
                  <input
                    type="password"
                    required
                    value={adminPasswordConfirm}
                    onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-amber-400 bg-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    placeholder="Enter your current password"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditSchoolModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchool}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSchool ? 'Saving...' : 'Save School Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
