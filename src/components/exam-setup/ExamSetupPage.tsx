import React, { useState, useRef, useMemo } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  RotateCcw,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
  Check,
  X,
  RefreshCw,
  Search
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { ExamType, ExamRecord } from '../../types';
import {
  htmlInputToDateStr,
  dateStrToHtmlInput,
  getCurrentAcademicYear,
  getExamStatus,
} from '../../utils/dateUtils';

export const ExamSetupPage: React.FC = () => {
  const {
    classes,
    examTypes,
    addExamType,
    updateExamType,
    deleteExamType,
    reorderExamTypes,
    exams,
    createExamsBatch,
    updateExam,
    deleteExam,
    toggleExamFinalSubmit,
    exportBackup,
    importBackup,
    resetToDefaultData,
    addToast,
  } = usePortal();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // Section A: Exam Types state & handlers
  // -------------------------------------------------------------
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeShortName, setEditTypeShortName] = useState('');
  const [editTypeMaxMarks, setEditTypeMaxMarks] = useState(100);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeShortName, setNewTypeShortName] = useState('');
  const [newTypeMaxMarks, setNewTypeMaxMarks] = useState(100);
  const [showAddTypeForm, setShowAddTypeForm] = useState(false);

  const handleStartEditType = (type: ExamType) => {
    setEditingTypeId(type.id);
    setEditTypeName(type.name);
    setEditTypeShortName(type.shortName);
    setEditTypeMaxMarks(type.maxMarksDefault);
  };

  const handleSaveEditType = (id: string) => {
    if (!editTypeName.trim()) return;
    updateExamType(id, {
      name: editTypeName.trim(),
      shortName: editTypeShortName.trim() || editTypeName.trim(),
      maxMarksDefault: Number(editTypeMaxMarks) || 100,
    });
    setEditingTypeId(null);
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    addExamType(
      newTypeName.trim(),
      newTypeShortName.trim() || newTypeName.trim(),
      Number(newTypeMaxMarks) || 100
    );
    setNewTypeName('');
    setNewTypeShortName('');
    setNewTypeMaxMarks(100);
    setShowAddTypeForm(false);
  };

  const handleMoveType = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= examTypes.length) return;
    const reordered = [...examTypes];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    reorderExamTypes(reordered);
  };

  // -------------------------------------------------------------
  // Section B: Create Exams state & handlers
  // -------------------------------------------------------------
  const defaultYear = getCurrentAcademicYear();
  const [createAcademicYear, setCreateAcademicYear] = useState(defaultYear);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    classes.map((c) => c.id)
  );
  const [selectedExamTypeIds, setSelectedExamTypeIds] = useState<string[]>(
    examTypes.map((t) => t.id)
  );
  const [startDateInput, setStartDateInput] = useState('2026-09-01'); // yyyy-mm-dd for input
  const [endDateInput, setEndDateInput] = useState('2026-12-30');

  const handleToggleSelectAllClasses = () => {
    if (selectedClassIds.length === classes.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map((c) => c.id));
    }
  };

  const handleToggleSelectAllExamTypes = () => {
    if (selectedExamTypeIds.length === examTypes.length) {
      setSelectedExamTypeIds([]);
    } else {
      setSelectedExamTypeIds(examTypes.map((t) => t.id));
    }
  };

  const handleGenerateExams = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      addToast('Please select at least one class', 'error');
      return;
    }
    if (selectedExamTypeIds.length === 0) {
      addToast('Please select at least one exam type', 'error');
      return;
    }

    const startFormatted = htmlInputToDateStr(startDateInput);
    const endFormatted = htmlInputToDateStr(endDateInput);

    createExamsBatch(
      createAcademicYear,
      selectedClassIds,
      selectedExamTypeIds,
      startFormatted,
      endFormatted
    );
  };

  // -------------------------------------------------------------
  // Section C: Filterable All Exams Table & Edit Dates
  // -------------------------------------------------------------
  const [filterYear, setFilterYear] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterExamType, setFilterExamType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing exam dates
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editExamStart, setEditExamStart] = useState('');
  const [editExamEnd, setEditExamEnd] = useState('');

  const handleStartEditExam = (exam: ExamRecord) => {
    setEditingExamId(exam.id);
    setEditExamStart(dateStrToHtmlInput(exam.startDate));
    setEditExamEnd(dateStrToHtmlInput(exam.endDate));
  };

  const handleSaveEditExam = (id: string) => {
    updateExam(id, {
      startDate: htmlInputToDateStr(editExamStart),
      endDate: htmlInputToDateStr(editExamEnd),
    });
    setEditingExamId(null);
  };

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (filterYear !== 'all' && exam.academicYear !== filterYear) return false;
      if (filterClass !== 'all' && exam.classId !== filterClass) return false;
      if (filterExamType !== 'all' && exam.examTypeId !== filterExamType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          exam.name.toLowerCase().includes(query) ||
          exam.className.toLowerCase().includes(query) ||
          exam.academicYear.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [exams, filterYear, filterClass, filterExamType, searchQuery]);

  // Distinct academic years in existing records
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    set.add('2026-2027');
    set.add('2025-2026');
    set.add('2027-2028');
    exams.forEach((e) => set.add(e.academicYear));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [exams]);

  // File import handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          importBackup(content);
        }
      };
      reader.readAsText(file);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header bar with Export/Import Backup */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[#0f766e] font-bold text-lg md:text-xl tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0f766e]" />
            <span>Examination Master Setup & Administration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure examination types, bulk generate class schedules, and manage status
          </p>
        </div>

        {/* Backup & Restore Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 transition-colors cursor-pointer"
            title="Download full JSON backup of classes and exams"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 transition-colors cursor-pointer"
            title="Import JSON backup to restore database"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Import Backup</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all classes and examinations to original demo seed data?')) {
                resetToDefaultData();
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs rounded-md border border-transparent transition-colors"
            title="Reset data store to original defaults"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION A: Exam Types */}
      <section
        aria-labelledby="exam-types-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h3
              id="exam-types-heading"
              className="text-[#0f766e] font-bold text-base tracking-tight"
            >
              Section A: Exam Types
            </h3>
            <p className="text-xs text-slate-500">
              Manage evaluations and term examination definitions
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddTypeForm(!showAddTypeForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Exam Type</span>
          </button>
        </div>

        {/* Add Type Form Dropdown */}
        {showAddTypeForm && (
          <form
            onSubmit={handleCreateType}
            className="mb-4 p-4 rounded-lg bg-purple-50/60 border border-purple-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label className="font-semibold block mb-1 text-slate-700">
                Exam Full Name:
              </label>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Unit Test I"
                required
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">
                Short Name:
              </label>
              <input
                type="text"
                value={newTypeShortName}
                onChange={(e) => setNewTypeShortName(e.target.value)}
                placeholder="e.g. UT-1"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">
                Default Max Marks:
              </label>
              <input
                type="number"
                value={newTypeMaxMarks}
                onChange={(e) => setNewTypeMaxMarks(Number(e.target.value))}
                min={10}
                max={200}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#9333ea] text-white rounded font-medium hover:bg-[#7e22ce] transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowAddTypeForm(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Exam Types Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3 border-r border-slate-200 w-16 text-center">
                  Order
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Exam Type Name
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Short Code
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">
                  Default Max Marks
                </th>
                <th className="py-2.5 px-3 text-center w-36">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {examTypes.map((type, idx) => {
                const isEditing = editingTypeId === type.id;

                if (isEditing) {
                  return (
                    <tr key={type.id} className="bg-teal-50/50">
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={editTypeName}
                          onChange={(e) => setEditTypeName(e.target.value)}
                          className="w-full px-2 py-1 border border-teal-400 rounded bg-white text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={editTypeShortName}
                          onChange={(e) => setEditTypeShortName(e.target.value)}
                          className="w-full px-2 py-1 border border-teal-400 rounded bg-white text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">
                        <input
                          type="number"
                          value={editTypeMaxMarks}
                          onChange={(e) => setEditTypeMaxMarks(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-teal-400 rounded bg-white text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEditType(type.id)}
                            className="p-1 text-teal-700 hover:bg-teal-100 rounded"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTypeId(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveType(idx, 'up')}
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === examTypes.length - 1}
                          onClick={() => handleMoveType(idx, 'down')}
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">
                      {type.name}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                      {type.shortName}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-semibold text-slate-800">
                      {type.maxMarksDefault}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditType(type)}
                          className="text-slate-500 hover:text-teal-700 p-1 rounded hover:bg-slate-100"
                          title="Rename / Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete exam type "${type.name}"?`)) {
                              deleteExamType(type.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title="Delete type"
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
      </section>

      {/* SECTION B: Create Exams (Bulk generator) */}
      <section
        aria-labelledby="create-exams-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        <div className="border-b border-slate-200 pb-3 mb-4">
          <h3
            id="create-exams-heading"
            className="text-[#0f766e] font-bold text-base tracking-tight"
          >
            Section B: Create Exams (Bulk Generator)
          </h3>
          <p className="text-xs text-slate-500">
            Generate exam schedules by combining academic year, selected classes, and examination types
          </p>
        </div>

        <form onSubmit={handleGenerateExams} className="space-y-4 text-xs">
          {/* Row 1: Academic Year & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Academic Year:
              </label>
              <select
                value={createAcademicYear}
                onChange={(e) => setCreateAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
              >
                <option value="2026-2027">2026-2027 (Current)</option>
                <option value="2027-2028">2027-2028 (Next Session)</option>
                <option value="2025-2026">2025-2026 (Previous Session)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Start Date (dd-mm-yyyy):
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-mono text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Formatted: {htmlInputToDateStr(startDateInput)}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                End Date (dd-mm-yyyy):
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-mono text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Formatted: {htmlInputToDateStr(endDateInput)}
              </span>
            </div>
          </div>

          {/* Row 2: Classes Multi-Select */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700">
                Select Classes ({selectedClassIds.length} of {classes.length} selected):
              </label>
              <button
                type="button"
                onClick={handleToggleSelectAllClasses}
                className="text-teal-700 hover:text-teal-900 font-semibold hover:underline flex items-center gap-1"
              >
                {selectedClassIds.length === classes.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All Classes</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {classes.map((cls) => {
                const isChecked = selectedClassIds.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setSelectedClassIds((prev) =>
                        isChecked ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                      );
                    }}
                    className={`p-2 rounded border text-left flex items-center gap-2 transition-colors ${
                      isChecked
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'bg-[#0f766e] border-[#0f766e] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{cls.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Exam Types Multi-Select */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700">
                Select Exam Types ({selectedExamTypeIds.length} of {examTypes.length} selected):
              </label>
              <button
                type="button"
                onClick={handleToggleSelectAllExamTypes}
                className="text-teal-700 hover:text-teal-900 font-semibold hover:underline flex items-center gap-1"
              >
                {selectedExamTypeIds.length === examTypes.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All Types</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {examTypes.map((et) => {
                const isChecked = selectedExamTypeIds.includes(et.id);
                return (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => {
                      setSelectedExamTypeIds((prev) =>
                        isChecked ? prev.filter((id) => id !== et.id) : [...prev, et.id]
                      );
                    }}
                    className={`p-2.5 rounded border text-left flex items-center gap-2 transition-colors ${
                      isChecked
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'bg-[#0f766e] border-[#0f766e] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{et.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Naming Pattern preview & Generate Button */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
            <div className="text-[11px] text-slate-500 font-mono">
              Auto-naming format:{' '}
              <span className="font-semibold text-slate-800">
                CLASS &lt;CLASSNAME&gt; &lt;EXAM TYPE&gt; {createAcademicYear}
              </span>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#9333ea] hover:bg-[#7e22ce] text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                Generate Exams ({selectedClassIds.length * selectedExamTypeIds.length} Combinations)
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION C: All Exams Table with filters, edit dates, delete, toggle Final Submitted */}
      <section
        aria-labelledby="all-exams-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        <div className="border-b border-slate-200 pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3
              id="all-exams-heading"
              className="text-[#0f766e] font-bold text-base tracking-tight"
            >
              Section C: All Configured Examinations ({filteredExams.length} of {exams.length})
            </h3>
            <p className="text-xs text-slate-500">
              Review and adjust dates, toggle submission lockouts, or remove entries
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by exam name..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-600">
              Filter by Academic Year:
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700"
            >
              <option value="all">All Academic Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-600">
              Filter by Class:
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-600">
              Filter by Exam Type:
            </label>
            <select
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700"
            >
              <option value="all">All Exam Types</option>
              {examTypes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Exams Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Exam Name
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-center w-20">
                  Class
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-center w-24">
                  Session
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-center w-28">
                  Start Date
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-center w-28">
                  End Date
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-center w-36">
                  Submission Status
                </th>
                <th className="py-2.5 px-3 text-center w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No examination records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => {
                  const isEditingDates = editingExamId === exam.id;
                  const status = getExamStatus(
                    exam.startDate,
                    exam.endDate,
                    exam.isFinalSubmitted
                  );

                  return (
                    <tr
                      key={exam.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-800">
                        {exam.name}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-200 text-center font-medium text-slate-700">
                        {exam.className}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-200 text-center font-mono text-slate-600">
                        {exam.academicYear}
                      </td>

                      {/* Start Date */}
                      <td className="py-2.5 px-2.5 border-r border-slate-200 text-center font-mono text-slate-700">
                        {isEditingDates ? (
                          <input
                            type="date"
                            value={editExamStart}
                            onChange={(e) => setEditExamStart(e.target.value)}
                            className="px-1 py-0.5 border border-teal-500 rounded text-[11px]"
                          />
                        ) : (
                          exam.startDate
                        )}
                      </td>

                      {/* End Date */}
                      <td className="py-2.5 px-2.5 border-r border-slate-200 text-center font-mono text-slate-700">
                        {isEditingDates ? (
                          <input
                            type="date"
                            value={editExamEnd}
                            onChange={(e) => setEditExamEnd(e.target.value)}
                            className="px-1 py-0.5 border border-teal-500 rounded text-[11px]"
                          />
                        ) : (
                          exam.endDate
                        )}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="py-2.5 px-2.5 border-r border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExamFinalSubmit(exam.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            exam.isFinalSubmitted
                              ? 'bg-red-100 text-[#b91c1c] border border-red-300 hover:bg-red-200'
                              : status === 'Open'
                              ? 'bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Final Submitted / Open status"
                        >
                          {exam.isFinalSubmitted ? 'Final Submitted' : 'Open'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditingDates ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEditExam(exam.id)}
                                className="p-1 text-teal-700 hover:bg-teal-100 rounded"
                                title="Save date changes"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExamId(null)}
                                className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditExam(exam)}
                                className="p-1 text-slate-500 hover:text-teal-700 rounded hover:bg-slate-100"
                                title="Edit Start & End Dates"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete exam "${exam.name}"?`)) {
                                    deleteExam(exam.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-700 rounded hover:bg-red-50"
                                title="Delete Exam"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
