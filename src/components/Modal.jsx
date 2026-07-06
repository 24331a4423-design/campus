import React, { useEffect } from 'react';

const Modal = ({ 
  show = false, 
  title = '', 
  onClose = () => {}, 
  children, 
  footerActions = null,
  size = 'md' 
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  const modalSizeClass = size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        backdropFilter: 'blur(4px)',
        zIndex: 1055 
      }}
      onClick={onClose}
    >
      <div 
        className={`modal-dialog modal-dialog-centered ${modalSizeClass}`}
        onClick={(e) => e.stopPropagation()} // Prevent close on modal content click
      >
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Modal Header */}
          <div className="modal-header border-bottom-0 bg-light p-4">
            <h5 className="modal-title fw-bold text-body-emphasis">{title}</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose} 
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {children}
          </div>

          {/* Modal Footer */}
          {footerActions ? (
            <div className="modal-footer border-top-0 bg-light p-3 gap-2">
              {footerActions}
            </div>
          ) : (
            <div className="modal-footer border-top-0 bg-light p-3">
              <button type="button" className="btn btn-secondary rounded-3" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
