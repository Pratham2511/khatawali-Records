import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signUp } from '../services/authService';
import Loader from '../components/loader/Loader';

const initialRegister = { name: '', email: '', password: '', confirm: '' };
const initialLogin = { email: '', password: '' };

const validateEmail = (email) => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
const validatePassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
const validateName = (name) => /^[A-Za-z ]{3,50}$/.test(name);

const Login = () => {
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { email, password } = loginForm;
    if (!validateEmail(email) || !password) {
      setError('Enter a valid email and password.');
      setLoading(false);
      return;
    }
    const { error: authError } = await signIn({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const { name, email, password, confirm } = registerForm;

    if (!validateName(name)) {
      setError('Name must be 3-50 letters/spaces.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Enter a valid email.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be 8+ chars with uppercase, lowercase, and number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signUp({ name, email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setMessage('Registration successful. Check your email for OTP/verification to activate your account.');
      setRegisterForm(initialRegister);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-9 col-xl-8">

        {/* Hero branding */}
        <div className="login-hero">
          <img src="/icon-192.png" alt="Khatawali" className="hero-logo" />
          <h1>Khatawali</h1>
          <p>Your personal expense ledger — simple, fast &amp; reliable.</p>
        </div>

        {/* Shared alerts */}
        {error   && <div className="alert alert-danger mb-3">{error}</div>}
        {message && <div className="alert alert-success mb-3">{message}</div>}

        <div className="row g-4">
          {/* Login */}
          <div className="col-md-6">
            <div className="card p-4 h-100">
              <div className="form-section-title mb-3">
                <span style={{fontSize:'1.2rem'}}>🔑</span> Login
              </div>
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <button className="btn btn-primary w-100 py-2" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Login →'}
                </button>
              </form>
            </div>
          </div>

          {/* Register */}
          <div className="col-md-6">
            <div className="card p-4 h-100">
              <div className="form-section-title mb-3">
                <span style={{fontSize:'1.2rem'}}>✉️</span> Register
              </div>
              <form onSubmit={handleRegister}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    placeholder="Your full name"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Min 8 chars, A-Z, a-z, 0-9"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Repeat password"
                    value={registerForm.confirm}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, confirm: e.target.value }))}
                    required
                  />
                </div>
                <button className="btn btn-primary w-100 py-2" type="submit" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {loading && (
          <div className="loader-shell mt-3">
            <Loader />
          </div>
        )}

        <div className="text-center mt-4 footer-credit">
          <span>Developed with ❤️ by <strong>Pratham</strong> · </span>
          <a href="https://github.com/Pratham2511" target="_blank" rel="noreferrer">
            github.com/Pratham2511
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
