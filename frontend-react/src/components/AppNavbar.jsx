import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppNavbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/cases');
  };
  return (
    <nav className="navbar navbar-sticky">
      <div className="container nav-container">
        <div className="logo nav-logo-container">
          <div className="logo-text">PsychSim <span className="text-primary">App</span></div>
          <div className="nav-links nav-links-wrapper" style={{ marginTop: '6px' }}>
            <Link to="/">Home</Link>
            <Link to="/cases">Cases</Link>
          </div>
        </div>
        {user?.is_admin && (
          <div className="app-navbar-dropdown" style={{ marginLeft: '1rem', marginTop: '6px' }}>
            <span className="dropdown-toggle" style={{ cursor: 'pointer', fontWeight: 500 }}>
              Admin ▾
            </span>
            <div className="dropdown-menu">
              <Link to="/admin" className="dropdown-item">⚙️ Settings & Sessions</Link>
              <Link to="/admin/analytics" className="dropdown-item">📊 Analytics</Link>
              <Link to="/admin/cases" className="dropdown-item">✏️ Case Editor</Link>
            </div>
          </div>
        )}
        <div className="nav-links nav-auth-container">
          {isAuthenticated ? (
            <>
              <span className="nav-greeting">Hi, {user?.name?.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline btn-logout"
              >
                Log Out
              </button>
            </>
          ) : (
            <Link></Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
