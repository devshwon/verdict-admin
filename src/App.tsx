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
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
