import { Student } from '../types';

/**
 * Parses roll number string to integer safely.
 * Returns null if not numeric.
 */
export function parseNumericRollNo(rollNo?: string | null): number | null {
  if (!rollNo || typeof rollNo !== 'string') return null;
  const trimmed = rollNo.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? null : num;
}

/**
 * Pure numeric sorting of students by Roll No. ascending (e.g. 1, 2, ..., 9, 10, 11).
 * Students without a valid numeric roll number appear at the end.
 */
export function sortByRollNo(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const numA = parseNumericRollNo(a.rollNo);
    const numB = parseNumericRollNo(b.rollNo);

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    }
    if (numA !== null) return -1;
    if (numB !== null) return 1;

    // Both non-numeric or missing
    return a.name.localeCompare(b.name);
  });
}

/**
 * Returns the highest numeric roll number currently assigned in a class & academic year.
 */
export function getHighestRollNo(
  students: Student[],
  classId: string,
  academicYear: string
): number {
  const classStudents = students.filter(
    (s) => s.classId === classId && s.academicYear === academicYear && s.active !== false
  );

  let maxRoll = 0;
  classStudents.forEach((s) => {
    const num = parseNumericRollNo(s.rollNo);
    if (num !== null && num > maxRoll) {
      maxRoll = num;
    }
  });

  return maxRoll;
}

/**
 * Calculates the next available sequential roll number (highest + 1).
 */
export function getNextRollNo(
  students: Student[],
  classId: string,
  academicYear: string
): number {
  return getHighestRollNo(students, classId, academicYear) + 1;
}

/**
 * Detects any duplicate roll numbers within a class & academic year.
 */
export function checkDuplicateRollNos(
  students: Student[],
  classId: string,
  academicYear: string
): { hasDuplicates: boolean; duplicates: string[] } {
  const classStudents = students.filter(
    (s) => s.classId === classId && s.academicYear === academicYear && s.active !== false
  );

  const rollCount = new Map<string, number>();
  classStudents.forEach((s) => {
    const r = (s.rollNo || '').trim();
    if (r) {
      rollCount.set(r, (rollCount.get(r) || 0) + 1);
    }
  });

  const duplicates: string[] = [];
  rollCount.forEach((count, roll) => {
    if (count > 1) {
      duplicates.push(roll);
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}

/**
 * Build one shared ordered list of students for an examination:
 * - Active students
 * - Enrolled in this exam
 * - Not marked as "not_appearing" for this exam
 * - Sorted strictly by Roll No. numerically ascending
 */
export function getOrderedExamStudents(
  examId: string,
  allStudents: Student[],
  examStudentsMap: Record<string, string[]>,
  studentExamStatuses: Record<string, any>
): Student[] {
  const enrolledIds = examStudentsMap[examId] || [];

  const list = allStudents.filter((s) => {
    if (!s.active) return false;
    if (!enrolledIds.includes(s.id)) return false;
    const statusRec = studentExamStatuses[`${examId}_${s.id}`];
    if (statusRec && statusRec.status === 'not_appearing') return false;
    return true;
  });

  return sortByRollNo(list);
}

/**
 * Pure function to find the NEXT student for navigation:
 * - When skipCompleted is FALSE:
 *   Opens the student with the next higher Roll No. in the ordered list (Roll 1 -> Roll 2 -> Roll 3).
 * - When skipCompleted is TRUE:
 *   Opens the student with the next higher Roll No. who is still Not Completed.
 *   Does NOT wrap back to a lower roll number first.
 * - Returns null when the last roll number in the sequence has been reached.
 */
export function getNextStudent(
  currentStudent: Student,
  orderedExamStudents: Student[],
  marksStatus: Record<string, string>,
  examId: string,
  skipCompleted: boolean
): Student | null {
  const currentIndex = orderedExamStudents.findIndex((s) => s.id === currentStudent.id);
  if (currentIndex === -1) {
    // Current student not in list; fallback to first student
    return orderedExamStudents[0] || null;
  }

  // Iterate strictly forward from currentIndex + 1
  for (let i = currentIndex + 1; i < orderedExamStudents.length; i++) {
    const candidate = orderedExamStudents[i];
    if (!skipCompleted) {
      return candidate;
    }
    const status = marksStatus[`${examId}_${candidate.id}`];
    if (status !== 'completed') {
      return candidate;
    }
  }

  // Reached end of list without finding higher roll number
  return null;
}

/**
 * Calculates new sequential roll numbers for a class of students based on chosen ordering.
 */
export function renumberStudents(
  classStudents: Student[],
  mode: 'current' | 'alphabetical' | 'regNo',
  startFrom: number = 1
): { studentId: string; oldRollNo: string; newRollNo: string }[] {
  const list = [...classStudents];

  if (mode === 'alphabetical') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'regNo') {
    list.sort((a, b) => (a.registrationNo || '').localeCompare(b.registrationNo || ''));
  } else {
    // Current order (sorted by existing roll numbers first)
    list.sort((a, b) => {
      const numA = parseNumericRollNo(a.rollNo);
      const numB = parseNumericRollNo(b.rollNo);
      if (numA !== null && numB !== null) return numA - numB;
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  let currentRoll = startFrom;
  return list.map((student) => {
    const newRoll = String(currentRoll++);
    return {
      studentId: student.id,
      oldRollNo: student.rollNo || '',
      newRollNo: newRoll,
    };
  });
}
