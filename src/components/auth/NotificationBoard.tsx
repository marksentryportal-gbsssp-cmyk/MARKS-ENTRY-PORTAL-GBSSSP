import React from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import { usePortal } from '../../store/portalStore';

interface NotificationBoardProps {
  onOpenSupport?: () => void;
}

export const NotificationBoard: React.FC<NotificationBoardProps> = ({ onOpenSupport }) => {
  const { notifications, schoolInfo } = usePortal();
  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-[#f8fafc] border-b md:border-b-0 md:border-r border-slate-200 p-6 sm:p-8 flex flex-col justify-between h-full">
      {/* Top: Title & Notices */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0f766e]" />
            <h3 className="text-base font-bold text-[#0f766e] uppercase tracking-wide">
              Notification Board
            </h3>
          </div>
          {/* Thin teal underline */}
          <div className="h-0.5 w-full bg-[#0f766e]/30 mt-2" />
        </div>

        {/* Bullet list of notices */}
        <div className="space-y-3.5">
          {notifications && notifications.length > 0 ? (
            notifications.map((notice, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] shrink-0 mt-1.5" />
                <span>{notice}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] shrink-0 mt-1.5" />
                <span>Marks Entry Portal open from 05-09-2026 for Marks Entry of Unit Test 1.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] shrink-0 mt-1.5" />
                <span>All users have to login with their Institution Code and Password.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom: Copyright & Support */}
      <div className="pt-8 mt-6 border-t border-slate-200/60 text-center space-y-2">
        <p className="text-[11px] text-slate-500">
          Copyright &copy; {currentYear} - All Rights Reserved - {schoolInfo.name || 'Gopinath Bordoloi Sr. Sec. School'}
        </p>
        <button
          type="button"
          onClick={onOpenSupport}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f766e] hover:text-teal-800 underline transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help / Technical Support</span>
        </button>
      </div>
    </div>
  );
};
