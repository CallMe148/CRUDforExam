// Controller เชื่อม route กับ service โดยใช้ตัวดัก async error ร่วมกัน
const Controller = require('./Controller');
const service = require('../services/DefaultService');

module.exports = {
  apiHealthGET: Controller.handleRequest(service.apiHealthGET),
};
