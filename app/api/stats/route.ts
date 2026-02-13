import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        // Get statistics for dashboard
        const [studentsResult, coursesResult, attendanceResult] = await Promise.all([
            supabase.from('student_analytics').select('risk_level, id, faculty').select(),
            supabase.from('course_analytics').select('has_no_checks, students_high_absence').select(),
            supabase.from('attendance_records').select('id').select()
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
        const totalCourses = courses.length;

        // Total attendance records
        const totalRecords = attendanceResult.data?.length || 0;

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
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
