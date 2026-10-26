import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { StudentAdmissionForm, StudentFormData } from './StudentAdmissionForm';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClassId: string;
  targetAcademicYear: string;
  targetExamId: string;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  targetClassId,
  targetAcademicYear,
  targetExamId,
}) => {
  const {
    classes,
    students,
    exams,
    createStudent,
    importStudentsFromClass,
    generateNextRegNo,
    addToast,
    getStudentsForExam,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<'new' | 'import'>('new');

  // Tab B: Import From Previous Exam / Class
  const [sourceClassId, setSourceClassId] = useState(targetClassId);
  const [sourceYear, setSourceYear] = useState('2025-2026');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Filter exams of the current class for display
  const classExams = exams.filter(
    (e) => e.classId === targetClassId && e.academicYear === targetAcademicYear
  );

  const handleSaveStudent = (data: StudentFormData, addAnother = false) => {
    createStudent(
      {
        registrationNo: data.registrationNo.trim() || generateNextRegNo(),
        name: data.name.trim().toUpperCase(),
        studentName: data.name.trim().toUpperCase(),
        fatherName: data.fatherName.trim().toUpperCase(),
        motherName: data.motherName.trim() ? data.motherName.trim().toUpperCase() : undefined,
        dob: data.dob.trim(),
        gender: data.gender,
        classId: data.classId || targetClassId,
        section: data.section.trim().toUpperCase() || 'A',
        rollNo: data.rollNo.trim(),
        currentAddress: data.currentAddress.trim(),
        academicYear: targetAcademicYear,
        admissionNo: data.admissionNo.trim() || undefined,
        active: true,
      },
      targetExamId
    );

    if (!addAnother) {
      onClose();
    }
  };

  // Tab B: Filter source students
  const alreadyEnrolledIds = getStudentsForExam(targetExamId).map((s) => s.id);
  const availableSourceStudents = students.filter(
    (s) =>
      s.classId === sourceClassId &&
      s.academicYear === sourceYear &&
      s.active &&
      !alreadyEnrolledIds.includes(s.id)
  );

  const handleToggleSelectAllImport = () => {
    if (selectedStudentIds.length === availableSourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(availableSourceStudents.map((s) => s.id));
    }
  };

  const handleImportSelected = () => {
    if (selectedStudentIds.length === 0) {
      addToast('No students selected for import', 'error');
      return;
    }

    importStudentsFromClass(
      targetExamId,
      sourceClassId,
      sourceYear,
      selectedStudentIds
    );

    setSelectedStudentIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-[760px] w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0f766e]" />
              <h3 className="font-bold text-slate-800 text-base">
                Student Admission Details
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs: 2 clean tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'new'
                ? 'border-[#0f766e] bg-white text-[#0f766e]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Student</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'border-[#0f766e] bg-white text-[#0f766e]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Import From Class / Session</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs">
          {/* TAB A: Official Student Admission Form */}
          {activeTab === 'new' && (
            <StudentAdmissionForm
              targetClassId={targetClassId}
              targetAcademicYear={targetAcademicYear}
              classes={classes}
              students={students}
              classExams={classExams}
              isEditMode={false}
              onSave={handleSaveStudent}
              onCancel={onClose}
              generateNextRegNo={generateNextRegNo}
            />
          )}

          {/* TAB B: Import From Previous Exam / Class */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-slate-600 text-xs">
                Quickly import existing candidates from previous academic years or another class roster.
              </p>

              {/* Source Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Source Class:
                  </label>
                  <select
                    value={sourceClassId}
                    onChange={(e) => {
                      setSourceClassId(e.target.value);
                      setSelectedStudentIds([]);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Source Academic Year:
                  </label>
                  <select
                    value={sourceYear}
                    onChange={(e) => {
                      setSourceYear(e.target.value);
                      setSelectedStudentIds([]);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono text-slate-800"
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                  </select>
                </div>
              </div>

              {/* Student Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700">
                    Available Candidates ({availableSourceStudents.length}):
                  </span>
                  {availableSourceStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllImport}
                      className="text-teal-700 hover:text-teal-900 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {selectedStudentIds.length === availableSourceStudents.length ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span>Select All</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {availableSourceStudents.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded border border-slate-200 text-slate-400">
                    No new candidates found for this source selection (or all already enrolled).
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {availableSourceStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50/60' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedStudentIds((prev) =>
                                e.target.checked
                                  ? [...prev, s.id]
                                  : prev.filter((id) => id !== s.id)
                              );
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {s.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              Reg: {s.registrationNo} &bull; Father: {s.fatherName} &bull; Roll: {s.rollNo}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0}
                  onClick={handleImportSelected}
                  className="px-4 py-2 bg-[#0f766e] hover:bg-teal-800 disabled:opacity-40 text-white font-medium rounded transition-colors shadow-2xs cursor-pointer"
                >
                  Add Selected ({selectedStudentIds.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
