/**
 * CSV Import Script — University PostgreSQL version
 *
 * เปลี่ยนจาก Supabase client → pg (direct PostgreSQL)
 * ปรับปรุงประสิทธิภาพ:
 *   - unnest() bulk insert: ส่งข้อมูลทั้งหมดใน 1 query แทนการ loop batch
 *   - INSERT ... SELECT สำหรับ analytics: ไม่ต้อง fetch ข้อมูลกลับมา JS แล้วส่งกลับ
 *   - คำนวณ trailing_absences ระหว่าง parse CSV เพื่อเก็บในคอลัมน์ (ไม่ต้องคำนวณ runtime)
 *
 * Usage: npx ts-node scripts/import-csv.ts [path-to-csv]
 *        npm run import:csv -- studentcheckv2.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
                const key   = trimmed.slice(0, eqIdx).trim();
                const value = trimmed.slice(eqIdx + 1).trim();
                if (key && value) process.env[key] = value;
            }
        }
    }
}

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL not found in .env.local');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ---------------------------------------------------------------------------
// Attendance parsing helpers
// ---------------------------------------------------------------------------

function parseAttendance(classCheck: string) {
    if (!classCheck || classCheck.trim() === '') {
        return { totalSessions: 0, presentCount: 0, absentCount: 0, lateCount: 0, leaveCount: 0, noCheckCount: 0, attendanceRate: 0, absenceRate: 0 };
    }
    const sessions = classCheck.replace(/"/g, '').split(',');
    let presentCount = 0, absentCount = 0, lateCount = 0, leaveCount = 0, noCheckCount = 0;
    for (const s of sessions) {
        switch (s.trim()) {
            case 'P': presentCount++;  break;
            case 'A': absentCount++;  break;
            case 'L': lateCount++;    break;
            case 'S': leaveCount++;   break;
            default:  noCheckCount++; break;
        }
    }
    const totalSessions  = sessions.length;
    const validSessions  = totalSessions - noCheckCount;
    const attendanceRate = validSessions > 0 ? Math.round((presentCount / validSessions) * 10000) / 100 : 0;
    const absenceRate    = validSessions > 0 ? Math.round((absentCount  / validSessions) * 10000) / 100 : 0;
    return { totalSessions, presentCount, absentCount, lateCount, leaveCount, noCheckCount, attendanceRate, absenceRate };
}

/** Count consecutive absences from the END of the attendance string (mirrors count_trailing_absences SQL function) */
function getTrailingAbsences(classCheck: string): number {
    if (!classCheck || classCheck.trim() === '') return 0;
    const entries = classCheck.replace(/"/g, '').split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => ['P', 'A', 'L', 'S'].includes(s));
    let cnt = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i] === 'A') cnt++;
        else break;
    }
    return cnt;
}

/** Parse a CSV line, respecting double-quoted fields */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current  = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

