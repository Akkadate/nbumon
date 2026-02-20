import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const riskLevel    = searchParams.get('riskLevel');
    const faculty      = searchParams.get('faculty');
    const yearLevel    = searchParams.get('yearLevel');
    const advisor      = searchParams.get('advisor');
    const search       = searchParams.get('search')?.trim();
    const limit        = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const page         = Math.max(parseInt(searchParams.get('page')  || '1'), 1);
    const offset       = (page - 1) * limit;

    try {
        const conditions: string[] = [];
        const params: unknown[]    = [];

        if (riskLevel && riskLevel !== 'all') {
            params.push(riskLevel);
            conditions.push(`risk_level = $${params.length}`);
        }
        if (faculty && faculty !== 'all') {
            params.push(faculty);
            conditions.push(`faculty = $${params.length}`);
        }
        if (yearLevel && yearLevel !== 'all') {
            params.push(parseInt(yearLevel));
            conditions.push(`year_level = $${params.length}`);
        }
        if (advisor && advisor !== 'all') {
            params.push(advisor);
            conditions.push(`advisor_name = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            const idx = params.length;
            conditions.push(`(student_code ILIKE $${idx} OR student_name ILIKE $${idx})`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        params.push(limit);
        const limitIdx = params.length;
        params.push(offset);
        const offsetIdx = params.length;

        // COUNT(*) OVER() returns total in one round-trip (no separate count query needed)
        const { rows } = await query(
            `SELECT *, COUNT(*) OVER()::int AS total_count
             FROM student_analytics
             ${where}
             ORDER BY avg_absence_rate DESC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            params
        );

        const total = rows.length > 0 ? (rows[0].total_count as number) : 0;
        const data  = rows.map(({ total_count: _tc, ...rest }) => rest);

        return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
