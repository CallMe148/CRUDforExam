# Fullstack CRUD Exam Kit — คู่มือภาษาไทย

ชุดเตรียมสอบ 3 ชั่วโมง สำหรับกรณีอาจารย์อนุญาตโค้ดเก่าและ GitHub แล้ว

- `book-catalog/` ระบบตัวอย่าง CRUD สองตารางที่ทำงานครบ: Express 5, PostgreSQL ผ่าน pg, Multer, vanilla JavaScript และ Swagger
- `exam-starter/` โครงฝึก มี TODO และ endpoint ตอบ 501 จนกว่าจะเขียนเอง
- `examples/nextjs/` ตัวอย่าง client component สำหรับนำไปใส่โปรเจกต์ Next.js ของอาจารย์ (ไม่ใช่แอป Next.js เต็มชุด)
- `docs/` แผนสอบ การแก้ปัญหา และผลตรวจสอบ

## 1. สิ่งที่ต้องเตรียม

Node.js 22 ขึ้นไป, npm, Git และ PostgreSQL 15 ขึ้นไป หรือ Docker Desktop ที่เปิดทำงานอยู่
ระบบหลักใช้ frontend จาก Express บนพอร์ตเดียว จึงไม่ต้องตั้ง CORS
ต้องมีอินเทอร์เน็ตตอน `npm ci` ครั้งแรก ZIP ไม่รวม node_modules และฐานข้อมูล

## 2. เริ่ม Book Catalog

เปิด terminal ในโฟลเดอร์ที่แตก ZIP แล้ว:

```sh
docker compose up -d db
cd book-catalog
npm ci
cp .env.example .env
npm run db:init
npm start
```

