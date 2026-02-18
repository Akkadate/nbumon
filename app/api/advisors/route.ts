import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        // Fetch all students to get unique advisors
        // Note: Supabase doesn't have a distinct() function on select() directly in JS client
        // strictly speaking, but we can standard select and filter in JS if data is small,
        // or use a remote procedure if performance is needed.
        // For now, fetching 'advisor_name' from student_analytics is efficient enough for this scale.

        const { data, error } = await supabase
            .from('student_analytics')
            .select('advisor_name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const advisors = Array.from(new Set(
            (data || [])
                .map((s: any) => s.advisor_name)
                .filter(Boolean)
                .map((s: string) => s.trim())
        )).sort();

        return NextResponse.json({ advisors });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
