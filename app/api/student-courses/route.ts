import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const studentCode = searchParams.get('studentCode');

    if (!studentCode) {
        return NextResponse.json({ error: 'studentCode is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('attendance_records')
            .select('course_code, course_name, revision_code, section, study_code, instructor, attendance_rate, absence_rate, present_count, absent_count, late_count, total_sessions')
            .eq('student_code', studentCode)
            .gte('absence_rate', 20)
            .order('absence_rate', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
    } catch (error) {
        console.error('Error fetching student courses:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
