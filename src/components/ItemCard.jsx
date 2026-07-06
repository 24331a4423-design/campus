import React, { useState, useEffect } from 'react';
import { getSignedImageUrl } from '../services/storage';

const ItemCard = ({ item, type = 'lost', onAction = null, actionLabel = '' }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  const {
    item_name,
    category,
    brand,
    color,
    description,
    image_url,
    location,
    status,
    created_at
  } = item;

  // Resolve dates based on item type
  const itemDate = type === 'lost' ? item.date_lost : item.date_found;
  const itemTime = type === 'lost' ? item.time_lost : item.time_found;

  useEffect(() => {
    const fetchImage = async () => {
      if (!image_url) {
        setImageUrl('');
        return;
      }
      setLoadingImage(true);
      try {
        const url = await getSignedImageUrl(image_url);
        setImageUrl(url);
      } catch (err) {
        console.error('Failed to load image for item card:', err);
      } finally {
        setLoadingImage(false);
      }
    };
    fetchImage();
  }, [image_url]);

  // Status styling
  let badgeColor = 'bg-secondary';
  if (status === 'lost') badgeColor = 'bg-warning text-dark';
  if (status === 'found') badgeColor = 'bg-success';
  if (status === 'claimed') badgeColor = 'bg-info text-dark';
  if (status === 'resolved') badgeColor = 'bg-primary';

  return (
    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative hover-shadow transition-all">
      {/* Badge indicating category / status */}
      <div className="position-absolute top-0 end-0 m-3 z-1">
        <span className={`badge ${badgeColor} px-3 py-2 fs-7 rounded-pill text-capitalize shadow-sm`}>
          {status}
        </span>
      </div>

      {/* Image container */}
      <div 
        className="bg-light d-flex align-items-center justify-content-center border-bottom" 
        style={{ height: '200px', overflow: 'hidden', position: 'relative' }}
      >
        {loadingImage ? (
          <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={item_name} 
            className="w-100 h-100" 
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://placehold.co/600x400?text=No+Image+Available';
            }}
          />
        ) : (
          <div className="text-center text-muted p-4">
            <i className={`bi bi-${type === 'lost' ? 'question-circle' : 'search'} display-4 mb-2`}></i>
            <p className="small mb-0">No image uploaded</p>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="card-body d-flex flex-column p-4">
        <div className="d-flex align-items-center mb-2">
          <span className="badge bg-secondary-subtle text-secondary-emphasis me-2 text-capitalize">
            {category}
          </span>
          {brand && (
            <span className="badge bg-dark-subtle text-dark-emphasis me-2 text-capitalize">
              {brand}
            </span>
          )}
        </div>

        <h5 className="card-title fw-bold text-truncate mb-2" title={item_name}>
          {item_name}
        </h5>

        <p className="card-text text-secondary small text-multiline-truncate mb-3" style={{ height: '60px', overflow: 'hidden' }}>
          {description}
        </p>

        <hr className="mt-auto text-muted opacity-25" />

        <div className="row g-2 small text-secondary mt-1">
          <div className="col-12 d-flex align-items-center">
            <i className="bi bi-geo-alt-fill text-danger me-2"></i>
            <span className="text-truncate">{location}</span>
          </div>
          <div className="col-12 d-flex align-items-center">
            <i className="bi bi-calendar-event me-2 text-primary"></i>
            <span>{itemDate} {itemTime ? `at ${itemTime.substring(0, 5)}` : ''}</span>
          </div>
        </div>

        {onAction && (
          <button 
            onClick={() => onAction(item)} 
            className="btn btn-outline-primary btn-sm w-100 rounded-3 mt-3 fw-semibold"
          >
            {actionLabel || 'Interact'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
