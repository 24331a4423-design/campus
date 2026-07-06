import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const { sendPasswordReset } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send reset link. Verify your email Address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light-subtle px-3 py-5">
      <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
        
        {/* Logo/Header */}
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-3">
            <i className="bi bi-shield-fill-check text-primary fs-2 me-2"></i>
            <span className="fw-bold fs-3 text-body-emphasis">Campus Guardian</span>
          </Link>
          <h4 className="fw-bold mb-1">Forgot Password</h4>
          <p className="text-secondary small">Enter your email and we'll send you a password reset link</p>
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
            Reset link has been sent to your email. Check your inbox and spam folders!
          </div>
        )}

        {/* Forgot Password Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold shadow-sm"
            disabled={loading || success}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Sending reset link...
              </>
            ) : 'Send Reset Link'}
          </button>
        </form>

        {/* Navigation back to login */}
        <div className="text-center mt-4">
          <p className="small text-secondary mb-0">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary fw-bold text-decoration-none">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
