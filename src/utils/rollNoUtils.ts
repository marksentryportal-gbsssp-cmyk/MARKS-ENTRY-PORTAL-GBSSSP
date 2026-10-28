import { Student, ClassSection } from '../types';

/**
 * Normalizes section string (e.g. "a" -> "A", undefined -> "A")
 */
export function normalizeSection(sec?: string | null): string {
  if (!sec || typeof sec !== 'string') return 'A';
  const clean = sec.trim().toUpperCase();
  return clean || 'A';
}

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
 * Formats roll number with section together, e.g. "01 (Sec A)" or "5 (Sec B)"
 */
export function formatRollNoWithSection(rollNo?: string | null, section?: string | null): string {
  const r = (rollNo || '').trim() || '--';
  const s = normalizeSection(section);
  // Pad single digits if desired, e.g. "1" -> "01"
  const padded = /^\d$/.test(r) ? `0${r}` : r;
  return `${padded} (Sec ${s})`;
}

/**
 * Returns distinct, sorted sections for a class from students and configured sections.
 * Always returns at least ['A'].
 */
export function getSectionsOfClass(
  students: Student[],
  classId?: string,
  configuredSections?: (ClassSection | string)[]
): string[] {
  const set = new Set<string>();

  // Add from configured list
  if (configuredSections && Array.isArray(configuredSections)) {
    configuredSections.forEach((cs) => {
      if (typeof cs === 'string') {
        if (cs.trim()) set.add(cs.trim().toUpperCase());
      } else if (cs && typeof cs === 'object' && cs.id) {
        set.add(cs.id.trim().toUpperCase());
      }
    });
  }

  // Add from existing students in this class
  if (students && Array.isArray(students)) {
    students.forEach((s) => {
      if (!classId || s.classId === classId) {
        set.add(normalizeSection(s.section));
      }
    });
  }

  if (set.size === 0) {
    set.add('A');
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Sorting students:
 * - When multiSection is true (or section difference exists), sorts by Section first, then by numeric Roll No.
 * - When within the same section, sorts purely by numeric Roll No. ascending.
 */
export function sortByRollNo(students: Student[], forceMultiSection: boolean = false): Student[] {
  return [...students].sort((a, b) => {
    const secA = normalizeSection(a.section);
    const secB = normalizeSection(b.section);

    if (forceMultiSection || secA !== secB) {
      if (secA !== secB) {
        return secA.localeCompare(secB);
      }
    }

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
 * Returns highest numeric roll number currently assigned in a Class + Section.
 */
export function getHighestRollNo(
  students: Student[],
  classId: string,
  academicYear?: string,
  section?: string
): number {
  const targetSection = section ? normalizeSection(section) : undefined;

  const classStudents = students.filter((s) => {
    if (s.classId !== classId) return false;
    if (academicYear && s.academicYear && s.academicYear !== academicYear) return false;
    if (s.active === false) return false;
    if (targetSection && normalizeSection(s.section) !== targetSection) return false;
    return true;
  });

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
 * Calculates next available sequential roll number (highest + 1) within a Section.
 */
export function getNextRollNo(
  students: Student[],
  classId: string,
  academicYear?: string,
  section?: string
): number {
  return getHighestRollNo(students, classId, academicYear, section) + 1;
}

/**
 * Alias matching requirement: nextRollNo(classId, section, students, academicYear)
 */
export function nextRollNo(
  students: Student[],
  classId: string,
  section: string = 'A',
  academicYear?: string
): number {
  return getNextRollNo(students, classId, academicYear, section);
}

/**
 * Detects duplicate roll numbers strictly within each Section of a class & academic year.
 * Two students with Roll 1 in Section A and Roll 1 in Section B are VALID.
 */
export function checkDuplicateRollNos(
  students: Student[],
  classId: string,
  academicYear?: string,
  sectionFilter?: string
): {
  hasDuplicates: boolean;
  duplicates: string[];
  duplicatesBySection: Record<string, string[]>;
} {
  const normFilter = sectionFilter && sectionFilter !== 'all' ? normalizeSection(sectionFilter) : null;

  const classStudents = students.filter((s) => {
    if (s.classId !== classId) return false;
    if (academicYear && s.academicYear && s.academicYear !== academicYear) return false;
    if (s.active === false) return false;
    if (normFilter && normalizeSection(s.section) !== normFilter) return false;
    return true;
  });

  // Group by section -> rollNo -> count
  const sectionRollCount: Record<string, Map<string, number>> = {};
  const duplicatesBySection: Record<string, string[]> = {};
  const allDuplicates: string[] = [];

  classStudents.forEach((s) => {
    const sec = normalizeSection(s.section);
    const r = (s.rollNo || '').trim();
    if (!r) return;

    if (!sectionRollCount[sec]) {
      sectionRollCount[sec] = new Map<string, number>();
    }
    const map = sectionRollCount[sec];
    map.set(r, (map.get(r) || 0) + 1);
  });

  Object.entries(sectionRollCount).forEach(([sec, map]) => {
    const dupes: string[] = [];
    map.forEach((count, roll) => {
      if (count > 1) {
        dupes.push(roll);
        allDuplicates.push(`Roll ${roll} (Sec ${sec})`);
      }
    });
    if (dupes.length > 0) {
      duplicatesBySection[sec] = dupes;
    }
  });

  return {
    hasDuplicates: allDuplicates.length > 0,
    duplicates: allDuplicates,
    duplicatesBySection,
  };
}

/**
 * Build one shared ordered list of students for an examination, with optional section filter:
 * - Active students
 * - Enrolled in this exam
 * - Not marked as "not_appearing" for this exam
 * - Filtered by section if specified (unless 'all')
 * - When all sections: sorted by Section (A, B, ...) then Roll No. numerically
 * - When single section: sorted strictly by Roll No. numerically
 */
export function getOrderedExamStudents(
  examId: string,
  allStudents: Student[],
  examStudentsMap: Record<string, string[]>,
  studentExamStatuses: Record<string, any>,
  sectionFilter?: string
): Student[] {
  const enrolledIds = examStudentsMap[examId] || [];
  const targetSection = sectionFilter && sectionFilter !== 'all' ? normalizeSection(sectionFilter) : null;

  const list = allStudents.filter((s) => {
    if (!s.active) return false;
    if (!enrolledIds.includes(s.id)) return false;
    const statusRec = studentExamStatuses[`${examId}_${s.id}`];
    if (statusRec && statusRec.status === 'not_appearing') return false;
    if (targetSection && normalizeSection(s.section) !== targetSection) return false;
    return true;
  });

  return sortByRollNo(list, !targetSection);
}

/**
 * Alias matching requirement: getExamStudents(examId, section)
 */
export function getExamStudents(
  examId: string,
  allStudents: Student[],
  examStudentsMap: Record<string, string[]>,
  studentExamStatuses: Record<string, any>,
  section?: string
): Student[] {
  return getOrderedExamStudents(examId, allStudents, examStudentsMap, studentExamStatuses, section);
}

/**
 * Finds the NEXT student for marks entry navigation:
 * - RESTRICTED STRICTLY TO THE SAME SECTION.
 * - Roll 1 -> Roll 2 -> Roll 3 of Section A.
 * - Does NOT automatically jump across into Section B.
 * - Returns null when the last student of the current section has been reached.
 */
export function getNextStudent(
  currentStudent: Student,
  allExamStudents: Student[],
  marksStatus: Record<string, string>,
  examId: string,
  skipCompleted: boolean
): Student | null {
  const curSection = normalizeSection(currentStudent.section);
  // Restrict pool to the SAME section
  const sectionStudents = sortByRollNo(
    allExamStudents.filter((s) => normalizeSection(s.section) === curSection)
  );

  const currentIndex = sectionStudents.findIndex((s) => s.id === currentStudent.id);
  if (currentIndex === -1) {
    return sectionStudents[0] || null;
  }

  for (let i = currentIndex + 1; i < sectionStudents.length; i++) {
    const candidate = sectionStudents[i];
    if (!skipCompleted) {
      return candidate;
    }
    const status = marksStatus[`${examId}_${candidate.id}`];
    if (status !== 'completed') {
      return candidate;
    }
  }

  return null;
}

/**
 * Extended navigation helper that reports section completion and the next section's starting candidate:
 */
export function getNextStudentWithSectionInfo(
  currentStudent: Student,
  allExamStudents: Student[],
  marksStatus: Record<string, string>,
  examId: string,
  skipCompleted: boolean
): {
  nextStudent: Student | null;
  isSectionFinished: boolean;
  currentSection: string;
  nextSection: string | null;
  nextSectionFirstStudent: Student | null;
  currentSectionTotal: number;
  currentSectionIndex: number;
} {
  const curSection = normalizeSection(currentStudent.section);
  const sectionStudents = sortByRollNo(
    allExamStudents.filter((s) => normalizeSection(s.section) === curSection)
  );

  const currentIndex = sectionStudents.findIndex((s) => s.id === currentStudent.id);
  const currentSectionTotal = sectionStudents.length;
  const currentSectionIndex = currentIndex >= 0 ? currentIndex + 1 : 1;

  // Check next in same section
  const nextInSameSection = getNextStudent(
    currentStudent,
    allExamStudents,
    marksStatus,
    examId,
    skipCompleted
  );

  if (nextInSameSection) {
    return {
      nextStudent: nextInSameSection,
      isSectionFinished: false,
      currentSection: curSection,
      nextSection: null,
      nextSectionFirstStudent: null,
      currentSectionTotal,
      currentSectionIndex,
    };
  }

  // Current section is finished! Look for next available section
  const allSections = getSectionsOfClass(allExamStudents);
  const secIdx = allSections.indexOf(curSection);
  const nextSec = secIdx >= 0 && secIdx < allSections.length - 1 ? allSections[secIdx + 1] : null;

  let nextSectionFirstStudent: Student | null = null;
  if (nextSec) {
    const nextSecStudents = sortByRollNo(
      allExamStudents.filter((s) => normalizeSection(s.section) === nextSec)
    );
    nextSectionFirstStudent = nextSecStudents[0] || null;
  }

  return {
    nextStudent: null,
    isSectionFinished: true,
    currentSection: curSection,
    nextSection: nextSec,
    nextSectionFirstStudent,
    currentSectionTotal,
    currentSectionIndex,
  };
}

/**
 * Finds the PREVIOUS student for marks entry navigation:
 * - RESTRICTED TO THE SAME SECTION.
 */
export function getPreviousStudent(
  currentStudent: Student,
  allExamStudents: Student[]
): Student | null {
  const curSection = normalizeSection(currentStudent.section);
  const sectionStudents = sortByRollNo(
    allExamStudents.filter((s) => normalizeSection(s.section) === curSection)
  );

  const currentIndex = sectionStudents.findIndex((s) => s.id === currentStudent.id);
  if (currentIndex <= 0) {
    return null;
  }
  return sectionStudents[currentIndex - 1];
}

/**
 * Calculates new sequential roll numbers for students based on chosen ordering:
 * - If sectionFilter is provided (and not 'all'), renumbers only that section.
 * - If sectionFilter is 'all', renumbers each section separately starting from startFrom.
 */
export function renumberStudents(
  classStudents: Student[],
  mode: 'current' | 'alphabetical' | 'regNo',
  startFrom: number = 1,
  sectionFilter?: string
): { studentId: string; oldRollNo: string; newRollNo: string; section: string }[] {
  const targetSection = sectionFilter && sectionFilter !== 'all' ? normalizeSection(sectionFilter) : null;

  if (targetSection) {
    const filtered = classStudents.filter((s) => normalizeSection(s.section) === targetSection);
    return renumberSingleSection(filtered, mode, startFrom, targetSection);
  }

  // Renumber all sections separately
  const sections = getSectionsOfClass(classStudents);
  const results: { studentId: string; oldRollNo: string; newRollNo: string; section: string }[] = [];

  sections.forEach((sec) => {
    const secStudents = classStudents.filter((s) => normalizeSection(s.section) === sec);
    const renumbered = renumberSingleSection(secStudents, mode, startFrom, sec);
    results.push(...renumbered);
  });

  return results;
}

function renumberSingleSection(
  students: Student[],
  mode: 'current' | 'alphabetical' | 'regNo',
  startFrom: number,
  section: string
): { studentId: string; oldRollNo: string; newRollNo: string; section: string }[] {
  const list = [...students];

  if (mode === 'alphabetical') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'regNo') {
    list.sort((a, b) => (a.registrationNo || '').localeCompare(b.registrationNo || ''));
  } else {
    // Current order
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
      section,
    };
  });
}
