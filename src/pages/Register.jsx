import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    registerNumber: '',
    branch: 'CSE',
    section: '',
    year: '1st Year',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const branches = [
    'CSE', 'ICET', 'ECE', 'EEE', 'MECH', 'CHEM', 'CIVIL', 'MBA', 'CSD', 'CIC', 'CSM'
  ];

  const years = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    'Postgraduate (Master/PhD)',
    'Faculty / Staff'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, {
        fullName: formData.fullName,
        registerNumber: formData.registerNumber,
        department: formData.branch,
        section: formData.section || null,
        year: formData.year,
        phone: formData.phone,
        role: 'user'
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light-subtle px-3 py-5">
      <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: '560px' }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-3">
            <i className="bi bi-shield-fill-check text-primary fs-2 me-2"></i>
            <span className="fw-bold fs-3 text-body-emphasis">Campus Guardian</span>
          </Link>
          <h4 className="fw-bold mb-1">Create Account</h4>
          <p className="text-secondary small">Register to report lost items and search matches</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            Registration successful! Redirecting to login...
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* Full Name */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Full Name</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="John Doe"
                required 
              />
            </div>

            {/* Register Number */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Register Number / ID</label>
              <input 
                type="text" 
                name="registerNumber"
                value={formData.registerNumber}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="e.g. RA211100..."
                required 
              />
            </div>

            {/* Branch */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Branch</label>
              <select 
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="form-select bg-body"
              >
                {branches.map((b, idx) => (
                  <option key={idx} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Section <span className="text-muted">(Optional)</span></label>
              <input 
                type="text" 
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="e.g. A, B, C"
                maxLength={5}
              />
            </div>

            {/* Year */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Academic Year</label>
              <select 
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="form-select bg-body"
              >
                {years.map((y, idx) => (
                  <option key={idx} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Campus Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="john.doe@university.edu"
                required 
              />
            </div>

            {/* Phone */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="+1234567890"
                required 
              />
            </div>

            {/* Password */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Password</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="Min 6 characters"
                required 
              />
            </div>

            {/* Confirm Password */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-secondary">Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-control bg-body" 
                placeholder="Repeat password"
                required 
              />
            </div>


          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold mt-4 shadow-sm"
            disabled={loading || success}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating Account...
              </>
            ) : 'Register Account'}
          </button>
        </form>

        {/* Redirect to login */}
        <div className="text-center mt-4">
          <p className="small text-secondary mb-0">
            Already have an account?{' '}
            <Link to="/login" className="text-primary fw-bold text-decoration-none">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
