import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const advisor = request.nextUrl.searchParams.get('advisor');
    const advisorParam = advisor && advisor !== 'all' ? advisor : null;

    try {
        // Run all 4 queries in parallel for maximum speed
        const [studentRes, courseRes, consecutiveRes, recordsRes] = await Promise.all([

            // 1. Student counts + faculty list
            query<{
                total: string; critical: string; monitor: string; follow_up: string;
                normal: string; faculty_count: string; faculties: string[];
            }>(
                `SELECT
                    COUNT(*)::text                                                              AS total,
                    SUM(CASE WHEN risk_level = 'critical'  THEN 1 ELSE 0 END)::text           AS critical,
                    SUM(CASE WHEN risk_level = 'monitor'   THEN 1 ELSE 0 END)::text           AS monitor,
                    SUM(CASE WHEN risk_level = 'follow_up' THEN 1 ELSE 0 END)::text           AS follow_up,
                    SUM(CASE WHEN risk_level = 'normal'    THEN 1 ELSE 0 END)::text           AS normal,
                    COUNT(DISTINCT faculty) FILTER (WHERE faculty IS NOT NULL)::text           AS faculty_count,
                    COALESCE(
                        array_agg(DISTINCT faculty ORDER BY faculty) FILTER (WHERE faculty IS NOT NULL),
                        '{}'
                    )                                                                          AS faculties
                FROM student_analytics
                ${advisorParam ? 'WHERE advisor_name = $1' : ''}`,
                advisorParam ? [advisorParam] : undefined
            ),

            // 2. Course stats
            query<{ total: string; without_checks: string; high_absence: string }>(
                `SELECT
                    COUNT(*)::text                                                                  AS total,
                    SUM(CASE WHEN has_no_checks THEN 1 ELSE 0 END)::text                           AS without_checks,
                    SUM(CASE WHEN students_high_absence >= 5 THEN 1 ELSE 0 END)::text              AS high_absence
                FROM course_analytics`
            ),

            // 3. Students with ≥3 consecutive trailing absences (uses stored column)
            query<{ count: string }>(
                `SELECT COUNT(DISTINCT student_code)::text AS count
                 FROM attendance_records
                 WHERE trailing_absences >= 3
                   ${advisorParam ? 'AND advisor_name = $1' : ''}`,
                advisorParam ? [advisorParam] : undefined
            ),

            // 4. Total attendance records count
            query<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM attendance_records`
            ),
        ]);

        const s = studentRes.rows[0];
        const c = courseRes.rows[0];
        const totalStudents = parseInt(s.total);

        return NextResponse.json({
            students: {
                total:    totalStudents,
                critical: parseInt(s.critical),
                monitor:  parseInt(s.monitor),
                followUp: parseInt(s.follow_up),
                normal:   parseInt(s.normal),
            },
            courses: {
                total:         parseInt(c.total),
                withoutChecks: parseInt(c.without_checks),
                highAbsence:   parseInt(c.high_absence),
            },
            faculties: {
                total: parseInt(s.faculty_count),
                list:  s.faculties || [],
            },
            consecutiveAbsence: {
                studentsCount: parseInt(consecutiveRes.rows[0].count),
            },
            records: {
                total: parseInt(recordsRes.rows[0].count),
            },
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
