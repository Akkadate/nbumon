const PAGE_SIZE = 1000;

/**
 * Fetch ALL rows from a Supabase query by paginating through results.
 *
 * Supabase (PostgREST) returns at most 1000 rows per request by default.
 * This helper loops through pages until all data is retrieved.
 *
 * Pass a factory function that accepts (from, to) range and returns a Supabase query.
 * The factory is called fresh on each page, so filters/ordering are preserved correctly.
 *
 * @example
 * const students = await fetchAllRows<StudentAnalytics>((from, to) =>
 *   supabase.from('student_analytics').select('*').eq('faculty', 'Engineering').range(from, to)
 * );
 */
export async function fetchAllRows<T = Record<string, unknown>>(
    queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
    const allData: T[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await queryFactory(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
            allData.push(...data);
            page++;
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }

    return allData;
}
