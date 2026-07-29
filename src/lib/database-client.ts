import "server-only";
import bcrypt from "bcryptjs";
import { getSql } from "@/lib/db";
import { clearSession, createSession, readSessionUserId } from "@/lib/session";

const allowedTables = new Set([
  "branches",
  "profiles",
  "profile_branches",
  "data_sales",
  "data_customers",
  "customer_baru_reports",
  "pemenuhan_po_reports",
  "penagihan_reports",
]);

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] }
  | { kind: "search"; columns: string[]; value: string };

type Result = { data: any; error: { message: string } | null; count?: number | null };

function identifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error("Identifier database tidak valid.");
  return `"${value}"`;
}

function normalizeValue(value: unknown) {
  return value && typeof value === "object" && !(value instanceof Date)
    ? JSON.stringify(value)
    : value;
}

class QueryBuilder implements PromiseLike<Result> {
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Record<string, unknown>[] = [];
  private filters: Filter[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private rowLimit?: number;
  private rowRange?: [number, number];
  private singleMode: "single" | "maybe" | null = null;
  private head = false;
  private countRequested = false;
  private conflictColumn?: string;

  constructor(private table: string) {
    if (!allowedTables.has(table)) throw new Error(`Tabel tidak diizinkan: ${table}`);
  }

  select(_columns = "*", options?: { count?: string; head?: boolean }) {
    this.operation = "select";
    this.head = Boolean(options?.head);
    this.countRequested = Boolean(options?.count);
    return this;
  }

  insert(value: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.payload = Array.isArray(value) ? value : [value];
    return this;
  }

  update(value: Record<string, unknown>) {
    this.operation = "update";
    this.payload = [value];
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(value: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = Array.isArray(value) ? value : [value];
    this.conflictColumn = options?.onConflict;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, values });
    return this;
  }

