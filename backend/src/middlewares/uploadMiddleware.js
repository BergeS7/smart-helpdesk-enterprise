const fs = require("fs");
const path = require("path");
const multer = require("multer");

const pastaUploads = path.join(__dirname, "../../uploads/chamados");

if (!fs.existsSync(pastaUploads)) {
  fs.mkdirSync(pastaUploads, { recursive: true });
}

const tiposPermitidos = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, pastaUploads),
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname || "").toLowerCase();
    const nomeSeguro = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;
    cb(null, nomeSeguro);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (tiposPermitidos.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Tipo de arquivo não permitido. Envie imagem, PDF, Word, Excel ou TXT."));
  },
});

module.exports = upload;
