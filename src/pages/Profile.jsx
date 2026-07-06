import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { profile, updateProfileDetails } = useAuth();

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    registerNumber: profile?.register_number || '',
    branch: profile?.department || 'CSE',
    section: profile?.section || '',
    year: profile?.year || '',
    phone: profile?.phone || ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await updateProfileDetails({
        full_name: formData.fullName,
        register_number: formData.registerNumber,
        department: formData.branch,
        section: formData.section || null,
        year: formData.year,
        phone: formData.phone
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">My Profile</h2>
        <p className="text-secondary">Manage and update your campus registration and contact records.</p>
      </div>

      {success && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          Profile updated successfully!
          <button type="button" className="btn-close" onClick={() => setSuccess(false)}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Left Side: Avatar Card */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-body">
            <div 
              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold mx-auto mb-3 shadow"
              style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}
            >
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h4 className="fw-bold text-body-emphasis mb-1">{profile?.full_name}</h4>
            <span className="badge bg-secondary-subtle text-secondary-emphasis px-3 py-1.5 rounded-pill text-capitalize small">
              Role: {profile?.role}
            </span>
            <hr className="opacity-10 my-4" />
            <div className="text-start small text-secondary">
              <p className="mb-2"><strong>Email Address:</strong> <span className="d-block text-dark mt-1">{profile?.email}</span></p>
              <p className="mb-2"><strong>Registration Number:</strong> <span className="d-block text-dark mt-1">{profile?.register_number}</span></p>
              <p className="mb-0"><strong>Branch:</strong> <span className="d-block text-dark mt-1">{profile?.department} {profile?.section ? `- Section ${profile.section}` : ''}</span></p>
            </div>
          </div>
        </div>

        {/* Right Side: Edit Form */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-body">
            <h5 className="fw-bold text-body-emphasis mb-4">Edit Profile Fields</h5>
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
                    className="form-control bg-body-tertiary"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Register Number */}
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-bold text-secondary">Registration Number</label>
                  <input 
                    type="text" 
                    name="registerNumber"
                    value={formData.registerNumber}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Branch */}
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-bold text-secondary">Branch</label>
                  <select 
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="form-select bg-body-tertiary"
                    disabled={loading}
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
                    className="form-control bg-body-tertiary"
                    placeholder="e.g. A, B, C"
                    maxLength={5}
                    disabled={loading}
                  />
                </div>

                {/* Year */}
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-bold text-secondary">Academic Year</label>
                  <select 
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="form-select bg-body-tertiary"
                    disabled={loading}
                  >
                    {years.map((y, idx) => (
                      <option key={idx} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-bold text-secondary">Phone Number</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary px-5 py-2.5 rounded-3 fw-bold mt-5 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving Changes...
                  </>
                ) : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
