-- =============================================================
-- Student Monitoring System — PostgreSQL Database Functions
-- รัน script นี้ใน university PostgreSQL ก่อนเริ่มใช้ระบบ
-- =============================================================

-- Migration: เพิ่มคอลัมน์ที่อาจขาดหาย (safe for existing databases)
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS trailing_absences INTEGER DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS student_name  VARCHAR(200);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS faculty       VARCHAR(200);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS department    VARCHAR(200);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS year_level    INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS advisor_name  VARCHAR(200);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS course_name   VARCHAR(200);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS instructor    VARCHAR(200);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS acad_year     INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS semester      INTEGER;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS gpa           DECIMAL(4,2);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS course_grade  VARCHAR(5);

ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS student_name  VARCHAR(200);
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS faculty       VARCHAR(200);
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS department    VARCHAR(200);
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS year_level    INTEGER;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS advisor_name  VARCHAR(200);
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS gpa           DECIMAL(4,2);
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS total_courses  INTEGER DEFAULT 0;

ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS course_name   VARCHAR(200);
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS instructor    VARCHAR(200);
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS faculty       VARCHAR(200);
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS acad_year     INTEGER;
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS semester      INTEGER;
ALTER TABLE course_analytics ADD COLUMN IF NOT EXISTS trend         VARCHAR(10) DEFAULT 'stable';

CREATE TABLE IF NOT EXISTS line_students (
    id             BIGSERIAL PRIMARY KEY,
    line_user_id   VARCHAR(100) UNIQUE NOT NULL,
    student_code   VARCHAR(20)  NOT NULL,
    display_name   VARCHAR(200),
    picture_url    TEXT,
    registered_at  TIMESTAMP    DEFAULT NOW(),
    updated_at     TIMESTAMP    DEFAULT NOW()
);

-- ============================================================

-- ฟังก์ชัน: นับจำนวนครั้งขาดเรียนติดต่อกัน (trailing)
-- Logic เหมือนกับ JavaScript getTrailingAbsences() เดิม:
--   - กรองเฉพาะ P, A, L, S (ข้าม empty)
--   - นับ A ต่อเนื่องจากท้ายสุด จนกว่าจะเจอตัวอื่น
CREATE OR REPLACE FUNCTION count_trailing_absences(class_check TEXT)
RETURNS INTEGER AS $$
DECLARE
    all_entries  TEXT[];
    filtered     TEXT[] := '{}';
    entry        TEXT;
    i            INTEGER;
    cnt          INTEGER := 0;
BEGIN
    IF class_check IS NULL OR TRIM(class_check) = '' THEN
        RETURN 0;
    END IF;

    -- ลบ double-quotes แล้ว split ด้วย comma
    all_entries := string_to_array(REPLACE(class_check, '"', ''), ',');

    -- กรองเฉพาะ P, A, L, S (ตรงกับ JS filter)
    FOREACH entry IN ARRAY all_entries LOOP
        IF UPPER(TRIM(entry)) = ANY(ARRAY['P','A','L','S']) THEN
            filtered := array_append(filtered, UPPER(TRIM(entry)));
        END IF;
    END LOOP;

    IF array_length(filtered, 1) IS NULL THEN
        RETURN 0;
    END IF;

    -- นับ A ต่อเนื่องจากท้าย
    FOR i IN REVERSE array_length(filtered, 1)..1 LOOP
        IF filtered[i] = 'A' THEN
            cnt := cnt + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    RETURN cnt;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ทดสอบฟังก์ชัน (ผลลัพธ์ควรเป็น 3)
-- SELECT count_trailing_absences('P,A,P,L,A,A,A');

-- Index เพื่อเร่ง query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_attendance_student      ON attendance_records(student_code);
CREATE INDEX IF NOT EXISTS idx_attendance_course       ON attendance_records(course_code);
CREATE INDEX IF NOT EXISTS idx_attendance_absence_rate ON attendance_records(absence_rate);
CREATE INDEX IF NOT EXISTS idx_attendance_faculty      ON attendance_records(faculty);
CREATE INDEX IF NOT EXISTS idx_attendance_advisor      ON attendance_records(advisor_name);

CREATE INDEX IF NOT EXISTS idx_student_risk_level      ON student_analytics(risk_level);
CREATE INDEX IF NOT EXISTS idx_student_absence_rate    ON student_analytics(avg_absence_rate DESC);
CREATE INDEX IF NOT EXISTS idx_student_faculty         ON student_analytics(faculty);
CREATE INDEX IF NOT EXISTS idx_student_advisor         ON student_analytics(advisor_name);
CREATE INDEX IF NOT EXISTS idx_student_year            ON student_analytics(year_level);

CREATE INDEX IF NOT EXISTS idx_course_has_no_checks    ON course_analytics(has_no_checks);
CREATE INDEX IF NOT EXISTS idx_course_faculty          ON course_analytics(faculty);

CREATE INDEX IF NOT EXISTS idx_line_line_user_id       ON line_students(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_student_code       ON line_students(student_code);
CREATE INDEX IF NOT EXISTS idx_attendance_trailing     ON attendance_records(trailing_absences DESC);
