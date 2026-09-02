import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [identifierUnlocked, setIdentifierUnlocked] = useState(false);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Reset Password State
  const [showModal, setShowModal] = useState(false);
  const [resetData, setResetData] = useState({ email: '', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    setIdentifier('');
    setPassword('');
  }, []);

  const normalizeRole = (value) => String(value ?? '').trim().toLowerCase();
  const isValidEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

  const getLoginError = (responseOrError) => {
    const responseData = responseOrError?.data || responseOrError?.response?.data || {};
    const message = responseData.message || responseData.error || '';
    const normalizedMessage = String(message).toLowerCase();
    const responseCode = String(responseData.code || '').toUpperCase();

    if (responseCode === 'INVALID_PASSWORD' || normalizedMessage.includes('password') || normalizedMessage.includes('email or password')) {
      return 'Please enter the correct password.';
    }
    if (responseCode === 'INVALID_EMAIL' || normalizedMessage.includes('email not found') || normalizedMessage.includes('invalid email')) {
      return 'Please enter the correct email or username.';
    }
    if (responseCode === 'INVALID_IDENTIFIER' || responseCode === 'USER_NOT_FOUND') {
      return 'Please enter the correct email or username.';
    }
    if (normalizedMessage.includes('email') || normalizedMessage.includes('username') || normalizedMessage.includes('identifier')) {
      return 'Please enter the correct email or username.';
    }
    return message || 'Unable to log in. Please check your email or username and password.';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.includes('@') && !isValidEmail(trimmedIdentifier)) {
      setError('Please enter a valid email.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/login.php', { identifier: trimmedIdentifier, password });
      if (response.data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        const role = normalizeRole(response.data.user.role);
        const routeMap = { admin: '/admin-dashboard', registrar: '/registrar-dashboard', student: '/student-dashboard', head: '/head-dashboard' };
        navigate(routeMap[role] || '/login');
      } else {
        setError(getLoginError(response));
      }
    } catch (err) {
      setError(getLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (resetData.newPassword !== resetData.confirmPassword) {
      setResetError("New passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/reset_password.php', resetData);
      if (response.data.status === 'success') {
        alert("Success! Password changed.");
        setShowModal(false);
        setResetData({ email: '', oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setResetError(response.data.message);
      }
    } catch (err) { setResetError("Server error."); }
    setLoading(false);
  };

  return (
    <div className="container py-5" style={{ marginTop: '120px' }}>
      <div className="row justify-content-center">
        <div className="col-md-5 col-lg-4">
          <div className="card p-4 shadow-lg border-0" style={{ borderRadius: '20px' }}>
            <h2 className="text-center fw-bold text-primary mb-4">Login</h2>
            {error && <div className="alert alert-danger small text-center">{error}</div>}
            
            <form onSubmit={handleLogin} autoComplete="new-password">
              <div className="mb-3">
                <label htmlFor="login-identifier" className="form-label small fw-bold">Username or Email</label>
                <input id="login-identifier" name="account-value" type="text" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" readOnly={!identifierUnlocked} placeholder="Enter username or email" className="form-control" value={identifier} onFocus={() => setIdentifierUnlocked(true)} onChange={(e) => setIdentifier(e.target.value)} required />
              </div>
              <div className="mb-4">
                <label htmlFor="login-password" className="form-label small fw-bold">Password</label>
                <div className="input-group">
                  <input id="login-password" name="password-value" type={showPassword ? 'text' : 'password'} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" readOnly={!passwordUnlocked} placeholder="Enter password" className="form-control" value={password} onFocus={() => setPasswordUnlocked(true)} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-100 fw-bold py-2 shadow-sm" disabled={loading}>{loading ? '...' : 'LOGIN'}</button>
              <div className="text-center mt-3">
                <button type="button" onClick={() => setShowModal(true)} className="btn btn-link btn-sm text-decoration-none">Forgot Password?</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* --- RESET PASSWORD MODAL --- */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '15px' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '15px 15px 0 0' }}>
                <h5 className="modal-title">Reset Your Password</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleResetSubmit}>
                <div className="modal-body p-4">
                  {resetError && <div className="alert alert-danger small">{resetError}</div>}
                  <div className="mb-3">
                    <label className="small fw-bold">Email Address</label>
                    <input type="email" className="form-control" placeholder="Enter email" onChange={(e) => setResetData({...resetData, email: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Current (Old) Password</label>
                    <input type="password" className="form-control" placeholder="Old Password" onChange={(e) => setResetData({...resetData, oldPassword: e.target.value})} required />
                  </div>
                  <hr />
                  <div className="mb-3">
                    <label className="small fw-bold">New Password</label>
                    <input type="password" className="form-control" placeholder="New Password" onChange={(e) => setResetData({...resetData, newPassword: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Confirm New Password</label>
                    <input type="password" className="form-control" placeholder="Confirm New Password" onChange={(e) => setResetData({...resetData, confirmPassword: e.target.value})} required />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4" disabled={loading}>{loading ? 'Processing...' : 'Change Password'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;