import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const riskLevel = searchParams.get('riskLevel');
    const minAbsenceRate = searchParams.get('minAbsenceRate');
    const faculty = searchParams.get('faculty');
    const yearLevel = searchParams.get('yearLevel');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    try {
        let query = supabase
            .from('student_analytics')
            .select('*', { count: 'exact' })
            .order('avg_absence_rate', { ascending: false });

        // Apply filters
        if (riskLevel && riskLevel !== 'all') {
            query = query.eq('risk_level', riskLevel);
        }

        if (minAbsenceRate) {
            query = query.gte('avg_absence_rate', parseFloat(minAbsenceRate));
        }

        if (faculty && faculty !== 'all') {
            query = query.eq('faculty', faculty);
        }

        if (yearLevel && yearLevel !== 'all') {
            query = query.eq('year_level', parseInt(yearLevel));
        }

        const advisor = searchParams.get('advisor');
        if (advisor && advisor !== 'all') {
            query = query.eq('advisor_name', advisor);
        }

        if (search && search.trim()) {
            query = query.or(`student_code.ilike.%${search.trim()}%,student_name.ilike.%${search.trim()}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
