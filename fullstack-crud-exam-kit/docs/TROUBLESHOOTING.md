# แก้ปัญหาที่เจอบ่อย

| อาการ | ตรวจ/แก้ |
|---|---|
| ECONNREFUSED 5432 | เปิด PostgreSQL หรือ Docker และตรวจพอร์ตใน DATABASE_URL |
| password authentication failed | ตรวจ username/password และ URL-encode รหัสผ่าน |
| database does not exist | สร้าง book_catalog หรือ exam_practice ก่อน |
| relation does not exist | รัน db:init และตรวจว่าใช้ฐานข้อมูลถูกตัว |
| พอร์ต 5432 ชน | ใช้ PostgreSQL เดิม หรือเปลี่ยน compose เป็น 5433:5432 แล้วแก้ URL |
| EADDRINUSE 3001 | ปิด server ตัวเก่า หรือแก้ PORT ใน .env |
| 409 ตอนลบหมวดหมู่ | ลบ/ย้ายหนังสือที่ใช้อยู่ก่อน |
| 409 ตอนสร้างชื่อหมวดหมู่ | ใช้ชื่ออื่นหรือแก้หมวดหมู่เดิม |
| 400 ตอนอัปโหลด | field ต้องชื่อ cover; รูป PNG/JPEG/WebP ≤ 2 MB |
| req.body ว่าง | JSON ต้องส่ง Content-Type: application/json; FormData ห้ามตั้ง header เอง |
| ปกไม่ขึ้นหลัง clone | uploads ไม่อยู่ใน Git ต้องอัปโหลดใหม่ |
| SQL เปลี่ยนแต่ตารางไม่เปลี่ยน | CREATE IF NOT EXISTS ไม่ใช่ migration ให้ใช้ DB ใหม่สำหรับฝึก |
| Starter ตอบ 501 | ต้องเขียน TODO route นั้นก่อน |
| npm ci แจ้ง lock ไม่ตรง | ตรวจว่าใช้ package.json/lock คู่เดียวกัน อย่าผสมจากคนละโฟลเดอร์ |

ข้อมูล DB ของ Docker อยู่ใน named volume; `docker compose down` ไม่ลบข้อมูล
หลีกเลี่ยง `docker compose down -v` ถ้ายังต้องการข้อมูล เพราะคำสั่งนั้นลบ volume

## จุดจำก่อนสอบ

Frontend → fetch → Express route → pg query → PostgreSQL → rows → JSON → render
อัปโหลด: FormData → upload.single('cover') → req.file + req.body → บันทึกชื่อไฟล์ → URL /uploads/...
แก้โจทย์: schema → SQL → route → form name → render → Swagger → ทดสอบตามลำดับ
