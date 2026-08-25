const multer = require("multer");

const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const uploadLogoSistema = multer({
  storage: multer.memoryStorage(),
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
