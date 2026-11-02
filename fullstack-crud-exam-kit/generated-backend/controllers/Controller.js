// Express 4 ต้องส่ง rejected Promise เข้า next(error) เอง
// Service รับ req/res เพื่ออ่าน path, JSON, multipart แล้วตอบสถานะของแต่ละงาน
class Controller {
  static handleRequest(operation) {
    return (req, res, next) => Promise.resolve().then(() => operation(req, res)).catch(next);
  }
}
module.exports = Controller;
