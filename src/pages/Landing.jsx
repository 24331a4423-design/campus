import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Landing = () => {
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setContact({ name: '', email: '', message: '' });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />

      {/* Hero Section */}
      <section className="text-white py-5 px-3 position-relative overflow-hidden" 
               style={{ 
                 background: 'linear-gradient(135deg, #0d6efd 0%, #1e3c72 100%)', 
                 minHeight: '70vh', 
                 display: 'flex', 
                 alignItems: 'center' 
               }}>
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-6 text-center text-lg-start animate-fade-in">
              <span className="badge bg-light text-primary px-3 py-2 rounded-pill fw-bold mb-3 shadow-sm text-uppercase tracking-wider">
                Now Live on Campus
              </span>
              <h1 className="display-3 fw-extrabold mb-4 lh-sm">
                Campus Guardian
              </h1>
              <p className="lead opacity-80 mb-5 fs-4">
                Losing items is stressful. Reclaiming them shouldn't be. Report, match, and recover items instantly with our AI-powered lost and found repository.
              </p>
              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                <Link to="/register" className="btn btn-light btn-lg px-4 py-3 rounded-pill fw-bold text-primary shadow-sm hover-translate">
                  Get Started Now
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-4 py-3 rounded-pill fw-bold hover-translate">
                  Sign In
                </Link>
              </div>
            </div>
            <div className="col-12 col-lg-6 text-center animate-slide-up">
              <div className="position-relative d-inline-block">
                {/* Visual Glassmorphic Mockup */}
                <div className="card bg-white bg-opacity-10 border border-white border-opacity-20 shadow-lg rounded-5 p-4 text-start text-white backdrop-blur" 
                     style={{ maxWidth: '480px', margin: '0 auto', backdropFilter: 'blur(12px)' }}>
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <span className="badge bg-warning text-dark px-3 py-1 rounded-pill">Lost Report</span>
                    <small className="opacity-70">Just Now</small>
                  </div>
                  <h4 className="fw-bold mb-1">Apple iPad Pro 11"</h4>
                  <p className="small opacity-75 mb-3">Space Gray, blue smart folio cover, apple pencil attached.</p>
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <i className="bi bi-geo-alt text-warning"></i>
                    <span className="small">Science Library, Study Room B</span>
                  </div>
                  <div className="bg-white bg-opacity-10 rounded-4 p-3 border border-white border-opacity-10">
                    <div className="d-flex align-items-center gap-2 mb-2 text-warning fw-bold small">
                      <i className="bi bi-stars"></i>
                      <span>AI SUGGESTION (95% MATCH)</span>
                    </div>
                    <p className="small mb-0 text-white opacity-90">Matched with iPad Found by Finder at Library Circulation Desk today at 2 PM.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-5 bg-body">
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-6">
              <h2 className="fw-bold text-body-emphasis mb-3">About Campus Guardian</h2>
              <p className="text-secondary">
                Campus Guardian is a modern, web-based software engineered to securely track and verify lost and found items for university campuses. 
              </p>
              <p className="text-secondary">
                By integrating Supabase for cloud database stability and Google Gemini for natural language matching, we bypass basic keyword matching. We analyze item descriptions, locations, and traits to recommend matching cases, avoiding unnecessary image exposure.
              </p>
            </div>
            <div className="col-12 col-lg-6">
              <div className="row g-4">
                <div className="col-6">
                  <div className="card border-0 bg-primary-subtle p-3 rounded-4 h-100">
                    <i className="bi bi-shield-check text-primary fs-2 mb-2"></i>
                    <h6 className="fw-bold text-primary-emphasis">Secure Verification</h6>
                    <p className="small text-secondary mb-0">Ownership verified through authentication and admin checks.</p>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card border-0 bg-success-subtle p-3 rounded-4 h-100">
                    <i className="bi bi-cpu text-success fs-2 mb-2"></i>
                    <h6 className="fw-bold text-success-emphasis">AI Comparison</h6>
                    <p className="small text-secondary mb-0">Gemini models descriptions dynamically for similarity scores.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5 bg-body-tertiary">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold text-body-emphasis">Core Platform Features</h2>
            <p className="text-secondary max-width-md mx-auto">Explore everything Campus Guardian brings to your campus community.</p>
          </div>
          <div className="row g-4">
            {[
              { icon: 'bi-shield-fill-check', title: 'Supabase Authentication', desc: 'Secure, password-protected logins utilizing strict campus metadata validations.' },
              { icon: 'bi-stars', title: 'AI Match Analysis', desc: 'Auto-scrapes attributes (color, brand, category) to determine confidence thresholds.' },
              { icon: 'bi-image', title: 'Image Uploads', desc: 'Drag-and-drop secure media storage in private folders, generating secure signed links.' },
              { icon: 'bi-bell-fill', title: 'Action Notifications', desc: 'Get notified of claims approvals, claim rejections, and direct admin announcements.' },
              { icon: 'bi-search', title: 'Advanced Registry Search', desc: 'Powerful multi-select filters for quickly scraping the lost or found log database.' },
              { icon: 'bi-lock-fill', title: 'Admin Controls', desc: 'Role-based access controls for verifying matches, deleting claims, and analyzing trends.' }
            ].map((f, idx) => (
              <div key={idx} className="col-12 col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 hover-shadow transition-all bg-body">
                  <i className={`bi ${f.icon} text-primary fs-3 mb-3 d-block`}></i>
                  <h5 className="fw-bold text-body-emphasis mb-2">{f.title}</h5>
                  <p className="text-secondary small mb-0">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-5 bg-body">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold text-body-emphasis">How It Works</h2>
            <p className="text-secondary">Recovering your assets is as easy as three quick steps.</p>
          </div>
          <div className="row g-4">
            {[
              { step: '1', title: 'File a Report', desc: 'Provide item names, categories, descriptions, dates, and optional pictures.' },
              { step: '2', title: 'AI Autocheck', desc: 'Gemini compares your report details against active opposite records in the system.' },
              { step: '3', title: 'Admin Verification', desc: 'Once a match is accepted, administrators verify claims before releasing items.' }
            ].map((s, idx) => (
              <div key={idx} className="col-12 col-md-4 text-center">
                <div className="position-relative mb-3">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto shadow-sm" 
                       style={{ width: '60px', height: '60px', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {s.step}
                  </div>
                </div>
                <h5 className="fw-bold mb-2">{s.title}</h5>
                <p className="text-secondary small px-3">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-5 bg-primary text-white text-center">
        <div className="container">
          <div className="row g-4">
            <div className="col-6 col-md-3">
              <h2 className="display-4 fw-extrabold mb-1">98%</h2>
              <span className="small opacity-75">AI Match Accuracy</span>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="display-4 fw-extrabold mb-1">1,240+</h2>
              <span className="small opacity-75">Items Recovered</span>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="display-4 fw-extrabold mb-1">15 Mins</h2>
              <span className="small opacity-75">Average Recovery Time</span>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="display-4 fw-extrabold mb-1">5,000+</h2>
              <span className="small opacity-75">Active Campus Users</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-5 bg-body">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 bg-body-tertiary">
                <h3 className="fw-bold text-center mb-2">Have Questions?</h3>
                <p className="text-secondary text-center small mb-4">Send us a message and our support team will respond quickly.</p>
                
                {submitted && (
                  <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <div>Thank you! Your message has been sent.</div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Full Name</label>
                    <input 
                      type="text" 
                      className="form-control bg-body"
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Campus Email</label>
                    <input 
                      type="email" 
                      className="form-control bg-body"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Message</label>
                    <textarea 
                      className="form-control bg-body"
                      rows="4" 
                      value={contact.message}
                      onChange={(e) => setContact({ ...contact, message: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 py-2.5 rounded-3 fw-semibold">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
