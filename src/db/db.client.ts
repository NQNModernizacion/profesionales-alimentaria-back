import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export const createDrizzleClient = (connectionString: string) => {
  const sql = postgres(connectionString, {
    max: 10,
    prepare: false,
  });

  return drizzle(sql, { schema, casing: 'snake_case' });
};

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
