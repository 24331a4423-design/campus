import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Loader from '../../components/Loader';
import { supabase } from '../../services/supabase';
import { compareItems } from '../../services/gemini';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    totalUsers: 0,
    lostReports: 0,
    foundReports: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  });
  const [pendingClaimsList, setPendingClaimsList] = useState([]);

  // AI Matching re-run state
  const [matchingRunning, setMatchingRunning] = useState(false);
  const [matchingLog, setMatchingLog] = useState([]);
  const [matchingDone, setMatchingDone] = useState(false);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      try {
        // Total Users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Lost items
        const { count: lostCount } = await supabase
          .from('lost_items')
          .select('*', { count: 'exact', head: true });

        // Found items
        const { count: foundCount } = await supabase
          .from('found_items')
          .select('*', { count: 'exact', head: true });

        // Claims states
        const { count: pendingCount } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const { count: approvedCount } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');

        const { count: rejectedCount } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'rejected');

        setCounts({
          totalUsers: userCount || 0,
          lostReports: lostCount || 0,
          foundReports: foundCount || 0,
          pendingClaims: pendingCount || 0,
          approvedClaims: approvedCount || 0,
          rejectedClaims: rejectedCount || 0
        });

        // Load some pending claims
        const { data: claimsData } = await supabase
          .from('claims')
          .select(`
            id,
            created_at,
            claimant:claimant_id (full_name, email),
            lost_item:lost_item_id (item_name),
            found_item:found_item_id (item_name)
          `)
          .eq('status', 'pending')
          .limit(4);

        setPendingClaimsList(claimsData || []);

      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  const handleRunAIMatching = async () => {
    setMatchingRunning(true);
    setMatchingDone(false);
    setMatchingLog([]);
    const log = (msg) => setMatchingLog(prev => [...prev, msg]);

    try {
      // Fetch all active lost & found items
      const { data: lostItems } = await supabase.from('lost_items').select('*').eq('status', 'lost');
      const { data: foundItems } = await supabase.from('found_items').select('*').eq('status', 'found');

      if (!lostItems?.length || !foundItems?.length) {
        log('⚠️ No active lost or found items to compare.');
        setMatchingDone(true);
        setMatchingRunning(false);
        return;
      }

      log(`📋 Found ${lostItems.length} lost item(s) and ${foundItems.length} found item(s). Starting comparison...`);
      let newMatches = 0;

      for (const lost of lostItems) {
        for (const found of foundItems) {
          // Check if match already exists
          const { data: existing } = await supabase
            .from('ai_matches')
            .select('id')
            .eq('lost_item_id', lost.id)
            .eq('found_item_id', found.id)
            .maybeSingle();

          if (existing) continue; // Skip already matched pairs

          try {
            const match = await compareItems(lost, found);
            if (match.matchScore >= 50) {
              await supabase.from('ai_matches').insert([{
                lost_item_id: lost.id,
                found_item_id: found.id,
                match_score: match.matchScore,
                similarities: match.similarities,
                differences: match.differences,
                confidence: match.confidence,
                recommendation: match.recommendation
              }]);
              newMatches++;
              log(`✅ Match found: "${lost.item_name}" ↔ "${found.item_name}" (${match.matchScore}%)`);

              // Notify both users
              await supabase.from('notifications').insert([
                { user_id: lost.user_id, title: 'New AI Match Found', message: `AI matched your lost "${lost.item_name}" with a found "${found.item_name}" (${match.matchScore}% match).` },
                { user_id: found.user_id, title: 'New AI Match Found', message: `AI matched your found "${found.item_name}" with a lost "${lost.item_name}" (${match.matchScore}% match).` }
              ]);
            } else {
              log(`— No match: "${lost.item_name}" ↔ "${found.item_name}" (${match.matchScore}%)`);
            }
          } catch (err) {
            log(`❌ Error comparing "${lost.item_name}" & "${found.item_name}": ${err.message}`);
          }
        }
      }

      log(`🎉 Done! ${newMatches} new match(es) saved to the database.`);
    } catch (err) {
      log('❌ Fatal error: ' + err.message);
    } finally {
      setMatchingDone(true);
      setMatchingRunning(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader message="Loading administrator analytics..." />
      </DashboardLayout>
    );
  }

  // Calculations for SVG Donut/Pie chart
  const totalReports = counts.lostReports + counts.foundReports;
  const lostPercentage = totalReports > 0 ? (counts.lostReports / totalReports) * 100 : 50;
  const foundPercentage = totalReports > 0 ? (counts.foundReports / totalReports) * 100 : 50;
  
  // Circumference for SVG circle stroke: 2 * PI * r = 2 * 3.14159 * 40 = 251.2
  const strokeDashoffsetLost = 251.2 - (251.2 * lostPercentage) / 100;

  return (
    <DashboardLayout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap g-3">
        <div>
          <h2 className="fw-bold text-body-emphasis">Admin Dashboard</h2>
          <p className="text-secondary">Overview of registrations, item databases, and pending claims.</p>
        </div>
        <Link to="/admin/claims" className="btn btn-primary rounded-3 fw-bold shadow-sm">
          <i className="bi bi-check2-square me-2"></i> Review Claim Forms
        </Link>
      </div>

      {/* Cards Panel */}
      <div className="row g-3 mb-4">
        {/* Total Users */}
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body text-center hover-shadow transition-all h-100">
            <i className="bi bi-people-fill text-primary fs-3 mb-2"></i>
            <span className="text-secondary small fw-semibold d-block">Total Users</span>
            <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{counts.totalUsers}</h3>
          </div>
        </div>

        {/* Lost Reports */}
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body text-center hover-shadow transition-all h-100">
            <i className="bi bi-question-diamond-fill text-warning fs-3 mb-2"></i>
            <span className="text-secondary small fw-semibold d-block">Lost Reports</span>
            <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{counts.lostReports}</h3>
          </div>
        </div>

        {/* Found Reports */}
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body text-center hover-shadow transition-all h-100">
            <i className="bi bi-search-heart-fill text-success fs-3 mb-2"></i>
            <span className="text-secondary small fw-semibold d-block">Found Reports</span>
            <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{counts.foundReports}</h3>
          </div>
        </div>

        {/* Pending Claims */}
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body text-center hover-shadow transition-all h-100">
            <i className="bi bi-hourglass-split text-info fs-3 mb-2"></i>
            <span className="text-secondary small fw-semibold d-block">Pending Claims</span>
            <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{counts.pendingClaims}</h3>
          </div>
        </div>

        {/* Approved Claims */}
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body text-center hover-shadow transition-all h-100">
            <i className="bi bi-patch-check-fill text-success fs-3 mb-2"></i>
            <span className="text-secondary small fw-semibold d-block">Approved Claims</span>
            <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{counts.approvedClaims}</h3>
          </div>
        </div>

        {/* Rejected Claims */}
        <div className="col-6 col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body text-center hover-shadow transition-all h-100">
            <i className="bi bi-patch-exclamation-fill text-danger fs-3 mb-2"></i>
            <span className="text-secondary small fw-semibold d-block">Rejected Claims</span>
            <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{counts.rejectedClaims}</h3>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Analytics Highlights Charts */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-body-emphasis mb-0">Monthly Activity Trends</h5>
              <Link to="/admin/analytics" className="small text-primary text-decoration-none fw-semibold">
                More Analytics
              </Link>
            </div>
            
            {/* Custom SVG Grouped Bar Chart */}
            <div className="d-flex justify-content-center align-items-end" style={{ height: '220px' }}>
              <svg viewBox="0 0 450 200" className="w-100 h-100">
                {/* Gridlines */}
                <line x1="30" y1="160" x2="430" y2="160" stroke="#eee" strokeWidth="1" />
                <line x1="30" y1="110" x2="430" y2="110" stroke="#eee" strokeWidth="1" />
                <line x1="30" y1="60" x2="430" y2="60" stroke="#eee" strokeWidth="1" />
                <line x1="30" y1="10" x2="430" y2="10" stroke="#eee" strokeWidth="1" />
                
                {/* Bar Groups (Jan - Jun) */}
                {/* Jan (Lost: 45, Found: 35) */}
                <rect x="50" y="70" width="12" height="90" fill="var(--bs-warning)" rx="3" />
                <rect x="64" y="90" width="12" height="70" fill="var(--bs-success)" rx="3" />
                <text x="63" y="180" className="small text-muted" textAnchor="middle" style={{ fontSize: '10px' }}>Jan</text>

                {/* Feb (Lost: 60, Found: 50) */}
                <rect x="110" y="40" width="12" height="120" fill="var(--bs-warning)" rx="3" />
                <rect x="124" y="60" width="12" height="100" fill="var(--bs-success)" rx="3" />
                <text x="123" y="180" className="small text-muted" textAnchor="middle" style={{ fontSize: '10px' }}>Feb</text>

                {/* Mar (Lost: 85, Found: 75) */}
                <rect x="170" y="15" width="12" height="145" fill="var(--bs-warning)" rx="3" />
                <rect x="184" y="30" width="12" height="130" fill="var(--bs-success)" rx="3" />
                <text x="183" y="180" className="small text-muted" textAnchor="middle" style={{ fontSize: '10px' }}>Mar</text>

                {/* Apr (Lost: 70, Found: 90) */}
                <rect x="230" y="30" width="12" height="130" fill="var(--bs-warning)" rx="3" />
                <rect x="244" y="10" width="12" height="150" fill="var(--bs-success)" rx="3" />
                <text x="243" y="180" className="small text-muted" textAnchor="middle" style={{ fontSize: '10px' }}>Apr</text>

                {/* May (Lost: 95, Found: 80) */}
                <rect x="290" y="10" width="12" height="150" fill="var(--bs-warning)" rx="3" />
                <rect x="304" y="25" width="12" height="135" fill="var(--bs-success)" rx="3" />
                <text x="303" y="180" className="small text-muted" textAnchor="middle" style={{ fontSize: '10px' }}>May</text>

                {/* Jun (Lost: 120, Found: 110) */}
                <rect x="350" y="5" width="12" height="155" fill="var(--bs-warning)" rx="3" />
                <rect x="364" y="12" width="12" height="148" fill="var(--bs-success)" rx="3" />
                <text x="363" y="180" className="small text-muted" textAnchor="middle" style={{ fontSize: '10px' }}>Jun</text>
              </svg>
            </div>
            
            <div className="d-flex justify-content-center gap-4 mt-3 small">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '12px', height: '12px', background: 'var(--bs-warning)', borderRadius: '3px' }}></div>
                <span className="text-secondary">Lost Reports</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '12px', height: '12px', background: 'var(--bs-success)', borderRadius: '3px' }}></div>
                <span className="text-secondary">Found Reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ratio Donut Chart */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body h-100">
            <h5 className="fw-bold text-body-emphasis mb-4">Lost vs Found Ratio</h5>
            
            <div className="d-flex align-items-center justify-content-around h-100">
              <div className="position-relative" style={{ width: '130px', height: '130px' }}>
                <svg width="130" height="130" viewBox="0 0 100 100" className="position-absolute top-0 start-0">
                  {/* Found circle (underlay) */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="var(--bs-success)" 
                    strokeWidth="12" 
                  />
                  {/* Lost circle (dash-offset overlay) */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="var(--bs-warning)" 
                    strokeWidth="12" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={strokeDashoffsetLost} 
                    transform="rotate(-90 50 50)" 
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text */}
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <span className="fw-bold fs-4 d-block text-body-emphasis">{totalReports}</span>
                  <span className="text-muted small" style={{ fontSize: '10px' }}>Reports</span>
                </div>
              </div>

              <div className="small">
                <p className="mb-2">
                  <span className="badge bg-warning text-dark me-2">Lost</span> 
                  <strong>{counts.lostReports}</strong> ({lostPercentage.toFixed(0)}%)
                </p>
                <p className="mb-0">
                  <span className="badge bg-success me-2">Found</span> 
                  <strong>{counts.foundReports}</strong> ({foundPercentage.toFixed(0)}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Claims Review Area */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold text-body-emphasis mb-0">Claims Requiring Manual Approval</h5>
          {counts.pendingClaims > 0 && (
            <span className="badge bg-danger rounded-pill px-2">{counts.pendingClaims} Pending</span>
          )}
        </div>

        {pendingClaimsList.length > 0 ? (
          <div className="table-responsive small">
            <table className="table align-middle">
              <thead>
                <tr className="text-secondary">
                  <th scope="col" className="ps-0">Claimant</th>
                  <th scope="col">Lost Item</th>
                  <th scope="col">Found Item</th>
                  <th scope="col">Date Filed</th>
                  <th scope="col" className="text-end pe-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClaimsList.map((claim) => (
                  <tr key={claim.id}>
                    <td className="ps-0">
                      <div className="fw-bold text-body-emphasis">{claim.claimant?.full_name}</div>
                      <span className="text-muted small">{claim.claimant?.email}</span>
                    </td>
                    <td>{claim.lost_item?.item_name}</td>
                    <td>{claim.found_item?.item_name}</td>
                    <td>{new Date(claim.created_at).toLocaleDateString()}</td>
                    <td className="text-end pe-0">
                      <Link to="/admin/claims" className="btn btn-sm btn-primary rounded-3 px-3 fw-bold">
                        Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5 text-muted bg-light-subtle rounded-4">
            <i className="bi bi-patch-check text-success display-4 mb-2 d-block"></i>
            <p className="mb-0 small">All claims reviewed! No pending verification claims.</p>
          </div>
        )}
      </div>
      {/* AI Matching Panel */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-body mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
          <div>
            <h5 className="fw-bold text-body-emphasis mb-1">
              <i className="bi bi-stars me-2 text-primary"></i>AI Matching Engine
            </h5>
            <p className="text-secondary small mb-0">Run AI comparison across all active lost & found items to populate suggested matches.</p>
          </div>
          <button
            onClick={handleRunAIMatching}
            className="btn btn-primary rounded-3 fw-bold px-4"
            disabled={matchingRunning}
          >
            {matchingRunning ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Running...</>
            ) : (
              <><i className="bi bi-play-circle-fill me-2"></i>Run AI Matching Now</>
            )}
          </button>
        </div>

        {matchingLog.length > 0 && (
          <div
            className="bg-body-tertiary rounded-3 p-3 small font-monospace"
            style={{ maxHeight: '220px', overflowY: 'auto' }}
          >
            {matchingLog.map((line, i) => (
              <div key={i} className="mb-1 text-secondary">{line}</div>
            ))}
          </div>
        )}

        {matchingDone && (
          <div className="alert alert-success mt-3 mb-0 py-2 small">
            <i className="bi bi-check-circle-fill me-2"></i>
            Matching complete! Users will now see suggestions on their <strong>Suggested Matches</strong> page.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
