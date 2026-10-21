import React from 'react';
import { PortalProvider, usePortal } from './store/portalStore';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { PageHeader } from './components/layout/PageHeader';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/Toast';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { MarksEntryPage } from './components/marks-entry/MarksEntryPage';
import { ResultPage } from './components/result/ResultPage';
import { ExamSetupPage } from './components/exam-setup/ExamSetupPage';
import { ChecklistPage } from './components/pages/ChecklistPage';
import { FinalSubmitPage } from './components/pages/FinalSubmitPage';
import { LogoutModal } from './components/common/LogoutModal';
import { SupportEditModal } from './components/common/SupportEditModal';

const PortalRouter: React.FC = () => {
  const { currentRoute } = usePortal();

  return (
    <main className="w-full">
      {/* Universal Page Header Area (portal title, school name, code) */}
      <PageHeader />

      {/* Routed Active Page */}
      {currentRoute.tab === 'dashboard' && <DashboardPage />}
      {currentRoute.tab === 'marks-entry' && (
        <MarksEntryPage
          classId={currentRoute.classId}
          examId={currentRoute.examId}
          studentId={currentRoute.studentId}
        />
      )}
      {currentRoute.tab === 'result' && <ResultPage />}
      {currentRoute.tab === 'exam-setup' && <ExamSetupPage />}
      {currentRoute.tab === 'checklist' && <ChecklistPage />}
      {currentRoute.tab === 'final-submit' && <FinalSubmitPage />}
    </main>
  );
};

const PortalLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans flex flex-col antialiased">
      {/* Left Sidebar (Fixed 240px desktop, slide-out drawer on mobile) */}
      <Sidebar />

      {/* Main Container offset for fixed 240px sidebar on desktop */}
      <div className="flex-1 flex flex-col md:pl-60 print:pl-0">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content Viewport */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          <PortalRouter />

          {/* Footer bar on every page */}
          <Footer />
        </div>
      </div>

      {/* Modals & Overlays */}
      <LogoutModal />
      <SupportEditModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <PortalProvider>
      <PortalLayout />
    </PortalProvider>
  );
}
