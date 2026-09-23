/**
 * Responsabilidade: Regras das versões do agente distribuídas por atualização automática.
 *
 * O servidor apenas armazena e entrega o pacote. Quem garante a autenticidade é o
 * próprio agente, que confere a assinatura RSA com a chave pública instalada na
 * máquina. A chave privada nunca passa pelo servidor; por isso uma invasão do
 * servidor não permite distribuir código para os computadores.
 */
const crypto = require("crypto");

const FORMAT = "smarthelpdesk-agent-update";
// Em base64 o pacote cresce ~33%; 6 MB cabe no limite de 10 MB do express.json.
const MAX_PACKAGE_BYTES = 6 * 1024 * 1024;
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

// Texto assinado: amarra o pacote à versão e impede reaproveitar uma assinatura
// antiga com outro número de versão.
const signedMessage = (version, sha256) => `SmartHelpDeskAgent-update|${version}|${sha256}`;

function compareVersions(a, b) {
  const left = String(a).split(".").map(Number), right = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((left[i] || 0) !== (right[i] || 0)) return (left[i] || 0) > (right[i] || 0) ? 1 : -1;
  return 0;
}

// Valida o arquivo gerado por agent/Publicar-Atualizacao.ps1 antes de guardá-lo.
function parseRelease(body) {
  if (!body || body.format !== FORMAT) return { error: "Arquivo de atualização inválido. Use o .json gerado por Publicar-Atualizacao.ps1." };
  const version = String(body.version || "").trim();
  if (!VERSION.test(version)) return { error: "Versão inválida. Use o formato 2.2.0." };
  if (typeof body.package !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.package)) return { error: "Pacote ausente ou corrompido." };
  const packageBytes = Buffer.from(body.package, "base64");
  if (!packageBytes.length || packageBytes.length > MAX_PACKAGE_BYTES) return { error: "Pacote vazio ou maior que 6 MB." };
  // Todo .zip começa com "PK"; evita guardar outro tipo de arquivo por engano.
  if (packageBytes[0] !== 0x50 || packageBytes[1] !== 0x4b) return { error: "O pacote precisa ser um arquivo .zip." };
  const sha256 = crypto.createHash("sha256").update(packageBytes).digest("hex");
  if (String(body.sha256 || "").toLowerCase() !== sha256) return { error: "O pacote não corresponde ao hash informado. Gere o arquivo novamente." };
  const signature = String(body.signature || "");
  const signatureBytes = /^[A-Za-z0-9+/]+={0,2}$/.test(signature) ? Buffer.from(signature, "base64") : Buffer.alloc(0);
  if (signatureBytes.length < 256) return { error: "Assinatura ausente. Gere o arquivo com Publicar-Atualizacao.ps1." };
  return { release: { version, sha256, signature, packageBytes } };
}

module.exports = { FORMAT, MAX_PACKAGE_BYTES, signedMessage, compareVersions, parseRelease };
