import { Subject } from '../types';

export const initialSubjects: Subject[] = [
  // Ankur
  { id: 'sub-ankur-1', classId: 'ankur', name: 'English', fullMarks: 50, passMarks: 17, order: 1, type: 'marks' },
  { id: 'sub-ankur-2', classId: 'ankur', name: 'Assamese', fullMarks: 50, passMarks: 17, order: 2, type: 'marks' },
  { id: 'sub-ankur-3', classId: 'ankur', name: 'Mathematics', fullMarks: 50, passMarks: 17, order: 3, type: 'marks' },
  { id: 'sub-ankur-4', classId: 'ankur', name: 'Drawing & Craft', fullMarks: 50, passMarks: 17, order: 4, type: 'grade' },

  // P.P
  { id: 'sub-pp-1', classId: 'pp', name: 'English', fullMarks: 50, passMarks: 17, order: 1, type: 'marks' },
  { id: 'sub-pp-2', classId: 'pp', name: 'Assamese', fullMarks: 50, passMarks: 17, order: 2, type: 'marks' },
  { id: 'sub-pp-3', classId: 'pp', name: 'Mathematics', fullMarks: 50, passMarks: 17, order: 3, type: 'marks' },
  { id: 'sub-pp-4', classId: 'pp', name: 'Drawing & Craft', fullMarks: 50, passMarks: 17, order: 4, type: 'grade' },

  // One to Five
  ...(['one', 'two', 'three', 'four', 'five'] as const).flatMap((cid) => [
    { id: `sub-${cid}-1`, classId: cid, name: 'Assamese', fullMarks: 100, passMarks: 33, order: 1, type: 'marks' as const },
    { id: `sub-${cid}-2`, classId: cid, name: 'English', fullMarks: 100, passMarks: 33, order: 2, type: 'marks' as const },
    { id: `sub-${cid}-3`, classId: cid, name: 'Mathematics', fullMarks: 100, passMarks: 33, order: 3, type: 'marks' as const },
    { id: `sub-${cid}-4`, classId: cid, name: 'Environmental Studies (EVS)', fullMarks: 100, passMarks: 33, order: 4, type: 'marks' as const },
    { id: `sub-${cid}-5`, classId: cid, name: 'Hindi', fullMarks: 100, passMarks: 33, order: 5, type: 'marks' as const },
  ]),

  // Six to Eight
  ...(['six', 'seven', 'eight'] as const).flatMap((cid) => [
    { id: `sub-${cid}-1`, classId: cid, name: 'MIL (Assamese)', fullMarks: 100, passMarks: 33, order: 1, type: 'marks' as const },
    { id: `sub-${cid}-2`, classId: cid, name: 'English', fullMarks: 100, passMarks: 33, order: 2, type: 'marks' as const },
    { id: `sub-${cid}-3`, classId: cid, name: 'General Mathematics', fullMarks: 100, passMarks: 33, order: 3, type: 'marks' as const },
    { id: `sub-${cid}-4`, classId: cid, name: 'General Science', fullMarks: 100, passMarks: 33, order: 4, type: 'marks' as const },
    { id: `sub-${cid}-5`, classId: cid, name: 'Social Science', fullMarks: 100, passMarks: 33, order: 5, type: 'marks' as const },
    { id: `sub-${cid}-6`, classId: cid, name: 'Hindi', fullMarks: 100, passMarks: 33, order: 6, type: 'marks' as const },
  ]),

  // Nine & Ten (ASSEB-DI Curriculum)
  ...(['nine', 'ten'] as const).flatMap((cid) => [
    { id: `sub-${cid}-1`, classId: cid, name: 'MIL (Assamese)', fullMarks: 100, passMarks: 33, order: 1, type: 'marks' as const },
    { id: `sub-${cid}-2`, classId: cid, name: 'General English', fullMarks: 100, passMarks: 33, order: 2, type: 'marks' as const },
    { id: `sub-${cid}-3`, classId: cid, name: 'General Mathematics', fullMarks: 100, passMarks: 33, order: 3, type: 'marks' as const },
    { id: `sub-${cid}-4`, classId: cid, name: 'General Science', fullMarks: 100, passMarks: 33, order: 4, type: 'marks' as const },
    { id: `sub-${cid}-5`, classId: cid, name: 'Social Science', fullMarks: 100, passMarks: 33, order: 5, type: 'marks' as const },
    { id: `sub-${cid}-6`, classId: cid, name: 'Elective (Hindi)', fullMarks: 100, passMarks: 33, order: 6, type: 'marks' as const },
  ]),

  // Eleven & Twelve (Arts Stream)
  ...(['eleven', 'twelve'] as const).flatMap((cid) => [
    { id: `sub-${cid}-1`, classId: cid, name: 'MIL (Assamese)', fullMarks: 100, passMarks: 33, order: 1, type: 'marks' as const },
    { id: `sub-${cid}-2`, classId: cid, name: 'General English', fullMarks: 100, passMarks: 33, order: 2, type: 'marks' as const },
    { id: `sub-${cid}-3`, classId: cid, name: 'Political Science', fullMarks: 100, passMarks: 33, order: 3, type: 'marks' as const },
    { id: `sub-${cid}-4`, classId: cid, name: 'Education', fullMarks: 100, passMarks: 33, order: 4, type: 'marks' as const },
    { id: `sub-${cid}-5`, classId: cid, name: 'Economics', fullMarks: 100, passMarks: 33, order: 5, type: 'marks' as const },
    { id: `sub-${cid}-6`, classId: cid, name: 'History', fullMarks: 100, passMarks: 33, order: 6, type: 'marks' as const },
  ]),
];
