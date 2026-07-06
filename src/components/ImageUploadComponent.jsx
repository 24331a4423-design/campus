import React, { useState, useRef, useEffect } from 'react';
import { uploadImage, deleteImage, getSignedImageUrl } from '../services/storage';

const ImageUploadComponent = ({ 
  type = 'lost', 
  existingPath = '', 
  onUploadSuccess = () => {}, 
  onUploadDelete = () => {} 
}) => {
  const [imagePath, setImagePath] = useState(existingPath);
  const [signedUrl, setSignedUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);

  // Sync state if existingPath updates
  useEffect(() => {
    setImagePath(existingPath);
  }, [existingPath]);

  // Load signed URL for viewing if we have a path
  useEffect(() => {
    const loadSignedUrl = async () => {
      if (imagePath && !imagePath.startsWith('http')) {
        const url = await getSignedImageUrl(imagePath);
        setSignedUrl(url);
      } else {
        setSignedUrl(imagePath); // full url fallback
      }
    };
    loadSignedUrl();
  }, [imagePath]);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    
    // Type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, JPEG, PNG, and WEBP formats are supported.');
      return;
    }

    // Size validation (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds the 5 MB limit.');
      return;
    }

    // Create local object URL for preview before upload completes
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      setUploading(true);
      setProgress(10);
      
      // If there was an old image, we attempt to delete it first
      if (imagePath) {
        try {
          await deleteImage(imagePath);
        } catch (e) {
          console.warn('Could not delete old image, uploading new one:', e);
        }
      }

      setProgress(30);
      const uploadedPath = await uploadImage(file, type, (prog) => {
        setProgress(prog);
      });

      setImagePath(uploadedPath);
      onUploadSuccess(uploadedPath);
      setProgress(100);
      
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
      setPreview('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Image upload failed. Try again.');
      setPreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = async () => {
    if (!imagePath) return;
    try {
      setUploading(true);
      await deleteImage(imagePath);
      setImagePath('');
      setSignedUrl('');
      setPreview('');
      setProgress(0);
      onUploadDelete();
    } catch (err) {
      setError('Failed to delete image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  const displayImage = preview || signedUrl;

  return (
    <div className="w-100">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleChange} 
        accept="image/jpeg,image/png,image/jpg,image/webp" 
        className="d-none" 
      />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
        </div>
      )}

      {displayImage ? (
        <div className="card border p-2 text-center rounded-3 bg-light position-relative">
          <img 
            src={displayImage} 
            alt="Upload Preview" 
            className="img-fluid rounded-3" 
            style={{ maxHeight: '250px', objectFit: 'contain', width: '100%' }} 
          />
          {uploading && (
            <div className="position-absolute top-50 start-50 translate-middle w-75">
              <div className="progress shadow" style={{ height: '10px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  role="progressbar" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="badge bg-dark mt-2 shadow">Uploading...</span>
            </div>
          )}
          <div className="d-flex justify-content-center gap-2 mt-3 mb-1">
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary" 
              onClick={triggerBrowse}
              disabled={uploading}
            >
              <i className="bi bi-arrow-repeat me-1"></i> Replace Image
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-danger" 
              onClick={handleRemove}
              disabled={uploading}
            >
              <i className="bi bi-trash-fill me-1"></i> Delete Image
            </button>
          </div>
        </div>
      ) : (
        <div 
          className={`card border-2 border-dashed p-4 text-center rounded-4 cursor-pointer transition-all ${
            dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerBrowse}
          style={{ cursor: 'pointer', minHeight: '180px' }}
        >
          {uploading ? (
            <div className="my-auto">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <div className="progress w-75 mx-auto" style={{ height: '8px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="small text-muted mt-2">Uploading image... {progress}%</p>
            </div>
          ) : (
            <div className="my-auto">
              <i className="bi bi-cloud-arrow-up-fill text-primary display-4 mb-2 d-block"></i>
              <h6 className="fw-bold mb-1">Drag and drop your image here</h6>
              <p className="small text-muted mb-2">or click to browse files</p>
              <span className="badge bg-secondary-subtle text-secondary-emphasis">
                JPG, PNG, JPEG, WEBP (Max 5MB)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadComponent;
