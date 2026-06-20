import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngragjndhuebksrnkdsf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmFnam5kaHVlYmtzcm5rZHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzczMzEsImV4cCI6MjA5NzQxMzMzMX0.N9Dif9tWJdtgvggenBRVzp5b-BymeJFA3KQ68ZWQBKI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // 1. Fetch School Info
    const { data: info, error: infoErr } = await supabase.from('school_info').select('*');
    console.log("=== SCHOOL INFO ===");
    console.log(JSON.stringify(info, null, 2));

    // 2. Fetch Student 1872
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('*, scores(*)')
      .eq('id', '1872');
    console.log("\n=== STUDENT 1872 ===");
    console.log(JSON.stringify(student, null, 2));

    // 3. Fetch all subjects
    const { data: subjects, error: subErr } = await supabase.from('subjects').select('*');
    console.log("\n=== SUBJECTS ===");
    console.log(JSON.stringify(subjects, null, 2));

  } catch (e) {
    console.error(e);
  }
}

run();
