// โหลด .env ก่อนสร้าง pool; ทุก service ใช้ pool เดียวกัน
require('dotenv/config');
const { Pool } = require('pg');
module.exports.pool = new Pool({ connectionString: process.env.DATABASE_URL });
