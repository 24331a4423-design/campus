import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import ImageUploadComponent from '../components/ImageUploadComponent';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { compareItems } from '../services/gemini';

const ReportLost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Electronics',
    brand: '',
    color: '',
    description: '',
    dateLost: '',
    timeLost: '',
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
      dateLost: '',
      timeLost: '',
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
      // 1. Save Lost Item report to PostgreSQL
      const lostItemData = {
        user_id: user.id,
        item_name: formData.itemName,
        category: formData.category,
        brand: formData.brand || null,
        color: formData.color || null,
        description: formData.description,
        location: formData.location,
        date_lost: formData.dateLost,
        time_lost: formData.timeLost + ':00', // ensure HH:MM:SS format
        contact: formData.contact,
        image_url: formData.imageUrl || null,
        status: 'lost'
      };

      const { data: newLostItem, error: saveError } = await supabase
        .from('lost_items')
        .insert([lostItemData])
        .select()
        .single();

      if (saveError) throw saveError;

      setSuccess(true);

      // 2. Perform AI Matching (Non-blocking to UX, but run inside promise chain)
      // Fetch open found items
      const { data: foundItems, error: fetchFoundError } = await supabase
        .from('found_items')
        .select('*')
        .eq('status', 'found');

      if (!fetchFoundError && foundItems && foundItems.length > 0) {
        // Run comparisons using Gemini
        for (const found of foundItems) {
          try {
            const match = await compareItems(newLostItem, found);
            if (match.matchScore >= 50) {
              // Create a match suggestion
              await supabase.from('ai_matches').insert([{
                lost_item_id: newLostItem.id,
                found_item_id: found.id,
                match_score: match.matchScore,
                similarities: match.similarities,
                differences: match.differences,
                confidence: match.confidence,
                recommendation: match.recommendation
              }]);

              // Create notifications
              // For lost reporter
              await supabase.from('notifications').insert([{
                user_id: newLostItem.user_id,
                title: 'New AI Match Found',
                message: `Our AI matched your lost "${newLostItem.item_name}" with a found "${found.item_name}" (${match.matchScore}% Match). Check suggested matches.`
              }]);

              // For found reporter
              await supabase.from('notifications').insert([{
                user_id: found.user_id,
                title: 'New AI Match Suggestion',
                message: `Our AI matched your found "${found.item_name}" with a newly reported lost "${newLostItem.item_name}" (${match.matchScore}% Match).`
              }]);
            }
          } catch (matchErr) {
            console.error('Failed comparing with found item ID:', found.id, matchErr);
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
        <h2 className="fw-bold text-body-emphasis">Report Lost Item</h2>
        <p className="text-secondary">Please fill out all details to catalog the lost item.</p>
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
                    placeholder="e.g. iPhone 13 Pro"
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
                    placeholder="e.g. Apple"
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
                    placeholder="e.g. Midnight Blue"
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
                    placeholder="Provide specific markings, cover colors, cracks, case names, or configurations that help distinguish it."
                    required
                    disabled={loading}
                  ></textarea>
                </div>

                {/* Date Lost */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Date Lost *</label>
                  <input 
                    type="date" 
                    name="dateLost"
                    value={formData.dateLost}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    required
                    disabled={loading}
                  />
                </div>

                {/* Time Lost */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Time Lost (Approximate) *</label>
                  <input 
                    type="time" 
                    name="timeLost"
                    value={formData.timeLost}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    required
                    disabled={loading}
                  />
                </div>

                {/* Lost Location */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Lost Location *</label>
                  <input 
                    type="text" 
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-control bg-body-tertiary" 
                    placeholder="e.g. Science Block Block 2 Room 102"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Contact Number */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold text-secondary">Contact Number *</label>
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

        {/* Right Column: Image Upload Container */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body">
            <h5 className="fw-bold text-body-emphasis mb-3">Item Photograph</h5>
            <p className="text-secondary small mb-4">
              Upload a clear photo of the item if available. This helps admins verify ownership claims manually.
            </p>
            <ImageUploadComponent 
              type="lost" 
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

export default ReportLost;
