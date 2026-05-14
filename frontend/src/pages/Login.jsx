import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, needsSetup, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (needsSetup) {
        if (user?.role === 'ambulance_driver') navigate('/setup/driver');
        else if (user?.role === 'hospital') navigate('/setup/hospital');
        else navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, needsSetup, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both User ID and Password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.message || 'Login failed. Please check your credentials.');
      } else if (res.data?.requiresSetup) {
        if (res.data.user.role === 'ambulance_driver') navigate('/setup/driver');
        else if (res.data.user.role === 'hospital') navigate('/setup/hospital');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
        <div className="auth-blob blob-3"></div>
      </div>

      <div className="auth-container">
        {/* Branding */}
        <div className="auth-brand">
          <div className="auth-logo-icon">🚑</div>
          <h1 className="auth-logo-text">
            GREEN <span className="auth-accent">WAVE</span>
          </h1>
          <p className="auth-tagline">Smart Emergency Traffic Clearance System</p>
        </div>

        {/* Login Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-userid">User ID</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input
                  id="login-userid"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your User ID"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <><span className="auth-spinner"></span> Signing in...</>
              ) : (
                <>Sign In <span className="auth-btn-arrow">→</span></>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>New to GREEN WAVE?</span>
          </div>

          <Link to="/register" className="auth-register-link">
            <span>📝</span> Register Here
          </Link>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <Link to="/" className="auth-home-link">← Back to Home</Link>
          <span className="auth-secure-badge">🔐 Secured with JWT Authentication</span>
        </div>
      </div>
    </div>
  );
}
