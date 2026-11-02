require('dotenv/config');
const path = require('node:path');
// ใช้ path จากโฟลเดอร์โปรเจกต์ เพื่อให้รันจากที่อื่นได้
module.exports = {
  URL_PORT: Number(process.env.PORT || 8080),
  OPENAPI_YAML: path.join(__dirname, 'api/openapi.yaml'),
  uploadDir: path.join(__dirname, 'uploads'),
};
