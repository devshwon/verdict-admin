import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './auth/AuthGuard';
import { LoginPage } from './auth/LoginPage';
import { AuthCallback } from './auth/AuthCallback';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { VotesPage } from './pages/VotesPage';
import { ReportsPage } from './pages/ReportsPage';
import { InquiriesPage } from './pages/InquiriesPage';
import { UsersPage } from './pages/UsersPage';
import { CreateNormalVotesPage } from './pages/CreateNormalVotesPage';
import { TossPromotionsPage } from './pages/TossPromotionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { AuditLogPage } from './pages/AuditLogPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/votes" element={<VotesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/inquiries" element={<InquiriesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/create/normal-votes" element={<CreateNormalVotesPage />} />
            <Route path="/config/toss-promotions" element={<TossPromotionsPage />} />
            <Route path="/config/settings" element={<SettingsPage />} />
            <Route path="/config/system-status" element={<SystemStatusPage />} />
            <Route path="/config/audit-log" element={<AuditLogPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
