import type { PoolClient } from 'pg'
import { query as poolQuery, getPoolClient } from '@/lib/db'

/**
 * A small Supabase-shaped query builder over plain Postgres.
 *
 * The app has roughly a hundred `.from(...).select(...).eq(...)` calls spread
 * across twenty-odd files. Rewriting each as raw SQL is where subtle bugs get
 * in, especially the ones that widen a WHERE clause and leak another user's
 * rows. Matching the existing shape instead means each call site changes one
 * line, and the translation is written and tested once, here.
 *
 * Only the subset the app actually uses is supported. Anything unsupported
 * throws loudly rather than silently returning wrong rows.
 */

type Row = Record<string, unknown>
type Exec = (sql: string, params: unknown[]) => Promise<Row[]>

/**
 * `data` is intentionally loose. The Supabase client these calls previously used
 * returned untyped rows for string-column selects, so widening here keeps every
 * existing call site compiling and behaving identically. Narrowing it would mean
 * hand-typing a hundred call sites for no runtime benefit.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface Result {
  data: any
  // `code` carries the Postgres SQLSTATE, which callers already branch on:
  // brands retries an insert on 42703 (undefined column) when an optional
  // column has not been migrated yet.
  error: { message: string; code?: string } | null
  // Not optional: callers compare it directly, and an optional number forces a
  // null check at every site for a value that is always present on a count query.
  count: number | null
}

/** Every embedded select in the app is scans joined to its owning brand. */
const EMBEDS: Record<string, { table: string; localKey: string; foreignKey: string }> = {
  brands: { table: 'brands', localKey: 'brand_id', foreignKey: 'id' },
}

function parseSelect(sel: string) {
  // "*, brands!inner(brand_name, user_id)" -> base "*" plus one embed.
  const embedMatch = sel.match(/,?\s*([a-z_]+)!inner\(([^)]*)\)/i)
  if (!embedMatch) return { base: sel.trim() || '*', embed: null }
  const [full, name, cols] = embedMatch
  const base = sel.replace(full, '').replace(/,\s*$/, '').trim() || '*'
  return {
    base,
    embed: {
      name,
      columns: cols.split(',').map((c) => c.trim()).filter(Boolean),
    },
  }
}

class Builder implements PromiseLike<Result> {
  private wheres: string[] = []
  private params: unknown[] = []
  private selectCols = '*'
  private embed: { name: string; columns: string[] } | null = null
  private orderBy: string | null = null
  private limitN: number | null = null
  private singleRow = false
  private wantCount = false
  private headOnly = false
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private payload: Row | Row[] | null = null
  private conflictTarget: string | null = null

  constructor(private table: string, private exec: Exec) {}

  private p(v: unknown) {
    this.params.push(v)
    return `$${this.params.length}`
  }

  select(cols = '*', opts?: { count?: 'exact'; head?: boolean }) {
    const { base, embed } = parseSelect(cols)
    this.selectCols = base
    this.embed = embed
    if (opts?.count === 'exact') this.wantCount = true
    if (opts?.head) this.headOnly = true
    return this
  }

