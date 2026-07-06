import React from 'react';

const Loader = ({ fullScreen = false, message = 'Loading...', size = 'md' }) => {
  const spinnerSize = size === 'sm' ? '1.5rem' : size === 'lg' ? '4rem' : '2.5rem';

  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center text-center p-4">
      <div 
        className="spinner-border text-primary mb-3" 
        style={{ width: spinnerSize, height: spinnerSize }} 
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && <p className="text-secondary fw-semibold mb-0">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-3"
        style={{ 
          background: 'rgba(var(--bs-body-bg-rgb), 0.75)', 
          backdropFilter: 'blur(8px)' 
        }}
      >
        <div className="card shadow-lg border-0 p-3 rounded-4" style={{ maxWidth: '300px' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default Loader;
