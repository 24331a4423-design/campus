import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Loader from '../../components/Loader';
import { supabase } from '../../services/supabase';
import { deleteImage } from '../../services/storage';

const ManageReports = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'lost', 'found'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: lostData } = await supabase
        .from('lost_items')
        .select(`
          *,
          user:user_id (full_name, email)
        `);

      const { data: foundData } = await supabase
        .from('found_items')
        .select(`
          *,
          user:user_id (full_name, email)
        `);

      const normalizedLost = (lostData || []).map(i => ({ ...i, type: 'lost' }));
      const normalizedFound = (foundData || []).map(i => ({ ...i, type: 'found' }));

      const merged = [...normalizedLost, ...normalizedFound].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setReports(merged);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (reportId, type, newStatus) => {
    const table = type === 'lost' ? 'lost_items' : 'found_items';
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;
      
      setReports(prev => 
        prev.map(r => r.id === reportId && r.type === type ? { ...r, status: newStatus } : r)
      );
      alert('Report status updated successfully.');
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDeleteReport = async (reportId, type, imageUrl) => {
    if (!window.confirm('Are you sure you want to permanently delete this report? This cannot be undone.')) return;
    const table = type === 'lost' ? 'lost_items' : 'found_items';
    
    try {
      // 1. Delete associated image from Storage if exists
      if (imageUrl) {
        try {
          await deleteImage(imageUrl);
        } catch (storageErr) {
          console.warn('Image deletion failed, proceeding to report deletion:', storageErr);
        }
      }

      // 2. Delete report from PostgreSQL
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      setReports(prev => prev.filter(r => !(r.id === reportId && r.type === type)));
      alert('Report successfully deleted.');
    } catch (err) {
      alert('Failed to delete report: ' + err.message);
    }
  };

  // Filtering
  const filteredReports = reports.filter(report => {
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesSearch = report.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          report.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap g-3">
        <div>
          <h2 className="fw-bold text-body-emphasis">Manage Reports</h2>
          <p className="text-secondary mb-0">Monitor filed lost/found items and eliminate spam entries.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-body">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6 col-lg-4">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control form-control-sm bg-body-tertiary"
              placeholder="Search reports or user names..." 
            />
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="form-select form-select-sm bg-body-tertiary"
            >
              <option value="all">All Reports</option>
              <option value="lost">Lost Items Only</option>
              <option value="found">Found Items Only</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading items database..." />
      ) : filteredReports.length > 0 ? (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-body">
          <div className="table-responsive small">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr className="text-secondary fw-bold">
                  <th scope="col" className="ps-4">Type</th>
                  <th scope="col">Item Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Reporter</th>
                  <th scope="col">Date & Location</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={`${report.type}-${report.id}`} className="hover-bg-light transition-all">
                    <td className="ps-4">
                      <span className={`badge ${report.type === 'lost' ? 'bg-warning text-dark' : 'bg-success'} text-capitalize`}>
                        {report.type}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-body-emphasis">{report.item_name}</div>
                      <span className="text-muted small text-truncate-2 d-block" style={{ maxWidth: '280px' }}>
                        {report.description}
                      </span>
                    </td>
                    <td className="text-capitalize">{report.category}</td>
                    <td>
                      <div className="fw-semibold text-body-emphasis">{report.user?.full_name || 'System User'}</div>
                      <span className="text-muted small">{report.user?.email}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-body-emphasis">{report.location}</div>
                      <span className="text-muted small">
                        {report.type === 'lost' ? report.date_lost : report.date_found}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={report.status} 
                        onChange={(e) => handleStatusChange(report.id, report.type, e.target.value)}
                        className="form-select form-select-sm bg-body-tertiary"
                        style={{ width: '120px' }}
                      >
                        <option value={report.type === 'lost' ? 'lost' : 'found'}>
                          {report.type === 'lost' ? 'Lost' : 'Found'}
                        </option>
                        <option value="claimed">Claimed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="text-end pe-4">
                      <button 
                        onClick={() => handleDeleteReport(report.id, report.type, report.image_url)}
                        className="btn btn-sm btn-outline-danger rounded-3"
                        title="Delete Report"
                      >
                        <i className="bi bi-trash"></i> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center border-0 shadow-sm p-5 bg-body rounded-4">
          <i className="bi bi-journal-x display-1 text-secondary mb-3"></i>
          <h4 className="fw-bold">No Reports Scraped</h4>
          <p className="text-muted small">Adjust your filter keywords or check back later.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageReports;
