import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AppNavbar.css';

const AppNavbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/cases');
  };

  return (
    <nav className="app-navbar">
      <div className="app-navbar-container">
        <div className="app-navbar-logo">
          <Link to="/" className="app-navbar-logo-text">
            <span className="app-navbar-icon">🔬</span>
            PsychSim
          </Link>
        </div>

        <div className="app-navbar-links">
          <Link to="/" className="app-navbar-link">Home</Link>
          <Link to="/cases" className="app-navbar-link">Cases</Link>
        </div>

        <div className="app-navbar-auth">
          {isAuthenticated ? (
            <>
              <span className="app-navbar-greeting">Hi, {user?.name?.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="app-navbar-logout"
              >
                Log Out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
