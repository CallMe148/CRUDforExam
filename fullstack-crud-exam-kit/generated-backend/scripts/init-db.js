// รันด้วย npm run db:init เพื่อสร้างตารางและเพิ่มข้อมูลตัวอย่าง
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('../db');

(async () => {

let client;
try {
    client = await pool.connect();
    // ใช้ connection เดียวตลอด transaction เพื่อยกเลิกได้หาก SQL ไฟล์ใดผิดพลาด
    await client.query('BEGIN');
    for (const file of ['schema.sql', 'seed.sql']) {
        // สร้างตารางก่อน seed เพราะหนังสือต้องอ้างอิงหมวดหมู่ที่มีอยู่แล้ว
        const sql = await readFile(path.join(__dirname, '../database', file), 'utf8');
        await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Schema and seed ready');
} catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(error.message);
    process.exitCode = 1;
} finally {
    if (client) client.release();
    await pool.end(); // script จบแล้ว ปิด pool เพื่อให้ Node ออกจากโปรแกรมได้
}

})();
