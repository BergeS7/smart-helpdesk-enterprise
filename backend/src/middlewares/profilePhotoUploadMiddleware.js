const multer = require("multer");
const tiposPermitidos = new Set(["image/png", "image/jpeg", "image/webp"]);
const limiteFotoPerfilBytes = 5 * 1024 * 1024;

const uploadFotoPerfil = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: limiteFotoPerfilBytes,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (tiposPermitidos.has(file.mimetype)) return cb(null, true);
    cb(new Error("Tipo de arquivo não permitido. Envie PNG, JPG ou WEBP."));
  },
});

uploadFotoPerfil.limiteFotoPerfilBytes = limiteFotoPerfilBytes;
uploadFotoPerfil.tiposPermitidos = tiposPermitidos;

module.exports = uploadFotoPerfil;
