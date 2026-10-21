import React, { useState, useRef } from 'react';
import { Camera, GraduationCap } from 'lucide-react';

interface SchoolLogoProps {
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ size = 'md', editable = true }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-20 h-20 text-sm',
    lg: 'w-28 h-28 text-base',
  }[size];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  return (
    <div className="relative group flex flex-col items-center">
      <div
        className={`${sizeClasses} rounded-full border-2 border-slate-600 bg-slate-800/80 flex items-center justify-center overflow-hidden shadow-inner relative transition-transform duration-200 group-hover:border-teal-400`}
        title="Gopinath Bordoloi Senior Secondary School Seal"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="School Logo"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center select-none">
            {/* Government / School Seal SVG Emblem */}
            <div className="w-9 h-9 rounded-full bg-teal-900/60 border border-teal-500/50 flex items-center justify-center text-teal-300 mb-0.5">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold tracking-wider text-slate-200 uppercase leading-none">
              GBSSS
            </span>
            <span className="text-[7px] text-teal-300 font-medium tracking-tight">
              ESTD.
            </span>
          </div>
        )}

        {editable && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px]"
            title="Click to change logo"
            aria-label="Upload custom school logo"
          >
            <Camera className="w-4 h-4 mb-0.5" />
            <span>Change</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};
