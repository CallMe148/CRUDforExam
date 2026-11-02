import 'dotenv/config';
import { pool } from './db.js';
import { createApp } from './app.js';
const port = Number(process.env.PORT || 3001);
const server = createApp(pool).listen(port, () => console.log(`Book Catalog: http://localhost:${port} | Swagger: /docs`));
async function stop() { server.close(async() => { await pool.end(); process.exit(0); }); }
process.on('SIGINT',stop); process.on('SIGTERM',stop);
