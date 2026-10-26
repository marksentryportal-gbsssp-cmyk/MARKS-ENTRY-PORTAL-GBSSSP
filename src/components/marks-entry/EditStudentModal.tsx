import React from 'react';
import { X, Edit2 } from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import { StudentAdmissionForm, StudentFormData } from './StudentAdmissionForm';

interface EditStudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const { classes, students, exams, updateStudent, generateNextRegNo } = usePortal();

  if (!isOpen || !student) return null;

  const classExams = exams.filter(
    (e) => e.classId === student.classId && e.academicYear === student.academicYear
  );

  const initialFormData: Partial<StudentFormData> = {
    name: student.studentName || student.name || '',
    dob: student.dob || '',
    gender: student.gender || 'Male',
    classId: student.classId,
    section: student.section || 'A',
    rollNo: student.rollNo || '',
    fatherName: student.fatherName || '',
    motherName: student.motherName || '',
    currentAddress: student.currentAddress || '',
    registrationNo: student.registrationNo || '',
    admissionNo: student.admissionNo || '',
  };

  const handleUpdateSave = (data: StudentFormData) => {
    updateStudent(student.id, {
      name: data.name.trim().toUpperCase(),
      studentName: data.name.trim().toUpperCase(),
      fatherName: data.fatherName.trim().toUpperCase(),
      motherName: data.motherName.trim() ? data.motherName.trim().toUpperCase() : undefined,
      dob: data.dob.trim(),
      gender: data.gender,
      classId: data.classId,
      section: data.section.trim().toUpperCase() || 'A',
      rollNo: data.rollNo.trim(),
      currentAddress: data.currentAddress.trim(),
      registrationNo: data.registrationNo.trim(),
      admissionNo: data.admissionNo.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-[760px] w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90">
          <div>
            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#0f766e]" />
              <h3 className="font-bold text-slate-800 text-base">
                Update Student Details
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

        {/* Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs">
          <StudentAdmissionForm
            initialData={initialFormData}
            targetClassId={student.classId}
            targetAcademicYear={student.academicYear}
            classes={classes}
            students={students}
            classExams={classExams}
            isEditMode={true}
            studentId={student.id}
            onSave={handleUpdateSave}
            onCancel={onClose}
            generateNextRegNo={generateNextRegNo}
          />
        </div>
      </div>
    </div>
  );
};
