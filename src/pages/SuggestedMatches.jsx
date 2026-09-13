import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getSignedImageUrl } from '../services/storage';

const SuggestedMatches = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [images, setImages] = useState({ lost: '', found: '' });

  const fetchMatches = async () => {
    if (!user?.id) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ai_matches')
        .select(`
      id,
      created_at,
      match_score,
      similarities,
      differences,
      confidence,
      recommendation,
      status,
      lost_item:lost_item_id (*),
      found_item:found_item_id (*)
    `)
        .eq('status', 'pending')
        .order('match_score', { ascending: false });

      if (error) {
        throw error;
      }

      const userMatches = (data || []).filter(
        (match) =>
          match.lost_item?.user_id === user.id ||
          match.found_item?.user_id === user.id
      );

      setMatches(userMatches);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setMatches([]);
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    fetchMatches();
  }, [user]);

  useEffect(() => {
    const loadMatchImages = async () => {
      if (!selectedMatch) {
        setImages({ lost: '', found: '' });
        return;
      }

      let lostUrl = '';
      let foundUrl = '';

      try {
        if (selectedMatch.lost_item?.image_url) {
          lostUrl = await getSignedImageUrl(
            selectedMatch.lost_item.image_url
          );
        }

        if (selectedMatch.found_item?.image_url) {
          foundUrl = await getSignedImageUrl(
            selectedMatch.found_item.image_url
          );
        }

        setImages({
          lost: lostUrl,
          found: foundUrl
        });
      } catch (err) {
        console.error('Error fetching match images:', err);
        setImages({
          lost: '',
          found: ''
        });
      }
    };

    loadMatchImages();

  }, [selectedMatch]);

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
  };

  const handleBackToList = () => {
    setSelectedMatch(null);
  };

  const handleDismissMatch = async (matchId) => {
    const confirmed = window.confirm(
      'Are you sure you want to dismiss this match suggestion?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_matches')
        .update({
          status: 'dismissed'
        })
        .eq('id', matchId);

      if (error) {
        throw error;
      }

      setSelectedMatch(null);
      await fetchMatches();
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
      alert(
        'Failed to dismiss suggestion: ' +
        (err?.message || 'Unknown error')
      );
    }

  };

  const handleInitiateClaim = async () => {
    if (!selectedMatch || !user?.id) {
      return;
    }

    if (!selectedMatch.lost_item?.id || !selectedMatch.found_item?.id) {
      alert('This match is missing item information.');
      return;
    }

    setClaiming(true);

    try {
      const claimData = {
        lost_item_id: selectedMatch.lost_item.id,
        found_item_id: selectedMatch.found_item.id,
        claimant_id: user.id,
        status: 'pending'
      };

      const {
        error: claimErr
      } = await supabase
        .from('claims')
        .insert([claimData]);

      if (claimErr) {
        throw claimErr;
      }

      const { error: claimantNotificationError } =
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: user.id,
              title: 'Claim Submitted Successfully',
              message:
                `Your ownership claim request for "${selectedMatch.lost_item.item_name}" has been filed. An administrator will verify details shortly.`
            }
          ]);

      if (claimantNotificationError) {
        console.error(
          'Claim notification failed:',
          claimantNotificationError
        );
      }

      const finderId = selectedMatch.found_item.user_id;

      if (finderId && finderId !== user.id) {
        const { error: finderNotificationError } =
          await supabase
            .from('notifications')
            .insert([
              {
                user_id: finderId,
                title: 'Claim Filed for Found Item',
                message:
                  `Another student has claimed ownership of the item "${selectedMatch.found_item.item_name}" you reported. Undergoing admin review.`
              }
            ]);

        if (finderNotificationError) {
          console.error(
            'Finder notification failed:',
            finderNotificationError
          );
        }
      }

      const { error: matchUpdateError } = await supabase
        .from('ai_matches')
        .update({
          status: 'claimed'
        })
        .eq('id', selectedMatch.id);

      if (matchUpdateError) {
        console.error(
          'Failed to update match status:',
          matchUpdateError
        );
      }

      alert(
        'Claim submitted successfully! The campus administrator will verify ownership details and notify you.'
      );

      setSelectedMatch(null);
      await fetchMatches();
    } catch (err) {
      console.error('Failed to file claim:', err);

      alert(
        'Failed to file claim: ' +
        (err?.message || 'Unknown error')
      );
    } finally {
      setClaiming(false);
    }

  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader message="Scanning your reports for matches..." />
      </DashboardLayout>
    );
  }

  if (selectedMatch) {
    const isOwnerOfLost =
      selectedMatch.lost_item?.user_id === user?.id;

    return (
      <DashboardLayout>
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <div>
            <button
              onClick={handleBackToList}
              className="btn btn-outline-secondary btn-sm mb-2 rounded-3"
            >
              <i className="bi bi-arrow-left me-1"></i>
              Back to Suggestions
            </button>

            <h2 className="fw-bold text-body-emphasis mb-0">
              Manual Verification
            </h2>
          </div>

          <span className="badge bg-primary px-3 py-2 fs-6 rounded-pill">
            Match Score: {selectedMatch.match_score}%
          </span>
        </div>

        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-body-tertiary">
          <div className="d-flex align-items-center gap-2 text-primary fw-bold mb-3">
            <i className="bi bi-stars"></i>
            <span>
              AI MATCH INSIGHTS
              {' '}
              (Confidence: {selectedMatch.confidence})
            </span>
          </div>

          <div className="row g-3 small text-secondary">
            <div className="col-12 col-md-6">
              <strong>Similarities:</strong>
              <p className="mt-1">
                {selectedMatch.similarities || 'No similarity details available.'}
              </p>
            </div>

            <div className="col-12 col-md-6">
              <strong>Differences:</strong>
              <p className="mt-1">
                {selectedMatch.differences || 'No difference details available.'}
              </p>
            </div>

            <div className="col-12">
              <strong>Recommendation:</strong>
              <p className="mt-1 mb-0 text-dark fw-semibold">
                {selectedMatch.recommendation || 'Review both reports manually.'}
              </p>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 bg-body">

              <div className="bg-warning bg-opacity-10 py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="fw-bold text-warning-emphasis mb-0">
                  <i className="bi bi-question-circle-fill me-2"></i>
                  Lost Item Report
                </h5>

                {isOwnerOfLost && (
                  <span className="badge bg-warning text-dark small">
                    My Item
                  </span>
                )}
              </div>

              <div className="p-4 d-flex flex-column h-100">

                <div
                  className="bg-light rounded-4 overflow-hidden mb-3 d-flex align-items-center justify-content-center"
                  style={{ height: '220px' }}
                >
                  {images.lost ? (
                    <img
                      src={images.lost}
                      alt="Lost Preview"
                      className="w-100 h-100"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="text-muted text-center p-4">
                      <i className="bi bi-image fs-1 d-block mb-1 text-secondary"></i>
                      <p className="small mb-0">
                        No image uploaded
                      </p>
                    </div>
                  )}
                </div>

                <h4 className="fw-bold text-body-emphasis">
                  {selectedMatch.lost_item?.item_name}
                </h4>

                <div className="row g-2 mb-3 mt-1 small">
                  <div className="col-6">
                    <strong>Category:</strong>{' '}
                    <span className="text-capitalize">
                      {selectedMatch.lost_item?.category}
                    </span>
                  </div>

                  <div className="col-6">
                    <strong>Brand:</strong>{' '}
                    {selectedMatch.lost_item?.brand || 'N/A'}
                  </div>

                  <div className="col-6">
                    <strong>Color:</strong>{' '}
                    {selectedMatch.lost_item?.color || 'N/A'}
                  </div>

                  <div className="col-6">
                    <strong>Date Lost:</strong>{' '}
                    {selectedMatch.lost_item?.date_lost || 'N/A'}
                  </div>

                  <div className="col-12">
                    <strong>Location:</strong>{' '}
                    {selectedMatch.lost_item?.location || 'N/A'}
                  </div>
                </div>

                <hr className="mt-auto opacity-10" />

                <h6 className="fw-bold text-secondary">
                  Item Description:
                </h6>

                <p className="small text-secondary mb-0 leading-relaxed">
                  {selectedMatch.lost_item?.description || 'No description available.'}
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 bg-body">

              <div className="bg-success bg-opacity-10 py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="fw-bold text-success-emphasis mb-0">
                  <i className="bi bi-search me-2"></i>
                  Found Item Report
                </h5>

                {!isOwnerOfLost && (
                  <span className="badge bg-success small">
                    My Item
                  </span>
                )}
              </div>

              <div className="p-4 d-flex flex-column h-100">

                <div
                  className="bg-light rounded-4 overflow-hidden mb-3 d-flex align-items-center justify-content-center"
                  style={{ height: '220px' }}
                >
                  {images.found ? (
                    <img
                      src={images.found}
                      alt="Found Preview"
                      className="w-100 h-100"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="text-muted text-center p-4">
                      <i className="bi bi-image fs-1 d-block mb-1 text-secondary"></i>
                      <p className="small mb-0">
                        No image uploaded
                      </p>
                    </div>
                  )}
                </div>

                <h4 className="fw-bold text-body-emphasis">
                  {selectedMatch.found_item?.item_name}
                </h4>

                <div className="row g-2 mb-3 mt-1 small">
                  <div className="col-6">
                    <strong>Category:</strong>{' '}
                    <span className="text-capitalize">
                      {selectedMatch.found_item?.category}
                    </span>
                  </div>

                  <div className="col-6">
                    <strong>Brand:</strong>{' '}
                    {selectedMatch.found_item?.brand || 'N/A'}
                  </div>

                  <div className="col-6">
                    <strong>Color:</strong>{' '}
                    {selectedMatch.found_item?.color || 'N/A'}
                  </div>

                  <div className="col-6">
                    <strong>Date Found:</strong>{' '}
                    {selectedMatch.found_item?.date_found || 'N/A'}
                  </div>

                  <div className="col-12">
                    <strong>Location:</strong>{' '}
                    {selectedMatch.found_item?.location || 'N/A'}
                  </div>
                </div>

                <hr className="mt-auto opacity-10" />

                <h6 className="fw-bold text-secondary">
                  Item Description:
                </h6>

                <p className="small text-secondary mb-0 leading-relaxed">
                  {selectedMatch.found_item?.description || 'No description available.'}
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="card border-0 shadow-sm rounded-4 p-3 bg-body d-flex flex-row justify-content-end gap-3">

          <button
            onClick={() =>
              handleDismissMatch(selectedMatch.id)
            }
            className="btn btn-outline-danger px-4 rounded-3 fw-bold"
            disabled={claiming}
          >
            <i className="bi bi-trash me-1"></i>
            Dismiss Suggestion
          </button>

          {isOwnerOfLost && (
            <button
              onClick={handleInitiateClaim}
              className="btn btn-primary px-5 rounded-3 fw-bold"
              disabled={claiming}
            >
              {claiming ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>
                  Filing Claim...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-1"></i>
                  Request Claim
                </>
              )}
            </button>
          )}

          {!isOwnerOfLost && (
            <div className="alert alert-secondary mb-0 py-2 small d-flex align-items-center">
              <i className="bi bi-info-circle-fill me-2 fs-5"></i>
              Wait for the owner of the lost report to initiate the claim,
              or suggest they review this.
            </div>
          )}

        </div>
      </DashboardLayout>
    );

  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">
          Suggested Matches
        </h2>

        <p className="text-secondary">
          AI recommendations linking your reported items with active listings.
        </p>
      </div>

      {matches.length > 0 ? (
        <div className="row g-4">

          {matches.map((match) => {
            const isOwnerOfLost =
              match.lost_item?.user_id === user?.id;

            return (
              <div
                key={match.id}
                className="col-12 col-md-6 col-lg-4"
              >
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-body hover-shadow transition-all d-flex flex-column justify-content-between h-100">

                  <div>

                    <div className="d-flex align-items-center justify-content-between mb-3">

                      <span className="badge bg-primary-subtle text-primary px-3 py-1 rounded-pill fw-bold small">
                        {match.match_score}% Score
                      </span>

                      <span className="small text-muted">
                        {match.created_at
                          ? new Date(
                            match.created_at
                          ).toLocaleDateString()
                          : 'Recently'}
                      </span>

                    </div>

                    <div className="mb-3">
                      <h6 className="text-uppercase small fw-bold text-secondary mb-1">
                        Lost Item:
                      </h6>

                      <span className="fw-bold text-body-emphasis">
                        {match.lost_item?.item_name || 'Unknown'}
                      </span>

                      {isOwnerOfLost && (
                        <span className="badge bg-warning text-dark ms-2 small">
                          Mine
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <h6 className="text-uppercase small fw-bold text-secondary mb-1">
                        Found Item:
                      </h6>

                      <span className="fw-bold text-body-emphasis">
                        {match.found_item?.item_name || 'Unknown'}
                      </span>

                      {!isOwnerOfLost && (
                        <span className="badge bg-success ms-2 small">
                          Mine
                        </span>
                      )}
                    </div>

                    <hr className="opacity-10 my-3" />

                    <p className="small text-secondary mb-0 text-truncate-3">
                      <strong>AI Suggestion:</strong>{' '}
                      {match.recommendation ||
                        'Review this potential match.'}
                    </p>

                  </div>

                  <button
                    onClick={() => handleSelectMatch(match)}
                    className="btn btn-primary w-100 mt-4 py-2 rounded-3 fw-bold"
                  >
                    Verify Match Details
                  </button>

                </div>
              </div>
            );
          })}

        </div>
      ) : (
        <div className="card text-center border-0 shadow-sm p-5 bg-body rounded-4">

          <i className="bi bi-stars display-1 text-info mb-3"></i>

          <h4 className="fw-bold text-body-emphasis">
            No AI Matches Found
          </h4>

          <p className="text-muted small mb-0">
            Gemini will auto-suggest matches once new items are
            cataloged in the system.
          </p>

        </div>
      )}

    </DashboardLayout>

  );
};

export default SuggestedMatches;