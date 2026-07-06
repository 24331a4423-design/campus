import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { isAdmin } = useAuth();

  const userLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid' },
    { to: '/report-lost', label: 'Report Lost Item', icon: 'bi-file-earmark-plus' },
    { to: '/report-found', label: 'Report Found Item', icon: 'bi-file-earmark-plus-fill' },
    { to: '/search', label: 'Search Module', icon: 'bi-search' },
    { to: '/suggested-matches', label: 'Suggested Matches', icon: 'bi-stars' },
    { to: '/notifications', label: 'Notifications', icon: 'bi-bell' },
    { to: '/profile', label: 'My Profile', icon: 'bi-person' }
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Panel', icon: 'bi-shield-lock-fill' },
    { to: '/admin/users', label: 'Manage Users', icon: 'bi-people' },
    { to: '/admin/reports', label: 'Manage Reports', icon: 'bi-journal-text' },
    { to: '/admin/claims', label: 'Verify Claims', icon: 'bi-check2-square' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'bi-graph-up' }
  ];

  const renderLinks = (links) => (
    <ul className="nav nav-pills flex-column mb-auto gap-1">
      {links.map((link) => (
        <li key={link.to} className="nav-item">
          <NavLink 
            to={link.to} 
            className={({ isActive }) => 
              `nav-link d-flex align-items-center py-2 px-3 rounded-3 text-truncate fw-semibold ${
                isActive 
                  ? 'active bg-primary text-white shadow-sm' 
                  : 'text-secondary hover-bg-light'
              }`
            }
          >
            <i className={`bi ${link.icon} fs-5 me-3`}></i>
            <span>{link.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div 
      className="collapse d-lg-block border-end bg-body h-100 p-3" 
      id="sidebarCollapse"
      style={{ width: '260px', minHeight: 'calc(100vh - 60px)' }}
    >
      <div className="d-flex flex-column h-100">
        {/* User Navigation Section */}
        <div>
          <span className="text-uppercase text-secondary fw-bold small tracking-wider mb-2 d-block px-3">
            General
          </span>
          {renderLinks(userLinks)}
        </div>

        {/* Administrator Section */}
        {isAdmin && (
          <div className="mt-4">
            <span className="text-uppercase text-secondary fw-bold small tracking-wider mb-2 d-block px-3">
              Administration
            </span>
            {renderLinks(adminLinks)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
