import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { hasNoAttendanceChecks } from '../lib/analytics';

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
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function recalculateAnalytics() {
    console.log('Starting analytics recalculation...\n');

    // 1. Clear existing course analytics
    console.log('Clearing existing course analytics...');
    const { error: deleteError } = await supabase.from('course_analytics').delete().neq('id', 0);
    if (deleteError) {
        console.error('Error clearing data:', deleteError);
        return;
    }
    console.log('✓ Cleared course_analytics\n');

    // 2. Fetch all attendance records
    console.log('Fetching attendance records...');
    const allRecords = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: batch, error: fetchError } = await supabase
            .from('attendance_records')
            .select('course_code, revision_code, section, study_code, course_name, instructor, faculty, acad_year, semester, total_sessions, attendance_rate, absence_rate, class_check_raw, absent_count')
            .order('course_code')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fetchError) {
            console.error('Error fetching records:', fetchError);
            return;
        }

        if (batch && batch.length > 0) {
            allRecords.push(...batch);
            page++;
            console.log(`  Fetched page ${page} (${batch.length} records)...`);
            if (batch.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`✓ Fetched ${allRecords.length} records\n`);

    // 3. Group by course key (Make sure key is unique per course-section)
    const courseMap = new Map<string, any[]>();
    for (const record of allRecords) {
        // Key must match uniqueness constraint: course_code, revision_code, section, study_code
        // Handle nulls safely
        const key = `${record.course_code}|${record.revision_code || ''}|${record.section}|${record.study_code}`;

        const existing = courseMap.get(key) || [];
        existing.push(record);
        courseMap.set(key, existing);
    }

    console.log(`Found ${courseMap.size} unique courses\n`);

    // 4. Generate analytics data
    const courseAnalytics = [];
    for (const [key, records] of courseMap) {
        const firstRecord = records[0];
        const totalStudents = records.length;

        // Count students with >= 5 absences (Critical) or rate < 50%
        // Adjust logic to match dashboard requirements
        const studentsHighAbsence = records.filter(r => r.absence_rate >= 20).length;

        // Average attendance rate
        const avgAttendanceRate = records.reduce((sum, r) => sum + (r.attendance_rate || 0), 0) / totalStudents;

        // Check if no checks
        const hasNoChecks = records.every(r => hasNoAttendanceChecks(r.class_check_raw));

        courseAnalytics.push({
            course_code: firstRecord.course_code,
            revision_code: firstRecord.revision_code || '',
            section: firstRecord.section,
            study_code: firstRecord.study_code,
            course_name: firstRecord.course_name || null,
            instructor: firstRecord.instructor || null,
            faculty: firstRecord.faculty || null,
            acad_year: firstRecord.acad_year || null,
            semester: firstRecord.semester || null,
            total_students: totalStudents,
            students_high_absence: studentsHighAbsence,
            avg_attendance_rate: Math.round(avgAttendanceRate * 100) / 100,
            has_no_checks: hasNoChecks,
            total_sessions: firstRecord.total_sessions || 0,
            last_updated: new Date().toISOString()
        });
    }

    // 5. Insert in batches
    console.log('Inserting course analytics...');
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < courseAnalytics.length; i += batchSize) {
        const batch = courseAnalytics.slice(i, i + batchSize);
        const { error } = await supabase.from('course_analytics').insert(batch);

        if (error) {
            console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
            // Log first item of failed batch
            console.log('Sample failed item:', batch[0]);
        } else {
            insertedCount += batch.length;
            process.stdout.write(`.`);
        }
    }

    console.log(`\n\n✓ Successfully inserted ${insertedCount} course analytics records`);
}

recalculateAnalytics().catch(console.error);
