import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { supabase } from "../../services/supabase";

const ManageClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");

  const fetchClaims = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("claims")
        .select(`
      *,
      lost_items (
        id,
        item_name,
        category,
        brand,
        color,
        description,
        location,
        status,
        user_id
      ),
      found_items (
        id,
        item_name,
        category,
        brand,
        color,
        description,
        location,
        status,
        user_id
      )
    `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setClaims(data || []);
    } catch (error) {
      console.error("Error loading claims:", error);
      setMessage(error.message || "Failed to load claims.");
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const updateClaim = async (claim, newStatus) => {
    setProcessingId(claim.id);
    setMessage("");

    try {
      const { error: claimError } = await supabase
        .from("claims")
        .update({
          status: newStatus,
        })
        .eq("id", claim.id);

      if (claimError) {
        throw claimError;
      }

      if (newStatus === "approved") {
        if (claim.lost_item_id) {
          const { error: lostError } = await supabase
            .from("lost_items")
            .update({ status: "resolved" })
            .eq("id", claim.lost_item_id);

          if (lostError) {
            throw lostError;
          }
        }

        if (claim.found_item_id) {
          const { error: foundError } = await supabase
            .from("found_items")
            .update({ status: "resolved" })
            .eq("id", claim.found_item_id);

          if (foundError) {
            throw foundError;
          }
        }
      }

      setMessage(
        newStatus === "approved"
          ? "Claim approved successfully."
          : "Claim rejected successfully."
      );

      await fetchClaims();
    } catch (error) {
      console.error("Error updating claim:", error);
      setMessage(error.message || "Failed to update claim.");
    } finally {
      setProcessingId(null);
    }

  };

  return (
    <DashboardLayout>
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">Manage Claims</h2>
            <p className="text-muted mb-0">
              Review and verify lost & found item claims.
            </p>
          </div>

          <button
            className="btn btn-outline-primary"
            onClick={fetchClaims}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>

        {message && (
          <div className="alert alert-info" role="alert">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 text-muted">Loading claims...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="card shadow-sm border-0">
            <div className="card-body text-center py-5">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <h5 className="mt-3">No claims found</h5>
              <p className="text-muted mb-0">
                There are currently no claims to review.
              </p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {claims.map((claim) => {
              const lostItem = claim.lost_items;
              const foundItem = claim.found_items;

              return (
                <div className="col-12" key={claim.id}>
                  <div className="card shadow-sm border-0">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="fw-bold mb-1">
                            Claim #{claim.id}
                          </h5>

                          <small className="text-muted">
                            Submitted{" "}
                            {claim.created_at
                              ? new Date(
                                claim.created_at
                              ).toLocaleString()
                              : "Unknown date"}
                          </small>
                        </div>

                        <span
                          className={`badge ${claim.status === "approved"
                            ? "bg-success"
                            : claim.status === "rejected"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                            }`}
                        >
                          {claim.status || "pending"}
                        </span>
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="border rounded p-3 h-100">
                            <h6 className="fw-bold text-danger">
                              <i className="bi bi-search me-2"></i>
                              Lost Item
                            </h6>

                            {lostItem ? (
                              <>
                                <p className="mb-1">
                                  <strong>Name:</strong>{" "}
                                  {lostItem.item_name || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Category:</strong>{" "}
                                  {lostItem.category || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Brand:</strong>{" "}
                                  {lostItem.brand || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Color:</strong>{" "}
                                  {lostItem.color || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Location:</strong>{" "}
                                  {lostItem.location || "N/A"}
                                </p>

                                <p className="mb-0">
                                  <strong>Description:</strong>{" "}
                                  {lostItem.description || "N/A"}
                                </p>
                              </>
                            ) : (
                              <p className="text-muted mb-0">
                                Lost item information unavailable.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="border rounded p-3 h-100">
                            <h6 className="fw-bold text-success">
                              <i className="bi bi-box-seam me-2"></i>
                              Found Item
                            </h6>

                            {foundItem ? (
                              <>
                                <p className="mb-1">
                                  <strong>Name:</strong>{" "}
                                  {foundItem.item_name || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Category:</strong>{" "}
                                  {foundItem.category || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Brand:</strong>{" "}
                                  {foundItem.brand || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Color:</strong>{" "}
                                  {foundItem.color || "N/A"}
                                </p>

                                <p className="mb-1">
                                  <strong>Location:</strong>{" "}
                                  {foundItem.location || "N/A"}
                                </p>

                                <p className="mb-0">
                                  <strong>Description:</strong>{" "}
                                  {foundItem.description || "N/A"}
                                </p>
                              </>
                            ) : (
                              <p className="text-muted mb-0">
                                Found item information unavailable.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {claim.status === "pending" && (
                        <div className="d-flex gap-2 justify-content-end mt-4">
                          <button
                            className="btn btn-danger"
                            disabled={processingId === claim.id}
                            onClick={() =>
                              updateClaim(claim, "rejected")
                            }
                          >
                            <i className="bi bi-x-circle me-2"></i>
                            Reject
                          </button>

                          <button
                            className="btn btn-success"
                            disabled={processingId === claim.id}
                            onClick={() =>
                              updateClaim(claim, "approved")
                            }
                          >
                            {processingId === claim.id ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                ></span>
                                Processing...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-2"></i>
                                Approve
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>

  );
};

export default ManageClaims;
