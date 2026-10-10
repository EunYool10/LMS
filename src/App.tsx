import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { PolicyModal } from './components/common/PolicyModal';
import { MobileNotificationModal } from './components/common/MobileNotificationModal';
import { AdminSidebar } from './components/admin/AdminSidebar';

// Student Pages
import { HomePage } from './pages/HomePage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { LearnPage } from './pages/LearnPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountSettings } from './components/profile/AccountSettings';
import { UserProfilePage } from './pages/UserProfilePage';
import { BackToTop } from './components/common/BackToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminCourseEditorPage } from './pages/admin/AdminCourseEditorPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminCertificatesPage } from './pages/admin/AdminCertificatesPage';
import { AdminDiagnosticPage } from './pages/admin/AdminDiagnosticPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { AchievementNotificationListener } from './components/common/AchievementNotificationListener';

import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAdmin, isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal } = useAuth();

  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParam, setViewParam] = useState<string | undefined>(undefined);

  const handleNavigate = (view: string, param?: string) => {
    setCurrentView(view);
    setViewParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdminRoute = currentView.startsWith('admin-');
  const isLearnRoute = currentView === 'learn';

  return (
    <div className="min-h-screen min-h-screen-dvh flex flex-col bg-neutral-50 text-neutral-900 font-sans antialiased">
      {/* Top Universal Navbar */}
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* If Admin Area */}
        {isAdminRoute ? (
          !isAdmin ? (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 pb-safe-nav md:pb-8">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">관리자 전용 접근 제한</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {user
                    ? `현재 계정(${user.name})은 수강생(USER) 권한입니다. 서비스 총괄 또는 직책 관리자 권한이 있는 계정으로 로그인해주세요.`
                    : '이 페이지는 관리자 전용입니다. 서비스 총괄 또는 담당 관리자 계정으로 로그인 후 이용해 주십시오.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate('home')}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>홈으로</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>로그인 / 계정 변경</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row min-w-0">
              {/* Admin Sidebar */}
              <AdminSidebar currentView={currentView} onNavigate={handleNavigate} />

              {/* Admin Subpage Content */}
              <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-safe-nav md:pb-8 overflow-y-auto min-w-0">
                <div className="lms-container">
                  {currentView === 'admin-dashboard' && <AdminDashboardPage onNavigate={handleNavigate} />}
                  {currentView === 'admin-courses' && <AdminCoursesPage onNavigate={handleNavigate} />}
                  {currentView === 'admin-courses-create' && <AdminCourseEditorPage onNavigate={handleNavigate} />}
                  {currentView === 'admin-courses-edit' && (
                    <AdminCourseEditorPage courseId={viewParam} onNavigate={handleNavigate} />
                  )}
                  {currentView === 'admin-announcements' && <AdminAnnouncementsPage onNavigate={handleNavigate} />}
                  {currentView === 'admin-questions' && <AdminQuestionsPage onNavigate={handleNavigate} />}
                  {currentView === 'admin-analytics' && <AdminAnalyticsPage />}
                  {currentView === 'admin-certificates' && (
                    <AdminCertificatesPage onNavigate={handleNavigate} initialQuery={viewParam} />
                  )}
                  {currentView === 'admin-diagnostic' && <AdminDiagnosticPage onNavigate={handleNavigate} />}
                  {currentView === 'admin-users' && <AdminUsersPage />}
                  {currentView === 'admin-settings' && <AdminSettingsPage />}
                </div>
              </main>
            </div>
          )
        ) : (
          /* Student Views */
          <main className="flex-1 pb-safe-nav md:pb-0 min-w-0">
            <ErrorBoundary onReset={() => handleNavigate('home')}>
              {currentView === 'home' && <HomePage onNavigate={handleNavigate} />}
              {currentView === 'course-detail' && viewParam && (
                <CourseDetailPage courseId={viewParam} onNavigate={handleNavigate} />
              )}
              {currentView === 'learn' && (
                viewParam ? (
                  <LearnPage
                    courseId={viewParam.split('/')[0]}
                    initialLessonId={viewParam.split('/')[1]}
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <HomePage onNavigate={handleNavigate} />
                )
              )}
              {currentView === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
              {currentView === 'user-profile' && viewParam && (
                <UserProfilePage userId={viewParam} onNavigate={handleNavigate} />
              )}
              {currentView === 'account-settings' && (
                <AccountSettings onNavigateToCourse={(courseId) => handleNavigate('course-detail', courseId)} />
              )}
            </ErrorBoundary>
          </main>
        )}
      </div>

      {/* Global Back to Top Button */}
      <BackToTop />

      {/* Global Footer (Hidden in Learn Room for full immersion) */}
      {!isLearnRoute && !isAdminRoute && <Footer onNavigate={handleNavigate} />}

      {/* Mobile Bottom Navigation Bar (Hidden in Classroom Player) */}
      {!isLearnRoute && <MobileBottomNav currentView={currentView} onNavigate={handleNavigate} />}

      {/* Auth Modal */}
      {isAuthModalOpen && <AuthModal onNavigate={handleNavigate} />}

      {/* Internal Policy Modal (Terms & Privacy) */}
      <PolicyModal />

      {/* Mobile Notification Bottom Sheet / Modal */}
      <MobileNotificationModal onNavigate={handleNavigate} />

      {/* Global Achievement Real-time Toast & Action Listener */}
      <AchievementNotificationListener />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
