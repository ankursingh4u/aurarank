import { Pool, type PoolClient, type QueryResultRow } from 'pg'

/**
 * Postgres access for the self-hosted database.
 *
 * Identity still lives in Supabase: the app authenticates there and receives a
 * user id, which arrives here as an opaque uuid. Everything else, all the
 * application data, lives in this database.
 */

declare global {
  // eslint-disable-next-line no-var
  var __seo4aiPool: Pool | undefined
}

/**
 * One pool per warm serverless instance.
 *
 * Cached on globalThis because module state is not guaranteed to survive between
 * invocations in development, and a fresh pool per request would exhaust the
 * server's connection limit under any real load. `max` is deliberately small:
 * this Postgres has no connection pooler in front of it, so every concurrent
 * instance holds real backend connections.
 */
function getPool(): Pool {
  if (!global.__seo4aiPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')

    global.__seo4aiPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    })

    // An idle client erroring (server restart, network blip) otherwise surfaces
    // as an unhandled rejection that takes the whole process down.
    global.__seo4aiPool.on('error', (err) => {
      console.error('Postgres pool error:', err.message)
    })
  }
  return global.__seo4aiPool
}

/** Run a query with no user context. Only for data that is public or already scoped. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params)
  return result.rows
}

/**
 * Run queries as a specific user, inside one transaction.
 *
 * Row-level security is enforced by the database, keyed on `app.user_id`. That
 * setting is transaction-scoped, so every statement that must respect RLS has to
 * run on this same client, inside this same transaction. Using the pool directly
 * for user data would read with no user set.
 *
 * With no user set, `current_setting('app.user_id', true)` returns NULL, every
 * policy evaluates false, and queries return nothing. A forgotten user id
 * therefore yields no rows rather than every row.
 */
export async function withUser<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    // Parameterised: a user id is externally supplied and must never be
    // interpolated into SQL, even inside set_config.
    await client.query('SELECT set_config($1, $2, true)', ['app.user_id', userId])
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** A raw pooled client. Callers must release it. */
export async function getPoolClient(): Promise<PoolClient> {
  return getPool().connect()
}

/** True when a self-hosted database is configured. Lets callers fall back to Supabase. */
export function hasDatabaseUrl(): boolean {
  return !!process.env.DATABASE_URL
}
