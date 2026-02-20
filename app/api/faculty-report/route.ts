import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams   = request.nextUrl.searchParams;
    const faculty        = searchParams.get('faculty');
    const minAbsenceRate = parseFloat(searchParams.get('minAbsenceRate') || '10');

    const facultyParam = faculty && faculty !== 'all' ? faculty : null;

    try {
        // Step 1: Fetch ALL at-risk students in one query
        const studentParams: unknown[] = [];
        const studentConditions        = ["risk_level IN ('follow_up', 'monitor', 'critical')"];

        if (facultyParam) {
            studentParams.push(facultyParam);
            studentConditions.push(`faculty = $${studentParams.length}`);
        }

        const { rows: students } = await query(
            `SELECT student_code, student_name, faculty, department, year_level, gpa,
                    advisor_name, risk_level, avg_absence_rate, courses_at_risk
             FROM student_analytics
             WHERE ${studentConditions.join(' AND ')}
             ORDER BY faculty ASC, advisor_name ASC, avg_absence_rate DESC`,
            studentParams
        );

        if (students.length === 0) {
            return NextResponse.json({ data: [], faculties: [] });
        }

        // Step 2: Fetch at-risk courses for ALL students in ONE query using ANY()
        // This replaces the old batching loop (was 33+ HTTP calls, now 2 SQL queries total)
        const studentCodes = students.map(s => s.student_code as string);

        const { rows: allCourses } = await query(
            `SELECT student_code, course_code, course_name, section, study_code, instructor,
                    absence_rate, attendance_rate, absent_count, total_sessions, class_check_raw
             FROM attendance_records
             WHERE student_code = ANY($1) AND absence_rate >= $2
             ORDER BY absence_rate DESC`,
            [studentCodes, minAbsenceRate]
        );

        // Step 3: Build student → courses map
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const courseMap = new Map<string, any[]>();
        for (const c of allCourses) {
            const list = courseMap.get(c.student_code as string) || [];
            list.push(c);
            courseMap.set(c.student_code as string, list);
        }

        // Step 4: Build faculty → advisor → students hierarchy
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const facultyMap = new Map<string, Map<string, any[]>>();

        for (const student of students) {
            const fac     = (student.faculty     as string) || 'ไม่ระบุคณะ';
            const advisor = (student.advisor_name as string) || 'ไม่ระบุอาจารย์ที่ปรึกษา';
            const courses = courseMap.get(student.student_code as string) || [];

            if (courses.length === 0) continue;

            if (!facultyMap.has(fac)) facultyMap.set(fac, new Map());
            const advisorMap = facultyMap.get(fac)!;
            if (!advisorMap.has(advisor)) advisorMap.set(advisor, []);
            advisorMap.get(advisor)!.push({ ...student, courses });
        }

        const result = Array.from(facultyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0], 'th'))
            .map(([facultyName, advisorMap]) => ({
                faculty: facultyName,
                advisors: Array.from(advisorMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0], 'th'))
                    .map(([advisorName, studentList]) => ({
                        advisor:       advisorName,
                        students:      studentList,
                        totalStudents: studentList.length,
                    })),
                totalStudents: Array.from(advisorMap.values()).reduce((s, l) => s + l.length, 0),
            }));

        const faculties = [...new Set(students.map(s => s.faculty as string).filter(Boolean))].sort();

        return NextResponse.json({ data: result, faculties });
    } catch (error) {
        console.error('Error generating faculty report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
