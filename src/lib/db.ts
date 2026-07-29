import "server-only";
import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __konfirmasiSql: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum dikonfigurasi.");

  if (!global.__konfirmasiSql) {
    global.__konfirmasiSql = postgres(databaseUrl, {
      max: Number(process.env.DATABASE_POOL_SIZE ?? "10"),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return global.__konfirmasiSql;
}
