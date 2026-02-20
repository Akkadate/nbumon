import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lineUserId } = body;

        if (!lineUserId) {
            return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
        }

        await query(
            `DELETE FROM line_students WHERE line_user_id = $1`,
            [lineUserId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error unlinking LINE student:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
            { status: 500 }
        );
    }
}
