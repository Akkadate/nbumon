import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lineUserId, studentCode, displayName, pictureUrl } = body;

        if (!lineUserId || !studentCode) {
            return NextResponse.json(
                { error: 'lineUserId and studentCode are required' },
                { status: 400 }
            );
        }

        // Verify student exists
        const { rows: studentRows } = await query(
            `SELECT student_code, student_name, faculty, year_level
             FROM student_analytics
             WHERE student_code = $1`,
            [studentCode.trim()]
        );

        if (studentRows.length === 0) {
            return NextResponse.json(
                { error: 'ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาตรวจสอบอีกครั้ง' },
                { status: 404 }
            );
        }

        // Upsert LINE mapping (INSERT … ON CONFLICT DO UPDATE)
        await query(
            `INSERT INTO line_students (line_user_id, student_code, display_name, picture_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (line_user_id) DO UPDATE SET
                 student_code = EXCLUDED.student_code,
                 display_name = EXCLUDED.display_name,
                 picture_url  = EXCLUDED.picture_url,
                 updated_at   = NOW()`,
            [lineUserId, studentCode.trim(), displayName || null, pictureUrl || null]
        );

        const student = studentRows[0];
        return NextResponse.json({
            success: true,
            student: {
                student_code: student.student_code,
                student_name: student.student_name,
                faculty:      student.faculty,
                year_level:   student.year_level,
            },
        });
    } catch (error) {
        console.error('Error registering LINE student:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
            { status: 500 }
        );
    }
}