async function importCSV() {
    const csvArg  = process.argv[2];
    const csvPath = csvArg ? path.resolve(csvArg) : path.join(process.cwd(), 'studentcheckv2.csv');

    console.log(`Reading CSV: ${csvPath}`);
    if (!fs.existsSync(csvPath)) {
        console.error(`Error: CSV file not found at ${csvPath}`);
        process.exit(1);
    }

    const lines   = fs.readFileSync(csvPath, 'utf-8').split('\n');
    const headers = parseCSVLine(lines[0]);

    const headerIndex: Record<string, number> = {};
    headers.forEach((h, i) => { headerIndex[h.trim().replace(/\r/g, '')] = i; });

    console.log(`Headers  : ${Object.keys(headerIndex).join(', ')}`);
    console.log(`CSV rows : ${lines.length - 1}\n`);

    const required = ['STUDENTCODE', 'COURSECODE', 'CLASSCHECK', 'STUDYCODE', 'SECTION'];
    for (const h of required) {
        if (!(h in headerIndex)) {
            console.error(`Missing required column: ${h}  (found: ${Object.keys(headerIndex).join(', ')})`);
            process.exit(1);
        }
    }

    // -----------------------------------------------------------------------
    // Parse CSV → columnar arrays for unnest() bulk insert
    // -----------------------------------------------------------------------
    const cols = {
        course_code:       [] as (string | null)[],
        revision_code:     [] as (string | null)[],
        section:           [] as (string | null)[],
        study_code:        [] as (string | null)[],
        student_code:      [] as (string | null)[],
        class_check_raw:   [] as (string | null)[],
        total_sessions:    [] as number[],
        present_count:     [] as number[],
        absent_count:      [] as number[],
        late_count:        [] as number[],
        leave_count:       [] as number[],
        no_check_count:    [] as number[],
        attendance_rate:   [] as number[],
        absence_rate:      [] as number[],
        trailing_absences: [] as number[],
        student_name:      [] as (string | null)[],
        faculty:           [] as (string | null)[],
        department:        [] as (string | null)[],
        year_level:        [] as (number | null)[],
        advisor_name:      [] as (string | null)[],
        course_name:       [] as (string | null)[],
        instructor:        [] as (string | null)[],
        acad_year:         [] as (number | null)[],
        semester:          [] as (number | null)[],
        gpa:               [] as (number | null)[],
        course_grade:      [] as (string | null)[],
    };

    let processedCount = 0;
    let skippedCount   = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 13) { skippedCount++; continue; }

        const get = (col: string): string => {
            const idx = headerIndex[col];
            return idx !== undefined ? (values[idx] || '').trim() : '';
        };

        const studentCode = get('STUDENTCODE');
        const courseCode  = get('COURSECODE');
        if (!studentCode || !courseCode) { skippedCount++; continue; }

        const classCheck = get('CLASSCHECK');
        const parsed     = parseAttendance(classCheck);
        const trailing   = getTrailingAbsences(classCheck);

        cols.course_code.push(courseCode);
        cols.revision_code.push(courseCode.includes('.') ? (courseCode.split('.')[1] || '') : '');
        cols.section.push(get('SECTION') || null);
        cols.study_code.push(get('STUDYCODE') || null);
        cols.student_code.push(studentCode);
        cols.class_check_raw.push(classCheck || null);
        cols.total_sessions.push(parsed.totalSessions);
        cols.present_count.push(parsed.presentCount);
        cols.absent_count.push(parsed.absentCount);
        cols.late_count.push(parsed.lateCount);
        cols.leave_count.push(parsed.leaveCount);
        cols.no_check_count.push(parsed.noCheckCount);
        cols.attendance_rate.push(parsed.attendanceRate);
        cols.absence_rate.push(parsed.absenceRate);
        cols.trailing_absences.push(trailing);
        cols.student_name.push(get('STUDENT_NAME') || null);
        cols.faculty.push(get('FACULTY') || null);
        cols.department.push(get('DEPARTMENT') || null);
        cols.year_level.push(parseInt(get('YEAR_LEVEL')) || null);
        cols.advisor_name.push(get('ADVISOR_NAME') || null);
        cols.course_name.push(get('COURSE_NAME') || null);
        cols.instructor.push(get('INSTRUCTOR') || null);
        cols.acad_year.push(parseInt(get('ACADYEAR')) || null);
        cols.semester.push(parseInt(get('SEMESTER')) || null);
        const gpaStr = get('GPA');
        cols.gpa.push(gpaStr ? (parseFloat(gpaStr) || null) : null);
        cols.course_grade.push(get('COURSE_GRADE') || null);

        processedCount++;
        if (processedCount % 2000 === 0) console.log(`  Parsed ${processedCount} records...`);
    }

    console.log(`\n✓ Parsed ${processedCount} records (skipped ${skippedCount})\n`);
    if (processedCount === 0) {
        console.error('No valid records found. Aborting.');
        process.exit(1);
    }

    // -----------------------------------------------------------------------
    // Database operations inside a single transaction
    // -----------------------------------------------------------------------
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Clear existing data atomically
        console.log('Clearing existing data...');
        await client.query(
            'TRUNCATE TABLE attendance_records, student_analytics, course_analytics'
        );
        console.log('✓ Cleared\n');

        // 2. Bulk insert via unnest() — single round-trip for all rows
        console.log(`Inserting ${processedCount} attendance records...`);
        const t0 = Date.now();
        await client.query(
            `INSERT INTO attendance_records (
                course_code, revision_code, section, study_code, student_code,
                class_check_raw, total_sessions, present_count, absent_count,
                late_count, leave_count, no_check_count, attendance_rate, absence_rate,
                trailing_absences, student_name, faculty, department, year_level,
                advisor_name, course_name, instructor, acad_year, semester, gpa, course_grade
            )
            SELECT * FROM unnest(
                $1::varchar[],  $2::varchar[],  $3::varchar[],  $4::varchar[],  $5::varchar[],
                $6::text[],     $7::int[],      $8::int[],      $9::int[],
                $10::int[],     $11::int[],     $12::int[],     $13::numeric[], $14::numeric[],
                $15::int[],     $16::varchar[], $17::varchar[], $18::varchar[], $19::int[],
                $20::varchar[], $21::varchar[], $22::varchar[], $23::int[],     $24::int[],
                $25::numeric[], $26::varchar[]
            ) AS t(
                course_code, revision_code, section, study_code, student_code,
                class_check_raw, total_sessions, present_count, absent_count,
                late_count, leave_count, no_check_count, attendance_rate, absence_rate,
                trailing_absences, student_name, faculty, department, year_level,
                advisor_name, course_name, instructor, acad_year, semester, gpa, course_grade
            )`,
            [
                cols.course_code,       cols.revision_code,  cols.section,         cols.study_code,      cols.student_code,
                cols.class_check_raw,   cols.total_sessions, cols.present_count,   cols.absent_count,
                cols.late_count,        cols.leave_count,    cols.no_check_count,  cols.attendance_rate, cols.absence_rate,
                cols.trailing_absences, cols.student_name,   cols.faculty,         cols.department,      cols.year_level,
                cols.advisor_name,      cols.course_name,    cols.instructor,      cols.acad_year,       cols.semester,
                cols.gpa,               cols.course_grade,
            ]
        );
        console.log(`✓ Inserted attendance records in ${Date.now() - t0}ms\n`);

        // 3. Generate student_analytics via SQL INSERT ... SELECT — no JS loops, no extra round-trips
        console.log('Generating student analytics...');
        const t1 = Date.now();
        const { rowCount: saCount } = await client.query(
            `INSERT INTO student_analytics (
                student_code, student_name, faculty, department, year_level, advisor_name, gpa,
                total_courses, total_sessions, total_absences, total_late,
                avg_attendance_rate, avg_absence_rate, risk_level, courses_at_risk
            )
            SELECT
                student_code,
                MAX(student_name),
                MAX(faculty),
                MAX(department),
                MAX(year_level),
                MAX(advisor_name),
                MAX(gpa),
                COUNT(*)::int,
                SUM(total_sessions)::int,
                SUM(absent_count)::int,
                SUM(late_count)::int,
                ROUND(AVG(attendance_rate)::numeric, 2),
                ROUND(AVG(absence_rate)::numeric, 2),
                CASE
                    WHEN AVG(absence_rate) >= 40 THEN 'critical'
                    WHEN AVG(absence_rate) >= 20 THEN 'monitor'
                    WHEN AVG(absence_rate) >= 10 THEN 'follow_up'
                    ELSE 'normal'
                END,
                COUNT(CASE WHEN absence_rate >= 20 THEN 1 END)::int
            FROM attendance_records
            GROUP BY student_code`
        );
        console.log(`✓ Generated ${saCount} student analytics records in ${Date.now() - t1}ms\n`);

        // 4. Generate course_analytics via SQL INSERT ... SELECT
        console.log('Generating course analytics...');
        const t2 = Date.now();
        const { rowCount: caCount } = await client.query(
            `INSERT INTO course_analytics (
                course_code, revision_code, section, study_code,
                course_name, instructor, faculty, acad_year, semester,
                total_students, students_high_absence,
                avg_attendance_rate, has_no_checks, total_sessions
            )
            SELECT
                course_code,
                revision_code,
                section,
                study_code,
                MAX(course_name),
                MAX(instructor),
                MAX(faculty),
                MAX(acad_year),
                MAX(semester),
                COUNT(*)::int,
                COUNT(CASE WHEN absence_rate >= 30 THEN 1 END)::int,
                ROUND(AVG(attendance_rate)::numeric, 2),
                BOOL_AND(
                    class_check_raw IS NULL OR
                    TRIM(REPLACE(REPLACE(class_check_raw, '"', ''), ',', '')) = ''
                ),
                MAX(total_sessions)::int
            FROM attendance_records
            GROUP BY course_code, revision_code, section, study_code`
        );
        console.log(`✓ Generated ${caCount} course analytics records in ${Date.now() - t2}ms\n`);

        await client.query('COMMIT');
        console.log('=== Import completed successfully! ===');
        console.log(`  Attendance records : ${processedCount}`);
        console.log(`  Student analytics  : ${saCount}`);
        console.log(`  Course analytics   : ${caCount}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nImport failed — rolled back all changes.');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

importCSV().catch(console.error);
