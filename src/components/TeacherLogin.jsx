import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { hashPin } from '../mockData';

export default function TeacherLogin({ onLogin, onBack, teacherPinHash }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLocked) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 60000);
      setError(`ระบบถูกล็อค กรุณารอ ${remaining} นาที`);
      return;
    }

    if (!pin.trim()) return;

    const inputHash = hashPin(pin);
    
    if (inputHash === teacherPinHash) {
      // Success
      setAttempts(0);
      setError('');
      onLogin();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCK_DURATION;
        setLockedUntil(lockTime);
        setError(`ใส่รหัสผิดเกิน ${MAX_ATTEMPTS} ครั้ง ระบบถูกล็อค 5 นาที`);
        // Auto-unlock after duration
        setTimeout(() => {
          setLockedUntil(null);
          setAttempts(0);
          setError('');
        }, LOCK_DURATION);
      } else {
        setError(`รหัส PIN ไม่ถูกต้อง (เหลืออีก ${MAX_ATTEMPTS - newAttempts} ครั้ง)`);
      }
    }
  };

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
    if (error) setError('');
  };

  return (
    <div className="login-container animate-fade">
      <div className="login-card">
        <div className="login-logo">
          <Lock size={32} />
        </div>
        <h2 className="login-title">เข้าสู่ระบบครูผู้สอน</h2>
        <p className="login-subtitle">กรุณาใส่รหัส PIN เพื่อเข้าสู่ระบบจัดการคะแนน</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">รหัส PIN</label>
            <div style={{position: 'relative'}}>
              <input
                type={showPin ? 'text' : 'password'}
                maxLength="6"
                placeholder="ใส่รหัส PIN 4-6 หลัก"
                className="form-input font-eng"
                value={pin}
                onChange={handlePinChange}
                disabled={isLocked}
                autoFocus
                required
                style={{
                  paddingRight: 44,
                  letterSpacing: pin ? (showPin ? 'normal' : '10px') : 'normal',
                  fontSize: pin ? (showPin ? 20 : 24) : 15,
                  textAlign: 'center',
                  fontFamily: pin && !showPin ? 'system-ui, sans-serif' : 'inherit',
                  fontWeight: pin && !showPin ? 'bold' : 'normal'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4
                }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'left', fontWeight: 600}}>
              ⚠️ {error}
            </p>
          )}

          <button type="submit" className="login-submit-btn" disabled={isLocked}>
            <ShieldAlert size={18} />
            <span>{isLocked ? 'ระบบถูกล็อคชั่วคราว' : 'เข้าสู่ระบบ'}</span>
          </button>
        </form>

        <button 
          onClick={onBack}
          style={{
            marginTop: 20, background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, width: '100%', fontSize: 14, fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          กลับหน้าหลัก
        </button>

        <p style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 16, opacity: 0.7}}>
          รหัส PIN เริ่มต้น: 1234 (เปลี่ยนได้ในหน้าตั้งค่า)
        </p>
      </div>
    </div>
  );
}
