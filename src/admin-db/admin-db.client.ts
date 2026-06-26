import { createPool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './admin-db.schema';

export const createAdminDrizzleClient = (connectionString: string) => {
  const pool = createPool({
    uri: connectionString,
    connectionLimit: 5,
    waitForConnections: true,
  });

  return drizzle(pool, { schema, mode: 'default' });
};

export type AdminDrizzleClient = ReturnType<typeof createAdminDrizzleClient>;
