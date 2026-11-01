import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  BookOpen,
  Calendar,
  Layers,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';

export const RecycleBinPage: React.FC = () => {
  const {
    students,
    classes,
    currentUser,
    restoreStudent,
    getStudentExamCountWithMarks,
    addToast,
  } = usePortal();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  // Soft-deleted students
  const deletedStudents = useMemo(() => {
    return students.filter((s) => s.deleted === true);
  }, [students]);

  // Active students
  const activeStudents = useMemo(() => {
    return students.filter((s) => !s.deleted && s.active !== false);
  }, [students]);

  // Filtered deleted list
  const filteredList = useMemo(() => {
    return deletedStudents.filter((s) => {
      if (selectedClassFilter !== 'all' && s.classId !== selectedClassFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = (s.name || s.studentName || '').toLowerCase().includes(query);
        const matchesRoll = (s.rollNo || '').toLowerCase().includes(query);
        const matchesFather = (s.fatherName || '').toLowerCase().includes(query);
        const matchesReg = (s.registrationNo || '').toLowerCase().includes(query);
        if (!matchesName && !matchesRoll && !matchesFather && !matchesReg) return false;
      }
      return true;
    });
  }, [deletedStudents, selectedClassFilter, searchTerm]);

  // Handle Restore Action
  const handleRestore = async (student: Student) => {
    if (
      !window.confirm(
        `Are you sure you want to restore ${student.name} (Class ${
          classes.find((c) => c.id === student.classId)?.name || student.classId
        }, Section ${student.section || 'A'}) to the active student roster?`
      )
    ) {
      return;
    }

    setIsRestoringId(student.id);
    const res = await restoreStudent(student.id);
    setIsRestoringId(null);

    if (res.success) {
      addToast(
        `Student "${student.name}" has been successfully restored to the active roster and synchronized with Cloud Firestore.`,
        'success'
      );
    } else {
      addToast(res.error || 'Failed to restore student from Cloud Firestore.', 'error');
    }
  };

  const isAdminOrSuperAdmin =
    currentUser?.role === 'admin' || (currentUser as any)?.role === 'super_admin';

  if (!isAdminOrSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
        <div className="p-3 bg-red-50 text-red-700 inline-block rounded-full border border-red-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-600">
          The Recycle Bin & Deleted Students management section is restricted to Super Administrators and Examination Incharges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Recycle Bin & Deleted Students
                </h1>
                <span className="bg-amber-100 text-amber-900 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border border-amber-300">
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Soft-deleted student records are safely archived here. All historical marks, results, and evaluations remain preserved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
              Total In Bin: <strong>{deletedStudents.length}</strong>
            </span>
          </div>
        </div>

        {/* Cloud & Local Reconciliation Card (Task 13) */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Cloud & Local Records Reconciliation</span>
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold">
              Non-Destructive Safe State
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Existing records in Cloud Firestore are preserved. When a student is soft-deleted, their document in Firestore receives
            <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] mx-1">deleted: true</code>,
            along with timestamp and administrator identity, without deleting historical marks or results.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Active Roster</span>
              <span className="text-sm font-bold text-teal-700 font-mono">{activeStudents.length}</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">In Recycle Bin</span>
              <span className="text-sm font-bold text-amber-700 font-mono">{deletedStudents.length}</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Classes</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{classes.length}</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Sync Mode</span>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cloud Synced</span>
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, roll or father..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:outline-teal-600 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Class Filter:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-teal-600"
            >
              <option value="all">All Classes ({deletedStudents.length})</option>
              {classes.map((cls) => {
                const count = deletedStudents.filter((s) => s.classId === cls.id).length;
                return (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Deleted Students Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Soft-Deleted Students Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || selectedClassFilter !== 'all'
                ? 'No deleted students match your search or filter criteria.'
                : 'All enrolled students are currently active in their respective class rosters. No records are in the Recycle Bin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-3">Class & Section</th>
                  <th className="py-3 px-3">Academic Session</th>
                  <th className="py-3 px-3">Deletion Audit Details</th>
                  <th className="py-3 px-3 text-center">Preserved Marks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.map((st) => {
                  const className = classes.find((c) => c.id === st.classId)?.name || st.classId;
                  const marksCount = getStudentExamCountWithMarks(st.id);
                  const isRestoring = isRestoringId === st.id;

                  return (
                    <tr key={st.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Father: <span className="font-medium text-slate-700">{st.fatherName}</span>
                          {st.rollNo && (
                            <span className="ml-2 font-mono bg-slate-200 px-1 py-0.2 rounded text-[10px] text-slate-800">
                              Roll: {st.rollNo}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">Class {className}</div>
                        <div className="text-[11px] text-slate-500">Sec: {st.section || 'A'}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-700">{st.academicYear}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px]">
                            {st.deletedAt ? new Date(st.deletedAt).toLocaleString('en-IN') : 'Previously removed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>By: {st.deletedBy || 'Administrator'}</span>
                          {st.deleteReason && <span className="italic">({st.deleteReason})</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <FileSpreadsheet className="w-3 h-3 text-teal-600" />
                          <span>{marksCount} exam(s)</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => handleRestore(st)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded shadow-xs text-xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Restore student to active roster and clear deleted status in Cloud Firestore"
                        >
                          {isRestoring ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Restoring...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore Student</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
