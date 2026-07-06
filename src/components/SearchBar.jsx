import React, { useState } from 'react';

const SearchBar = ({ onSearch = () => {}, categories = [] }) => {
  const [filters, setFilters] = useState({
    query: '',
    category: '',
    brand: '',
    color: '',
    date: '',
    location: '',
    status: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const handleClear = () => {
    const cleared = {
      query: '',
      category: '',
      brand: '',
      color: '',
      date: '',
      location: '',
      status: ''
    };
    setFilters(cleared);
    onSearch(cleared);
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-body-tertiary">
      <div className="row g-3">
        {/* Name Query Search */}
        <div className="col-12 col-md-4">
          <label className="form-label small fw-bold text-secondary">Search Item Name</label>
          <div className="input-group">
            <span className="input-group-text bg-body border-end-0">
              <i className="bi bi-search text-secondary"></i>
            </span>
            <input 
              type="text" 
              name="query" 
              value={filters.query}
              onChange={handleChange}
              className="form-control bg-body border-start-0 ps-0" 
              placeholder="Enter keywords..." 
            />
          </div>
        </div>

        {/* Category */}
        <div className="col-6 col-md-2">
          <label className="form-label small fw-bold text-secondary">Category</label>
          <select 
            name="category" 
            value={filters.category}
            onChange={handleChange}
            className="form-select bg-body"
          >
            <option value="">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div className="col-6 col-md-2">
          <label className="form-label small fw-bold text-secondary">Brand</label>
          <input 
            type="text" 
            name="brand" 
            value={filters.brand}
            onChange={handleChange}
            className="form-control bg-body" 
            placeholder="e.g. Apple" 
          />
        </div>

        {/* Color */}
        <div className="col-6 col-md-2">
          <label className="form-label small fw-bold text-secondary">Color</label>
          <input 
            type="text" 
            name="color" 
            value={filters.color}
            onChange={handleChange}
            className="form-control bg-body" 
            placeholder="e.g. Black" 
          />
        </div>

        {/* Date */}
        <div className="col-6 col-md-2">
          <label className="form-label small fw-bold text-secondary">Date</label>
          <input 
            type="date" 
            name="date" 
            value={filters.date}
            onChange={handleChange}
            className="form-control bg-body" 
          />
        </div>

        {/* Location */}
        <div className="col-6 col-md-4 col-lg-3">
          <label className="form-label small fw-bold text-secondary">Location</label>
          <input 
            type="text" 
            name="location" 
            value={filters.location}
            onChange={handleChange}
            className="form-control bg-body" 
            placeholder="e.g. Library" 
          />
        </div>

        {/* Status */}
        <div className="col-6 col-md-4 col-lg-3">
          <label className="form-label small fw-bold text-secondary">Status</label>
          <select 
            name="status" 
            value={filters.status}
            onChange={handleChange}
            className="form-select bg-body"
          >
            <option value="">All Statuses</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
            <option value="claimed">Claimed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="col-12 col-lg-6 d-flex align-items-end justify-content-lg-end">
          <button 
            type="button" 
            onClick={handleClear}
            className="btn btn-outline-secondary px-4 py-2 w-100 w-lg-auto rounded-3 fw-semibold transition-all"
          >
            <i className="bi bi-x-circle me-2"></i> Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
