require("dotenv").config();

const { validateProductionSecurity } = require("../src/config/security");
validateProductionSecurity();

const app = require("../src/app");

async function handler(req, res) {
  return app(req, res);
}

module.exports = handler;
module.exports.handler = handler;
