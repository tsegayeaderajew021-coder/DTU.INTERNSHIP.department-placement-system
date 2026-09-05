import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import './EditUser.css';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [phoneNumber, setPhoneNumber] = useState('');

  const apiPath = 'api/admin/users_api.php';

  useEffect(() => {
    if (!id) {
      navigate('/admin-dashboard');
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get(apiPath);
        const payload = Array.isArray(response.data) ? response.data : (response.data.users ?? []);
        const user = payload.find(u => String(u.id) === String(id));
        if (!user) {
          setError('User not found.');
        } else {
          setUsername(user.username || '');
          setEmail(user.email || '');
          setRole(user.role || 'student');
          setPhoneNumber(user.phone_number || '');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('Unable to load user data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, navigate]);

  const validate = () => {
    if (!username.trim()) {
      setError('Username is required.');
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!role) {
      setError('Role is required.');
      return false;
    }
    if (phoneNumber && !/^(09|\+251)\d{8,9}$/.test(phoneNumber)) {
      setError('Please enter a valid Ethiopian phone number (09XXXXXXXX or +251XXXXXXXXX).');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await api.put(`${apiPath}?id=${encodeURIComponent(id)}`, {
        username: username.trim(),
        email: email.trim(),
        role: role.trim(),
        phone_number: phoneNumber.trim(),
      });

      if (response.data?.success) {
        navigate(-1);
      } else {
        setError(response.data?.message || 'Unable to update user.');
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      const backendMessage = err.response?.data?.message;
      setError(backendMessage || 'Unable to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading user...</div>;

  return (
    <div className="edit-user-page container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="m-0">Edit User</h3>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

          <div className="col-md-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="09XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={saving}
                />
                <div className="form-text">09... or +251...</div>
              </div>

              <div className="col-md-2">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={saving}
                  required
                >
                  <option value="student">Student</option>
                  <option value="Head">Head</option>
                  <option value="admin">Admin</option>
                  <option value="registrar">Registrar</option>
                </select>
              </div>

              <div className="col-md-1 d-grid">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUser;
