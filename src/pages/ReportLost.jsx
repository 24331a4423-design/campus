import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import ImageUploadComponent from '../components/ImageUploadComponent';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { runAIMatching } from '../services/aiMatcher';

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


    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));


  };

  const handleImageUploaded = (path) => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: path
    }));
  };

  const handleImageDeleted = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: ''
    }));
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
    setSuccess(false);


  };

  const handleSubmit = async (e) => {
    e.preventDefault();


    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error(
          'You must be logged in to report a lost item.'
        );
      }

      if (!formData.itemName.trim()) {
        throw new Error('Please enter the item name.');
      }

      if (!formData.description.trim()) {
        throw new Error('Please enter a description.');
      }

      if (!formData.dateLost) {
        throw new Error('Please select the date the item was lost.');
      }

      if (!formData.timeLost) {
        throw new Error('Please select the time the item was lost.');
      }

      if (!formData.location.trim()) {
        throw new Error('Please enter where the item was lost.');
      }

      if (!formData.contact.trim()) {
        throw new Error('Please enter your contact information.');
      }

      const lostItemData = {
        user_id: user.id,
        item_name: formData.itemName.trim(),
        category: formData.category,
        brand: formData.brand.trim() || null,
        color: formData.color.trim() || null,
        description: formData.description.trim(),
        location: formData.location.trim(),
        date_lost: formData.dateLost,
        time_lost: formData.timeLost
          ? formData.timeLost + ':00'
          : null,
        contact: formData.contact.trim(),
        image_url: formData.imageUrl || null,
        status: 'lost'
      };

      const {
        data: newLostItem,
        error: saveError
      } = await supabase
        .from('lost_items')
        .insert([lostItemData])
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      if (!newLostItem?.id) {
        throw new Error(
          'The lost item was saved, but no item ID was returned.'
        );
      }

      setSuccess(true);

      try {
        await runAIMatching(
          supabase,
          'lost',
          newLostItem.id
        );
      } catch (aiError) {
        console.error(
          'AI matching failed:',
          aiError
        );
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error(
        'Report lost item error:',
        err
      );

      setError(
        err?.message ||
        'Failed to submit report. Please try again.'
      );

    } finally {
      setLoading(false);
    }


  };

  return (<DashboardLayout> <div className="container py-4"> <div className="row justify-content-center"> <div className="col-lg-8"> <div className="card shadow-sm border-0"> <div className="card-body p-4">


    <div className="text-center mb-4">
      <h2 className="fw-bold">
        <i className="bi bi-search me-2"></i>
        Report Lost Item
      </h2>

      <p className="text-muted mb-0">
        Provide details about the item you lost.
        Our AI will help find potential matches.
      </p>
    </div>

    {success && (
      <div
        className="alert alert-success"
        role="alert"
      >
        <i className="bi bi-check-circle-fill me-2"></i>
        Lost item reported successfully!
        AI matching has been started.
      </div>
    )}

    {error && (
      <div
        className="alert alert-danger"
        role="alert"
      >
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
      </div>
    )}

    <form onSubmit={handleSubmit}>

      <div className="mb-3">
        <label
          htmlFor="itemName"
          className="form-label fw-semibold"
        >
          Item Name *
        </label>

        <input
          type="text"
          className="form-control"
          id="itemName"
          name="itemName"
          value={formData.itemName}
          onChange={handleChange}
          placeholder="e.g. iPhone 15, Black Backpack"
          required
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="category"
          className="form-label fw-semibold"
        >
          Category *
        </label>

        <select
          className="form-select"
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          {categories.map((category) => (
            <option
              key={category}
              value={category}
            >
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label
          htmlFor="brand"
          className="form-label fw-semibold"
        >
          Brand
        </label>

        <input
          type="text"
          className="form-control"
          id="brand"
          name="brand"
          value={formData.brand}
          onChange={handleChange}
          placeholder="e.g. Apple, Samsung, Nike"
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="color"
          className="form-label fw-semibold"
        >
          Color
        </label>

        <input
          type="text"
          className="form-control"
          id="color"
          name="color"
          value={formData.color}
          onChange={handleChange}
          placeholder="e.g. Black, Blue, Red"
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="description"
          className="form-label fw-semibold"
        >
          Description *
        </label>

        <textarea
          className="form-control"
          id="description"
          name="description"
          rows="4"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the item in detail, including unique features or marks."
          required
        ></textarea>
      </div>

      <div className="row">

        <div className="col-md-6 mb-3">
          <label
            htmlFor="dateLost"
            className="form-label fw-semibold"
          >
            Date Lost *
          </label>

          <input
            type="date"
            className="form-control"
            id="dateLost"
            name="dateLost"
            value={formData.dateLost}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-md-6 mb-3">
          <label
            htmlFor="timeLost"
            className="form-label fw-semibold"
          >
            Time Lost *
          </label>

          <input
            type="time"
            className="form-control"
            id="timeLost"
            name="timeLost"
            value={formData.timeLost}
            onChange={handleChange}
            required
          />
        </div>

      </div>

      <div className="mb-3">
        <label
          htmlFor="location"
          className="form-label fw-semibold"
        >
          Location Lost *
        </label>

        <input
          type="text"
          className="form-control"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g. Library, Block A, Cafeteria"
          required
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="contact"
          className="form-label fw-semibold"
        >
          Contact Information *
        </label>

        <input
          type="text"
          className="form-control"
          id="contact"
          name="contact"
          value={formData.contact}
          onChange={handleChange}
          placeholder="Phone number or email"
          required
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold">
          Item Image
        </label>

        <ImageUploadComponent
          onImageUploaded={handleImageUploaded}
          onImageDeleted={handleImageDeleted}
          existingImage={formData.imageUrl}
        />
      </div>

      <div className="d-flex gap-2">

        <button
          type="submit"
          className="btn btn-primary flex-grow-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Submitting...
            </>
          ) : (
            <>
              <i className="bi bi-send me-2"></i>
              Submit Lost Report
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleReset}
          disabled={loading}
        >
          <i className="bi bi-arrow-counterclockwise me-2"></i>
          Reset
        </button>

      </div>

    </form>

  </div>
  </div>
  </div>
  </div>
  </div>
  </DashboardLayout>


  );
};

export default ReportLost;
