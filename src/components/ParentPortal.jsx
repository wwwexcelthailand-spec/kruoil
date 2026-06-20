import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ArrowLeft, LogOut, CheckSquare, Check, Printer } from 'lucide-react';
import schoolLogo from '../assets/school_logo.png';

// ─── Constants ──────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Helper to normalize birthdate formats (e.g. YYYY-MM-DD, DD/MM/YYYY, etc.) to YYYY-MM-DD
// and convert Thai Buddhist Era (B.E.) year (> 2400) to Christian Era (C.E.) year.
// Now supports Thai digits, Thai month abbreviations/names, and avoids timezone shift issues.
const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  
  // Convert Thai digits to Arabic digits first
  let cleaned = dateStr.toString().trim();
  cleaned = cleaned.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 3664));
  
  let year = '';
  let month = '';
  let day = '';
  
  // 1. Format: YYYY-MM-DD (e.g. 2019-05-15 or 2019-05-15T00:00:00Z)
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    year = ymdMatch[1];
    month = ymdMatch[2];
    day = ymdMatch[3];
  } else {
    // 2. Format: DD/MM/YYYY or DD-MM-YYYY (e.g. 15/05/2562)
    const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      day = dmyMatch[1].padStart(2, '0');
      month = dmyMatch[2].padStart(2, '0');
      year = dmyMatch[3];
    } else {
      // 3. Format: Thai Month Name (e.g. 15 พ.ค. 2562 or 15 พฤษภาคม 2562)
      const thaiMonths = {
        'ม.ค.': '01', 'มค': '01', 'มกราคม': '01',
        'ก.พ.': '02', 'กพ': '02', 'กุมภาพันธ์': '02',
        'มี.ย.': '03', 'มย': '03', 'มีนาคม': '03',
        'เม.ย.': '04', 'เมย': '04', 'เมษายน': '04',
        'พ.ค.': '05', 'พค': '05', 'พฤษภาคม': '05',
        'มิ.ย.': '06', 'มิย': '06', 'มิถุนายน': '06',
        'ก.ค.': '07', 'กค': '07', 'กรกฎาคม': '07',
        'ส.ค.': '08', 'สค': '08', 'สิงหาคม': '08',
        'ก.ย.': '09', 'กย': '09', 'กันยายน': '09',
        'ต.ค.': '10', 'ตค': '10', 'ตุลาคม': '10',
        'พ.ย.': '11', 'พย': '11', 'พฤศจิกายน': '11',
        'ธ.ค.': '12', 'ธค': '12', 'ธันวาคม': '12'
      };

      const thaiMatch = cleaned.match(/^(\d{1,2})\s+([ก-ฮ\.]+)\s+(\d{2,4})/);
      if (thaiMatch) {
        day = thaiMatch[1].padStart(2, '0');
        const monthText = thaiMatch[2];
        const yearText = thaiMatch[3];
        
        const cleanMonth = monthText.replace(/\./g, '').trim();
        const monthVal = thaiMonths[monthText] || thaiMonths[cleanMonth];
        if (monthVal) {
          month = monthVal;
          let numericYear = parseInt(yearText, 10);
          if (yearText.length === 2) {
            numericYear += 2500;
          }
          year = String(numericYear);
        }
      } else {
        // 4. JS Date Parsing fallback (only if not matched by custom parsers)
        try {
          const d = new Date(cleaned);
          if (!isNaN(d.getTime())) {
            // Note: Use UTC methods if the input looks like an ISO string to avoid local timezone shift,
            // otherwise use local methods.
            const isISO = cleaned.includes('T') || cleaned.includes('Z');
            if (isISO) {
              year = String(d.getUTCFullYear());
              month = String(d.getUTCMonth() + 1).padStart(2, '0');
              day = String(d.getUTCDate()).padStart(2, '0');
            } else {
              year = String(d.getFullYear());
              month = String(d.getMonth() + 1).padStart(2, '0');
              day = String(d.getDate()).padStart(2, '0');
            }
          }
        } catch (e) {}
      }
    }
  }
  
  if (year && month && day) {
    let numericYear = parseInt(year, 10);
    if (numericYear > 2400) {
      numericYear -= 543;
    }
    return `${numericYear}-${month}-${day}`;
  }
  
  return cleaned;
};

