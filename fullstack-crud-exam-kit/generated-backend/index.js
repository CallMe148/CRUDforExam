// จุดเริ่มโปรแกรม: เปิด HTTP server; แยก class ไว้ให้ทดสอบโดยไม่เปิด port ได้
const ExpressServer = require('./expressServer');
const server = new ExpressServer();
server.launch();
