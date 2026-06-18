import React from 'react';
import { ShieldAlert, UserCheck, BookOpen } from 'lucide-react';
import schoolLogo from '../assets/school_logo.png';

export default function LandingPage({ onSelectRole }) {
  return (
    <div className="landing-container animate-fade">
      <div className="landing-content">
        {/* School Logo & Title */}
        <div className="landing-header">
          <div className="landing-logo-circle">
            <img src={schoolLogo} alt="โรงเรียนปลูกปัญญา Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
          </div>
          <h1 className="landing-title">ระบบแจ้งคะแนนสอบรายหน่วย</h1>
          <p className="landing-subtitle">โรงเรียนปลูกปัญญา — Unit Test Score Report System</p>
        </div>

        {/* Portal Selection Cards */}
        <div className="landing-cards">
          {/* Teacher Portal */}
          <button className="portal-card teacher-card" onClick={() => onSelectRole('teacher')}>
            <div className="portal-card-icon">
              <ShieldAlert size={32} />
            </div>
            <h2 className="portal-card-title">สำหรับครูผู้สอน</h2>
            <p className="portal-card-desc">
              จัดการข้อมูลนักเรียน กรอกคะแนนสอบ ดูสถิติภาพรวม และพิมพ์ใบแจ้งคะแนน
            </p>
            <span className="portal-card-action">
              เข้าสู่ระบบครู →
            </span>
          </button>

          {/* Parent Portal */}
          <button className="portal-card parent-card" onClick={() => onSelectRole('parent')}>
            <div className="portal-card-icon parent-icon">
              <UserCheck size={32} />
            </div>
            <h2 className="portal-card-title">สำหรับผู้ปกครอง</h2>
            <p className="portal-card-desc">
              ตรวจสอบคะแนนรายหน่วยของนักเรียน ดูผลการเรียน และลงชื่อรับทราบ
            </p>
            <span className="portal-card-action">
              ค้นหาคะแนนนักเรียน →
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="landing-footer" style={{ flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={14} />
            <span>พัฒนาสำหรับโรงเรียนปลูกปัญญา • ปีการศึกษา 2569</span>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: '600', letterSpacing: '0.5px' }}>
            By.excelthailands
          </div>
        </div>
      </div>
    </div>
  );
}
