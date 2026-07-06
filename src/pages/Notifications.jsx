import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const Notifications = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications page:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleMarkRead = async (notifId, currentStatus) => {
    if (currentStatus) return; // already read
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);

      if (error) throw error;
      
      // Update state local
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      alert('Failed to mark all read: ' + err.message);
    }
  };

  const handleDeleteNotification = async (notifId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notifId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      alert('Failed to delete notification: ' + err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap g-3">
        <div>
          <h2 className="fw-bold text-body-emphasis mb-0">Notifications</h2>
          <p className="text-secondary mb-0">Keep up to date on your claim requests and system matches.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={handleMarkAllRead} 
            className="btn btn-outline-primary rounded-3 fw-bold btn-sm"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <Loader message="Loading notification logs..." />
      ) : notifications.length > 0 ? (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-body">
          <div className="list-group list-group-flush">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`list-group-item px-4 py-3 d-flex align-items-start justify-content-between border-bottom-0 hover-bg-light transition-all position-relative ${
                  !notif.is_read ? 'bg-primary bg-opacity-5' : ''
                }`}
                onClick={() => handleMarkRead(notif.id, notif.is_read)}
                style={{ cursor: 'pointer' }}
              >
                {/* Visual Unread Indicator Dot */}
                {!notif.is_read && (
                  <div 
                    className="bg-primary rounded-circle position-absolute top-50 start-0 translate-middle"
                    style={{ width: '8px', height: '8px', marginLeft: '12px' }}
                  ></div>
                )}

                <div className="flex-grow-1 ps-2">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h6 className="fw-bold text-body-emphasis mb-0">{notif.title}</h6>
                    <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mb-0 text-secondary small leading-relaxed">{notif.message}</p>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // prevent mark read trigger
                    handleDeleteNotification(notif.id);
                  }}
                  className="btn btn-link text-danger p-1 rounded-circle hover-bg-light-danger ms-3"
                  title="Delete Notification"
                  style={{ width: '32px', height: '32px' }}
                >
                  <i className="bi bi-trash-fill small"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center border-0 shadow-sm p-5 bg-body rounded-4">
          <i className="bi bi-bell-slash-fill display-1 text-secondary mb-3"></i>
          <h4 className="fw-bold text-body-emphasis">No Notifications</h4>
          <p className="text-muted small mb-0">Your notification inbox is clean. We will notify you of updates.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Notifications;
