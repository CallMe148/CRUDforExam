// ฟังก์ชันร่วม: ตรวจข้อมูลและดูแลไฟล์ปกก่อนบันทึกฐานข้อมูล
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const { writeFile, unlink } = require('node:fs/promises');
const path = require('node:path');
const { uploadDir } = require('../config');
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


module.exports = { fail, id, text, upload, saveCover, removeCover };
