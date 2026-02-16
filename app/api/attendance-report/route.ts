import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface SessionCount {
    P: number;
    A: number;
    L: number;
    S: number;
    total: number;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const faculty = searchParams.get('faculty');
    const countP = searchParams.get('countP') !== 'false'; // default true
    const countL = searchParams.get('countL') !== 'false'; // default true
    const countS = searchParams.get('countS') !== 'false'; // default false — but we handle via param

    try {
        // Query attendance records with class_check_raw
        let query = supabase
            .from('attendance_records')
            .select('course_code, course_name, section, study_code, instructor, class_check_raw, faculty, total_sessions, student_code');

        if (faculty && faculty !== 'all') {
            query = query.eq('faculty', faculty);
        }

        const { data: records, error } = await query;
        if (error) throw error;

        if (!records || records.length === 0) {
            return NextResponse.json({ faculties: [], overview: [], courseDetails: [] });
        }

        // Group by course key (course_code + section + study_code)
        const courseMap = new Map<string, {
            course_code: string;
            course_name: string | null;
            section: string;
            study_code: string;
            instructor: string | null;
            faculty: string;
            students: string[];
            sessionData: SessionCount[];
        }>();

        records.forEach(record => {
            const key = `${record.course_code}|${record.section}|${record.study_code}`;
            if (!courseMap.has(key)) {
                courseMap.set(key, {
                    course_code: record.course_code,
                    course_name: record.course_name,
                    section: record.section,
                    study_code: record.study_code,
                    instructor: record.instructor,
                    faculty: record.faculty || 'ไม่ระบุ',
                    students: [],
                    sessionData: [],
                });
            }

            const course = courseMap.get(key)!;
            course.students.push(record.student_code);

            // Parse class_check_raw
            if (record.class_check_raw) {
                const raw = record.class_check_raw.replace(/"/g, '');
                const sessions = raw.split(',');

                // Expand sessionData array if needed
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
        });

        // Calculate attendance % per session per course based on toggle
        const courseDetails = Array.from(courseMap.entries()).map(([, course]) => {
            const totalStudents = course.students.length;

            // Build all sessions starting from session 1
            const allSessionRates = course.sessionData.map((session, idx) => {
                if (session.total === 0) return { session: idx + 1, rate: 0, total: 0 };

                let attended = 0;
                if (countP) attended += session.P;
                if (countL) attended += session.L;
                if (countS) attended += session.S;

                const rate = Math.round((attended / session.total) * 1000) / 10;
                return { session: idx + 1, rate, total: session.total };
            });

            // Trim trailing empty sessions — chart ends at last session with real data
            let lastDataIdx = allSessionRates.length - 1;
            while (lastDataIdx >= 0 && allSessionRates[lastDataIdx].total === 0) {
                lastDataIdx--;
            }
            const sessionRates = allSessionRates.slice(0, lastDataIdx + 1);

            // For averages/trend, only use sessions that have actual data
            const validSessions = sessionRates.filter(s => s.total > 0);

            // Overall attendance rate (average across sessions with data)
            const overallRate = validSessions.length > 0
                ? Math.round(validSessions.reduce((sum, s) => sum + s.rate, 0) / validSessions.length * 10) / 10
                : 0;

            // Latest session rate (last session that has data)
            const latestRate = validSessions.length > 0
                ? validSessions[validSessions.length - 1].rate
                : 0;

            // Trend analysis: compare first third vs last third (only sessions with data)
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (validSessions.length >= 3) {
                const third = Math.ceil(validSessions.length / 3);
                const earlyAvg = validSessions.slice(0, third).reduce((s, r) => s + r.rate, 0) / third;
                const lateAvg = validSessions.slice(-third).reduce((s, r) => s + r.rate, 0) / third;
                const diff = lateAvg - earlyAvg;
                if (diff > 5) trend = 'up';
                else if (diff < -5) trend = 'down';
            }

            return {
                course_code: course.course_code,
                course_name: course.course_name,
                section: course.section,
                study_code: course.study_code,
                instructor: course.instructor,
                faculty: course.faculty,
                totalStudents,
                overallRate,
                latestRate,
                trend,
                sessionRates,
            };
        });

        // Group by faculty for overview
        const facultyMap = new Map<string, {
            courseCount: number;
            avgRate: number;
            rates: number[];
            trends: { up: number; down: number; stable: number };
        }>();

        courseDetails.forEach(course => {
            const fac = course.faculty;
            if (!facultyMap.has(fac)) {
                facultyMap.set(fac, { courseCount: 0, avgRate: 0, rates: [], trends: { up: 0, down: 0, stable: 0 } });
            }
            const entry = facultyMap.get(fac)!;
            entry.courseCount++;
            entry.rates.push(course.overallRate);
            entry.trends[course.trend]++;
        });

        const overview = Array.from(facultyMap.entries()).map(([fac, data]) => ({
            faculty: fac,
            courseCount: data.courseCount,
            avgRate: data.rates.length > 0
                ? Math.round(data.rates.reduce((s, r) => s + r, 0) / data.rates.length * 10) / 10
                : 0,
            trendsUp: data.trends.up,
            trendsDown: data.trends.down,
            trendsStable: data.trends.stable,
        })).sort((a, b) => a.faculty.localeCompare(b.faculty, 'th'));

        // Unique faculties for filter dropdown
        const faculties = Array.from(new Set(records.map(r => r.faculty).filter(Boolean))).sort();

        return NextResponse.json({
            faculties,
            overview,
            courseDetails: courseDetails.sort((a, b) => a.faculty.localeCompare(b.faculty, 'th') || a.course_code.localeCompare(b.course_code)),
        });
    } catch (error) {
        console.error('Error fetching attendance report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
