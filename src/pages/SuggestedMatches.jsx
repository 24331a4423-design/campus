
import React, { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

const HANDOVER_LOCATIONS = [
  "Campus Security Office",
  "Lost & Found Office",
  "Library Help Desk",
  "Student Affairs Office",
];

export default function SuggestedMatches() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [claimStatus, setClaimStatus] = useState(null);
  const [contactInfo, setContactInfo] = useState(null);

  const [loadingClaim, setLoadingClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [images, setImages] = useState({
    lost: null,
    found: null,
  });

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_matches")
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
        .eq("status", "pending")
        .order("match_score", { ascending: false });

      if (error) {
        throw error;
      }

      const userMatches = (data || []).filter((match) => {
        const lostOwner = match.lost_item?.user_id;
        const foundOwner = match.found_item?.user_id;

        return (
          lostOwner === user.id ||
          foundOwner === user.id
        );
      });

      setMatches(userMatches);
    } catch (error) {
      console.error("Error fetching suggested matches:", error);
      alert("Unable to load suggested matches.");
    } finally {
      setLoading(false);
    }
  };

  const loadImages = (match) => {
    setImages({
      lost:
        match.lost_item?.image_url ||
        match.lost_item?.image ||
        match.lost_item?.photo_url ||
        null,

      found:
        match.found_item?.image_url ||
        match.found_item?.image ||
        match.found_item?.photo_url ||
        null,
    });
  };

  const loadClaimAndContact = async (match) => {
    if (!user || !match) {
      return;
    }

    try {
      setLoadingClaim(true);
      setClaimStatus(null);
      setContactInfo(null);

      const lostItemId = match.lost_item?.id;
      const foundItemId = match.found_item?.id;

      if (!lostItemId || !foundItemId) {
        return;
      }

      const { data: claims, error: claimError } =
        await supabase
          .from("claims")
          .select("id, status, claimant_id, created_at")
          .eq("lost_item_id", lostItemId)
          .eq("found_item_id", foundItemId)
          .order("created_at", { ascending: false })
          .limit(1);

      if (claimError) {
        throw claimError;
      }

      const claim = claims?.[0];

      if (!claim) {
        setClaimStatus(null);
        return;
      }

      setClaimStatus(claim.status);

      if (claim.status !== "approved") {
        return;
      }

      const { data: contact, error: contactError } =
        await supabase.rpc("get_approved_contact", {
          p_lost_item_id: lostItemId,
          p_found_item_id: foundItemId,
        });

      if (contactError) {
        console.error(
          "Secure contact lookup failed:",
          contactError
        );
        return;
      }

      if (contact && contact.length > 0) {
        setContactInfo(contact[0]);
      }
    } catch (error) {
      console.error(
        "Error loading claim information:",
        error
      );
    } finally {
      setLoadingClaim(false);
    }
  };

  const openMatch = async (match) => {
    setSelectedMatch(match);

    setClaimStatus(null);
    setContactInfo(null);

    loadImages(match);
    await loadClaimAndContact(match);
  };

  const handleDismissMatch = async (matchId) => {
    try {
      const { error } = await supabase
        .from("ai_matches")
        .update({
          status: "dismissed",
        })
        .eq("id", matchId);

      if (error) {
        throw error;
      }

      setMatches((current) =>
        current.filter((match) => match.id !== matchId)
      );

      setSelectedMatch(null);
    } catch (error) {
      console.error(
        "Error dismissing match:",
        error
      );

      alert("Unable to dismiss this suggestion.");
    }
  };

  const handleInitiateClaim = async () => {
    if (!user || !selectedMatch) {
      return;
    }

    const lostItemId = selectedMatch.lost_item?.id;
    const foundItemId = selectedMatch.found_item?.id;

    if (!lostItemId || !foundItemId) {
      alert(
        "Unable to identify the items for this claim."
      );
      return;
    }

    try {
      setClaiming(true);

      const {
        data: existingClaims,
        error: existingError,
      } = await supabase
        .from("claims")
        .select("id, status")
        .eq("lost_item_id", lostItemId)
        .eq("found_item_id", foundItemId)
        .eq("claimant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      if (
        existingClaims &&
        existingClaims.length > 0
      ) {
        const existingClaim = existingClaims[0];

        setClaimStatus(existingClaim.status);

        if (existingClaim.status === "pending") {
          alert(
            "You already have a claim pending for this match."
          );
        } else if (
          existingClaim.status === "approved"
        ) {
          alert(
            "Your claim has already been approved."
          );
        } else if (
          existingClaim.status === "rejected"
        ) {
          alert(
            "Your previous claim for this match was rejected."
          );
        }

        return;
      }

      const {
        data: newClaim,
        error: claimError,
      } = await supabase
        .from("claims")
        .insert({
          lost_item_id: lostItemId,
          found_item_id: foundItemId,
          claimant_id: user.id,
          status: "pending",
        })
        .select("id, status")
        .single();

      if (claimError) {
        throw claimError;
      }

      setClaimStatus(newClaim.status);

      alert(
        "Claim request submitted. An administrator must approve it before contact details are revealed."
      );
    } catch (error) {
      console.error(
        "Error requesting claim:",
        error
      );

      alert(
        error.message ||
        "Unable to submit claim request."
      );
    } finally {
      setClaiming(false);
    }
  };

  const isLostOwner =
    selectedMatch?.lost_item?.user_id === user?.id;

  const isFoundOwner =
    selectedMatch?.found_item?.user_id === user?.id;

  const otherPersonLabel = isLostOwner
    ? "Finder"
    : "Item Owner";

  const getClaimBadge = () => {
    if (claimStatus === "pending") {
      return (
        <span className="badge bg-warning text-dark">
          Claim Pending
        </span>
      );
    }

    if (claimStatus === "approved") {
      return (
        <span className="badge bg-success">
          Claim Approved
        </span>
      );
    }

    if (claimStatus === "rejected") {
      return (
        <span className="badge bg-danger">
          Claim Rejected
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        No Claim Requested
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader />
      </DashboardLayout>
    );
  }

  if (selectedMatch) {
    const lostItem = selectedMatch.lost_item;
    const foundItem = selectedMatch.found_item;

    return (
      <DashboardLayout>
        <div className="container py-4">

          <button
            className="btn btn-outline-secondary mb-4"
            onClick={() => setSelectedMatch(null)}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Suggested Matches
          </button>

          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">

              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">

                <div>
                  <h3 className="mb-1">
                    Suggested Match
                  </h3>

                  <p className="text-muted mb-0">
                    AI-assisted comparison between a
                    lost and found report.
                  </p>
                </div>

                <div className="text-end">

                  <div className="display-6 fw-bold text-primary">
                    {selectedMatch.match_score}%
                  </div>

                  <small className="text-muted">
                    Confidence:{" "}
                    {selectedMatch.confidence}
                  </small>

                </div>

              </div>

            </div>
          </div>

          <div className="row g-4">

            <div className="col-md-6">
              <div className="card h-100 shadow-sm">

                {images.lost && (
                  <img
                    src={images.lost}
                    className="card-img-top"
                    alt={
                      lostItem?.item_name ||
                      "Lost item"
                    }
                    style={{
                      maxHeight: "280px",
                      objectFit: "cover",
                    }}
                  />
                )}

                <div className="card-body">

                  <h5>
                    <i className="bi bi-search me-2"></i>
                    Lost Item
                  </h5>

                  <h4>
                    {lostItem?.item_name ||
                      "Unknown item"}
                  </h4>

                  {lostItem?.category && (
                    <p className="mb-1">
                      <strong>Category:</strong>{" "}
                      {lostItem.category}
                    </p>
                  )}

                  {lostItem?.brand && (
                    <p className="mb-1">
                      <strong>Brand:</strong>{" "}
                      {lostItem.brand}
                    </p>
                  )}

                  {lostItem?.color && (
                    <p className="mb-1">
                      <strong>Color:</strong>{" "}
                      {lostItem.color}
                    </p>
                  )}

                  {lostItem?.description && (
                    <p className="mt-3 mb-0">
                      <strong>Description:</strong>{" "}
                      {lostItem.description}
                    </p>
                  )}

                  {lostItem?.location && (
                    <p className="mt-2 mb-0">
                      <strong>Location:</strong>{" "}
                      {lostItem.location}
                    </p>
                  )}

                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100 shadow-sm">

                {images.found && (
                  <img
                    src={images.found}
                    className="card-img-top"
                    alt={
                      foundItem?.item_name ||
                      "Found item"
                    }
                    style={{
                      maxHeight: "280px",
                      objectFit: "cover",
                    }}
                  />
                )}

                <div className="card-body">

                  <h5>
                    <i className="bi bi-box-seam me-2"></i>
                    Found Item
                  </h5>

                  <h4>
                    {foundItem?.item_name ||
                      "Unknown item"}
                  </h4>

                  {foundItem?.category && (
                    <p className="mb-1">
                      <strong>Category:</strong>{" "}
                      {foundItem.category}
                    </p>
                  )}

                  {foundItem?.brand && (
                    <p className="mb-1">
                      <strong>Brand:</strong>{" "}
                      {foundItem.brand}
                    </p>
                  )}

                  {foundItem?.color && (
                    <p className="mb-1">
                      <strong>Color:</strong>{" "}
                      {foundItem.color}
                    </p>
                  )}

                  {foundItem?.description && (
                    <p className="mt-3 mb-0">
                      <strong>Description:</strong>{" "}
                      {foundItem.description}
                    </p>
                  )}

                  {foundItem?.location && (
                    <p className="mt-2 mb-0">
                      <strong>Location:</strong>{" "}
                      {foundItem.location}
                    </p>
                  )}

                </div>
              </div>
            </div>

          </div>

          <div className="card shadow-sm border-0 mt-4">
            <div className="card-body">

              <h5 className="mb-3">
                <i className="bi bi-stars me-2"></i>
                AI Match Analysis
              </h5>

              <div className="row g-3">

                <div className="col-md-6">
                  <div className="p-3 bg-light rounded">

                    <strong>Similarities</strong>

                    <p className="mb-0 mt-2">
                      {selectedMatch.similarities ||
                        "No similarity details available."}
                    </p>

                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 bg-light rounded">

                    <strong>Differences</strong>

                    <p className="mb-0 mt-2">
                      {selectedMatch.differences ||
                        "No difference details available."}
                    </p>

                  </div>
                </div>

              </div>

              <div className="alert alert-info mt-3 mb-0">
                <strong>
                  AI Recommendation:
                </strong>{" "}
                {selectedMatch.recommendation ||
                  "Review the item details carefully before requesting a claim."}
              </div>

            </div>
          </div>

          <div className="card shadow-sm border-0 mt-4">
            <div className="card-body">

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">

                <h5 className="mb-0">
                  <i className="bi bi-shield-check me-2"></i>
                  Claim Status
                </h5>

                {getClaimBadge()}

              </div>

              {loadingClaim && (
                <div className="mt-3 text-muted">
                  Checking claim status...
                </div>
              )}

              {!loadingClaim &&
                claimStatus === "pending" && (
                  <div className="alert alert-warning mt-3 mb-0">
                    <strong>
                      Claim submitted.
                    </strong>

                    <br />

                    An administrator must verify your
                    claim before contact details are
                    revealed.
                  </div>
                )}

              {!loadingClaim &&
                claimStatus === "rejected" && (
                  <div className="alert alert-danger mt-3 mb-0">
                    Your claim was rejected by an
                    administrator. Contact information
                    remains hidden.
                  </div>
                )}

              {!loadingClaim &&
                claimStatus === "approved" && (
                  <div className="alert alert-success mt-3 mb-0">
                    <strong>
                      Your claim has been approved.
                    </strong>

                    <br />

                    Contact information is now available
                    for arranging a safe handover.
                  </div>
                )}

              {!loadingClaim &&
                !claimStatus &&
                isLostOwner && (
                  <div className="mt-3">

                    <p className="text-muted">
                      If you believe this is your lost
                      item, submit a claim request. An
                      administrator will verify it.
                    </p>

                    <button
                      className="btn btn-primary"
                      onClick={handleInitiateClaim}
                      disabled={claiming}
                    >
                      {claiming ? (
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
                          Request Claim
                        </>
                      )}
                    </button>

                  </div>
                )}

              {!loadingClaim &&
                !claimStatus &&
                !isLostOwner &&
                isFoundOwner && (
                  <div className="alert alert-info mt-3 mb-0">
                    The lost-item owner must request
                    the claim. You will be able to
                    coordinate the handover after the
                    claim is approved.
                  </div>
                )}

            </div>
          </div>

          {claimStatus === "approved" && (
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-body">

                <h5 className="mb-3">
                  <i className="bi bi-person-lines-fill me-2"></i>
                  Contact & Safe Handover
                </h5>

                {contactInfo ? (
                  <>
                    <div className="alert alert-success">

                      <strong>
                        Approved contact:
                      </strong>{" "}
                      {contactInfo.full_name ||
                        otherPersonLabel}

                      <br />

                      {contactInfo.phone ? (
                        <span>
                          Phone:{" "}
                          <strong>
                            {contactInfo.phone}
                          </strong>
                        </span>
                      ) : (
                        <span>
                          No phone number is available.
                        </span>
                      )}

                    </div>

                    {contactInfo.phone && (
                      <div className="d-flex flex-wrap gap-2 mb-4">

                        <a
                          href={`tel:${contactInfo.phone}`}
                          className="btn btn-success"
                        >
                          <i className="bi bi-telephone-fill me-2"></i>
                          Call {otherPersonLabel}
                        </a>

                        <a
                          href={`https://wa.me/${String(
                            contactInfo.phone
                          ).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-success"
                        >
                          <i className="bi bi-whatsapp me-2"></i>
                          WhatsApp Message
                        </a>

                      </div>
                    )}

                    <div className="border rounded p-3">

                      <h6>
                        <i className="bi bi-geo-alt-fill me-2"></i>
                        Recommended Safe Handover Locations
                      </h6>

                      <p className="text-muted small">
                        For everyone's safety, arrange the
                        exchange at an official campus
                        location rather than a private or
                        isolated location.
                      </p>

                      <ul className="mb-0">
                        {HANDOVER_LOCATIONS.map(
                          (location) => (
                            <li key={location}>
                              {location}
                            </li>
                          )
                        )}
                      </ul>

                    </div>
                  </>
                ) : (
                  <div className="alert alert-warning mb-0">
                    Your claim is approved, but contact
                    information could not be retrieved.
                    Please contact campus administration
                    for assistance.
                  </div>
                )}

              </div>
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mt-4">

            <button
              className="btn btn-outline-danger"
              onClick={() =>
                handleDismissMatch(
                  selectedMatch.id
                )
              }
            >
              <i className="bi bi-x-circle me-2"></i>
              Dismiss Suggestion
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={() =>
                setSelectedMatch(null)
              }
            >
              Back to Matches
            </button>

          </div>

        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-4">

        <div className="mb-4">
          <h2>
            <i className="bi bi-stars me-2"></i>
            Suggested Matches
          </h2>

          <p className="text-muted">
            AI-generated matches between your
            lost/found reports and relevant campus
            reports.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="card shadow-sm border-0">
            <div className="card-body text-center py-5">

              <i className="bi bi-search display-4 text-muted"></i>

              <h4 className="mt-3">
                No suggested matches
              </h4>

              <p className="text-muted mb-0">
                We will show potential matches here
                when the AI matching system finds
                relevant reports.
              </p>

            </div>
          </div>
        ) : (
          <div className="row g-4">

            {matches.map((match) => (
              <div
                className="col-md-6 col-lg-4"
                key={match.id}
              >
                <div className="card h-100 shadow-sm border-0">

                  <div className="card-body">

                    <div className="d-flex justify-content-between align-items-start mb-3">

                      <span className="badge bg-primary">
                        {match.match_score}% Match
                      </span>

                      <span className="badge bg-light text-dark">
                        {match.confidence}
                      </span>

                    </div>

                    <h5 className="card-title">

                      {match.lost_item?.item_name ||
                        "Lost item"}

                      <i className="bi bi-arrow-left-right mx-1"></i>

                      {match.found_item?.item_name ||
                        "Found item"}

                    </h5>

                    <p className="text-muted small">
                      {match.recommendation ||
                        "Potential match identified by AI."}
                    </p>

                    <div className="small text-muted mb-3">
                      <strong>
                        Similarities:
                      </strong>{" "}
                      {match.similarities ||
                        "Not available"}
                    </div>

                    <button
                      className="btn btn-primary w-100"
                      onClick={() =>
                        openMatch(match)
                      }
                    >
                      <i className="bi bi-eye me-2"></i>
                      Inspect Match Details
                    </button>

                  </div>
                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

