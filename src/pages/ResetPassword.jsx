import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light-subtle px-3 py-5">
      <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
        
        {/* Logo Header */}
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-3">
            <i className="bi bi-shield-fill-check text-primary fs-2 me-2"></i>
            <span className="fw-bold fs-3 text-body-emphasis">Campus Guardian</span>
          </Link>
          <h4 className="fw-bold mb-1">Reset Password</h4>
          <p className="text-secondary small">Set your new account password</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            Password has been reset successfully! Redirecting to login...
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary">New Password</label>
            <div className="input-group">
              <span className="input-group-text bg-body text-secondary border-end-0">
                <i className="bi bi-lock"></i>
              </span>
              <input 
                type="password" 
                className="form-control bg-body border-start-0 ps-0" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required 
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold text-secondary">Confirm New Password</label>
            <div className="input-group">
              <span className="input-group-text bg-body text-secondary border-end-0">
                <i className="bi bi-lock-fill"></i>
              </span>
              <input 
                type="password" 
                className="form-control bg-body border-start-0 ps-0" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold shadow-sm"
            disabled={loading || success}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Updating Password...
              </>
            ) : 'Update Password'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default ResetPassword;
