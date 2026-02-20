import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const lineUserId = request.nextUrl.searchParams.get('lineUserId');

    if (!lineUserId) {
        return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
    }

    try {
        // Look up LINE mapping
        const { rows: mappingRows } = await query(
            `SELECT student_code, display_name, picture_url, registered_at, updated_at
             FROM line_students
             WHERE line_user_id = $1`,
            [lineUserId]
        );

        if (mappingRows.length === 0) {
            return NextResponse.json({ registered: false });
        }

        const mapping = mappingRows[0];

        // Fetch student analytics + courses in parallel
        const [studentRes, coursesRes] = await Promise.all([
            query(
                `SELECT * FROM student_analytics WHERE student_code = $1`,
                [mapping.student_code]
            ),
            query(
                `SELECT course_code, course_name, revision_code, section, study_code, instructor,
                        attendance_rate, absence_rate, present_count, absent_count,
                        late_count, leave_count, total_sessions, class_check_raw
                 FROM attendance_records
                 WHERE student_code = $1
                 ORDER BY absence_rate DESC`,
                [mapping.student_code]
            ),
        ]);

        return NextResponse.json({
            registered: true,
            student:    studentRes.rows[0] || null,
            courses:    coursesRes.rows,
            lineProfile: {
                displayName:  mapping.display_name,
                pictureUrl:   mapping.picture_url,
                registeredAt: mapping.registered_at,
                updatedAt:    mapping.updated_at,
            },
        });
    } catch (error) {
        console.error('Error fetching LIFF profile:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
            { status: 500 }
        );
    }
}
