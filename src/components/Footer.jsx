import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaTwitter, FaFacebookF, FaLinkedinIn, FaEnvelope } from 'react-icons/fa';
import './Footer.css';

function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [newsStatus, setNewsStatus] = useState('');

  const subscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setNewsStatus('Please enter a valid email.');
      return;
    }
    const list = JSON.parse(localStorage.getItem('newsletter_signups') || '[]');
    list.push({ email, date: new Date().toISOString() });
    localStorage.setItem('newsletter_signups', JSON.stringify(list));
    setEmail('');
    setNewsStatus('Thank you — you are subscribed.');
  };

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner container">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <div className="brand-header">
              <span className="brand-mark">DTU</span>
              <Link to="/" className="brand-link">DTU Placement</Link>
            </div>
            <p className="brand-desc">Connecting students, departments, and employers through a transparent and efficient placement experience.</p>

            <div className="social-row" aria-label="Social media links">
              <a href="mailto:placement@dtu.edu" aria-label="Email" className="social-btn"><FaEnvelope/></a>
              <a href="#" aria-label="Twitter" className="social-btn"><FaTwitter/></a>
              <a href="#" aria-label="Facebook" className="social-btn"><FaFacebookF/></a>
              <a href="#" aria-label="LinkedIn" className="social-btn"><FaLinkedinIn/></a>
            </div>
          </div>

          <div className="footer-col">
            <h6 className="col-title">Explore</h6>
            <ul className="col-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/student-dashboard">Student Dashboard</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h6 className="col-title">Support</h6>
            <ul className="col-list">
              <li><Link to="/contact">Help Center</Link></li>
              <li><Link to="/contact">Request Info</Link></li>
              <li><Link to="/login">Sign in</Link></li>
            </ul>
          </div>

          <div className="footer-col footer-newsletter">
            <h6 className="col-title">Newsletter</h6>
            <p className="small muted">Get placement news, workshops, and recruitment updates.</p>
            <form className="newsletter-form" onSubmit={subscribe}>
              <label htmlFor="newsletter-email" className="visually-hidden">Email address</label>
              <input id="newsletter-email" type="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} />
              <button className="subscribe-btn" type="submit">Subscribe</button>
            </form>
            {newsStatus && <div className="news-status small" role="status">{newsStatus}</div>}
          </div>
        </div>

        <div className="footer-bottom">
          <div className="copyright">© {year} DTU Placement. All rights reserved.</div>
          <div className="legal-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
