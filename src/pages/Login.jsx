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
      <div className="col-lg-10">
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card p-4">
              <h2 className="mb-3">Login</h2>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {message && <div className="alert alert-success py-2">{message}</div>}
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Login'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card p-4">
              <h2 className="mb-3">Register</h2>
              <form onSubmit={handleRegister}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
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
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <div className="form-text">8+ chars, 1 uppercase, 1 lowercase, 1 number.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={registerForm.confirm}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, confirm: e.target.value }))}
                    required
                  />
                </div>
                <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
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
          <div className="fw-semibold">Developed by: Pratham</div>
          <a href="https://github.com/Pratham2511" target="_blank" rel="noreferrer">
            https://github.com/Pratham2511
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
