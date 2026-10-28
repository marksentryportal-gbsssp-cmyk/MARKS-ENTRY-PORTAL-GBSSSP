import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Volume2,
  VolumeX,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { SchoolLogo } from '../common/SchoolLogo';

interface BellScheduleItem {
  period: string;
  time: string;
  type: 'assembly' | 'class' | 'break' | 'recess' | 'dismissal';
}

const defaultBellSchedule: BellScheduleItem[] = [
  { period: 'Morning Assembly & Prayer', time: '09:00 AM', type: 'assembly' },
  { period: '1st Period', time: '09:30 AM', type: 'class' },
  { period: '2nd Period', time: '10:15 AM', type: 'class' },
  { period: 'Short Break', time: '11:00 AM', type: 'break' },
  { period: '3rd Period', time: '11:15 AM', type: 'class' },
  { period: '4th Period', time: '12:00 PM', type: 'class' },
  { period: 'Mid-Day Meal & Recess', time: '12:45 PM', type: 'recess' },
  { period: '5th Period', time: '01:30 PM', type: 'class' },
  { period: '6th Period', time: '02:15 PM', type: 'class' },
  { period: 'School Dismissal Bell', time: '03:00 PM', type: 'dismissal' },
];

export const BellModePage: React.FC = () => {
  const { schoolInfo, navigateTo, currentUser } = usePortal();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-teal-700">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => navigateTo(currentUser ? '/dashboard' : '/login')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentUser ? 'Return to Dashboard' : 'Return to Login'}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Central Clock & Logo display */}
      <div className="my-auto text-center space-y-6 max-w-2xl mx-auto py-8">
        {/* School Logo: large, centered with the clock */}
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
            <SchoolLogo size={96} shape="none" darkBackground={true} alt="School Logo" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight uppercase">
            {schoolInfo.name}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-teal-400">
            ASSEB Code: {schoolInfo.code} • UDISE: {schoolInfo.udiseCode}
          </p>
        </div>

        {/* Digital Clock */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-md">
          <div className="text-5xl sm:text-7xl md:text-8xl font-mono font-black tracking-tight text-white drop-shadow-md">
            {formattedTime}
          </div>
          <div className="text-sm sm:text-base font-semibold text-slate-400 mt-3 flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-semibold">
          <Bell className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>Automated Examination & School Bell Mode Active</span>
        </div>
      </div>

      {/* Footer Schedule Strip */}
      <div className="border-t border-slate-900 pt-4 text-center text-xs text-slate-500 font-medium">
        <span>Gopinath Bordoloi Senior Secondary School • Paglahat, Dhubri (Assam)</span>
      </div>
    </div>
  );
};
