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
import { LoginPage } from './components/auth/LoginPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { UserManagementTab } from './components/auth/UserManagementTab';
import { LogoutModal } from './components/common/LogoutModal';
import { InactivityModal } from './components/common/InactivityModal';
import { SupportEditModal } from './components/common/SupportEditModal';
import { FirebaseSetupModal } from './components/common/FirebaseSetupModal';
import { BellModePage } from './components/pages/BellModePage';
import { DiagnosticsPage } from './components/pages/DiagnosticsPage';

const PortalRouter: React.FC = () => {
  const { currentRoute } = usePortal();

  return (
    <main className="w-full">
      {/* School Information Section: visible on Dashboard ONLY */}
      {currentRoute.tab === 'dashboard' && <PageHeader />}

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
      {currentRoute.tab === 'users' && <UserManagementTab />}
      {currentRoute.tab === 'diagnostics' && <DiagnosticsPage />}
    </main>
  );
};

const PortalLayout: React.FC = () => {
  const {
    currentUser,
    currentRoute,
    isChangePasswordOpen,
    isForcedPasswordChange,
    setIsChangePasswordOpen,
    isFirebaseModalOpen,
    setIsFirebaseModalOpen,
  } = usePortal();

  // 1. Bell Mode: Public display mode that stays active regardless of auth status
  if (currentRoute.tab === 'bell-mode') {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">
        <BellModePage />
        <ToastContainer />
      </div>
    );
  }

  // 2. Forgot Password public page
  if (currentRoute.tab === 'forgot-password') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased">
        <ForgotPasswordPage />
        <SupportEditModal />
        <ToastContainer />
      </div>
    );
  }

  // 3. Diagnostics public troubleshooting page
  if (currentRoute.tab === 'diagnostics') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans p-4 sm:p-6 antialiased">
        <div className="max-w-4xl mx-auto">
          <DiagnosticsPage />
        </div>
        <ToastContainer />
      </div>
    );
  }

  // 4. Unauthenticated access: route to LoginPage
  if (!currentUser || currentRoute.tab === 'login') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans antialiased">
        <LoginPage />
        <SupportEditModal />
        <FirebaseSetupModal
          isOpen={isFirebaseModalOpen}
          onClose={() => setIsFirebaseModalOpen(false)}
        />
        <ToastContainer />
      </div>
    );
  }

  // 4. Authenticated main portal layout
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
      <InactivityModal />
      <SupportEditModal />
      <FirebaseSetupModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        isForced={isForcedPasswordChange}
        onClose={() => setIsChangePasswordOpen(false)}
      />
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
