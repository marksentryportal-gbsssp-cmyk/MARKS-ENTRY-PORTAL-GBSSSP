import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, Users } from 'lucide-react';
import { ClassInfo, Student } from '../../types';
import { downloadExcelTemplate } from '../../utils/excelTemplateGenerator';

interface FileDropzoneProps {
  className: string;
  targetClassId: string;
  academicYear: string;
  availableClasses: ClassInfo[];
  existingStudents: Student[];
  onFileLoaded: (file: File) => void;
  isLoading?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  className,
  targetClassId,
  academicYear,
  availableClasses,
  existingStudents,
  onFileLoaded,
  isLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndPassFile = (file: File) => {
    setFileError(null);

    // Max 5 MB check
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File exceeds 5 MB maximum size limit. Please upload a smaller file.');
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setFileError('Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    onFileLoaded(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndPassFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndPassFile(files[0]);
    }
  };

  const handleDownloadBlankTemplate = async () => {
    try {
      setIsDownloading(true);
      await downloadExcelTemplate({
        className,
        academicYear,
        availableClasses,
      });
    } catch (e) {
      console.error('Failed to download template', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPrefilledTemplate = async () => {
    try {
      setIsDownloading(true);
      const classStudents = existingStudents.filter(
        (s) => s.classId === targetClassId && s.academicYear === academicYear && s.active !== false
      );
      await downloadExcelTemplate({
        className,
        academicYear,
        availableClasses,
        existingStudents: classStudents,
      });
    } catch (e) {
      console.error('Failed to download pre-filled template', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Two Template Download Buttons */}
      <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-teal-900 block text-xs">
            Download Official Spreadsheet Template (.xlsx)
          </span>
          <p className="text-teal-800 text-[11px]">
            Created with ExcelJS: native drop-downs for Class, Section, and Gender, frozen teal header, and text-formatted DOB column.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadBlankTemplate}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-400 text-teal-800 hover:bg-teal-50 hover:border-teal-600 rounded-md text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Download Excel Template</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPrefilledTemplate}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Export existing student roster to update and re-import"
          >
            <Users className="w-3.5 h-3.5 text-teal-100" />
            <span>Download Template with Current Students</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-teal-600 bg-teal-50/80 scale-[1.01]'
            : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50/80'
        }`}
      >
        <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-3 text-teal-700">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h4 className="text-sm font-bold text-slate-800 mb-1">
          Drag &amp; drop your Excel or CSV file here
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          or click anywhere in this area to select from your computer (.xlsx, .xls, .csv up to 5 MB)
        </p>

        <button
          type="button"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f766e] hover:bg-teal-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer pointer-events-none"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isLoading ? 'Reading File...' : 'Choose File'}</span>
        </button>

        <span className="text-[11px] text-slate-400 block mt-2">
          Column headers detected automatically &bull; Sample rows ignored &bull; Safe error-correction step
        </span>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File error */}
      {fileError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Guidelines & Rules Note */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1.5">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-teal-700" />
          <span>Bulk Import Rules &amp; Safe Review:</span>
        </span>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
          <li>
            <strong>9 Standard Columns:</strong> Student Name | Class | Section | Roll No. | Date of Birth | Gender | Current Address | Father&apos;s Name | Mother&apos;s Name.
          </li>
          <li>
            <strong>Required Fields:</strong> Student Name, Class, Section, Date of Birth, Gender, and Father&apos;s Name.
          </li>
          <li>
            <strong>Date of Birth:</strong> Accepted format is <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">dd-mm-yyyy</code> (e.g. 13-12-2011). Slashes and Excel date serials will be automatically detected and converted.
          </li>
          <li>
            <strong>Blank Roll Numbers:</strong> If left empty, roll numbers will be automatically assigned sequentially (1, 2, 3...) based on the highest existing roll number in the class.
          </li>
          <li>
            <strong>Safe Review:</strong> You can edit any cell directly in the next step, resolve errors, delete unwanted rows, and review duplicate warnings before committing to the school database.
          </li>
        </ul>
      </div>
    </div>
  );
};
