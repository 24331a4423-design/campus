import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

const DashboardLayout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100 bg-body-secondary bg-opacity-25">
      {/* Top Navigation */}
      <Navbar />

      <div className="d-flex flex-grow-1">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Content panel */}
        <main className="flex-grow-1 p-3 p-md-4" style={{ overflowX: 'hidden' }}>
          <div className="container-fluid p-0">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default DashboardLayout;
