import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getTrailingAbsences(classCheckRaw: string): number {
    if (!classCheckRaw) return 0;
    const entries = classCheckRaw.split(',').map(s => s.trim().toUpperCase()).filter(e => ['P', 'A', 'L', 'S'].includes(e));
    let count = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i] === 'A') count++;
        else break;
    }
    return count;
}

export async function GET(request: NextRequest) {
    try {
        // Get statistics for dashboard
        const [studentsResult, coursesResult, attendanceResult] = await Promise.all([
            supabase.from('student_analytics').select('risk_level, id, faculty').select(),
            supabase.from('course_analytics').select('has_no_checks, students_high_absence', { count: 'exact' }),
            supabase.from('attendance_records').select('id, student_code, class_check_raw').select()
        ]);

        // Count students by risk level
        const students = studentsResult.data || [];
        const criticalStudents = students.filter(s => s.risk_level === 'critical').length;
        const monitorStudents = students.filter(s => s.risk_level === 'monitor').length;
        const followUpStudents = students.filter(s => s.risk_level === 'follow_up').length;
        const totalStudents = students.length;

        // Count unique faculties
        const uniqueFaculties = new Set(students.map(s => s.faculty).filter(Boolean));

        // Count courses
        const courses = coursesResult.data || [];
        const coursesWithoutChecks = courses.filter(c => c.has_no_checks).length;
        const coursesHighAbsence = courses.filter(c => c.students_high_absence >= 5).length;
        const totalCourses = coursesResult.count || courses.length;

        // Total attendance records
        const allRecords = attendanceResult.data || [];
        const totalRecords = allRecords.length;

        // Count unique students with 3+ consecutive trailing absences
        const studentsWithConsecutive = new Set<string>();
        for (const rec of allRecords) {
            if (rec.class_check_raw && getTrailingAbsences(rec.class_check_raw) >= 3) {
                studentsWithConsecutive.add(rec.student_code);
            }
        }

        return NextResponse.json({
            students: {
                total: totalStudents,
                critical: criticalStudents,
                monitor: monitorStudents,
                followUp: followUpStudents,
                normal: totalStudents - criticalStudents - monitorStudents - followUpStudents
            },
            courses: {
                total: totalCourses,
                withoutChecks: coursesWithoutChecks,
                highAbsence: coursesHighAbsence
            },
            records: {
                total: totalRecords
            },
            faculties: {
                total: uniqueFaculties.size,
                list: Array.from(uniqueFaculties).sort()
            },
            consecutiveAbsence: {
                studentsCount: studentsWithConsecutive.size
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
