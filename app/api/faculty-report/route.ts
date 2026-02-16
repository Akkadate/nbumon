import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const faculty = searchParams.get('faculty');
    // minAbsenceRate: only show courses with absence >= this %
    const minAbsenceRate = parseFloat(searchParams.get('minAbsenceRate') || '10');

    try {
        // Step 1: Get at-risk students (follow_up, monitor, critical)
        let studentQuery = supabase
            .from('student_analytics')
            .select('student_code, student_name, faculty, department, year_level, gpa, advisor_name, risk_level, avg_absence_rate, courses_at_risk')
            .in('risk_level', ['follow_up', 'monitor', 'critical'])
            .order('faculty', { ascending: true })
            .order('advisor_name', { ascending: true })
            .order('avg_absence_rate', { ascending: false });

        if (faculty && faculty !== 'all') {
            studentQuery = studentQuery.eq('faculty', faculty);
        }

        const { data: students, error: studentError } = await studentQuery;

        if (studentError) throw studentError;

        if (!students || students.length === 0) {
            return NextResponse.json({ data: [], faculties: [] });
        }

        // Step 2: Get courses for these students where absence_rate >= minAbsenceRate
        const studentCodes = students.map(s => s.student_code);

        // Supabase has a limit on IN clause, batch if needed
        const batchSize = 200;
        let allCourses: any[] = [];

        for (let i = 0; i < studentCodes.length; i += batchSize) {
            const batch = studentCodes.slice(i, i + batchSize);
            const { data: courses, error: courseError } = await supabase
                .from('attendance_records')
                .select('student_code, course_code, course_name, section, study_code, instructor, absence_rate, attendance_rate, absent_count, total_sessions, class_check_raw')
                .in('student_code', batch)
                .gte('absence_rate', minAbsenceRate)
                .order('absence_rate', { ascending: false });

            if (courseError) throw courseError;
            if (courses) allCourses = allCourses.concat(courses);
        }

        // Step 3: Build grouped structure
        const courseMap = new Map<string, any[]>();
        allCourses.forEach(c => {
            const list = courseMap.get(c.student_code) || [];
            list.push(c);
            courseMap.set(c.student_code, list);
        });

        // Build faculty → advisor → students hierarchy
        const facultyMap = new Map<string, Map<string, any[]>>();

        students.forEach(student => {
            const fac = student.faculty || 'ไม่ระบุคณะ';
            const advisor = student.advisor_name || 'ไม่ระบุอาจารย์ที่ปรึกษา';
            const courses = courseMap.get(student.student_code) || [];

            // Only include students who have at-risk courses
            if (courses.length === 0) return;

            if (!facultyMap.has(fac)) facultyMap.set(fac, new Map());
            const advisorMap = facultyMap.get(fac)!;
            if (!advisorMap.has(advisor)) advisorMap.set(advisor, []);
            advisorMap.get(advisor)!.push({
                ...student,
                courses,
            });
        });

        // Convert to array
        const result = Array.from(facultyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0], 'th'))
            .map(([facultyName, advisorMap]) => ({
                faculty: facultyName,
                advisors: Array.from(advisorMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0], 'th'))
                    .map(([advisorName, studentList]) => ({
                        advisor: advisorName,
                        students: studentList,
                        totalStudents: studentList.length,
                    })),
                totalStudents: Array.from(advisorMap.values()).reduce((sum, list) => sum + list.length, 0),
            }));

        // Unique faculties for filter
        const faculties = Array.from(new Set(students.map(s => s.faculty).filter(Boolean))).sort();

        return NextResponse.json({ data: result, faculties });
    } catch (error) {
        console.error('Error generating faculty report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
