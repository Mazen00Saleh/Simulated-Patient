import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import LandingPage from './pages/LandingPage';
import CasesPage from './pages/CasesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppPage from './pages/AppPage';

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
          </Routes>
        </div>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
