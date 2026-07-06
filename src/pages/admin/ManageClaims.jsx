import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Loader from '../../components/Loader';
import { supabase } from '../../services/supabase';
import { getSignedImageUrl } from '../../services/storage';

const ManageClaims = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [images, setImages] = useState({ lost: '', found: '' });

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          id,
          status,
          admin_remark,
          created_at,
          claimant:claimant_id (*),
          lost_item:lost_item_id (*),
          found_item:found_item_id (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (err) {
      console.error('Failed to load claims list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Fetch signed images for split screen
  useEffect(() => {
    const loadClaimImages = async () => {
      if (!selectedClaim) {
        setImages({ lost: '', found: '' });
        return;
      }

      let lostUrl = '';
      let foundUrl = '';

      try {
        if (selectedClaim.lost_item?.image_url) {
          lostUrl = await getSignedImageUrl(selectedClaim.lost_item.image_url);
        }
        if (selectedClaim.found_item?.image_url) {
          foundUrl = await getSignedImageUrl(selectedClaim.found_item.image_url);
        }
        setImages({ lost: lostUrl, found: foundUrl });
      } catch (err) {
        console.error('Error fetching images for claim verify:', err);
      }
    };

    loadClaimImages();
  }, [selectedClaim]);

  const handleSelectClaim = (claim) => {
    setSelectedClaim(claim);
    setRemark(claim.admin_remark || '');
  };

  const handleBackToList = () => {
    setSelectedClaim(null);
    setRemark('');
  };

  const handleProcessClaim = async (newStatus) => {
    if (!selectedClaim) return;
    
    setActionLoading(true);
    try {
      const { id, lost_item, found_item, claimant } = selectedClaim;

      // 1. Update status and remark in claims table
      const { error: claimErr } = await supabase
        .from('claims')
        .update({
          status: newStatus,
          admin_remark: remark
        })
        .eq('id', id);

      if (claimErr) throw claimErr;

      // 2. Cascade item statuses if approved
      if (newStatus === 'approved') {
        // Mark items as resolved
        await supabase
          .from('lost_items')
          .update({ status: 'resolved' })
          .eq('id', lost_item.id);

        await supabase
          .from('found_items')
          .update({ status: 'resolved' })
          .eq('id', found_item.id);
      }

      // 3. Create notifications
      // For claimant
      const title = newStatus === 'approved' ? 'Claim Request Approved' : 'Claim Request Rejected';
      const message = newStatus === 'approved'
        ? `Congratulations! Your ownership claim request for "${lost_item.item_name}" has been approved. You can collect it from the admin desk. Admin Remark: ${remark || 'None'}`
        : `Your claim request for "${lost_item.item_name}" has been rejected. Admin Remark: ${remark || 'No remark provided.'}`;

      await supabase.from('notifications').insert([{
        user_id: claimant.id,
        title,
        message
      }]);

      // For finder (if finder is not the claimant)
      const finderId = found_item.user_id;
      if (finderId && finderId !== claimant.id) {
        const finderMessage = newStatus === 'approved'
          ? `The item "${found_item.item_name}" you reported found has been claimed and verified by admin. Remark: ${remark || 'None'}`
          : `The claim request for found item "${found_item.item_name}" was rejected. The item remains active. Remark: ${remark || 'None'}`;
        
        await supabase.from('notifications').insert([{
          user_id: finderId,
          title: newStatus === 'approved' ? 'Reported Item Resolved' : 'Claim Verification Rejected',
          message: finderMessage
        }]);
      }

      alert(`Claim request has been ${newStatus}. Notifications sent.`);
      setSelectedClaim(null);
      fetchClaims();
    } catch (err) {
      console.error(err);
      alert('Failed to process claim: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader message="Loading claim registry logs..." />
      </DashboardLayout>
    );
  }

  // Render Split Screen Verification panel if selected
  if (selectedClaim) {
    const { claimant, lost_item, found_item, status } = selectedClaim;
    return (
      <DashboardLayout>
        <div className="mb-4">
          <button onClick={handleBackToList} className="btn btn-outline-secondary btn-sm mb-2 rounded-3">
            <i className="bi bi-arrow-left me-1"></i> Back to Claim Requests
          </button>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h2 className="fw-bold text-body-emphasis mb-0">Claim Manual Verification</h2>
            <span className={`badge ${
              status === 'approved' ? 'bg-success' : status === 'rejected' ? 'bg-danger' : 'bg-info text-dark'
            } px-3 py-2 fs-7 text-capitalize rounded-pill`}>
              Status: {status}
            </span>
          </div>
        </div>

        {/* Claimant Profile Details */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-body-tertiary">
          <h6 className="fw-bold text-body-emphasis mb-3">
            <i className="bi bi-person-badge-fill me-2 text-primary"></i> Claimant Profile Details
          </h6>
          <div className="row g-3 small text-secondary">
            <div className="col-12 col-md-3"><strong>Claimant Name:</strong> <div className="text-dark fw-bold mt-1">{claimant?.full_name}</div></div>
            <div className="col-6 col-md-3"><strong>Register Number:</strong> <div className="text-dark mt-1">{claimant?.register_number}</div></div>
            <div className="col-6 col-md-3"><strong>Department & Year:</strong> <div className="text-dark mt-1">{claimant?.department} ({claimant?.year})</div></div>
            <div className="col-6 col-md-3"><strong>Email & Phone:</strong> <div className="text-dark mt-1">{claimant?.email} / {claimant?.phone}</div></div>
          </div>
        </div>

        {/* Split Screen Panel */}
        <div className="row g-4 mb-4">
          {/* Left Side: Lost Item */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 bg-body">
              <div className="bg-warning bg-opacity-10 py-3 px-4 border-bottom">
                <h5 className="fw-bold text-warning-emphasis mb-0">
                  <i className="bi bi-question-circle-fill me-2"></i> Lost Item Specifications
                </h5>
              </div>
              <div className="p-4 d-flex flex-column h-100">
                <div className="bg-light rounded-4 overflow-hidden mb-3 d-flex align-items-center justify-content-center" style={{ height: '220px' }}>
                  {images.lost ? (
                    <img src={images.lost} alt="Lost Preview" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="text-muted text-center p-4">
                      <i className="bi bi-image fs-1 d-block mb-1 text-secondary"></i>
                      <p className="small mb-0">No image uploaded</p>
                    </div>
                  )}
                </div>
                <h4 className="fw-bold text-body-emphasis">{lost_item?.item_name}</h4>
                <div className="row g-2 mb-3 mt-1 small">
                  <div className="col-6"><strong>Category:</strong> <span className="text-capitalize">{lost_item?.category}</span></div>
                  <div className="col-6"><strong>Brand:</strong> {lost_item?.brand || 'N/A'}</div>
                  <div className="col-6"><strong>Color:</strong> {lost_item?.color || 'N/A'}</div>
                  <div className="col-6"><strong>Date Lost:</strong> {lost_item?.date_lost}</div>
                  <div className="col-12"><strong>Location Lost:</strong> {lost_item?.location}</div>
                </div>
                <hr className="mt-auto opacity-10" />
                <h6 className="fw-bold text-secondary">Item Description:</h6>
                <p className="small text-secondary mb-0 leading-relaxed">{lost_item?.description}</p>
              </div>
            </div>
          </div>

          {/* Right Side: Found Item */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 bg-body">
              <div className="bg-success bg-opacity-10 py-3 px-4 border-bottom">
                <h5 className="fw-bold text-success-emphasis mb-0">
                  <i className="bi bi-check-circle-fill me-2"></i> Found Item Specifications
                </h5>
              </div>
              <div className="p-4 d-flex flex-column h-100">
                <div className="bg-light rounded-4 overflow-hidden mb-3 d-flex align-items-center justify-content-center" style={{ height: '220px' }}>
                  {images.found ? (
                    <img src={images.found} alt="Found Preview" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="text-muted text-center p-4">
                      <i className="bi bi-image fs-1 d-block mb-1 text-secondary"></i>
                      <p className="small mb-0">No image uploaded</p>
                    </div>
                  )}
                </div>
                <h4 className="fw-bold text-body-emphasis">{found_item?.item_name}</h4>
                <div className="row g-2 mb-3 mt-1 small">
                  <div className="col-6"><strong>Category:</strong> <span className="text-capitalize">{found_item?.category}</span></div>
                  <div className="col-6"><strong>Brand:</strong> {found_item?.brand || 'N/A'}</div>
                  <div className="col-6"><strong>Color:</strong> {found_item?.color || 'N/A'}</div>
                  <div className="col-6"><strong>Date Found:</strong> {found_item?.date_found}</div>
                  <div className="col-12"><strong>Location Found:</strong> {found_item?.location}</div>
                </div>
                <hr className="mt-auto opacity-10" />
                <h6 className="fw-bold text-secondary">Item Description:</h6>
                <p className="small text-secondary mb-0 leading-relaxed">{found_item?.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Controls */}
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-body">
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary">Administrator Remarks / Observations</label>
            <textarea 
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="form-control bg-body-tertiary"
              rows="3"
              placeholder="e.g. Serial numbers verified. Student provided receipt proof or correct lockscreen code."
              disabled={actionLoading || status !== 'pending'}
            ></textarea>
          </div>
          
          {status === 'pending' ? (
            <div className="d-flex justify-content-end gap-3 mt-2">
              <button 
                onClick={() => handleProcessClaim('rejected')} 
                className="btn btn-outline-danger px-4 rounded-3 fw-bold"
                disabled={actionLoading}
              >
                Reject Claim Request
              </button>
              <button 
                onClick={() => handleProcessClaim('approved')} 
                className="btn btn-success px-5 rounded-3 fw-bold"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                ) : 'Approve & Resolve'}
              </button>
            </div>
          ) : (
            <div className="alert alert-secondary small mb-0 mt-2">
              This claim has already been resolved and locked. Action was finalized on{' '}
              {new Date(selectedClaim.created_at).toLocaleDateString()}.
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Render claims list table
  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">Verify Claim Submissions</h2>
        <p className="text-secondary">Review claimant profile, verify match parameters, and approve/reject claims.</p>
      </div>

      {claims.length > 0 ? (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-body">
          <div className="table-responsive small">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr className="text-secondary fw-bold">
                  <th scope="col" className="ps-4">Claimant</th>
                  <th scope="col">Lost Item</th>
                  <th scope="col">Found Item</th>
                  <th scope="col">Date Filed</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover-bg-light transition-all">
                    <td className="ps-4">
                      <div className="fw-bold text-body-emphasis">{claim.claimant?.full_name}</div>
                      <span className="text-muted small">{claim.claimant?.email}</span>
                    </td>
                    <td>{claim.lost_item?.item_name}</td>
                    <td>{claim.found_item?.item_name}</td>
                    <td>{new Date(claim.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${
                        claim.status === 'approved' ? 'bg-success' : claim.status === 'rejected' ? 'bg-danger' : 'bg-info text-dark'
                      } text-capitalize`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button 
                        onClick={() => handleSelectClaim(claim)}
                        className="btn btn-sm btn-primary rounded-3 px-3 fw-bold"
                      >
                        Verify Details
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
          <i className="bi bi-check2-circle display-1 text-success mb-3"></i>
          <h4 className="fw-bold">No Claim Requests</h4>
          <p className="text-muted small">No student ownership verification claims have been submitted.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageClaims;
