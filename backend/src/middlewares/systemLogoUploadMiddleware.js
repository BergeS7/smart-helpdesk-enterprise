const fs = require("fs");
const path = require("path");
const multer = require("multer");

const pastaSistema = path.join(__dirname, "../../uploads/sistema");

if (!fs.existsSync(pastaSistema)) {
  fs.mkdirSync(pastaSistema, { recursive: true });
}

const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, pastaSistema),
  filename: (req, file, cb) => {
    const extensaoOriginal = path.extname(file.originalname || "").toLowerCase();
    const extensaoPorMime = file.mimetype === "image/png" ? ".png" : file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const extensao = [".png", ".jpg", ".jpeg", ".webp"].includes(extensaoOriginal) ? extensaoOriginal : extensaoPorMime;
    const prefixo = req.logoPrefix || "logo";
    cb(null, `${prefixo}-${Date.now()}${extensao}`);
  },
});

const uploadLogoSistema = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (tiposPermitidos.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Tipo de arquivo não permitido. Envie PNG, JPG, JPEG ou WEBP."));
  },
});

module.exports = uploadLogoSistema;
