import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light-subtle px-3 text-center">
      <div className="card border-0 shadow-lg rounded-4 p-5 w-100" style={{ maxWidth: '500px' }}>
        <h1 className="display-1 fw-extrabold text-primary mb-3">404</h1>
        <h4 className="fw-bold text-body-emphasis mb-3">Page Not Found</h4>
        <p className="text-secondary mb-4 small leading-relaxed">
          The requested page does not exist or has been relocated. Check your URL address or go back to your student dashboard.
        </p>
        <Link to="/dashboard" className="btn btn-primary px-4 py-2.5 rounded-3 fw-bold shadow-sm">
          <i className="bi bi-house-door-fill me-2"></i> Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
