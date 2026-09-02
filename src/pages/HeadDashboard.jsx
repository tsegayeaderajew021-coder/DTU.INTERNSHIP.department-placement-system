import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './HeadDashboard.css';

const normalizeDepartment = (dept, index = 0) => {
  const capacity = Number(dept?.capacity ?? 0);
  const assigned = Number(dept?.assigned ?? dept?.placed ?? dept?.students ?? 0);

  return {
    id: dept?.id ?? dept?.department_id ?? index + 1,
    name: dept?.name || dept?.department || `Department ${index + 1}`,
    description: dept?.description || '',
    stream: dept?.stream || 'Natural',
    college_name: dept?.college_name || dept?.collegeName || dept?.college || 'General',
    capacity,
    assigned,
    available: Math.max(0, capacity - assigned),
    status: dept?.status || 'active',
    head_id: dept?.head_id ?? null,
    created_at: dept?.created_at || dept?.createdAt || null,
  };
};

const defaultDepartments = [
  {
    id: 1,
    name: 'Computer Science',
    description: 'Department of computing and applied software systems',
    stream: 'Natural',
    college_name: 'College of Computing and Informatics',
    capacity: 120,
    assigned: 89,
    available: 31,
    status: 'active',
    head_id: null,
    created_at: null,
  },
  {
    id: 2,
    name: 'Software Engineering',
    description: 'Applied engineering of modern software systems',
    stream: 'Natural',
    college_name: 'College of Computing and Informatics',
    capacity: 95,
    assigned: 71,
    available: 24,
    status: 'active',
    head_id: null,
    created_at: null,
  },
  {
    id: 3,
    name: 'Business Administration',
    description: 'Management and strategic business operations',
    stream: 'Social',
    college_name: 'College of Business and Economics',
    capacity: 85,
    assigned: 64,
    available: 21,
    status: 'active',
    head_id: null,
    created_at: null,
  },
  {
    id: 4,
    name: 'Nursing',
    description: 'Health and clinical care professional program',
    stream: 'Natural',
    college_name: 'College of Medicine and Health Sciences',
    capacity: 70,
    assigned: 53,
    available: 17,
    status: 'active',
    head_id: null,
    created_at: null,
  },
];

