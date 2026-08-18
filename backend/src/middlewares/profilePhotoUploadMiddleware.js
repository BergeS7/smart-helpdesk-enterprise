const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { pastaPerfil, removerFotosPerfil } = require("../utils/profilePhoto");

if (!fs.existsSync(pastaPerfil)) {
  fs.mkdirSync(pastaPerfil, { recursive: true });
}

const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, pastaPerfil),
  filename: (req, file, cb) => {
    const extensaoOriginal = path.extname(file.originalname || "").toLowerCase();
    const extensaoPorMime = file.mimetype === "image/png" ? ".png" : file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const extensao = [".png", ".jpg", ".jpeg", ".webp"].includes(extensaoOriginal) ? extensaoOriginal : extensaoPorMime;
    removerFotosPerfil(req.user.id);
    cb(null, `perfil-${req.user.id}${extensao}`);
  },
});

const uploadFotoPerfil = multer({
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

module.exports = uploadFotoPerfil;
