import { createDatabaseClient } from "@/lib/database-client";

export async function createClient() {
  return createDatabaseClient();
}
