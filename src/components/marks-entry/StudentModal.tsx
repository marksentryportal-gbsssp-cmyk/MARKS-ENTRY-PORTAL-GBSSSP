import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { htmlInputToDateStr } from '../../utils/dateUtils';

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
    createStudent,
    importStudentsFromClass,
    generateNextRegNo,
    addToast,
    getStudentsForExam,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<'new' | 'import'>('new');

  // Tab A: Add New Student State
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [registrationNo, setRegistrationNo] = useState(() => generateNextRegNo());
  const [dobInput, setDobInput] = useState('2011-05-15'); // yyyy-mm-dd
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [section, setSection] = useState('A');
  const [rollNo, setRollNo] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');

  // Tab B: Import From Previous Exam / Class
  const [sourceClassId, setSourceClassId] = useState(targetClassId);
  const [sourceYear, setSourceYear] = useState('2025-2026');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Tab A submit handler
  const handleAddNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fatherName.trim() || !dobInput) {
      addToast('Please fill in required fields (Name, Father Name, DOB)', 'error');
      return;
    }

    createStudent(
      {
        registrationNo: registrationNo.trim() || generateNextRegNo(),
        name: name.trim().toUpperCase(),
        fatherName: fatherName.trim().toUpperCase(),
        motherName: motherName.trim() ? motherName.trim().toUpperCase() : undefined,
        dob: htmlInputToDateStr(dobInput),
        gender,
        classId: targetClassId,
        section: section.trim() || 'A',
        rollNo: rollNo.trim() || '01',
        academicYear: targetAcademicYear,
        admissionNo: admissionNo.trim() || undefined,
        active: true,
      },
      targetExamId
    );

    // Reset and close
    setName('');
    setFatherName('');
    setMotherName('');
    setRollNo('');
    setAdmissionNo('');
    setRegistrationNo(generateNextRegNo());
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#0f766e]" />
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              Add Student to Examination
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs: 2 clean tabs (Bulk Import is now beside Add Student button on main page) */}
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
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
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {/* TAB A: Add New Student Form */}
          {activeTab === 'new' && (
            <form onSubmit={handleAddNewStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Registration No */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Registration No. (Optional):
                    </label>
                    <button
                      type="button"
                      onClick={() => setRegistrationNo(generateNextRegNo())}
                      className="text-[11px] text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Next</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    placeholder="e.g. 06/RP/1003/637675/26"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>

                {/* Admission No */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Admission No. (Optional):
                  </label>
                  <input
                    type="text"
                    value={admissionNo}
                    onChange={(e) => setAdmissionNo(e.target.value)}
                    placeholder="e.g. ADM-2026-0914"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>

                {/* Student Name */}
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Student Full Name <span className="text-red-600">*</span>:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ENTER FULL NAME IN BLOCK LETTERS"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded uppercase font-medium text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>

                {/* Father's Name */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Father&apos;s Name <span className="text-red-600">*</span>:
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="ENTER FATHER'S FULL NAME"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded uppercase font-medium text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>

                {/* Mother's Name */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mother&apos;s Name:
                  </label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="ENTER MOTHER'S FULL NAME"
                    className="w-full px-3 py-2 border border-slate-300 rounded uppercase font-medium text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>

                {/* DOB */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Date of Birth (DOB) <span className="text-red-600">*</span>:
                  </label>
                  <input
                    type="date"
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Format: {htmlInputToDateStr(dobInput)}
                  </span>
                </div>

                {/* Gender */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Gender:
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Section:
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs uppercase font-mono focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>

                {/* Roll No */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Roll No.:
                  </label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. 13"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f766e] hover:bg-teal-800 text-white font-medium rounded transition-colors shadow-2xs"
                >
                  Save &amp; Enroll Student
                </button>
              </div>
            </form>
          )}

          {/* TAB B: Import From Previous Exam / Class */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-slate-500 leading-relaxed">
                Use this to quickly transfer, re-admit, or promote candidates from an earlier academic session or previous class into this exam.
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
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
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
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
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
                      className="text-teal-700 hover:text-teal-900 font-semibold text-[11px] flex items-center gap-1"
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
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0}
                  onClick={handleImportSelected}
                  className="px-4 py-2 bg-[#0f766e] hover:bg-teal-800 disabled:opacity-40 text-white font-medium rounded transition-colors shadow-2xs"
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
