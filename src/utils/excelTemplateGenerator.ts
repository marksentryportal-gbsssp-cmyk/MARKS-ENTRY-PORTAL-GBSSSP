import ExcelJS from 'exceljs';
import { ClassInfo, Student } from '../types';

export const TEMPLATE_COLUMNS = [
  { header: 'Student Name *', key: 'name', width: 28 },
  { header: 'Class *', key: 'class', width: 14 },
  { header: 'Section *', key: 'section', width: 12 },
  { header: 'Roll No.', key: 'rollNo', width: 12 },
  { header: 'Date of Birth *', key: 'dob', width: 16 },
  { header: 'Gender *', key: 'gender', width: 14 },
  { header: 'Current Address', key: 'address', width: 32 },
  { header: "Father's Name *", key: 'fatherName', width: 26 },
  { header: "Mother's Name", key: 'motherName', width: 26 },
] as const;

/**
 * Downloads the official student admission Excel template using ExcelJS.
 * Features:
 * - Frozen colored header
 * - Dropdown data validation for Class, Section, and Gender
 * - Text formatting (@) for DOB column to preserve dd-mm-yyyy
 * - Two light-grey sample rows
 * - Dedicated Instructions sheet
 */
export async function downloadExcelTemplate(options: {
  className?: string;
  academicYear?: string;
  availableClasses: ClassInfo[];
  existingStudents?: Student[];
}): Promise<void> {
  const { className = 'Nine', academicYear = '2026-2027', availableClasses, existingStudents } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Internal Examination Portal';
  workbook.created = new Date();

  // ----------------------------------------------------
  // SHEET 1: Students
  // ----------------------------------------------------
  const sheet = workbook.addWorksheet('Students', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  sheet.columns = TEMPLATE_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style Header Row (Row 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Teal
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0D5F58' } },
      bottom: { style: 'medium', color: { argb: 'FF0D5F58' } },
      left: { style: 'thin', color: { argb: 'FF0D5F58' } },
      right: { style: 'thin', color: { argb: 'FF0D5F58' } },
    };
  });

  // Allowed values for drop-downs
  const classListStr = `"${availableClasses.map((c) => c.name).join(',')}"`;
  const sectionListStr = '"A,B,C,D"';
  const genderListStr = '"Male,Female,Other"';

  // Apply dropdown data validation and text formatting to data rows (rows 2 to 500)
  for (let r = 2; r <= 500; r++) {
    const row = sheet.getRow(r);

    // Column 2: Class dropdown
    row.getCell(2).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [classListStr],
      showErrorMessage: true,
      errorTitle: 'Invalid Class',
      error: 'Please select one of the 14 approved classes from the dropdown list.',
    };

    // Column 3: Section dropdown
    row.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [sectionListStr],
      showErrorMessage: true,
      errorTitle: 'Invalid Section',
      error: 'Please select an approved section (A, B, C, or D).',
    };

    // Column 5: Date of Birth as Plain Text
    row.getCell(5).numFmt = '@';

    // Column 6: Gender dropdown
    row.getCell(6).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [genderListStr],
      showErrorMessage: true,
      errorTitle: 'Invalid Gender',
      error: 'Please select Male, Female, or Other from the dropdown list.',
    };
  }

  // If pre-filling existing students (Pre-fill option)
  if (existingStudents && existingStudents.length > 0) {
    existingStudents.forEach((student, idx) => {
      const clsName =
        availableClasses.find((c) => c.id === student.classId)?.name || className;
      const r = sheet.addRow({
        name: student.name,
        class: clsName,
        section: student.section || 'A',
        rollNo: student.rollNo,
        dob: student.dob,
        gender: student.gender,
        address: student.currentAddress || '',
        fatherName: student.fatherName,
        motherName: student.motherName || '',
      });
      r.height = 20;
      r.alignment = { vertical: 'middle', horizontal: 'left' };
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    });
  } else {
    // Two clearly marked sample rows in light grey that the importer ignores if untouched
    const sample1 = sheet.addRow({
      name: 'RIMA CHOUDHURY',
      class: className,
      section: 'A',
      rollNo: 1,
      dob: '13-12-2011',
      gender: 'Female',
      address: 'Paglahat, Dhubri',
      fatherName: 'PRANJAL CHOUDHURY',
      motherName: 'MINATI CHOUDHURY',
    });
    const sample2 = sheet.addRow({
      name: 'RAHUL DAS',
      class: className,
      section: 'A',
      rollNo: 2,
      dob: '20-05-2011',
      gender: 'Male',
      address: 'Paglahat, Dhubri',
      fatherName: 'BIREN DAS',
      motherName: 'REKHA DAS',
    });

    [sample1, sample2].forEach((row) => {
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }, // Light slate
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    });
  }

  // ----------------------------------------------------
  // SHEET 2: Instructions
  // ----------------------------------------------------
  const instrSheet = workbook.addWorksheet('Instructions');
  instrSheet.columns = [
    { header: '#', key: 'num', width: 6 },
    { header: 'Rule / Guideline', key: 'rule', width: 32 },
    { header: 'Description and Format', key: 'desc', width: 70 },
  ];

  const instrHeader = instrSheet.getRow(1);
  instrHeader.height = 26;
  instrHeader.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark slate
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  const instructionsData = [
    {
      num: 1,
      rule: 'One student per row',
      desc: 'Each row in the "Students" sheet represents a single student record.',
    },
    {
      num: 2,
      rule: 'Student Name in CAPITAL LETTERS',
      desc: 'Enter the full student name in uppercase as per school admission/birth certificate records. Only letters, spaces, dots (.), and apostrophes (\') are allowed.',
    },
    {
      num: 3,
      rule: 'Date of Birth format: dd-mm-yyyy',
      desc: 'Enter dates exactly in dd-mm-yyyy format (e.g. 13-12-2011). The column is pre-formatted as text to prevent Excel auto-conversion.',
    },
    {
      num: 4,
      rule: 'Allowed Gender values',
      desc: 'Select from the dropdown: "Male", "Female", or "Other".',
    },
    {
      num: 5,
      rule: 'Automatic Roll Numbers',
      desc: 'Leave Roll No. blank if you want automatic sequential numbering (1, 2, 3...) in file order continuing after the highest existing roll number.',
    },
    {
      num: 6,
      rule: 'Do not rename headers',
      desc: 'Do not modify, remove, or rearrange the column headers in Row 1 of the Students sheet.',
    },
    {
      num: 7,
      rule: 'Do not merge cells',
      desc: 'Keep every cell separate. Merged cells will cause import errors.',
    },
    {
      num: 8,
      rule: 'Sample rows in light grey',
      desc: 'The two grey rows are sample demonstrations. If left unchanged, the importer automatically skips them.',
    },
  ];

  instructionsData.forEach((item) => {
    const r = instrSheet.addRow(item);
    r.height = 22;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F766E' } };
    r.getCell(3).font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
  });

  // Write and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = existingStudents
    ? `Class_${sanitizedClassName}_Student_Roster_${academicYear}.xlsx`
    : `Student_Admission_Template_Class_${sanitizedClassName}_${academicYear}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
