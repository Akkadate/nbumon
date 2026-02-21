import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface SessionCount { P: number; A: number; L: number; S: number; total: number; }

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const faculty      = searchParams.get('faculty');
    const limit        = parseInt(searchParams.get('limit')  || '20');
    const offset       = parseInt(searchParams.get('offset') || '0');
    const countP       = searchParams.get('countP') !== 'false';
    const countL       = searchParams.get('countL') !== 'false';
    const countS       = searchParams.get('countS') !== 'false';

    const facultyParam = faculty && faculty !== 'all' ? faculty : null;

    try {
        // 1. Paginated courses from course_analytics
        const courseParams: unknown[] = [];
        const courseWhere = facultyParam
            ? (courseParams.push(facultyParam), `WHERE faculty = $${courseParams.length}`)
            : '';

        courseParams.push(limit, offset);
        const limitIdx  = courseParams.length - 1;
        const offsetIdx = courseParams.length;

        const { rows: courses } = await query(
            `SELECT *, COUNT(*) OVER()::int AS total_count
             FROM course_analytics
             ${courseWhere}
             ORDER BY faculty ASC, course_code ASC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            courseParams
        );

        const totalCourses = courses.length > 0 ? (courses[0].total_count as number) : 0;
        const cleanCourses = courses.map(({ total_count: _tc, ...rest }) => rest);

        if (cleanCourses.length === 0) {
            return NextResponse.json({ faculties: [], overview: [], courseDetails: [], metadata: { total: 0, limit, offset } });
        }

        // 2. Fetch attendance records for these paginated courses in one query
        const courseCodes = cleanCourses.map(c => c.course_code as string);

        const [recordsRes, overviewRes] = await Promise.all([
            // Records for paginated courses
            query(
                `SELECT course_code, course_name, section, study_code, instructor,
                        class_check_raw, faculty, total_sessions, student_code
                 FROM attendance_records
                 WHERE course_code = ANY($1)`,
                [courseCodes]
            ),
            // Overview: aggregate per faculty from ALL courses
            query(
                `SELECT
                    COALESCE(faculty,'ไม่ระบุ') AS faculty,
                    COUNT(*)::int                                                              AS course_count,
                    ROUND(AVG(avg_attendance_rate)::numeric, 1)                              AS avg_rate,
                    SUM(CASE WHEN trend = 'up'   THEN 1 ELSE 0 END)::int                    AS trends_up,
                    SUM(CASE WHEN trend = 'down' THEN 1 ELSE 0 END)::int                    AS trends_down,
                    SUM(CASE WHEN trend NOT IN ('up','down') OR trend IS NULL THEN 1 ELSE 0 END)::int AS trends_stable
                 FROM course_analytics
                 ${facultyParam ? 'WHERE faculty = $1' : ''}
                 GROUP BY COALESCE(faculty,'ไม่ระบุ')
                 ORDER BY COALESCE(faculty,'ไม่ระบุ')`,
                facultyParam ? [facultyParam] : undefined
            ),
        ]);

        // 3. Process attendance records into session-by-session data per course
        const courseMap = new Map<string, {
            course_code: string; course_name: string | null; section: string;
            study_code: string; instructor: string | null; faculty: string;
            students: Set<string>; sessionData: SessionCount[]; totalStudents: number;
        }>();

        for (const c of cleanCourses) {
            const key = `${c.course_code}|${c.section}|${c.study_code}`;
            courseMap.set(key, {
                course_code: c.course_code, course_name: c.course_name,
                section: c.section, study_code: c.study_code,
                instructor: c.instructor, faculty: c.faculty || 'ไม่ระบุ',
                students: new Set(), sessionData: [],
                totalStudents: c.total_students,
            });
        }

        for (const record of recordsRes.rows) {
            const key    = `${record.course_code}|${record.section}|${record.study_code}`;
            const course = courseMap.get(key);
            if (!course) continue;

            course.students.add(record.student_code as string);

            if (record.class_check_raw) {
                const sessions = (record.class_check_raw as string).replace(/"/g, '').split(',');
                while (course.sessionData.length < sessions.length) {
                    course.sessionData.push({ P: 0, A: 0, L: 0, S: 0, total: 0 });
                }
                sessions.forEach((status: string, idx: number) => {
                    const s = status.trim().toUpperCase();
                    if (['P', 'A', 'L', 'S'].includes(s)) {
                        course.sessionData[idx][s as 'P' | 'A' | 'L' | 'S']++;
                        course.sessionData[idx].total++;
                    }
                });
            }
        }

        // 4. Compute session rates
        const courseDetails = Array.from(courseMap.values()).map(course => {
            const allRates = course.sessionData.map((session, idx) => {
                if (session.total === 0) return { session: idx + 1, rate: 0, total: 0 };
                let attended = 0;
                if (countP) attended += session.P;
                if (countL) attended += session.L;
                if (countS) attended += session.S;
                return { session: idx + 1, rate: Math.round((attended / session.total) * 1000) / 10, total: session.total };
            });

            let lastIdx = allRates.length - 1;
            while (lastIdx >= 0 && allRates[lastIdx].total === 0) lastIdx--;
            const sessionRates  = allRates.slice(0, lastIdx + 1);
            const validSessions = sessionRates.filter(s => s.total > 0);
            const overallRate   = validSessions.length > 0
                ? Math.round(validSessions.reduce((s, r) => s + r.rate, 0) / validSessions.length * 10) / 10 : 0;
            const latestRate    = validSessions.length > 0 ? validSessions[validSessions.length - 1].rate : 0;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (validSessions.length >= 3) {
                const third    = Math.ceil(validSessions.length / 3);
                const earlyAvg = validSessions.slice(0, third).reduce((s, r) => s + r.rate, 0) / third;
                const lateAvg  = validSessions.slice(-third).reduce((s, r) => s + r.rate, 0) / third;
                if (lateAvg - earlyAvg > 5)  trend = 'up';
                if (lateAvg - earlyAvg < -5) trend = 'down';
            }

            return {
                course_code: course.course_code, course_name: course.course_name,
                section: course.section, study_code: course.study_code,
                instructor: course.instructor, faculty: course.faculty,
                totalStudents: course.totalStudents,
                checkedSessions: validSessions.length,
                totalSessionSlots: sessionRates.length,
                overallRate, latestRate, trend, sessionRates,
            };
        }).sort((a, b) => a.faculty.localeCompare(b.faculty, 'th') || a.course_code.localeCompare(b.course_code));

        const overview = overviewRes.rows.map(o => ({
            faculty: o.faculty as string,
            courseCount: o.course_count as number,
            avgRate: Number(o.avg_rate),
            trendsUp: o.trends_up as number,
            trendsDown: o.trends_down as number,
            trendsStable: o.trends_stable as number,
        }));
        const faculties = overview.map((o) => o.faculty);

        return NextResponse.json({
            faculties,
            overview,
            courseDetails,
            metadata: { total: totalCourses, limit, offset },
        });
    } catch (error) {
        console.error('Error fetching attendance report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
