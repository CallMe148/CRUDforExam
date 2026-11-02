import express from 'express';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export function createApp(db, uploadDir = path.join(here, 'uploads')) {
    const app = express();
    mkdirSync(uploadDir, { recursive: true });
    app.use(express.json());
    app.use('/uploads', express.static(uploadDir, { dotfiles: 'deny' }));
    app.use(express.static(path.join(here, 'public')));
    const spec = JSON.parse(readFileSync(path.join(here, 'openapi.json')));
    app.get('/openapi.json', (req, res) => res.json(spec));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
    const fail = (status, message) => Object.assign(new Error(message), { status });
    const id = value => {
        if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw fail(400, 'Invalid ID');
        return Number(value);
    };
    const text = (value, max) => {
        if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw fail(400, `Required text, maximum ${max} characters`);
        return value.trim();
    };
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 10 } });
    // Inspect actual file signatures; never use a client filename as a storage path.
    async function saveCover(file) {
        if (!file) return null;
        const b = file.buffer;
        let ext;
        if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ext = 'png';
        else if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) ext = 'jpg';
        else if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';
        else throw fail(400, 'Cover must be PNG, JPEG or WebP');
        const name = randomUUID() + '.' + ext;
        const { writeFile } = await import('node:fs/promises');
        await writeFile(path.join(uploadDir, name), b);
        return name;
    }
    async function removeCover(name) {
        if (name && path.basename(name) === name) await unlink(path.join(uploadDir, name)).catch(e => { if (e.code !== 'ENOENT') console.error('Cover cleanup:', e.message); });
    }
    app.get('/api/health', async (req, res) => { await db.query('SELECT 1'); res.json({ status: 'ok' }); });
    app.get('/api/categories', async (req, res) => res.json((await db.query('SELECT * FROM categories ORDER BY id ASC')).rows));
    app.get('/api/categories/:id', async (req, res) => {
        const r = await db.query('SELECT * FROM categories WHERE id=$1', [id(req.params.id)]);
        if (!r.rows[0]) throw fail(404, 'Category not found'); res.json(r.rows[0]);
    });
    app.post('/api/categories', async (req, res) => res.status(201).json((await db.query('INSERT INTO categories(name) VALUES($1) RETURNING *', [text(req.body.name, 100)])).rows[0]));
    app.put('/api/categories/:id', async (req, res) => {
        const r = await db.query('UPDATE categories SET name=$1 WHERE id=$2 RETURNING *', [text(req.body.name, 100), id(req.params.id)]);
        if (!r.rows[0]) throw fail(404, 'Category not found'); res.json(r.rows[0]);
    });
    app.delete('/api/categories/:id', async (req, res) => {
        const r = await db.query('DELETE FROM categories WHERE id=$1 RETURNING id', [id(req.params.id)]);
        if (!r.rows[0]) throw fail(404, 'Category not found'); res.status(204).end();
    });
    app.get('/api/books', async (req, res) => res.json((await db.query('SELECT b.*, c.name AS category_name FROM books b JOIN categories c ON c.id=b.category_id ORDER BY b.id ASC')).rows));
    app.get('/api/books/:id', async (req, res) => {
        const r = await db.query('SELECT * FROM books WHERE id=$1', [id(req.params.id)]);
        if (!r.rows[0]) throw fail(404, 'Book not found'); res.json(r.rows[0]);
    });
    async function writeBook(req, res) {
        const editing = req.method === 'PUT';
        const bookId = editing ? id(req.params.id) : null;
        const title = text(req.body.title, 200), author = text(req.body.author, 150), category = id(req.body.category_id);
        const raw = String(req.body.price ?? '');
        if (!/^\d{1,8}(\.\d{1,2})?$/.test(raw)) throw fail(400, 'Price must be 0..99999999.99 with at most 2 decimals');
        const price = Number(raw);
        const newCover = await saveCover(req.file);
        let client;
        try { client = await db.connect(); } catch (e) { await removeCover(newCover); throw e; }
        let oldCover = null, result;
        try {
            await client.query('BEGIN');
            if (editing) {
                const old = await client.query('SELECT * FROM books WHERE id=$1 FOR UPDATE', [bookId]);
                if (!old.rows[0]) throw fail(404, 'Book not found');
                oldCover = old.rows[0].cover;
                const cover = newCover || (req.body.remove_cover === 'true' ? null : oldCover);
                result = await client.query('UPDATE books SET title=$1,author=$2,price=$3,category_id=$4,cover=$5 WHERE id=$6 RETURNING *', [title, author, price, category, cover, bookId]);
            } else result = await client.query('INSERT INTO books(title,author,price,category_id,cover) VALUES($1,$2,$3,$4,$5) RETURNING *', [title, author, price, category, newCover]);
            await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK'); await removeCover(newCover); throw e; }
        finally { client.release(); }
        if (editing && oldCover !== result.rows[0].cover) await removeCover(oldCover);
        res.status(editing ? 200 : 201).json(result.rows[0]);
    }
    app.post('/api/books', upload.single('cover'), writeBook);
    app.put('/api/books/:id', upload.single('cover'), writeBook);
    app.delete('/api/books/:id', async (req, res) => {
        const r = await db.query('DELETE FROM books WHERE id=$1 RETURNING cover', [id(req.params.id)]);
        if (!r.rows[0]) throw fail(404, 'Book not found'); await removeCover(r.rows[0].cover); res.status(204).end();
    });
    app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
    app.use((err, req, res, next) => {
        let status = err.status || 500, message = err.message;
        if (err instanceof multer.MulterError) { status = 400; message = err.code === 'LIMIT_FILE_SIZE' ? 'Cover exceeds 2 MB' : err.message; }
        if (err.code === '23505') { status = 409; message = 'Category name already exists'; }
        if (err.code === '23503' || err.code === '23001') { status = 409; message = 'Category does not exist or is still used by books'; }
        if (status >= 500) { console.error(err); message = 'Internal server error'; }
        res.status(status).json({ error: message });
    });
    return app;
}
