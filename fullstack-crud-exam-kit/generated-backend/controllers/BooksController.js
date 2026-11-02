// Controller เชื่อม route กับ service โดยใช้ตัวดัก async error ร่วมกัน
const Controller = require('./Controller');
const service = require('../services/BooksService');

module.exports = {
  apiBooksGET: Controller.handleRequest(service.apiBooksGET),
  apiBooksIdGET: Controller.handleRequest(service.apiBooksIdGET),
  apiBooksIdDELETE: Controller.handleRequest(service.apiBooksIdDELETE),
  apiBooksPOST: Controller.handleRequest(service.apiBooksPOST),
  apiBooksIdPUT: Controller.handleRequest(service.apiBooksIdPUT),
};
