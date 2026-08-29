/**
 * Responsabilidade: Middleware de upload; intercepta requisições antes ou depois dos controladores.
 */
const multer = require("multer");

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

const upload = multer({
  storage: multer.memoryStorage(),
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
