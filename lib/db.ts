import { Pool, QueryResult, QueryResultRow, types } from 'pg';

// pg returns NUMERIC/DECIMAL as strings by default to preserve precision.
// Our values (gpa, attendance_rate, absence_rate, etc.) are small decimals
// that fit safely in a JS float, so we parse them as numbers here globally.
// OID 1700 = NUMERIC/DECIMAL, OID 701 = FLOAT8, OID 700 = FLOAT4
types.setTypeParser(1700, (val: string) => parseFloat(val));
types.setTypeParser(701,  (val: string) => parseFloat(val));
types.setTypeParser(700,  (val: string) => parseFloat(val));

/**
 * PostgreSQL connection pool for University server.
 *
 * Environment variables:
 *   DATABASE_URL   — full connection string
 *                    e.g. postgresql://user:pass@localhost:5432/student_monitoring
 *   DATABASE_SSL   — set to "true" only if the server requires SSL (typically false for LAN)
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,                   // max concurrent connections
    idleTimeoutMillis: 30000,  // close idle connections after 30s
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on PostgreSQL client:', err);
});

/**
 * Execute a parameterised SQL query.
 *
 * @example
 * const { rows } = await query('SELECT * FROM student_analytics WHERE risk_level = $1', ['critical']);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
}

export { pool };
