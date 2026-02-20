import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Run all chart queries in parallel
        const [riskRes, facultyRes, yearRes, absenceDistRes, scatterRes, gpaRes, topCoursesRes, summaryRes] =
            await Promise.all([

                // 1. Risk distribution
                query<{ risk_level: string; cnt: string }>(
                    `SELECT risk_level, COUNT(*)::text AS cnt FROM student_analytics GROUP BY risk_level`
                ),

                // 2. Faculty × risk distribution
                query<{ faculty: string; risk_level: string; cnt: string }>(
                    `SELECT COALESCE(faculty,'ไม่ระบุ') AS faculty, risk_level, COUNT(*)::text AS cnt
                     FROM student_analytics
                     GROUP BY COALESCE(faculty,'ไม่ระบุ'), risk_level`
                ),

                // 3. Year level × risk distribution
                query<{ year_level: number; risk_level: string; cnt: string }>(
                    `SELECT year_level, risk_level, COUNT(*)::text AS cnt
                     FROM student_analytics
                     WHERE year_level > 0
                     GROUP BY year_level, risk_level
                     ORDER BY year_level`
                ),

                // 4. Absence rate histogram buckets
                query<{ range: string; cnt: string }>(
                    `SELECT
                        CASE
                            WHEN avg_absence_rate <  10 THEN '0-9%'
                            WHEN avg_absence_rate <  20 THEN '10-19%'
                            WHEN avg_absence_rate <  30 THEN '20-29%'
                            WHEN avg_absence_rate <  40 THEN '30-39%'
                            WHEN avg_absence_rate <  50 THEN '40-49%'
                            WHEN avg_absence_rate <  60 THEN '50-59%'
                            WHEN avg_absence_rate <  70 THEN '60-69%'
                            WHEN avg_absence_rate <  80 THEN '70-79%'
                            WHEN avg_absence_rate <  90 THEN '80-89%'
                            ELSE '90-100%'
                        END AS range,
                        COUNT(*)::text AS cnt
                     FROM student_analytics
                     GROUP BY 1
                     ORDER BY MIN(avg_absence_rate)`
                ),

                // 5. Attendance vs absence scatter (all students)
                query<{ avg_attendance_rate: number; avg_absence_rate: number; risk_level: string }>(
                    `SELECT avg_attendance_rate, avg_absence_rate, risk_level FROM student_analytics`
                ),

                // 6. GPA vs absence scatter
                query<{ gpa: number; avg_absence_rate: number; risk_level: string; faculty: string }>(
                    `SELECT gpa, avg_absence_rate, risk_level, COALESCE(faculty,'ไม่ระบุ') AS faculty
                     FROM student_analytics WHERE gpa IS NOT NULL`
                ),

                // 7. Top 15 courses by high-absence students
                query(
                    `SELECT course_code, course_name, section, study_code, instructor,
                            total_students, students_high_absence, avg_attendance_rate, has_no_checks
                     FROM course_analytics
                     WHERE students_high_absence > 0 AND NOT has_no_checks
                     ORDER BY students_high_absence DESC
                     LIMIT 15`
                ),

                // 8. Summary stats
                query<{ total: string; avg_absence: number; avg_attendance: number }>(
                    `SELECT
                        COUNT(*)::text AS total,
                        ROUND(AVG(avg_absence_rate)::numeric, 1)    AS avg_absence,
                        ROUND(AVG(avg_attendance_rate)::numeric, 1) AS avg_attendance
                     FROM student_analytics`
                ),
            ]);

        // ── Build response ──────────────────────────────────────────────

        const colorMap: Record<string, string> = {
            critical: '#dc2626', monitor: '#ea580c', follow_up: '#2563eb', normal: '#16a34a',
        };
        const labelMap: Record<string, string> = {
            critical: 'วิกฤต', monitor: 'เฝ้าระวัง', follow_up: 'ติดตาม', normal: 'ปกติ',
        };
        const riskDistribution = ['critical', 'monitor', 'follow_up', 'normal'].map(level => {
            const row = riskRes.rows.find(r => r.risk_level === level);
            return { name: labelMap[level], value: row ? parseInt(row.cnt) : 0, color: colorMap[level] };
        });

        // Faculty distribution map
        type FacultyEntry = { faculty: string; total: number; critical: number; monitor: number; followUp: number; normal: number };
        const facultyMap = new Map<string, FacultyEntry>();
        for (const r of facultyRes.rows) {
            if (!facultyMap.has(r.faculty)) facultyMap.set(r.faculty, { faculty: r.faculty, total: 0, critical: 0, monitor: 0, followUp: 0, normal: 0 });
            const entry = facultyMap.get(r.faculty)!;
            const cnt = parseInt(r.cnt);
            entry.total += cnt;
            if (r.risk_level === 'critical')  entry.critical  += cnt;
            if (r.risk_level === 'monitor')   entry.monitor   += cnt;
            if (r.risk_level === 'follow_up') entry.followUp  += cnt;
            if (r.risk_level === 'normal')    entry.normal    += cnt;
        }
        const facultyDistribution = Array.from(facultyMap.values())
            .sort((a, b) => (b.critical + b.monitor) - (a.critical + a.monitor));

        // Year distribution map
        const yearMap = new Map<number, Record<string, number>>();
        for (const r of yearRes.rows) {
            if (!yearMap.has(r.year_level)) yearMap.set(r.year_level, { total: 0, critical: 0, monitor: 0, followUp: 0, normal: 0 });
            const entry = yearMap.get(r.year_level)!;
            const cnt = parseInt(r.cnt);
            entry.total += cnt;
            if (r.risk_level === 'critical')  entry.critical  += cnt;
            if (r.risk_level === 'monitor')   entry.monitor   += cnt;
            if (r.risk_level === 'follow_up') entry.followUp  += cnt;
            if (r.risk_level === 'normal')    entry.normal    += cnt;
        }
        const yearDistribution = Array.from(yearMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([year, d]) => ({ year: `ปี ${year}`, ...d }));

        // Absence histogram
        const rangeOrder = ['0-9%','10-19%','20-29%','30-39%','40-49%','50-59%','60-69%','70-79%','80-89%','90-100%'];
        const absenceDistribution = rangeOrder.map(range => {
            const row = absenceDistRes.rows.find(r => r.range === range);
            return { range, count: row ? parseInt(row.cnt) : 0 };
        });

        const attendanceScatter = scatterRes.rows.map(s => ({
            attendance: Math.round(s.avg_attendance_rate * 10) / 10,
            absence:    Math.round(s.avg_absence_rate    * 10) / 10,
            risk:       s.risk_level,
        }));

        const gpaAbsenceScatter = gpaRes.rows.map(s => ({
            gpa:     s.gpa,
            absence: Math.round(s.avg_absence_rate * 10) / 10,
            risk:    s.risk_level,
            faculty: s.faculty,
        }));

        const topAbsentCourses = topCoursesRes.rows.map(c => ({
            course:       `${c.course_code}-${c.section}`,
            courseName:   c.course_name || '',
            instructor:   c.instructor  || '',
            studyCode:    c.study_code,
            highAbsence:  c.students_high_absence,
            totalStudents: c.total_students,
            avgAttendance: Math.round(c.avg_attendance_rate * 10) / 10,
        }));

        const sumRow = summaryRes.rows[0];
        return NextResponse.json({
            riskDistribution,
            absenceDistribution,
            topAbsentCourses,
            attendanceScatter,
            facultyDistribution,
            gpaAbsenceScatter,
            yearDistribution,
            summary: {
                totalStudents:    parseInt(sumRow.total),
                avgAbsenceRate:   sumRow.avg_absence,
                avgAttendanceRate: sumRow.avg_attendance,
            },
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
