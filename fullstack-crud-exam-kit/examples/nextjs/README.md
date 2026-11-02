# Next.js ตัวอย่างเสริม

สำหรับข้อสอบที่อาจารย์มีโปรเจกต์ Next.js ให้แล้ว ให้นำ `page.jsx` ไปใส่ `app/page.jsx` (หรือ `src/app/page.jsx` ตามโครงสร้าง)
เป็นตัวอย่างอ่านรายการและเพิ่มหนังสือพร้อมปก ส่วนแก้ไข/ลบและ CRUD หมวดหมู่ให้ฝึกเพิ่มจาก vanilla ตัวหลัก
ไม่ได้รวม package.json หรือแอป Next.js เต็มชุด และยังไม่ได้ทดสอบ build กับเวอร์ชัน Next.js ของห้องสอบ
หากโจทย์ใช้ HTML ธรรมดาให้ข้ามส่วนนี้เพื่อลดงานใน 3 ชั่วโมง

เพื่อใช้ fetch('/api/...') บนคนละพอร์ต ให้รวม rewrites นี้กับ next.config.mjs ที่มีอยู่:

```js
export default {
 async rewrites() {
  return [
   { source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' },
   { source: '/uploads/:path*', destination: 'http://localhost:3001/uploads/:path*' }
  ];
 }
};
```

เปิด Express ก่อน แล้ว restart Next.js หลังแก้ config วิธีนี้ใช้ proxy ฝั่ง server จึงไม่ต้องเปิด CORS
ใช้ useState/useEffect แทนแก้ DOM โดยตรง; ถ้าใช้ TypeScript ต้องเพิ่ม type ของข้อมูลเอง
