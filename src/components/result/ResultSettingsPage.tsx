import React, { useState } from 'react';
import {
  Settings,
  ArrowLeft,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  BookOpen,
  Award,
  FileText,
  Edit2,
  Calculator,
  Layers,
  HelpCircle,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Subject, GradeScaleItem, ExamGroup, SubjectExamComponentConfig } from '../../types';
import { defaultExamGroups } from '../../data/seedResultData';
import { calculateGrade } from '../../utils/resultCalculator';

export const ResultSettingsPage: React.FC = () => {
  const {
    classes,
    subjects,
    examTypes,
    resultSettings,
    updateResultSettings,
    resetResultSettingsToDefault,
    addSubject,
    updateSubject,
    deleteSubject,
    navigateTo,
    addToast,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<'weightage' | 'subjects' | 'grades' | 'policy'>('weightage');

  // Local state for exam groups
  const [localGroups, setLocalGroups] = useState<ExamGroup[]>(() => {
    return resultSettings.examGroups && resultSettings.examGroups.length > 0
      ? resultSettings.examGroups
      : defaultExamGroups;
  });

  // Local state for policy & print settings
  const [marksheetTitle, setMarksheetTitle] = useState(resultSettings.marksheetTitle);
  const [session, setSession] = useState(resultSettings.session);
  const [passPercent, setPassPercent] = useState(resultSettings.passPercent);
  const [principalName, setPrincipalName] = useState(resultSettings.principalName);
  const [teacherLabel, setTeacherLabel] = useState(resultSettings.classTeacherSignatureLabel);
  const [showRank, setShowRank] = useState(resultSettings.showRank);
  const [showAttendance, setShowAttendance] = useState(resultSettings.showAttendance);
  const [showRemarks, setShowRemarks] = useState(resultSettings.showRemarks);
  const [showAddress, setShowAddress] = useState(resultSettings.showAddress !== false);
  const [showWeightedBreakdown, setShowWeightedBreakdown] = useState(
    resultSettings.showWeightedBreakdown !== false
  );
  const [whoCanCancelFinalSubmit, setWhoCanCancelFinalSubmit] = useState<'admin_only' | 'admin_and_teachers'>(
    resultSettings.whoCanCancelFinalSubmit || 'admin_only'
  );
  const [blockPrintingUntilAnnualSubmitted, setBlockPrintingUntilAnnualSubmitted] = useState<boolean>(
    resultSettings.blockPrintingUntilAnnualSubmitted !== false
  );

  // Grade scale
  const [localGradeScale, setLocalGradeScale] = useState<GradeScaleItem[]>(
    resultSettings.gradeScale
  );

  // Subject management
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || 'nine');
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubFullMarks, setNewSubFullMarks] = useState(100);
  const [newSubPassMarks, setNewSubPassMarks] = useState(33);
  const [newSubType, setNewSubType] = useState<'marks' | 'grade'>('marks');
  const [newSubIncludeInTotal, setNewSubIncludeInTotal] = useState(true);
  const [newSubIsOptional, setNewSubIsOptional] = useState(false);
  const [newSubComponents, setNewSubComponents] = useState<
    Record<string, SubjectExamComponentConfig>
  >({});
  const [isCopyClassModalOpen, setIsCopyClassModalOpen] = useState(false);
  const [sourceCopyClassId, setSourceCopyClassId] = useState('nine');

  // Exam Group modal state (for creating or editing groups)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupPercentInput, setGroupPercentInput] = useState<number>(20);
  const [selectedExamTypeIds, setSelectedExamTypeIds] = useState<string[]>([]);

  // Test Calculator local state (matches prompt sample: 40/50, 35/50, 70/100, 80/100 -> 76/100)
  const [calcMarks, setCalcMarks] = useState<Record<string, number>>({
    'eval-1': 40,
    'eval-2': 35,
    'half-yearly': 70,
    annual: 80,
  });

  // Sum of weightages across all groups
  const weightageSum = localGroups.reduce((sum, g) => sum + Number(g.percent || 0), 0);
  const isWeightageValid = weightageSum === 100;

  // Handle group weightage percentage change directly from slider/input
  const handleGroupPercentChange = (groupId: string, val: number) => {
    setLocalGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, percent: Number(val) } : g))
    );
  };

  // Open modal to create a new group
  const handleOpenCreateGroup = () => {
    setEditingGroupId(null);
    setGroupNameInput('');
    setGroupPercentInput(0);
    setSelectedExamTypeIds([]);
    setIsGroupModalOpen(true);
  };

  // Open modal to edit an existing group
  const handleOpenEditGroup = (group: ExamGroup) => {
    setEditingGroupId(group.id);
    setGroupNameInput(group.name);
    setGroupPercentInput(group.percent);
    setSelectedExamTypeIds([...group.examTypeIds]);
    setIsGroupModalOpen(true);
  };

  // Delete an exam group
  const handleDeleteGroup = (groupId: string) => {
    if (localGroups.length <= 1) {
      addToast('At least one examination group is required', 'error');
      return;
    }
    if (confirm('Delete this examination group? Any unassigned exams will not contribute to final marks.')) {
      setLocalGroups((prev) => prev.filter((g) => g.id !== groupId));
      addToast('Exam group removed', 'info');
    }
  };

  // Save modal group
  const handleSaveGroupModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) {
      addToast('Please enter a group title', 'error');
      return;
    }
    if (selectedExamTypeIds.length === 0) {
      addToast('Please select at least one examination for this group', 'error');
      return;
    }

    if (editingGroupId) {
      // Update existing
      setLocalGroups((prev) =>
        prev.map((g) => {
          if (g.id === editingGroupId) {
            return {
              ...g,
              name: groupNameInput.trim(),
              percent: Number(groupPercentInput),
              examTypeIds: selectedExamTypeIds,
            };
          }
          // Remove selected exam types from other groups so there is no duplicate double-counting
          const filtered = g.examTypeIds.filter((id) => !selectedExamTypeIds.includes(id));
          return { ...g, examTypeIds: filtered };
        })
      );
      addToast(`Exam group "${groupNameInput}" updated successfully`, 'success');
    } else {
      // Create new
      const newGroup: ExamGroup = {
        id: `grp-${Date.now().toString().slice(-6)}`,
        name: groupNameInput.trim(),
        percent: Number(groupPercentInput),
        examTypeIds: selectedExamTypeIds,
      };

      // Remove newly selected exam types from other groups
      setLocalGroups((prev) => {
        const cleaned = prev.map((g) => ({
          ...g,
          examTypeIds: g.examTypeIds.filter((id) => !selectedExamTypeIds.includes(id)),
        }));
        return [...cleaned, newGroup];
      });
      addToast(`New exam group "${groupNameInput}" created`, 'success');
    }

    setIsGroupModalOpen(false);
  };

  // Save all settings
  const handleSaveAll = () => {
    if (!isWeightageValid) {
      addToast('Total exam weightage must equal 100%', 'error');
      return;
    }

    updateResultSettings({
      examGroups: localGroups,
      showWeightedBreakdown,
      gradeScale: localGradeScale,
      marksheetTitle,
      session,
      passPercent: Number(passPercent),
      principalName,
      classTeacherSignatureLabel: teacherLabel,
      showRank,
      showAttendance,
      showRemarks,
      showAddress,
      whoCanCancelFinalSubmit,
      blockPrintingUntilAnnualSubmitted,
    });
  };

  // Subject actions
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) {
      addToast('Subject name cannot be empty', 'error');
      return;
    }

    const currentClassSubjects = subjects.filter((s) => s.classId === selectedClassId);
    if (editingSubject) {
      updateSubject(editingSubject.id, {
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase() || undefined,
        fullMarks: Number(newSubFullMarks),
        passMarks: Number(newSubPassMarks),
        type: newSubType,
        includeInTotal: newSubIncludeInTotal,
        isOptional: newSubIsOptional,
        componentsByExamType: newSubComponents,
      });
      setEditingSubject(null);
    } else {
      addSubject({
        classId: selectedClassId,
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase() || undefined,
        fullMarks: Number(newSubFullMarks),
        passMarks: Number(newSubPassMarks),
        order: currentClassSubjects.length + 1,
        type: newSubType,
        includeInTotal: newSubIncludeInTotal,
        isOptional: newSubIsOptional,
        componentsByExamType: newSubComponents,
      });
    }

    setNewSubName('');
    setNewSubCode('');
    setIsAddSubjectModalOpen(false);
  };

  const handleEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setNewSubName(sub.name);
    setNewSubCode(sub.code || '');
    setNewSubFullMarks(sub.fullMarks);
    setNewSubPassMarks(sub.passMarks);
    setNewSubType(sub.type);
    setNewSubIncludeInTotal(sub.includeInTotal !== false);
    setNewSubIsOptional(Boolean(sub.isOptional));
    setNewSubComponents(sub.componentsByExamType || {});
    setIsAddSubjectModalOpen(true);
  };

  const handleMoveSubjectOrder = (subId: string, direction: 'up' | 'down') => {
    const list = [...subjects.filter((s) => s.classId === selectedClassId)].sort((a, b) => a.order - b.order);
    const idx = list.findIndex((s) => s.id === subId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const prev = list[idx - 1];
      updateSubject(subId, { order: prev.order });
      updateSubject(prev.id, { order: list[idx].order });
    } else if (direction === 'down' && idx < list.length - 1) {
      const next = list[idx + 1];
      updateSubject(subId, { order: next.order });
      updateSubject(next.id, { order: list[idx].order });
    }
  };

  const handleCopySubjectsFromClass = () => {
    const sourceSubjects = subjects.filter((s) => s.classId === sourceCopyClassId);
    if (sourceSubjects.length === 0) {
      addToast('Source class has no subjects to copy', 'error');
      return;
    }
    const currentClassSubs = subjects.filter((s) => s.classId === selectedClassId);
    sourceSubjects.forEach((s, idx) => {
      addSubject({
        classId: selectedClassId,
        name: s.name,
        code: s.code,
        fullMarks: s.fullMarks,
        passMarks: s.passMarks,
        order: currentClassSubs.length + idx + 1,
        type: s.type,
        includeInTotal: s.includeInTotal,
        isOptional: s.isOptional,
        componentsByExamType: s.componentsByExamType,
        components: s.components,
      });
    });
    setIsCopyClassModalOpen(false);
    addToast(`Copied ${sourceSubjects.length} subjects from ${sourceCopyClassId.toUpperCase()}`, 'success');
  };

  // Dynamic formula text generation from localGroups
  const dynamicFormulaText = (() => {
    const parts = localGroups.map((g) => {
      const examNames = g.examTypeIds
        .map((id) => {
          const et = examTypes.find((e) => e.id === id);
          return et?.name || id;
        })
        .filter(Boolean);

      if (examNames.length === 0) return `${g.name} x ${g.percent}%`;
      if (examNames.length === 1) return `${examNames[0]} x ${g.percent}%`;
      return `(${examNames.join(' + ')}) x ${g.percent}%`;
    });

    return `Standard Weightage Formula: ${parts.join(' + ')} = ${weightageSum}% Composite Score. Obtained marks of grouped exams are added first, then scaled to the group's weightage.`;
  })();

  // Live Test Calculator computations
  const testCalcResults = (() => {
    let compositeTotal = 0;
    const groupBreakdowns = localGroups.map((group) => {
      let groupObtained = 0;
      let groupMax = 0;
      const examsList = group.examTypeIds.map((id) => {
        const et = examTypes.find((e) => e.id === id);
        const max = et?.maxMarksDefault || 100;
        const mark = calcMarks[id] !== undefined ? Number(calcMarks[id]) : 0;
        groupObtained += mark;
        groupMax += max;
        return {
          id,
          name: et?.name || id,
          obtained: mark,
          max,
        };
      });

      const weightedScore = groupMax > 0 ? (groupObtained / groupMax) * group.percent : 0;
      const roundedWeighted = Math.round(weightedScore * 10) / 10;
      compositeTotal += roundedWeighted;

      return {
        group,
        examsList,
        groupObtained,
        groupMax,
        rawPercent: groupMax > 0 ? Math.round((groupObtained / groupMax) * 100) : 0,
        weightedScore: roundedWeighted,
      };
    });

    const roundedComposite = Math.round(compositeTotal * 10) / 10;
    const gradeInfo = calculateGrade(roundedComposite, localGradeScale);
    const isPassed = roundedComposite >= passPercent;

    return {
      groupBreakdowns,
      compositeTotal: roundedComposite,
      gradeInfo,
      isPassed,
    };
  })();

  const currentClassSubjects = subjects
    .filter((s) => s.classId === selectedClassId)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <button
              type="button"
              onClick={() => navigateTo('/result')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Results
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-teal-600" />
              Result & Grading Configuration
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Customize exam evaluation weightages, subjects curriculum per class, grading scale, and marksheet print settings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset all result settings to SEBA defaults (Evaluation 20%, Half Yearly 30%, Annual 50%)?')) {
                  resetResultSettingsToDefault();
                  setLocalGroups(defaultExamGroups);
                  setLocalGradeScale(resultSettings.gradeScale);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              Reset Defaults
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-xs md:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-4 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('weightage')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'weightage'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            1. Evaluation Weightage ({weightageSum}%)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'subjects'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            2. Subject Master ({subjects.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'grades'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            3. Grading Scale (8 Bands)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'policy'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            4. Marksheet & Pass Policy
          </button>
        </div>
      </div>

      {/* Tab 1: Weightage Settings */}
      {activeTab === 'weightage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Composite Examination Weightage Scheme
                </h2>
                <p className="text-xs text-slate-500">
                  Combined evaluation groups add obtained marks before scaling to their composite weightage percentage
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenCreateGroup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-700" />
                  Create Exam Group
                </button>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isWeightageValid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {isWeightageValid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Total: 100% (Valid)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Total: {weightageSum}% (Must equal 100%)
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Group Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {localGroups.map((group) => {
                const isCombined = group.examTypeIds.length > 1;

                // Look up exams in this group
                const groupExams = group.examTypeIds
                  .map((id) => examTypes.find((e) => e.id === id))
                  .filter(Boolean);

                const combinedMaxMarks = groupExams.reduce(
                  (sum, e) => sum + (e?.maxMarksDefault || 100),
                  0
                );

                // Auto-generate title for 1st + 2nd Evaluation or custom groups
                let cardTitle = group.name.toUpperCase();
                if (
                  group.examTypeIds.includes('eval-1') &&
                  group.examTypeIds.includes('eval-2') &&
                  group.examTypeIds.length === 2
                ) {
                  cardTitle = '1ST + 2ND EVALUATION (COMBINED)';
                } else if (isCombined) {
                  cardTitle = `${group.name.toUpperCase()} (COMBINED)`;
                }

                return (
                  <div
                    key={group.id}
                    className={`border rounded-xl p-5 flex flex-col justify-between transition-all ${
                      isCombined
                        ? 'md:col-span-2 border-teal-300 bg-gradient-to-br from-white via-teal-50/20 to-slate-50 shadow-xs'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      {/* Card Title & Edit Actions */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 block">
                            {isCombined ? 'COMBINED EVALUATION GROUP' : 'EXAM STAGE'}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800">
                            {cardTitle}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGroup(group)}
                            className="p-1 text-slate-400 hover:text-teal-700 hover:bg-slate-200 rounded transition-colors"
                            title="Edit Group"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete Group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Exam chips & Max marks */}
                      {isCombined ? (
                        <div className="space-y-2 mb-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {groupExams.map((et, idx) => (
                              <React.Fragment key={et!.id}>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-100/80 text-teal-900 border border-teal-200 font-semibold text-xs">
                                  {et!.name} ({et!.maxMarksDefault || 50})
                                </span>
                                {idx < groupExams.length - 1 && (
                                  <span className="text-slate-400 font-black text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 pt-1">
                            <span>Combined Max Marks:</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {combinedMaxMarks}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <span className="text-xs font-semibold text-slate-600 block">
                            Max Marks:{' '}
                            <span className="font-bold text-slate-900 font-mono">
                              {combinedMaxMarks || 100}
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Weightage input & slider */}
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Weightage Percentage:
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={group.percent}
                          onChange={(e) =>
                            handleGroupPercentChange(group.id, Number(e.target.value))
                          }
                          className="w-20 px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded bg-white focus:outline-teal-600"
                        />
                        <span className="text-sm font-bold text-slate-700">%</span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={group.percent}
                        onChange={(e) =>
                          handleGroupPercentChange(group.id, Number(e.target.value))
                        }
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>

                    {/* Helper text */}
                    <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 italic">
                      {isCombined
                        ? 'Obtained marks of both evaluations are added together, then converted to this percentage.'
                        : 'Directly scaled to this weightage percentage.'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Formula Info Box */}
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-lg text-xs text-slate-700 leading-relaxed space-y-1">
              <span className="font-bold text-teal-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-700" />
                Active Weightage Formula:
              </span>
              <p className="font-medium text-slate-800">{dynamicFormulaText}</p>
            </div>
          </div>

          {/* Test Calculator (Live instant verification) */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-teal-600" />
                  Test Calculator - Live Formula Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Type sample raw marks for each exam stage below to verify the combined evaluation and composite total in real time
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCalcMarks({
                    'eval-1': 40,
                    'eval-2': 35,
                    'half-yearly': 70,
                    annual: 80,
                  })
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
              >
                Reset to Sample (40, 35, 70, 80)
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['eval-1', 'eval-2', 'half-yearly', 'annual'].map((id) => {
                const et = examTypes.find((e) => e.id === id);
                const max = et?.maxMarksDefault || (id.startsWith('eval') ? 50 : 100);
                const val = calcMarks[id] !== undefined ? calcMarks[id] : 0;

                return (
                  <div key={id} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {et?.name || id}
                    </span>
                    <span className="text-[10px] text-slate-500 block mb-2">
                      Max Marks: {max}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={max}
                        value={val}
                        onChange={(e) =>
                          setCalcMarks((prev) => ({
                            ...prev,
                            [id]: Math.min(max, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-slate-300 rounded bg-white focus:outline-teal-600"
                      />
                      <span className="text-xs font-semibold text-slate-500">/{max}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Calculation Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {testCalcResults.groupBreakdowns.map(({ group, groupObtained, groupMax, rawPercent, weightedScore }) => (
                <div
                  key={group.id}
                  className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/40 space-y-1.5"
                >
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide block">
                    {group.name} ({group.percent}%)
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Raw Total:</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {groupObtained} / {groupMax} ({rawPercent}%)
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-teal-200/60">
                    <span className="text-xs font-bold text-slate-700">Weighted Score:</span>
                    <span className="font-mono font-black text-teal-900 text-sm">
                      {weightedScore} / {group.percent}
                    </span>
                  </div>
                </div>
              ))}

              {/* Final Composite Total Card */}
              <div className="p-3.5 rounded-lg border-2 border-purple-300 bg-purple-50/60 space-y-1.5">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wide block flex items-center justify-between">
                  <span>FINAL COMPOSITE</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      testCalcResults.isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {testCalcResults.isPassed ? 'PASS' : 'FAIL'}
                  </span>
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-600">Total Marks:</span>
                  <span className="font-mono font-black text-purple-900 text-base">
                    {testCalcResults.compositeTotal} / 100
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-purple-200 text-xs">
                  <span className="text-slate-600">Grade:</span>
                  <span className="font-bold text-purple-900">
                    {testCalcResults.gradeInfo.grade} ({testCalcResults.gradeInfo.remark})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Subject Master per Class */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Curriculum Subjects Master
              </h2>
              <p className="text-xs text-slate-500">
                Manage academic and co-scholastic subjects, full marks, pass marks, and evaluation type per class
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-700">Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white focus:outline-teal-600"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsCopyClassModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Copy curriculum subjects from another class"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy From Class</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingSubject(null);
                  setNewSubName('');
                  setNewSubCode('');
                  setNewSubFullMarks(100);
                  setNewSubPassMarks(33);
                  setNewSubType('marks');
                  setNewSubIncludeInTotal(true);
                  setNewSubIsOptional(false);
                  setNewSubComponents({});
                  setIsAddSubjectModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-24 text-center">Code</th>
                  <th className="py-2.5 px-4">Subject Name</th>
                  <th className="py-2.5 px-3 text-center">Type</th>
                  <th className="py-2.5 px-4 text-center">Component Setup (Per Exam)</th>
                  <th className="py-2.5 px-3 text-center">Full Marks</th>
                  <th className="py-2.5 px-3 text-center">Pass Marks</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentClassSubjects.map((sub, idx) => {
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {sub.code ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-teal-800 font-mono">
                            {sub.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{sub.name}</span>
                          {sub.isOptional && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-50 text-amber-800 border border-amber-200 font-bold uppercase">
                              Optional
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.type === 'marks'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {sub.type === 'marks' ? 'Scholastic' : 'Co-Scholastic (Grade)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {sub.type === 'grade' ? (
                          <span className="text-slate-400 italic">Direct Grade</span>
                        ) : sub.componentsByExamType ? (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono">
                            {Object.entries(sub.componentsByExamType).map(([etId, comp]) => (
                              <span
                                key={etId}
                                className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700"
                                title={`${etId}: Theory ${comp.descriptive || 0}, Practical ${comp.practical || 0}, IA ${comp.ia || 0}`}
                              >
                                <strong>{etId}:</strong> {comp.descriptive || 0}
                                {comp.practical ? `+${comp.practical}P` : ''}
                                {comp.ia ? `+${comp.ia}IA` : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono">Theory: {sub.fullMarks}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {sub.fullMarks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {sub.passMarks}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSubjectOrder(sub.id, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === currentClassSubjects.length - 1}
                            onClick={() => handleMoveSubjectOrder(sub.id, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditSubject(sub)}
                            className="p-1 text-slate-500 hover:text-teal-700 transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove "${sub.name}" from this class curriculum?`)) {
                                deleteSubject(sub.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-700 transition-colors"
                            title="Delete Subject"
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
        </div>
      )}

      {/* Tab 3: Grading Scale */}
      {activeTab === 'grades' && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800">
              SEBA / ASSEB 8-Point Grading System
            </h2>
            <p className="text-xs text-slate-500">
              Assam State School Education Board standard grade boundaries and official qualitative descriptors
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {localGradeScale.map((item, index) => (
              <div
                key={item.grade}
                className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-md bg-teal-800 text-white font-black text-sm flex items-center justify-center font-mono shadow-xs">
                    {item.grade}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Band #{index + 1}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Range (%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {Math.floor(item.min)}% - {Math.ceil(item.max)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Remark:</span>
                    <span className="font-semibold text-teal-800">{item.remark}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Marksheet & Pass Policy */}
      {activeTab === 'policy' && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-6">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800">
              Marksheet Print & Promotion Policy
            </h2>
            <p className="text-xs text-slate-500">
              Customize headers, signatory labels, pass threshold percentage, and displayed table columns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Marksheet / Progress Report Header Title:
              </label>
              <input
                type="text"
                value={marksheetTitle}
                onChange={(e) => setMarksheetTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-teal-600 font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Academic Session:
              </label>
              <input
                type="text"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Principal / Headmaster Name (Signatory):
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Class Teacher Signature Label:
              </label>
              <input
                type="text"
                value={teacherLabel}
                onChange={(e) => setTeacherLabel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Minimum Pass Mark Threshold (%):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="60"
                  value={passPercent}
                  onChange={(e) => setPassPercent(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-xs border border-slate-300 rounded focus:outline-teal-600 font-bold font-mono"
                />
                <span className="text-xs text-slate-500">(SEBA Standard: 30%)</span>
              </div>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Display Elements on Printable Marksheet
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeightedBreakdown}
                  onChange={(e) => setShowWeightedBreakdown(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Show Weighted Breakdown
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Display Evaluation (20), Half Yearly (30), Annual (50) columns
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRank}
                  onChange={(e) => setShowRank(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Show Class Rank</span>
                  <span className="text-[10px] text-slate-500 block">Display merit position in class</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAttendance}
                  onChange={(e) => setShowAttendance(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Show Attendance %</span>
                  <span className="text-[10px] text-slate-500 block">Include candidate attendance figure</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRemarks}
                  onChange={(e) => setShowRemarks(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Show Remarks Box</span>
                  <span className="text-[10px] text-slate-500 block">Print qualitative teacher notes</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAddress}
                  onChange={(e) => setShowAddress(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Show Student Address</span>
                  <span className="text-[10px] text-slate-500 block">Print residential address on marksheet</span>
                </div>
              </label>
            </div>

            {/* Final Submit & Lock Security Policy */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Final Submission &amp; Printing Lock Policy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Who can cancel Final Submit:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Controls whether subject teachers or only school administrators can unlock a final-submitted examination.
                  </p>
                  <select
                    value={whoCanCancelFinalSubmit}
                    onChange={(e) =>
                      setWhoCanCancelFinalSubmit(e.target.value as 'admin_only' | 'admin_and_teachers')
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white font-semibold focus:outline-teal-600"
                  >
                    <option value="admin_only">Admin Only (Default &amp; Recommended)</option>
                    <option value="admin_and_teachers">Admin and Teachers</option>
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="block-printing"
                    checked={blockPrintingUntilAnnualSubmitted}
                    onChange={(e) => setBlockPrintingUntilAnnualSubmitted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="block-printing" className="cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 block">
                      Block printing of final marksheets until Annual exam is final submitted
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Prevents printing unverified or incomplete marksheet progress reports. Administrators can still override and print provisional reports with confirmation.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Exam Group */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                {editingGroupId ? 'Edit Exam Group' : 'Create Exam Group'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupModal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Group Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Evaluation, Unit Tests, or Quarterly"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-teal-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Member Examination Stages:
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Select one or more exams. If multiple exams are selected, their obtained marks will be summed together before converting to this weightage percentage.
                </p>
                <div className="space-y-2 border border-slate-200 p-2.5 rounded bg-slate-50 max-h-48 overflow-y-auto">
                  {examTypes.map((et) => {
                    const isChecked = selectedExamTypeIds.includes(et.id);

                    return (
                      <label
                        key={et.id}
                        className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-100 p-1.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExamTypeIds((prev) => [...prev, et.id]);
                            } else {
                              setSelectedExamTypeIds((prev) => prev.filter((id) => id !== et.id));
                            }
                          }}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="font-semibold text-slate-800">{et.name}</span>
                        <span className="text-[10px] text-slate-400 ml-auto font-mono">
                          Max: {et.maxMarksDefault || 100}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Weightage Percentage (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={groupPercentInput}
                    onChange={(e) => setGroupPercentInput(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 font-bold font-mono border border-slate-300 rounded focus:outline-teal-600"
                    required
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Subject */}
      {isAddSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-700" />
                <span>{editingSubject ? 'Edit Subject' : 'Add Subject to Class Curriculum'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Subject Name <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GENERAL MATHEMATICS or ASSAMESE"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-teal-600 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Subject Code:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. C1, C2, 1, 40"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-teal-600 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category:</label>
                  <select
                    value={newSubType}
                    onChange={(e) => setNewSubType(e.target.value as 'marks' | 'grade')}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-teal-600 font-semibold bg-white"
                  >
                    <option value="marks">Scholastic (Numerical Marks)</option>
                    <option value="grade">Co-Scholastic (Direct Grade)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Marks:</label>
                  <input
                    type="number"
                    value={newSubFullMarks}
                    onChange={(e) => setNewSubFullMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded focus:outline-teal-600"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pass Marks:</label>
                  <input
                    type="number"
                    value={newSubPassMarks}
                    onChange={(e) => setNewSubPassMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded focus:outline-teal-600"
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex flex-wrap items-center gap-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubIncludeInTotal}
                    onChange={(e) => setNewSubIncludeInTotal(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    Include in composite total score & rank
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubIsOptional}
                    onChange={(e) => setNewSubIsOptional(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    Elective / Optional Subject
                  </span>
                </label>
              </div>

              {/* Mark components per exam type (Descriptive / Practical / IA) */}
              {newSubType === 'marks' && (
                <div className="space-y-2 border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Exam Components Breakdown (Theory / Practical / IA)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Set full marks for each part per exam stage. Parts with 0 or blank display as "NA" on marks entry.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {examTypes.map((et) => {
                      const currentComp = newSubComponents[et.id] || {
                        objective: 0,
                        descriptive: et.id.includes('eval') ? 50 : 100,
                        practical: 0,
                        ia: 0,
                      };

                      const compTotal =
                        (Number(currentComp.objective) || 0) +
                        (Number(currentComp.descriptive) || 0) +
                        (Number(currentComp.practical) || 0) +
                        (Number(currentComp.ia) || 0);

                      return (
                        <div
                          key={et.id}
                          className="bg-white p-2.5 rounded border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {et.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Total: <strong>{compTotal}</strong>
                            </span>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              Objective (MCQ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={currentComp.objective ?? ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewSubComponents((prev) => ({
                                  ...prev,
                                  [et.id]: {
                                    ...(prev[et.id] || { descriptive: 0, practical: 0, ia: 0 }),
                                    objective: val,
                                  },
                                }));
                              }}
                              placeholder="0 (NA)"
                              className="w-full px-2 py-1 font-mono text-center border border-slate-300 rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              Descriptive (Theory)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={currentComp.descriptive ?? ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewSubComponents((prev) => ({
                                  ...prev,
                                  [et.id]: {
                                    ...(prev[et.id] || { objective: 0, practical: 0, ia: 0 }),
                                    descriptive: val,
                                  },
                                }));
                              }}
                              placeholder="0 (NA)"
                              className="w-full px-2 py-1 font-mono text-center border border-slate-300 rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              Practical
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={currentComp.practical ?? ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewSubComponents((prev) => ({
                                  ...prev,
                                  [et.id]: {
                                    ...(prev[et.id] || { objective: 0, descriptive: 0, ia: 0 }),
                                    practical: val,
                                  },
                                }));
                              }}
                              placeholder="0 (NA)"
                              className="w-full px-2 py-1 font-mono text-center border border-slate-300 rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              IA (Internal)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={currentComp.ia ?? ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewSubComponents((prev) => ({
                                  ...prev,
                                  [et.id]: {
                                    ...(prev[et.id] || { objective: 0, descriptive: 0, practical: 0 }),
                                    ia: val,
                                  },
                                }));
                              }}
                              placeholder="0 (NA)"
                              className="w-full px-2 py-1 font-mono text-center border border-slate-300 rounded text-xs"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded shadow-xs"
                >
                  {editingSubject ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Copy Subjects From Another Class */}
      {isCopyClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-4 h-4 text-teal-600" />
                <span>Copy Subjects from Another Class</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCopyClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                Select a class to copy all of its curriculum subjects, codes, full marks, and component breakdowns into{' '}
                <strong>Class {classes.find((c) => c.id === selectedClassId)?.name}</strong>:
              </p>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Source Class:
                </label>
                <select
                  value={sourceCopyClassId}
                  onChange={(e) => setSourceCopyClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white font-semibold text-xs focus:outline-teal-600"
                >
                  {classes
                    .filter((c) => c.id !== selectedClassId)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.name} ({subjects.filter((s) => s.classId === cls.id).length} subjects)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCopyClassModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopySubjectsFromClass}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded text-xs shadow-xs"
              >
                Copy Subjects Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
