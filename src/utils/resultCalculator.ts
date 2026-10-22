import {
  Student,
  Subject,
  ExamRecord,
  ExamType,
  MarkRecord,
  ResultSettings,
  ExamGroup,
  GroupScore,
  SubjectResult,
  StudentResult,
} from '../types';

export function calculateGrade(
  percentage: number,
  gradeScale: ResultSettings['gradeScale']
): { grade: string; remark: string } {
  const rounded = Math.round(percentage * 10) / 10;
  for (const item of gradeScale) {
    if (rounded >= item.min && rounded <= item.max + 0.01) {
      return { grade: item.grade, remark: item.remark };
    }
  }
  return { grade: 'F', remark: 'Needs Improvement' };
}

export interface GroupCalculationInput {
  examTypeId: string;
  obtained: number | null;
  absent: boolean;
  maxMarks: number;
}

/**
 * Pure calculation utility for a subject across configured exam groups.
 */
export function calculateSubjectFromGroups(
  examMarks: Record<string, { obtained: number | null; absent: boolean; maxMarks: number }>,
  examGroups: ExamGroup[],
  subjectFullMarks: number = 100
): {
  groupScores: Record<string, GroupScore>;
  totalWeightedScore: number | null;
  hasMissingMarks: boolean;
  hasAnyMarks: boolean;
} {
  const groupScores: Record<string, GroupScore> = {};
  let totalWeighted = 0;
  let hasAnyMarks = false;
  let hasMissingMarks = false;

  for (const group of examGroups) {
    let groupObtained = 0;
    let groupMaxMarks = 0;
    let groupAvailObtained = 0;
    let groupAvailMaxMarks = 0;
    let enteredCount = 0;
    let absentCount = 0;
    const totalExamsInGroup = group.examTypeIds.length;

    for (const etId of group.examTypeIds) {
      const examData = examMarks[etId];
      const maxMarks = examData ? examData.maxMarks : 100;
      groupMaxMarks += maxMarks;

      if (!examData || (examData.obtained === null && !examData.absent)) {
        // Missing / not entered
        hasMissingMarks = true;
      } else {
        enteredCount++;
        hasAnyMarks = true;
        if (examData.absent) {
          absentCount++;
          // Absent counts as 0, maxMarks included in denominator
          groupAvailMaxMarks += maxMarks;
          groupObtained += 0;
        } else {
          const score = examData.obtained !== null ? examData.obtained : 0;
          groupObtained += score;
          groupAvailObtained += score;
          groupAvailMaxMarks += maxMarks;
        }
      }
    }

    let weightedScore = 0;
    const isAllAbsent = totalExamsInGroup > 0 && absentCount === totalExamsInGroup;
    const isNoneEntered = enteredCount === 0;

    if (isNoneEntered) {
      weightedScore = 0;
    } else if (isAllAbsent) {
      weightedScore = 0;
    } else {
      // Calculate with available exams in this group
      const denom = groupAvailMaxMarks > 0 ? groupAvailMaxMarks : groupMaxMarks;
      if (denom > 0) {
        weightedScore = (groupAvailObtained / denom) * group.percent;
      }
    }

    groupScores[group.id] = {
      groupId: group.id,
      groupName: group.name,
      obtained: groupAvailObtained,
      fullMarks: groupMaxMarks,
      percent: group.percent,
      weightedScore: Math.round(weightedScore * 10) / 10,
      hasMissingMarks: enteredCount < totalExamsInGroup,
      isAllAbsent,
    };

    totalWeighted += weightedScore;
  }

  // Scale totalWeighted to subject's full marks (standardized to 100-base weightage)
  let scaledTotal: number | null = null;
  if (hasAnyMarks) {
    const rawTotal = (totalWeighted / 100) * subjectFullMarks;
    scaledTotal = Math.round(rawTotal * 10) / 10;
  }

  return {
    groupScores,
    totalWeightedScore: scaledTotal,
    hasMissingMarks,
    hasAnyMarks,
  };
}

/**
 * Compute full class results using exam groups and weightages
 */
