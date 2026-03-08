import React from 'react';
import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { signOut } from './services/authService';

const App = () => {
  const { user } = useAuth();
  const location = useLocation();
  const logoSrc = '/icon-192.png';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="app-shell">
      <nav className="navbar navbar-expand-lg navbar-light gradient-nav shadow-sm mb-3">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            <img src={logoSrc} alt="Khatawali logo" className="brand-logo me-2" />
            Khatawali
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#nav"
            aria-controls="nav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {user && (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/dashboard">
                      Dashboard
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/profile">
                      Profile
                    </Link>
                  </li>
                </>
              )}
            </ul>
            <div className="d-flex align-items-center gap-2">
              {user ? (
                <>
                  <span className="text-muted small">{user.email}</span>
                  <button className="btn btn-outline-secondary btn-sm" onClick={handleSignOut}>
                    Sign out
                  </button>
                </>
              ) : location.pathname !== '/login' ? (
                <Link className="btn btn-primary btn-sm" to="/login">
                  Login
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      <div className="container pb-4">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
