import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from './logger.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 15,
  namedPlaceholders: true,
  dateStrings: true,
  multipleStatements: false,
});

/** Run a query, returning rows. */
export async function query(sql, params = {}) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/** Run work inside a transaction; cb receives a connection with .q(sql, params). */
export async function withTransaction(cb) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const wrapped = {
      conn,
      q: async (sql, params = {}) => {
        const [rows] = await conn.query(sql, params);
        return rows;
      },
    };
    const result = await cb(wrapped);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Wait for DB to accept connections (container start ordering safety net). */
export async function waitForDb(retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      logger.info('Database connection established');
      return;
    } catch (err) {
      logger.warn(`DB not ready (attempt ${i}/${retries}): ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database unavailable after retries');
}
