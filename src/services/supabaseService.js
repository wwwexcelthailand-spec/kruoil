import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (only if URL is provided)
export const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = () => {
  return !!supabase;
};

// Helper mapper for student and their nested scores
const mapStudent = (dbStudent) => ({
  id: dbStudent.id,
  name: dbStudent.name,
  birthDate: dbStudent.birth_date || '',
  nationalId: dbStudent.national_id || '',
  classLevel: dbStudent.class_level,
  scores: (dbStudent.scores || []).map(sc => ({
    id: sc.id,
    subject: sc.subject,
    unitName: sc.unit_name,
    maxScore: Number(sc.max_score),
    score: Number(sc.score),
    corrected: sc.corrected,
    retakeDate: sc.retake_date || ''
  }))
});

export const supabaseService = {
  /**
   * Fetch all database records on initial load
   */
  async fetchInitialData() {
    if (!supabase) {
      console.warn("Supabase is not configured. Using mock/local data.");
      return null;
    }

    try {
      // 1. Fetch School Info (id = 1)
      const { data: infoData, error: infoErr } = await supabase
        .from('school_info')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (infoErr) throw infoErr;

      let schoolInfo = null;
      if (infoData) {
        schoolInfo = {
          schoolName: infoData.school_name,
          semester: infoData.semester,
          classLevel: infoData.class_level,
          teacherName: infoData.teacher_name,
          visibleSubjects: infoData.visible_subjects,
          teacherPinHash: infoData.teacher_pin_hash
        };
      }

      // 2. Fetch Subjects
      const { data: subData, error: subErr } = await supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: true });

      if (subErr) throw subErr;

      const subjects = (subData || []).map(s => ({
        id: s.id,
        name: s.name,
        defaultMaxScore: Number(s.default_max_score)
      }));

      // 3. Fetch Students with their embedded Scores (left join)
      const { data: stuData, error: stuErr } = await supabase
        .from('students')
        .select('*, scores(*)');

      if (stuErr) throw stuErr;

      const students = (stuData || []).map(mapStudent);

      // 4. Fetch Acknowledgements
      const { data: ackData, error: ackErr } = await supabase
        .from('acknowledgements')
        .select('*');

      if (ackErr) throw ackErr;

      const acknowledgements = (ackData || []).map(ack => ({
        studentId: ack.student_id,
        parentName: ack.parent_name,
        timestamp: ack.timestamp
      }));

      return { schoolInfo, subjects, students, acknowledgements };
    } catch (error) {
      console.error("Error fetching initial data from Supabase:", error);
      throw error;
    }
  },

  /**
   * Save settings / school info
   */
  async saveSchoolInfo(info) {
    if (!supabase) return;
    const { error } = await supabase
      .from('school_info')
      .upsert({
        id: 1,
        school_name: info.schoolName,
        semester: info.semester,
        class_level: info.classLevel,
        teacher_name: info.teacherName,
        visible_subjects: info.visibleSubjects,
        teacher_pin_hash: info.teacherPinHash
      });
    if (error) throw error;
  },

  /**
   * Update teacher PIN hash in school_info
   */
  async updateTeacherPIN(hash) {
    if (!supabase) return;
    const { error } = await supabase
      .from('school_info')
      .update({ teacher_pin_hash: hash })
      .eq('id', 1);
    if (error) throw error;
  },

  /**
   * Add a new student
   */
  async addStudent(student) {
    if (!supabase) return;
    const { error } = await supabase
      .from('students')
      .insert({
        id: student.id,
        name: student.name,
        birth_date: student.birthDate,
        national_id: student.nationalId || '',
        class_level: student.classLevel
      });
    if (error) throw error;

    // If student has initial scores, insert them too
    if (student.scores && student.scores.length > 0) {
      const dbScores = student.scores.map(sc => ({
        id: sc.id,
        student_id: student.id,
        subject: sc.subject,
        unit_name: sc.unitName,
        max_score: sc.maxScore,
        score: sc.score,
        corrected: sc.corrected,
        retake_date: sc.retakeDate || ''
      }));
      const { error: scoreErr } = await supabase.from('scores').insert(dbScores);
      if (scoreErr) throw scoreErr;
    }
  },

  /**
   * Update student details (name, birthDate, classLevel)
   */
  async updateStudent(student) {
    if (!supabase) return;
    const { error } = await supabase
      .from('students')
      .update({
        name: student.name,
        birth_date: student.birthDate,
        national_id: student.nationalId || '',
        class_level: student.classLevel
      })
      .eq('id', student.id);
    if (error) throw error;
  },

  /**
   * Delete student (scores and acks will cascade delete)
   */
  async deleteStudent(studentId) {
    if (!supabase) return;
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    if (error) throw error;
  },

  /**
   * Add a subject
   */
  async addSubject(subject) {
    if (!supabase) return;
    const { error } = await supabase
      .from('subjects')
      .insert({
        id: subject.id,
        name: subject.name,
        default_max_score: subject.defaultMaxScore
      });
    if (error) throw error;
  },

  /**
   * Update a subject
   */
  async updateSubject(subject) {
    if (!supabase) return;
    const { error } = await supabase
      .from('subjects')
      .update({
        name: subject.name,
        default_max_score: subject.defaultMaxScore
      })
      .eq('id', subject.id);
    if (error) throw error;
  },

  /**
   * Delete a subject
   */
  async deleteSubject(id) {
    if (!supabase) return;
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Add/insert a score row
   */
  async addScore(studentId, score) {
    if (!supabase) return;
    const { error } = await supabase
      .from('scores')
      .insert({
        id: score.id,
        student_id: studentId,
        subject: score.subject,
        unit_name: score.unitName,
        max_score: score.maxScore,
        score: score.score,
        corrected: score.corrected,
        retake_date: score.retakeDate || ''
      });
    if (error) throw error;
  },

  /**
   * Update a score row
   */
  async updateScore(score) {
    if (!supabase) return;
    const { error } = await supabase
      .from('scores')
      .update({
        subject: score.subject,
        unit_name: score.unitName,
        max_score: score.maxScore,
        score: score.score,
        corrected: score.corrected,
        retake_date: score.retakeDate || ''
      })
      .eq('id', score.id);
    if (error) throw error;
  },

  /**
   * Delete a score row
   */
  async deleteScore(scoreId) {
    if (!supabase) return;
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', scoreId);
    if (error) throw error;
  },

  /**
   * Add parental acknowledgement
   */
  async addAcknowledgement(studentId, parentName) {
    if (!supabase) return;
    const { error } = await supabase
      .from('acknowledgements')
      .upsert({
        student_id: studentId,
        parent_name: parentName,
        timestamp: new Date().toISOString()
      });
    if (error) throw error;
  }
};
