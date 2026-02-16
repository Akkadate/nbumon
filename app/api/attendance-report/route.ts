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
    // Pagination params
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Toggles
    const countP = searchParams.get('countP') !== 'false';
    const countL = searchParams.get('countL') !== 'false';
    const countS = searchParams.get('countS') !== 'false';

    try {
        // 1. Fetch paginated courses from course_analytics
        let courseQuery = supabase
            .from('course_analytics')
            .select('*', { count: 'exact' });

        if (faculty && faculty !== 'all') {
            courseQuery = courseQuery.eq('faculty', faculty);
        }

        // Order by faculty then course code
        courseQuery = courseQuery
            .order('faculty', { ascending: true })
            .order('course_code', { ascending: true })
            .range(offset, offset + limit - 1);

        const { data: courses, count: totalCourses, error: courseError } = await courseQuery;

        if (courseError) throw courseError;

        if (!courses || courses.length === 0) {
            return NextResponse.json({
                faculties: [],
                overview: [],
                courseDetails: [],
                metadata: { total: 0, limit, offset }
            });
        }

        // 2. Fetch attendance records ONLY for these courses
        // Create filter string: course_code.in.(...) and section.in.(...) and study_code.in.(...)
        // But simplified: just filter by course_code for now, then map in memory
        const courseCodes = courses.map(c => c.course_code);

        const { data: records, error: recordError } = await supabase
            .from('attendance_records')
            .select('course_code, course_name, section, study_code, instructor, class_check_raw, faculty, total_sessions, student_code')
            .in('course_code', courseCodes);

        if (recordError) throw recordError;

        // 3. Process records into Course Details
        const courseMap = new Map<string, {
            course_code: string;
            course_name: string | null;
            section: string;
            study_code: string;
            instructor: string | null;
            faculty: string;
            students: Set<string>;
            sessionData: SessionCount[];
            totalStudents: number; // From analytics
        }>();

        // Initialize map with course analytics data
        courses.forEach(c => {
            const key = `${c.course_code}|${c.section}|${c.study_code}`;
            courseMap.set(key, {
                course_code: c.course_code,
                course_name: c.course_name,
                section: c.section,
                study_code: c.study_code,
                instructor: c.instructor,
                faculty: c.faculty || 'ไม่ระบุ',
                students: new Set<string>(),
                sessionData: [],
                totalStudents: c.total_students
            });
        });

        // Fill with attendance data
        if (records) {
            records.forEach(record => {
                const key = `${record.course_code}|${record.section}|${record.study_code}`;
                const course = courseMap.get(key);

                if (course) {
                    course.students.add(record.student_code);

                    if (record.class_check_raw) {
                        const raw = record.class_check_raw.replace(/"/g, '');
                        const sessions = raw.split(',');

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
            });
        }

        // 4. Calculate stats
        const courseDetails = Array.from(courseMap.values()).map(course => {
            // Use total_students from analytics (already set in init)

            // Build sessions
            const allSessionRates = course.sessionData.map((session, idx) => {
                if (session.total === 0) return { session: idx + 1, rate: 0, total: 0 };
                let attended = 0;
                if (countP) attended += session.P;
                if (countL) attended += session.L;
                if (countS) attended += session.S;
                const rate = Math.round((attended / session.total) * 1000) / 10;
                return { session: idx + 1, rate, total: session.total };
            });

            // Trim trailing empty
            let lastDataIdx = allSessionRates.length - 1;
            while (lastDataIdx >= 0 && allSessionRates[lastDataIdx].total === 0) {
                lastDataIdx--;
            }
            const sessionRates = allSessionRates.slice(0, lastDataIdx + 1);
            const validSessions = sessionRates.filter(s => s.total > 0);

            const overallRate = validSessions.length > 0
                ? Math.round(validSessions.reduce((sum, s) => sum + s.rate, 0) / validSessions.length * 10) / 10
                : 0;

            const latestRate = validSessions.length > 0
                ? validSessions[validSessions.length - 1].rate
                : 0;

            // Trend
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
                totalStudents: course.totalStudents, // Use value from analytics
                checkedSessions: validSessions.length,
                totalSessionSlots: sessionRates.length,
                overallRate,
                latestRate,
                trend,
                sessionRates,
            };
        });

        // 5. Get Overview Stats (need separate query for ALL data if we want correct overview)
        // For efficiency, we can fetch pre-calculated faculty stats from a new table OR 
        // just compute from the current page (might be inaccurate) OR 
        // fetch ONLY stats columns for all courses (lightweight)

        // Lightweight fetch for overview (all courses, select only key columns)
        let overviewQuery = supabase
            .from('course_analytics')
            .select('faculty, avg_attendance_rate');

        const { data: allStats } = await overviewQuery;

        const facultyMap = new Map<string, {
            courseCount: number;
            rates: number[];
        }>();

        if (allStats) {
            allStats.forEach(c => {
                const fac = c.faculty || 'ไม่ระบุ';
                if (!facultyMap.has(fac)) {
                    facultyMap.set(fac, { courseCount: 0, rates: [] });
                }
                const entry = facultyMap.get(fac)!;
                entry.courseCount++;
                entry.rates.push(c.avg_attendance_rate || 0);
            });
        }

        const overview = Array.from(facultyMap.entries()).map(([fac, data]) => ({
            faculty: fac,
            courseCount: data.courseCount,
            avgRate: data.rates.length > 0
                ? Math.round(data.rates.reduce((s, r) => s + r, 0) / data.rates.length * 10) / 10
                : 0,
            // Trends per faculty would need historical data, skipping for now or simplify
            trendsUp: 0,
            trendsDown: 0,
            trendsStable: 0
        })).sort((a, b) => a.faculty.localeCompare(b.faculty, 'th'));

        // Unique faculties for filter
        const faculties = overview.map(o => o.faculty);

        return NextResponse.json({
            faculties,
            overview,
            courseDetails: courseDetails.sort((a, b) => a.faculty.localeCompare(b.faculty, 'th') || a.course_code.localeCompare(b.course_code)),
            metadata: {
                total: totalCourses || 0,
                limit,
                offset
            }
        });

    } catch (error) {
        console.error('Error fetching attendance report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
