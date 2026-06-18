-- 1. ตารางวิชา (subjects)
create table if not exists public.subjects (
    id text primary key,
    name text unique not null,
    default_max_score numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ตารางนักเรียน (students)
create table if not exists public.students (
    id text primary key,
    name text not null,
    birth_date text,
    class_level text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ตารางคะแนนรายหน่วย (scores)
create table if not exists public.scores (
    id text primary key,
    student_id text references public.students(id) on delete cascade not null,
    subject text not null,
    unit_name text not null,
    max_score numeric not null,
    score numeric not null,
    corrected text not null,
    retake_date text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ตารางการรับทราบของผู้ปกครอง (acknowledgements)
create table if not exists public.acknowledgements (
    student_id text primary key references public.students(id) on delete cascade,
    parent_name text not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ตารางข้อมูลโรงเรียน/การตั้งค่า (school_info)
create table if not exists public.school_info (
    id integer primary key default 1 check (id = 1),
    school_name text not null default 'โรงเรียนปลูกปัญญา',
    semester text not null default '1/2569',
    class_level text not null default 'ป.2/1',
    teacher_name text not null default 'อาริสา ศิลปสุทธาพาสรณ์',
    visible_subjects text[] not null,
    teacher_pin_hash text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ปิดการใช้งาน Row Level Security (RLS) เพื่อให้ Client SDK เข้าถึงได้โดยตรง (UNRESTRICTED)
alter table public.subjects disable row level security;
alter table public.students disable row level security;
alter table public.scores disable row level security;
alter table public.acknowledgements disable row level security;
alter table public.school_info disable row level security;

-- ใส่ข้อมูลเริ่มต้นสำหรับวิชาและโรงเรียน (Seed Data)
insert into public.school_info (id, school_name, semester, class_level, teacher_name, visible_subjects, teacher_pin_hash)
values (
    1, 
    'โรงเรียนปลูกปัญญา', 
    '1/2569', 
    'ป.2/1', 
    'อาริสา ศิลปสุทธาพาสรณ์', 
    array['บูรณาการ (วิทยาศาสตร์)', 'ภาษาไทย', 'คณิตศาสตร์', 'Basic English'],
    '4m829m' -- PIN Hash สำหรับ '1234'
)
on conflict (id) do nothing;

insert into public.subjects (id, name, default_max_score)
values 
    ('subj-1', 'บูรณาการ (วิทยาศาสตร์)', 10),
    ('subj-2', 'คณิตศาสตร์', 20),
    ('subj-3', 'ภาษาไทย', 15),
    ('subj-4', 'Basic English', 10)
on conflict (id) do nothing;
