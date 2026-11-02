// Service ทำงานกับ SQL และไฟล์; Controller รับผิดชอบส่ง error ต่อให้ Express
const { pool } = require('../db');
const { fail, id, text, saveCover, removeCover } = require('./catalog');

// JOIN ดึงชื่อหมวดหมู่มาแสดงพร้อมรายการหนังสือ
async function apiBooksGET(req, res) {
    const { rows } = await pool.query(
        'SELECT b.*, c.name AS category_name FROM books b JOIN categories c ON c.id=b.category_id ORDER BY b.id ASC'
    );
    res.json(rows);
}

async function apiBooksIdGET(req, res) {
    const bookId = id(req.params.id);
    const { rows } = await pool.query('SELECT * FROM books WHERE id=$1', [bookId]);
    if (!rows[0]) throw fail(404, 'Book not found');
    res.json(rows[0]);
}

// ลบข้อมูลสำเร็จก่อนลบไฟล์ปก; ตอบ 204 โดยไม่มี response body
async function apiBooksIdDELETE(req, res) {
    const bookId = id(req.params.id);
    const { rows } = await pool.query('DELETE FROM books WHERE id=$1 RETURNING cover', [bookId]);
    if (!rows[0]) throw fail(404, 'Book not found');
    await removeCover(rows[0].cover);
    res.status(204).end();
}

// POST และ PUT ใช้ validation ร่วมกัน; PUT เก็บปกเดิมหากไม่ส่งปกใหม่
async function writeBook(req, res) {
    const editing = req.method === 'PUT';
    const bookId = editing ? id(req.params.id) : null;
    // Multer แยกช่องข้อความไว้ใน req.body และไฟล์ไว้ใน req.file
    const title = text(req.body?.title, 200);
    const author = text(req.body?.author, 150);
    const category = id(req.body?.category_id);
    const rawPrice = String(req.body?.price ?? '');
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(rawPrice)) {
        throw fail(400, 'Price must be 0..99999999.99 with at most 2 decimals');
    }
    const price = Number(rawPrice);
    const newCover = await saveCover(req.file);
    let client;
    try {
        client = await pool.connect();
    } catch (error) {
        await removeCover(newCover);
        throw error;
    }
    let oldCover = null;
    let result;
    try {
        // Transaction ต้องใช้ client เดียว: สำเร็จจึง COMMIT ผิดพลาดให้ ROLLBACK
        await client.query('BEGIN');
        if (editing) {
            // ล็อกแถวระหว่างแก้ไข ป้องกันสอง request เปลี่ยนปกชนกัน
            const old = await client.query('SELECT * FROM books WHERE id=$1 FOR UPDATE', [bookId]);
            if (!old.rows[0]) throw fail(404, 'Book not found');
            oldCover = old.rows[0].cover;
            const cover = newCover || (req.body.remove_cover === 'true' ? null : oldCover);
            result = await client.query(
                'UPDATE books SET title=$1, author=$2, price=$3, category_id=$4, cover=$5 WHERE id=$6 RETURNING *',
                [title, author, price, category, cover, bookId]
            );
        } else {
            result = await client.query(
                'INSERT INTO books(title, author, price, category_id, cover) VALUES($1,$2,$3,$4,$5) RETURNING *',
                [title, author, price, category, newCover]
            );
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK').catch(rollbackError => console.error('Rollback:', rollbackError.message));
        await removeCover(newCover); // ลบไฟล์ใหม่หากบันทึกไม่ได้ เพื่อไม่ทิ้งไฟล์ที่ไม่มีข้อมูลอ้างอิง
        throw error;
    } finally {
        client.release(); // คืน connection ให้ pool แม้งานจะผิดพลาด
    }
    // ลบปกเก่าหลังฐานข้อมูลบันทึกสำเร็จเท่านั้น
    if (editing && oldCover !== result.rows[0].cover) await removeCover(oldCover);
    res.status(editing ? 200 : 201).json(result.rows[0]);
}

// POST/PUT ใช้ขั้นตอนตรวจข้อมูลและ transaction ชุดเดียวกัน
const apiBooksPOST = writeBook;
const apiBooksIdPUT = writeBook;

module.exports = { apiBooksGET, apiBooksIdGET, apiBooksIdDELETE, apiBooksPOST, apiBooksIdPUT };
