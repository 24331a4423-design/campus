import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Loader from '../../components/Loader';
import { supabase } from '../../services/supabase';

const ManageUsers = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch user list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleToggle = async (profileId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${nextRole}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', profileId);

      if (error) throw error;
      
      // Update state
      setUsers(prev => prev.map(u => u.id === profileId ? { ...u, role: nextRole } : u));
    } catch (err) {
      alert('Failed to modify role: ' + err.message);
    }
  };

  const handleDeleteUser = async (profileId) => {
    if (!window.confirm('WARNING: Deleting this user will purge all their lost/found reports and claims. Proceed?')) return;

    try {
      // Direct deletion from profiles. Due to CASCADE references, it purges profile entries.
      // Note: purging the auth user requires Admin API, which client-side keys cannot do. 
      // Deleting from the profile table is standard and denies RLS policies.
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== profileId));
      alert('User database record removed successfully.');
    } catch (err) {
      alert('Failed to remove user: ' + err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-body-emphasis">Manage Users</h2>
        <p className="text-secondary">Track, update, and manage user roles across the platform.</p>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <Loader message="Fetching campus profile directory..." />
      ) : users.length > 0 ? (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-body">
          <div className="table-responsive small">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr className="text-secondary fw-bold">
                  <th scope="col" className="ps-4">Full Name</th>
                  <th scope="col">ID / Register No</th>
                  <th scope="col">Branch & Section</th>
                  <th scope="col">Year</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Role</th>
                  <th scope="col" className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((profileUser) => (
                  <tr key={profileUser.id} className="hover-bg-light transition-all">
                    <td className="ps-4 fw-bold text-body-emphasis">{profileUser.full_name}</td>
                    <td>{profileUser.register_number}</td>
                    <td>
                      <div className="fw-semibold text-body-emphasis">{profileUser.department}</div>
                      <span className="text-muted small">{profileUser.section ? `Section ${profileUser.section}` : '—'}</span>
                    </td>
                    <td><span className="text-muted small">{profileUser.year}</span></td>
                    <td>{profileUser.email}</td>
                    <td>{profileUser.phone}</td>
                    <td>
                      <span className={`badge ${profileUser.role === 'admin' ? 'bg-danger' : 'bg-secondary-subtle text-secondary-emphasis'} text-capitalize`}>
                        {profileUser.role}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <button 
                          onClick={() => handleRoleToggle(profileUser.id, profileUser.role)}
                          className="btn btn-sm btn-outline-secondary rounded-3"
                          title="Toggle Admin/User Role"
                        >
                          <i className="bi bi-person-fill-gear me-1"></i> {profileUser.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(profileUser.id)}
                          className="btn btn-sm btn-outline-danger rounded-3"
                          title="Delete User Profile"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center border-0 shadow-sm p-5 bg-body rounded-4">
          <i className="bi bi-people display-1 text-secondary mb-3"></i>
          <h4 className="fw-bold">No Registered Users</h4>
          <p className="text-muted small">No campus accounts are registered on the platform.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageUsers;
