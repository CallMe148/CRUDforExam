const express = require('express');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { upload } = require('./services/catalog');
const books = require('./controllers/BooksController');
const categories = require('./controllers/CategoriesController');
const health = require('./controllers/DefaultController');

class ExpressServer {
  constructor(port = config.URL_PORT, openApiYaml = config.OPENAPI_YAML) {
    this.port = port;
    this.app = express();
    mkdirSync(config.uploadDir, { recursive: true });
    // แปลง JSON ก่อนเข้า Controller; ไฟล์ multipart ใช้ Multer เฉพาะ route หนังสือ
    this.app.use(express.json());
    this.app.use('/uploads', express.static(config.uploadDir, { dotfiles: 'deny' }));
    this.app.use(express.static(path.join(__dirname, 'public')));
    const spec = yaml.safeLoad(readFileSync(openApiYaml, 'utf8'));
    this.app.get('/openapi', (req, res) => res.sendFile(openApiYaml));
    this.app.get('/openapi.json', (req, res) => res.json(spec));
    this.app.use(['/docs', '/api-docs'], swaggerUi.serve, swaggerUi.setup(spec));
    // ระบุ route ชัดเจนเพื่อให้อ่านตาม Controller → Service → SQL ได้ง่าย
    this.app.get('/api/health', health.apiHealthGET);
    this.app.get('/api/categories', categories.apiCategoriesGET);
    this.app.post('/api/categories', categories.apiCategoriesPOST);
    this.app.get('/api/categories/:id', categories.apiCategoriesIdGET);
    this.app.put('/api/categories/:id', categories.apiCategoriesIdPUT);
    this.app.delete('/api/categories/:id', categories.apiCategoriesIdDELETE);
    this.app.get('/api/books', books.apiBooksGET);
    this.app.post('/api/books', upload.single('cover'), books.apiBooksPOST);
    this.app.get('/api/books/:id', books.apiBooksIdGET);
    this.app.put('/api/books/:id', upload.single('cover'), books.apiBooksIdPUT);
    this.app.delete('/api/books/:id', books.apiBooksIdDELETE);
    this.app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
    // Error handler ต้องอยู่หลัง routes และรับ 4 parameters
    this.app.use((err, req, res, next) => {
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
  }

  launch() {
    // เก็บ server ไว้เพื่อปิด listener ได้จริงตอนทดสอบหรือ shutdown
    this.server = this.app.listen(this.port, () => console.log(`Book Catalog: http://localhost:${this.port} | Swagger: /docs`));
    return this.server;
  }

  async close() {
    if (this.server) await new Promise((resolve, reject) => this.server.close(error => error ? reject(error) : resolve()));
  }
}
module.exports = ExpressServer;
