import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Check,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
} from 'lucide-react';
import { Student, ClassInfo, ExamRecord } from '../../types';
import {
  validateStudentName,
  validateParentName,
  validateCurrentAddress,
  parseAndValidateDob,
  normaliseGender,
  findDuplicateStudent,
} from '../../utils/studentValidator';
import { getNextRollNo, parseNumericRollNo } from '../../utils/rollNoUtils';

export interface StudentFormData {
  name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  classId: string;
  section: string;
  rollNo: string;
  fatherName: string;
  motherName: string;
  currentAddress: string;
  registrationNo: string;
  admissionNo: string;
}

interface StudentAdmissionFormProps {
  initialData?: Partial<StudentFormData>;
  targetClassId: string;
  targetAcademicYear: string;
  classes: ClassInfo[];
  students: Student[];
  classExams: ExamRecord[];
  isEditMode?: boolean;
  studentId?: string;
  onSave: (data: StudentFormData, addAnother?: boolean) => void;
  onCancel: () => void;
  generateNextRegNo: () => string;
}

export const StudentAdmissionForm: React.FC<StudentAdmissionFormProps> = ({
  initialData,
  targetClassId,
  targetAcademicYear,
  classes,
  students,
  classExams,
  isEditMode = false,
  studentId,
  onSave,
  onCancel,
  generateNextRegNo,
}) => {
  // Field values
  const [name, setName] = useState(initialData?.name || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(initialData?.gender || 'Male');
  const [classId, setClassId] = useState(initialData?.classId || targetClassId);
  const [allowChangeClass, setAllowChangeClass] = useState(false);
  const [section, setSection] = useState(initialData?.section || 'A');
  const [customSections, setCustomSections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [rollNo, setRollNo] = useState(initialData?.rollNo || '');
  const [isAutoRoll, setIsAutoRoll] = useState(!initialData?.rollNo);
  const [fatherName, setFatherName] = useState(initialData?.fatherName || '');
  const [motherName, setMotherName] = useState(initialData?.motherName || '');
  const [currentAddress, setCurrentAddress] = useState(initialData?.currentAddress || '');
  const [registrationNo, setRegistrationNo] = useState(
    initialData?.registrationNo || (isEditMode ? '' : generateNextRegNo())
  );
  const [admissionNo, setAdmissionNo] = useState(initialData?.admissionNo || '');

  // Collapsible section E
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(
    Boolean(initialData?.registrationNo || initialData?.admissionNo)
  );

  // Errors & Warnings
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [confirmDuplicateOverride, setConfirmDuplicateOverride] = useState(false);

  // Refs for focusing first invalid field with preventScroll
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    dob: useRef<HTMLInputElement>(null),
    gender: useRef<HTMLSelectElement>(null),
    classId: useRef<HTMLSelectElement>(null),
    section: useRef<HTMLSelectElement>(null),
    rollNo: useRef<HTMLInputElement>(null),
    fatherName: useRef<HTMLInputElement>(null),
    motherName: useRef<HTMLInputElement>(null),
    currentAddress: useRef<HTMLTextAreaElement>(null),
  };

  const selectedClass = classes.find((c) => c.id === classId);
  const selectedClassOrder = selectedClass?.order;
  const selectedClassName = selectedClass?.name;

  // Auto-calculate next Roll No. when class or section changes in Add Mode
  useEffect(() => {
    if (!isEditMode && isAutoRoll) {
      const nextNum = getNextRollNo(students, classId, targetAcademicYear);
      setRollNo(String(nextNum));
    }
  }, [classId, section, students, targetAcademicYear, isEditMode, isAutoRoll]);

  // Live Validations
  const nameVal = validateStudentName(name);
  const dobVal = parseAndValidateDob(dob, selectedClassOrder, selectedClassName);
  const fatherVal = validateParentName(fatherName, true, "Father's Name");
  const motherVal = validateParentName(motherName, false, "Mother's Name");
  const addressVal = validateCurrentAddress(currentAddress);

  // Live Roll No. validation & duplicate check
  let rollError: string | undefined = undefined;
  if (!rollNo.trim()) {
    rollError = 'Roll No. is required';
  } else {
    const num = parseNumericRollNo(rollNo);
    if (num === null || num <= 0) {
      rollError = 'Roll No. must be a positive whole number';
    } else {
      const existingInClassSection = students.find(
        (s) =>
          s.classId === classId &&
          (s.section || 'A') === section &&
          s.academicYear === targetAcademicYear &&
          s.active !== false &&
          s.id !== studentId &&
          (s.rollNo || '').trim() === rollNo.trim()
      );
      if (existingInClassSection) {
        rollError = `Roll ${rollNo} is already assigned to ${existingInClassSection.name} in Sec ${section}`;
      }
    }
  }

  // Live Duplicate student check: (name + father + dob)
  useEffect(() => {
    if (name.trim() && fatherName.trim() && dob.trim() && dobVal.isValid) {
      const dup = findDuplicateStudent(
        { name, fatherName, dob: dobVal.dateStr, classId },
        students,
        studentId
      );
      if (dup.isDuplicate) {
        setDuplicateWarning(dup.message || 'Duplicate student found in this class.');
      } else {
        setDuplicateWarning(null);
        setConfirmDuplicateOverride(false);
      }
    } else {
      setDuplicateWarning(null);
      setConfirmDuplicateOverride(false);
    }
  }, [name, fatherName, dob, dobVal.isValid, dobVal.dateStr, classId, students, studentId]);

  const handleNameChange = (val: string) => {
    setName(val.toUpperCase());
    setTouched((prev) => ({ ...prev, name: true }));
  };

  const handleFatherChange = (val: string) => {
    setFatherName(val.toUpperCase());
    setTouched((prev) => ({ ...prev, fatherName: true }));
  };

  const handleMotherChange = (val: string) => {
    setMotherName(val.toUpperCase());
    setTouched((prev) => ({ ...prev, motherName: true }));
  };

  const handleAddCustomSection = () => {
    const sec = newSectionInput.trim().toUpperCase();
    if (sec && !customSections.includes(sec)) {
      setCustomSections((prev) => [...prev, sec]);
      setSection(sec);
    }
    setNewSectionInput('');
    setIsAddingSection(false);
  };

  const validateAllAndGetFirstError = (): string | null => {
    const allTouched: Record<string, boolean> = {
      name: true,
      dob: true,
      gender: true,
      classId: true,
      section: true,
      rollNo: true,
      fatherName: true,
      motherName: true,
      currentAddress: true,
    };
    setTouched(allTouched);

    if (!nameVal.isValid) {
      fieldRefs.name.current?.focus({ preventScroll: true });
      return nameVal.error || 'Invalid student name';
    }
    if (!dobVal.isValid) {
      fieldRefs.dob.current?.focus({ preventScroll: true });
      return dobVal.error || 'Invalid date of birth';
    }
    if (rollError) {
      fieldRefs.rollNo.current?.focus({ preventScroll: true });
      return rollError;
    }
    if (!fatherVal.isValid) {
      fieldRefs.fatherName.current?.focus({ preventScroll: true });
      return fatherVal.error || "Invalid father's name";
    }
    if (!motherVal.isValid) {
      fieldRefs.motherName.current?.focus({ preventScroll: true });
      return motherVal.error || "Invalid mother's name";
    }
    if (!addressVal.isValid) {
      fieldRefs.currentAddress.current?.focus({ preventScroll: true });
      return addressVal.error || 'Address exceeds 200 characters';
    }

    if (duplicateWarning && !confirmDuplicateOverride) {
      return 'Please confirm duplicate student record before saving.';
    }

    return null;
  };

  const handleSubmit = (addAnother = false) => {
    const error = validateAllAndGetFirstError();
    if (error) return;

    const payload: StudentFormData = {
      name: nameVal.normalized,
      dob: dobVal.dateStr,
      gender,
      classId,
      section,
      rollNo: rollNo.trim(),
      fatherName: fatherVal.normalized,
      motherName: motherVal.normalized,
      currentAddress: addressVal.normalized,
      registrationNo: registrationNo.trim(),
      admissionNo: admissionNo.trim(),
    };

    onSave(payload, addAnother);

    if (addAnother) {
      // Clear fields, keep class and section, increment roll number
      setName('');
      setDob('');
      setGender('Male');
      setFatherName('');
      setMotherName('');
      setCurrentAddress('');
      setAdmissionNo('');
      setRegistrationNo(generateNextRegNo());
      setTouched({});
      setDuplicateWarning(null);
      setConfirmDuplicateOverride(false);

      const nextNum = (parseNumericRollNo(rollNo) || 0) + 1;
      setRollNo(String(nextNum));
      setIsAutoRoll(true);

      setTimeout(() => {
        fieldRefs.name.current?.focus({ preventScroll: true });
      }, 50);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(false);
      }}
      className="space-y-4 text-xs"
    >
      {/* SECTION A: Student Details */}
      <div className="space-y-3">
        <div className="border-l-4 border-[#0f766e] bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase rounded-r flex items-center justify-between">
          <span>Section A &bull; Student Details</span>
          <span className="text-[10px] text-slate-500 font-normal lowercase">Basic Identity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-1">
          {/* Student Full Name */}
          <div className="sm:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Student Full Name <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                As per school records / birth certificate
              </span>
            </div>
            <input
              ref={fieldRefs.name}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              placeholder="e.g. PRANAB JYOTI KALITA"
              className={`w-full px-3 py-2 border rounded-md uppercase font-medium transition-all ${
                touched.name && !nameVal.isValid
                  ? 'border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                  : 'border-slate-300 bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20'
              }`}
            />
            {touched.name && !nameVal.isValid && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{nameVal.error}</span>
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Format: 13-12-2021</span>
            </div>
            <input
              ref={fieldRefs.dob}
              type="text"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                setTouched((p) => ({ ...p, dob: true }));
              }}
              onBlur={() => setTouched((p) => ({ ...p, dob: true }))}
              placeholder="dd-mm-yyyy (e.g. 15-08-2011)"
              className={`w-full px-3 py-2 border rounded-md font-mono transition-all ${
                touched.dob && !dobVal.isValid
                  ? 'border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                  : 'border-slate-300 bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20'
              }`}
            />
            {touched.dob && !dobVal.isValid && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{dobVal.error}</span>
              </p>
            )}
            {dobVal.isValid && dobVal.warning && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-start gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{dobVal.warning}</span>
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              ref={fieldRefs.gender}
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION B: Class Details */}
      <div className="space-y-3 pt-1">
        <div className="border-l-4 border-[#0f766e] bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase rounded-r flex items-center justify-between">
          <span>Section B &bull; Class &amp; Roster Details</span>
          <span className="text-[10px] text-slate-500 font-normal lowercase">Enrollment</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 px-1">
          {/* Class */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Class <span className="text-red-500">*</span>
              </label>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setAllowChangeClass(!allowChangeClass)}
                  className="text-[10px] text-teal-800 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                  title="Toggle changing class"
                >
                  {allowChangeClass ? (
                    <>
                      <Unlock className="w-2.5 h-2.5 text-amber-600" />
                      <span>Unlocked</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Change class</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <select
              ref={fieldRefs.classId}
              value={classId}
              disabled={!allowChangeClass && !isEditMode}
              onChange={(e) => setClassId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-xs transition-all ${
                !allowChangeClass && !isEditMode
                  ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-900 border-slate-300 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20'
              }`}
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Section <span className="text-red-500">*</span>
              </label>
              {!isAddingSection && (
                <button
                  type="button"
                  onClick={() => setIsAddingSection(true)}
                  className="text-[10px] text-teal-800 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>New sec</span>
                </button>
              )}
            </div>

            {isAddingSection ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={5}
                  value={newSectionInput}
                  onChange={(e) => setNewSectionInput(e.target.value.toUpperCase())}
                  placeholder="e.g. E"
                  className="w-full px-2 py-1.5 border border-teal-500 rounded text-xs uppercase"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomSection}
                  className="px-2 py-1.5 bg-[#0f766e] text-white rounded text-xs font-bold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="px-1.5 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select
                ref={fieldRefs.section}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20"
              >
                {customSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Roll No */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Roll No.</span> <span className="text-red-500">*</span>
                {isAutoRoll && !isEditMode && (
                  <span className="text-[9px] bg-teal-100 text-[#0f766e] font-bold px-1.5 py-0.2 rounded-full border border-teal-200">
                    Auto
                  </span>
                )}
              </label>
            </div>
            <input
              ref={fieldRefs.rollNo}
              type="text"
              value={rollNo}
              onChange={(e) => {
                setRollNo(e.target.value);
                setIsAutoRoll(false);
                setTouched((p) => ({ ...p, rollNo: true }));
              }}
              onBlur={() => setTouched((p) => ({ ...p, rollNo: true }))}
              placeholder="e.g. 1"
              className={`w-full px-3 py-2 border rounded-md font-mono font-bold text-center transition-all ${
                touched.rollNo && rollError
                  ? 'border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                  : 'border-slate-300 bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20'
              }`}
            />
            {touched.rollNo && rollError && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{rollError}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION C: Parent / Guardian Details */}
      <div className="space-y-3 pt-1">
        <div className="border-l-4 border-[#0f766e] bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase rounded-r flex items-center justify-between">
          <span>Section C &bull; Parent / Guardian Details</span>
          <span className="text-[10px] text-slate-500 font-normal lowercase">Parentage</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-1">
          {/* Father's Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Father&apos;s Full Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={fieldRefs.fatherName}
              type="text"
              value={fatherName}
              onChange={(e) => handleFatherChange(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, fatherName: true }))}
              placeholder="e.g. BHABESH KALITA"
              className={`w-full px-3 py-2 border rounded-md uppercase font-medium transition-all ${
                touched.fatherName && !fatherVal.isValid
                  ? 'border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                  : 'border-slate-300 bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20'
              }`}
            />
            {touched.fatherName && !fatherVal.isValid && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fatherVal.error}</span>
              </p>
            )}
          </div>

          {/* Mother's Name */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Mother&apos;s Full Name</label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <input
              ref={fieldRefs.motherName}
              type="text"
              value={motherName}
              onChange={(e) => handleMotherChange(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, motherName: true }))}
              placeholder="e.g. RUNU KALITA"
              className="w-full px-3 py-2 border border-slate-300 rounded-md uppercase font-medium bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20"
            />
            {touched.motherName && motherVal.warning && (
              <p className="text-[10px] text-slate-500 italic mt-0.5">{motherVal.warning}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION D: Address */}
      <div className="space-y-3 pt-1">
        <div className="border-l-4 border-[#0f766e] bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase rounded-r flex items-center justify-between">
          <span>Section D &bull; Address</span>
          <span className="text-[10px] text-slate-500 font-normal lowercase">Residential</span>
        </div>

        <div className="px-1 space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700">Current Address</label>
            <span
              className={`text-[10px] font-mono ${
                currentAddress.length > 200 ? 'text-red-600 font-bold' : 'text-slate-400'
              }`}
            >
              {currentAddress.length}/200 chars
            </span>
          </div>
          <textarea
            ref={fieldRefs.currentAddress}
            rows={2}
            value={currentAddress}
            maxLength={250}
            onChange={(e) => {
              setCurrentAddress(e.target.value);
              setTouched((p) => ({ ...p, currentAddress: true }));
            }}
            placeholder="e.g. Vill: Paglahat, P.O: Paglahat, Dist: Dhubri, Assam - 783334"
            className={`w-full px-3 py-2 border rounded-md text-xs transition-all ${
              touched.currentAddress && !addressVal.isValid
                ? 'border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
                : 'border-slate-300 bg-white text-slate-900 focus:border-[#0f766e] focus:ring-2 focus:ring-teal-500/20'
            }`}
          />
          {touched.currentAddress && !addressVal.isValid && (
            <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{addressVal.error}</span>
            </p>
          )}
          {touched.currentAddress && addressVal.warning && !currentAddress && (
            <p className="text-[10px] text-slate-500 italic">{addressVal.warning}</p>
          )}
        </div>
      </div>

      {/* SECTION E: Additional Details (Collapsed by default) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsAdditionalOpen(!isAdditionalOpen)}
          className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 transition-colors font-semibold text-xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>Section E &bull; Additional Details (Optional)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Registration &amp; Admission Numbers
            </span>
          </div>
          {isAdditionalOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isAdditionalOpen && (
          <div className="p-3.5 border border-t-0 border-slate-200 rounded-b-md bg-slate-50/40 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-in fade-in duration-150">
            {/* Registration No */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Registration Number</label>
                <button
                  type="button"
                  onClick={() => setRegistrationNo(generateNextRegNo())}
                  className="text-[10px] text-teal-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Generate Next</span>
                </button>
              </div>
              <input
                type="text"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="06/RP/1003/xxxxxx/26"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs bg-white text-slate-800"
              />
            </div>

            {/* Admission No */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Admission Number</label>
              <input
                type="text"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                placeholder="e.g. ADM-2026-0901"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs bg-white text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Warning Dialog / Confirmation Banner */}
      {duplicateWarning && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block font-bold">Possible Duplicate Student Detected:</strong>
              <p className="text-[11px] text-amber-800 leading-snug">{duplicateWarning}</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-amber-950 cursor-pointer pt-1 border-t border-amber-200">
            <input
              type="checkbox"
              checked={confirmDuplicateOverride}
              onChange={(e) => setConfirmDuplicateOverride(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>I confirm this is a separate candidate with identical parent/name records</span>
          </label>
        </div>
      )}

      {/* Auto-enrollment notice banner */}
      <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded text-[11px] text-teal-900">
        <div className="flex items-center gap-1.5 font-semibold text-teal-950">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>Auto-Enrollment in Class Examinations:</span>
        </div>
        <p className="mt-0.5 text-[10px] text-teal-800 leading-relaxed">
          This student will be added to:{' '}
          {classExams.length > 0 ? (
            <strong>{classExams.map((e) => e.name).join(', ')}</strong>
          ) : (
            <strong>All active examinations of Class {selectedClassName} {targetAcademicYear}</strong>
          )}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {!isEditMode && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto px-4 py-2 border border-[#0f766e] bg-teal-50 hover:bg-teal-100 text-[#0f766e] font-bold rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              Save &amp; Add Another
            </button>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-[#0f766e] hover:bg-teal-800 text-white font-bold rounded-md transition-colors shadow-sm cursor-pointer"
          >
            {isEditMode ? 'Update Student Record' : 'Save & Enroll Student'}
          </button>
        </div>
      </div>
    </form>
  );
};
