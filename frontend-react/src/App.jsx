import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CasesPage from './pages/CasesPage';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cases" element={<CasesPage />} />
      </Routes>
    </div>
  );
}

export default App;
