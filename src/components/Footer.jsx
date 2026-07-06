import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-body-tertiary border-top py-4 mt-auto">
      <div className="container">
        <div className="row align-items-center justify-content-between g-3">
          <div className="col-12 col-md-6 text-center text-md-start">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start mb-2">
              <i className="bi bi-shield-fill-check text-primary fs-4 me-2"></i>
              <span className="fw-bold text-body-emphasis fs-5">Campus Guardian</span>
            </div>
            <p className="small text-muted mb-0">
              AI-Powered Lost & Found and Asset Protection System.
            </p>
          </div>
          <div className="col-12 col-md-6 text-center text-md-end">
            <p className="small text-muted mb-0">
              &copy; {new Date().getFullYear()} Campus Guardian. All rights reserved.
            </p>
            <div className="d-flex justify-content-center justify-content-md-end gap-3 mt-2">
              <a href="#" className="text-secondary hover-text-primary small text-decoration-none">Privacy Policy</a>
              <span className="text-muted">|</span>
              <a href="#" className="text-secondary hover-text-primary small text-decoration-none">Terms of Service</a>
              <span className="text-muted">|</span>
              <a href="#" className="text-secondary hover-text-primary small text-decoration-none">Contact Support</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
