import { createRequire } from "module";

const require = createRequire(import.meta.url);

require("dotenv").config();

const { validateProductionSecurity } = require("../src/config/security");
validateProductionSecurity();

const app = require("../src/app");

export default app;
