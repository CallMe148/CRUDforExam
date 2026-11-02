import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

// อ้างตำแหน่งจากไฟล์นี้ เพื่อให้ path ถูกแม้เริ่มโปรแกรมจากโฟลเดอร์อื่น
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(here, 'uploads');
mkdirSync(uploadDir, { recursive: true });
const app = express();
// Middleware ทำงานก่อน route: แปลง JSON เป็น req.body และเปิดให้โหลดไฟล์
app.use(express.json());
app.use('/uploads', express.static(uploadDir, { dotfiles: 'deny' }));
app.use(express.static(path.join(here, 'public')));

// สร้าง Error พร้อม HTTP status แล้วส่งไปจัดรูปแบบใน error handler ท้ายไฟล์
const fail = (status, message) => Object.assign(new Error(message), { status });
function id(value) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
        throw fail(400, 'Invalid ID');
    }
    return Number(value);
}
function text(value, max) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
        throw fail(400, `Required text, maximum ${max} characters`);
    }
    return value.trim();
}

// Multer อ่าน multipart เฉพาะ route หนังสือ เก็บไฟล์ใน memory ก่อนตรวจชนิด
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 10 }
});
async function saveCover(file) {
    if (!file) return null;
    const buffer = file.buffer;
    let extension;
    // ตรวจลายเซ็นต้นไฟล์ แทนการเชื่อเฉพาะนามสกุลหรือ MIME ที่ผู้ใช้อ้าง
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
    else if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) extension = 'jpg';
    else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
    else throw fail(400, 'Cover must be PNG, JPEG or WebP');
    const name = `${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, name), buffer);
    return name; // ฐานข้อมูลเก็บแค่ชื่อไฟล์ ส่วนภาพอยู่ใน uploads
}
async function removeCover(name) {
    if (!name || path.basename(name) !== name) return;
    await unlink(path.join(uploadDir, name)).catch(error => {
        // ไฟล์ที่หายไปแล้วไม่ต้องลบซ้ำ ส่วน error อื่นบันทึกไว้ตรวจสอบ
        if (error.code !== 'ENOENT') console.error('Cover cleanup:', error.message);
    });
}

app.get('/api/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
});

// GET อ่านข้อมูล; rows เป็น array ของแถวที่ PostgreSQL ส่งกลับ
app.get('/api/categories', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(rows);
});
app.get('/api/categories/:id', async (req, res) => {
    // req.params.id มาจาก URL เช่น /api/categories/3
    const categoryId = id(req.params.id);
    const { rows } = await pool.query('SELECT * FROM categories WHERE id=$1', [categoryId]);
    if (!rows[0]) throw fail(404, 'Category not found');
    res.json(rows[0]);
});

// $1 เป็น placeholder: ส่งค่าแยกจาก SQL เพื่อป้องกัน SQL injection
// RETURNING * ขอแถวที่เพิ่งบันทึกกลับมา รวม id ที่ฐานข้อมูลสร้างให้
app.post('/api/categories', async (req, res) => {
    const name = text(req.body?.name, 100);
    const { rows } = await pool.query('INSERT INTO categories(name) VALUES($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
});
app.put('/api/categories/:id', async (req, res) => {
    const categoryId = id(req.params.id);
    const name = text(req.body?.name, 100);
    const { rows } = await pool.query('UPDATE categories SET name=$1 WHERE id=$2 RETURNING *', [name, categoryId]);
    if (!rows[0]) throw fail(404, 'Category not found');
    res.json(rows[0]);
});
app.delete('/api/categories/:id', async (req, res) => {
    const categoryId = id(req.params.id);
    const { rows } = await pool.query('DELETE FROM categories WHERE id=$1 RETURNING id', [categoryId]);
    if (!rows[0]) throw fail(404, 'Category not found');
    // foreign key จะห้ามลบหมวดหมู่ที่ยังมีหนังสือ แล้วส่ง error ไปตอบ 409
    res.status(204).end();
});

// JOIN เชื่อม category_id ของหนังสือกับ id หมวดหมู่ เพื่อส่งชื่อไปแสดงในเว็บ
app.get('/api/books', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT b.*, c.name AS category_name FROM books b JOIN categories c ON c.id=b.category_id ORDER BY b.id ASC'
    );
    res.json(rows);
});
app.get('/api/books/:id', async (req, res) => {
    const bookId = id(req.params.id);
    const { rows } = await pool.query('SELECT * FROM books WHERE id=$1', [bookId]);
    if (!rows[0]) throw fail(404, 'Book not found');
    res.json(rows[0]);
});

// POST และ PUT ใช้การตรวจข้อมูลชุดเดียวกัน จึงรวมไว้ในฟังก์ชันนี้
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
app.post('/api/books', upload.single('cover'), writeBook);
app.put('/api/books/:id', upload.single('cover'), writeBook);
app.delete('/api/books/:id', async (req, res) => {
    const bookId = id(req.params.id);
    const { rows } = await pool.query('DELETE FROM books WHERE id=$1 RETURNING cover', [bookId]);
    if (!rows[0]) throw fail(404, 'Book not found');
    await removeCover(rows[0].cover);
    res.status(204).end();
});

// อ่านสเปกจาก JSON แล้วเปิดหน้า Swagger ให้ทดลองส่ง request ได้
const spec = JSON.parse(readFileSync(path.join(here, 'openapi.json'), 'utf8'));
app.get('/openapi.json', (req, res) => res.json(spec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Express 5 ส่ง error จาก async route มาที่นี่อัตโนมัติ ต้องมี 4 parameters
app.use((err, req, res, next) => {
    let status = err.status || 500;
    let message = err.message;
    if (err instanceof multer.MulterError) {
        status = 400;
        message = err.code === 'LIMIT_FILE_SIZE' ? 'Cover exceeds 2 MB' : err.message;
    }
    if (err.code === '23505') {
        status = 409;
        message = 'Category name already exists';
    }
    if (err.code === '23503' || err.code === '23001') {
        status = 409;
        message = 'Category does not exist or is still used by books';
    }
    if (status >= 500) {
        console.error(err);
        message = 'Internal server error';
    }
    res.status(status).json({ error: message });
});
const port = Number(process.env.PORT || 3002);
app.listen(port, () => console.log(`Book Catalog: http://localhost:${port} | Swagger: http://localhost:${port}/docs`));