export function computeClassResults(
  classId: string,
  academicYear: string,
  students: Student[],
  subjects: Subject[],
  exams: ExamRecord[],
  examTypes: ExamType[],
  marks: MarkRecord[],
  settings: ResultSettings
): StudentResult[] {
  const classStudents = students.filter(
    (s) => s.classId === classId && s.active
  );
  const classSubjects = subjects
    .filter((sub) => sub.classId === classId)
    .sort((a, b) => a.order - b.order);

  // Relevant exams for this class and academic year
  const classExams = exams.filter(
    (e) => e.classId === classId && e.academicYear === academicYear
  );

  // Quick lookup for marks: `${examId}_${studentId}_${subjectId}` -> MarkRecord[]
  const marksGroupMap = new Map<string, MarkRecord[]>();
  marks.forEach((m) => {
    const key = `${m.examId}_${m.studentId}_${m.subjectId}`;
    const list = marksGroupMap.get(key) || [];
    list.push(m);
    marksGroupMap.set(key, list);
  });

  // Ensure examGroups is present, otherwise fallback to legacy weightage
  const activeExamGroups: ExamGroup[] =
    settings.examGroups && settings.examGroups.length > 0
      ? settings.examGroups
      : [
          {
            id: 'grp-eval',
            name: 'Evaluation',
            examTypeIds: ['eval-1', 'eval-2'],
            percent: 20,
          },
          {
            id: 'grp-half-yearly',
            name: 'Half Yearly',
            examTypeIds: ['half-yearly'],
            percent: 30,
          },
          {
            id: 'grp-annual',
            name: 'Annual Examination',
            examTypeIds: ['annual'],
            percent: 50,
          },
        ];

  // Calculate for each student
  const studentResults: StudentResult[] = classStudents.map((student) => {
    let totalObtained = 0;
    let totalFullMarks = 0;
    const failedSubjectNames: string[] = [];
    let studentHasMissingMarks = false;

    const subjectResults: SubjectResult[] = classSubjects.map((sub) => {
      const examMarksRecord: SubjectResult['examMarks'] = {};

      // Build examMarks lookup for this student and subject
      classExams.forEach((exam) => {
        const records = marksGroupMap.get(`${exam.id}_${student.id}_${sub.id}`);
        const examType = examTypes.find((et) => et.id === exam.examTypeId);
        
        // Calculate max marks for this subject in this exam (from components or exam default)
        let maxMarks = examType?.maxMarksDefault || 100;
        if (sub.componentsByExamType && sub.componentsByExamType[exam.examTypeId]) {
          const comp = sub.componentsByExamType[exam.examTypeId];
          const compSum = (comp.descriptive || 0) + (comp.practical || 0) + (comp.ia || 0);
          if (compSum > 0) maxMarks = compSum;
        } else if (sub.components) {
          const compSum = (sub.components.descriptive || 0) + (sub.components.practical || 0) + (sub.components.ia || 0);
          if (compSum > 0) maxMarks = compSum;
        }

        if (!records || records.length === 0) {
          examMarksRecord[exam.examTypeId] = {
            obtained: null,
            absent: false,
            maxMarks,
          };
        } else {
          const allAbsent = records.every((r) => r.absent);
          if (allAbsent) {
            examMarksRecord[exam.examTypeId] = {
              obtained: null,
              absent: true,
              maxMarks,
            };
          } else {
            let sum = 0;
            records.forEach((r) => {
              if (!r.absent && r.obtained !== null && !isNaN(r.obtained)) {
                sum += Number(r.obtained);
              }
            });
            examMarksRecord[exam.examTypeId] = {
              obtained: sum,
              absent: false,
              maxMarks,
            };
          }
        }
      });

      // Calculate with group calculation engine
      const {
        groupScores,
        totalWeightedScore,
        hasMissingMarks,
      } = calculateSubjectFromGroups(
        examMarksRecord,
        activeExamGroups,
        sub.fullMarks
      );

      if (hasMissingMarks) {
        studentHasMissingMarks = true;
      }

      const scoreForGrade =
        totalWeightedScore !== null
          ? (totalWeightedScore / sub.fullMarks) * 100
          : 0;
      const { grade } = calculateGrade(scoreForGrade, settings.gradeScale);
      const isPassed =
        totalWeightedScore !== null && totalWeightedScore >= sub.passMarks;

      if (sub.type === 'marks') {
        totalFullMarks += sub.fullMarks;
        if (totalWeightedScore !== null) {
          totalObtained += totalWeightedScore;
        }
        if (!isPassed && totalWeightedScore !== null) {
          failedSubjectNames.push(sub.name);
        }
      }

      return {
        subject: sub,
        examMarks: examMarksRecord,
        groupScores,
        weightedObtained: totalWeightedScore,
        fullMarks: sub.fullMarks,
        passMarks: sub.passMarks,
        grade,
        isPassed,
        hasMissingMarks,
      };
    });

    const percentage =
      totalFullMarks > 0 ? (totalObtained / totalFullMarks) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 100) / 100;
    const { grade: overallGrade, remark: overallRemark } = calculateGrade(
      roundedPercentage,
      settings.gradeScale
    );

    const isPassed =
      failedSubjectNames.length === 0 &&
      roundedPercentage >= settings.passPercent;

    return {
      student,
      rank: 0, // Assigned after sorting
      subjectResults,
      totalObtained: Math.round(totalObtained * 10) / 10,
      totalFullMarks,
      percentage: roundedPercentage,
      overallGrade,
      overallRemark,
      isPassed,
      failedSubjectNames,
      hasMissingMarks: studentHasMissingMarks,
      attendance: '92%',
      remarks: isPassed
        ? 'Promoted to Next Class'
        : 'Needs Academic Remediation',
    };
  });

  // Sort descending by totalObtained to compute ranks
  studentResults.sort((a, b) => b.totalObtained - a.totalObtained);
  studentResults.forEach((res, index) => {
    res.rank = index + 1;
  });

  return studentResults;
}
