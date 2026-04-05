import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CasesPage from './pages/CasesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cases" element={<CasesPage />} />
      </Routes>
    </div>
  );
}

export default App;
