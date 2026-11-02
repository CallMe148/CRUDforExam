// Controller เชื่อม route กับ service โดยใช้ตัวดัก async error ร่วมกัน
const Controller = require('./Controller');
const service = require('../services/CategoriesService');

module.exports = {
  apiCategoriesGET: Controller.handleRequest(service.apiCategoriesGET),
  apiCategoriesIdGET: Controller.handleRequest(service.apiCategoriesIdGET),
  apiCategoriesPOST: Controller.handleRequest(service.apiCategoriesPOST),
  apiCategoriesIdPUT: Controller.handleRequest(service.apiCategoriesIdPUT),
  apiCategoriesIdDELETE: Controller.handleRequest(service.apiCategoriesIdDELETE),
};