Windows PowerShell ใช้ `Copy-Item .env.example .env` แทน `cp` ได้
เปิด [หน้าเว็บ](http://localhost:3001), [Swagger](http://localhost:3001/docs), [Health](http://localhost:3001/api/health)
รอฐานข้อมูลพร้อมก่อนรัน db:init ถ้าเชื่อมต่อไม่ได้ให้ลองใหม่หลังไม่กี่วินาที
`db:init` สร้างตารางและ seed แบบรันซ้ำได้ ไม่ล้างข้อมูลเก่า และไม่แก้โครงตารางเดิมให้เอง

### ใช้ PostgreSQL ที่ติดตั้งเอง

ไม่ต้องรัน Docker ให้สร้างฐานข้อมูล `book_catalog` ก่อนด้วย pgAdmin หรือ:

```sh
createdb -U postgres book_catalog
```

แก้ DATABASE_URL ใน `.env` ให้ตรงกับ username/password/host/port จริง เช่น:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/book_catalog
PORT=3001
```

รหัสผ่านที่มีอักขระพิเศษต้อง URL-encode ส่วน password ห้าม commit `.env`
สามารถนำ `database/schema.sql` และ `seed.sql` ไปรันใน pgAdmin Query Tool ตามลำดับแทน db:init ได้

## 3. วิธีใช้ระบบ

1. สร้างหมวดหมู่ แล้วเพิ่มหนังสือโดยเลือกหมวดหมู่นั้น
2. แนบปก PNG/JPEG/WebP ไม่เกิน 2 MB ได้ ชื่อ field ต้องเป็น `cover`
3. กดแก้ไข เติมข้อมูล แล้วบันทึก ถ้าไม่แนบไฟล์ใหม่จะเก็บปกเดิม
4. ติ๊ก “ลบปกเดิม” เพื่อลบปก ถ้าแนบปกใหม่ด้วยจะใช้ไฟล์ใหม่
5. ลบหนังสือก่อนลบหมวดหมู่ที่อ้างถึง ระบบจะตอบ 409 ถ้ายังมีหนังสืออยู่

ข้อมูลเก็บใน PostgreSQL ปกเก็บที่ `book-catalog/uploads/` ปิดแล้วเปิด server ใหม่ข้อมูลยังอยู่
การเปลี่ยนปก/ลบหนังสือจะลบไฟล์เก่า ไฟล์ใหม่จะถูกลบทิ้งถ้าบันทึกฐานข้อมูลไม่สำเร็จ
การตรวจชนิดรูปใช้ลายเซ็นส่วนต้นของไฟล์ ไม่ใช่การถอดรหัสรูปเต็มรูปแบบ
นี่เป็นโปรเจกต์ฝึกในเครื่อง ไม่มีระบบบัญชีผู้ใช้หรือสิทธิ์การเข้าถึง

## 4. สัญญา API ที่ต้องจำ

| Method | Path | Body/ผลลัพธ์ |
|---|---|---|
| GET | /api/categories | รายการเรียง id ASC |
| GET | /api/categories/:id | หมวดหมู่รายตัว |
| POST | /api/categories | JSON `{ "name": "Programming" }` → 201 |
| PUT | /api/categories/:id | JSON name → 200 |
| DELETE | /api/categories/:id | ไม่มี body → 204 |
| GET | /api/books | JOIN หมวดหมู่, เรียง id ASC |
| GET | /api/books/:id | หนังสือรายตัว |
| POST | /api/books | multipart title, author, price, category_id, cover (optional) → 201 |
| PUT | /api/books/:id | ข้อมูลข้อความครบ + cover optional + remove_cover optional → 200 |
| DELETE | /api/books/:id | ลบข้อมูลและปก → 204 |

PUT ต้องส่งข้อมูลข้อความครบ ไม่ใช่ partial update
pg ส่งค่า NUMERIC price เป็น string เช่น `"199.50"`; frontend ใช้ Number(price) ก่อนแสดงผล
ข้อผิดพลาดอยู่ใน `{ "error": "..." }`:
400 ข้อมูลผิด/ไฟล์ผิด, 404 ไม่พบ, 409 ชื่อซ้ำหรือ FK, 500 ข้อผิดพลาดระบบ
Swagger พร้อม Try it out ที่ /docs; spec อยู่ใน openapi.json

ตัวอย่างทดสอบ:

```sh
curl http://localhost:3001/api/categories
curl -X POST http://localhost:3001/api/categories -H 'Content-Type: application/json' -d '{"name":"Science"}'
curl -X POST http://localhost:3001/api/books -F 'title=Practice' -F 'author=Student' -F 'price=99' -F 'category_id=1' -F 'cover=@cover.png'
```

ถ้าใช้ Windows ให้ใช้ `curl.exe` หรือ Swagger แทน ปรับ category_id และที่อยู่ไฟล์ให้ตรงจริง

## 5. ฝึกด้วย Exam Starter

สร้างฐานข้อมูลแยกชื่อ `exam_practice` ผ่าน pgAdmin หรือ:

```sh
createdb -U postgres exam_practice
cd ../exam-starter
npm ci
cp .env.example .env
npm start
```

ถ้าใช้ Docker สร้างฐานข้อมูลจากโฟลเดอร์รากชุดงานด้วย:

```sh
docker compose exec db createdb -U postgres exam_practice
```

เปิด [Starter](http://localhost:3002) แล้วทำตาม `exam-starter/TODO.md`
เขียน schema/seed ก่อน `npm run db:init` SQL เริ่มต้นเป็นเพียงคอมเมนต์ จึงยังไม่สร้างตาราง
เปิดตัวอย่างเทียบเมื่อทำเองเสร็จ ฝึกเปลี่ยนหัวข้อเป็นสินค้า/ประเภทสินค้า และซ้อม 180 นาทีอย่างน้อยหนึ่งรอบ

## 6. ทดสอบอัตโนมัติ

ใช้ฐานข้อมูลทดสอบที่ผู้ใช้มีสิทธิ์ CREATE SCHEMA แล้วตั้ง TEST_DATABASE_URL ก่อน `npm test` ใน book-catalog:

macOS/Linux:
```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/book_catalog npm test
```

PowerShell:
```powershell
$env:TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/book_catalog"
npm test
```

ทดสอบสร้าง schema ชั่วคราวแยกและลบทิ้งตอนจบ ไม่ลบตารางหลัก
ใช้ฐานข้อมูลฝึกที่ยอมให้สร้าง schema ได้เท่านั้น หากถูกบังคับปิดระหว่างทดสอบอาจเหลือ schema `test_...`
ตรวจผลที่ `docs/VERIFICATION.md`

## 7. ขึ้น GitHub

ทำจากโฟลเดอร์รากที่มี README นี้ สร้าง repository ว่างบน GitHub ก่อน:

```sh
git init
git add .
git status
git commit -m "Add CRUD exam practice kit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

เปลี่ยน URL เป็น repository ของคุณ ตรวจ git status ให้แน่ใจว่าไม่มี `.env`, node_modules, รูปอัปโหลด หรือข้อมูลฐานข้อมูล
มี .gitignore แล้ว; package-lock.json ต้อง commit เพื่อใช้ npm ci
ในห้องสอบ clone แล้วทำขั้นตอนเริ่มใช้งานใหม่ ฐานข้อมูลกับ .env ไม่ตามมาจาก GitHub
คำสั่งข้างต้นเป็นคำแนะนำ ชุดงานนี้ยังไม่ได้สร้าง repository หรือ push ให้

## อ่านเพิ่มเติม

- [Express documentation](https://expressjs.com/en/guide/migrating-5/)
- [node-postgres parameterized queries](https://node-postgres.com/features/queries)
- [Multer documentation](https://www.npmjs.com/package/multer)

ใช้ SQL placeholders `$1`, `$2` สำหรับค่าจากผู้ใช้ และใช้ Multer เฉพาะ endpoint ที่รับไฟล์ตามแนวทางเอกสารเหล่านี้
