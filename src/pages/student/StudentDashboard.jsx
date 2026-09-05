import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import StudentAppeal from './StudentAppeal';
import { FaTrash } from 'react-icons/fa';
import '../admin/AdminDashboard.css';

export const parseYesNo = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'on'].includes(normalized);
};

const normalizeDepartmentsPayload = (payload) => {
  const topLevel = payload?.data ?? payload;
  if (Array.isArray(topLevel)) return topLevel.filter(Boolean);
  if (Array.isArray(topLevel?.departments)) return topLevel.departments.filter(Boolean);
  if (Array.isArray(topLevel?.data)) return topLevel.data.filter(Boolean);
  return [];
};

const normalizeStream = (value) => {
  const stream = String(value || '').trim();
  if (/^social( science)?$/i.test(stream)) return 'Social';
  if (/^natural( science)?$/i.test(stream)) return 'Natural';
  return stream;
};

const normalizeCollege = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b(college|school|institute)\s+of\s+/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const getDepartmentStream = (department) => {
  const rawStream = department?.stream || department?.academic_stream || department?.category;
  if (rawStream) return normalizeStream(rawStream);

  const college = String(department?.college_name || department?.college || department?.faculty || '').toLowerCase();
  const name = String(department?.name || '').toLowerCase();

  if (college.includes('business') || college.includes('economics') || college.includes('social') || college.includes('humanit') || college.includes('law')) return 'Social';
  if (college.includes('agric') || college.includes('health') || college.includes('engineer') || college.includes('natural') || college.includes('comput') || college.includes('environment')) return 'Natural';
  if (/biology|chemistry|physics|mathematics|computer|engineering|agric/.test(name)) return 'Natural';

  return 'Natural';
};

const collegesByStream = {
  Natural: [
    'Engineering',
    'Natural and Computational Sciences',
    'College of Health Sciences',
    'Computing and Informatics',
    'Agriculture and Environmental Sciences',
  ],
  Social: [
    'College of Business and Economics',
    'College of Social Sciences and Humanities',
    'College of Law',
  ],
};

// 1. DTU Official Academic Structure (Fixed spaces in Stream names)
const dtuAcademicStructure = [
  {
    stream: 'Natural Science',
    colleges: [
      {
        name: 'College of Health Sciences',
        departments: ['Medicine', 'Nursing', 'Public Health', 'Medical Laboratory Sciences', 'Midwifery', 'Pharmacy', 'Anesthesia', 'Biomedical Science']
      },
      {
        name: 'College of Natural and Computational Sciences',
        departments: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Statistics', 'Sport Science']
      },
      {
        name: 'Institute of Technology',
        departments: ['Civil Engineering', 'Electrical & Computer Engineering', 'Mechanical Engineering', 'Chemical Engineering', 'Hydraulic & Water Resources Engineering', 'Electromechanical Engineering', 'Information Technology']
      },
      {
        name: 'College of Agriculture & Environmental Sciences',
        departments: ['Plant Science', 'Horticulture', 'Animal Science', 'Natural Resources Management', 'Forestry', 'Veterinary Science', 'Geology', 'Geography', 'Environmental Science']
      }
    ]
  },
  {
    stream: 'Social Science',
    colleges: [
      {
        name: 'College of Business and Economics',
        departments: ['Accounting and Finance', 'Management', 'Economics', 'Marketing Management', 'Logistics & Supply Chain']
      },
      {
        name: 'College of Social Sciences and Humanities',
        departments: ['English', 'History', 'Geography', 'Sociology', 'Civics and Ethical Studies', 'Psychology', 'ECCE']
      },
      {
        name: 'School of Law',
        departments: ['Law']
      }
    ]
  }
];

const formatGpaValue = (value) => {
  const numericValue = Number(value);
  return (value === null || value === undefined || Number.isNaN(numericValue)) ? '0.00' : numericValue.toFixed(2);
};

