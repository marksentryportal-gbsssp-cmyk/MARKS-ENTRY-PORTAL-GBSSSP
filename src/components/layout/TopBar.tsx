import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  LogOut,
  ShieldCheck,
  ChevronDown,
  User as UserIcon,
  KeyRound,
  Users,
  ShieldAlert,
  Activity,
  Flame,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { SchoolLogo } from '../common/SchoolLogo';

export const TopBar: React.FC = () => {
  const {
    schoolInfo,
    currentUser,
    setIsMobileDrawerOpen,
    setIsLogoutModalOpen,
    setIsChangePasswordOpen,
    navigateTo,
    isFirebaseConnected,
    setIsFirebaseModalOpen,
  } = usePortal();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {/* Central School Logo emblem icon */}
          <SchoolLogo size={28} shape="circle" className="hidden sm:inline-flex shrink-0" />
          <span className="font-bold text-slate-800 text-sm md:text-base tracking-tight select-none">
            {schoolInfo.boardName?.includes('ANKUR TO XII')
              ? schoolInfo.boardName
              : 'MARKS ENTRY PORTAL , CLASS: ANKUR TO XII (ARTS)'}
          </span>
        </div>
      </div>

      {/* Right zone: School Code in dark red (#b91c1c), Profile Dropdown, and Logout button */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* ASSEB School Code badge */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            School Code:
          </span>
          <span className="text-[#b91c1c] font-bold text-xs sm:text-sm md:text-base font-mono tracking-wide">
            {schoolInfo.code}
          </span>
        </div>

        {/* Firebase Cloud Status Button */}
        <button
          type="button"
          onClick={() => setIsFirebaseModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            isFirebaseConnected
              ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
          }`}
          title="Cloud Firestore Database Connection & Data Migration"
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">{isFirebaseConnected ? 'Cloud Live' : 'Connect Cloud'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Profile Dropdown showing School UDISE Code */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 bg-slate-50/70 hover:bg-slate-100 transition-all text-left cursor-pointer group"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold uppercase shadow-2xs">
                {currentUser.name ? currentUser.name.charAt(0) : 'U'}
              </div>

              <div className="hidden md:block text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-mono text-teal-800 font-semibold block">
                  UDISE: {schoolInfo.udiseCode || currentUser.udiseCode}
                </span>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* User info banner inside dropdown with SchoolLogo */}
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3">
                  <SchoolLogo size={36} shape="circle" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] font-mono text-teal-700 font-semibold truncate">
                      UDISE: {schoolInfo.udiseCode || currentUser.udiseCode}
                    </p>
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900">
                      Role: {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigateTo('/diagnostics');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-teal-600" />
                    <span>Session Diagnostics</span>
                  </button>

                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigateTo('/users');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>User Management</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsFirebaseModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Cloud Firestore & Sync</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors text-left cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Standalone Logout Button */}
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-slate-600 hover:text-[#b91c1c] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors text-xs md:text-sm font-medium cursor-pointer"
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
