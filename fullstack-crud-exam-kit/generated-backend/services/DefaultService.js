// Service ทำงานกับ SQL และไฟล์; Controller รับผิดชอบส่ง error ต่อให้ Express
const { pool } = require('../db');


async function apiHealthGET(req, res) {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
}


module.exports = { apiHealthGET };
