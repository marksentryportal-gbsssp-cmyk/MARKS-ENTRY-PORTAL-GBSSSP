import { MarkRecord } from '../types';
import { initialStudents } from './seedStudents';
import { initialSubjects } from './seedSubjects';

export function generateSeedMarks(): MarkRecord[] {
  const records: MarkRecord[] = [];

  const examConfigs = [
    { typeId: 'eval-1', maxMarks: 50 },
    { typeId: 'eval-2', maxMarks: 50 },
    { typeId: 'half-yearly', maxMarks: 100 },
    { typeId: 'annual', maxMarks: 100 },
  ];

  // Seed for Class Nine and Class Ten
  ['nine', 'ten'].forEach((classId) => {
    const classStudents = initialStudents.filter((s) => s.classId === classId);
    const classSubjects = initialSubjects.filter((s) => s.classId === classId);

    classStudents.forEach((student, studentIndex) => {
      // Deterministic performance profile
      // Index 0: Topper (~92%)
      // Index 1: High (~86%)
      // Index 2-4: Good (~70-80%)
      // Index 5-8: Average (~55-65%)
      // Index 9-10: Passing (~40-50%)
      // Index 11: Needs improvement / has one fail subject (~32-42%)

      examConfigs.forEach((examCfg) => {
        const examId = `exam-${classId}-${examCfg.typeId}-2026-2027`;

        classSubjects.forEach((sub, subIndex) => {
          let factor = 0.75;
          if (studentIndex === 0) factor = 0.92;
          else if (studentIndex === 1) factor = 0.86;
          else if (studentIndex === 2) factor = 0.81;
          else if (studentIndex === 3) factor = 0.76;
          else if (studentIndex === 4) factor = 0.72;
          else if (studentIndex === 5) factor = 0.65;
          else if (studentIndex === 6) factor = 0.60;
          else if (studentIndex === 7) factor = 0.56;
          else if (studentIndex === 8) factor = 0.52;
          else if (studentIndex === 9) factor = 0.46;
          else if (studentIndex === 10) factor = 0.41;
          else factor = 0.35; // Student 11 (Fail demonstration)

          // Add subtle subject variance
          const variance = ((subIndex % 3) - 1) * 0.04;
          let percent = factor + variance;
          percent = Math.min(0.98, Math.max(0.25, percent));

          let obtained: number | null = Math.round(examCfg.maxMarks * percent);
          let absent = false;

          // Realistic edge case: student 10 was absent in 1st eval for subject 5
          if (studentIndex === 10 && examCfg.typeId === 'eval-1' && subIndex === 4) {
            absent = true;
            obtained = null;
          }

          records.push({
            examId,
            studentId: student.id,
            subjectId: sub.id,
            component: 'descriptive',
            obtained,
            absent,
          });
        });
      });
    });
  });

  return records;
}
