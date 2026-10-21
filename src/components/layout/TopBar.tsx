import React from 'react';
import { Menu, LogOut, ShieldCheck } from 'lucide-react';
import { usePortal } from '../../store/portalStore';

export const TopBar: React.FC = () => {
  const { schoolInfo, setIsMobileDrawerOpen, setIsLogoutModalOpen } = usePortal();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200/90 shadow-xs h-14 md:h-16 px-4 md:px-6 flex items-center justify-between">
      {/* Left zone: Mobile hamburger & Board Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="md:hidden p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-teal-600"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Government seal emblem icon */}
          <div className="hidden sm:flex w-7 h-7 rounded-full bg-slate-100 border border-slate-300 items-center justify-center text-teal-800">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 text-sm md:text-base tracking-tight select-none">
            {schoolInfo.boardName}
          </span>
        </div>
      </div>

      {/* Right zone: School Code in dark red (#b91c1c) with Logout action */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            School Code:
          </span>
          <span className="text-[#b91c1c] font-bold text-sm md:text-base font-mono tracking-wide">
            {schoolInfo.code}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-slate-600 hover:text-[#b91c1c] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors text-xs md:text-sm font-medium"
          title="Sign out of portal"
          aria-label="Logout from school portal"
        >
          <LogOut className="w-4 h-4 text-[#b91c1c]" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
