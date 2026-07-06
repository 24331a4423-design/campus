import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get redirect target (defaults to dashboard)
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      // Redirect admin to admin panel, others to user dashboard
      const userRole = data?.user?.user_metadata?.role || 'user';
      if (userRole === 'admin' || from.startsWith('/admin')) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light-subtle px-3 py-5">
      <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
        
        {/* Brand/Logo Header */}
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-3">
            <i className="bi bi-shield-fill-check text-primary fs-2 me-2"></i>
            <span className="fw-bold fs-3 text-body-emphasis">Campus Guardian</span>
          </Link>
          <h4 className="fw-bold mb-1">Sign In</h4>
          <p className="text-secondary small">Access your Campus Guardian dashboard</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
            <div className="small">{error}</div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError('')} 
              aria-label="Close"
              style={{ padding: '1rem' }}
            ></button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary">Campus Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-body text-secondary border-end-0">
                <i className="bi bi-envelope"></i>
              </span>
              <input 
                type="email" 
                className="form-control bg-body border-start-0 ps-0" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                required 
              />
            </div>
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label small fw-bold text-secondary mb-0">Password</label>
              <Link to="/forgot-password" className="text-primary small text-decoration-none fw-semibold">
                Forgot password?
              </Link>
            </div>
            <div className="input-group">
              <span className="input-group-text bg-body text-secondary border-end-0">
                <i className="bi bi-lock"></i>
              </span>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-control bg-body border-start-0 border-end-0 ps-0"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required 
              />
              <button 
                type="button" 
                className="input-group-text bg-body text-secondary border-start-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold mt-2 shadow-sm transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing In...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Redirect to signup */}
        <div className="text-center mt-4">
          <p className="small text-secondary mb-0">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary fw-bold text-decoration-none">
              Register Here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
