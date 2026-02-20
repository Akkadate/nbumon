import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface CourseEntry {
    course_code: string;
    course_name: string | null;
    section: string;
    instructor: string | null;
    consecutive_absences: number;
    last_statuses: string[];
    absence_rate: number;
    total_sessions: number;
}

interface StudentResult {
    student_code: string;
    student_name: string | null;
    faculty: string | null;
    year_level: number | null;
    gpa: number | null;
    advisor_name: string | null;
    courses: CourseEntry[];
    total_flagged_courses: number;
}

export async function GET(request: NextRequest) {
    const minConsecutive = parseInt(request.nextUrl.searchParams.get('min') || '3');

    try {
        // trailing_absences is pre-computed during CSV import and stored in the column.
        // This enables a simple indexed scan instead of calling a PL/pgSQL function per row.
        const { rows } = await query(
            `SELECT
                student_code, student_name, faculty, year_level, gpa, advisor_name,
                course_code, course_name, section, instructor,
                class_check_raw, absence_rate, total_sessions,
                trailing_absences AS consecutive_absences
             FROM attendance_records
             WHERE trailing_absences >= $1
             ORDER BY trailing_absences DESC`,
            [minConsecutive]
        );

        // Group by student
        const studentMap = new Map<string, StudentResult>();

        for (const r of rows) {
            const code = r.student_code as string;
            if (!studentMap.has(code)) {
                studentMap.set(code, {
                    student_code:  code,
                    student_name:  r.student_name,
                    faculty:       r.faculty,
                    year_level:    r.year_level,
                    gpa:           r.gpa,
                    advisor_name:  r.advisor_name,
                    courses:       [],
                    total_flagged_courses: 0,
                });
            }
            const student = studentMap.get(code)!;

            // Parse attendance dots for display
            const raw = (r.class_check_raw as string).replace(/"/g, '');
            const lastStatuses = raw.split(',')
                .map((s: string) => s.trim().toUpperCase())
                .filter((s: string) => ['P', 'A', 'L', 'S'].includes(s));

            student.courses.push({
                course_code:          r.course_code,
                course_name:          r.course_name,
                section:              r.section,
                instructor:           r.instructor,
                consecutive_absences: parseInt(r.consecutive_absences),
                last_statuses:        lastStatuses,
                absence_rate:         r.absence_rate,
                total_sessions:       r.total_sessions,
            });
            student.total_flagged_courses = student.courses.length;
        }

        // Sort: highest consecutive first, then most flagged courses
        const result = Array.from(studentMap.values()).sort((a, b) => {
            const maxA = Math.max(...a.courses.map(c => c.consecutive_absences));
            const maxB = Math.max(...b.courses.map(c => c.consecutive_absences));
            if (maxB !== maxA) return maxB - maxA;
            return b.total_flagged_courses - a.total_flagged_courses;
        });

        return NextResponse.json({ data: result, total: result.length, minConsecutive });
    } catch (error) {
        console.error('Error fetching consecutive absences:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
