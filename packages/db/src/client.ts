import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const pools = new WeakMap<object, pg.Pool>();

export function createDb(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  pools.set(db, pool);
  return db;
}

export async function closeDb(db: Database): Promise<void> {
  const pool = pools.get(db);
  if (!pool) {
    throw new Error("Unknown database client");
  }
  await pool.end();
  pools.delete(db);
}

export type Database = ReturnType<typeof createDb>;
