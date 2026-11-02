# Book Catalog — ฝึกเขียน API

ตัวอย่าง Express + PostgreSQL สำหรับเพิ่ม อ่าน แก้ไข และลบหมวดหมู่กับหนังสือ พร้อมอัปโหลดปกและหน้าเว็บเรียก API

## เริ่มใช้งาน

1. ติดตั้ง Node.js 22 ขึ้นไป และเปิด PostgreSQL ในเครื่อง
2. สร้างฐานข้อมูล `exam_practice` เช่น `createdb -U postgres exam_practice`
3. รัน `npm install`
4. คัดลอก `.env.example` เป็น `.env` หากยังไม่มี แล้วแก้ `DATABASE_URL` ให้ตรงกับ username/password/port ของ PostgreSQL ในเครื่อง
5. รัน `npm run db:init` เพื่อสร้างตารางและข้อมูลตัวอย่าง (รันซ้ำได้)
6. รัน `npm run dev` หรือ `npm start`
7. เปิด <http://localhost:3002> และ Swagger ที่ <http://localhost:3002/docs> หากเปลี่ยน PORT ให้เปลี่ยน URL ตามด้วย

ปกจะถูกบันทึกใน `uploads/` ส่วนข้อมูลหนังสืออยู่ใน PostgreSQL ต้องเก็บทั้งสองส่วนไว้หากย้ายเครื่อง

## ลำดับอ่านโค้ดสำหรับผู้เริ่มต้น

- `db.js`: อ่านค่าเชื่อมต่อจาก .env และสร้าง pool
- `server.js`: ตั้ง middleware → ตรวจข้อมูล → routes → SQL → จัดการ error
- `public/app.js`: รับเหตุการณ์จากฟอร์ม → fetch → ตรวจคำตอบ → แสดงรายการด้วย DOM
- `scripts/init-db.js`: อ่าน schema และ seed แล้วรันใน transaction
- `database/schema.sql`: กติกาข้อมูลและ foreign key

ตัวอย่าง `POST /api/categories` รับ JSON `{ "name": "History" }` ตรวจชื่อ แล้วแทนค่าใน `$1` ของ SQL ก่อนส่งแถวใหม่กลับด้วยสถานะ 201 ส่วนหนังสือส่งด้วย FormData เพราะมีทั้งข้อความและไฟล์

## API

| Method | URL | หน้าที่ |
|---|---|---|
| GET | /api/health | ตรวจการเชื่อมต่อฐานข้อมูล |
| GET / POST | /api/categories | อ่านรายการ / เพิ่มหมวดหมู่ |
| GET / PUT / DELETE | /api/categories/:id | อ่าน / แก้ไข / ลบหมวดหมู่ |
| GET / POST | /api/books | อ่านรายการพร้อมชื่อหมวดหมู่ / เพิ่มหนังสือ |
| GET / PUT / DELETE | /api/books/:id | อ่าน / แก้ไข / ลบหนังสือ |

POST/PUT หมวดหมู่ใช้ JSON ส่วนหนังสือใช้ multipart/form-data มี `title`, `author`, `price`, `category_id` และ `cover` (ไม่บังคับ) การแก้หนังสือโดยไม่ส่งปกจะเก็บปกเดิม ส่ง `remove_cover=true` เพื่อลบปกเดิม หากส่งปกใหม่ด้วย ระบบจะใช้ปกใหม่

สถานะที่ใช้: 200 สำเร็จ, 201 เพิ่มแล้ว, 204 ลบแล้ว, 400 ข้อมูลไม่ถูกต้อง, 404 ไม่พบ, 409 ชื่อซ้ำหรือขัดกับ foreign key, 500 ปัญหาภายในเซิร์ฟเวอร์

## ตรวจงาน

รัน `npm run check` เพื่อตรวจไวยากรณ์ JavaScript ทุกไฟล์ของโปรเจกต์ แล้วทำรายการทดสอบใน `TODO.md` ผ่านหน้าเว็บหรือ Swagger การตรวจไวยากรณ์ยังไม่ยืนยันว่าติดต่อฐานข้อมูลได้

หากขึ้น `ECONNREFUSED` ให้เปิด PostgreSQL และตรวจ host/port ใน DATABASE_URL ก่อน หากแจ้งว่า database ไม่มี ให้สร้างฐานข้อมูลก่อนรัน db:init
