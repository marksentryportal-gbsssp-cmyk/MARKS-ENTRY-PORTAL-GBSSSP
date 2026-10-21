import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { downloadSampleExcelTemplate } from '../../utils/excelUtils';

interface FileDropzoneProps {
  className: string;
  academicYear: string;
  onFileLoaded: (file: File) => void;
  isLoading?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  className,
  academicYear,
  onFileLoaded,
  isLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
      {/* Top Banner with Sample Excel Download */}
      <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-teal-900 block text-xs">
            Download Official Spreadsheet Template (.xlsx)
          </span>
          <p className="text-teal-800 text-[11px]">
            Pre-formatted with the exact 9 columns required by the ASSEB-DI portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadSampleExcelTemplate(className, academicYear)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-400 text-teal-800 hover:bg-teal-50 hover:border-teal-600 rounded-md text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-teal-700" />
          <span>Download Sample Excel Template</span>
        </button>
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
          or click anywhere in this area to select from your computer
        </p>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f766e] hover:bg-teal-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer pointer-events-none"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Choose File (.xlsx, .xls, .csv)</span>
        </button>

        <span className="text-[11px] text-slate-400 block mt-2">
          Maximum file size: 5 MB (up to 1,000 student records)
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
          <span>Important Formatting Rules:</span>
        </span>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
          <li>
            <strong>Required Fields:</strong> Student Name, Father&apos;s Name, and Date of Birth (DOB) are mandatory.
          </li>
          <li>
            <strong>DOB Format:</strong> Must be in <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">dd-mm-yyyy</code> (e.g., 15-08-2011). Excel serial dates and <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">dd/mm/yyyy</code> are also auto-converted.
          </li>
          <li>
            <strong>Gender:</strong> Must be <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">Male</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">Female</code>, or <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">Other</code> (abbreviations like M/F are auto-normalized).
          </li>
          <li>
            <strong>Registration No:</strong> If omitted, the portal will automatically generate a sequential board registration number.
          </li>
        </ul>
      </div>
    </div>
  );
};