export default function ParentPortal({
  students,
  schoolInfo,
  subjects,
  acknowledgements,
  onAcknowledge,
  onBack
}) {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [studentIdInput, setStudentIdInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [loggedInStudentId, setLoggedInStudentId] = useState(null);
  const [parentNameInput, setParentNameInput] = useState('');
  const [showSignForm, setShowSignForm] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef(null);

  // ─── Lockout countdown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (lockoutUntil) {
      const tick = () => {
        const remaining = lockoutUntil - Date.now();
        if (remaining <= 0) {
          // Lockout expired
          setLockoutUntil(null);
          setLockoutRemaining(0);
          setFailedAttempts(0);
          setSearchError('');
          clearInterval(lockoutTimerRef.current);
        } else {
          setLockoutRemaining(remaining);
        }
      };
      tick(); // Run immediately
      lockoutTimerRef.current = setInterval(tick, 1000);
      return () => clearInterval(lockoutTimerRef.current);
    }
  }, [lockoutUntil]);

  // ─── Safety guard: auto-logout if student data changes ──────────────────────
  useEffect(() => {
    if (loggedInStudentId) {
      const foundStudent = students.find(s => s.id === loggedInStudentId);
      if (!foundStudent) {
        setLoggedInStudentId(null);
        return;
      }

      const studentVisibleScores = foundStudent.scores.filter(sc => {
        if (!schoolInfo.visibleSubjects) return true;
        return schoolInfo.visibleSubjects.includes(sc.subject);
      });

      if (studentVisibleScores.length === 0) {
        setLoggedInStudentId(null);
      }
    }
  }, [loggedInStudentId, students, schoolInfo.visibleSubjects]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Convert short class level to formal Thai name */
  const getFormalClassLevel = (level) => {
    const map = {
      'ป.2/1': 'ประถมศึกษาปีที่ 2/1',
      'ป.2/2': 'ประถมศึกษาปีที่ 2/2',
      'ป.2 IP': 'ประถมศึกษาปีที่ 2 IP'
    };
    return map[level] || level;
  };

  /** Extract class number from class level string (e.g. "ประถมศึกษาปีที่ 2/1" → "2") */
  const getClassNumber = (levelStr) => {
    if (!levelStr) return '2';
    const match = levelStr.match(/\d+/);
    return match ? match[0] : '2';
  };

  /** Format lockout remaining time as mm:ss */
  const formatCountdown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  /** Get progress bar color based on percentage */
  const getScoreColor = (percentage) => {
    if (percentage >= 60) return '#16a34a'; // Green
    if (percentage >= 50) return '#d97706'; // Yellow/Amber
    return '#dc2626'; // Red
  };

  /** Get badge class name based on percentage */
  const getScoreBadgeClass = (percentage) => {
    if (percentage >= 60) return 'badge badge-success';
    if (percentage >= 50) return 'badge badge-warning';
    return 'badge badge-danger';
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /** Handle login with student ID + birthdate verification */
  const handleVerify = useCallback((e) => {
    e.preventDefault();

    // Check if locked out
    if (lockoutUntil && Date.now() < lockoutUntil) return;

    const cleanId = studentIdInput.trim();
    if (!cleanId) return;

    const foundStudent = students.find(s => s.id === cleanId);

    // Verify student exists AND birthdate matches (if student has birthDate set)
    let isValid = false;
    if (foundStudent) {
      if (foundStudent.birthDate) {
        // Student has birthdate — must match (normalized)
        isValid = normalizeDate(birthDateInput) === normalizeDate(foundStudent.birthDate);
      } else {
        // Backwards compatibility: no birthDate on student, allow login with just ID
        isValid = true;
      }
    }

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setSearchError('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรหัสและวันเกิด');

      // Lock out after MAX_LOGIN_ATTEMPTS failures
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockUntil);
        setSearchError('');
      }
      return;
    }

    // Check if student has visible scores
    const studentVisibleScores = foundStudent.scores.filter(sc => {
      if (!schoolInfo.visibleSubjects) return true;
      return schoolInfo.visibleSubjects.includes(sc.subject);
    });

    if (studentVisibleScores.length === 0) {
      setSearchError('ไม่มีข้อมูลคะแนนสอบของนักเรียนคนนี้');
      return;
    }

    // Successful login — reset everything
    setLoggedInStudentId(cleanId);
    setSearchError('');
    setShowSignForm(false);
    setFailedAttempts(0);
    setLockoutUntil(null);
  }, [studentIdInput, birthDateInput, students, schoolInfo.visibleSubjects, failedAttempts, lockoutUntil]);

  /** Logout and reset form */
  const handleLogout = () => {
    setLoggedInStudentId(null);
    setStudentIdInput('');
    setBirthDateInput('');
    setParentNameInput('');
    setShowSignForm(false);
    setSearchError('');
  };

  /** Submit acknowledgement signature */
  const handleSignSubmit = (e) => {
    e.preventDefault();
    if (!parentNameInput.trim()) return;

    onAcknowledge(loggedInStudentId, parentNameInput);
    setShowSignForm(false);
  };

  /** Print the report */
  const handlePrint = () => {
    window.print();
  };

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const student = students.find(s => s.id === loggedInStudentId);
  const ackRecord = acknowledgements.find(ack => ack.studentId === loggedInStudentId);
  const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;

  // ─── RENDER: Safety guard — student disappeared after login ─────────────────
  if (!student && loggedInStudentId) {
    return (
      <div className="login-container animate-fade">
        <div className="login-card">
          <div className="login-logo">
            <Search size={32} />
          </div>
          <h2 className="login-title">ระบบสืบค้นคะแนนรายหน่วย</h2>
          <p className="login-subtitle">{schoolInfo.schoolName} (สำหรับผู้ปกครอง)</p>
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>
            ไม่พบข้อมูลนักเรียน กรุณาค้นหาใหม่
          </p>
          <button
            className="login-submit-btn"
            onClick={() => { setLoggedInStudentId(null); setStudentIdInput(''); setBirthDateInput(''); }}
          >
            <ArrowLeft size={16} />
            <span>กลับหน้าค้นหา</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Login screen ───────────────────────────────────────────────────
  if (!loggedInStudentId) {
    return (
      <div className="login-container animate-fade">
        <div className="login-card">
          <div className="login-logo">
            <Search size={32} />
          </div>
          <h2 className="login-title">ระบบสืบค้นคะแนนรายหน่วย</h2>
          <p className="login-subtitle">{schoolInfo.schoolName} (สำหรับผู้ปกครอง)</p>

          <form onSubmit={handleVerify}>
            {/* Student ID field */}
            <div className="input-group">
              <label className="input-label">รหัสนักเรียน</label>
              <input
                type="text"
                maxLength="6"
                placeholder="ระบุรหัส 4 หลัก เช่น 1641"
                className="form-input font-eng"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                disabled={isLockedOut}
                required
              />
            </div>

            {/* Birthdate verification field */}
            <div className="input-group">
              <label className="input-label">วันเกิด</label>
              <input
                type="date"
                className="form-input font-eng"
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(e.target.value)}
                disabled={isLockedOut}
                required
              />
            </div>

            {/* Error message */}
            {searchError && !isLockedOut && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'left' }}>
                {searchError}
              </p>
            )}

            {/* Lockout warning with countdown */}
            {isLockedOut && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '2px solid rgba(220, 38, 38, 0.25)',
                borderRadius: 8,
                padding: '14px 18px',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 700, margin: 0 }}>
                  กรุณารอสักครู่ก่อนลองใหม่
                </p>
                <p style={{ color: '#dc2626', fontSize: 24, fontWeight: 800, margin: '8px 0 4px 0' }}
                   className="font-eng">
                  {formatCountdown(lockoutRemaining)}
                </p>
                <p style={{ color: '#dc2626', fontSize: 12, margin: 0, opacity: 0.8 }}>
                  คุณป้อนข้อมูลผิดเกินจำนวนครั้งที่กำหนด
                </p>
              </div>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLockedOut}
              style={isLockedOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <span>ค้นหาใบรายงานคะแนน</span>
            </button>
          </form>

          {/* Back to Landing button */}
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBack}
              style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            >
              <ArrowLeft size={14} />
              กลับหน้าหลัก
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Score Report View ──────────────────────────────────────────────
  return (
    <div className="parent-portal-view animate-fade">
      {/* ── Header bar (hidden during print) ── */}
      <div className="parent-portal-header no-print">
        <div className="parent-portal-user">
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }}>
              {student.name} ({student.id})
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, margin: 0, marginTop: 2 }}>
              {schoolInfo.schoolName} | ชั้น {getFormalClassLevel(student.classLevel)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ color: 'var(--primary-dark)', fontWeight: 'bold' }} onClick={handleLogout}>
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* ── Official Score Report Sheet (A4 layout) ── */}
      <div className="report-sheet print-container">

        {/* Document Header */}
        <div className="report-header-bg">
          <table className="school-header-table">
            <tbody>
              <tr>
                <td className="report-logo-col">
                  {/* Circular School Logo */}
                  <div className="report-logo-container" style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    border: '3px double #1e3a8a',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 5
                  }}>
                    <img src={schoolLogo} alt="Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                  </div>
                </td>
                <td className="report-title-col">
                  <h2 className="report-main-title">แบบฟอร์มแจ้งคะแนนสอบรายหน่วย</h2>
                  <h3 className="report-sub-title">Unit Test Score Report Form</h3>
                  <p style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>{schoolInfo.schoolName}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Student Meta Details */}
          <table className="student-meta-table">
            <tbody>
              <tr>
                <td style={{ width: '60%' }}>
                  <span className="student-meta-label">ชื่อ :</span> {student.name}
                </td>
                <td style={{ width: '40%' }}>
                  <span className="student-meta-label">ระดับชั้น :</span> {getFormalClassLevel(student.classLevel)}
                </td>
              </tr>
              <tr>
                <td>
                  <span className="student-meta-label">รหัสประจำตัว :</span> {student.id}
                </td>
                <td>
                  <span className="student-meta-label">ประจำภาคเรียน :</span> {schoolInfo.semester}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Intro Salutation */}
        <div className="report-intro-text">
          เรียน ผู้ปกครองนักเรียนชั้นประถมศึกษาปีที่ {getClassNumber(student.classLevel)} <br />
          ทางโรงเรียนขอแจ้งผลการสอบรายหน่วยของนักเรียน ดังนี้
        </div>

        {/* ── Scores Table with Progress Bars ── */}
        <table className="report-score-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>วิชา</th>
              <th style={{ width: '24%' }}>ชื่อหน่วย</th>
              <th style={{ width: '10%' }}>คะแนนเต็ม</th>
              <th style={{ width: '18%' }}>คะแนนที่ได้</th>
              <th style={{ width: '12%' }}>แก้แล้ว</th>
              <th style={{ width: '14%' }}>สอบซ่อมวันที่</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const visibleScores = student.scores.filter(sc => {
                if (!schoolInfo.visibleSubjects) return true;
                return schoolInfo.visibleSubjects.includes(sc.subject);
              });

              if (visibleScores.length === 0) {
                return (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontStyle: 'italic' }}>
                      ไม่มีรายวิชาที่กำหนดให้แสดงผลในขณะนี้
                    </td>
                  </tr>
                );
              }

              return visibleScores.map(sc => {
                const maxScore = sc.maxScore || 1; // Prevent division by zero
                const percentage = Math.round((sc.score / maxScore) * 100);
                const isPass = sc.score >= (maxScore * 0.6);
                const barColor = getScoreColor(percentage);

                return (
                  <tr key={sc.id}>
                    <td className="text-left" style={{ fontWeight: 'bold' }}>
                      {sc.subject}
                    </td>
                    <td className="text-left" style={{ fontSize: 13 }}>
                      {sc.unitName}
                    </td>
                    <td className="font-eng">{sc.maxScore}</td>
                    <td className="font-eng" style={{ fontWeight: 'bold' }}>
                      <div>
                        {/* Score value with percentage badge */}
                        <span style={{
                          color: !isPass && sc.corrected === 'ยังไม่แก้' ? '#ef4444' : 'inherit'
                        }}>
                          {sc.score}
                        </span>
                        {' '}
                        <span className={getScoreBadgeClass(percentage)} style={{ fontSize: 10, padding: '2px 8px' }}>
                          {percentage}%
                        </span>
                        {/* Progress bar */}
                        <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, marginTop: 4 }}>
                          <div style={{
                            width: `${Math.min(percentage, 100)}%`,
                            height: '100%',
                            background: barColor,
                            borderRadius: 3,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      {isPass ? '' : sc.corrected === 'แก้แล้ว' ? 'แก้แล้ว' : 'ยังไม่แก้'}
                    </td>
                    <td className="font-eng" style={{ fontSize: 12 }}>
                      {isPass ? '' : sc.retakeDate || '-'}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>

        {/* Footer notice */}
        <div className="report-passing-notice">
          นักเรียนที่ผ่านจะต้องมีคะแนน 60% จากคะแนนเต็ม
        </div>

        {/* ── Signature Area ── */}
        <div className="clearfix" style={{ marginTop: 40 }}>
          {/* Acknowledgement stamp (prominent) — always show if exists */}
          {ackRecord && (
            <div className="acknowledgement-stamp" style={{
              padding: '16px 24px',
              fontSize: 15,
              borderWidth: 3
            }}>
              <Check size={20} className="acknowledgement-stamp-icon" />
              <span>
                ผู้ปกครองรับทราบแล้ว: <strong>{ackRecord.parentName}</strong> <br />
                <span style={{ fontSize: 12, fontWeight: 'normal' }} className="font-eng">
                  ({new Date(ackRecord.timestamp).toLocaleString('th-TH')})
                </span>
              </span>
            </div>
          )}

          {/* Teacher Signature on the right */}
          <div className="report-signature-block">
            <div className="signature-line">
              <span className="cursive-signature">
                {schoolInfo.teacherName.split(' ')[0]}
              </span>
            </div>
            <div className="teacher-label">
              ลงชื่อ: ........................................................... <br />
              ({schoolInfo.teacherName}) <br />
              <span style={{ fontWeight: 'bold' }}>(ครูผู้สอน)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action panel (hidden during print) ── */}
      <div className="report-actions-bar no-print" style={{ width: '100%', maxWidth: 800 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            คุณสามารถพิมพ์ใบแจ้งผลการสอบรายหน่วยนี้เพื่อเก็บเป็นเอกสารได้
          </span>
        </div>
        <div className="report-actions-right">
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} />
            พิมพ์หน้านี้ / บันทึก PDF
          </button>

          {ackRecord ? (
            /* Already acknowledged — show confirmation, hide sign form */
            <button className="btn btn-secondary" disabled style={{ color: 'var(--success)' }}>
              <Check size={16} />
              ลงชื่อรับทราบเรียบร้อยแล้ว
            </button>
          ) : showSignForm ? (
            /* Sign form is open */
            <form onSubmit={handleSignSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="ชื่อผู้ปกครอง เช่น นายณรงค์ศักดิ์"
                className="form-input"
                style={{ padding: '6px 12px', width: 220, fontSize: 13 }}
                value={parentNameInput}
                onChange={(e) => setParentNameInput(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                ยืนยันลงชื่อ
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSignForm(false)}
              >
                ยกเลิก
              </button>
            </form>
          ) : (
            /* No acknowledgement yet — show sign button */
            <button className="btn btn-primary" onClick={() => setShowSignForm(true)}>
              ลงชื่อรับทราบผลสอบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
