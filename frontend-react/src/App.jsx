import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import LandingPage from './pages/LandingPage';
import CasesPage from './pages/CasesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppPage from './pages/AppPage';

import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CaseEditorPage from './pages/CaseEditorPage';

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/cases" element={<CaseEditorPage />} />
          </Routes>
        </div>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
