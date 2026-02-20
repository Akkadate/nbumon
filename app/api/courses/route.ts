import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams    = request.nextUrl.searchParams;
    const hasNoChecks     = searchParams.get('hasNoChecks');
    const minAbsenceRate  = searchParams.get('minAbsenceRate');
    const q               = searchParams.get('q');
    const limit           = Math.min(parseInt(searchParams.get('limit')  || '20'), 200);
    const offset          = parseInt(searchParams.get('offset') || '0');

    try {
        const conditions: string[] = [];
        const params: unknown[]    = [];

        if (q) {
            params.push(`%${q}%`);
            const idx = params.length;
            conditions.push(`(course_code ILIKE $${idx} OR course_name ILIKE $${idx} OR instructor ILIKE $${idx})`);
        }
        if (hasNoChecks === 'true') {
            conditions.push('has_no_checks = TRUE');
        } else if (hasNoChecks === 'false') {
            conditions.push('has_no_checks = FALSE');
        }
        if (minAbsenceRate) {
            params.push(parseInt(minAbsenceRate));
            conditions.push(`students_high_absence >= $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        params.push(limit);
        const limitIdx = params.length;
        params.push(offset);
        const offsetIdx = params.length;

        const { rows } = await query(
            `SELECT *, COUNT(*) OVER()::int AS total_count
             FROM course_analytics
             ${where}
             ORDER BY students_high_absence DESC, course_code ASC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            params
        );

        const total = rows.length > 0 ? (rows[0].total_count as number) : 0;
        const data  = rows.map(({ total_count: _tc, ...rest }) => rest);

        return NextResponse.json({ data, total: total, limit, offset });
    } catch (error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
