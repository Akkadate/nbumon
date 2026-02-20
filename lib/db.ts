import { Pool, QueryResult, QueryResultRow } from 'pg';

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
