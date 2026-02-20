import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const studentCode = request.nextUrl.searchParams.get('studentCode');

    if (!studentCode) {
        return NextResponse.json({ error: 'studentCode is required' }, { status: 400 });
    }

    try {
        const { rows } = await query(
            `SELECT course_code, course_name, revision_code, section, study_code, instructor,
                    attendance_rate, absence_rate, present_count, absent_count,
                    late_count, leave_count, total_sessions, class_check_raw
             FROM attendance_records
             WHERE student_code = $1
             ORDER BY absence_rate DESC`,
            [studentCode]
        );

        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Error fetching student courses:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