const HeadDashboard = () => {
  const navigate = useNavigate();
  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [department, setDepartment] = useState({
    name: 'Computer Science',
    stream: 'Natural',
    college_name: 'College of Computing and Informatics',
    capacity: 120,
    assigned: 89,
    available: 31,
    status: 'active',
  });
  const [departments, setDepartments] = useState(defaultDepartments);
  const [placedStudents, setPlacedStudents] = useState([]);
  const [approvalSavingId, setApprovalSavingId] = useState(null);
  const [approvalError, setApprovalError] = useState('');
  const [capacityDraft, setCapacityDraft] = useState({});
  const [capacitySaveMsg, setCapacitySaveMsg] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 248,
    placedStudents: 182,
    approvalRequests: 12,
    capacityUsed: 74,
  });
  const [recentPlacements, setRecentPlacements] = useState([
    { student: 'Amanuel Gebru', program: 'Software Engineering', status: 'Matched' },
    { student: 'Martha Kassa', program: 'Data Science', status: 'Confirmed' },
    { student: 'Samuel Tadesse', program: 'Information Systems', status: 'Pending' },
  ]);
  const [preferences, setPreferences] = useState(() => {
    return { notifications: true, reporting: true };
  });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesSaveMsg, setPreferencesSaveMsg] = useState('');
  
  // State for card detail modals
  const [cardDetailModal, setCardDetailModal] = useState(null); // 'totalStudents', 'placedStudents', 'approvalRequests', 'capacityUsed'
  const [cardDetailData, setCardDetailData] = useState([]);
  const [cardDetailLoading, setCardDetailLoading] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      navigate('/login');
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);
      const role = String(parsed.role || '').trim().toLowerCase();
      if (['head', 'hod', 'admin', 'coordinator'].includes(role)) {
        setLeader(parsed);
      } else {
        navigate('/login');
      }
    } catch (error) {
      localStorage.clear();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!leader) return;

    const loadDepartments = async () => {
      try {
        const response = await api.get('get_head_dashboard.php');
        const responseData = response?.data ?? {};
        if (!responseData.success || !responseData.department) {
          throw new Error(responseData.message || 'No assigned department found');
        }

        const primary = normalizeDepartment(responseData.department);
        const nextDepartments = [primary];

        setDepartments(nextDepartments);
        setDepartment(primary);
        setPlacedStudents(Array.isArray(responseData.students) ? responseData.students : []);
        setStats(responseData.stats || {
          totalStudents: primary.assigned,
          placedStudents: primary.assigned,
          approvalRequests: 0,
          capacityUsed: primary.capacity > 0 ? Math.round((primary.assigned / primary.capacity) * 100) : 0,
        });
        setRecentPlacements((responseData.students || []).slice(0, 5).map((student) => ({
          student: student.username,
          program: student.dept_name,
          status: student.status,
        })));
      } catch (error) {
        console.error('Department load error:', error);
        setDepartments([]);
        setPlacedStudents([]);
      }
    };

    loadDepartments();
  }, [leader]);

  useEffect(() => {
    if (!leader) return;

    const loadPreferences = async () => {
      setPreferencesLoading(true);
      try {
        const response = await api.get('head_preferences.php');
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load preferences.');
        }
        setPreferences(response.data.preferences || { notifications: true, reporting: true });
      } catch (error) {
        setPreferencesSaveMsg(error.response?.data?.message || error.message || 'Unable to load preferences.');
      } finally {
        setPreferencesLoading(false);
      }
    };

    loadPreferences();
  }, [leader]);

  useEffect(() => {
    const draft = {};
    departments.forEach((dept) => {
      draft[dept.id] = Number(dept.capacity || 0);
    });
    setCapacityDraft(draft);
  }, [departments]);

  const saveCapacityPlan = async () => {
    try {
      const updatedDepartments = departments.map((dept) => {
        const nextCapacity = Number(capacityDraft[dept.id] ?? dept.capacity ?? 0);
        return {
          ...dept,
          capacity: nextCapacity,
          available: Math.max(0, nextCapacity - Number(dept.assigned || 0)),
          college_name: dept.college_name || dept.faculty || 'General',
          stream: dept.stream || 'Natural',
          status: dept.status || 'active',
        };
      });

      setDepartments(updatedDepartments);

      const payload = {
        departments: updatedDepartments.map((dept) => ({
          id: dept.id,
          name: dept.name,
          capacity: Number(dept.capacity || 0),
          description: dept.description || '',
          stream: dept.stream || 'Natural',
          college_name: dept.college_name || 'General',
          status: dept.status || 'active',
          head_id: dept.head_id ?? null,
          created_at: dept.created_at || null,
        })),
      };

      try {
        await api.post('departments_update.php', payload);
        setCapacitySaveMsg('Capacity plan saved successfully.');
      } catch (error) {
        console.error('departments_update.php save failed:', error);
        localStorage.setItem('headCapacityPlan', JSON.stringify(payload.departments));
        setCapacitySaveMsg('Saved locally. Backend unavailable.');
      }
    } catch (error) {
      console.error('saveCapacityPlan error:', error);
      setCapacitySaveMsg('Unable to save capacity plan.');
    }

    setTimeout(() => setCapacitySaveMsg(''), 3000);
  };

  const approvePlacement = async (placement) => {
    setApprovalSavingId(placement.placement_id);
    setApprovalError('');
    try {
      const response = await api.post('head_approval.php', {
        placement_id: placement.placement_id,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to approve placement.');
      }

      setPlacedStudents((current) => current.map((student) => student.placement_id === placement.placement_id
        ? { ...student, status: 'Approved' }
        : student));
      setStats((current) => ({ ...current, approvalRequests: Math.max(0, current.approvalRequests - 1) }));
    } catch (error) {
      setApprovalError(error.response?.data?.message || error.message || 'Unable to approve placement.');
    } finally {
      setApprovalSavingId(null);
    }
  };

  // Handle card clicks to show details
  const handleCardClick = (cardType) => {
    setCardDetailModal(cardType);
    setCardDetailLoading(true);
    setCardDetailData([]);

    try {
      let data = [];

      if (cardType === 'totalStudents') {
        // Show all students in the department
        data = placedStudents
          .slice(0, 20)
          .map((student, idx) => ({
            id: idx + 1,
            username: student.username || 'N/A',
            email: student.email || 'N/A',
            department: student.dept_name || department.name,
            score: Number(student.final_score || 0).toFixed(2),
            status: student.status || 'Pending'
          }));
      } else if (cardType === 'placedStudents') {
        // Show placed/confirmed students
        data = placedStudents
          .filter(s => s.status === 'Confirmed' || s.status === 'Approved' || s.status === 'Matched')
          .slice(0, 20)
          .map((student, idx) => ({
            id: idx + 1,
            username: student.username || 'N/A',
            email: student.email || 'N/A',
            department: student.dept_name || department.name,
            score: Number(student.final_score || 0).toFixed(2),
            choiceRank: student.choice_rank || 'N/A',
            status: student.status
          }));
      } else if (cardType === 'approvalRequests') {
        // Show pending approvals
        data = placedStudents
          .filter(s => s.status === 'Pending')
          .slice(0, 20)
          .map((student, idx) => ({
            id: idx + 1,
            username: student.username || 'N/A',
            email: student.email || 'N/A',
            department: student.dept_name || department.name,
            score: Number(student.final_score || 0).toFixed(2),
            status: 'Awaiting Approval'
          }));
      } else if (cardType === 'capacityUsed') {
        // Show capacity breakdown
        data = departments.map((dept, idx) => ({
          id: idx + 1,
          department: dept.name,
          capacity: dept.capacity,
          assigned: dept.assigned,
          available: dept.available,
          utilization: dept.capacity > 0 ? Math.round((dept.assigned / dept.capacity) * 100) : 0
        }));
      }

      setCardDetailData(data);
    } catch (error) {
      console.error('Error processing card details:', error);
      setCardDetailData([]);
    } finally {
      setCardDetailLoading(false);
    }
  };

  if (loading || !leader) {
    return <div className="text-center mt-5">Loading dashboard…</div>;
  }

  return (
    <div className="head-dashboard container-fluid px-0">
      <div className="row g-0">
        <aside className="col-xl-2 sidebar p-4">
          <div className="sidebar-brand mb-5">
            <h5 className="mb-2">Head Dashboard</h5>
            <p className="small text-white-75 mb-0">Department leadership tools and placement oversight.</p>
          </div>

          <nav className="sidebar-nav d-flex flex-column gap-2">
            <button className={`nav-button ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
            <button className={`nav-button ${tab === 'approvals' ? 'active' : ''}`} onClick={() => setTab('approvals')}>Approvals</button>
            <button className={`nav-button ${tab === 'capacity' ? 'active' : ''}`} onClick={() => setTab('capacity')}>Capacity Plan</button>
            <button className={`nav-button ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Placed Students</button>
            <button className={`nav-button ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reports</button>
            <button className={`nav-button ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Preferences</button>
          </nav>
        </aside>

        <main className="col-xl-10 p-5 main-section">
          <header className="dashboard-header mb-5">
            <div>
              <h2 className="fw-bold mb-1">Welcome back, {leader.username}</h2>
              <p className="text-muted mb-0">Track placement progress, approve department allocations, and monitor student outcomes.</p>
            </div>
            <div className="status-chip">Head of Department</div>
          </header>

          {tab === 'overview' && (
            <>
              <div className="row g-4 mb-4">
                <div className="col-md-3">
                  <div 
                    className="card summary-card"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#0d6efd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onClick={() => handleCardClick('totalStudents')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Total Students</span>
                      <h3 className="summary-value">{stats.totalStudents}</h3>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: '#0d6efd', fontWeight: 'bold' }}>Click to view details →</small>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardDetailModal('totalStudents');
                            // Show all students without limit
                            setCardDetailData(placedStudents.map((student, idx) => ({
                              id: idx + 1,
                              username: student.username || 'N/A',
                              email: student.email || 'N/A',
                              department: student.dept_name || department.name,
                              score: Number(student.final_score || 0).toFixed(2),
                              status: student.status || 'Pending'
                            })));
                            setCardDetailLoading(false);
                          }}
                          style={{ padding: '2px 6px', fontSize: '11px' }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div 
                    className="card summary-card"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#198754';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onClick={() => handleCardClick('placedStudents')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Placed Students</span>
                      <h3 className="summary-value">{stats.placedStudents}</h3>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: '#198754', fontWeight: 'bold' }}>Click to view details →</small>
                        <button 
                          className="btn btn-sm btn-outline-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardDetailModal('placedStudents');
                            setCardDetailData(placedStudents
                              .filter(s => s.status === 'Confirmed' || s.status === 'Approved' || s.status === 'Matched')
                              .map((student, idx) => ({
                                id: idx + 1,
                                username: student.username || 'N/A',
                                email: student.email || 'N/A',
                                department: student.dept_name || department.name,
                                score: Number(student.final_score || 0).toFixed(2),
                                choiceRank: student.choice_rank || 'N/A',
                                status: student.status
                              })));
                            setCardDetailLoading(false);
                          }}
                          style={{ padding: '2px 6px', fontSize: '11px' }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div 
                    className="card summary-card"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#dc3545';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onClick={() => handleCardClick('approvalRequests')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Pending Approvals</span>
                      <h3 className="summary-value">{stats.approvalRequests}</h3>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: '#dc3545', fontWeight: 'bold' }}>Click to view details →</small>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardDetailModal('approvalRequests');
                            setCardDetailData(placedStudents
                              .filter(s => s.status === 'Pending')
                              .map((student, idx) => ({
                                id: idx + 1,
                                username: student.username || 'N/A',
                                email: student.email || 'N/A',
                                department: student.dept_name || department.name,
                                score: Number(student.final_score || 0).toFixed(2),
                                status: 'Awaiting Approval'
                              })));
                            setCardDetailLoading(false);
                          }}
                          style={{ padding: '2px 6px', fontSize: '11px' }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div 
                    className="card summary-card"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#ffc107';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onClick={() => handleCardClick('capacityUsed')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Capacity Utilized</span>
                      <h3 className="summary-value">{stats.capacityUsed}%</h3>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: '#ffc107', fontWeight: 'bold' }}>Click to view details →</small>
                        <button 
                          className="btn btn-sm btn-outline-warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardDetailModal('capacityUsed');
                            setCardDetailData(departments.map((dept, idx) => ({
                              id: idx + 1,
                              department: dept.name,
                              capacity: dept.capacity,
                              assigned: dept.assigned,
                              available: dept.available,
                              utilization: dept.capacity > 0 ? Math.round((dept.assigned / dept.capacity) * 100) : 0
                            })));
                            setCardDetailLoading(false);
                          }}
                          style={{ padding: '2px 6px', fontSize: '11px' }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Detail Modal */}
              {cardDetailModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    width: '90%',
                    maxWidth: '900px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    padding: '30px'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="fw-bold mb-0">
                        {cardDetailModal === 'totalStudents' && 'Department Students'}
                        {cardDetailModal === 'placedStudents' && 'Placed Students'}
                        {cardDetailModal === 'approvalRequests' && 'Pending Approvals'}
                        {cardDetailModal === 'capacityUsed' && 'Capacity Breakdown'}
                      </h4>
                      <button 
                        className="btn btn-close" 
                        onClick={() => setCardDetailModal(null)}
                      />
                    </div>

                    {cardDetailLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : cardDetailData.length === 0 ? (
                      <div className="alert alert-info">No data available</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              {cardDetailModal === 'totalStudents' && (
                                <>
                                  <th>#</th>
                                  <th>Student</th>
                                  <th>Email</th>
                                  <th>Department</th>
                                  <th>Score</th>
                                  <th>Status</th>
                                </>
                              )}
                              {cardDetailModal === 'placedStudents' && (
                                <>
                                  <th>#</th>
                                  <th>Student</th>
                                  <th>Email</th>
                                  <th>Department</th>
                                  <th>Score</th>
                                  <th>Choice Rank</th>
                                  <th>Status</th>
                                </>
                              )}
                              {cardDetailModal === 'approvalRequests' && (
                                <>
                                  <th>#</th>
                                  <th>Student</th>
                                  <th>Email</th>
                                  <th>Department</th>
                                  <th>Score</th>
                                  <th>Status</th>
                                </>
                              )}
                              {cardDetailModal === 'capacityUsed' && (
                                <>
                                  <th>#</th>
                                  <th>Department</th>
                                  <th>Capacity</th>
                                  <th>Assigned</th>
                                  <th>Available</th>
                                  <th>Utilization</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {cardDetailData.map((item) => (
                              <tr key={item.id}>
                                {cardDetailModal === 'totalStudents' && (
                                  <>
                                    <td>{item.id}</td>
                                    <td><strong>{item.username}</strong></td>
                                    <td>{item.email}</td>
                                    <td>{item.department}</td>
                                    <td>{item.score}</td>
                                    <td><span className="badge bg-info">{item.status}</span></td>
                                  </>
                                )}
                                {cardDetailModal === 'placedStudents' && (
                                  <>
                                    <td>{item.id}</td>
                                    <td><strong>{item.username}</strong></td>
                                    <td>{item.email}</td>
                                    <td>{item.department}</td>
                                    <td>{item.score}</td>
                                    <td>{item.choiceRank}</td>
                                    <td><span className="badge bg-success">{item.status}</span></td>
                                  </>
                                )}
                                {cardDetailModal === 'approvalRequests' && (
                                  <>
                                    <td>{item.id}</td>
                                    <td><strong>{item.username}</strong></td>
                                    <td>{item.email}</td>
                                    <td>{item.department}</td>
                                    <td>{item.score}</td>
                                    <td><span className="badge bg-warning text-dark">{item.status}</span></td>
                                  </>
                                )}
                                {cardDetailModal === 'capacityUsed' && (
                                  <>
                                    <td>{item.id}</td>
                                    <td><strong>{item.department}</strong></td>
                                    <td>{item.capacity}</td>
                                    <td>{item.assigned}</td>
                                    <td>{item.available}</td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>{item.utilization}%</span>
                                        <div style={{ width: '60px', height: '6px', background: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{ width: `${item.utilization}%`, height: '100%', background: item.utilization > 80 ? '#dc3545' : item.utilization > 50 ? '#ffc107' : '#198754' }} />
                                        </div>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3 text-end">
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setCardDetailModal(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="card analytics-card h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h5 className="card-title">Department Snapshot</h5>
                        <span className="badge badge-soft">{department.status || 'active'}</span>
                      </div>
                      <ul className="overview-list">
                        <li><span>Department</span><strong>{department.name}</strong></li>
                        <li><span>College</span><strong>{department.college_name}</strong></li>
                        <li><span>Stream</span><strong>{department.stream}</strong></li>
                        <li><span>Total Capacity</span><strong>{department.capacity}</strong></li>
                        <li><span>Assigned Seats</span><strong>{department.assigned}</strong></li>
                        <li><span>Available Seats</span><strong>{department.available}</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card analytics-card h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h5 className="card-title">Latest Placement Activity</h5>
                        <button className="btn btn-sm btn-outline-primary">View All</button>
                      </div>
                      <div className="activity-list">
                        {recentPlacements.map(item => (
                          <div key={item.student} className="activity-item">
                            <div>
                              <div className="fw-semibold">{item.student}</div>
                              <div className="text-muted small">{item.program}</div>
                            </div>
                            <span className={`status-tag ${item.status === 'Confirmed' ? 'status-success' : item.status === 'Matched' ? 'status-primary' : 'status-warning'}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'approvals' && (
            <div className="card analytics-card">
              <div className="card-body">
                <h5 className="card-title mb-4">Approval Queue</h5>
                {approvalError && <div className="alert alert-danger py-2">{approvalError}</div>}
                {placedStudents.filter((student) => student.status === 'Pending').length === 0 ? (
                  <p className="text-muted mb-0">No pending placement approvals for {department.name}.</p>
                ) : (
                  <div className="task-grid">
                    {placedStudents.filter((student) => student.status === 'Pending').map((student) => (
                    <div key={student.placement_id} className="task-card">
                      <div>
                        <p className="task-label mb-1">{student.username}</p>
                        <small className="text-muted">{student.dept_name} · score {Number(student.final_score).toFixed(2)}</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => approvePlacement(student)}
                        disabled={approvalSavingId === student.placement_id}
                      >
                        {approvalSavingId === student.placement_id ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'capacity' && (
            <div className="card analytics-card">
              <div className="card-body">
                <h5 className="card-title mb-3">Capacity Planning</h5>
                <p className="text-muted">Review the current intake capacity and update department quotas for the next cycle.</p>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>College</th>
                        <th>Stream</th>
                        <th>Assigned</th>
                        <th>Capacity</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => {
                          const draftCapacity = Number(capacityDraft[dept.id] ?? dept.capacity ?? 0);
                          const availableSeats = Math.max(0, draftCapacity - Number(dept.assigned || 0));

                          return (
                            <tr key={dept.id}>
                              <td>
                                <div className="fw-semibold">{dept.name}</div>
                                <small className="text-muted">{dept.status || 'active'}</small>
                              </td>
                              <td>{dept.college_name}</td>
                              <td>{dept.stream}</td>
                              <td>{dept.assigned}</td>
                              <td style={{ minWidth: '130px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-control"
                                  value={draftCapacity}
                                  onChange={(e) => {
                                    const nextValue = Number(e.target.value || 0);
                                    setCapacityDraft((prev) => ({ ...prev, [dept.id]: nextValue }));
                                  }}
                                />
                              </td>
                              <td>
                                <span className={`badge ${availableSeats > 0 ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                                  {availableSeats}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2 mt-3 flex-wrap align-items-center">
                  <button
                    className="btn btn-primary"
                    onClick={saveCapacityPlan}
                  >
                    Save Capacity Plan
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      const resetDraft = {};
                      departments.forEach((dept) => {
                        resetDraft[dept.id] = Number(dept.capacity || 0);
                      });
                      setCapacityDraft(resetDraft);
                    }}
                  >
                    Reset
                  </button>

                  {capacitySaveMsg && <span className="text-success fw-semibold">{capacitySaveMsg}</span>}
                </div>
              </div>
            </div>
          )}

          {tab === 'students' && (
            <div className="card analytics-card">
              <div className="card-body">
                <h5 className="card-title mb-1">Placed Students</h5>
                <p className="text-muted mb-4">Students assigned to {department.name}.</p>
                {placedStudents.length === 0 ? (
                  <div className="text-muted">No placed students found for this department.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr><th>Student</th><th>Email</th><th>Score</th><th>Choice Rank</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {placedStudents.map((student) => (
                          <tr key={`${student.student_id}-${student.email}`}>
                            <td>{student.username}</td>
                            <td>{student.email}</td>
                            <td>{Number(student.final_score).toFixed(2)}</td>
                            <td>{student.choice_rank}</td>
                            <td><span className="badge bg-success">{student.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card analytics-card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Placement Trend</h5>
                    <p className="text-muted mb-0">Current placement performance for {department.name}.</p>
                    <div className="chart-placeholder">{stats.placedStudents} of {department.capacity} seats assigned</div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card analytics-card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Action Summary</h5>
                    <ul className="overview-list">
                      <li><span>Department</span><strong>{department.name}</strong></li>
                      <li><span>Placed students</span><strong>{stats.placedStudents}</strong></li>
                      <li><span>Pending approvals</span><strong>{stats.approvalRequests}</strong></li>
                      <li><span>Available seats</span><strong>{department.available}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="card analytics-card">
              <div className="card-body">
                <h5 className="card-title mb-4">Department Preferences</h5>
                <p className="text-muted">Update notification and reporting preferences for this dashboard.</p>
                {preferencesLoading && <p className="text-muted">Loading preferences...</p>}
                <div className="settings-grid">
                  <div className="settings-card">
                    <h6>Notifications</h6>
                    <label className="d-flex align-items-center gap-2">
                      <input type="checkbox" checked={preferences.notifications} onChange={(event) => setPreferences((current) => ({ ...current, notifications: event.target.checked }))} />
                      <span className="text-muted small">Receive alerts for new placement requests.</span>
                    </label>
                  </div>
                  <div className="settings-card">
                    <h6>Reporting</h6>
                    <label className="d-flex align-items-center gap-2">
                      <input type="checkbox" checked={preferences.reporting} onChange={(event) => setPreferences((current) => ({ ...current, reporting: event.target.checked }))} />
                      <span className="text-muted small">Receive reporting summaries for your department.</span>
                    </label>
                  </div>
                </div>
                <div className="d-flex gap-3 align-items-center mt-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={preferencesLoading || preferencesSaving}
                    onClick={async () => {
                      setPreferencesSaving(true);
                      setPreferencesSaveMsg('');
                      try {
                        const response = await api.post('head_preferences.php', preferences);
                        if (!response.data?.success) {
                          throw new Error(response.data?.message || 'Unable to save preferences.');
                        }
                        setPreferences(response.data.preferences || preferences);
                        setPreferencesSaveMsg(response.data.message || 'Preferences saved successfully.');
                      } catch (error) {
                        setPreferencesSaveMsg(error.response?.data?.message || error.message || 'Unable to save preferences.');
                      } finally {
                        setPreferencesSaving(false);
                      }
                    }}
                  >
                    {preferencesSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                  {preferencesSaveMsg && <span className={`${preferencesSaveMsg.includes('Unable') || preferencesSaveMsg.includes('must') || preferencesSaveMsg.includes('Only') ? 'text-danger' : 'text-success'} fw-semibold`}>{preferencesSaveMsg}</span>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HeadDashboard;
