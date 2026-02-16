import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const hasNoChecks = searchParams.get('hasNoChecks');
    const minAbsenceRate = searchParams.get('minAbsenceRate');
    const q = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20'); // Default to 20 for pagination
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        let query = supabase
            .from('course_analytics')
            .select('*', { count: 'exact' }); // Request exact count for pagination

        // Apply filters
        if (q) {
            // Search by course_code, name, or instructor
            query = query.or(`course_code.ilike.%${q}%,course_name.ilike.%${q}%,instructor.ilike.%${q}%`);
        }

        if (hasNoChecks === 'true') {
            query = query.eq('has_no_checks', true);
        } else if (hasNoChecks === 'false') {
            query = query.eq('has_no_checks', false);
        }

        if (minAbsenceRate) {
            query = query.gte('students_high_absence', parseInt(minAbsenceRate));
        }

        // Apply sorting: Primary by absence (desc), Secondary by course_code (asc) for stability
        query = query.order('students_high_absence', { ascending: false })
            .order('course_code', { ascending: true });

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
