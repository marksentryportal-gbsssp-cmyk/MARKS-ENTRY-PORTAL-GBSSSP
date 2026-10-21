import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import { htmlInputToDateStr, dateStrToHtmlInput } from '../../utils/dateUtils';

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
  const { updateStudent, addToast } = usePortal();

  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [section, setSection] = useState('A');
  const [rollNo, setRollNo] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setFatherName(student.fatherName);
      setMotherName(student.motherName || '');
      setRegistrationNo(student.registrationNo);
      setDobInput(dateStrToHtmlInput(student.dob));
      setGender(student.gender);
      setSection(student.section || 'A');
      setRollNo(student.rollNo || '');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fatherName.trim()) {
      addToast('Name and Father Name are required', 'error');
      return;
    }

    updateStudent(student.id, {
      name: name.trim().toUpperCase(),
      fatherName: fatherName.trim().toUpperCase(),
      motherName: motherName.trim() ? motherName.trim().toUpperCase() : undefined,
      registrationNo: registrationNo.trim(),
      dob: htmlInputToDateStr(dobInput),
      gender,
      section: section.trim() || 'A',
      rollNo: rollNo.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-[#0f766e]" />
            <h3 className="font-bold text-slate-800 text-sm">
              Edit Student Details
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

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Registration Number:
            </label>
            <input
              type="text"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Student Full Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium uppercase text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Father&apos;s Name:
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded uppercase text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Mother&apos;s Name:
              </label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded uppercase text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Date of Birth:
              </label>
              <input
                type="date"
                value={dobInput}
                onChange={(e) => setDobInput(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Gender:
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Roll No:
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
          </div>

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
              Update Student Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
