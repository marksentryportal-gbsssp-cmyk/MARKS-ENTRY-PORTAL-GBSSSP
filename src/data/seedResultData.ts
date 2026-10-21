import { Subject, ResultSettings, MarkRecord, ExamGroup } from '../types';
import { initialStudents } from './seedStudents';

export const defaultExamGroups: ExamGroup[] = [
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

export const defaultResultSettings: ResultSettings = {
  examGroups: defaultExamGroups,
  weightage: [
    { examTypeId: 'eval-1', percent: 10 },
    { examTypeId: 'eval-2', percent: 10 },
    { examTypeId: 'half-yearly', percent: 30 },
    { examTypeId: 'annual', percent: 50 },
  ],
  showWeightedBreakdown: true,
  gradeScale: [
    { min: 90, max: 100, grade: 'A1', remark: 'Outstanding' },
    { min: 80, max: 89.99, grade: 'A2', remark: 'Excellent' },
    { min: 70, max: 79.99, grade: 'B1', remark: 'Very Good' },
    { min: 60, max: 69.99, grade: 'B2', remark: 'Good' },
    { min: 50, max: 59.99, grade: 'C1', remark: 'Fair' },
    { min: 40, max: 49.99, grade: 'C2', remark: 'Average' },
    { min: 30, max: 39.99, grade: 'D', remark: 'Marginal' },
    { min: 0, max: 29.99, grade: 'F', remark: 'Needs Improvement' },
  ],
  passPercent: 30,
  showRank: true,
  showAttendance: true,
  showRemarks: true,
  principalName: 'Principal / Headmaster',
  classTeacherSignatureLabel: 'Class Teacher Signature',
  marksheetTitle: 'PROGRESS REPORT / MARKSHEET 2026-2027',
  session: '2026-2027',
};

// Seed Subjects for all classes
export const initialSubjects: Subject[] = [
  // Ankur
  { id: 'sub-ankur-1', classId: 'ankur', name: 'English', fullMarks: 100, passMarks: 30, order: 1, type: 'marks' },
  { id: 'sub-ankur-2', classId: 'ankur', name: 'Assamese', fullMarks: 100, passMarks: 30, order: 2, type: 'marks' },
  { id: 'sub-ankur-3', classId: 'ankur', name: 'Mathematics', fullMarks: 100, passMarks: 30, order: 3, type: 'marks' },
  { id: 'sub-ankur-4', classId: 'ankur', name: 'Drawing & Activity', fullMarks: 100, passMarks: 30, order: 4, type: 'grade' },

  // P.P
  { id: 'sub-pp-1', classId: 'pp', name: 'English', fullMarks: 100, passMarks: 30, order: 1, type: 'marks' },
  { id: 'sub-pp-2', classId: 'pp', name: 'Assamese', fullMarks: 100, passMarks: 30, order: 2, type: 'marks' },
  { id: 'sub-pp-3', classId: 'pp', name: 'Mathematics', fullMarks: 100, passMarks: 30, order: 3, type: 'marks' },
  { id: 'sub-pp-4', classId: 'pp', name: 'Drawing & Craft', fullMarks: 100, passMarks: 30, order: 4, type: 'grade' },

  // One to Five
  ...['one', 'two', 'three', 'four', 'five'].flatMap((clsId) => [
    { id: `sub-${clsId}-1`, classId: clsId, name: 'Assamese (MIL)', fullMarks: 100, passMarks: 30, order: 1, type: 'marks' as const },
    { id: `sub-${clsId}-2`, classId: clsId, name: 'English', fullMarks: 100, passMarks: 30, order: 2, type: 'marks' as const },
    { id: `sub-${clsId}-3`, classId: clsId, name: 'Mathematics', fullMarks: 100, passMarks: 30, order: 3, type: 'marks' as const },
    { id: `sub-${clsId}-4`, classId: clsId, name: 'Environmental Studies', fullMarks: 100, passMarks: 30, order: 4, type: 'marks' as const },
    { id: `sub-${clsId}-5`, classId: clsId, name: 'Hindi', fullMarks: 100, passMarks: 30, order: 5, type: 'marks' as const },
  ]),

  // Six to Eight
  ...['six', 'seven', 'eight'].flatMap((clsId) => [
    { id: `sub-${clsId}-1`, classId: clsId, name: 'Assamese (MIL)', fullMarks: 100, passMarks: 30, order: 1, type: 'marks' as const },
    { id: `sub-${clsId}-2`, classId: clsId, name: 'English', fullMarks: 100, passMarks: 30, order: 2, type: 'marks' as const },
    { id: `sub-${clsId}-3`, classId: clsId, name: 'Hindi', fullMarks: 100, passMarks: 30, order: 3, type: 'marks' as const },
    { id: `sub-${clsId}-4`, classId: clsId, name: 'General Mathematics', fullMarks: 100, passMarks: 30, order: 4, type: 'marks' as const },
    { id: `sub-${clsId}-5`, classId: clsId, name: 'General Science', fullMarks: 100, passMarks: 30, order: 5, type: 'marks' as const },
    { id: `sub-${clsId}-6`, classId: clsId, name: 'Social Science', fullMarks: 100, passMarks: 30, order: 6, type: 'marks' as const },
  ]),

  // Nine to Ten (SEBA standard curriculum)
  ...['nine', 'ten'].flatMap((clsId) => [
    { id: `sub-${clsId}-1`, classId: clsId, name: 'MIL (Assamese)', fullMarks: 100, passMarks: 30, order: 1, type: 'marks' as const },
    { id: `sub-${clsId}-2`, classId: clsId, name: 'English', fullMarks: 100, passMarks: 30, order: 2, type: 'marks' as const },
    { id: `sub-${clsId}-3`, classId: clsId, name: 'General Mathematics', fullMarks: 100, passMarks: 30, order: 3, type: 'marks' as const },
    { id: `sub-${clsId}-4`, classId: clsId, name: 'General Science', fullMarks: 100, passMarks: 30, order: 4, type: 'marks' as const },
    { id: `sub-${clsId}-5`, classId: clsId, name: 'Social Science', fullMarks: 100, passMarks: 30, order: 5, type: 'marks' as const },
    { id: `sub-${clsId}-6`, classId: clsId, name: 'Hindi (Elective)', fullMarks: 100, passMarks: 30, order: 6, type: 'marks' as const },
  ]),

  // Eleven to Twelve (Arts stream standard)
  ...['eleven', 'twelve'].flatMap((clsId) => [
    { id: `sub-${clsId}-1`, classId: clsId, name: 'English (Core)', fullMarks: 100, passMarks: 30, order: 1, type: 'marks' as const },
    { id: `sub-${clsId}-2`, classId: clsId, name: 'MIL (Assamese)', fullMarks: 100, passMarks: 30, order: 2, type: 'marks' as const },
    { id: `sub-${clsId}-3`, classId: clsId, name: 'Political Science', fullMarks: 100, passMarks: 30, order: 3, type: 'marks' as const },
    { id: `sub-${clsId}-4`, classId: clsId, name: 'History', fullMarks: 100, passMarks: 30, order: 4, type: 'marks' as const },
    { id: `sub-${clsId}-5`, classId: clsId, name: 'Economics', fullMarks: 100, passMarks: 30, order: 5, type: 'marks' as const },
    { id: `sub-${clsId}-6`, classId: clsId, name: 'Education', fullMarks: 100, passMarks: 30, order: 6, type: 'marks' as const },
  ]),
];

// Generate comprehensive seed marks for Class Nine and Ten for all 4 exams of 2026-2027
export function generateSeedMarks(): MarkRecord[] {
  const marks: MarkRecord[] = [];
  const targetClasses = ['nine', 'ten'];
  const examTypeIds = ['eval-1', 'eval-2', 'half-yearly', 'annual'];

  // Predetermined performance baseline per student index (0-11) for realistic distribution
  // e.g. student 0 is topper (88-96%), student 1 is high (82-90%), student 10 has a backlog/fail in Maths
  const studentProfiles = [
    { base: 92, variance: 4 }, // Topper (A1)
    { base: 87, variance: 5 }, // Rank 2 (A2)
    { base: 82, variance: 6 }, // Rank 3 (A2)
    { base: 76, variance: 5 }, // B1
    { base: 71, variance: 7 }, // B1
    { base: 65, variance: 6 }, // B2
    { base: 58, variance: 8 }, // C1
    { base: 52, variance: 6 }, // C1
    { base: 45, variance: 5 }, // C2
    { base: 41, variance: 7 }, // C2 (borderline)
    { base: 26, variance: 8, failSubject: 'General Mathematics' }, // Failed Maths (F)
    { base: 63, variance: 5, absentIn: 'eval-2' }, // Has an absent in eval-2
  ];

  targetClasses.forEach((classId) => {
    const classStudents = initialStudents.filter((s) => s.classId === classId);
    const classSubjects = initialSubjects.filter((s) => s.classId === classId);

    classStudents.forEach((student, sIdx) => {
      const profile = studentProfiles[sIdx % studentProfiles.length];

      examTypeIds.forEach((examTypeId) => {
        const examId = `exam-${classId}-${examTypeId}-2026-2027`;
        const maxMarks = examTypeId.includes('eval') ? 50 : 100;

        classSubjects.forEach((subject, subIdx) => {
          // Absent check
          if (profile.absentIn === examTypeId && subIdx === 1) {
            marks.push({
              examId,
              studentId: student.id,
              subjectId: subject.id,
              obtained: null,
              absent: true,
            });
            return;
          }

          // Score computation
          let rawPercent = profile.base + ((subIdx * 3 - 5) % profile.variance);
          if (profile.failSubject && subject.name.includes('Math') && subIdx === 2) {
            rawPercent = 22; // Failed
          }

          // Scale to maxMarks (50 or 100)
          const scale = maxMarks / 100;
          let obtained = Math.round(rawPercent * scale);
          if (obtained > maxMarks) obtained = maxMarks;
          if (obtained < 0) obtained = 0;

          marks.push({
            examId,
            studentId: student.id,
            subjectId: subject.id,
            obtained,
            absent: false,
          });
        });
      });
    });
  });

  return marks;
}