  or(expression: string) {
    const parts = expression.split(",");
    const columns: string[] = [];
    let value = "";
    for (const part of parts) {
      const match = part.match(/^([a-z_][a-z0-9_]*)\.ilike\.%(.*)%$/i);
      if (match) {
        columns.push(match[1]);
        value = match[2];
      }
    }
    if (columns.length) this.filters.push({ kind: "search", columns, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  range(from: number, to: number) {
    this.rowRange = [from, to];
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  private whereClause(parameters: any[]) {
    const clauses: string[] = [];
    for (const filter of this.filters) {
      if (filter.kind === "eq") {
        parameters.push(normalizeValue(filter.value));
        clauses.push(`t.${identifier(filter.column)} = $${parameters.length}`);
      } else if (filter.kind === "in") {
        if (!filter.values.length) {
          clauses.push("false");
        } else {
          const placeholders = filter.values.map((value) => {
            parameters.push(normalizeValue(value));
            return `$${parameters.length}`;
          });
          clauses.push(`t.${identifier(filter.column)} in (${placeholders.join(", ")})`);
        }
      } else {
        parameters.push(`%${filter.value}%`);
        clauses.push(`(${filter.columns.map((column) => `t.${identifier(column)} ilike $${parameters.length}`).join(" or ")})`);
      }
    }
    return clauses.length ? ` where ${clauses.join(" and ")}` : "";
  }

  private relationSelect() {
    const branchTables = new Set([
      "profiles", "profile_branches", "data_sales", "data_customers",
      "customer_baru_reports", "pemenuhan_po_reports", "penagihan_reports",
    ]);
    const reportTables = new Set([
      "customer_baru_reports", "pemenuhan_po_reports", "penagihan_reports",
    ]);
    let extra = "";
    if (branchTables.has(this.table)) {
      extra += ", (select jsonb_build_object('id', b.id, 'code', b.code, 'name', b.name) from branches b where b.id = t.branch_id) as branches";
    }
    if (reportTables.has(this.table)) {
      extra += ", (select jsonb_build_object('full_name', p.full_name, 'email', p.email) from profiles p where p.id = t.created_by) as profiles";
    }
    return extra;
  }

  private async execute(): Promise<Result> {
    try {
      const sql = getSql();
      const params: any[] = [];
      const table = identifier(this.table);

      if (this.operation === "select") {
        const where = this.whereClause(params);
        if (this.head || this.countRequested) {
          const rows = await sql.unsafe(`select count(*)::int as count from ${table} t${where}`, params);
          return { data: this.head ? null : rows, count: Number(rows[0]?.count ?? 0), error: null };
        }
        let statement = `select t.*${this.relationSelect()} from ${table} t${where}`;
        if (this.orderBy) statement += ` order by t.${identifier(this.orderBy.column)} ${this.orderBy.ascending ? "asc" : "desc"}`;
        if (this.rowRange) {
          statement += ` limit ${Math.max(0, this.rowRange[1] - this.rowRange[0] + 1)} offset ${Math.max(0, this.rowRange[0])}`;
        } else if (this.rowLimit !== undefined) {
          statement += ` limit ${Math.max(0, this.rowLimit)}`;
        }
        const rows = await sql.unsafe(statement, params);
        if (this.singleMode === "single" && rows.length !== 1) {
          return { data: null, error: { message: "Data tunggal tidak ditemukan." } };
        }
        if (this.singleMode) return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }

      if (this.operation === "delete") {
        const where = this.whereClause(params);
        const rows = await sql.unsafe(`delete from ${table} t${where} returning *`, params);
        return { data: rows, error: null };
      }

      if (!this.payload.length) return { data: [], error: null };
      const columns = Array.from(new Set(this.payload.flatMap((row) => Object.keys(row))));
      columns.forEach(identifier);

      if (this.operation === "update") {
        const assignments = columns.map((column) => {
          params.push(normalizeValue(this.payload[0][column]));
          return `${identifier(column)} = $${params.length}`;
        });
        const updateWhere = this.whereClause(params);
        const rows = await sql.unsafe(`update ${table} t set ${assignments.join(", ")}${updateWhere} returning *`, params);
        return { data: rows, error: null };
      }

      const insertParams: any[] = [];
      const values = this.payload.map((row) => `(${columns.map((column) => {
        insertParams.push(normalizeValue(row[column] ?? null));
        return `$${insertParams.length}`;
      }).join(", ")})`);
      let statement = `insert into ${table} (${columns.map(identifier).join(", ")}) values ${values.join(", ")}`;
      if (this.operation === "upsert") {
        if (!this.conflictColumn) throw new Error("Kolom konflik upsert belum ditentukan.");
        identifier(this.conflictColumn);
        const updates = columns
          .filter((column) => column !== this.conflictColumn)
          .map((column) => `${identifier(column)} = excluded.${identifier(column)}`);
        statement += ` on conflict (${identifier(this.conflictColumn)}) do update set ${updates.join(", ")}`;
      }
      const rows = await sql.unsafe(`${statement} returning *`, insertParams);
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : "Operasi database gagal." } };
    }
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

async function currentUser() {
  const id = await readSessionUserId();
  if (!id) return null;
  const rows = await getSql()`select id, email, full_name as metadata_full_name from app_users where id = ${id} and disabled_at is null`;
  const row = rows[0];
  return row ? { id: row.id, email: row.email, user_metadata: { full_name: row.metadata_full_name } } : null;
}

export function createDatabaseClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
    auth: {
      async getUser() {
        return { data: { user: await currentUser() }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const rows = await getSql()`select id, email, password_hash from app_users where lower(email) = lower(${email.trim()}) and disabled_at is null limit 1`;
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
          return { data: { user: null }, error: { message: "Email atau password salah." } };
        }
        await createSession(user.id);
        return { data: { user: { id: user.id, email: user.email } }, error: null };
      },
      async signOut() {
        await clearSession();
        return { error: null };
      },
      async updateUser({ password }: { password: string }) {
        const id = await readSessionUserId();
        if (!id) return { error: { message: "Sesi login tidak valid." } };
        const hash = await bcrypt.hash(password, 12);
        await getSql()`update app_users set password_hash = ${hash}, updated_at = now() where id = ${id}`;
        return { error: null };
      },
    },
  };
}

export function createDatabaseAdminClient() {
  const client = createDatabaseClient();
  return {
    ...client,
    auth: {
      admin: {
        async createUser({ email, password, user_metadata }: { email: string; password: string; email_confirm?: boolean; user_metadata?: { full_name?: string } }) {
          try {
            const hash = await bcrypt.hash(password, 12);
            const rows = await getSql()`insert into app_users (email, password_hash, full_name) values (${email.trim()}, ${hash}, ${user_metadata?.full_name ?? ""}) returning id, email`;
            return { data: { user: rows[0] }, error: null };
          } catch (error) {
            return { data: { user: null }, error: { message: error instanceof Error ? error.message : "Gagal membuat user." } };
          }
        },
        async updateUserById(id: string, values: { email?: string; password?: string; user_metadata?: { full_name?: string } }) {
          try {
            const hash = values.password ? await bcrypt.hash(values.password, 12) : null;
            await getSql()`update app_users set
              email = coalesce(${values.email ?? null}, email),
              full_name = coalesce(${values.user_metadata?.full_name ?? null}, full_name),
              password_hash = coalesce(${hash}, password_hash),
              updated_at = now()
              where id = ${id}`;
            return { data: { user: { id } }, error: null };
          } catch (error) {
            return { data: { user: null }, error: { message: error instanceof Error ? error.message : "Gagal memperbarui user." } };
          }
        },
        async deleteUser(id: string) {
          try {
            await getSql()`delete from app_users where id = ${id}`;
            return { error: null };
          } catch (error) {
            return { error: { message: error instanceof Error ? error.message : "Gagal menghapus user." } };
          }
        },
      },
    },
  };
}
