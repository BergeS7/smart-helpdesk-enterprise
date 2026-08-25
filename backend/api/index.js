require("dotenv").config();

const { validateProductionSecurity } = require("../src/config/security");
validateProductionSecurity();

const app = require("../src/app");

module.exports = app;
