// Seed data and configuration for the Unit Test Score Reporting App

// Simple hash function for PIN (SHA-256 simulation using btoa for localStorage)
// In production, use proper hashing — this is adequate for localStorage-only auth
export function hashPin(pin) {
  let hash = 0;
  const str = 'pts_salt_' + pin;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Default teacher PIN: 1234
export const DEFAULT_TEACHER_PIN_HASH = hashPin('1234');

export const INITIAL_SCHOOL_INFO = {
  schoolName: 'โรงเรียนปลูกปัญญา',
  semester: '1/2569',
  classLevel: 'ป.2/1',
  teacherName: 'อาริสา ศิลปสุทธาพาสรณ์',
  visibleSubjects: ['บูรณาการ (วิทยาศาสตร์)', 'ภาษาไทย', 'คณิตศาสตร์', 'Basic English']
};

// Subject master list — single source of truth
export const INITIAL_SUBJECTS = [
  { id: 'subj-1', name: 'บูรณาการ (วิทยาศาสตร์)', defaultMaxScore: 10 },
  { id: 'subj-2', name: 'คณิตศาสตร์', defaultMaxScore: 20 },
  { id: 'subj-3', name: 'ภาษาไทย', defaultMaxScore: 15 },
  { id: 'subj-4', name: 'Basic English', defaultMaxScore: 10 }
];

export const INITIAL_STUDENTS = [];

export const INITIAL_ACKNOWLEDGEMENTS = [];
