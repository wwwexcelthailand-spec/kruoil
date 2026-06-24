import React, { useState, useRef } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CheckCircle,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  AlertCircle,
  UserCheck,
  LogOut,
  Upload,
  Download,
  Printer,
  BookMarked,
  Lock,
  Eye,
  EyeOff,
  Inbox,
  Menu
} from 'lucide-react';
import { hashPin } from '../mockData';
import schoolLogo from '../assets/school_logo.png';

// ─────────────────────────────────────────────
// TeacherDashboard — main teacher admin panel
// ─────────────────────────────────────────────
export default function TeacherDashboard({
  students,
  schoolInfo,
  subjects,
  acknowledgements,
  onUpdateStudents,
  onUpdateSchoolInfo,
  onUpdateSubjects,
  onChangePIN,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Student CRUD states ──
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentName, setEditStudentName] = useState(''); // separate from add-modal name
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState('');
  const [newStudentNationalId, setNewStudentNationalId] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // ── Score editing states ──
  const [selectedStudentForScores, setSelectedStudentForScores] = useState(students[0]?.id || '');
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [tempScoreVal, setTempScoreVal] = useState({
    score: '', maxScore: '', unitName: '', subject: '', corrected: 'ยังไม่แก้', retakeDate: ''
  });
  const [scoreError, setScoreError] = useState('');

  // ── Settings states ──
  const [settingsSchoolName, setSettingsSchoolName] = useState(schoolInfo.schoolName);
  const [settingsSemester, setSettingsSemester] = useState(schoolInfo.semester);
  const [settingsTeacherName, setSettingsTeacherName] = useState(schoolInfo.teacherName);
  const [settingsVisibleSubjects, setSettingsVisibleSubjects] = useState(
    schoolInfo.visibleSubjects || subjects.map(s => s.name)
  );

  // ── PIN change states ──
  const [pinOld, setPinOld] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // ── Subject management states ──
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectMaxScore, setNewSubjectMaxScore] = useState(10);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectMaxScore, setEditSubjectMaxScore] = useState(10);

  // ── CSV import states ──
  const [csvPreview, setCsvPreview] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const csvInputRef = useRef(null);

  // ── Classroom filter ──
  const [selectedClassroom, setSelectedClassroom] = useState('ป.2/1');
  const filteredStudents = students.filter(s => s.classLevel === selectedClassroom);

  // Reset selected student when classroom changes
  const handleClassroomChange = (cls) => {
    setSelectedClassroom(cls);
    const studentsInClass = students.filter(s => s.classLevel === cls);
    setSelectedStudentForScores(studentsInClass[0]?.id || '');
  };

  // ───────────────────────────────
  // Statistics calculation
  // ───────────────────────────────
  const totalStudents = filteredStudents.length;
  let totalPointsEarned = 0;
  let totalPointsPossible = 0;
  let passedCount = 0;
  let totalTests = 0;
  const failingStudents = [];

  filteredStudents.forEach(st => {
    let studentHasFail = false;
    st.scores.forEach(sc => {
      totalPointsEarned += sc.score;
      totalPointsPossible += sc.maxScore;
      totalTests++;
      const isPass = sc.score >= (sc.maxScore * 0.6) || sc.corrected === 'แก้แล้ว' || sc.corrected === 'ผ่านเกณฑ์';
      if (isPass) {
        passedCount++;
      } else {
        studentHasFail = true;
      }
    });
    if (studentHasFail && !failingStudents.some(f => f.id === st.id)) {
      failingStudents.push(st);
    }
  });

  const classAveragePercentage = totalPointsPossible > 0
    ? ((totalPointsEarned / totalPointsPossible) * 100).toFixed(1)
    : 0;

  const testPassRate = totalTests > 0
    ? ((passedCount / totalTests) * 100).toFixed(1)
    : 0;
  const testFailRate = totalTests > 0 ? (100 - Number(testPassRate)).toFixed(1) : 0;

  const classroomStudentIds = filteredStudents.map(s => s.id);
  const filteredAcksForOverview = acknowledgements.filter(
    ack => classroomStudentIds.includes(ack.studentId)
  );
  const totalSigned = filteredAcksForOverview.length;
  const signatureRate = totalStudents > 0
    ? ((totalSigned / totalStudents) * 100).toFixed(1)
    : 0;

  // Active student for score editing
  const currentStudent = filteredStudents.find(s => s.id === selectedStudentForScores) || filteredStudents[0];

  // ── Per-subject average (for charts) ──
  const subjectAverages = {};
  subjects.forEach(subj => {
    let earned = 0, possible = 0;
    filteredStudents.forEach(st => {
      st.scores.filter(sc => sc.subject === subj.name).forEach(sc => {
        earned += sc.score;
        possible += sc.maxScore;
      });
    });
    subjectAverages[subj.name] = possible > 0 ? ((earned / possible) * 100) : 0;
  });

  // ───────────────────────────────
  // Student CRUD handlers
  // ───────────────────────────────
  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentId || !newStudentName) return;

    const duplicateStudent = students.find(s => s.id === newStudentId);
    if (duplicateStudent) {
      alert(`รหัสนักเรียนนี้มีอยู่ในระบบแล้ว (เป็นของ ${duplicateStudent.name} อยู่ในห้อง ${duplicateStudent.classLevel})`);
      return;
    }

    const firstSubject = subjects[0];
    const newStudent = {
      id: newStudentId,
      name: newStudentName,
      birthDate: newStudentBirthDate || '',
      nationalId: newStudentNationalId || '',
      classLevel: selectedClassroom,
      scores: firstSubject ? [{
        id: 'score-' + Date.now() + '-1',
        subject: firstSubject.name,
        unitName: 'หน่วยที่ 1',
        maxScore: firstSubject.defaultMaxScore,
        score: 0,
        corrected: 'ยังไม่แก้',
        retakeDate: ''
      }] : []
    };

    onUpdateStudents([...students, newStudent]);
    setNewStudentId('');
    setNewStudentName('');
    setNewStudentBirthDate('');
    setNewStudentNationalId('');
    setShowAddStudentModal(false);
  };

  const handleDeleteStudent = (id) => {
    if (window.confirm('คุณต้องการลบนักเรียนคนนี้ใช่หรือไม่? ข้อมูลคะแนนทั้งหมดจะถูกลบออกด้วย')) {
      onUpdateStudents(students.filter(s => s.id !== id));
      if (selectedStudentForScores === id) {
        const remaining = filteredStudents.filter(s => s.id !== id);
        setSelectedStudentForScores(remaining[0]?.id || '');
      }
    }
  };

  // ───────────────────────────────
  // Score editing handlers
  // ───────────────────────────────
  const handleStartEditScore = (score) => {
    setEditingScoreId(score.id);
    setTempScoreVal({ ...score });
    setScoreError('');
  };

  const handleSaveScoreRow = (studentId, scoreId) => {
    const scoreNum = Number(tempScoreVal.score);
    const maxScoreNum = Number(tempScoreVal.maxScore);

    // Validation
    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      setScoreError('คะแนนเต็มต้องมากกว่า 0');
      return;
    }
    if (isNaN(scoreNum) || scoreNum < 0) {
      setScoreError('คะแนนที่ได้ต้อง >= 0');
      return;
    }
    if (scoreNum > maxScoreNum) {
      setScoreError(`คะแนนที่ได้ (${scoreNum}) ต้องไม่เกินคะแนนเต็ม (${maxScoreNum})`);
      return;
    }

    setScoreError('');

    const updatedStudents = students.map(st => {
      if (st.id === studentId) {
        const updatedScores = st.scores.map(sc => {
          if (sc.id === scoreId) {
            let correctedVal = tempScoreVal.corrected;
            const isPass = scoreNum >= (maxScoreNum * 0.6);
            if (isPass) {
              correctedVal = 'ผ่านเกณฑ์';
            } else if (correctedVal === 'ผ่านเกณฑ์') {
              correctedVal = 'ยังไม่แก้';
            }
            return {
              ...sc,
              subject: tempScoreVal.subject,
              unitName: tempScoreVal.unitName,
              maxScore: maxScoreNum,
              score: scoreNum,
              corrected: correctedVal,
              retakeDate: tempScoreVal.retakeDate
            };
          }
          return sc;
        });
        return { ...st, scores: updatedScores };
      }
      return st;
    });

    onUpdateStudents(updatedStudents);
    setEditingScoreId(null);
  };

  const handleAddNewScoreRow = (studentId) => {
    const firstSubject = subjects[0];
    const newScore = {
      id: 'score-' + Date.now(),
      subject: firstSubject ? firstSubject.name : 'วิชาใหม่',
      unitName: 'หน่วยใหม่',
      maxScore: firstSubject ? firstSubject.defaultMaxScore : 10,
      score: 0,
      corrected: 'ยังไม่แก้',
      retakeDate: ''
    };

    const updatedStudents = students.map(st => {
      if (st.id === studentId) {
        return { ...st, scores: [...st.scores, newScore] };
      }
      return st;
    });

    onUpdateStudents(updatedStudents);
    handleStartEditScore(newScore);
  };

  const handleDeleteScoreRow = (studentId, scoreId) => {
    if (window.confirm('ต้องการลบวิชา/คะแนนนี้ใช่หรือไม่?')) {
      const updatedStudents = students.map(st => {
        if (st.id === studentId) {
          return { ...st, scores: st.scores.filter(sc => sc.id !== scoreId) };
        }
        return st;
      });
      onUpdateStudents(updatedStudents);
    }
  };

  // ───────────────────────────────
  // Settings handler
  // ───────────────────────────────
  const handleSaveSettings = (e) => {
    e.preventDefault();
    onUpdateSchoolInfo({
      schoolName: settingsSchoolName,
      semester: settingsSemester,
      classLevel: schoolInfo.classLevel,
      teacherName: settingsTeacherName,
      visibleSubjects: settingsVisibleSubjects
    });
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
  };

  // ───────────────────────────────
  // PIN change handler
  // ───────────────────────────────
  const handleChangePIN = (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (!pinOld || !pinNew || !pinConfirm) {
      setPinError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    // Verify old PIN by comparing hashes
    const storedHash = localStorage.getItem('teacherPinHash');
    if (storedHash && hashPin(pinOld) !== storedHash) {
      setPinError('PIN เดิมไม่ถูกต้อง');
      return;
    }
    if (pinNew !== pinConfirm) {
      setPinError('PIN ใหม่ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (pinNew.length < 4) {
      setPinError('PIN ใหม่ต้องมีอย่างน้อย 4 หลัก');
      return;
    }

    onChangePIN(pinNew);
    setPinOld('');
    setPinNew('');
    setPinConfirm('');
    setPinSuccess('เปลี่ยน PIN สำเร็จแล้ว!');
  };

  // ───────────────────────────────
  // Subject CRUD handlers
  // ───────────────────────────────
  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const maxScore = Number(newSubjectMaxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      alert('คะแนนเต็มเริ่มต้นต้องมากกว่า 0');
      return;
    }
    const newSubject = {
      id: 'subj-' + Date.now(),
      name: newSubjectName.trim(),
      defaultMaxScore: maxScore
    };
    onUpdateSubjects([...subjects, newSubject]);
    setNewSubjectName('');
    setNewSubjectMaxScore(10);
  };

  const handleSaveSubject = (id) => {
    if (!editSubjectName.trim()) return;
    const maxScore = Number(editSubjectMaxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      alert('คะแนนเต็มเริ่มต้นต้องมากกว่า 0');
      return;
    }
    onUpdateSubjects(subjects.map(s =>
      s.id === id ? { ...s, name: editSubjectName.trim(), defaultMaxScore: maxScore } : s
    ));
    setEditingSubjectId(null);
  };

  const handleDeleteSubject = (id) => {
    if (window.confirm('ต้องการลบวิชานี้ใช่หรือไม่?')) {
      onUpdateSubjects(subjects.filter(s => s.id !== id));
    }
  };

  // ───────────────────────────────
  // CSV Import
  // ───────────────────────────────
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert('ไฟล์ CSV ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว');
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim());
      const idIdx = header.findIndex(h => h === 'รหัส');
      const nameIdx = header.findIndex(h => h === 'ชื่อ-นามสกุล');
      const bdIdx = header.findIndex(h => h === 'วันเกิด');
      const nidIdx = header.findIndex(h => h === 'เลขบัตรประชาชน');

      if (idIdx === -1 || nameIdx === -1) {
        alert('ไม่พบคอลัมน์ "รหัส" หรือ "ชื่อ-นามสกุล" ในไฟล์ CSV');
        return;
      }

      const rows = [];
      const existingIds = new Set(students.map(s => s.id));

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const id = cols[idIdx] || '';
        const name = cols[nameIdx] || '';
        const birthDate = bdIdx !== -1 ? (cols[bdIdx] || '') : '';
        const nationalId = nidIdx !== -1 ? (cols[nidIdx] || '') : '';

        if (!id || !name) continue;

        rows.push({
          id,
          name,
          birthDate,
          nationalId,
          isDuplicate: existingIds.has(id)
        });
      }

      setCsvPreview(rows);
      setShowCsvModal(true);
    };
    reader.readAsText(file, 'UTF-8');

    // Reset input so the same file can be picked again
    e.target.value = '';
  };

  const handleCsvImport = () => {
    const toImport = csvPreview.filter(r => !r.isDuplicate);
    if (toImport.length === 0) {
      alert('ไม่มีรายชื่อใหม่ที่จะนำเข้า (ทั้งหมดซ้ำ)');
      return;
    }

    const firstSubject = subjects[0];
    const newStudents = toImport.map(r => ({
      id: r.id,
      name: r.name,
      birthDate: r.birthDate,
      nationalId: r.nationalId || '',
      classLevel: selectedClassroom,
      scores: firstSubject ? [{
        id: 'score-' + Date.now() + '-' + r.id,
        subject: firstSubject.name,
        unitName: 'หน่วยที่ 1',
        maxScore: firstSubject.defaultMaxScore,
        score: 0,
        corrected: 'ยังไม่แก้',
        retakeDate: ''
      }] : []
    }));

    onUpdateStudents([...students, ...newStudents]);
    setShowCsvModal(false);
    setCsvPreview(null);
  };

  // ───────────────────────────────
  // CSV Export
  // ───────────────────────────────
  const handleCsvExport = () => {
    const subjectNames = subjects.map(s => s.name);
    let csv = 'รหัส,ชื่อ-นามสกุล,วันเกิด,เลขบัตรประชาชน,ห้องเรียน';
    subjectNames.forEach(sn => { csv += ',' + sn; });
    csv += '\n';

    filteredStudents.forEach(st => {
      csv += `${st.id},${st.name},${st.birthDate || ''},${st.nationalId || ''},${st.classLevel}`;
      subjectNames.forEach(sn => {
        const sc = st.scores.find(s => s.subject === sn);
        csv += ',' + (sc ? `${sc.score}/${sc.maxScore}` : '-');
      });
      csv += '\n';
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `students_${selectedClassroom.replace('/', '-')}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ───────────────────────────────
  // SVG Chart Helpers
  // ───────────────────────────────

  /** Simple SVG bar chart of per-subject averages */
  const renderBarChart = () => {
    const entries = Object.entries(subjectAverages);
    if (entries.length === 0) return null;

    const chartW = 500;
    const chartH = 200;
    const barGap = 16;
    const barW = Math.min(60, (chartW - barGap * (entries.length + 1)) / entries.length);
    const maxVal = 100;
    const colors = ['#4f46e5', '#6366f1', '#818cf8', '#3b82f6', '#60a5fa', '#93c5fd'];

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH + 60}`} width="100%" style={{ maxWidth: chartW }}>
        {/* Y axis labels */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = chartH - (v / maxVal) * chartH + 10;
          return (
            <g key={v}>
              <line x1="40" y1={y} x2={chartW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x="35" y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="Inter, sans-serif">{v}%</text>
            </g>
          );
        })}
        {/* Bars */}
        {entries.map(([name, avg], i) => {
          const x = 50 + i * (barW + barGap);
          const barH = (avg / maxVal) * chartH;
          const y = chartH - barH + 10;
          return (
            <g key={name}>
              <rect
                x={x} y={y} width={barW} height={barH}
                rx="4" fill={colors[i % colors.length]}
                opacity="0.9"
              />
              <text
                x={x + barW / 2} y={y - 6}
                textAnchor="middle" fontSize="11" fontWeight="700"
                fill="#1e293b" fontFamily="Inter, sans-serif"
              >
                {avg.toFixed(1)}%
              </text>
              {/* Subject label (rotated) */}
              <text
                x={x + barW / 2} y={chartH + 28}
                textAnchor="middle" fontSize="10.5" fill="#475569"
                fontFamily="Sarabun, sans-serif"
              >
                {name.length > 10 ? name.slice(0, 10) + '…' : name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  /** Simple SVG pie chart for pass/fail rate */
  const renderPieChart = () => {
    if (totalTests === 0) return null;

    const passPercent = Number(testPassRate);
    const failPercent = Number(testFailRate);
    const cx = 100, cy = 100, r = 80;

    // Single arc for pass percentage
    const passAngle = (passPercent / 100) * 360;
    const passRad = ((passAngle - 90) * Math.PI) / 180;
    const startX = cx;
    const startY = cy - r;
    const endX = cx + r * Math.cos(passRad);
    const endY = cy + r * Math.sin(passRad);
    const largeArc = passAngle > 180 ? 1 : 0;

    // Full circle if 100%
    const passPath = passPercent >= 100
      ? `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`
      : passPercent <= 0
        ? ''
        : `M ${cx},${cy} L ${startX},${startY} A ${r},${r} 0 ${largeArc},1 ${endX},${endY} Z`;

    return (
      <div className="pie-chart-container" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg viewBox="0 0 200 200" width="180" height="180">
          {/* Background circle = fail */}
          <circle cx={cx} cy={cy} r={r} fill="#fecaca" />
          {/* Pass slice */}
          {passPath && <path d={passPath} fill="#22c55e" />}
          {/* Center label */}
          <circle cx={cx} cy={cy} r="40" fill="#ffffff" />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="#1e293b" fontFamily="Inter, sans-serif">
            {testPassRate}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="Sarabun, sans-serif">
            ผ่านเกณฑ์
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>ผ่านเกณฑ์: {passedCount} ครั้ง ({passPercent.toFixed(1)}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fecaca' }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>ไม่ผ่านเกณฑ์: {totalTests - passedCount} ครั้ง ({failPercent}%)</span>
          </div>
        </div>
      </div>
    );
  };

  // ───────────────────────────────
  //  Empty state component
  // ───────────────────────────────
  const EmptyClassroom = () => (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
      border: '2px dashed var(--border-color)'
    }}>
      <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
        ยังไม่มีนักเรียนในห้องนี้
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        กดปุ่ม <strong>+ เพิ่มนักเรียน</strong> เพื่อเริ่มต้น
      </p>
    </div>
  );

  // ───────────────────────────────
  //  Classroom Selector component
  // ───────────────────────────────
  const renderClassroomSelector = () => (
    <div className="classroom-selector-bar">
      <div className="selector-left">
        <span className="selector-label">ห้องเรียนที่ดูแล:</span>
        <div className="selector-buttons">
          {['ป.2/1', 'ป.2/2', 'ป.2 IP'].map(cls => (
            <button
              key={cls}
              className={`btn ${selectedClassroom === cls ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, height: 'auto' }}
              onClick={() => handleClassroomChange(cls)}
            >
              ห้อง {cls}
            </button>
          ))}
        </div>
      </div>
      <div className="selector-right">
        กำลังแสดงผล: {
          selectedClassroom === 'ป.2/1' ? 'ชั้นประถมศึกษาปีที่ 2/1'
          : selectedClassroom === 'ป.2/2' ? 'ชั้นประถมศึกษาปีที่ 2/2'
          : 'ชั้นประถมศึกษาปีที่ 2 IP'
        }
      </div>
    </div>
  );

  // ═══════════════════════════════
  //  RENDER
  // ═══════════════════════════════
  return (
    <div className="dashboard-container">

      {/* 📱 Mobile Top Navigation Header */}
      <div className="mobile-header no-print">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="เมนูควบคุม"
        >
          <Menu size={24} />
        </button>
        <div className="mobile-header-title">
          <span className="mobile-school-name">{schoolInfo.schoolName}</span>
          <span className="mobile-page-name">
            {activeTab === 'overview' && 'สถิติภาพรวม'}
            {activeTab === 'scores' && 'จัดการคะแนน'}
            {activeTab === 'students' && 'รายชื่อนักเรียน'}
            {activeTab === 'subjects' && 'จัดการวิชา'}
            {activeTab === 'acknowledgements' && 'ผู้ปกครอง'}
            {activeTab === 'settings' && 'ตั้งค่าทั่วไป'}
          </span>
        </div>
      </div>

      {/* 📱 Mobile Backdrop Sidebar Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-backdrop no-print" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* ════════ Sidebar ════════ */}
      <aside className={`sidebar no-print ${isMobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0
          }}>
            <img src={schoolLogo} alt="Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 className="sidebar-school-name">{schoolInfo.schoolName}</h1>
            <p className="sidebar-school-sub">ระบบผู้จัดการคะแนน (ครู)</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('overview');
              setIsMobileMenuOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>สถิติภาพรวม</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'scores' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('scores');
              setIsMobileMenuOpen(false);
              if (filteredStudents.length > 0 && !selectedStudentForScores) {
                setSelectedStudentForScores(filteredStudents[0].id);
              }
            }}
          >
            <BookOpen size={18} />
            <span>จัดการคะแนนสอบ</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('students');
              setIsMobileMenuOpen(false);
            }}
          >
            <Users size={18} />
            <span>รายชื่อนักเรียน</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('subjects');
              setIsMobileMenuOpen(false);
            }}
          >
            <BookMarked size={18} />
            <span>จัดการรายวิชา</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'acknowledgements' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('acknowledgements');
              setIsMobileMenuOpen(false);
            }}
          >
            <UserCheck size={18} />
            <span>การตอบรับของผู้ปกครอง</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
          >
            <Settings size={18} />
            <span>ตั้งค่าข้อมูลทั่วไป</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>ครูผู้สอน: {schoolInfo.teacherName}</p>
          <p>ปีการศึกษา: {schoolInfo.semester}</p>
          <button
            className="btn btn-danger"
            style={{
              marginTop: 14, width: '100%', justifyContent: 'center',
              background: 'rgba(255,255,255,0.12)', color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.25)'
            }}
            onClick={() => {
              setIsMobileMenuOpen(false);
              onLogout();
            }}
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ════════ Main Content ════════ */}
      <main className={`main-content ${activeTab === 'overview' ? 'overview-tab-active' : ''}`}>

        {/* ═══════════════════════════ Tab 1: Overview ═══════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="animate-fade overview-dashboard-container">
            <header className="content-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="page-title">สถิติและภาพรวมห้องเรียน</h2>
                <p className="page-subtitle">
                  ระดับชั้น: {
                    selectedClassroom === 'ป.2/1' ? 'ประถมศึกษาปีที่ 2/1'
                    : selectedClassroom === 'ป.2/2' ? 'ประถมศึกษาปีที่ 2/2'
                    : 'ประถมศึกษาปีที่ 2 IP'
                  } | ภาคเรียนที่: {schoolInfo.semester}
                </p>
              </div>
            </header>

            {renderClassroomSelector()}

            {/* KPI Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Users size={24} /></div>
                <div>
                  <p className="stat-label">นักเรียนทั้งหมด</p>
                  <p className="stat-value font-eng">{totalStudents} <span style={{ fontSize: 14, fontWeight: 'normal' }}>คน</span></p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon secondary"><BookOpen size={24} /></div>
                <div>
                  <p className="stat-label">คะแนนเฉลี่ยห้องเรียน</p>
                  <p className="stat-value font-eng">{classAveragePercentage}%</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon success"><CheckCircle size={24} /></div>
                <div>
                  <p className="stat-label">อัตราการสอบผ่านหน่วย</p>
                  <p className="stat-value font-eng">{testPassRate}%</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon secondary"><UserCheck size={24} /></div>
                <div>
                  <p className="stat-label">ผู้ปกครองตอบรับแล้ว</p>
                  <p className="stat-value font-eng">{signatureRate}% <span style={{ fontSize: 12, fontWeight: 'normal' }}>({totalSigned}/{totalStudents} คน)</span></p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="table-card">
                <div className="table-header-bar">
                  <h3 className="table-title">คะแนนเฉลี่ยรายวิชา (%)</h3>
                </div>
                <div style={{ padding: '8px 16px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                  {Object.keys(subjectAverages).length > 0 ? renderBarChart() : (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 15 }}>ยังไม่มีข้อมูลคะแนน</p>
                  )}
                </div>
              </div>
              <div className="table-card">
                <div className="table-header-bar">
                  <h3 className="table-title">อัตราการสอบผ่าน / ไม่ผ่าน</h3>
                </div>
                <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0 }}>
                  {totalTests > 0 ? renderPieChart() : (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 15 }}>ยังไม่มีข้อมูลการสอบ</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sub content grids */}
            <div className="grid-2">
              {/* Failing students */}
              <div className="table-card">
                <div className="table-header-bar">
                  <h3 className="table-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={18} />
                    <span>นักเรียนที่ยังไม่ผ่านเกณฑ์ (น้อยกว่า 60%)</span>
                  </h3>
                </div>
                <div className="table-responsive" style={{ flex: 1, border: 'none', borderRadius: 0, marginBottom: 0 }}>
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>รหัส</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>วิชาที่ยังไม่ผ่าน</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failingStudents.length === 0 ? (
                        <tr className="no-hover">
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                            ยินดีด้วย! นักเรียนทุกคนผ่านเกณฑ์ทั้งหมด
                          </td>
                        </tr>
                      ) : (
                        failingStudents.map(st => {
                          const failScores = st.scores.filter(sc =>
                            sc.score < (sc.maxScore * 0.6) && sc.corrected !== 'แก้แล้ว' && sc.corrected !== 'ผ่านเกณฑ์'
                          );
                          return (
                            <tr key={st.id}>
                              <td className="font-eng">{st.id}</td>
                              <td>{st.name}</td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {failScores.map(sc => (
                                    <span key={sc.id} className="badge badge-danger">
                                      {sc.subject} ({sc.score}/{sc.maxScore})
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    setSelectedStudentForScores(st.id);
                                    setActiveTab('scores');
                                  }}
                                >
                                  ดูคะแนน
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Latest parental acknowledgements — filtered by classroom */}
              <div className="table-card">
                <div className="table-header-bar">
                  <h3 className="table-title" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={18} />
                    <span>การยืนยันตัวตนจากผู้ปกครองล่าสุด</span>
                  </h3>
                </div>
                <div className="table-responsive" style={{ flex: 1, border: 'none', borderRadius: 0, marginBottom: 0 }}>
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>นักเรียน</th>
                        <th>ชื่อผู้ปกครอง</th>
                        <th>วันที่ยืนยัน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAcksForOverview.length === 0 ? (
                        <tr className="no-hover">
                          <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                            ยังไม่มีการยืนยันผลคะแนนจากผู้ปกครอง
                          </td>
                        </tr>
                      ) : (
                        filteredAcksForOverview.map((ack, idx) => {
                          const student = students.find(s => s.id === ack.studentId);
                          return (
                            <tr key={idx}>
                              <td>{student ? student.name : `รหัส ${ack.studentId}`}</td>
                              <td>{ack.parentName}</td>
                              <td className="font-eng" style={{ fontSize: 12 }}>
                                {new Date(ack.timestamp).toLocaleDateString('th-TH', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })} น.
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ Tab 2: Manage Scores ═══════════════════════════ */}
        {activeTab === 'scores' && (
          <div className="animate-fade">
            <header className="content-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="page-title">จัดการคะแนนรายบุคคล</h2>
                <p className="page-subtitle">กรอกคะแนนสอบ ซ่อมแซมผลคะแนน และบันทึกวันสอบซ่อม</p>
              </div>
              <div className="header-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label className="input-label" style={{ margin: 0 }}>เลือกนักเรียน: </label>
                  <select
                    className="form-input"
                    style={{ width: 250, padding: '8px 12px' }}
                    value={currentStudent?.id || ''}
                    onChange={(e) => setSelectedStudentForScores(e.target.value)}
                  >
                    {filteredStudents.map(st => (
                      <option key={st.id} value={st.id}>
                        [{st.id}] {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </header>

            {renderClassroomSelector()}

            {/* Subject visibility toggle for parents */}
            <div style={{
              background: 'var(--bg-card)', padding: '20px 24px',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)', marginBottom: '24px',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
                ตั้งค่าการแสดงผล: เลือกวิชาที่จะให้ผู้ปกครองมองเห็นในระบบรายงานคะแนน
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {subjects.map(subj => {
                  const isChecked = settingsVisibleSubjects.includes(subj.name);
                  return (
                    <label key={subj.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      background: isChecked ? 'rgba(30, 58, 138, 0.06)' : 'transparent',
                      padding: '8px 16px', borderRadius: '9999px',
                      border: '1.5px solid', borderColor: isChecked ? 'var(--primary)' : 'var(--border-color)',
                      transition: 'all 0.2s ease', userSelect: 'none'
                    }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                        onChange={(e) => {
                          let updated;
                          if (e.target.checked) {
                            updated = [...settingsVisibleSubjects, subj.name];
                          } else {
                            updated = settingsVisibleSubjects.filter(s => s !== subj.name);
                          }
                          setSettingsVisibleSubjects(updated);
                          onUpdateSchoolInfo({ ...schoolInfo, visibleSubjects: updated });
                        }}
                      />
                      <span style={{ color: isChecked ? 'var(--primary)' : 'var(--text-secondary)' }}>{subj.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {currentStudent ? (
              <div className="table-card">
                <div className="table-header-bar">
                  <div>
                    <h3 className="table-title">ใบคะแนนของ {currentStudent.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      รหัสประจำตัว: {currentStudent.id} | ระดับชั้น: {currentStudent.classLevel}
                      {currentStudent.birthDate && ` | วันเกิด: ${currentStudent.birthDate}`}
                      {currentStudent.nationalId && ` | เลขบัตรประชาชน: ${currentStudent.nationalId}`}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddNewScoreRow(currentStudent.id)}
                  >
                    <Plus size={16} />
                    เพิ่มวิชา / ตัวชี้วัดใหม่
                  </button>
                </div>

                {/* Score validation error banner */}
                {scoreError && (
                  <div style={{
                    margin: '0 24px', padding: '10px 16px', background: 'var(--danger-bg)',
                    borderRadius: 'var(--radius-sm)', color: '#dc2626', fontWeight: 700,
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 12
                  }}>
                    <AlertCircle size={16} />
                    {scoreError}
                  </div>
                )}

                <div className="table-responsive">
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>วิชา</th>
                        <th style={{ width: '25%' }}>ชื่อหน่วยการเรียนรู้</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>คะแนนเต็ม</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>คะแนนที่ได้</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>สถานะ / การแก้</th>
                        <th style={{ width: '14%' }}>สอบซ่อมวันที่</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStudent.scores.length === 0 ? (
                        <tr className="no-hover">
                          <td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                            ยังไม่มีการระบุรายวิชาและคะแนนสอบสำหรับนักเรียนคนนี้
                          </td>
                        </tr>
                      ) : (
                        currentStudent.scores.map(sc => {
                          const isEditing = editingScoreId === sc.id;
                          const isPass = sc.score >= (sc.maxScore * 0.6);

                          if (isEditing) {
                            return (
                              <tr key={sc.id} className="score-edit-row">
                                <td>
                                  <select
                                    value={tempScoreVal.subject}
                                    onChange={(e) => {
                                      const chosen = subjects.find(s => s.name === e.target.value);
                                      setTempScoreVal({
                                        ...tempScoreVal,
                                        subject: e.target.value,
                                        maxScore: chosen ? chosen.defaultMaxScore : tempScoreVal.maxScore
                                      });
                                    }}
                                  >
                                    {subjects.map(s => (
                                      <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                    {/* Allow freeform if current subject not in list */}
                                    {!subjects.find(s => s.name === tempScoreVal.subject) && (
                                      <option value={tempScoreVal.subject}>{tempScoreVal.subject} (กำหนดเอง)</option>
                                    )}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    value={tempScoreVal.unitName}
                                    onChange={(e) => setTempScoreVal({ ...tempScoreVal, unitName: e.target.value })}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    style={{ textAlign: 'center', width: 70 }}
                                    value={tempScoreVal.maxScore}
                                    min="1"
                                    onChange={(e) => setTempScoreVal({ ...tempScoreVal, maxScore: e.target.value })}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    style={{ textAlign: 'center', width: 70 }}
                                    value={tempScoreVal.score}
                                    min="0"
                                    onChange={(e) => setTempScoreVal({ ...tempScoreVal, score: e.target.value })}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={tempScoreVal.corrected}
                                    onChange={(e) => setTempScoreVal({ ...tempScoreVal, corrected: e.target.value })}
                                    disabled={Number(tempScoreVal.score) >= (Number(tempScoreVal.maxScore) * 0.6)}
                                  >
                                    <option value="ผ่านเกณฑ์">ผ่านเกณฑ์ (&gt;= 60%)</option>
                                    <option value="ยังไม่แก้">ยังไม่แก้</option>
                                    <option value="แก้แล้ว">แก้แล้ว (ซ่อมผ่าน)</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    placeholder="เช่น 20 มิ.ย. 69"
                                    value={tempScoreVal.retakeDate}
                                    onChange={(e) => setTempScoreVal({ ...tempScoreVal, retakeDate: e.target.value })}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    <button
                                      className="btn-icon-only"
                                      style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                                      onClick={() => handleSaveScoreRow(currentStudent.id, sc.id)}
                                    >
                                      <Save size={14} />
                                    </button>
                                    <button
                                      className="btn-icon-only"
                                      onClick={() => { setEditingScoreId(null); setScoreError(''); }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={sc.id}>
                              <td><strong>{sc.subject}</strong></td>
                              <td>{sc.unitName}</td>
                              <td className="font-eng" style={{ textAlign: 'center' }}>{sc.maxScore}</td>
                              <td className="font-eng" style={{ textAlign: 'center', fontWeight: 'bold' }}>{sc.score}</td>
                              <td style={{ textAlign: 'center' }}>
                                {isPass ? (
                                  <span className="badge badge-success">ผ่านเกณฑ์</span>
                                ) : sc.corrected === 'แก้แล้ว' ? (
                                  <span className="badge badge-success">แก้แล้ว</span>
                                ) : (
                                  <span className="badge badge-danger">ยังไม่แก้</span>
                                )}
                              </td>
                              <td>{sc.retakeDate || '-'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                  <button className="btn-icon-only" onClick={() => handleStartEditScore(sc)}>
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    className="btn-icon-only"
                                    style={{ color: 'var(--danger)' }}
                                    onClick={() => handleDeleteScoreRow(currentStudent.id, sc.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <AlertCircle size={40} style={{ color: 'var(--primary-light)', marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>โปรดเพิ่มรายชื่อนักเรียนก่อน เพื่อทำการกรอกผลคะแนนสอบ</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════ Tab 3: Students CRUD ═══════════════════════════ */}
        {activeTab === 'students' && (
          <div className="animate-fade">
            <header className="content-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="page-title">จัดการรายชื่อนักเรียน</h2>
                <p className="page-subtitle">เพิ่ม ลบ หรือแก้ไขข้อมูลพื้นฐานของนักเรียนในห้องเรียน</p>
              </div>
              <div className="header-actions">
                {/* CSV Import */}
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleCsvFileChange}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <Upload size={16} />
                  นำเข้า CSV
                </button>

                {/* CSV Export */}
                <button className="btn btn-secondary" onClick={handleCsvExport}>
                  <Download size={16} />
                  ส่งออก CSV
                </button>

                {/* Print */}
                <button className="btn btn-accent" onClick={() => window.print()}>
                  <Printer size={16} />
                  พิมพ์สรุป
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddStudentModal(true)}
                >
                  <Plus size={16} />
                  เพิ่มนักเรียนใหม่
                </button>
              </div>
            </header>

            {renderClassroomSelector()}

            {filteredStudents.length === 0 ? (
              <EmptyClassroom />
            ) : (
              <div className="table-card">
                <div className="table-header-bar">
                  <h3 className="table-title">รายชื่อนักเรียนในห้อง ({filteredStudents.length} คน)</h3>
                </div>

                <div className="table-responsive">
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>รหัสนักเรียน</th>
                        <th style={{ width: '25%' }}>ชื่อ-นามสกุล</th>
                        <th style={{ width: '15%' }}>วัน/เดือน/ปี เกิด</th>
                        <th style={{ width: '15%' }}>เลขบัตรประชาชน</th>
                        <th style={{ width: '13%' }}>ระดับชั้น</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(st => {
                        const isEditing = editingStudent === st.id;
                        return (
                          <tr key={st.id}>
                            <td className="font-eng" style={{ fontWeight: 'bold' }}>{st.id}</td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '6px 12px' }}
                                  value={editStudentName}
                                  onChange={(e) => setEditStudentName(e.target.value)}
                                />
                              ) : (
                                st.name
                              )}
                            </td>
                            <td className="font-eng" style={{ fontSize: 13 }}>
                              {st.birthDate || '-'}
                            </td>
                            <td className="font-eng" style={{ fontSize: 13 }}>
                              {st.nationalId || '-'}
                            </td>
                            <td>{st.classLevel}</td>
                            <td style={{ textAlign: 'center' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                  <button
                                    className="btn-icon-only"
                                    style={{ color: 'var(--success)' }}
                                    onClick={() => {
                                      if (!editStudentName) return;
                                      const updated = students.map(s =>
                                        s.id === st.id ? { ...s, name: editStudentName } : s
                                      );
                                      onUpdateStudents(updated);
                                      setEditingStudent(null);
                                      setEditStudentName('');
                                    }}
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    className="btn-icon-only"
                                    onClick={() => { setEditingStudent(null); setEditStudentName(''); }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                  <button
                                    className="btn-icon-only"
                                    onClick={() => { setEditingStudent(st.id); setEditStudentName(st.name); }}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    className="btn-icon-only"
                                    style={{ color: 'var(--danger)' }}
                                    onClick={() => handleDeleteStudent(st.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add Student Modal */}
            {showAddStudentModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3 className="modal-title">เพิ่มรายชื่อนักเรียนใหม่</h3>
                    <button className="modal-close-btn" onClick={() => setShowAddStudentModal(false)}>&times;</button>
                  </div>
                  <form onSubmit={handleAddStudent}>
                    <div className="modal-body">
                      <div className="input-group">
                        <label className="input-label">รหัสนักเรียน</label>
                        <input
                          type="text"
                          placeholder="เช่น 1872"
                          className="form-input"
                          value={newStudentId}
                          onChange={(e) => setNewStudentId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">ชื่อ-นามสกุล นักเรียน</label>
                        <input
                          type="text"
                          placeholder="เช่น เด็กชายวรรณศิษฎ์ กะลิ้งค์พล"
                          className="form-input"
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">วัน/เดือน/ปี เกิด</label>
                        <input
                          type="text"
                          placeholder="เช่น 15/05/2018"
                          className="form-input"
                          value={newStudentBirthDate}
                          onChange={(e) => setNewStudentBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">เลขบัตรประชาชน</label>
                        <input
                          type="text"
                          maxLength="13"
                          placeholder="เช่น 1234567890123"
                          className="form-input font-eng"
                          value={newStudentNationalId}
                          onChange={(e) => setNewStudentNationalId(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">ระดับชั้น (กำหนดโดยระบบ)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={selectedClassroom}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowAddStudentModal(false)}
                      >
                        ยกเลิก
                      </button>
                      <button type="submit" className="btn btn-primary">
                        บันทึกรายชื่อ
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* CSV Preview Modal */}
            {showCsvModal && csvPreview && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: 700 }}>
                  <div className="modal-header">
                    <h3 className="modal-title">ตรวจสอบข้อมูลก่อนนำเข้า</h3>
                    <button className="modal-close-btn" onClick={() => { setShowCsvModal(false); setCsvPreview(null); }}>&times;</button>
                  </div>
                  <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      พบข้อมูล {csvPreview.length} แถว — รายการที่ซ้ำจะถูกข้ามโดยอัตโนมัติ
                    </p>
                    <table className="app-table">
                      <thead>
                        <tr>
                          <th>รหัส</th>
                          <th>ชื่อ-นามสกุล</th>
                          <th>วันเกิด</th>
                          <th>เลขบัตรประชาชน</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i}>
                            <td className="font-eng">{row.id}</td>
                            <td>{row.name}</td>
                            <td className="font-eng" style={{ fontSize: 12 }}>{row.birthDate || '-'}</td>
                            <td className="font-eng" style={{ fontSize: 12 }}>{row.nationalId || '-'}</td>
                            <td>
                              {row.isDuplicate ? (
                                <span className="badge badge-warning">ซ้ำ — ข้าม</span>
                              ) : (
                                <span className="badge badge-success">พร้อมนำเข้า</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => { setShowCsvModal(false); setCsvPreview(null); }}>
                      ยกเลิก
                    </button>
                    <button className="btn btn-primary" onClick={handleCsvImport}>
                      <Upload size={16} />
                      นำเข้า {csvPreview.filter(r => !r.isDuplicate).length} รายชื่อ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════ Tab 4: Subject Management ═══════════════════════════ */}
        {activeTab === 'subjects' && (
          <div className="animate-fade">
            <header className="content-header">
              <div>
                <h2 className="page-title">จัดการรายวิชา</h2>
                <p className="page-subtitle">เพิ่ม แก้ไข หรือลบรายวิชาที่ใช้ในการกรอกคะแนนและรายงานผล</p>
              </div>
            </header>

            {/* Add subject form */}
            <div style={{
              background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)', marginBottom: 24
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 16 }}>
                เพิ่มวิชาใหม่
              </h4>
              <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label className="input-label">ชื่อวิชา</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น สังคมศึกษา"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ width: 160, marginBottom: 0 }}>
                  <label className="input-label">คะแนนเต็มเริ่มต้น</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSubjectMaxScore}
                    min="1"
                    onChange={(e) => setNewSubjectMaxScore(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: 46 }}>
                  <Plus size={16} />
                  เพิ่มวิชา
                </button>
              </form>
            </div>

            {/* Subject list */}
            <div className="table-card">
              <div className="table-header-bar">
                <h3 className="table-title">รายวิชาทั้งหมด ({subjects.length} วิชา)</h3>
              </div>
              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>ชื่อวิชา</th>
                      <th style={{ width: '25%', textAlign: 'center' }}>คะแนนเต็มเริ่มต้น</th>
                      <th style={{ width: '25%', textAlign: 'center' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr className="no-hover">
                        <td colSpan="3" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                          ยังไม่มีวิชาในระบบ กรุณาเพิ่มวิชาใหม่
                        </td>
                      </tr>
                    ) : (
                      subjects.map(subj => {
                        const isEditing = editingSubjectId === subj.id;
                        if (isEditing) {
                          return (
                            <tr key={subj.id} className="score-edit-row">
                              <td>
                                <input
                                  type="text"
                                  value={editSubjectName}
                                  onChange={(e) => setEditSubjectName(e.target.value)}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  style={{ textAlign: 'center', width: 80 }}
                                  value={editSubjectMaxScore}
                                  min="1"
                                  onChange={(e) => setEditSubjectMaxScore(e.target.value)}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                  <button
                                    className="btn-icon-only"
                                    style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                                    onClick={() => handleSaveSubject(subj.id)}
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button className="btn-icon-only" onClick={() => setEditingSubjectId(null)}>
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={subj.id}>
                            <td><strong>{subj.name}</strong></td>
                            <td className="font-eng" style={{ textAlign: 'center' }}>{subj.defaultMaxScore}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                <button
                                  className="btn-icon-only"
                                  onClick={() => {
                                    setEditingSubjectId(subj.id);
                                    setEditSubjectName(subj.name);
                                    setEditSubjectMaxScore(subj.defaultMaxScore);
                                  }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  className="btn-icon-only"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleDeleteSubject(subj.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ Tab 5: Acknowledgements ═══════════════════════════ */}
        {activeTab === 'acknowledgements' && (
          <div className="animate-fade">
            <header className="content-header" style={{ marginBottom: 20 }}>
              <div>
                <h2 className="page-title">ประวัติการยืนยันคะแนนของผู้ปกครอง</h2>
                <p className="page-subtitle">แสดงข้อมูลการกดรับทราบผลคะแนนและการลงนามดิจิทัลจากทางบ้าน</p>
              </div>
            </header>

            {renderClassroomSelector()}

            <div className="table-card">
              <div className="table-header-bar">
                <h3 className="table-title">รายชื่อผู้ปกครองที่เซ็นรับทราบแล้ว</h3>
              </div>

              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>รหัสนักเรียน</th>
                      <th style={{ width: '25%' }}>ชื่อนักเรียน</th>
                      <th style={{ width: '25%' }}>ชื่อผู้ลงนาม (ผู้ปกครอง)</th>
                      <th style={{ width: '30%' }}>ลงนามเมื่อวันที่ / เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredAcks = acknowledgements.filter(ack =>
                        filteredStudents.some(st => st.id === ack.studentId)
                      );

                      if (filteredAcks.length === 0) {
                        return (
                          <tr className="no-hover">
                            <td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                              ยังไม่มีผู้ปกครองในห้องเรียนนี้ลงชื่อรับทราบผลสอบ
                            </td>
                          </tr>
                        );
                      }

                      return filteredAcks.map((ack, idx) => {
                        const student = students.find(s => s.id === ack.studentId);
                        return (
                          <tr key={idx}>
                            <td className="font-eng" style={{ fontWeight: 'bold' }}>{ack.studentId}</td>
                            <td>{student ? student.name : 'ไม่พบข้อมูลนักเรียน'}</td>
                            <td>
                              <span style={{ fontFamily: 'Georgia', fontStyle: 'italic', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {ack.parentName}
                              </span>
                            </td>
                            <td className="font-eng">
                              {new Date(ack.timestamp).toLocaleDateString('th-TH', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                              })} น.
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ Tab 6: Settings ═══════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="animate-fade">
            <header className="content-header">
              <div>
                <h2 className="page-title">ตั้งค่าข้อมูลโรงเรียนและห้องเรียน</h2>
                <p className="page-subtitle">กำหนดชื่อโรงเรียน ปีการศึกษา ครูผู้สอน ซึ่งจะแสดงบนหน้าใบรายงานผลการสอบของผู้ปกครอง</p>
              </div>
            </header>

            {/* Settings 2-column grid: School Info + PIN Change */}
            <div className="settings-grid">
              {/* School info form */}
              <div style={{
                background: 'var(--bg-card)', padding: 32,
                borderRadius: 12, border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <form onSubmit={handleSaveSettings}>
                  <div className="input-group">
                    <label className="input-label">ชื่อโรงเรียน</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingsSchoolName}
                      onChange={(e) => setSettingsSchoolName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">ประจำภาคเรียน / ปีการศึกษา</label>
                    <input
                      type="text"
                      placeholder="เช่น 1/2569"
                      className="form-input"
                      value={settingsSemester}
                      onChange={(e) => setSettingsSemester(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">ชื่อครูผู้สอน (สำหรับลงนามในเอกสาร)</label>
                    <input
                      type="text"
                      placeholder="เช่น อาริสา ศิลปสุทธาพาสรณ์"
                      className="form-input"
                      value={settingsTeacherName}
                      onChange={(e) => setSettingsTeacherName(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: 10, padding: '12px 24px' }}>
                    <Save size={16} />
                    บันทึกการตั้งค่า
                  </button>
                </form>
              </div>

              {/* PIN Change section */}
              <div style={{
                background: 'var(--bg-card)', padding: 32,
                borderRadius: 12, border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Lock size={20} />
                  เปลี่ยน PIN เข้าสู่ระบบ
                </h3>

                {pinError && (
                  <div style={{
                    padding: '10px 16px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)',
                    color: '#dc2626', fontWeight: 700, fontSize: 13, marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <AlertCircle size={16} />
                    {pinError}
                  </div>
                )}
                {pinSuccess && (
                  <div style={{
                    padding: '10px 16px', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)',
                    color: '#15803d', fontWeight: 700, fontSize: 13, marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <CheckCircle size={16} />
                    {pinSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePIN}>
                  <div className="input-group">
                    <label className="input-label">PIN เดิม</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showOldPin ? 'text' : 'password'}
                        className="form-input"
                        value={pinOld}
                        onChange={(e) => setPinOld(e.target.value)}
                        placeholder="กรอก PIN เดิม"
                        required
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                        }}
                        onClick={() => setShowOldPin(!showOldPin)}
                      >
                        {showOldPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">PIN ใหม่ (อย่างน้อย 4 หลัก)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        className="form-input"
                        value={pinNew}
                        onChange={(e) => setPinNew(e.target.value)}
                        placeholder="กรอก PIN ใหม่"
                        required
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                        }}
                        onClick={() => setShowNewPin(!showNewPin)}
                      >
                        {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">ยืนยัน PIN ใหม่</label>
                    <input
                      type="password"
                      className="form-input"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value)}
                      placeholder="กรอก PIN ใหม่อีกครั้ง"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-accent" style={{ marginTop: 10, padding: '12px 24px' }}>
                    <Lock size={16} />
                    เปลี่ยน PIN
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