  insert(values: Row | Row[]) {
    this.op = 'insert'
    this.payload = values
    return this
  }

  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = values
    this.conflictTarget = opts?.onConflict ?? null
    return this
  }

  update(values: Row) {
    this.op = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  eq(col: string, val: unknown) { this.wheres.push(`"${col}" = ${this.p(val)}`); return this }
  neq(col: string, val: unknown) { this.wheres.push(`"${col}" <> ${this.p(val)}`); return this }
  gt(col: string, val: unknown) { this.wheres.push(`"${col}" > ${this.p(val)}`); return this }
  gte(col: string, val: unknown) { this.wheres.push(`"${col}" >= ${this.p(val)}`); return this }
  lt(col: string, val: unknown) { this.wheres.push(`"${col}" < ${this.p(val)}`); return this }
  lte(col: string, val: unknown) { this.wheres.push(`"${col}" <= ${this.p(val)}`); return this }

  in(col: string, vals: unknown[]) {
    // An empty IN () is a syntax error, and it should match nothing anyway.
    if (!vals.length) { this.wheres.push('false'); return this }
    this.wheres.push(`"${col}" = ANY(${this.p(vals)})`)
    return this
  }

  /** Only the `is null` form is used; anything else would need real parsing. */
  not(col: string, op: string, val: unknown) {
    if (op === 'is' && val === null) { this.wheres.push(`"${col}" IS NOT NULL`); return this }
    throw new Error(`pgq: unsupported not(${op})`)
  }

  /** Supports the PostgREST "col.op.value,col.op.value" OR syntax. */
  or(expr: string) {
    const parts = expr.split(',').map((chunk) => {
      const [col, op, ...rest] = chunk.split('.')
      const val = rest.join('.')
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op]
      if (!sqlOp) throw new Error(`pgq: unsupported or() operator "${op}"`)
      return `"${col}" ${sqlOp} ${this.p(val === 'null' ? null : val)}`
    })
    this.wheres.push(`(${parts.join(' OR ')})`)
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? 'DESC' : 'ASC'
    this.orderBy = `"${col}" ${dir}`
    return this
  }

  limit(n: number) { this.limitN = n; return this }
  single() { this.singleRow = true; this.limitN = this.limitN ?? 1; return this }
  maybeSingle() { return this.single() }

  private whereSql() {
    return this.wheres.length ? ' WHERE ' + this.wheres.join(' AND ') : ''
  }

  private async run(): Promise<Result> {
    try {
      const t = `public.${this.table}`

      if (this.op === 'insert' || this.op === 'upsert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
        if (!rows.length) return { data: [], error: null, count: null }
        const cols = Object.keys(rows[0])
        const tuples: string[] = []
        for (const r of rows) {
          tuples.push('(' + cols.map((c) => this.p(r[c] ?? null)).join(',') + ')')
        }
        const conflict =
          this.op === 'upsert'
            ? ` ON CONFLICT ${this.conflictTarget ? `("${this.conflictTarget}")` : ''} DO UPDATE SET ` +
              cols.filter((c) => c !== this.conflictTarget).map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
            : ''
        const sql = `INSERT INTO ${t} (${cols.map((c) => `"${c}"`).join(',')}) VALUES ${tuples.join(',')}${conflict} RETURNING *`
        const out = await this.exec(sql, this.params)
        return { data: this.singleRow ? out[0] ?? null : out, error: null, count: null }
      }

      if (this.op === 'update') {
        const cols = Object.keys(this.payload as Row)
        const sets = cols.map((c) => `"${c}" = ${this.p((this.payload as Row)[c] ?? null)}`)
        // Params for SET must be bound before the WHERE params already queued,
        // so the wheres are rebuilt after. Simpler: build SET first, then where.
        const sql = `UPDATE ${t} SET ${sets.join(', ')}${this.whereSql()} RETURNING *`
        const out = await this.exec(sql, this.params)
        return { data: this.singleRow ? out[0] ?? null : out, error: null, count: null }
      }

      if (this.op === 'delete') {
        const sql = `DELETE FROM ${t}${this.whereSql()} RETURNING *`
        const out = await this.exec(sql, this.params)
        return { data: out, error: null, count: null }
      }

      if (this.headOnly && this.wantCount) {
        const out = await this.exec(`SELECT count(*)::int AS n FROM ${t}${this.whereSql()}`, this.params)
        return { data: null, error: null, count: Number(out[0]?.n ?? 0) }
      }

      let sql: string
      if (this.embed) {
        const cfg = EMBEDS[this.embed.name]
        if (!cfg) throw new Error(`pgq: unknown embed "${this.embed.name}"`)
        const baseCols = this.selectCols === '*'
          ? 'a.*'
          : this.selectCols.split(',').map((c) => `a."${c.trim()}"`).join(', ')
        const embedCols = this.embed.columns.length && this.embed.columns[0] !== '*'
          ? this.embed.columns.map((c) => `'${c}', b."${c}"`).join(', ')
          : null
        // !inner is an inner join, so a row with no matching brand drops out,
        // which is the behaviour the callers already rely on.
        const nested = embedCols
          ? `json_build_object(${embedCols})`
          : `to_jsonb(b.*)`
        sql = `SELECT ${baseCols}, ${nested} AS "${cfg.table}" FROM ${t} a
               JOIN public.${cfg.table} b ON b."${cfg.foreignKey}" = a."${cfg.localKey}"`
        if (this.wheres.length) {
          sql += ' WHERE ' + this.wheres.map((w) => w.replace(/"([a-z_]+)"/g, 'a."$1"')).join(' AND ')
        }
      } else {
        sql = `SELECT ${this.selectCols} FROM ${t}${this.whereSql()}`
      }

      if (this.orderBy) sql += ` ORDER BY ${this.embed ? 'a.' : ''}${this.orderBy}`
      if (this.limitN !== null) sql += ` LIMIT ${this.limitN}`

      const out = await this.exec(sql, this.params)
      return {
        data: this.singleRow ? out[0] ?? null : out,
        error: this.singleRow && !out.length ? { message: 'No rows found' } : null,
        count: this.wantCount ? out.length : null,
      }
    } catch (e) {
      return {
        data: this.singleRow ? null : [],
        error: { message: (e as Error).message, code: (e as { code?: string }).code },
        count: null,
      }
    }
  }

  then<R1 = Result, R2 = never>(
    onfulfilled?: ((v: Result) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected)
  }
}

/** Query as a specific user, so row-level security applies. */
export function dbFor(client: PoolClient) {
  const exec: Exec = async (sql, params) => (await client.query(sql, params)).rows
  return { from: (table: string) => new Builder(table, exec) }
}

/**
 * Query as a user without restructuring the calling handler.
 *
 * Each statement runs in its own short transaction that sets `app.user_id`
 * first, so row-level security applies exactly as it does inside withUser().
 * The cost is one transaction per query rather than per request, which is a
 * fair trade: the alternative is rewriting every route around a callback, and
 * that restructuring is where a missed `await` or an early return quietly drops
 * the user context and widens a query.
 *
 * Prefer withUser() where several statements must see a consistent snapshot.
 */
export function userDb(userId: string) {
  const exec: Exec = async (sql, params) => {
    const client = await getPoolClient()
    try {
      await client.query('BEGIN')
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', userId])
      const r = await client.query(sql, params)
      await client.query('COMMIT')
      return r.rows
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
  return { from: (table: string) => new Builder(table, exec) }
}

/** Query with no user context. Public tables and admin paths only. */
export function dbPublic() {
  const exec: Exec = (sql, params) => poolQuery(sql, params)
  return { from: (table: string) => new Builder(table, exec) }
}
