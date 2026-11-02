// Service ทำงานกับ SQL และไฟล์; Controller รับผิดชอบส่ง error ต่อให้ Express
const { pool } = require('../db');
const { fail, id, text } = require('./catalog');

// อ่านรายการเรียงตาม id เพื่อให้หน้าเว็บแสดงลำดับคงที่
async function apiCategoriesGET(req, res) {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(rows);
}

async function apiCategoriesIdGET(req, res) {
    // req.params.id มาจาก URL เช่น /api/categories/3
    const categoryId = id(req.params.id);
    const { rows } = await pool.query('SELECT * FROM categories WHERE id=$1', [categoryId]);
    if (!rows[0]) throw fail(404, 'Category not found');
    res.json(rows[0]);
}

// ส่งค่าแยกจาก SQL ด้วย $1 ป้องกัน SQL injection; RETURNING ส่งแถวใหม่กลับ
async function apiCategoriesPOST(req, res) {
    const name = text(req.body?.name, 100);
    const { rows } = await pool.query('INSERT INTO categories(name) VALUES($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
}

// PUT/DELETE ตรวจว่ามีแถวที่ถูกแก้จริง มิฉะนั้นตอบ 404
async function apiCategoriesIdPUT(req, res) {
    const categoryId = id(req.params.id);
    const name = text(req.body?.name, 100);
    const { rows } = await pool.query('UPDATE categories SET name=$1 WHERE id=$2 RETURNING *', [name, categoryId]);
    if (!rows[0]) throw fail(404, 'Category not found');
    res.json(rows[0]);
}

async function apiCategoriesIdDELETE(req, res) {
    const categoryId = id(req.params.id);
    const { rows } = await pool.query('DELETE FROM categories WHERE id=$1 RETURNING id', [categoryId]);
    if (!rows[0]) throw fail(404, 'Category not found');
    // foreign key จะห้ามลบหมวดหมู่ที่ยังมีหนังสือ แล้วส่ง error ไปตอบ 409
    res.status(204).end();
}


module.exports = { apiCategoriesGET, apiCategoriesIdGET, apiCategoriesPOST, apiCategoriesIdPUT, apiCategoriesIdDELETE };
