export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET);
}
