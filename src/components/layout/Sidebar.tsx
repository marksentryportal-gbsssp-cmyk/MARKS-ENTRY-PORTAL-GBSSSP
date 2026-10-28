import React from 'react';
import {
  LayoutDashboard,
  ClipboardPen,
  Award,
  Settings,
  ListChecks,
  SendHorizontal,
  X,
  MessageCircle,
  Phone,
  Edit2,
  Users as UsersIcon,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { NavigationTab } from '../../types';
import { SchoolLogo } from '../common/SchoolLogo';

interface NavItem {
  id: NavigationTab;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const topNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'marks-entry', label: 'Marks Entry', path: '/marks-entry', icon: ClipboardPen },
  { id: 'result', label: 'Result', path: '/result', icon: Award },
  { id: 'checklist', label: 'Checklist', path: '/checklist', icon: ListChecks },
  { id: 'final-submit', label: 'Final Submit', path: '/final-submit', icon: SendHorizontal },
  { id: 'users', label: 'User Management', path: '/users', icon: UsersIcon, adminOnly: true },
];

const examSetupItem: NavItem = {
  id: 'exam-setup',
  label: 'Exam Setup',
  path: '/exam-setup',
  icon: Settings,
};

export const Sidebar: React.FC = () => {
  const {
    currentRoute,
    currentUser,
    schoolInfo,
    navigateTo,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    supportContact,
    setIsSupportEditOpen,
  } = usePortal();

  const handleNavClick = (path: string) => {
    navigateTo(path);
    setIsMobileDrawerOpen(false);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentRoute.tab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item.path)}
        className={`w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium transition-all text-left group cursor-pointer ${
          isActive
            ? 'bg-[#334155] text-white border-l-4 border-[#3b82f6] shadow-sm pl-[10px]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-l-4 border-transparent pl-[10px]'
        }`}
      >
        <Icon
          className={`w-5 h-5 shrink-0 transition-colors ${
            isActive
              ? 'text-blue-400'
              : 'text-slate-400 group-hover:text-slate-200'
          }`}
        />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-slate-200">
      {/* Top Header & Logo Area */}
      <div>
        {/* Mobile close button inside drawer */}
        <div className="flex md:hidden justify-end p-3">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular School Logo Placeholder (Centered) */}
        <div className="pt-6 pb-4 px-4 flex flex-col items-center text-center border-b border-slate-700/60">
          <SchoolLogo
            size="md"
            shape="circle"
            darkBackground={true}
            editable={currentUser?.role === 'admin'}
            onEditClick={() => navigateTo('/result/settings')}
          />
          <h2 className="mt-3 text-xs font-semibold tracking-wide text-slate-200 uppercase line-clamp-1">
            Gopinath Bordoloi
          </h2>
          <p className="text-[11px] text-teal-400 font-medium">
            Sr. Sec. School, Paglahat
          </p>
          <div className="mt-1.5 flex flex-col items-center gap-1">
            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
              CODE: {schoolInfo.code}
            </div>
            <div className="text-[10px] font-mono text-teal-400 font-semibold">
              UDISE: {schoolInfo.udiseCode || '18000000000'}
            </div>
          </div>
        </div>

        {/* Menu Items (Dashboard, Marks Entry, Result, Checklist, Final Submit) */}
        <nav className="mt-4 px-2 space-y-1" aria-label="Portal Navigation">
          {topNavItems
            .filter((item) => !item.adminOnly || currentUser?.role === 'admin')
            .map((item) => renderNavItem(item))}
        </nav>
      </div>

      {/* Relocated Exam Setup in the empty space above WhatsApp Technical Support */}
      <div className="mt-auto">
        <div className="px-2 mb-2">
          {renderNavItem(examSetupItem)}
        </div>

        {/* Bottom: WhatsApp Technical Support Box (Yellow Text) */}
        <div className="p-3 m-3 rounded-lg bg-slate-900/90 border border-amber-500/30 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold tracking-tight">
            <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{supportContact.title}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSupportEditOpen(true)}
            title="Edit contact numbers"
            className="text-slate-400 hover:text-amber-300 p-1 rounded transition-colors cursor-pointer"
            aria-label="Edit technical support numbers"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {supportContact.numbers.map((phone, idx) => {
            const cleanNumber = phone.replace(/[^0-9]/g, '');
            return (
              <a
                key={idx}
                href={`https://wa.me/${cleanNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-yellow-300 hover:text-yellow-200 hover:underline transition-colors py-0.5 px-1 rounded hover:bg-slate-800/60"
                title={`Chat on WhatsApp: ${phone}`}
              >
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-amber-400/80" />
                  <span>{phone}</span>
                </span>
                <span className="text-[10px] text-teal-400 font-sans uppercase">Chat</span>
              </a>
            );
          })}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
          Helpdesk: 10:00 AM – 5:00 PM
        </div>
      </div>
    </div>
  </div>
);

  return (
    <>
      {/* Desktop Fixed Sidebar (240px wide) */}
      <aside className="hidden md:block fixed top-0 left-0 w-60 h-screen z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 left-0 w-64 h-full z-50 md:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
