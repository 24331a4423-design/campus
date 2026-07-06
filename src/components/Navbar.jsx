import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';

const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch recent notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);

      // Fetch unread count
      const { count, error: countErr } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (countErr) throw countErr;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Failed to load notifications in Navbar:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen to changes in notifications table
    if (user) {
      const channel = supabase
        .channel(`notifications-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg border-bottom bg-body sticky-top px-3 py-2 z-2">
      <div className="container-fluid">
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center me-4" to={user ? "/dashboard" : "/"}>
          <i className="bi bi-shield-fill-check text-primary fs-3 me-2"></i>
          <span className="fw-bold fs-4 tracking-tight">Campus Guardian</span>
        </Link>

        {/* Right tools (Theme, Notifications, Profile) for mobile first */}
        <div className="d-flex align-items-center ms-auto order-lg-last gap-2">
          {/* Dark Mode Toggle */}
          <button 
            className="btn btn-sm btn-link text-secondary p-2 me-1 rounded-circle hover-bg-light"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ width: '40px', height: '40px' }}
          >
            <i className={`bi bi-${isDarkMode ? 'sun-fill text-warning' : 'moon-stars-fill text-primary'} fs-5`}></i>
          </button>

          {user && (
            <>
              {/* Notifications Dropdown */}
              <div className="dropdown position-relative">
                <button 
                  className={`btn btn-sm btn-link text-secondary p-2 rounded-circle hover-bg-light position-relative ${dropdownOpen ? 'show' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="bi bi-bell-fill fs-5"></i>
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style={{ fontSize: '0.65rem' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div 
                    className="dropdown-menu dropdown-menu-end show shadow border-0 rounded-4 mt-2 p-2"
                    style={{ width: '320px', right: 0 }}
                  >
                    <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                      <span className="fw-bold small text-body-emphasis">Notifications</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead} 
                          className="btn btn-link text-primary p-0 small text-decoration-none"
                          style={{ fontSize: '0.8rem' }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="py-1" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`px-3 py-2 rounded-3 hover-bg-light ${!notif.is_read ? 'bg-primary bg-opacity-10' : ''}`}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <span className="fw-bold small text-body-emphasis text-truncate" style={{ maxWidth: '180px' }}>
                                {notif.title}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mb-0 text-secondary small text-truncate-2">
                              {notif.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted small">
                          <i className="bi bi-bell-slash mb-2 fs-4 d-block"></i>
                          No recent notifications
                        </div>
                      )}
                    </div>
                    <div className="border-top text-center pt-2">
                      <Link 
                        to="/notifications" 
                        className="dropdown-item text-primary small text-center fw-semibold rounded-3"
                        onClick={() => setDropdownOpen(false)}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Dropdown */}
              <div className="dropdown">
                <button 
                  className="btn d-flex align-items-center p-1 rounded-pill hover-bg-light"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <div 
                    className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
                    style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}
                  >
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="ms-2 d-none d-md-inline small fw-semibold me-2 text-body">
                    {profile?.full_name || 'User'}
                  </span>
                  <i className="bi bi-chevron-down small text-secondary d-none d-md-inline"></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2 p-2">
                  <li className="px-3 py-2 border-bottom">
                    <span className="fw-bold d-block text-body-emphasis small text-truncate" style={{ maxWidth: '180px' }}>
                      {profile?.full_name || 'User'}
                    </span>
                    <span className="text-muted small text-truncate d-block" style={{ maxWidth: '180px', fontSize: '0.75rem' }}>
                      {user.email}
                    </span>
                    {profile?.role === 'admin' && (
                      <span className="badge bg-danger-subtle text-danger mt-1 small">Administrator</span>
                    )}
                  </li>
                  <li>
                    <Link className="dropdown-item rounded-3 mt-1 small" to="/profile">
                      <i className="bi bi-person me-2"></i> My Profile
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item rounded-3 small" to="/dashboard">
                      <i className="bi bi-grid-fill me-2"></i> Dashboard
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item rounded-3 text-danger small" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i> Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}

          {!user && (
            <div className="d-flex align-items-center gap-2">
              <Link to="/login" className="btn btn-sm btn-outline-primary px-3 rounded-pill fw-semibold">Login</Link>
              <Link to="/register" className="btn btn-sm btn-primary px-3 rounded-pill fw-semibold">Register</Link>
            </div>
          )}
        </div>

        {/* Global toggler for pages/routes on mobile */}
        {user && (
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#sidebarCollapse" 
            aria-controls="sidebarCollapse" 
            aria-expanded="false" 
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
