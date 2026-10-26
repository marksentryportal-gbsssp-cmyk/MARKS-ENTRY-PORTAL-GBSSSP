import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Save,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import {
  sortByRollNo,
  checkDuplicateRollNos,
  renumberStudents,
  parseNumericRollNo,
} from '../../utils/rollNoUtils';

interface ClassRosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  academicYear: string;
  onOpenAddStudent?: () => void;
  onOpenEditStudent?: (student: Student) => void;
}

export const ClassRosterDrawer: React.FC<ClassRosterDrawerProps> = ({
  isOpen,
  onClose,
  classId,
  className,
  academicYear,
  onOpenAddStudent,
  onOpenEditStudent,
}) => {
  const {
    students,
    exams,
    currentUser,
    updateStudentRollNos,
    deleteStudentWithAction,
    addToast,
  } = usePortal();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Manual reorder list state
  const [manualList, setManualList] = useState<Student[]>([]);
  const [hasManualChanges, setHasManualChanges] = useState(false);

  // Renumber Modal state
  const [isRenumberOpen, setIsRenumberOpen] = useState(false);
  const [renumberMode, setRenumberMode] = useState<'current' | 'alphabetical' | 'regNo'>('current');
  const [startFromNumber, setStartFromNumber] = useState<number>(1);
  const [adminReason, setAdminReason] = useState<string>('');

  // Filter students for this class and year
  const rawClassStudents = useMemo(() => {
    return students.filter(
      (s) => s.classId === classId && s.academicYear === academicYear && s.active !== false
    );
  }, [students, classId, academicYear]);

  // Keep manual list in sync on drawer open
  React.useEffect(() => {
    if (isOpen) {
      setManualList(sortByRollNo(rawClassStudents));
      setHasManualChanges(false);
      setSearchTerm('');
    }
  }, [isOpen, rawClassStudents]);

  // Check for duplicate roll numbers
  const duplicateCheck = useMemo(() => {
    return checkDuplicateRollNos(students, classId, academicYear);
  }, [students, classId, academicYear]);

  // Check if any exam in this class & year is final submitted
  const hasFinalSubmittedExam = useMemo(() => {
    return exams.some(
      (e) => e.classId === classId && e.academicYear === academicYear && e.isFinalSubmitted
    );
  }, [exams, classId, academicYear]);

  // Search filtered items
  const displayedStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sourceList = hasManualChanges ? manualList : sortByRollNo(rawClassStudents);
    if (!term) return sourceList;

    return sourceList.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(term)) ||
        (s.registrationNo && s.registrationNo.toLowerCase().includes(term)) ||
        (s.rollNo && s.rollNo.includes(term))
    );
  }, [searchTerm, manualList, rawClassStudents, hasManualChanges]);

  // Manual Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const nextList = [...manualList];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    setManualList(nextList);
    setHasManualChanges(true);
  };

  // Manual Move Down
  const handleMoveDown = (index: number) => {
    if (index >= manualList.length - 1) return;
    const nextList = [...manualList];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    setManualList(nextList);
    setHasManualChanges(true);
  };

  // Save manual reorder
  const handleSaveManualOrder = () => {
    const updates = manualList.map((s, idx) => ({
      studentId: s.id,
      rollNo: String(idx + 1),
    }));
    updateStudentRollNos(updates, 'Manual reordering in Class Roster Drawer');
    setHasManualChanges(false);
    addToast('Roll numbers updated sequentially according to your custom order!', 'success');
  };

  // Renumber preview calculations
  const renumberPreview = useMemo(() => {
    return renumberStudents(rawClassStudents, renumberMode, Number(startFromNumber) || 1);
  }, [rawClassStudents, renumberMode, startFromNumber]);

  // Confirm Renumber execution
  const handleExecuteRenumber = () => {
    if (hasFinalSubmittedExam) {
      if (currentUser?.role !== 'admin') {
        addToast('Only administrators can renumber a class with Final Submitted examinations.', 'error');
        return;
      }
      if (!adminReason.trim()) {
        addToast('Please provide an administrative reason for renumbering.', 'error');
        return;
      }
    }

    const updates = renumberPreview.map((item) => ({
      studentId: item.studentId,
      rollNo: item.newRollNo,
    }));

    updateStudentRollNos(
      updates,
      `Renumbered by ${renumberMode} (starting at ${startFromNumber})${
        adminReason ? `: ${adminReason}` : ''
      }`
    );

    setIsRenumberOpen(false);
    setAdminReason('');
    setHasManualChanges(false);
    addToast('All students renumbered successfully!', 'success');
  };

  // Handle Remove Student
  const handleRemove = (student: Student) => {
    if (
      confirm(
        `Are you sure you want to remove ${student.name} (Roll ${student.rollNo}) from Class ${className}?`
      )
    ) {
      deleteStudentWithAction(student.id, 'soft');
      addToast(`Student ${student.name} marked inactive and removed from class roster.`, 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Class {className} Student Roster ({rawClassStudents.length})
              </h2>
              <p className="text-xs text-slate-400">
                Academic Session: <span className="font-mono text-slate-300">{academicYear}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Roll No. Alert Banner if detected */}
        {duplicateCheck.hasDuplicates && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-300 text-amber-900 flex items-center justify-between text-xs px-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Duplicate Roll Numbers Detected:</strong> Roll(s){' '}
                <span className="font-mono font-bold">{duplicateCheck.duplicates.join(', ')}</span>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsRenumberOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              Fix with Renumber Tool
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, roll no, reg no..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hasManualChanges && (
              <button
                type="button"
                onClick={handleSaveManualOrder}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save New Order</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsRenumberOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-teal-700 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Renumber Roll Nos.</span>
            </button>

            {onOpenAddStudent && (
              <button
                type="button"
                onClick={onOpenAddStudent}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0f766e] hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {displayedStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No students found for Class {className} {searchTerm ? 'matching search' : ''}.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-16 text-center">Order</th>
                    <th className="py-2.5 px-3 w-20">Roll No.</th>
                    <th className="py-2.5 px-3">Registration No.</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father Name</th>
                    <th className="py-2.5 px-3">DOB</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedStudents.map((student, idx) => {
                    const isNumeric = parseNumericRollNo(student.rollNo) !== null;
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Up/Down buttons for manual order */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0 || searchTerm !== ''}
                              onClick={() => handleMoveUp(idx)}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === displayedStudents.length - 1 || searchTerm !== ''}
                              onClick={() => handleMoveDown(idx)}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Roll Number Column */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isNumeric ? (
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {student.rollNo}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                                <AlertTriangle className="w-3 h-3" />
                                <span>No Roll</span>
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-semibold">
                              {student.section || 'A'}
                            </span>
                          </div>
                        </td>

                        {/* Registration Number */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 select-all text-xs">
                          {student.registrationNo}
                        </td>

                        {/* Name & Address */}
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 uppercase block">
                            {student.name}
                          </span>
                          {student.currentAddress && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs" title={student.currentAddress}>
                              {student.currentAddress}
                            </span>
                          )}
                        </td>

                        {/* Father Name */}
                        <td className="py-2.5 px-3 text-slate-600 uppercase text-xs">
                          {student.fatherName}
                        </td>

                        {/* DOB */}
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {student.dob}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {onOpenEditStudent && (
                              <button
                                type="button"
                                onClick={() => onOpenEditStudent(student)}
                                className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                                title="Edit student"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemove(student)}
                              className="p-1 rounded text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove from class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {rawClassStudents.length} candidate(s) enrolled in Class {className} &bull; {academicYear}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* RENUMBER ROLL NOS MODAL */}
      {isRenumberOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
          onClick={() => setIsRenumberOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold">
                  Renumber Roll Numbers &bull; Class {className}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRenumberOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Warnings */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Important Note on Examination Records:</span>
                </p>
                <p className="leading-relaxed">
                  Marksheets, tabulation sheets, and results use these roll numbers. Renumbering will update the roll numbers for all {rawClassStudents.length} students in this class.
                </p>
              </div>

              {hasFinalSubmittedExam && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-red-950">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Class Has Final Submitted Examinations!</span>
                  </p>
                  <p className="leading-relaxed">
                    One or more examinations for Class {className} ({academicYear}) have already been final submitted. Renumbering requires administrator authorization and an audit reason.
                  </p>
                  {currentUser?.role === 'admin' ? (
                    <div>
                      <label className="block font-bold text-red-950 mb-1">
                        Administrator Override Reason <span className="text-red-600">*</span>:
                      </label>
                      <input
                        type="text"
                        value={adminReason}
                        onChange={(e) => setAdminReason(e.target.value)}
                        placeholder="e.g. Correcting inadvertent duplicate admissions"
                        className="w-full px-3 py-1.5 rounded border border-red-300 bg-white text-xs focus:ring-1 focus:ring-red-500 focus:outline-hidden"
                      />
                    </div>
                  ) : (
                    <p className="font-bold text-red-800">
                      Locked: Only an Administrator account can renumber after Final Submission.
                    </p>
                  )}
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Ordering Sequence</label>
                  <select
                    value={renumberMode}
                    onChange={(e) => setRenumberMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  >
                    <option value="current">Serially by current order</option>
                    <option value="alphabetical">Alphabetical by student name</option>
                    <option value="regNo">By Registration Number</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Start from Roll No.</label>
                  <input
                    type="number"
                    min="1"
                    value={startFromNumber}
                    onChange={(e) => setStartFromNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Live Preview List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Preview of Changes:</span>
                  <span className="text-[11px] text-slate-500">
                    Rolls {startFromNumber} to {startFromNumber + renumberPreview.length - 1}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {renumberPreview.map((item) => {
                    const student = rawClassStudents.find((s) => s.id === item.studentId);
                    return (
                      <div
                        key={item.studentId}
                        className="px-3 py-2 flex items-center justify-between text-[11px] hover:bg-slate-50"
                      >
                        <span className="font-bold text-slate-800 uppercase truncate max-w-[240px]">
                          {student?.name}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400">
                            {item.oldRollNo ? `Roll ${item.oldRollNo}` : 'No Roll'}
                          </span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                            Roll {item.newRollNo}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRenumberOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={hasFinalSubmittedExam && (currentUser?.role !== 'admin' || !adminReason.trim())}
                  onClick={handleExecuteRenumber}
                  className="px-5 py-2 rounded-lg bg-[#0f766e] hover:bg-teal-800 text-white font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm & Renumber Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
