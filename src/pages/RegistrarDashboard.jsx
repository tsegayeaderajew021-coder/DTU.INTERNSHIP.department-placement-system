import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import StudentRegistration from './StudentRegistration';
import BulkUploadModal from '../components/BulkUploadModal';
import MissingScoresForm from '../components/MissingScoresForm';
import './AdminDashboard.css';

export const parseYesNo = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'on'].includes(normalized);
};

export const filterStudentIdsForPlacement = (studentRecords, selectedStudentIds) => {
  if (!Array.isArray(studentRecords)) return [];

  if (!Array.isArray(selectedStudentIds) || selectedStudentIds.length === 0) {
    return studentRecords;
  }

  const selectedSet = new Set(selectedStudentIds.map((id) => String(id)));
  return studentRecords.filter((student) => selectedSet.has(String(student?.id)));
};

const hasPlacementResult = (student) => {
  if (!student) return false;

  const status = String(student.status || student.placement_status || '').trim();
  const result = student.placementResult ?? student.placement_result ?? student.result ?? student.placement;

  return /placed|approved/i.test(status)
    || (result !== null && result !== undefined && result !== '' && result !== false);
};

const emptyDepartments = [];

const getDepartmentStream = (department) => {
  if (department?.stream && String(department.stream).trim()) {
    return String(department.stream).trim();
  }

  const college = String(department?.college || department?.college_name || department?.collegeName || '').toLowerCase().trim();
  const name = String(department?.name || '').toLowerCase();

  if (college.includes('business') || college.includes('economics')) return 'Business & Economics';
  if (college.includes('agric') || name.includes('agric')) return 'Agriculture';
  if (college.includes('medicine') || college.includes('health') || college.includes('nursing')) return 'Medicine & Health Sciences';
  if (college.includes('law') || name.includes('law')) return 'Law';
  if (college.includes('educ') || name.includes('education')) return 'Education';
  if (college.includes('social') || college.includes('humanit') || name.includes('history') || name.includes('english') || name.includes('social') || name.includes('psychology')) return 'Humanities';
  if (college.includes('engineer')) return 'Engineering';
  if (college.includes('natural') || college.includes('computational') || college.includes('environment') || /biology|chemistry|physics|mathematics|computer|statistics/.test(name)) return 'Natural Science';

  return 'Natural Science';
};

