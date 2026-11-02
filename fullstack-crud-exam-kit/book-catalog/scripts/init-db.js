import { readFile } from 'node:fs/promises';
import { pool } from '../db.js';
const client = await pool.connect();
try {
 await client.query('BEGIN');
 for (const file of ['schema.sql', 'seed.sql']) {
  await client.query(await readFile(new URL('../database/' + file, import.meta.url), 'utf8'));
 }
 await client.query('COMMIT');
 console.log('Schema and seed ready');
} catch (error) {
 await client.query('ROLLBACK');
 console.error(error.message); process.exitCode = 1;
} finally { client.release(); await pool.end(); }
