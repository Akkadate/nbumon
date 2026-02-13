import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        // Get all student analytics for charts (with enhanced fields)
        const { data: students, error: studentsError } = await supabase
            .from('student_analytics')
            .select('risk_level, avg_absence_rate, avg_attendance_rate, courses_at_risk, total_courses, faculty, year_level, gpa');

        if (studentsError) throw studentsError;

        // Get course analytics for top absent courses (with enhanced fields)
        const { data: courses, error: coursesError } = await supabase
            .from('course_analytics')
            .select('course_code, course_name, section, study_code, instructor, total_students, students_high_absence, avg_attendance_rate, has_no_checks')
            .order('students_high_absence', { ascending: false })
            .limit(15);

        if (coursesError) throw coursesError;

        // 1. Risk Distribution (for Pie Chart)
        const riskDistribution = [
            { name: 'วิกฤต', value: students?.filter(s => s.risk_level === 'critical').length || 0, color: '#dc2626' },
            { name: 'เฝ้าระวัง', value: students?.filter(s => s.risk_level === 'monitor').length || 0, color: '#ea580c' },
            { name: 'ติดตาม', value: students?.filter(s => s.risk_level === 'follow_up').length || 0, color: '#2563eb' },
            { name: 'ปกติ', value: students?.filter(s => s.risk_level === 'normal').length || 0, color: '#16a34a' },
        ];

        // 2. Absence Rate Distribution (for Histogram)
        const absenceRanges = [
            { range: '0-9%', min: 0, max: 10 },
            { range: '10-19%', min: 10, max: 20 },
            { range: '20-29%', min: 20, max: 30 },
            { range: '30-39%', min: 30, max: 40 },
            { range: '40-49%', min: 40, max: 50 },
            { range: '50-59%', min: 50, max: 60 },
            { range: '60-69%', min: 60, max: 70 },
            { range: '70-79%', min: 70, max: 80 },
            { range: '80-89%', min: 80, max: 90 },
            { range: '90-100%', min: 90, max: 101 },
        ];

        const absenceDistribution = absenceRanges.map(range => ({
            range: range.range,
            count: students?.filter(s => s.avg_absence_rate >= range.min && s.avg_absence_rate < range.max).length || 0
        }));

        // 3. Top courses with most high-absence students (for Bar Chart)
        const topAbsentCourses = (courses || [])
            .filter(c => c.students_high_absence > 0 && !c.has_no_checks)
            .slice(0, 10)
            .map(c => ({
                course: `${c.course_code}-${c.section}`,
                courseName: c.course_name || '',
                instructor: c.instructor || '',
                studyCode: c.study_code,
                highAbsence: c.students_high_absence,
                totalStudents: c.total_students,
                avgAttendance: Math.round(c.avg_attendance_rate * 10) / 10
            }));

        // 4. Attendance vs Absence scatter data
        const attendanceScatter = (students || []).map(s => ({
            attendance: Math.round(s.avg_attendance_rate * 10) / 10,
            absence: Math.round(s.avg_absence_rate * 10) / 10,
            risk: s.risk_level
        }));

        // 5. Faculty Risk Distribution (NEW)
        const facultyMap = new Map<string, { total: number; critical: number; monitor: number; followUp: number; normal: number }>();
        (students || []).forEach(s => {
            const faculty = s.faculty || 'ไม่ระบุ';
            if (!facultyMap.has(faculty)) {
                facultyMap.set(faculty, { total: 0, critical: 0, monitor: 0, followUp: 0, normal: 0 });
            }
            const entry = facultyMap.get(faculty)!;
            entry.total++;
            if (s.risk_level === 'critical') entry.critical++;
            else if (s.risk_level === 'monitor') entry.monitor++;
            else if (s.risk_level === 'follow_up') entry.followUp++;
            else entry.normal++;
        });
        const facultyDistribution = Array.from(facultyMap.entries())
            .map(([faculty, data]) => ({ faculty, ...data }))
            .sort((a, b) => (b.critical + b.monitor) - (a.critical + a.monitor));

        // 6. GPA vs Absence Rate Scatter (NEW)
        const gpaAbsenceScatter = (students || [])
            .filter(s => s.gpa !== null && s.gpa !== undefined)
            .map(s => ({
                gpa: s.gpa,
                absence: Math.round(s.avg_absence_rate * 10) / 10,
                risk: s.risk_level,
                faculty: s.faculty || 'ไม่ระบุ'
            }));

        // 7. Year Level Distribution (NEW)
        const yearMap = new Map<number, { total: number; critical: number; monitor: number; followUp: number; normal: number }>();
        (students || []).forEach(s => {
            const year = s.year_level || 0;
            if (!yearMap.has(year)) {
                yearMap.set(year, { total: 0, critical: 0, monitor: 0, followUp: 0, normal: 0 });
            }
            const entry = yearMap.get(year)!;
            entry.total++;
            if (s.risk_level === 'critical') entry.critical++;
            else if (s.risk_level === 'monitor') entry.monitor++;
            else if (s.risk_level === 'follow_up') entry.followUp++;
            else entry.normal++;
        });
        const yearDistribution = Array.from(yearMap.entries())
            .filter(([year]) => year > 0)
            .map(([year, data]) => ({ year: `ปี ${year}`, ...data }))
            .sort((a, b) => parseInt(a.year.replace('ปี ', '')) - parseInt(b.year.replace('ปี ', '')));

        return NextResponse.json({
            riskDistribution,
            absenceDistribution,
            topAbsentCourses,
            attendanceScatter,
            facultyDistribution,
            gpaAbsenceScatter,
            yearDistribution,
            summary: {
                totalStudents: students?.length || 0,
                avgAbsenceRate: students ? Math.round(students.reduce((s, st) => s + st.avg_absence_rate, 0) / students.length * 10) / 10 : 0,
                avgAttendanceRate: students ? Math.round(students.reduce((s, st) => s + st.avg_attendance_rate, 0) / students.length * 10) / 10 : 0,
            }
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
