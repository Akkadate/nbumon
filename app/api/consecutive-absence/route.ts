import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface ConsecutiveAbsenceStudent {
    student_code: string;
    student_name: string | null;
    faculty: string | null;
    year_level: number | null;
    gpa: number | null;
    advisor_name: string | null;
    courses: Array<{
        course_code: string;
        course_name: string | null;
        section: string;
        instructor: string | null;
        consecutive_absences: number;
        last_statuses: string[];
        absence_rate: number;
        total_sessions: number;
    }>;
    total_flagged_courses: number;
}

function getConsecutiveTrailingAbsences(classCheckRaw: string): { count: number; lastStatuses: string[] } {
    if (!classCheckRaw) return { count: 0, lastStatuses: [] };

    // Parse comma-separated attendance entries
    const entries = classCheckRaw.split(',').map(s => s.trim().toUpperCase());

    // Filter to only actual check entries (P, A, L, S) — ignore empty/no-check
    const actualEntries = entries.filter(e => ['P', 'A', 'L', 'S'].includes(e));

    if (actualEntries.length === 0) return { count: 0, lastStatuses: [] };

    // Count consecutive 'A' from the end
    let consecutiveCount = 0;
    for (let i = actualEntries.length - 1; i >= 0; i--) {
        if (actualEntries[i] === 'A') {
            consecutiveCount++;
        } else {
            break;
        }
    }

    // Return all statuses for full attendance display
    const lastStatuses = actualEntries;

    return { count: consecutiveCount, lastStatuses };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const minConsecutive = parseInt(searchParams.get('min') || '3');

    try {
        // Fetch all attendance records with class_check_raw
        const { data, error } = await supabase
            .from('attendance_records')
            .select('student_code, student_name, faculty, year_level, gpa, advisor_name, course_code, course_name, section, instructor, class_check_raw, absence_rate, total_sessions')
            .not('class_check_raw', 'is', null);

        if (error) throw error;

        if (!data || data.length === 0) {
            return NextResponse.json({ data: [], total: 0 });
        }

        // Group by student and find consecutive absences
        const studentMap = new Map<string, ConsecutiveAbsenceStudent>();

        for (const record of data) {
            const { count, lastStatuses } = getConsecutiveTrailingAbsences(record.class_check_raw);

            if (count >= minConsecutive) {
                if (!studentMap.has(record.student_code)) {
                    studentMap.set(record.student_code, {
                        student_code: record.student_code,
                        student_name: record.student_name,
                        faculty: record.faculty,
                        year_level: record.year_level,
                        gpa: record.gpa,
                        advisor_name: record.advisor_name,
                        courses: [],
                        total_flagged_courses: 0,
                    });
                }

                const student = studentMap.get(record.student_code)!;
                student.courses.push({
                    course_code: record.course_code,
                    course_name: record.course_name,
                    section: record.section,
                    instructor: record.instructor,
                    consecutive_absences: count,
                    last_statuses: lastStatuses,
                    absence_rate: record.absence_rate,
                    total_sessions: record.total_sessions,
                });
                student.total_flagged_courses = student.courses.length;
            }
        }

        // Sort students: most flagged courses first, then by highest consecutive count
        const result = Array.from(studentMap.values())
            .sort((a, b) => {
                const maxA = Math.max(...a.courses.map(c => c.consecutive_absences));
                const maxB = Math.max(...b.courses.map(c => c.consecutive_absences));
                if (maxB !== maxA) return maxB - maxA;
                return b.total_flagged_courses - a.total_flagged_courses;
            });

        return NextResponse.json({
            data: result,
            total: result.length,
            minConsecutive,
        });
    } catch (error) {
        console.error('Error fetching consecutive absences:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