const RegistrarDashboard = () => {
  const navigate = useNavigate();
  const [registrar, setRegistrar] = useState(null);
  const [tab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem('registrarActiveTab');
    return savedTab || 'overview';
  });
  const setTab = (nextTab) => {
    setActiveTab(nextTab);
    sessionStorage.setItem('registrarActiveTab', nextTab);
  };
  const [summary, setSummary] = useState({
    departments: 0,
    activeStudents: 0,
    placementsCompleted: 0,
    pendingApprovals: 0,
  });
  const [placementRules, setPlacementRules] = useState(() => {
    try {
      const raw = localStorage.getItem('placementRules');
      return raw ? JSON.parse(raw) : {
        gpaWeight: 40,
        grade12Weight: 20,
        cocWeight: 30,
        genderWeight: 3,
        disabilityWeight: 3,
        minorityWeight: 4,
      };
    } catch (e) {
      return { gpaWeight: 40, grade12Weight: 20, cocWeight: 30, genderWeight: 3, disabilityWeight: 3, minorityWeight: 4 };
    }
  });
  const [rulesSaved, setRulesSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [pendingResults, setPendingResults] = useState([]);
  const [pendingApprovalRows, setPendingApprovalRows] = useState([]);
  const [pendingApprovalLoading, setPendingApprovalLoading] = useState(false);
  const [publishingResults, setPublishingResults] = useState(false);
  const [placementError, setPlacementError] = useState('');
  const [departments, setDepartments] = useState(emptyDepartments);
  const [appeals, setAppeals] = useState([]);
  const [appealSavingId, setAppealSavingId] = useState(null);
  const [reportStats, setReportStats] = useState(null);
  const [reportStatsLoading, setReportStatsLoading] = useState(false);
  
  // State for card detail modals
  const [cardDetailModal, setCardDetailModal] = useState(null); // 'departments', 'activeStudents', 'placementsCompleted', 'pendingApprovals'
  const [cardDetailData, setCardDetailData] = useState([]);
  const [cardDetailLoading, setCardDetailLoading] = useState(false);
  const [studentRecords, setStudentRecords] = useState([]);
  const [streamFilter, setStreamFilter] = useState('all');
  const [deptSearch, setDeptSearch] = useState('');
  const [studentInfoLoading, setStudentInfoLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [choiceMatrixSearch, setChoiceMatrixSearch] = useState('');
  const [selectedStream, setSelectedStream] = useState('all');
  const [placementCollege, setPlacementCollege] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [missingScoresStudent, setMissingScoresStudent] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const PAGE_SIZE = 10;
  const [placementBatch, setPlacementBatch] = useState(() => {
    try {
      return localStorage.getItem('dtuPlacementBatch') || 'DTU-2026/1';
    } catch (error) {
      return 'DTU-2026/1';
    }
  });

  const needsAcademicScores = (student) => {
    const gpa = student?.gpa ?? student?.cgpa ?? null;
    const g12 = student?.g12 ?? student?.grade_12_result ?? null;
    const coc = student?.coc ?? student?.coc_result ?? null;

    const isMissing = (value) => value === null || value === undefined || value === '' || value === 'N/A' || value === 'NA';
    return isMissing(gpa) || isMissing(g12) || isMissing(coc);
  };

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (!data) {
      navigate('/login');
      return;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.role === 'registrar') {
        setRegistrar(parsed);
      } else {
        navigate('/login');
      }
    } catch (error) {
      localStorage.clear();
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!registrar) return;

    const loadAppeals = async () => {
      try {
        const response = await api.get('submit_appeal.php');
        if (response.data?.success) {
          setAppeals(Array.isArray(response.data.appeals) ? response.data.appeals : []);
        }
      } catch (error) {
        console.error('Failed to load student appeals:', error);
      }
    };

    loadAppeals();
  }, [registrar]);

  useEffect(() => {
    if (!registrar) return;

    const loadReportStats = async () => {
      setReportStatsLoading(true);
      try {
        const response = await api.get('get_registrar_stats.php');
        if (response.data?.success) {
          setReportStats(response.data.stats || null);
        }
      } catch (error) {
        console.error('Failed to load registrar report statistics:', error);
      } finally {
        setReportStatsLoading(false);
      }
    };

    loadReportStats();
  }, [registrar]);

  const updateAppeal = async (appeal) => {
    setAppealSavingId(appeal.id);
    try {
      const response = await api.post('submit_appeal.php', {
        action: 'update',
        appeal_id: appeal.id,
        status: appeal.status,
        response: appeal.response || '',
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update appeal.');
      }
    } catch (error) {
      setPlacementError(error.response?.data?.message || error.message || 'Unable to update appeal.');
    } finally {
      setAppealSavingId(null);
    }
  };

  // Card detail handlers - fetch data when cards are clicked
  const handleCardClick = async (cardType) => {
    setCardDetailModal(cardType);
    setCardDetailLoading(true);
    setCardDetailData([]);

    try {
      let data = [];
      
      if (cardType === 'departments') {
        // Fetch all departments
        data = departments.map((dept, idx) => ({
          id: idx + 1,
          name: dept.name,
          capacity: dept.capacity,
          college: dept.college,
          stream: dept.stream
        }));
      } 
      else if (cardType === 'activeStudents') {
        // Show active students
        data = studentRecords
          .filter((student) => student.status !== 'Rejected' && student.status !== 'Inactive')
          .slice(0, 20) // Show first 20
          .map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            gpa: student.gpa,
            stream: student.stream,
            status: student.status
          }));
      } 
      else if (cardType === 'placementsCompleted') {
        // Show placed students
        data = studentRecords
          .filter((student) => /placed|approved/i.test(student.status))
          .slice(0, 20)
          .map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            status: student.status,
            department: student.department,
            cumulativeScore: student.cumulativeScore
          }));
      } 
      else if (cardType === 'pendingApprovals') {
        // Show pending students
        data = studentRecords
          .filter((student) => /pending|review/i.test(student.status))
          .slice(0, 20)
          .map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            status: student.status,
            cumulativeScore: student.cumulativeScore
          }));
      }

      setCardDetailData(data);
    } catch (error) {
      console.error('Error fetching card details:', error);
      setCardDetailData([]);
    } finally {
      setCardDetailLoading(false);
    }
  };

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await api.get('departments_api.php');
        const payload = response.data ?? {};
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.departments)
            ? payload.departments
            : Array.isArray(payload.data)
              ? payload.data
              : [];

        if (list.length > 0) {
          const normalized = list.map((dept) => ({
            id: dept.id || dept.department_id || dept.department || dept.name?.toLowerCase().replace(/\s+/g, '-'),
            name: dept.name || dept.department || '',
            capacity: Number(dept.capacity ?? dept.seats ?? dept.quota ?? 0),
            college: dept.college || dept.college_name || dept.collegeName || dept.program_college || '',
            stream: dept.stream || dept.academic_stream || dept.category || getDepartmentStream({
              name: dept.name || dept.department || '',
              college: dept.college || dept.college_name || dept.collegeName || dept.program_college || '',
            }),
          })).filter((dept) => dept.id && dept.name.trim());

          setDepartments(normalized);
        }
      } catch (err) {
        // Keep default departments when backend is unavailable.
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    if (!registrar || tab !== 'approve-results') return;

    const loadPendingApprovalRows = async () => {
      setPendingApprovalLoading(true);

      try {
        const response = await api.get('get_pending_results.php');
        const payload = response.data || {};

        if (!payload.success) {
          throw new Error(payload.message || 'Unable to load pending placement results.');
        }

        setPendingApprovalRows(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        setPlacementError(error?.response?.data?.message || error?.message || 'Unable to load pending placement results.');
        setPendingApprovalRows([]);
      } finally {
        setPendingApprovalLoading(false);
      }
    };

    loadPendingApprovalRows();
  }, [registrar, tab]);

  useEffect(() => {
    try {
      localStorage.setItem('dtuPlacementBatch', placementBatch);
    } catch (error) {
      // Ignore localStorage write issues in restricted environments.
    }
  }, [placementBatch]);

  useEffect(() => {
    const fetchStudentRecords = async () => {
      setStudentInfoLoading(true);

      try {
        const usersResponse = await api.get('users_api.php');
        const usersPayload = Array.isArray(usersResponse.data)
          ? usersResponse.data
          : Array.isArray(usersResponse.data?.users)
            ? usersResponse.data.users
            : Array.isArray(usersResponse.data?.data)
              ? usersResponse.data.data
              : [];

        const studentUsers = usersPayload.filter((user) => {
          const role = String(user?.role || '').trim().toLowerCase();
          return role === 'student';
        });

        const records = await Promise.all(
          studentUsers.map(async (user) => {
            const email = user?.email || '';
            let profile = {};

            if (email) {
              try {
                const profileResponse = await api.get(`student_profile.php?email=${encodeURIComponent(email)}`);
                profile = profileResponse.data?.student || profileResponse.data?.data || {};
              } catch (error) {
                profile = {};
              }
            }

            // ===== DATABASE COLUMN MAPPING =====
            // Map all fields to their exact MySQL column names
            const cgpaValue = Number(profile?.cgpa ?? profile?.gpa ?? user?.cgpa ?? 0);
            const numericCgpa = Number.isFinite(cgpaValue) ? cgpaValue : 0;

            // Grade 12 Result - Map from database column
            const g12 = profile?.grade_12_result ?? profile?.g12 ?? profile?.g12_score ?? null;

            // Certificate of Competence Result - Map from database column (numeric score)
            const coc = profile?.coc_result ?? profile?.coc ?? profile?.certificate_of_competence ?? null;
            // Ensure COC is a number if it exists
            const cocValue = coc ? Number(coc) : null;

            // Cumulative Average Score - Map from database column
            const cumulativeAvg = Number(profile?.cumulative_avg ?? 0);

            // Additional Student Attributes
            const gender = (profile?.gender || user?.gender || '').toString();
            const hasDisability = parseYesNo(profile?.disability ?? profile?.has_disability ?? profile?.hasDisability ?? profile?.specialSupport);
            const minority = parseYesNo(profile?.minority ?? profile?.is_minority ?? profile?.isMinority);

            // ===== COMPUTE CUMULATIVE SCORE =====
            let cumulativeScore = cumulativeAvg;

            // If database doesn't have cumulative_avg, compute from components
            if (!cumulativeAvg || cumulativeAvg === 0) {
              const cgpaNorm = (numericCgpa > 10) ? Math.min(100, numericCgpa) / 100 : Math.min(4, Math.max(0, numericCgpa)) / 4;
              const grade12Raw = Number(g12 ?? 0);
              const grade12Norm = grade12Raw > 10 ? Math.min(100, grade12Raw) / 100 : Math.min(4, Math.max(0, grade12Raw)) / 4;

              const gpaWeight = Number(placementRules?.gpaWeight ?? 40);
              const grade12Weight = Number(placementRules?.grade12Weight ?? 20);
              const cocWeight = Number(placementRules?.cocWeight ?? 30);
              const genderWeight = Number(placementRules?.genderWeight ?? 3);
              const disabilityWeight = Number(placementRules?.disabilityWeight ?? 3);
              const minorityWeight = Number(placementRules?.minorityWeight ?? 4);

              cumulativeScore = (cgpaNorm * gpaWeight) + (grade12Norm * grade12Weight);

              if (coc) cumulativeScore += cocWeight;
              if (hasDisability) cumulativeScore += disabilityWeight;
              if (minority) cumulativeScore += minorityWeight;
              if (String(gender).toLowerCase() === 'female') cumulativeScore += genderWeight;

              cumulativeScore = Math.round((cumulativeScore + (profile?.bonus_points || 0)) * 100) / 100;
            }

            // ===== FETCH STUDENT PREFERENCES =====
            let choices = [];
            const studentId = user?.id ?? user?.student_id ?? profile?.student_id ?? profile?.id ?? null;
            if (studentId) {
              try {
                const preferencesResponse = await api.get(`student_preferences.php?student_id=${encodeURIComponent(studentId)}`);
                const preferencesPayload = preferencesResponse.data || {};
                const preferences = Array.isArray(preferencesPayload.choices)
                  ? preferencesPayload.choices
                  : Array.isArray(preferencesPayload.data)
                    ? preferencesPayload.data
                    : Array.isArray(preferencesPayload)
                      ? preferencesPayload
                      : [];

                choices = preferences
                  .map((preference, index) => {
                    const name = preference?.department || preference?.name || preference?.dept_name || preference?.department_name || preference?.label || '';
                    if (!name) return null;
                    return {
                      priority: Number(preference?.priority ?? preference?.rank ?? index + 1),
                      department: name,
                      college: preference?.college_name || preference?.collegeName || preference?.college || '',
                      stream: preference?.stream || '',
                    };
                  })
                  .filter(Boolean)
                  .sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99));
              } catch (error) {
                choices = [];
              }
            }

            // ===== BUILD STUDENT RECORD OBJECT =====
            return {
              id: user?.id ?? user?.student_id ?? profile?.student_id ?? profile?.id ?? null,
              name: profile?.fullname || profile?.full_name || profile?.name || user?.username || '',
              email: profile?.email || user?.email || '',
              phone: profile?.phone || profile?.phone_number || profile?.contact || user?.phone_number || '',
              cgpa: numericCgpa.toFixed(2),
              g12: g12,
              coc: cocValue,
              gender,
              hasDisability: hasDisability,
              minority: minority,
              cumulativeScore: cumulativeScore,
              department: profile?.placement_result_department || profile?.department || profile?.program || profile?.department_name || user?.department || '',
              status: profile?.placement_result_department
                ? (profile?.placement_result_status === 'Approved' ? 'Approved' : 'Placed')
                : (profile?.placement_status || profile?.status || profile?.placementStatus || 'Pending'),
              placementResult: profile?.placement_result_department || profile?.placement_result || profile?.placementResult || profile?.placement || profile?.result || null,
              choices,
            };
          })
        );

        setStudentRecords(records.filter((record) => record.id !== null && record.name.trim()));
      } catch (error) {
        console.error('Failed to fetch student records:', error);
        setStudentRecords([]);
      } finally {
        setStudentInfoLoading(false);
      }
    };

    if (registrar) {
      fetchStudentRecords();
    }
  }, [placementRules, registrar]);

  // Fetch dashboard overview statistics from backend
  useEffect(() => {
    const fetchDashboardOverview = async () => {
      try {
        const response = await api.get('dashboard_overview_api.php');
        
        if (response.data?.success && response.data?.data) {
          const { departments, activeStudents, placementsCompleted, pendingApprovals } = response.data.data;
          setSummary({
            departments: departments || 0,
            activeStudents: activeStudents || 0,
            placementsCompleted: placementsCompleted || 0,
            pendingApprovals: pendingApprovals || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard overview:', error);
        // Fall back to calculating from client-side data
        const totalDepartments = departments.length;
        const placedStudents = studentRecords.filter((student) => /placed|approved/i.test(student.status)).length;
        const pendingStudents = studentRecords.filter((student) => /pending|review/i.test(student.status)).length;

        setSummary((prev) => ({
          departments: totalDepartments,
          activeStudents: studentRecords.length,
          placementsCompleted: placedStudents,
          pendingApprovals: Math.max(prev.pendingApprovals, pendingStudents),
        }));
      }
    };

    // Fetch when registrar is loaded and overview tab is active
    if (registrar && tab === 'overview') {
      fetchDashboardOverview();
    }
  }, [registrar, tab]);

  // Update summary on local data changes (fallback for when API is unavailable)
  useEffect(() => {
    const totalDepartments = departments.length;
    const placedStudents = studentRecords.filter((student) => /placed|approved/i.test(student.status)).length;
    const pendingStudents = studentRecords.filter((student) => /pending|review/i.test(student.status)).length;

    setSummary((prev) => ({
      departments: totalDepartments,
      activeStudents: studentRecords.length,
      placementsCompleted: placedStudents,
      pendingApprovals: Math.max(prev.pendingApprovals, pendingStudents),
    }));
  }, [departments, studentRecords]);

  const departmentPreferenceCounts = studentRecords.reduce((accumulator, student) => {
    (student.choices || []).forEach((choice) => {
      const departmentName = String(choice.department || '').trim();
      if (!departmentName) return;
      accumulator[departmentName] = (accumulator[departmentName] || 0) + 1;
    });
    return accumulator;
  }, {});

  const choiceMatrixRows = studentRecords
    .map((student) => {
      const prioritySlots = Array.from({ length: 5 }, (_, index) => {
        const preferredChoice = (student.choices || []).find((choice) => Number(choice.priority || 0) === index + 1);
        return preferredChoice?.department || '—';
      });

      return {
        ...student,
        prioritySlots,
      };
    })
    .filter((student) => {
      const term = choiceMatrixSearch.trim().toLowerCase();
      if (!term) return true;

      const searchableText = [
        student.name,
        student.email,
        student.department,
        student.status,
        ...student.prioritySlots,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(term);
    });

  const filteredStudents = studentRecords.filter((student) => {
    const searchTerm = studentSearch.trim().toLowerCase();
    if (!searchTerm) return true;

    const searchableText = [
      student.name,
      student.email,
      student.department,
      student.status,
      student.id,
      student.gender,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchTerm);
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const latestPlacementRun = pendingResults[0] || null;

  const streamOptions = ['Natural Science', 'Social Science'];

  const matchesSelectedStream = (department) => {
    if (selectedStream === 'all') return true;

    const streamName = String(getDepartmentStream(department) || '').toLowerCase();
    const collegeName = String(department?.college || '').toLowerCase();

    if (selectedStream === 'Natural Science') {
      return (
        streamName === 'natural science' ||
        streamName.includes('natural') ||
        collegeName.includes('natural') ||
        collegeName.includes('environment')
      );
    }

    if (selectedStream === 'Social Science') {
      return (
        streamName === 'humanities' ||
        streamName === 'social science' ||
        streamName.includes('social') ||
        streamName.includes('human') ||
        collegeName.includes('social') ||
        collegeName.includes('human') ||
        collegeName.includes('business') ||
        collegeName.includes('economics') ||
        collegeName.includes('law') ||
        collegeName.includes('education')
      );
    }

    return true;
  };

  const placementCollegeOptions = Array.from(
    new Set(
      departments
        .filter((dept) => matchesSelectedStream(dept))
        .map((dept) => dept.college)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const placementCandidates = studentRecords.filter((student) => {
    if (hasPlacementResult(student)) {
      return false;
    }

    const studentChoices = Array.isArray(student.choices) ? student.choices : [];
    const departmentMatch = departments.some((dept) => {
      const matchesStream = matchesSelectedStream(dept);
      const matchesCollege = placementCollege === 'all' || String(dept.college || '').toLowerCase() === String(placementCollege).toLowerCase();
      const hasPreference = studentChoices.some((choice) => {
        const choiceDepartment = String(choice.department || '').toLowerCase().trim();
        const matchesChoiceName = choiceDepartment === String(dept.name || '').toLowerCase().trim();
        const matchesChoiceId = choiceDepartment === String(dept.id || '').toLowerCase().trim();
        return matchesChoiceName || matchesChoiceId;
      });

      return hasPreference && matchesStream && matchesCollege;
    });

    if (!departmentMatch) {
      return false;
    }

    return true;
  });
  useEffect(() => {
    setPlacementCollege('all');
  }, [selectedStream]);

  useEffect(() => {
    if (!studentRecords.length) {
      setSelectedStudentIds([]);
      return;
    }

    setSelectedStudentIds((prev) => prev.filter((id) => studentRecords.some((student) => String(student.id) === String(id))));
  }, [studentRecords]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [studentRecords.length, studentSearch]);

  if (!registrar) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="admin-dashboard container-fluid px-0">
      <div className="row g-0">
        <aside className="col-md-2 sidebar bg-dark text-white d-flex flex-column p-4">
          <div className="sidebar-brand mb-5">
            <h4 className="fw-bold text-white mb-1">Registrar Portal</h4>
            <p className="text-white-50 small mb-0">Review placements, departments, and approvals.</p>
          </div>

          <nav className="nav flex-column gap-2 mb-4">
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'overview' ? 'active' : ''}`}
              onClick={() => setTab('overview')}
            >
              Overview
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'student-info' ? 'active' : ''}`}
              onClick={() => setTab('student-info')}
            >
              Student Information
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'choice-matrix' ? 'active' : ''}`}
              onClick={() => setTab('choice-matrix')}
            >
              Student Choice Matrix
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'capacity' ? 'active' : ''}`}
              onClick={() => setTab('capacity')}
            >
              Department Capacity
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'placement-rules' ? 'active' : ''}`}
              onClick={() => setTab('placement-rules')}
            >
              Placement Rules
            </button>
            {/* <button
              className={`btn dashboard-nav-btn text-start ${tab === 'placements' ? 'active' : ''}`}
              onClick={() => setTab('placements')}
            >
              Placements
            </button> */}
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'run-placement' ? 'active' : ''}`}
              onClick={() => setTab('run-placement')}
            >
              Run Placement
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'approve-results' ? 'active' : ''}`}
              onClick={() => setTab('approve-results')}
            >
              Approve & Publish Results
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'appeals' ? 'active' : ''}`}
              onClick={() => setTab('appeals')}
            >
              Handle Appeals
            </button>
            <button
              className={`btn dashboard-nav-btn text-start ${tab === 'reports' ? 'active' : ''}`}
              onClick={() => setTab('reports')}
            >
              Reports
            </button>
          </nav>
        </aside>

        <main className="col-md-10 p-5 main-content">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h2 className="fw-bold mb-1">Welcome back, {registrar.username}</h2>
              <p className="text-muted mb-0">Debre Tabor University registrar workflow: department review, placement approval, and publishing decisions.</p>
            </div>
            <span className="badge bg-primary text-white py-2 px-3">Registrar</span>
          </div>

          {tab === 'overview' ? (
            <>
              <div className="row g-4 mb-4">
                <div className="col-lg-3 col-md-6">
                  <div 
                    className="card summary-card shadow-sm" 
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
                    onClick={() => handleCardClick('departments')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Departments</span>
                      <h3 className="summary-value">{summary.departments}</h3>
                      <small className="text-muted">DTU academic departments</small>
                      <div className="mt-2"><small className="text-primary fw-bold">Click to view details →</small></div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div 
                    className="card summary-card shadow-sm" 
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
                    onClick={() => handleCardClick('activeStudents')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Active Students</span>
                      <h3 className="summary-value">{summary.activeStudents}</h3>
                      <small className="text-muted">Verified for this cycle</small>
                      <div className="mt-2"><small className="text-success fw-bold">Click to view details →</small></div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div 
                    className="card summary-card shadow-sm" 
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
                    onClick={() => handleCardClick('placementsCompleted')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Placements Completed</span>
                      <h3 className="summary-value">{summary.placementsCompleted}</h3>
                      <small className="text-muted">Department assignments finalized</small>
                      <div className="mt-2"><small className="text-warning fw-bold">Click to view details →</small></div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div 
                    className="card summary-card shadow-sm" 
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
                    onClick={() => handleCardClick('pendingApprovals')}
                  >
                    <div className="card-body">
                      <span className="summary-label">Pending Approvals</span>
                      <h3 className="summary-value">{summary.pendingApprovals}</h3>
                      <small className="text-muted">Awaiting registrar approval</small>
                      <div className="mt-2"><small className="text-danger fw-bold">Click to view details →</small></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">DTU Registrar Workflow</h5>
                      <p className="text-muted">The registrar office verifies departmental capacity, checks applicant records, and approves the final placement batch before publishing outcomes to students.</p>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item">Review department capacity and college seat allocation.</li>
                        <li className="list-group-item">Validate student data for placement batch {placementBatch}.</li>
                        <li className="list-group-item">Approve final placement results and publish outcomes.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">Quick actions</h5>
                      <div className="d-grid gap-2">
                        <button className="btn btn-outline-primary" onClick={() => setTab('student-info')}>
                          Student Information
                        </button>
                        <button className="btn btn-outline-primary" onClick={() => setTab('capacity')}>
                          Review Department Capacity
                        </button>
                        <button className="btn btn-outline-primary" onClick={() => setTab('placements')}>
                          Review Placement Requests
                        </button>
                        <button className="btn btn-outline-primary" onClick={() => setTab('reports')}>
                          Open Placements Report
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
                    maxWidth: '800px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    padding: '30px'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="fw-bold mb-0">
                        {cardDetailModal === 'departments' && 'All Departments'}
                        {cardDetailModal === 'activeStudents' && 'Active Students'}
                        {cardDetailModal === 'placementsCompleted' && 'Placed Students'}
                        {cardDetailModal === 'pendingApprovals' && 'Pending Approvals'}
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
                              {cardDetailModal === 'departments' && (
                                <>
                                  <th>Department</th>
                                  <th>Capacity</th>
                                  <th>College</th>
                                  <th>Stream</th>
                                </>
                              )}
                              {cardDetailModal === 'activeStudents' && (
                                <>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>GPA</th>
                                  <th>Stream</th>
                                  <th>Status</th>
                                </>
                              )}
                              {cardDetailModal === 'placementsCompleted' && (
                                <>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Department</th>
                                  <th>Score</th>
                                  <th>Status</th>
                                </>
                              )}
                              {cardDetailModal === 'pendingApprovals' && (
                                <>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Score</th>
                                  <th>Status</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {cardDetailData.map((item, idx) => (
                              <tr key={idx}>
                                {cardDetailModal === 'departments' && (
                                  <>
                                    <td>{item.name}</td>
                                    <td>{item.capacity}</td>
                                    <td>{item.college}</td>
                                    <td>{item.stream}</td>
                                  </>
                                )}
                                {cardDetailModal === 'activeStudents' && (
                                  <>
                                    <td><strong>{item.name}</strong></td>
                                    <td>{item.email}</td>
                                    <td>{item.gpa?.toFixed(2) || 'N/A'}</td>
                                    <td>{item.stream || 'N/A'}</td>
                                    <td><span className="badge bg-success">{item.status}</span></td>
                                  </>
                                )}
                                {cardDetailModal === 'placementsCompleted' && (
                                  <>
                                    <td><strong>{item.name}</strong></td>
                                    <td>{item.email}</td>
                                    <td>{item.department}</td>
                                    <td>{item.cumulativeScore?.toFixed(2) || 'N/A'}</td>
                                    <td><span className="badge bg-success">{item.status}</span></td>
                                  </>
                                )}
                                {cardDetailModal === 'pendingApprovals' && (
                                  <>
                                    <td><strong>{item.name}</strong></td>
                                    <td>{item.email}</td>
                                    <td>{item.cumulativeScore?.toFixed(2) || 'N/A'}</td>
                                    <td><span className="badge bg-warning text-dark">{item.status}</span></td>
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
            </>
          ) : tab === 'student-info' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h4 className="card-title mb-0">Student Information</h4>
                  <div className="d-flex gap-2 flex-wrap">
                    {/* <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => window.location.reload()}
                      title="Reload student records from the database"
                    >
                      Refresh data
                    </button> */}
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={() => setTab('choice-matrix')}
                    >
                      📊 Student Choice Matrix
                    </button>
                    {/* <button 
                      className="btn btn-outline-success btn-sm" 
                      onClick={() => setShowBulkUpload(true)}
                      title="Upload multiple students from CSV or Excel"
                    >
                      📤 Bulk Upload
                    </button> */}
                    <button className="btn btn-primary btn-sm register-new-student-btn" onClick={() => setTab('student-registration')}>
                      ➕ Register New Student
                    </button>
                  </div>
                </div>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mb-3">
                  <div className="text-muted">
                    Showing {filteredStudents.length} student record{filteredStudents.length === 1 ? '' : 's'} for placement batch {placementBatch}.
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search student name, email, ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      style={{ minWidth: 260 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentPage(1)}
                    >
                      Search
                    </button>
                  </div>
                </div>

                {studentInfoLoading ? (
                  <div className="text-muted">Loading student records from the database...</div>
                ) : studentRecords.length === 0 ? (
                  <div className="alert alert-info mb-0">
                    No student profile records are available in the database yet.
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="alert alert-warning mb-0">
                    No students match your search. Try another name, email, ID, or department.
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th title="Cumulative GPA">GPA</th>
                            <th title="Grade 12 / Secondary School Score">G12 Result</th>
                            <th title="Certificate of Competence">COC</th>
                            <th>Gender</th>
                            <th>Disability</th>
                            <th>Minority</th>
                            <th title="Computed from GPA, G12, and other factors">Cumulative Score</th>
                            <th>Department</th>
                            <th>Action</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStudents.map((student) => {
                            const disabilityFlag = parseYesNo(student.hasDisability ?? student.disability ?? student.specialSupport);
                            const minorityFlag = parseYesNo(student.minority ?? student.isMinority ?? student.minorityStatus);

                            return (
                            <tr key={`${student.id}-${student.email || student.name}`}>
                              {/* Student ID */}
                              <td className="fw-bold text-primary">{student.id}</td>

                              {/* Student Name */}
                              <td>
                                <div className="fw-semibold">{student.name}</div>
                                <small className="text-muted">{student.email}</small>
                              </td>

                              {/* CGPA / GPA */}
                              <td className="text-center">
                                <span className="badge bg-primary-subtle text-primary px-3 py-2">
                                  {student.cgpa}
                                </span>
                              </td>

                              {/* Grade 12 Result (grade_12_result column) */}
                              <td className="text-center" title="Grade 12 / Secondary School Score">
                                {student.g12 !== null && student.g12 !== undefined && student.g12 !== 'N/A' ? (
                                  <span className="badge bg-info-subtle text-info px-3 py-2">
                                    {typeof student.g12 === 'number' ? student.g12.toFixed(2) : student.g12}
                                  </span>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>

                              {/* Certificate of Competence (coc_result column) - Display numeric score */}
                              <td className="text-center" title="Certificate of Competence Score">
                                {student.coc !== null && student.coc !== undefined && student.coc !== 'N/A' ? (
                                  <span className="badge bg-success-subtle text-success px-3 py-2">
                                    {typeof student.coc === 'number' ? student.coc.toFixed(2) : student.coc}
                                  </span>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>

                              {/* Gender */}
                              <td className="text-center">
                                {student.gender && student.gender !== 'N/A' ? (
                                  <span className={`badge ${student.gender?.toLowerCase() === 'female' ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'}`}>
                                    {student.gender}
                                  </span>
                                ) : (
                                  <span className="text-muted">N/A</span>
                                )}
                              </td>

                              {/* Disability Status */}
                              <td className="text-center">
                                {disabilityFlag ? (
                                  <span className="badge bg-danger text-white px-3 py-2">Yes</span>
                                ) : (
                                  <span className="badge bg-secondary text-white px-3 py-2">No</span>
                                )}
                              </td>

                              {/* Minority Status */}
                              <td className="text-center">
                                {minorityFlag ? (
                                  <span className="badge bg-info text-white px-3 py-2">Yes</span>
                                ) : (
                                  <span className="badge bg-secondary text-white px-3 py-2">No</span>
                                )}
                              </td>

                              {/* Cumulative Score (from cumulative_avg column) */}
                              <td className="text-center">
                                <span className="badge bg-warning-subtle text-warning px-3 py-2 fw-bold">
                                  {typeof student.cumulativeScore === 'number' ? student.cumulativeScore.toFixed(2) : student.cumulativeScore}
                                </span>
                              </td>

                              {/* Department Assignment */}
                              <td>
                                <div className="small">{student.department}</div>
                              </td>

                              <td className="text-center">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${needsAcademicScores(student) ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                                  onClick={() => {
                                    const studentId = student.id ?? student.user_id ?? student.email;
                                    navigate(`/student-score-form/${encodeURIComponent(studentId)}`, {
                                      state: { student },
                                    });
                                  }}
                                >
                                  {needsAcademicScores(student) ? 'Fill Scores' : 'Update'}
                                </button>
                              </td>

                              {/* Placement Status */}
                              <td className="text-center">
                                <span className={`badge px-3 py-2 ${
                                  student.status === 'Placed' || student.status === 'Approved' 
                                    ? 'bg-success text-white' 
                                    : student.status === 'Pending' 
                                      ? 'bg-warning text-dark' 
                                      : 'bg-secondary text-white'
                                }`}>
                                  {student.status}
                                </span>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {missingScoresStudent && (
                      <div className="mt-4">
                        <MissingScoresForm
                          student={missingScoresStudent}
                          onClose={() => setMissingScoresStudent(null)}
                          onSaved={() => {
                            setMissingScoresStudent(null);
                            const loadStudentInfo = async () => {
                              try {
                                setStudentInfoLoading(true);
                                const response = await api.get('student_data_api.php');
                                const students = Array.isArray(response.data) ? response.data : response.data?.students || [];
                                setStudentRecords(students);
                              } catch (error) {
                                console.error('Failed to refresh student records after score update:', error);
                              } finally {
                                setStudentInfoLoading(false);
                              }
                            };
                            loadStudentInfo();
                          }}
                        />
                      </div>
                    )}

                    {studentRecords.length > PAGE_SIZE && (
                      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                        <div className="text-muted small">
                          Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredStudents.length)}-{Math.min(currentPage * PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length}
                        </div>
                        <div className="btn-group" role="group" aria-label="Student pagination">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                          <button type="button" className="btn btn-sm btn-light" disabled>
                            Page {currentPage} of {totalPages}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : tab === 'choice-matrix' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h4 className="card-title mb-1">Student Choice Matrix</h4>
                    <p className="text-muted mb-0">View each student’s ranked department selections for registrar review.</p>
                  </div>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setTab('student-info')}>
                    Back 
                  </button>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-7">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by student name, email, department, or ranking..."
                      value={choiceMatrixSearch}
                      onChange={(e) => setChoiceMatrixSearch(e.target.value)}
                    />
                  </div>
                  <div className="col-md-5">
                    <div className="alert alert-light border mb-0 py-2 px-3">
                      <strong>{Object.keys(departmentPreferenceCounts).length}</strong> departments with preference entries
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Email</th>
                        <th>Choice 1</th>
                        <th>Choice 2</th>
                        <th>Choice 3</th>
                        <th>Choice 4</th>
                        <th>Choice 5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {choiceMatrixRows.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No student choice data available yet.
                          </td>
                        </tr>
                      ) : (
                        choiceMatrixRows.map((student) => (
                          <tr key={`${student.id}-${student.email}`}>
                            <td>
                              <div className="fw-semibold">{student.name}</div>
                              <small className="text-muted">{student.status}</small>
                            </td>
                            <td>{student.email}</td>
                            {student.prioritySlots.map((department, index) => (
                              <td key={`${student.id}-priority-${index}`} className={department !== '—' ? 'fw-semibold' : 'text-muted'}>
                                {department}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : tab === 'student-registration' ? (
            <StudentRegistration onBack={() => setTab('student-info')} onSuccess={() => setTab('student-info')} />
          ) : tab === 'capacity' ? (
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                  <div>
                    <h4 className="fw-bold mb-1" style={{ color: '#123153' }}>
                      Department Capacity / Quota
                    </h4>
                    <p className="text-muted mb-0">
                      Review department seat limits for this cycle. This view is read-only for the registrar role.
                    </p>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label dtu-label">Stream</label>
                    <select
                      className="form-select dtu-form-control"
                      value={streamFilter}
                      onChange={(e) => setStreamFilter(e.target.value)}
                    >
                      <option value="all">All Streams</option>
                      {Array.from(
                        new Set(
                          departments.map((dept) => getDepartmentStream(dept))
                        )
                      )
                        .sort((a, b) => a.localeCompare(b))
                        .map((streamOption) => (
                          <option key={streamOption} value={streamOption}>{streamOption}</option>
                        ))}
                    </select>
                  </div>

                  <div className="col-md-8">
                    <label className="form-label dtu-label">Search Department</label>
                    <input
                      className="form-control dtu-form-control"
                      placeholder="Search by department name"
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive dtu-table-wrap">
                  <table className="table table-hover align-middle dtu-table">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th style={{ width: 180 }}>Stream</th>
                        <th style={{ width: 320 }}>College</th>
                        <th>Department Name</th>
                        <th style={{ width: 140 }}>Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(departments || [])
                        .filter((d) => {
                          const name = String(d.name || '').toLowerCase().trim();
                          const college = String(d.college || '').toLowerCase().trim();
                          const streamName = getDepartmentStream(d);
                          const currentStream = (streamFilter || 'all').toLowerCase().trim();

                          if (currentStream !== 'all' && streamName.toLowerCase().trim() !== currentStream) {
                            return false;
                          }

                          const query = (deptSearch || '').trim().toLowerCase();
                          if (query) {
                            const searchableText = `${name} ${college} ${streamName}`.toLowerCase();
                            if (!searchableText.includes(query)) {
                              return false;
                            }
                          }

                          return true;
                        })
                        .map((d, index) => {
                          const streamName = getDepartmentStream(d);
                          const collegeText = String(d.college || 'General')
                            .replace(/^\s*college\s+of\s+/i, '')
                            .replace(/^\s*College\s+of\s+/i, '')
                            .replace(/^\s*school\s+of\s+/i, '')
                            .replace(/^\s*School\s+of\s+/i, '')
                            .trim() || 'General';

                          return (
                            <tr key={d.id || `${d.name}-${index}`}>
                              <td>{index + 1}</td>
                              <td className="fw-semibold text-primary">{streamName}</td>
                              <td>{collegeText}</td>
                              <td className="fw-bold dtu-department-name">{d.name}</td>
                              <td>{Number(d.capacity || 0)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          ) : tab === 'placement-rules' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="card-title mb-3">Placement Rules & Criteria</h4>
                <p className="text-muted">Define algorithm criteria used for automated placements.</p>
                <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('placementRules', JSON.stringify(placementRules)); setRulesSaved(true); setTimeout(() => setRulesSaved(false), 2000); }}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label">GPA Weight (%)</label>
                      <input type="number" className="form-control" value={placementRules.gpaWeight} onChange={(e) => setPlacementRules(prev => ({...prev, gpaWeight: Number(e.target.value)}))} min={0} max={100} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Grade 12 Weight (%)</label>
                      <input type="number" className="form-control" value={placementRules.grade12Weight} onChange={(e) => setPlacementRules(prev => ({...prev, grade12Weight: Number(e.target.value)}))} min={0} max={100} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">COC Weight (%)</label>
                      <input type="number" className="form-control" value={placementRules.cocWeight} onChange={(e) => setPlacementRules(prev => ({...prev, cocWeight: Number(e.target.value)}))} min={0} max={100} />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Gender Weight (%)</label>
                      <input type="number" className="form-control" value={placementRules.genderWeight} onChange={(e) => setPlacementRules(prev => ({...prev, genderWeight: Number(e.target.value)}))} min={0} max={100} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Disability Weight (%)</label>
                      <input type="number" className="form-control" value={placementRules.disabilityWeight} onChange={(e) => setPlacementRules(prev => ({...prev, disabilityWeight: Number(e.target.value)}))} min={0} max={100} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Minority Weight (%)</label>
                      <input type="number" className="form-control" value={placementRules.minorityWeight} onChange={(e) => setPlacementRules(prev => ({...prev, minorityWeight: Number(e.target.value)}))} min={0} max={100} />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" type="submit">Save Rules</button>
                    <button className="btn btn-outline-secondary" type="button" onClick={() => { setPlacementRules({ gpaWeight: 40, grade12Weight: 20, cocWeight: 30, genderWeight: 3, disabilityWeight: 3, minorityWeight: 4 }); localStorage.removeItem('placementRules'); }}>Reset</button>
                    {rulesSaved && <span className="text-success align-self-center">Saved</span>}
                  </div>
                </form>
              </div>
            </div>
          ) : tab === 'placements' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="card-title mb-3">Placement Management</h4>
                <p className="text-muted mb-4">Track student placement progress and review the latest placement requests.</p>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Request</th>
                        <th>Student</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Internship approval</td>
                        <td>John Doe</td>
                        <td><span className="badge bg-warning text-dark">Pending</span></td>
                        <td>2 days ago</td>
                      </tr>
                      <tr>
                        <td>Department placement</td>
                        <td>Mary Johnson</td>
                        <td><span className="badge bg-success">Approved</span></td>
                        <td>5 days ago</td>
                      </tr>
                      <tr>
                        <td>Capacity review</td>
                        <td>Placement Office</td>
                        <td><span className="badge bg-secondary">In review</span></td>
                        <td>1 week ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : tab === 'run-placement' ? (
            <div className="card shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)' }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h4 className="card-title mb-1" style={{ color: '#123153' }}>Run Placement Process</h4>
                    <p className="text-muted mb-0">Choose the stream, narrow the college, and select the exact students to place.</p>
                  </div>
                  <span className="badge rounded-pill px-3 py-2" style={{ background: '#dfeeff', color: '#0d5cb8' }}>
                    Controlled selection
                  </span>
                </div>

                <div className="card border-0 shadow-sm mb-4" style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '18px' }}>
                  <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold" style={{ color: '#123153' }}>Stream</label>
                        <select
                          className="form-select form-select-lg"
                          value={selectedStream}
                          onChange={(e) => setSelectedStream(e.target.value)}
                          style={{ borderRadius: '12px' }}
                        >
                          <option value="all">All streams</option>
                          {streamOptions.map((stream) => (
                            <option key={stream} value={stream}>{stream}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold" style={{ color: '#123153' }}>College</label>
                        <select
                          className="form-select form-select-lg"
                          value={placementCollege}
                          onChange={(e) => setPlacementCollege(e.target.value)}
                          style={{ borderRadius: '12px' }}
                          disabled={selectedStream === 'all' && placementCollegeOptions.length === 0}
                        >
                          <option value="all">All colleges</option>
                          {placementCollegeOptions.map((college) => (
                            <option key={college} value={college}>{college}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-4 d-flex align-items-end">
                        <div className="alert alert-info mb-0 w-100">
                          College-wide placement: students are matched to their saved choices using merit and department capacity.
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 flex-wrap mt-4">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          const visibleIds = placementCandidates.map((student) => String(student.id));
                          setSelectedStudentIds((prev) => {
                            const merged = new Set([...prev, ...visibleIds]);
                            return Array.from(merged);
                          });
                        }}
                      >
                        Select visible
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedStudentIds([])}
                      >
                        Clear selection
                      </button>
                    </div>

                    {!latestPlacementRun && (
                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold" style={{ color: '#123153' }}>Candidate students</span>
                        <span className="text-muted small">
                          {selectedStudentIds.length > 0
                            ? `${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? '' : 's'} selected`
                            : 'Select one or more students to process'}
                        </span>
                      </div>

                      <div className="border rounded bg-white" style={{ maxHeight: '280px', overflowY: 'auto', borderRadius: '16px' }}>
                        {placementCandidates.length === 0 ? (
                          <div className="p-3 text-muted">No students match the current stream, college, and department filters.</div>
                        ) : (
                          placementCandidates.map((student) => {
                            const checked = selectedStudentIds.includes(String(student.id));

                            return (
                              <label
                                key={`${student.id}-${student.email || student.name}`}
                                className="d-flex align-items-center justify-content-between gap-3 p-3 border-bottom"
                                style={{ cursor: 'pointer', background: checked ? '#f0f8ff' : '#fff' }}
                              >
                                <div className="d-flex align-items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedStudentIds((prev) => {
                                        const studentId = String(student.id);
                                        return prev.includes(studentId)
                                          ? prev.filter((id) => id !== studentId)
                                          : [...prev, studentId];
                                      });
                                    }}
                                    style={{ width: 18, height: 18, accentColor: '#0d5cb8' }}
                                  />
                                  <div>
                                    <div className="fw-semibold" style={{ color: '#123153' }}>{student.name}</div>
                                    <div className="small text-muted">{student.email} • {student.department}</div>
                                  </div>
                                </div>
                                <span className="badge rounded-pill px-2 py-2" style={{ background: '#edf3ff', color: '#123153' }}>{student.status}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      const studentsToPlace = filterStudentIdsForPlacement(placementCandidates, selectedStudentIds);

                      if (!studentsToPlace.length) {
                        setRunResult({ assigned: 0, unassigned: 0, error: 'Please select at least one student before running placement.' });
                        setPlacementError('No student selected.');
                        return;
                      }

                      setRunning(true);
                      setRunResult(null);
                      setPlacementError('');

                      try {
                        const studentCandidates = await Promise.all(
                          studentsToPlace.map(async (record) => {
                            try {
                              let preferences = Array.isArray(record.choices) ? record.choices : [];

                              if (preferences.length === 0) {
                                const preferenceResponse = await api.get(`student_preferences.php?student_id=${encodeURIComponent(record.id)}`);
                                const payload = preferenceResponse.data || {};
                                preferences = Array.isArray(payload.choices)
                                  ? payload.choices
                                  : Array.isArray(payload.data)
                                    ? payload.data
                                    : Array.isArray(payload)
                                      ? payload
                                      : [];
                              }

                              const formattedPreferences = preferences
                                .map((pref, index) => ({
                                  priority: Number(pref?.priority ?? pref?.rank ?? index + 1),
                                  department: pref?.department || pref?.name || pref?.dept_name || pref?.college || pref?.stream || '',
                                }))
                                .filter((pref) => pref.department)
                                .sort((a, b) => a.priority - b.priority);

                              if (formattedPreferences.length === 0) {
                                return null;
                              }

                              return {
                                id: record.id,
                                name: record.name,
                                email: record.email,
                                cgpa: Number(record.cgpa || 0),
                                grade12: Number(record.g12 === 'N/A' ? 0 : record.g12 || 0),
                                coc: Boolean(record.coc && record.coc !== 'N/A'),
                                gender: record.gender || '',
                                disability: parseYesNo(record.hasDisability),
                                minority: parseYesNo(record.minority),
                                specialSupport: parseYesNo(record.hasDisability || record.minority),
                                preferences: formattedPreferences,
                              };
                            } catch (error) {
                              return null;
                            }
                          })
                        );

                        const students = studentCandidates.filter(Boolean);

                        if (students.length === 0) {
                          setRunResult({ assigned: 0, unassigned: 0, error: 'No valid student placement preferences were found for the selected students.' });
                          setPlacementError('Please ensure selected students have saved their preferences before running placement.');
                          return;
                        }

                        const payload = {
                          students,
                          departments,
                          rules: placementRules,
                          selectedDepartment: 'all',
                          selectedCollege: placementCollege,
                          placementScope: 'college-wide',
                          selectedStudentIds: students.map((student) => student.id),
                        };
                        const response = await api.post('placement_engine.php', payload);
                        const result = response.data;

                        if (!result?.success) {
                          const message = String(result?.message || '').toLowerCase();
                          if (message.includes('already has a placement') || message.includes('already placed')) {
                            const alreadyPlaced = students.length;
                            setRunResult({ assigned: 0, unassigned: 0, alreadyPlaced, total: students.length });
                            setSelectedStudentIds((prev) => prev.filter((id) => !students.some((student) => String(student.id) === String(id))));
                            setPlacementError('The selected student already has a placement result and was removed from this run.');
                            return;
                          }
                          throw new Error(result?.message || 'Placement run failed.');
                        }

                        const summary = result.summary || {};
                        const assigned = Number(summary.assignedStudents || 0);
                        const unassigned = Number(summary.unassignedStudents || 0);
                        const alreadyPlaced = Number(summary.alreadyPlacedStudents || result.already_placed || 0);
                        const outcome = { assigned, unassigned, alreadyPlaced, total: students.length };

                        setRunResult(outcome);
                        setPlacementBatch((prev) => prev || 'DTU-2026/1');
                        localStorage.setItem('dtuPlacementBatch', placementBatch || 'DTU-2026/1');
                        setPendingResults((prev) => [{ id: Date.now(), summary: outcome, placements: result.placements || [], createdAt: new Date().toISOString() }, ...prev]);
                        setSummary((prev) => ({ ...prev, placementsCompleted: prev.placementsCompleted + assigned, pendingApprovals: prev.pendingApprovals + 1 }));

                        if (Array.isArray(result.placements)) {
                          localStorage.setItem('studentPlacementSummary', JSON.stringify({
                            studentId: registrar?.id || 'registrar-run',
                            batch: placementBatch || 'DTU-2026/1',
                            date: new Date().toISOString(),
                            placementRuns: result.placements,
                            status: 'run-complete',
                          }));
                        }
                      } catch (error) {
                        console.error(error);
                        const backendMessage = error?.response?.data?.message;
                        const normalizedBackendMessage = String(backendMessage || '').toLowerCase();
                        if (normalizedBackendMessage.includes('already has a placement') || normalizedBackendMessage.includes('already placed')) {
                          const alreadyPlaced = studentsToPlace.length;
                          setRunResult({ assigned: 0, unassigned: 0, alreadyPlaced, total: studentsToPlace.length });
                          setSelectedStudentIds((prev) => prev.filter((id) => !studentsToPlace.some((student) => String(student.id) === String(id))));
                          setPlacementError('The selected student already has a placement result and was removed from this run.');
                          return;
                        }
                        setRunResult({
                          assigned: 0,
                          unassigned: 0,
                          error: backendMessage || error?.message || 'Unable to run placement engine.',
                        });
                      } finally {
                        setRunning(false);
                      }
                    }}
                    disabled={running || studentRecords.length === 0}
                  >
                    {running
                      ? 'Running...'
                      : selectedStudentIds.length === 1
                        ? 'Run Selected Student'
                        : 'Run Placement'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => { setPendingResults([]); setRunResult(null); setPlacementError(''); }}>Clear</button>
                </div>
                {runResult && (
                  <div className="mt-3">
                    {placementError && <div className="alert alert-warning py-2">{placementError}</div>}
                    <div>Assigned: <strong>{runResult.assigned}</strong></div>
                    <div>Unassigned: <strong>{runResult.unassigned}</strong></div>
                    {runResult.alreadyPlaced > 0 && (
                      <div>Already placed: <strong>{runResult.alreadyPlaced}</strong> (no duplicate rows created)</div>
                    )}
                    {runResult.error && <div className="text-danger">{runResult.error}</div>}

                    {latestPlacementRun?.placements?.length > 0 && (
                      <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                          <div>
                            <h5 className="mb-1" style={{ color: '#123153' }}>Latest Placement Assignments</h5>
                            <p className="text-muted small mb-0">
                              Students assigned by the latest placement run. Results remain pending approval.
                            </p>
                          </div>
                          <span className="badge bg-primary-subtle text-primary px-3 py-2">
                            {latestPlacementRun.placements.filter((placement) => placement.status === 'placed').length} assigned
                          </span>
                        </div>

                        <div className="table-responsive border rounded">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Merit Score</th>
                                <th>Department</th>
                                <th>College</th>
                                <th>Stream</th>
                                <th>Choice Rank</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {latestPlacementRun.placements.map((placement) => {
                                const assigned = placement.status === 'placed';

                                return (
                                  <tr key={`${placement.studentId}-${placement.department || 'unassigned'}`}>
                                    <td className="fw-semibold text-primary">{placement.studentId}</td>
                                    <td>{placement.studentName || '—'}</td>
                                    <td>{placement.score !== null && placement.score !== undefined ? Number(placement.score).toFixed(2) : '—'}</td>
                                    <td>{placement.department || '—'}</td>
                                    <td>{placement.college || '—'}</td>
                                    <td>{placement.stream || '—'}</td>
                                    <td className="text-center">{placement.choiceRank || '—'}</td>
                                    <td>
                                      <span className={`badge ${assigned ? 'bg-success' : 'bg-secondary'}`}>
                                        {assigned ? 'Assigned' : 'Unassigned'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'approve-results' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h4 className="card-title mb-1">Approve &amp; Publish Results</h4>
                    <p className="text-muted mb-0">Review pending placement results before publishing them to students.</p>
                  </div>
                  <button
                    className="btn btn-success"
                    type="button"
                    disabled={publishingResults || pendingApprovalLoading || pendingApprovalRows.length === 0}
                    onClick={async () => {
                      setPublishingResults(true);
                      setPlacementError('');

                      try {
                        const response = await api.post('publish_all_results.php');
                        const payload = response.data || {};

                        if (!payload.success) {
                          throw new Error(payload.message || 'Unable to publish placement results.');
                        }

                        setPendingApprovalRows([]);
                        setSummary((prev) => ({
                          ...prev,
                          pendingApprovals: Math.max(0, prev.pendingApprovals - Number(payload.updated || 0)),
                        }));
                      } catch (error) {
                        setPlacementError(error?.response?.data?.message || error?.message || 'Unable to publish placement results.');
                      } finally {
                        setPublishingResults(false);
                      }
                    }}
                  >
                    {publishingResults ? 'Publishing...' : `Approve & Publish (${pendingApprovalRows.length})`}
                  </button>
                </div>

                {placementError && <div className="alert alert-danger py-2">{placementError}</div>}
                {pendingApprovalLoading ? (
                  <div className="text-muted">Loading pending results...</div>
                ) : pendingApprovalRows.length === 0 ? (
                  <div className="text-muted">No pending results to approve.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Student ID</th>
                          <th>Department</th>
                          <th>Final Score</th>
                          <th>Choice Rank</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingApprovalRows.map((result) => (
                          <tr key={`${result.student_id}-${result.dept_name}`}>
                            <td>{result.student_id}</td>
                            <td>{result.dept_name}</td>
                            <td>{Number(result.final_score).toFixed(2)}</td>
                            <td>{result.choice_rank}</td>
                            <td><span className="badge bg-warning text-dark">{result.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'appeals' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="card-title mb-3">Handle Appeals</h4>
                <p className="text-muted mb-3">Review and resolve student appeals for placement results.</p>
                {placementError && <div className="alert alert-danger py-2">{placementError}</div>}
                {appeals.length === 0 ? (
                  <div className="text-muted">No appeals at this time.</div>
                ) : (
                  <div className="d-grid gap-3">
                    {appeals.map((appeal) => (
                      <div key={appeal.id} className="border rounded-3 p-3">
                        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
                          <div>
                            <div className="fw-bold">{appeal.username || `Student #${appeal.student_id}`}</div>
                            <div className="small text-muted">{appeal.email}</div>
                          </div>
                          <small className="text-muted">{appeal.created_at}</small>
                        </div>
                        <h6 className="fw-bold mb-2">{appeal.subject}</h6>
                        <p className="mb-3">{appeal.message}</p>
                        <div className="row g-2 align-items-end">
                          <div className="col-md-3">
                            <label className="form-label small fw-semibold" htmlFor={`appeal-status-${appeal.id}`}>Status</label>
                            <select
                              id={`appeal-status-${appeal.id}`}
                              className="form-select form-select-sm"
                              value={appeal.status}
                              onChange={(event) => setAppeals((current) => current.map((item) => item.id === appeal.id ? { ...item, status: event.target.value } : item))}
                            >
                              <option>Received</option>
                              <option>Under Review</option>
                              <option>Resolved</option>
                            </select>
                          </div>
                          <div className="col-md-7">
                            <label className="form-label small fw-semibold" htmlFor={`appeal-response-${appeal.id}`}>Registrar response</label>
                            <textarea
                              id={`appeal-response-${appeal.id}`}
                              className="form-control form-control-sm"
                              rows="2"
                              value={appeal.response || ''}
                              onChange={(event) => setAppeals((current) => current.map((item) => item.id === appeal.id ? { ...item, response: event.target.value } : item))}
                              placeholder="Write a response to the student"
                            />
                          </div>
                          <div className="col-md-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm w-100"
                              onClick={() => updateAppeal(appeal)}
                              disabled={appealSavingId === appeal.id}
                            >
                              {appealSavingId === appeal.id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="card-title mb-3">Registrar Reports</h4>
                <p className="text-muted mb-4">Generate and review reports that highlight placement trends, department utilization, and student assignment history.</p>
                {reportStatsLoading && <div className="text-muted mb-3">Loading report statistics...</div>}
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="card summary-card">
                      <div className="card-body">
                        <span className="summary-label">Utilization</span>
                        <h3 className="summary-value">{reportStats ? `${reportStats.utilization}%` : '—'}</h3>
                        <p className="text-muted small mb-0">{reportStats ? `${reportStats.usedSeats} of ${reportStats.totalCapacity} seats used.` : 'No data available.'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card summary-card">
                      <div className="card-body">
                        <span className="summary-label">Average Approval</span>
                        <h3 className="summary-value">{reportStats?.averageApprovalHours !== null && reportStats?.averageApprovalHours !== undefined ? `${reportStats.averageApprovalHours} hrs` : '—'}</h3>
                        <p className="text-muted small mb-0">Based on approved placement results.</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card summary-card">
                      <div className="card-body">
                        <span className="summary-label">Monthly Requests</span>
                        <h3 className="summary-value">{reportStats ? reportStats.monthlyRequests : '—'}</h3>
                        <p className="text-muted small mb-0">Appeals submitted this month.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <BulkUploadModal 
        isOpen={showBulkUpload} 
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => {
          setShowBulkUpload(false);
          setStudentInfoLoading(true);
          // Refresh student records
          if (registrar) {
            const fetchStudentRecords = async () => {
              try {
                const usersResponse = await api.get('users_api.php');
                const usersPayload = Array.isArray(usersResponse.data)
                  ? usersResponse.data
                  : Array.isArray(usersResponse.data?.users)
                    ? usersResponse.data.users
                    : Array.isArray(usersResponse.data?.data)
                      ? usersResponse.data.data
                      : [];

                const studentUsers = usersPayload.filter((user) => {
                  const role = String(user?.role || '').trim().toLowerCase();
                  return role === 'student';
                });

                const records = await Promise.all(
                  studentUsers.map(async (user) => {
                    const email = user?.email || '';
                    let profile = {};

                    if (email) {
                      try {
                        const profileResponse = await api.get(`student_profile.php?email=${encodeURIComponent(email)}`);
                        profile = profileResponse.data?.student || profileResponse.data?.data || {};
                      } catch (error) {
                        profile = {};
                      }
                    }

                    const cgpaValue = Number(profile.cgpa ?? profile.gpa ?? user.cgpa ?? 0);
                    const numericCgpa = Number.isFinite(cgpaValue) ? cgpaValue : 0;

                    const g12 = profile?.grade_12_result ?? profile?.g12 ?? profile?.g12_score ?? null;
                    const coc = profile?.coc_result ?? profile?.coc ?? profile?.certificateOfCompetence ?? null;
                    // Ensure COC is a number if it exists
                    const cocValue = coc ? Number(coc) : null;
                    const gender = (profile?.gender || user?.gender || '').toString();
                    const hasDisability = parseYesNo(profile?.disability ?? profile?.has_disability ?? profile?.hasDisability ?? profile?.specialSupport);
                    const minority = parseYesNo(profile?.minority ?? profile?.is_minority ?? profile?.isMinority);

                    const cgpaNorm = (numericCgpa > 10) ? Math.min(100, numericCgpa) / 100 : Math.min(4, Math.max(0, numericCgpa)) / 4;
                    const grade12Raw = Number(g12 ?? 0);
                    const grade12Norm = grade12Raw > 10 ? Math.min(100, grade12Raw) / 100 : Math.min(4, Math.max(0, grade12Raw)) / 4;

                    const gpaWeight = Number(placementRules?.gpaWeight ?? 40);
                    const grade12Weight = Number(placementRules?.grade12Weight ?? 20);
                    const cocWeight = Number(placementRules?.cocWeight ?? 30);
                    const genderWeight = Number(placementRules?.genderWeight ?? 3);
                    const disabilityWeight = Number(placementRules?.disabilityWeight ?? 3);
                    const minorityWeight = Number(placementRules?.minorityWeight ?? 4);

                    let cumulative = (cgpaNorm * gpaWeight) + (grade12Norm * grade12Weight);
                    if (coc) cumulative += cocWeight;
                    if (hasDisability) cumulative += disabilityWeight;
                    if (minority) cumulative += minorityWeight;
                    if (String(gender).toLowerCase() === 'female') cumulative += genderWeight;

                    cumulative = Math.round((cumulative + (profile?.bonusPoints || 0)) * 100) / 100;

                    return {
                      id: user?.id ?? user?.student_id ?? profile?.studentId ?? profile?.id ?? null,
                      name: profile?.fullname || profile?.full_name || profile?.name || user?.username || '',
                      email: profile?.email || user?.email || '',
                      phone: profile?.phone || profile?.phoneNumber || profile?.contact || profile?.mobile || '',
                      cgpa: numericCgpa.toFixed(2),
                      g12: g12 ?? 'N/A',
                      coc: cocValue,
                      gender,
                      hasDisability: hasDisability,
                      minority: minority,
                      cumulativeScore: cumulative,
                      department: profile?.placement_result_department || profile?.department || profile?.program || profile?.stream || profile?.major || user?.department || '',
                      status: profile?.placement_result_department
                        ? (profile?.placement_result_status === 'Approved' ? 'Approved' : 'Placed')
                        : (profile?.placementStatus || profile?.status || profile?.placement_status || 'Pending'),
                      placementResult: profile?.placement_result_department || profile?.placement_result || profile?.placementResult || profile?.placement || profile?.result || null,
                    };
                  })
                );

                setStudentRecords(records.filter((record) => record.id !== null && record.name.trim()));
              } catch (error) {
                console.error('Failed to fetch student records:', error);
              } finally {
                setStudentInfoLoading(false);
              }
            };

            fetchStudentRecords();
          }
        }}
        departments={departments} 
      />
    </div>
  );
};

export default RegistrarDashboard;
