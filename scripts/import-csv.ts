import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseAttendanceString, calculateStudentRisk, hasNoAttendanceChecks } from '../lib/analytics';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    });
}

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced CSV structure (16 columns)
interface CSVRow {
    STUDENTCODE: string;
    STUDENT_NAME: string;
    FACULTY: string;
    DEPARTMENT: string;
    YEAR_LEVEL: string;
    ADVISOR_NAME: string;
    COURSECODE: string;
    COURSE_NAME: string;
    SECTION: string;
    INSTRUCTOR: string;
    ACADYEAR: string;
    SEMESTER: string;
    STUDYCODE: string;
    CLASSCHECK: string;
    GPA: string;
    COURSE_GRADE: string;
}

async function importCSV() {
    console.log('Starting CSV import (Phase 3 - Enhanced Data)...\n');

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'studentcheckv2.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`Error: CSV file not found at ${csvPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = parseCSVLine(lines[0]);

    console.log(`CSV Headers: ${headers.join(', ')}`);
    console.log(`Found ${lines.length - 1} rows in CSV file\n`);

    // Build header index map for flexible column mapping
    const headerIndex: Record<string, number> = {};
    headers.forEach((h, i) => {
        headerIndex[h.trim().replace(/\r/g, '')] = i;
    });

    // Validate required headers
    const requiredHeaders = ['STUDENTCODE', 'COURSECODE', 'CLASSCHECK', 'STUDYCODE', 'SECTION'];
    for (const h of requiredHeaders) {
        if (!(h in headerIndex)) {
            console.error(`Error: Missing required header: ${h}`);
            console.error(`Available headers: ${Object.keys(headerIndex).join(', ')}`);
            process.exit(1);
        }
    }

    // Clear existing data
    console.log('Clearing existing data...');
    await supabase.from('attendance_records').delete().neq('id', 0);
    await supabase.from('student_analytics').delete().neq('id', 0);
    await supabase.from('course_analytics').delete().neq('id', 0);
    console.log('✓ Cleared existing data\n');

    // Parse and insert attendance records
    console.log('Processing attendance records...');
    const attendanceRecords: any[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 13) {
            skippedCount++;
            continue;
        }

        const get = (col: string) => {
            const idx = headerIndex[col];
            return idx !== undefined ? (values[idx] || '').trim() : '';
        };

        const studentCode = get('STUDENTCODE');
        const courseCode = get('COURSECODE');
        const classCheck = get('CLASSCHECK');
        const studyCode = get('STUDYCODE');

        if (!studentCode || !courseCode) {
            skippedCount++;
            continue;
        }

        // Parse attendance data
        const parsed = parseAttendanceString(classCheck);

        // Parse numeric fields
        const yearLevel = parseInt(get('YEAR_LEVEL')) || null;
        const acadYear = parseInt(get('ACADYEAR')) || null;
        const semester = parseInt(get('SEMESTER')) || null;
        const gpaStr = get('GPA');
        const gpa = gpaStr ? parseFloat(gpaStr) : null;

        attendanceRecords.push({
            course_code: courseCode,
            revision_code: get('COURSE_NAME') ? courseCode.split('.')[1] || '' : '',
            section: get('SECTION'),
            study_code: studyCode,
            student_code: studentCode,
            class_check_raw: classCheck,
            total_sessions: parsed.totalSessions,
            present_count: parsed.presentCount,
            absent_count: parsed.absentCount,
            late_count: parsed.lateCount,
            leave_count: parsed.leaveCount,
            no_check_count: parsed.noCheckCount,
            attendance_rate: parsed.attendanceRate,
            absence_rate: parsed.absenceRate,
            // New enhanced fields
            student_name: get('STUDENT_NAME') || null,
            faculty: get('FACULTY') || null,
            department: get('DEPARTMENT') || null,
            year_level: yearLevel,
            advisor_name: get('ADVISOR_NAME') || null,
            course_name: get('COURSE_NAME') || null,
            instructor: get('INSTRUCTOR') || null,
            acad_year: acadYear,
            semester: semester,
            gpa: gpa,
            course_grade: get('COURSE_GRADE') || null,
        });

        processedCount++;
        if (processedCount % 2000 === 0) {
            console.log(`  Processed ${processedCount} records...`);
        }
    }

    console.log(`✓ Processed ${processedCount} records (skipped ${skippedCount})\n`);

    // Insert in batches
    console.log('Inserting into database...');
    const batchSize = 500;
    let insertedCount = 0;
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
        const batch = attendanceRecords.slice(i, i + batchSize);
        const { error } = await supabase.from('attendance_records').insert(batch);

        if (error) {
            console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
            // Show first record of failing batch for debugging
            if (batch.length > 0) {
                console.error('  Sample record:', JSON.stringify(batch[0], null, 2).substring(0, 200));
            }
        } else {
            insertedCount += batch.length;
            console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records) — total: ${insertedCount}`);
        }
    }

    console.log(`✓ Inserted ${insertedCount} attendance records\n`);

    // Generate student analytics
    console.log('Generating student analytics...');
    await generateStudentAnalytics();
    console.log('✓ Generated student analytics\n');

    // Generate course analytics
    console.log('Generating course analytics...');
    await generateCourseAnalytics();
    console.log('✓ Generated course analytics\n');

    console.log('Import completed successfully!');
}

async function generateStudentAnalytics() {
    // Fetch all attendance records with enhanced fields
    const { data: allRecords } = await supabase
        .from('attendance_records')
        .select('student_code, student_name, faculty, department, year_level, advisor_name, gpa, total_sessions, absent_count, late_count, attendance_rate, absence_rate, class_check_raw')
        .order('student_code');

    if (!allRecords || allRecords.length === 0) return;

    // Group by student
    const studentMap = new Map<string, typeof allRecords>();
    for (const record of allRecords) {
        const existing = studentMap.get(record.student_code) || [];
        existing.push(record);
        studentMap.set(record.student_code, existing);
    }

    const studentAnalytics: any[] = [];

    for (const [studentCode, records] of studentMap) {
        const totalCourses = records.length;
        const totalSessions = records.reduce((sum, r) => sum + r.total_sessions, 0);
        const totalAbsences = records.reduce((sum, r) => sum + r.absent_count, 0);
        const totalLate = records.reduce((sum, r) => sum + r.late_count, 0);
        const avgAttendanceRate = records.reduce((sum, r) => sum + r.attendance_rate, 0) / totalCourses;
        const avgAbsenceRate = records.reduce((sum, r) => sum + r.absence_rate, 0) / totalCourses;
        const riskLevel = calculateStudentRisk(avgAbsenceRate);
        const coursesAtRisk = records.filter(r => r.absence_rate >= 20).length;

        // Use the first record's student info (same across all courses)
        const firstRecord = records[0];

        studentAnalytics.push({
            student_code: studentCode,
            student_name: firstRecord.student_name || null,
            faculty: firstRecord.faculty || null,
            department: firstRecord.department || null,
            year_level: firstRecord.year_level || null,
            advisor_name: firstRecord.advisor_name || null,
            gpa: firstRecord.gpa || null,
            total_courses: totalCourses,
            total_sessions: totalSessions,
            total_absences: totalAbsences,
            total_late: totalLate,
            avg_attendance_rate: Math.round(avgAttendanceRate * 100) / 100,
            avg_absence_rate: Math.round(avgAbsenceRate * 100) / 100,
            risk_level: riskLevel,
            courses_at_risk: coursesAtRisk
        });
    }

    console.log(`  Found ${studentAnalytics.length} unique students`);

    // Insert student analytics in batches
    const batchSize = 500;
    for (let i = 0; i < studentAnalytics.length; i += batchSize) {
        const batch = studentAnalytics.slice(i, i + batchSize);
        const { error } = await supabase.from('student_analytics').insert(batch);
        if (error) {
            console.error(`  Error inserting student analytics batch:`, error.message);
        }
    }
}

async function generateCourseAnalytics() {
    // Fetch all attendance records with enhanced fields
    const { data: allRecords } = await supabase
        .from('attendance_records')
        .select('course_code, revision_code, section, study_code, course_name, instructor, acad_year, semester, total_sessions, attendance_rate, absence_rate, class_check_raw, students_high_absence:absent_count')
        .order('course_code');

    if (!allRecords || allRecords.length === 0) return;

    // Group by course key
    const courseMap = new Map<string, any[]>();
    for (const record of allRecords) {
        const key = `${record.course_code}_${record.section}_${record.study_code}`;
        const existing = courseMap.get(key) || [];
        existing.push(record);
        courseMap.set(key, existing);
    }

    const courseAnalytics: any[] = [];

    for (const [, records] of courseMap) {
        const firstRecord = records[0];
        const totalStudents = records.length;
        const studentsHighAbsence = records.filter(r => r.absence_rate >= 30).length;
        const avgAttendanceRate = records.reduce((sum, r) => sum + r.attendance_rate, 0) / totalStudents;
        const hasNoChecks = records.every(r => hasNoAttendanceChecks(r.class_check_raw));
        const totalSessions = firstRecord.total_sessions;

        courseAnalytics.push({
            course_code: firstRecord.course_code,
            revision_code: firstRecord.revision_code,
            section: firstRecord.section,
            study_code: firstRecord.study_code,
            course_name: firstRecord.course_name || null,
            instructor: firstRecord.instructor || null,
            acad_year: firstRecord.acad_year || null,
            semester: firstRecord.semester || null,
            total_students: totalStudents,
            students_high_absence: studentsHighAbsence,
            avg_attendance_rate: Math.round(avgAttendanceRate * 100) / 100,
            has_no_checks: hasNoChecks,
            total_sessions: totalSessions
        });
    }

    console.log(`  Found ${courseAnalytics.length} unique courses`);

    // Insert course analytics in batches
    const batchSize = 500;
    for (let i = 0; i < courseAnalytics.length; i += batchSize) {
        const batch = courseAnalytics.slice(i, i + batchSize);
        const { error } = await supabase.from('course_analytics').insert(batch);
        if (error) {
            console.error(`  Error inserting course analytics batch:`, error.message);
        }
    }
}

// Helper function to parse CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

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

// Run the import
importCSV().catch(console.error);
