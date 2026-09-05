import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import './ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('student');
  const [editingUser, setEditingUser] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('student');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const pageSize = 5;
  const apiPath = 'api/admin/users_api.php';
  const navigate = useNavigate();

  const resetNewUserForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewUsername('');
    setNewPassword('');
    setNewEmail('');
    setNewRole('student');
    setNewPhoneNumber('');
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setEditFirstName(user.first_name || '');
    setEditLastName(user.last_name || '');
    setEditUsername(user.username || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'student');
    setEditPhoneNumber(user.phone_number || '');
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditFirstName('');
    setEditLastName('');
    setEditUsername('');
    setEditEmail('');
    setEditRole('student');
    setEditPhoneNumber('');
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(apiPath);
      const payload = response.data?.users ?? response.data ?? [];
      const nextUsers = Array.isArray(payload) ? payload : (payload.users ?? []);
      setUsers(nextUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Unable to load users from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const firstName = (u.first_name || '').toLowerCase();
    const lastName = (u.last_name || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const phone = (u.phone_number || '').toLowerCase();
    return (
      firstName.includes(q) ||
      lastName.includes(q) ||
      username.includes(q) ||
      email.includes(q) ||
      role.includes(q) ||
      phone.includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;

    try {
      await api.delete(`${apiPath}?id=${encodeURIComponent(id)}`);
      const next = users.filter(u => u.id !== id);
      setUsers(next);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Unable to delete the user. Please try again.');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    const username = editUsername.trim();
    const email = editEmail.trim();
    const role = editRole.trim();
    const phoneNumber = editPhoneNumber.trim();

    if (!firstName || !lastName || !username || !email || !role) {
      setError('First name, last name, username, email, and role are required.');
      return;
    }

    if (!/[A-Za-z]/.test(username)) {
      setError('Username must contain at least one letter; numbers only are not allowed.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (phoneNumber && !/^(09|\+251)\d{8,9}$/.test(phoneNumber)) {
      setError('Please enter a valid Ethiopian phone number (09XXXXXXXX or +251XXXXXXXXX).');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await api.put(`${apiPath}?id=${encodeURIComponent(editingUser.id)}`, {
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        role,
        phone_number: phoneNumber,
      });

      if (response.data?.success) {
        await fetchUsers();
        cancelEdit();
        setPage(1);
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const username = newUsername.trim();
    const password = newPassword;
    const email = newEmail.trim();
    const role = newRole.trim();
    const phoneNumber = newPhoneNumber.trim();

    if (!firstName || !lastName || !username || !password || !role) {
      setError('First name, last name, username, password, and role are all required.');
      return;
    }

    if (!/[A-Za-z]/.test(username)) {
      setError('Username must contain at least one letter; numbers only are not allowed.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (phoneNumber && !/^(09|\+251)\d{8,9}$/.test(phoneNumber)) {
      setError('Please enter a valid Ethiopian phone number (09XXXXXXXX or +251XXXXXXXXX).');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await api.post(apiPath, {
        first_name: firstName,
        last_name: lastName,
        username,
        password,
        email,
        role,
        phone_number: phoneNumber,
      });

      if (response.data?.success) {
        await fetchUsers();
        resetNewUserForm();
        setPage(1);
      } else {
        setError(response.data?.message || 'Unable to add new user.');
      }
    } catch (err) {
      console.error('Failed to add user:', err);
      const backendMessage = err.response?.data?.message;
      setError(backendMessage || 'Unable to add new user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goToPage = (n) => setPage(Math.max(1, Math.min(totalPages, n)));

  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="m-0">Manage Users</h3>
        <div className="w-50">
          <input
            className="form-control"
            placeholder="Search by name, username, email, phone or role"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Add New User</h5>
              <p className="small text-muted mb-0">Create a user with username, password, optional email, and role.</p>
            </div>
            <span className="badge bg-secondary text-uppercase small py-2 px-3">
              {saving ? 'Saving...' : 'New user'}
            </span>
          </div>

          <form onSubmit={handleAddUser}>
            <div className="row g-3">
              <div className="col-md-2">
                <label className="form-label" htmlFor="new-first-name">First Name</label>
                <input
                  id="new-first-name"
                  type="text"
                  className="form-control"
                  placeholder="First name"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="new-last-name">Last Name</label>
                <input
                  id="new-last-name"
                  type="text"
                  className="form-control"
                  placeholder="Last name"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  pattern=".*[A-Za-z].*"
                  title="Username must contain at least one letter."
                  disabled={saving}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  required
                />
                <div className="form-text">At least 6 characters.</div>
              </div>
              <div className="col-md-2">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="09XXXXXXXX"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  disabled={saving}
                />
                <div className="form-text">09... or +251...</div>
              </div>
              <div className="col-md-2">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
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
                  {saving ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th style={{ width: 80 }}>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Role</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">Loading users...</td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">No users found.</td>
              </tr>
            ) : (
              paged.map((u, idx) => (
                <tr key={u.id}>
                  <td className="fw-bold text-primary">{u.id}</td>
                  <td>{u.full_name || u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</td>
                  <td>{u.username || u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone_number || '-'}</td>
                  <td className="text-capitalize">{u.role}</td>
                  <td>
                    <button className="manage-users-edit-button btn btn-sm me-2" onClick={() => navigate(`/edit-user/${u.id}`)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="card shadow-sm mb-4 border-primary">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-1">Edit User</h5>
                <p className="small text-muted mb-0">Update the selected user details below.</p>
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick={cancelEdit}>
                Cancel
              </button>
            </div>

            <form onSubmit={handleEditUser}>
              <div className="row g-3">
                <div className="col-md-2">
                  <label className="form-label" htmlFor="edit-first-name">First Name</label>
                  <input
                    id="edit-first-name"
                    type="text"
                    className="form-control"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor="edit-last-name">Last Name</label>
                  <input
                    id="edit-last-name"
                    type="text"
                    className="form-control"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="edit-username">Username</label>
                  <input
                    id="edit-username"
                    type="text"
                    className="form-control"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="edit-email">Email</label>
                  <input
                    id="edit-email"
                    type="email"
                    className="form-control"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor="edit-phone">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="tel"
                    className="form-control"
                    placeholder="09XXXXXXXX"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    disabled={saving}
                  />
                  <div className="form-text">09... or +251...</div>
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor="edit-role">Role</label>
                  <select
                    id="edit-role"
                    className="form-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
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
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted">Showing {filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
        <nav aria-label="User pagination">
          <ul className="pagination mb-0 align-items-center">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => goToPage(page - 1)} disabled={page === 1}>Previous</button>
            </li>
            <li className="page-item" aria-current="page">
              <span className="page-link text-dark bg-white">Page {page} of {totalPages}</span>
            </li>
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>Next</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default ManageUsers;
