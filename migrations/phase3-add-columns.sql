-- Phase 3: Enhanced Data Columns Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vblqkkrifonxvxsbcfcv/sql/new

-- ==========================================
-- 1. attendance_records — เพิ่ม 11 คอลัมน์
-- ==========================================
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS year_level INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS advisor_name TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS instructor TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS acad_year INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS semester INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS gpa NUMERIC(3,2);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS course_grade TEXT;

-- ==========================================
-- 2. student_analytics — เพิ่ม 6 คอลัมน์
-- ==========================================
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS faculty TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS year_level INTEGER;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS advisor_name TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS gpa NUMERIC(3,2);

-- ==========================================
-- 3. course_analytics — เพิ่ม 4 คอลัมน์
-- ==========================================
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS instructor TEXT;
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS acad_year INTEGER;
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS semester INTEGER;

-- Verify columns were added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'attendance_records' ORDER BY ordinal_position;
