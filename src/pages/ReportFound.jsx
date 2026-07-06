import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import ImageUploadComponent from '../components/ImageUploadComponent';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { compareItems } from '../services/gemini';

const ReportFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Electronics',
    brand: '',
    color: '',
    description: '',
    dateFound: '',
    timeFound: '',
    location: '',
    contact: '',
    imageUrl: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Electronics',
    'Books & Stationery',
    'Clothing & Accessories',
    'ID Cards & Wallets',
    'Keys',
    'Bags & Backpacks',
    'Others'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUploaded = (path) => {
    setFormData(prev => ({ ...prev, imageUrl: path }));
  };

  const handleImageDeleted = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleReset = () => {
    setFormData({
      itemName: '',
      category: 'Electronics',
      brand: '',
      color: '',
      description: '',
      dateFound: '',
      timeFound: '',
      location: '',
      contact: '',
      imageUrl: ''
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Save Found Item report to PostgreSQL
      const foundItemData = {
        user_id: user.id,
        item_name: formData.itemName,
        category: formData.category,
        brand: formData.brand || null,
        color: formData.color || null,
        description: formData.description,
        location: formData.location,
        date_found: formData.dateFound,
        time_found: formData.timeFound + ':00', // HH:MM:SS format
        contact: formData.contact,
        image_url: formData.imageUrl || null,
        status: 'found'
      };

      const { data: newFoundItem, error: saveError } = await supabase
        .from('found_items')
        .insert([foundItemData])
        .select()
        .single();

      if (saveError) throw saveError;

      setSuccess(true);

      // 2. Perform AI Matching
      // Fetch open lost items
      const { data: lostItems, error: fetchLostError } = await supabase
        .from('lost_items')
        .select('*')
        .eq('status', 'lost');

      if (!fetchLostError && lostItems && lostItems.length > 0) {
        for (const lost of lostItems) {
          try {
            const match = await compareItems(lost, newFoundItem);
            if (match.matchScore >= 50) {
              // Create a match suggestion
              await supabase.from('ai_matches').insert([{
                lost_item_id: lost.id,
                found_item_id: newFoundItem.id,
                match_score: match.matchScore,
                similarities: match.similarities,
                differences: match.differences,
                confidence: match.confidence,
                recommendation: match.recommendation
              }]);

              // Create notifications
              // For lost reporter
              await supabase.from('notifications').insert([{
                user_id: lost.user_id,
                title: 'AI Match Found',
                message: `AI matched your lost "${lost.item_name}" with a newly reported found "${newFoundItem.item_name}" (${match.matchScore}% Match). Check suggested matches.`
              }]);

              // For found reporter (current user)
              await supabase.from('notifications').insert([{
                user_id: newFoundItem.user_id,
                title: 'New AI Match Suggested',
                message: `AI matched your found "${newFoundItem.item_name}" with a lost "${lost.item_name}" (${match.matchScore}% Match).`
              }]);
            }
          } catch (matchErr) {
            console.error('Failed comparing with lost item ID:', lost.id, matchErr);
          }
        }
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit report. Please try again.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">Report Found Item</h2>
        <p className="text-secondary">Please fill out all details to catalog the found item.</p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          Report submitted successfully! AI is analyzing matches...
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Item Name */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Item Name *</label>
                  <input 
                    type="text" 
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    placeholder="e.g. Blue Backpack"
                    required 
                    disabled={loading}
                  />
                </div>

                {/* Category */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Category *</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-select bg-body-tertiary"
                    disabled={loading}
                  >
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Brand (Optional)</label>
                  <input 
                    type="text" 
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    placeholder="e.g. Wildcraft"
                    disabled={loading}
                  />
                </div>

                {/* Color */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Color (Optional)</label>
                  <input 
                    type="text" 
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    placeholder="e.g. Sky Blue"
                    disabled={loading}
                  />
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label small fw-bold text-secondary">Detailed Description *</label>
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    rows="4"
                    placeholder="Describe contents, specific features, tags, stickers, or brand names visible on the found item."
                    required
                    disabled={loading}
                  ></textarea>
                </div>

                {/* Date Found */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Date Found *</label>
                  <input 
                    type="date" 
                    name="dateFound"
                    value={formData.dateFound}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    required
                    disabled={loading}
                  />
                </div>

                {/* Time Found */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Time Found (Approximate) *</label>
                  <input 
                    type="time" 
                    name="timeFound"
                    value={formData.timeFound}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    required
                    disabled={loading}
                  />
                </div>

                {/* Found Location */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Found Location *</label>
                  <input 
                    type="text" 
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    placeholder="e.g. Food Court Table 5"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Contact Number */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Contact Number (Finder) *</label>
                  <input 
                    type="tel" 
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    placeholder="e.g. +91 98765 43210"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="d-flex gap-3 mt-5">
                <button 
                  type="submit" 
                  className="btn btn-primary px-4 py-2.5 rounded-3 fw-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submitting...
                    </>
                  ) : 'Submit Report'}
                </button>
                <button 
                  type="button" 
                  onClick={handleReset}
                  className="btn btn-outline-secondary px-4 py-2.5 rounded-3 fw-semibold"
                  disabled={loading}
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Image Upload */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body">
            <h5 className="fw-bold text-body-emphasis mb-3">Item Photograph</h5>
            <p className="text-secondary small mb-4">
              Upload a clear photo of the found item. This helps owner verification.
            </p>
            <ImageUploadComponent 
              type="found" 
              existingPath={formData.imageUrl} 
              onUploadSuccess={handleImageUploaded}
              onUploadDelete={handleImageDeleted}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportFound;
