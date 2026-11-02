# ผลตรวจสอบชุดงาน

ตรวจวันที่ 2 พฤศจิกายน 2026 (Asia/Bangkok)

## ผ่านแล้ว

- ติดตั้ง Book Catalog และ Exam Starter ด้วย npm และสร้าง package-lock.json แยกแต่ละส่วน
- npm audit ขณะติดตั้ง: 0 vulnerabilities (สถานะ ณ เวลาตรวจ)
- ตรวจ syntax ของ JavaScript ฝั่ง server และ vanilla frontend
- db:init สร้าง schema/seed สำเร็จ และตรวจ seed รันซ้ำไม่เพิ่มหนังสือซ้ำ
- ชุดทดสอบ `npm test`: 7 tests ผ่าน, 0 ล้มเหลว (รวม parent test)
- ครอบคลุมหน้าเว็บ/static files, Swagger, health, CRUD, JOIN, ชื่อซ้ำ, ID ผิด, ราคาไม่ถูกต้อง, FK, หมวดหมู่ที่ยังถูกใช้งาน, รูปปลอม, ไฟล์เกิน 2 MB
- ตรวจ upload จริงผ่าน HTTP, เปิด URL รูปได้, PUT ไม่แนบปกเก็บปกเดิม, เปลี่ยน/ลบปกแล้วลบไฟล์เก่า, บันทึกผิดพลาดไม่มีไฟล์ตกค้าง
- ตรวจหน้าเว็บผ่านเบราว์เซอร์จริง: แสดง seed, เพิ่มหมวดหมู่, เพิ่มหนังสือ และแก้ราคา 150 → 175 แสดงข้อมูลใหม่ถูกต้อง

- แตก ZIP ลงโฟลเดอร์ใหม่แล้ว `npm ci` ทั้งสองส่วนสำเร็จ
- รัน db:init และชุดทดสอบซ้ำจากไฟล์ที่แตก ZIP: ผ่าน 7 tests
- รัน `npm start` ทั้งสองส่วนจากชุดที่แตก ZIP: เปิด HTTP ได้; Starter ตอบ 501 ตามตั้งใจ

## สภาพแวดล้อมและข้อจำกัด

ใช้ Node.js 26.5.0 และ PostgreSQL engine แบบ WebAssembly (PGlite) ผ่าน official pglite-socket และแพ็กเกจ pg จริงสำหรับการทดสอบ HTTP/SQL
ไม่มีการใช้ mock SQL ผลทดสอบ แต่ PGlite มีรูปแบบ connection ต่างจาก PostgreSQL server ปกติ
เครื่องนี้ไม่มี PostgreSQL service และ Docker daemon ที่ทำงานอยู่ การทดลองเปิด PostgreSQL native ติดข้อจำกัด shared memory ของสภาพแวดล้อม
จึงยังไม่ได้ยืนยันการรันกับ native PostgreSQL/Docker หรือบน Windows โดยตรง ควรรัน `npm test` กับ PostgreSQL ของคุณก่อนสอบ
แพ็กเกจ PGlite และฐานข้อมูลทดสอบไม่รวมอยู่ใน ZIP แอปที่จัดส่งใช้ pg เชื่อม PostgreSQL ตาม .env ตามปกติ
Next.js เป็นตัวอย่าง component เสริม ยังไม่ได้ทดสอบ build กับโครง Next.js จริง
Playwright CLI ติดข้อจำกัดที่เก็บ cache จึงตรวจ UI ผ่านเบราว์เซอร์ในแอปแทน

## ทดสอบเองหลัง clone

ทำตาม README ตั้ง DB/env แล้วรัน db:init, npm start และ npm test โดยตั้ง TEST_DATABASE_URL
ตรวจการทำงานใน Swagger และเปิดเว็บก่อนสอบจริงอย่างน้อยหนึ่งรอบ
