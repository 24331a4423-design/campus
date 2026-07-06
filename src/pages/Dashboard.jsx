import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import Loader from '../components/Loader';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLost: 0,
    totalFound: 0,
    myReports: 0,
    suggestedMatches: 0,
    unreadNotifications: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Total active Lost
        const { count: lostCount, error: lostErr } = await supabase
          .from('lost_items')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'lost');

        // 2. Total active Found
        const { count: foundCount, error: foundErr } = await supabase
          .from('found_items')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'found');

        // 3. User's own Lost reports
        const { data: myLost, error: myLostErr } = await supabase
          .from('lost_items')
          .select('id, item_name, status, created_at')
          .eq('user_id', user.id);

        // 4. User's own Found reports
        const { data: myFound, error: myFoundErr } = await supabase
          .from('found_items')
          .select('id, item_name, status, created_at')
          .eq('user_id', user.id);

        const myReportsCount = (myLost?.length || 0) + (myFound?.length || 0);

        // 5. Unread notifications
        const { count: notifCount, error: notifErr } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        // 6. User's Suggested Matches
        // A match is associated with the user if the user owns either the lost_item or found_item
        const myLostIds = myLost?.map(i => i.id) || [];
        const myFoundIds = myFound?.map(i => i.id) || [];
        
        let matchCount = 0;
        let userMatches = [];
        if (myLostIds.length > 0 || myFoundIds.length > 0) {
          const query = supabase
            .from('ai_matches')
            .select(`
              id,
              match_score,
              status,
              created_at,
              lost_item:lost_item_id (id, item_name, user_id),
              found_item:found_item_id (id, item_name, user_id)
            `)
            .eq('status', 'pending');

          // Build dynamic or conditions
          const orFilter = [];
          if (myLostIds.length > 0) orFilter.push(`lost_item_id.in.(${myLostIds.join(',')})`);
          if (myFoundIds.length > 0) orFilter.push(`found_item_id.in.(${myFoundIds.join(',')})`);
          
          if (orFilter.length > 0) {
            const { data: matches, error: matchErr } = await query.or(orFilter.join(','));
            if (!matchErr && matches) {
              // Filter matches where the user is NOT the owner of BOTH (which shouldn't happen anyway)
              userMatches = matches;
              matchCount = matches.length;
            }
          }
        }

        setStats({
          totalLost: lostCount || 0,
          totalFound: foundCount || 0,
          myReports: myReportsCount,
          suggestedMatches: matchCount,
          unreadNotifications: notifCount || 0
        });

        setRecentMatches(userMatches.slice(0, 3));

        // Assemble recent activities from MyReports
        const activities = [];
        myLost?.forEach(item => {
          activities.push({
            type: 'lost',
            title: `Reported Lost: ${item.item_name}`,
            status: item.status,
            date: new Date(item.created_at)
          });
        });
        myFound?.forEach(item => {
          activities.push({
            type: 'found',
            title: `Reported Found: ${item.item_name}`,
            status: item.status,
            date: new Date(item.created_at)
          });
        });
        // Sort descending
        activities.sort((a, b) => b.date - a.date);
        setRecentActivity(activities.slice(0, 5));

      } catch (err) {
        console.error('Error fetching dashboard details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <Loader message="Loading dashboard statistics..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">Welcome Back, {profile?.full_name || 'Guardian'}!</h2>
        <p className="text-secondary">Keep track of your reports and suggestions on campus.</p>
      </div>

      {/* Cards Panel */}
      <div className="row g-3 mb-4">
        {/* Total Lost */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body h-100 hover-shadow transition-all">
            <div className="d-flex align-items-center">
              <div className="bg-warning bg-opacity-15 text-warning rounded-4 p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-question-diamond fs-2"></i>
              </div>
              <div>
                <span className="text-secondary small fw-semibold">Campus Lost Items</span>
                <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{stats.totalLost}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Total Found */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body h-100 hover-shadow transition-all">
            <div className="d-flex align-items-center">
              <div className="bg-success bg-opacity-15 text-success rounded-4 p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-search fs-2"></i>
              </div>
              <div>
                <span className="text-secondary small fw-semibold">Campus Found Items</span>
                <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{stats.totalFound}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* My Reports */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body h-100 hover-shadow transition-all">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-15 text-primary rounded-4 p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-folder-fill fs-2"></i>
              </div>
              <div>
                <span className="text-secondary small fw-semibold">My Filed Reports</span>
                <h3 className="fw-bold text-body-emphasis mb-0 mt-1">{stats.myReports}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Matches */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-body h-100 hover-shadow transition-all position-relative">
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-15 text-info rounded-4 p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-stars fs-2"></i>
              </div>
              <div>
                <span className="text-secondary small fw-semibold">Suggested Matches</span>
                <h3 className="fw-bold text-body-emphasis mb-0 mt-1">
                  {stats.suggestedMatches}
                  {stats.suggestedMatches > 0 && (
                    <span className="position-absolute top-0 end-0 m-3 badge rounded-pill bg-danger border border-light">
                      Action Required
                    </span>
                  )}
                </h3>
              </div>
            </div>
            {stats.suggestedMatches > 0 && (
              <Link to="/suggested-matches" className="stretched-link"></Link>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Actions & Matches */}
        <div className="col-12 col-lg-8">
          {/* Quick Actions */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body mb-4">
            <h5 className="fw-bold text-body-emphasis mb-3">Quick Actions</h5>
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <Link to="/report-lost" className="btn btn-outline-warning w-100 py-3 rounded-3 fw-bold d-flex flex-column align-items-center justify-content-center gap-2">
                  <i className="bi bi-file-earmark-plus fs-3"></i>
                  <span className="small">Report Lost</span>
                </Link>
              </div>
              <div className="col-6 col-md-3">
                <Link to="/report-found" className="btn btn-outline-success w-100 py-3 rounded-3 fw-bold d-flex flex-column align-items-center justify-content-center gap-2">
                  <i className="bi bi-file-earmark-plus-fill fs-3"></i>
                  <span className="small">Report Found</span>
                </Link>
              </div>
              <div className="col-6 col-md-3">
                <Link to="/search" className="btn btn-outline-primary w-100 py-3 rounded-3 fw-bold d-flex flex-column align-items-center justify-content-center gap-2">
                  <i className="bi bi-search fs-3"></i>
                  <span className="small">Search Registry</span>
                </Link>
              </div>
              <div className="col-6 col-md-3">
                <Link to="/suggested-matches" className="btn btn-outline-info w-100 py-3 rounded-3 fw-bold d-flex flex-column align-items-center justify-content-center gap-2">
                  <i className="bi bi-stars fs-3"></i>
                  <span className="small">AI matches</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Matches */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-body-emphasis mb-0">Recent Matches Suggestion</h5>
              {recentMatches.length > 0 && (
                <Link to="/suggested-matches" className="small text-primary text-decoration-none fw-semibold">
                  View All
                </Link>
              )}
            </div>

            {recentMatches.length > 0 ? (
              <div className="list-group list-group-flush">
                {recentMatches.map((match) => (
                  <div key={match.id} className="list-group-item bg-transparent px-0 py-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-body-emphasis">{match.lost_item?.item_name}</span>
                        <i className="bi bi-arrow-left-right text-muted small"></i>
                        <span className="fw-bold text-body-emphasis">{match.found_item?.item_name}</span>
                      </div>
                      <p className="mb-0 text-secondary small mt-1">
                        Match Score: <span className="text-success fw-bold">{match.match_score}%</span>
                      </p>
                    </div>
                    <Link to="/suggested-matches" className="btn btn-sm btn-primary rounded-3 px-3 fw-semibold">
                      Verify
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-muted bg-light-subtle rounded-4">
                <i className="bi bi-stars text-info display-4 mb-2 d-block"></i>
                <p className="mb-0 small">No matching recommendations found yet.</p>
                <p className="text-muted small">AI will check once you or others file reports.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-body h-100">
            <h5 className="fw-bold text-body-emphasis mb-3">Recent Activity</h5>

            {recentActivity.length > 0 ? (
              <div className="position-relative ps-3 border-start py-2">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="mb-4 position-relative">
                    {/* Timeline bullet */}
                    <div 
                      className={`position-absolute start-0 translate-middle-x rounded-circle border border-white ${
                        activity.type === 'lost' ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        marginLeft: '-22px', 
                        marginTop: '6px' 
                      }}
                    ></div>
                    <div className="d-flex justify-content-between align-items-start">
                      <span className="fw-bold small text-body-emphasis d-block">
                        {activity.title}
                      </span>
                    </div>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis small mt-1 text-capitalize">
                      {activity.status}
                    </span>
                    <span className="d-block text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                      {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 my-auto text-muted">
                <i className="bi bi-clock-history mb-2 fs-3 d-block"></i>
                <p className="mb-0 small">No recent reports filed.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
