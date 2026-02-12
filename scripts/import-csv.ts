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

interface CSVRow {
    COURSECODE: string;
    REVISIONCODE: string;
    SECTION: string;
    STUDYCODE: string;
    STUDENTCODE: string;
    CLASSCHECK: string;
}

async function importCSV() {
    console.log('Starting CSV import...\n');

    // Read CSV file
    const csvPath = path.join(process.cwd(), '..', 'studentcheck01.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`Error: CSV file not found at ${csvPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');

    console.log(`Found ${lines.length - 1} rows in CSV file\n`);

    // Clear existing data
    console.log('Clearing existing data...');
    await supabase.from('attendance_records').delete().neq('id', 0);
    await supabase.from('student_analytics').delete().neq('id', 0);
    await supabase.from('course_analytics').delete().neq('id', 0);
    console.log('✓ Cleared existing data\n');

    // Parse and insert attendance records
    console.log('Processing attendance records...');
    const attendanceRecords = [];
    let processedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 6) continue;

        const [courseCode, revisionCode, section, studyCode, studentCode, classCheck] = values;

        // Parse attendance data
        const parsed = parseAttendanceString(classCheck);

        attendanceRecords.push({
            course_code: courseCode,
            revision_code: revisionCode,
            section: section,
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
            absence_rate: parsed.absenceRate
        });

        processedCount++;
        if (processedCount % 1000 === 0) {
            console.log(`  Processed ${processedCount} records...`);
        }
    }

    console.log(`✓ Processed ${processedCount} records\n`);

    // Insert in batches
    console.log('Inserting into database...');
    const batchSize = 500;
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
        const batch = attendanceRecords.slice(i, i + batchSize);
        const { error } = await supabase.from('attendance_records').insert(batch);

        if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        } else {
            console.log(`  Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
        }
    }

    console.log('✓ Inserted attendance records\n');

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
    const { data: students } = await supabase
        .from('attendance_records')
        .select('student_code')
        .order('student_code');

    if (!students) return;

    const uniqueStudents = [...new Set(students.map(s => s.student_code))];
    const studentAnalytics = [];

    for (const studentCode of uniqueStudents) {
        const { data: records } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('student_code', studentCode);

        if (!records || records.length === 0) continue;

        const totalCourses = records.length;
        const totalSessions = records.reduce((sum, r) => sum + r.total_sessions, 0);
        const totalAbsences = records.reduce((sum, r) => sum + r.absent_count, 0);
        const totalLate = records.reduce((sum, r) => sum + r.late_count, 0);
        const avgAttendanceRate = records.reduce((sum, r) => sum + r.attendance_rate, 0) / totalCourses;
        const avgAbsenceRate = records.reduce((sum, r) => sum + r.absence_rate, 0) / totalCourses;
        const riskLevel = calculateStudentRisk(avgAbsenceRate);
        const coursesAtRisk = records.filter(r => r.absence_rate >= 20).length;

        studentAnalytics.push({
            student_code: studentCode,
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

    // Insert student analytics
    const batchSize = 500;
    for (let i = 0; i < studentAnalytics.length; i += batchSize) {
        const batch = studentAnalytics.slice(i, i + batchSize);
        await supabase.from('student_analytics').insert(batch);
    }
}

async function generateCourseAnalytics() {
    const { data: courses } = await supabase
        .from('attendance_records')
        .select('course_code, revision_code, section, study_code');

    if (!courses) return;

    const uniqueCourses = Array.from(
        new Set(courses.map(c => `${c.course_code}_${c.revision_code}_${c.section}_${c.study_code}`))
    );

    const courseAnalytics = [];

    for (const courseKey of uniqueCourses) {
        const [courseCode, revisionCode, section, studyCode] = courseKey.split('_');

        const { data: records } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('course_code', courseCode)
            .eq('revision_code', revisionCode)
            .eq('section', section)
            .eq('study_code', studyCode);

        if (!records || records.length === 0) continue;

        const totalStudents = records.length;
        const studentsHighAbsence = records.filter(r => r.absence_rate >= 30).length;
        const avgAttendanceRate = records.reduce((sum, r) => sum + r.attendance_rate, 0) / totalStudents;
        const hasNoChecks = records.every(r => hasNoAttendanceChecks(r.class_check_raw));
        const totalSessions = records[0].total_sessions;

        courseAnalytics.push({
            course_code: courseCode,
            revision_code: revisionCode,
            section: section,
            study_code: studyCode,
            total_students: totalStudents,
            students_high_absence: studentsHighAbsence,
            avg_attendance_rate: Math.round(avgAttendanceRate * 100) / 100,
            has_no_checks: hasNoChecks,
            total_sessions: totalSessions
        });
    }

    // Insert course analytics
    const batchSize = 500;
    for (let i = 0; i < courseAnalytics.length; i += batchSize) {
        const batch = courseAnalytics.slice(i, i + batchSize);
        await supabase.from('course_analytics').insert(batch);
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
