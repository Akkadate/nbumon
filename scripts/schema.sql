-- Student Monitoring System Database Schema (University PostgreSQL)
-- รัน script นี้เมื่อติดตั้งระบบครั้งแรก
-- ใช้คู่กับ setup-db-functions.sql

-- Table 1: Attendance Records (raw data from CSV)
CREATE TABLE IF NOT EXISTS attendance_records (
    id               BIGSERIAL PRIMARY KEY,
    course_code      VARCHAR(20)    NOT NULL,
    revision_code    VARCHAR(10),
    section          VARCHAR(10),
    study_code       VARCHAR(2),
    student_code     VARCHAR(20)    NOT NULL,
    class_check_raw  TEXT,
    total_sessions   INTEGER        DEFAULT 0,
    present_count    INTEGER        DEFAULT 0,
    absent_count     INTEGER        DEFAULT 0,
    late_count       INTEGER        DEFAULT 0,
    leave_count      INTEGER        DEFAULT 0,
    no_check_count   INTEGER        DEFAULT 0,
    attendance_rate  DECIMAL(5,2)   DEFAULT 0,
    absence_rate     DECIMAL(5,2)   DEFAULT 0,
    trailing_absences INTEGER       DEFAULT 0,  -- ขาดติดต่อกัน (เก็บไว้เพื่อ query เร็ว)
    -- Enhanced fields from CSV
    student_name     VARCHAR(200),
    faculty          VARCHAR(200),
    department       VARCHAR(200),
    year_level       INTEGER,
    advisor_name     VARCHAR(200),
    course_name      VARCHAR(200),
    instructor       VARCHAR(200),
    acad_year        INTEGER,
    semester         INTEGER,
    gpa              DECIMAL(4,2),
    course_grade     VARCHAR(5),
    created_at       TIMESTAMP      DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_student_code    ON attendance_records(student_code);
CREATE INDEX IF NOT EXISTS idx_att_course_code     ON attendance_records(course_code);
CREATE INDEX IF NOT EXISTS idx_att_absence_rate    ON attendance_records(absence_rate);
CREATE INDEX IF NOT EXISTS idx_att_faculty         ON attendance_records(faculty);
CREATE INDEX IF NOT EXISTS idx_att_advisor         ON attendance_records(advisor_name);
CREATE INDEX IF NOT EXISTS idx_att_trailing        ON attendance_records(trailing_absences DESC);

-- Table 2: Student Analytics (aggregated per student)
CREATE TABLE IF NOT EXISTS student_analytics (
    id                  BIGSERIAL PRIMARY KEY,
    student_code        VARCHAR(20)  UNIQUE NOT NULL,
    student_name        VARCHAR(200),
    faculty             VARCHAR(200),
    department          VARCHAR(200),
    year_level          INTEGER,
    advisor_name        VARCHAR(200),
    gpa                 DECIMAL(4,2),
    total_courses       INTEGER      DEFAULT 0,
    total_sessions      INTEGER      DEFAULT 0,
    total_absences      INTEGER      DEFAULT 0,
    total_late          INTEGER      DEFAULT 0,
    avg_attendance_rate DECIMAL(5,2) DEFAULT 0,
    avg_absence_rate    DECIMAL(5,2) DEFAULT 0,
    risk_level          VARCHAR(20),  -- 'critical', 'monitor', 'follow_up', 'normal'
    courses_at_risk     INTEGER      DEFAULT 0,
    last_updated        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_risk_level     ON student_analytics(risk_level);
CREATE INDEX IF NOT EXISTS idx_sa_absence_rate   ON student_analytics(avg_absence_rate DESC);
CREATE INDEX IF NOT EXISTS idx_sa_faculty        ON student_analytics(faculty);
CREATE INDEX IF NOT EXISTS idx_sa_advisor        ON student_analytics(advisor_name);
CREATE INDEX IF NOT EXISTS idx_sa_year_level     ON student_analytics(year_level);

-- Table 3: Course Analytics (aggregated per course)
CREATE TABLE IF NOT EXISTS course_analytics (
    id                   BIGSERIAL PRIMARY KEY,
    course_code          VARCHAR(20)  NOT NULL,
    revision_code        VARCHAR(10),
    section              VARCHAR(10),
    study_code           VARCHAR(2),
    course_name          VARCHAR(200),
    instructor           VARCHAR(200),
    faculty              VARCHAR(200),
    acad_year            INTEGER,
    semester             INTEGER,
    total_students       INTEGER      DEFAULT 0,
    students_high_absence INTEGER     DEFAULT 0,
    avg_attendance_rate  DECIMAL(5,2) DEFAULT 0,
    has_no_checks        BOOLEAN      DEFAULT FALSE,
    total_sessions       INTEGER      DEFAULT 0,
    trend                VARCHAR(10)  DEFAULT 'stable', -- 'up', 'down', 'stable'
    last_updated         TIMESTAMP    DEFAULT NOW(),
    UNIQUE(course_code, revision_code, section, study_code)
);

CREATE INDEX IF NOT EXISTS idx_ca_has_no_checks  ON course_analytics(has_no_checks);
CREATE INDEX IF NOT EXISTS idx_ca_faculty        ON course_analytics(faculty);
CREATE INDEX IF NOT EXISTS idx_ca_high_absence   ON course_analytics(students_high_absence DESC);

-- Table 4: LINE Student Mapping
CREATE TABLE IF NOT EXISTS line_students (
    id             BIGSERIAL PRIMARY KEY,
    line_user_id   VARCHAR(100) UNIQUE NOT NULL,
    student_code   VARCHAR(20)  NOT NULL,
    display_name   VARCHAR(200),
    picture_url    TEXT,
    registered_at  TIMESTAMP    DEFAULT NOW(),
    updated_at     TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_user_id      ON line_students(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_student_code ON line_students(student_code);
