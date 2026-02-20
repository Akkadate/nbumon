import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const { rows } = await query(
            `SELECT DISTINCT TRIM(advisor_name) AS advisor_name
             FROM student_analytics
             WHERE advisor_name IS NOT NULL AND TRIM(advisor_name) != ''
             ORDER BY advisor_name`
        );

        const advisors = rows.map(r => r.advisor_name as string);
        return NextResponse.json({ advisors });
    } catch (error) {
        console.error('Error fetching advisors:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
