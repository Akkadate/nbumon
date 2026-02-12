// TypeScript Types for Student Monitoring System

export type AttendanceStatus = 'P' | 'A' | 'L' | 'S' | '';

export type StudyCode = 'C' | 'L';

export type RiskLevel = 'critical' | 'monitor' | 'follow_up' | 'normal';

export interface AttendanceRecord {
  id: number;
  course_code: string;
  revision_code: string;
  section: string;
  study_code: StudyCode;
  student_code: string;
  class_check_raw: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  no_check_count: number;
  attendance_rate: number;
  absence_rate: number;
  created_at: string;
}

export interface StudentAnalytics {
  id: number;
  student_code: string;
  total_courses: number;
  total_sessions: number;
  total_absences: number;
  total_late: number;
  avg_attendance_rate: number;
  avg_absence_rate: number;
  risk_level: RiskLevel;
  courses_at_risk: number;
  last_updated: string;
}

export interface CourseAnalytics {
  id: number;
  course_code: string;
  revision_code: string;
  section: string;
  study_code: StudyCode;
  total_students: number;
  students_high_absence: number;
  avg_attendance_rate: number;
  has_no_checks: boolean;
  total_sessions: number;
  last_updated: string;
}

export interface ParsedAttendance {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  noCheckCount: number;
  attendanceRate: number;
  absenceRate: number;
  sessions: AttendanceStatus[];
}

export interface StudentWithCourses extends StudentAnalytics {
  courses: AttendanceRecord[];
}

export interface CourseWithStudents extends CourseAnalytics {
  students: AttendanceRecord[];
}
