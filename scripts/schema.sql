-- Student Monitoring System Database Schema
-- Run this in Supabase SQL Editor

-- Table 1: Attendance Records (raw data from CSV)
CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGSERIAL PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL,
  revision_code VARCHAR(10),
  section VARCHAR(10),
  study_code VARCHAR(2),
  student_code VARCHAR(20) NOT NULL,
  class_check_raw TEXT,
  total_sessions INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  leave_count INTEGER DEFAULT 0,
  no_check_count INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2) DEFAULT 0,
  absence_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_student_code ON attendance_records(student_code);
CREATE INDEX IF NOT EXISTS idx_course_code ON attendance_records(course_code);
CREATE INDEX IF NOT EXISTS idx_absence_rate ON attendance_records(absence_rate);

-- Table 2: Student Analytics (aggregated data)
CREATE TABLE IF NOT EXISTS student_analytics (
  id BIGSERIAL PRIMARY KEY,
  student_code VARCHAR(20) UNIQUE NOT NULL,
  total_courses INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_absences INTEGER DEFAULT 0,
  total_late INTEGER DEFAULT 0,
  avg_attendance_rate DECIMAL(5,2) DEFAULT 0,
  avg_absence_rate DECIMAL(5,2) DEFAULT 0,
  risk_level VARCHAR(20), -- 'critical', 'monitor', 'follow_up', 'normal'
  courses_at_risk INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_level ON student_analytics(risk_level);
CREATE INDEX IF NOT EXISTS idx_avg_absence_rate ON student_analytics(avg_absence_rate);

-- Table 3: Course Analytics (aggregated data)
CREATE TABLE IF NOT EXISTS course_analytics (
  id BIGSERIAL PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL,
  revision_code VARCHAR(10),
  section VARCHAR(10),
  study_code VARCHAR(2),
  total_students INTEGER DEFAULT 0,
  students_high_absence INTEGER DEFAULT 0,
  avg_attendance_rate DECIMAL(5,2) DEFAULT 0,
  has_no_checks BOOLEAN DEFAULT FALSE,
  total_sessions INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_code, revision_code, section, study_code)
);

CREATE INDEX IF NOT EXISTS idx_has_no_checks ON course_analytics(has_no_checks);
CREATE INDEX IF NOT EXISTS idx_students_high_absence ON course_analytics(students_high_absence);

COMMENT ON TABLE attendance RECORDS IS 'Raw attendance data from CSV file';
COMMENT ON TABLE student_analytics IS 'Aggregated student statistics for dashboard';
COMMENT ON TABLE course_analytics IS 'Aggregated course statistics for dashboard';
