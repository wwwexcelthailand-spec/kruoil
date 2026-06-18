import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import TeacherLogin from './components/TeacherLogin';
import TeacherDashboard from './components/TeacherDashboard';
import ParentPortal from './components/ParentPortal';
import { supabaseService, isSupabaseConfigured } from './services/supabaseService';
import { 
  INITIAL_SCHOOL_INFO, 
  INITIAL_STUDENTS, 
  INITIAL_ACKNOWLEDGEMENTS,
  INITIAL_SUBJECTS,
  DEFAULT_TEACHER_PIN_HASH,
  hashPin
} from './mockData';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function App() {
  // --- Navigation State ---
  // 'landing' | 'teacher-login' | 'teacher' | 'parent'
  const [page, setPage] = useState('landing');

  // --- Teacher Session ---
  const [teacherSessionExpiry, setTeacherSessionExpiry] = useState(null);

  // --- Database Loading States ---
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // --- Data States ---
  const [students, setStudents] = useState(() => {
    // If Supabase is not configured, fall back to localStorage
    if (!isSupabaseConfigured()) {
      const saved = localStorage.getItem('pts_students');
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    }
    return INITIAL_STUDENTS;
  });

  const [schoolInfo, setSchoolInfo] = useState(() => {
    if (!isSupabaseConfigured()) {
      const saved = localStorage.getItem('pts_schoolInfo');
      return saved ? JSON.parse(saved) : INITIAL_SCHOOL_INFO;
    }
    return INITIAL_SCHOOL_INFO;
  });

  const [acknowledgements, setAcknowledgements] = useState(() => {
    if (!isSupabaseConfigured()) {
      const saved = localStorage.getItem('pts_acknowledgements');
      return saved ? JSON.parse(saved) : INITIAL_ACKNOWLEDGEMENTS;
    }
    return INITIAL_ACKNOWLEDGEMENTS;
  });

  const [subjects, setSubjects] = useState(() => {
    if (!isSupabaseConfigured()) {
      const saved = localStorage.getItem('pts_subjects');
      return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
    }
    return INITIAL_SUBJECTS;
  });

  const [teacherPinHash, setTeacherPinHash] = useState(() => {
    const saved = localStorage.getItem('pts_teacher_pin');
    return saved || DEFAULT_TEACHER_PIN_HASH;
  });

  // --- Load Initial Data from Supabase ---
  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await supabaseService.fetchInitialData();
        if (data) {
          if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
          if (data.subjects && data.subjects.length > 0) setSubjects(data.subjects);
          if (data.students) setStudents(data.students);
          if (data.acknowledgements) setAcknowledgements(data.acknowledgements);
        }
      } catch (err) {
        console.error("Error loading data from Supabase:", err);
        setErrorMsg('ไม่สามารถเชื่อมต่อฐานข้อมูลได้สำเร็จ กรุณาตรวจสอบการตั้งค่าไฟล์ .env');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- Fallback Persist to localStorage (Only when Supabase is not configured) ---
  useEffect(() => {
    if (isSupabaseConfigured()) return;
    localStorage.setItem('pts_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    localStorage.setItem('pts_schoolInfo', JSON.stringify(schoolInfo));
  }, [schoolInfo]);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    localStorage.setItem('pts_acknowledgements', JSON.stringify(acknowledgements));
  }, [acknowledgements]);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    localStorage.setItem('pts_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('pts_teacher_pin', teacherPinHash);
  }, [teacherPinHash]);

  // --- Teacher Session Timeout ---
  const resetSessionTimer = useCallback(() => {
    setTeacherSessionExpiry(Date.now() + SESSION_TIMEOUT);
  }, []);

  useEffect(() => {
    if (page !== 'teacher' || !teacherSessionExpiry) return;

    const checkTimeout = setInterval(() => {
      if (Date.now() > teacherSessionExpiry) {
        setPage('landing');
        setTeacherSessionExpiry(null);
        alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkTimeout);
  }, [page, teacherSessionExpiry]);

  // Reset timer on user activity (mouse/keyboard)
  useEffect(() => {
    if (page !== 'teacher') return;

    const handleActivity = () => resetSessionTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [page, resetSessionTimer]);

  // --- Handlers ---
  const handleSelectRole = (role) => {
    if (role === 'teacher') {
      setPage('teacher-login');
    } else {
      setPage('parent');
    }
  };

  const handleTeacherLogin = () => {
    setPage('teacher');
    resetSessionTimer();
  };

  const handleTeacherLogout = () => {
    setPage('landing');
    setTeacherSessionExpiry(null);
  };

  /**
   * Sync local students state and run Supabase operations based on diffs
   */
  const handleUpdateStudents = async (updatedStudents) => {
    const prevStudents = [...students];
    setStudents(updatedStudents);

    if (!isSupabaseConfigured()) return;

    try {
      const oldMap = new Map(prevStudents.map(s => [s.id, s]));
      const newMap = new Map(updatedStudents.map(s => [s.id, s]));

      // 1. Detect and execute deletions
      for (const [id] of oldMap.entries()) {
        if (!newMap.has(id)) {
          await supabaseService.deleteStudent(id);
        }
      }

      // 2. Detect and execute additions & updates
      for (const [id, newStudent] of newMap.entries()) {
        const oldStudent = oldMap.get(id);
        if (!oldStudent) {
          // Add student (with initial scores if any)
          await supabaseService.addStudent(newStudent);
        } else {
          // Check for student details update
          if (
            newStudent.name !== oldStudent.name ||
            newStudent.birthDate !== oldStudent.birthDate ||
            newStudent.classLevel !== oldStudent.classLevel
          ) {
            await supabaseService.updateStudent(newStudent);
          }

          // Check for scores updates
          const oldScoresMap = new Map(oldStudent.scores.map(sc => [sc.id, sc]));
          const newScoresMap = new Map(newStudent.scores.map(sc => [sc.id, sc]));

          // Delete scores removed
          for (const [scId] of oldScoresMap.entries()) {
            if (!newScoresMap.has(scId)) {
              await supabaseService.deleteScore(scId);
            }
          }

          // Add or update scores
          for (const [scId, newScore] of newScoresMap.entries()) {
            const oldScore = oldScoresMap.get(scId);
            if (!oldScore) {
              await supabaseService.addScore(id, newScore);
            } else if (
              newScore.subject !== oldScore.subject ||
              newScore.unitName !== oldScore.unitName ||
              newScore.maxScore !== oldScore.maxScore ||
              newScore.score !== oldScore.score ||
              newScore.corrected !== oldScore.corrected ||
              newScore.retakeDate !== oldScore.retakeDate
            ) {
              await supabaseService.updateScore(newScore);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync students updates to Supabase:", err);
    }
  };

  const handleUpdateSchoolInfo = async (updatedSchoolInfo) => {
    setSchoolInfo(updatedSchoolInfo);

    if (!isSupabaseConfigured()) return;

    try {
      await supabaseService.saveSchoolInfo({
        ...updatedSchoolInfo,
        teacherPinHash
      });
    } catch (err) {
      console.error("Failed to sync settings update to Supabase:", err);
    }
  };

  const handleUpdateSubjects = async (updatedSubjects) => {
    const prevSubjects = [...subjects];
    setSubjects(updatedSubjects);

    if (!isSupabaseConfigured()) return;

    try {
      const oldMap = new Map(prevSubjects.map(s => [s.id, s]));
      const newMap = new Map(updatedSubjects.map(s => [s.id, s]));

      // Deletions
      for (const [id] of oldMap.entries()) {
        if (!newMap.has(id)) {
          await supabaseService.deleteSubject(id);
        }
      }

      // Additions & Updates
      for (const [id, newSub] of newMap.entries()) {
        const oldSub = oldMap.get(id);
        if (!oldSub) {
          await supabaseService.addSubject(newSub);
        } else if (
          newSub.name !== oldSub.name ||
          newSub.defaultMaxScore !== oldSub.defaultMaxScore
        ) {
          await supabaseService.updateSubject(newSub);
        }
      }
    } catch (err) {
      console.error("Failed to sync subjects updates to Supabase:", err);
    }
  };

  const handleChangePIN = async (newPin) => {
    const newHash = hashPin(newPin);
    setTeacherPinHash(newHash);

    if (!isSupabaseConfigured()) return;

    try {
      await supabaseService.updateTeacherPIN(newHash);
    } catch (err) {
      console.error("Failed to update teacher PIN in Supabase:", err);
    }
  };

  const handleAcknowledge = async (studentId, parentName) => {
    // Prevent duplicate acknowledgements
    const existing = acknowledgements.find(ack => ack.studentId === studentId);
    if (existing) return;

    const newAck = {
      studentId,
      parentName,
      timestamp: new Date().toISOString()
    };
    setAcknowledgements(prev => [newAck, ...prev]);

    if (!isSupabaseConfigured()) return;

    try {
      await supabaseService.addAcknowledgement(studentId, parentName);
    } catch (err) {
      console.error("Failed to save parent acknowledgement to Supabase:", err);
    }
  };

  const handleBackToLanding = () => {
    setPage('landing');
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', padding: '36px 48px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
          <div className="animate-spin" style={{ width: 44, height: 44, border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 20px auto' }} />
          <p style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>กำลังเชื่อมต่อฐานข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {errorMsg && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2', color: '#b91c1c', padding: '12px 24px', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {page === 'landing' && (
        <LandingPage onSelectRole={handleSelectRole} />
      )}

      {page === 'teacher-login' && (
        <TeacherLogin 
          onLogin={handleTeacherLogin}
          onBack={handleBackToLanding}
          teacherPinHash={teacherPinHash}
        />
      )}

      {page === 'teacher' && (
        <TeacherDashboard 
          students={students}
          schoolInfo={schoolInfo}
          subjects={subjects}
          acknowledgements={acknowledgements}
          onUpdateStudents={handleUpdateStudents}
          onUpdateSchoolInfo={handleUpdateSchoolInfo}
          onUpdateSubjects={handleUpdateSubjects}
          onChangePIN={handleChangePIN}
          onLogout={handleTeacherLogout}
        />
      )}

      {page === 'parent' && (
        <ParentPortal 
          students={students}
          schoolInfo={schoolInfo}
          subjects={subjects}
          acknowledgements={acknowledgements}
          onAcknowledge={handleAcknowledge}
          onBack={handleBackToLanding}
        />
      )}
    </div>
  );
}

export default App;
