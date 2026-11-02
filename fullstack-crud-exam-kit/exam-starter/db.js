// โหลดค่าจาก .env ก่อนสร้าง connection เช่น DATABASE_URL
import 'dotenv/config';
import pg from 'pg';

// Pool จัดการ connection หลายตัวและนำกลับมาใช้ซ้ำ ไม่ต้องเชื่อมต่อใหม่ทุก request
// ไฟล์อื่น import pool ไปเรียก pool.query(SQL, [ค่าที่ใช้แทน $1, $2, ...]) ได้
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
