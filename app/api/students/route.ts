import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const riskLevel = searchParams.get('riskLevel');
    const minAbsenceRate = searchParams.get('minAbsenceRate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        let query = supabase
            .from('student_analytics')
            .select('*')
            .order('avg_absence_rate', { ascending: false });

        // Apply filters
        if (riskLevel && riskLevel !== 'all') {
            query = query.eq('risk_level', riskLevel);
        }

        if (minAbsenceRate) {
            query = query.gte('avg_absence_rate', parseFloat(minAbsenceRate));
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data,
            total: count,
            limit,
            offset
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