const formatScoreValue = (value) => {
  if (value === null || value === undefined || value === '' || String(value).toUpperCase() === 'N/A') return 'N/A';
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? String(value) : numericValue.toFixed(2);
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  
  const [allDepartments, setAllDepartments] = useState([]); 
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState({ stream: '', college: '', depts: Array(5).fill('') });
  const [placementResult, setPlacementResult] = useState(null);
  const [placementResultLoading, setPlacementResultLoading] = useState(false);
  const [preferencesSubmitted, setPreferencesSubmitted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [deletingNotificationId, setDeletingNotificationId] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { navigate('/login'); return; }
    const parsedUser = JSON.parse(storedUser);
    setStudent(parsedUser);

    const loadData = async () => {
      try {
        const resDepts = await api.get('api/common/departments_api.php');
        const dbDepts = normalizeDepartmentsPayload(resDepts.data);
        setAllDepartments(dbDepts.map((department) => ({
          ...department,
          stream: getDepartmentStream(department),
          college_name: department.college_name || department.college || department.faculty || '',
        })));

        const resProfile = await api.get(`api/student/student_data_api.php?student_id=${encodeURIComponent(parsedUser.id)}&email=${encodeURIComponent(parsedUser.email || '')}`);
        const studentData = resProfile?.data?.student || (Array.isArray(resProfile?.data?.students) ? resProfile.data.students[0] : null);
        if (resProfile?.data?.success && studentData) {
          setProfile({
            ...studentData,
            disability: parseYesNo(studentData.disability ?? studentData.has_disability ?? studentData.hasDisability ?? studentData.specialSupport),
            minority: parseYesNo(studentData.minority ?? studentData.is_minority ?? studentData.isMinority),
          });
        } else {
          setProfile({ fullname: '', email: '', cgpa: 0, gpa: 0, stream: '', status: 'Pending', disability: false, minority: false });
        }

        const resPrefs = await api.get(`api/student/student_preferences.php?student_id=${parsedUser.id}`);
        if (resPrefs.data.success && resPrefs.data.choices?.length > 0) {
          const saved = resPrefs.data.choices;
          const savedDepts = Array(5).fill('');
          saved.forEach((item, idx) => {
            savedDepts[idx] = item.name || item.department || item.department_name || '';
          });
          setPreferences({
            stream: normalizeStream(saved[0].stream),
            college: saved[0].college_name || saved[0].college || '',
            depts: savedDepts
          });
          setPreferencesSubmitted(true);
        }

      } catch (error) {
        console.error("Load Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  useEffect(() => {
    if (!['overview', 'result'].includes(tab) || !student?.id) return;

    const loadPlacementResult = async () => {
      setPlacementResultLoading(true);
      try {
        const response = await api.get(`api/student/get_student_result.php?student_id=${encodeURIComponent(student.id)}`);
        setPlacementResult(response.data?.success ? response.data : null);
      } catch (error) {
        setPlacementResult(null);
      } finally {
        setPlacementResultLoading(false);
      }
    };

    loadPlacementResult();
  }, [student, tab]);

  useEffect(() => {
    if (tab !== 'notifications' || !student?.id) return;

    const loadNotifications = async () => {
      setNotificationsLoading(true);
      setNotificationsError('');

      try {
        const response = await api.get(`api/student/get_student_notifications.php?student_id=${encodeURIComponent(student.id)}`);
        const payload = response.data;
        const notificationList = Array.isArray(payload)
          ? payload
          : payload?.notifications || payload?.data || [];

        setNotifications(Array.isArray(notificationList) ? notificationList : []);
      } catch (error) {
        setNotifications([]);
        setNotificationsError(error.response?.data?.message || 'Unable to load notifications.');
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, [student, tab]);

  const unreadNotifications = notifications.filter((notification) => (
    notification.is_read === false ||
    notification.is_read === 0 ||
    notification.read === false ||
    notification.status === 'unread'
  )).length;

  const deleteNotification = async (notification) => {
    if (!window.confirm('Delete this notification?')) return;

    setDeletingNotificationId(notification.id);
    setNotificationsError('');
    try {
      const response = await api.post('api/student/delete_student_notification.php', {
        notification_id: notification.id,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete notification.');
      }
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch (error) {
      setNotificationsError(error.response?.data?.message || error.message || 'Unable to delete notification.');
    } finally {
      setDeletingNotificationId(null);
    }
  };

  // --- Dynamic Cascading Logic (Purely from allDepartments state) ---
  const streamOptions = useMemo(() => {
    return ['Natural', 'Social'];
  }, []);

  const collegeOptions = useMemo(() => {
    const tableColleges = allDepartments
      .filter((department) => department.stream === preferences.stream)
      .map((department) => department.college_name)
      .filter(Boolean);

    return [...new Set(tableColleges.length > 0 ? tableColleges : (collegesByStream[preferences.stream] || []))];
  }, [allDepartments, preferences.stream]);

  const departmentOptions = useMemo(() => {
    return allDepartments
      .filter((department) => (
        department.stream === preferences.stream &&
        normalizeCollege(department.college_name) === normalizeCollege(preferences.college)
      ))
      .map(d => d.name);
  }, [allDepartments, preferences.college, preferences.stream]);

  const handleChoiceChange = (idx, value) => {
    const newDepts = [...preferences.depts];
    newDepts[idx] = value;
    setPreferences({ ...preferences, depts: newDepts });
  };

  const handleSave = async () => {
    if (preferencesSubmitted) {
      alert("You cannot submit preferences again!");
      return;
    }

    const registeredStream = normalizeStream(profile?.stream || student?.stream || '');
    const selectedStream = normalizeStream(preferences.stream);

    if (!selectedStream) {
      alert('Please select a stream.');
      return;
    }

    if (registeredStream && normalizeStream(registeredStream) !== selectedStream) {
      alert('The stream is incorrect.');
      return;
    }

    if (!preferences.college) {
      alert('Please select a college.');
      return;
    }

    const formattedChoices = preferences.depts
      .map((name, index) => {
        const dbDept = allDepartments.find(d => d.name === name);
        return dbDept ? { dept_id: dbDept.id, priority: index + 1 } : null;
      })
      .filter(c => c !== null);

    const requiredChoices = departmentOptions.length >= 5
      ? 5
      : Math.min(3, departmentOptions.length);

    if (departmentOptions.length === 0) {
      alert('No departments are available for the selected stream and college.');
      return;
    }

    if (formattedChoices.length < requiredChoices) {
      alert(
        departmentOptions.length >= 5
          ? 'Please select all 5 department preferences.'
          : departmentOptions.length < 3
          ? `Please select all ${departmentOptions.length} available department${departmentOptions.length === 1 ? '' : 's'}.`
          : 'Please select at least 3 departments.'
      );
      return;
    }

    try {
      const res = await api.post('api/student/student_preferences.php', {
        student_id: student.id,
        choices: formattedChoices
      });
      if (res.data.success) {
        alert("Saved successfully!");
        setPreferencesSubmitted(true);
      }
    } catch (err) {
      alert("Save failed. Check backend.");
    }
  };

  if (loading) return <div className="text-center mt-5">Loading DTU Portal...</div>;

  return (
    <div className="admin-dashboard container-fluid px-0">
      <div className="row g-0">
        <aside className="col-md-2 sidebar bg-dark text-white p-4 min-vh-100 shadow">
          <div className="sidebar-brand mb-4">
            <h5 className="fw-bold text-warning">DTU Portal</h5>
            <p className="small text-white-50">Student Dashboard</p>
          </div>
          <nav className="nav flex-column gap-2">
            <button className={`btn dashboard-nav-btn text-start ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
            {/* <button className={`btn dashboard-nav-btn text-start ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile & Verify</button> */}
            <button className={`btn dashboard-nav-btn text-start ${tab === 'preferences' ? 'active' : ''}`} onClick={() => setTab('preferences')}>Submit Preferences</button>
            <button className={`btn dashboard-nav-btn text-start ${tab === 'result' ? 'active' : ''}`} onClick={() => setTab('result')}>Placement Result</button>
            <button className={`btn dashboard-nav-btn text-start ${tab === 'appeal' ? 'active' : ''}`} onClick={() => setTab('appeal')}>Submit Appeal</button>
            <button className={`btn dashboard-nav-btn text-start ${tab === 'notifications' ? 'active' : ''}`} onClick={() => setTab('notifications')}>
              Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
            </button>
          </nav>
        </aside>

        <main className="col-md-10 p-5 main-content bg-light">
          <header className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold">Welcome, <span className="text-primary">{student?.username}</span>! 👋</h2>
            <span className="badge bg-primary px-3 py-2 rounded-pill">ID: {student?.id}</span>
          </header>

          {tab === 'overview' && (
            <div className="row g-4">
              <div className="col-md-4">
                <div className="card shadow-sm p-4 border-0 border-start border-primary border-5 rounded-4">
                  <span className="text-muted small fw-bold text-uppercase">GPA</span>
                  <h2 className="fw-bold m-0 text-primary">{profile ? formatGpaValue(profile.gpa || profile.cgpa) : '0.00'}</h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm p-4 border-0 border-start border-info border-5 rounded-4">
                  <span className="text-muted small fw-bold text-uppercase">Grade 12 Result</span>
                  <h2 className="fw-bold m-0 text-info">
                    {profile ? formatScoreValue(profile.grade_12_result ?? profile.grade12 ?? profile.grade_12) : 'N/A'}
                  </h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm p-4 border-0 border-start border-secondary border-5 rounded-4">
                  <span className="text-muted small fw-bold text-uppercase">COC Result</span>
                  <h2 className="fw-bold m-0 text-secondary">
                    {profile ? formatScoreValue(profile.coc_result ?? profile.coc) : 'N/A'}
                  </h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm p-4 border-0 border-start border-success border-5 rounded-4">
                  <span className="text-muted small fw-bold text-uppercase">Stream</span>
                  <h2 className="fw-bold m-0 text-success">{profile?.stream || 'Natural'}</h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm p-4 border-0 border-start border-warning border-5 rounded-4">
                  <span className="text-muted small fw-bold text-uppercase">Final Score</span>
                  <h2 className="fw-bold m-0 text-warning">
                    {placementResultLoading
                      ? '...'
                      : placementResult?.placement
                        ? Number(placementResult.placement.merit_score || 0).toFixed(2)
                        : 'N/A'}
                  </h2>
                </div>
              </div>
            </div>
          )}

          {tab === 'preferences' && (
            <div className="card p-4 border-0 shadow-sm rounded-4">
              <h5 className="fw-bold text-primary mb-4 text-center">Rank Your Department Preferences</h5>
              
              <div className="bg-white border p-4 rounded-4 mb-4 shadow-sm">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">1. SELECT STREAM</label>
                    <select className="form-select" value={preferences.stream}
                      onChange={(e) => setPreferences({ stream: e.target.value, college: '', depts: Array(5).fill('') })}>
                      <option value="">-- Choose Stream --</option>
                      {streamOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-muted">2. SELECT COLLEGE</label>
                    <select className="form-select" value={preferences.college}
                      onChange={(e) => setPreferences({ ...preferences, college: e.target.value, depts: Array(5).fill('') })}>
                      <option value="">-- Choose College --</option>
                      {collegeOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                {preferences.depts.map((choice, idx) => (
                  <div className="col-md-6" key={idx}>
                    <div className="p-3 border rounded-3 bg-white">
                        <label className="small fw-bold text-primary mb-2 d-block">Preference Rank #{idx + 1}</label>
                        <select className="form-select border-0 bg-light shadow-none" value={choice}
                        onChange={(e) => handleChoiceChange(idx, e.target.value)}>
                        <option value="">-- Select Department --</option>
                        {departmentOptions.map(dName => (
                            <option key={dName} value={dName} disabled={preferences.depts.includes(dName) && choice !== dName}>
                            {dName}
                            </option>
                        ))}
                        </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-end mt-4">
                <button className="btn px-4 py-2 fw-bold shadow-sm rounded-pill dtu-submit-button" onClick={handleSave}>
                  submit
                </button>
              </div>
            </div>
          )}

          {tab === 'result' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h4 className="fw-bold text-primary mb-3">Placement Result</h4>

                {placementResultLoading ? (
                  <div className="alert alert-info mb-0">Loading your placement result...</div>
                ) : !placementResult?.placement ? (
                  <div className="alert alert-info mb-0">
                    {placementResult?.message || 'Your placement result is not available yet.'}
                  </div>
                ) : (
                  <>
                    <div className="alert alert-success">
                      {placementResult.message}
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered align-middle mb-0">
                        <tbody>
                          <tr>
                            <th>Assigned Department</th>
                            <td>{placementResult.placement.assigned_department || 'Not available'}</td>
                          </tr>
                          <tr>
                            <th>College</th>
                            <td>{placementResult.placement.college || 'Not available'}</td>
                          </tr>
                          <tr>
                            <th>Stream</th>
                            <td>{placementResult.placement.stream || 'Not available'}</td>
                          </tr>
                          <tr>
                            <th>Merit Score</th>
                            <td>{Number(placementResult.placement.merit_score || 0).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Choice Rank</th>
                            <td>{placementResult.placement.choice_rank || 'Not available'}</td>
                          </tr>
                          <tr>
                            <th>Status</th>
                            <td>
                              <span className="badge bg-success">
                                {placementResult.placement.placement_status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'appeal' && (
            <StudentAppeal
              studentId={student?.id}
              placement={placementResult?.placement}
            />
          )}

          {tab === 'notifications' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="fw-bold text-primary mb-0">Notifications</h4>
                  {unreadNotifications > 0 && (
                    <span className="badge bg-primary">{unreadNotifications} unread</span>
                  )}
                </div>

                {notificationsLoading && (
                  <div className="alert alert-info mb-0">Loading notifications...</div>
                )}

                {!notificationsLoading && notificationsError && (
                  <div className="alert alert-danger mb-0">{notificationsError}</div>
                )}

                {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                  <div className="alert alert-light border mb-0">You do not have any notifications yet.</div>
                )}

                {!notificationsLoading && !notificationsError && notifications.length > 0 && (
                  <div className="list-group">
                    {notifications.map((notification, index) => {
                      const isUnread = notification.is_read === false ||
                        notification.is_read === 0 ||
                        notification.read === false ||
                        notification.status === 'unread';

                      return (
                        <div className={`list-group-item ${isUnread ? 'fw-semibold' : ''}`} key={notification.id || index}>
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <span>{notification.message || notification.title || 'New notification'}</span>
                            <div className="d-flex align-items-center gap-2">
                              {notification.created_at && (
                                <small className="text-muted text-nowrap">{notification.created_at}</small>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                title="Delete notification"
                                aria-label="Delete notification"
                                onClick={() => deleteNotification(notification)}
                                disabled={deletingNotificationId === notification.id}
                              >
                                <FaTrash aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          {notification.title && notification.message && (
                            <div className="text-muted small mt-1">{notification.title}</div>
                          )}
                          {notification.file_url && (
                            <a
                              className="btn btn-sm btn-outline-primary mt-2"
                              href={notification.file_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Open attachment
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;