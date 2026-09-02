import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const AssignHead = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [heads, setHeads] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const resDepts = await api.get('departments_api.php');
        const departmentList = resDepts.data.departments || resDepts.data || [];
        setDepartments(departmentList);

        const resUsers = await api.get('users_api.php');
        const userList = resUsers.data.users || resUsers.data || [];

        const assignedHeadIds = new Set(
          departmentList
            .filter((department) => String(department.id) !== String(selectedDeptId))
            .map((department) => department.head_id ?? department.headId ?? department.head)
            .filter((value) => value !== null && value !== undefined && value !== '')
            .map((value) => Number(value))
            .filter((value) => !Number.isNaN(value))
        );

        const validHeads = userList.filter((user) => {
          const role = String(user.role || '').toLowerCase();
          const isValidRole = role === 'head' || role === 'coordinator';
          const isAlreadyAssigned = assignedHeadIds.has(Number(user.id));
          return isValidRole && !isAlreadyAssigned;
        });

        setHeads(validHeads);
      } catch (err) {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedDeptId]);

  useEffect(() => {
    if (!selectedDeptId) {
      setSelectedHeadId('');
      return;
    }

    const dept = departments.find((department) => String(department.id) === String(selectedDeptId));
    if (!dept) {
      setSelectedHeadId('');
      return;
    }

    const departmentHeadId = dept.head_id ?? dept.headId ?? dept.head ?? '';
    setSelectedHeadId(departmentHeadId ? String(departmentHeadId) : '');
  }, [selectedDeptId, departments]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedDeptId || !selectedHeadId) {
      setError('Please select both a department and a head.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('departments_api.php', {
        id: Number(selectedDeptId),
        head_id: Number(selectedHeadId)
      });

      if (response.data?.success === true) {
        navigate('/admin-dashboard', { state: { activeTab: 'departments' } });
      } else {
        setError(response.data?.message || 'Failed to assign department head.');
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Connection error.';
      setError(message.includes('already') || message.includes('assigned') || message.includes('Conflict')
        ? 'This head is already assigned to another department.'
        : message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-header bg-primary text-white p-4 rounded-top-4">
              <h4 className="mb-0 fw-bold">Assign Department Head</h4>
              <p className="small mb-0 opacity-75">Select a department and assign its official coordinator.</p>
            </div>
            <div className="card-body p-5">
              {error && <div className="alert alert-danger">{error}</div>}
              
              <form onSubmit={handleAssign}>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Select Department</label>
                    <select 
                      className="form-select py-2" 
                      value={selectedDeptId} 
                      onChange={(e) => setSelectedDeptId(e.target.value)} 
                      required
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Select Head / Coordinator</label>
                    <select className="form-select py-2" value={selectedHeadId} onChange={(e) => setSelectedHeadId(e.target.value)} required>
                      <option value="">-- Choose Coordinator --</option>
                      {heads.map(h => <option key={h.id} value={h.id}>{h.username}</option>)}
                    </select>
                  </div>
                  <div className="col-12 mt-4 d-flex gap-2">
                    <button type="submit" className="btn btn-primary px-5 py-2 fw-bold rounded-pill" disabled={saving}>
                      {saving ? 'Saving...' : 'Confirm Assignment'}
                    </button>
                    <button type="button" className="btn btn-light px-4 py-2 rounded-pill" onClick={() => navigate('/admin-dashboard', { state: { activeTab: 'departments' } })}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignHead;