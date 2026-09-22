/**
 * Responsabilidade: Tradução e formatação dos campos brutos do inventário coletado pelo agente
 * (agent/SmartHelpDeskAgent.ps1 · função Get-Inventory) para rótulos e valores legíveis em PT-BR.
 */

// Rótulos conhecidos, pelos nomes exatos gravados pelo agente. Uma chave nova e desconhecida
// cai no humanizeKey() abaixo, então nunca volta a aparecer em caixa alta crua.
const KNOWN_LABELS: Record<string, string> = {
  hostname: "Nome do computador",
  manufacturer: "Fabricante",
  model: "Modelo",
  product: "Modelo",
  serialNumber: "Número de série",
  domain: "Domínio",
  loggedUser: "Usuário logado",
  version: "Versão",
  releaseDate: "Data de lançamento",
  name: "Modelo",
  cores: "Núcleos",
  logicalProcessors: "Processadores lógicos",
  maxClockMhz: "Clock máximo",
  processorId: "ID do processador",
  bank: "Banco de memória",
  deviceLocator: "Slot",
  capacityBytes: "Capacidade",
  speedMhz: "Velocidade",
  partNumber: "Part number",
  index: "Índice",
  interfaceType: "Interface",
  mediaType: "Tipo de mídia",
  sizeBytes: "Tamanho",
  freeBytes: "Espaço livre",
  freePercentage: "Espaço livre",
  drive: "Unidade",
  label: "Rótulo",
  fileSystem: "Sistema de arquivos",
  primaryIpv4: "IP principal",
  primaryMac: "MAC principal",
  description: "Adaptador",
  mac: "MAC",
  dhcpEnabled: "DHCP",
  ipAddresses: "Endereços IP",
  gateways: "Gateway",
  dnsServers: "Servidores DNS",
  caption: "Sistema operacional",
  build: "Build",
  architecture: "Arquitetura",
  installDate: "Instalado em",
  lastBoot: "Última inicialização",
  locale: "Idioma",
  timeZone: "Fuso horário",
  hotFixId: "Atualização (KB)",
  installedOn: "Instalado em",
  present: "Presente",
  signaturesUpdated: "Assinaturas atualizadas",
  profiles: "Perfis",
  volumes: "Volumes",
  mountPoint: "Unidade",
  protectionStatus: "Proteção",
  volumeStatus: "Status do volume",
  enabled: "Ativado",
  adapterRamBytes: "Memória de vídeo",
  driverVersion: "Versão do driver",
  status: "Status",
  estimatedChargeRemaining: "Carga restante",
};

// Nome de exibição de cada bloco da aba Segurança (tpm/defender/firewall/bitlocker).
export const SECURITY_SECTION_LABELS: Record<string, string> = {
  tpm: "TPM",
  defender: "Antivírus (Windows Defender)",
  firewall: "Firewall",
  bitlocker: "BitLocker",
};

// Estados ENABLED/DISABLED/UNKNOWN vêm da função State() do agente (agent/SmartHelpDeskAgent.ps1).
const STATUS_LABELS: Record<string, string> = {
  ENABLED: "Ativado",
  DISABLED: "Desativado",
  UNKNOWN: "Desconhecido",
};

const COMMUNICATION_LABELS: Record<string, string> = {
  recent: "Recente",
  attention: "Atenção",
  no_communication: "Sem comunicação",
};

export function communicationStatusLabel(value?: string | null): string {
  return COMMUNICATION_LABELS[value || ""] || "Sem comunicação";
}

// Nomes usados em ativo_alteracoes.campo (backend/src/domain/assetInventory.js · CHANGE_RULES),
// distintos das chaves brutas do inventário — por isso têm sua própria tradução.
const CHANGE_FIELD_LABELS: Record<string, string> = {
  hostname: "Nome do computador",
  "computer.serial": "Número de série",
  "computer.manufacturer": "Fabricante do computador",
  "computer.model": "Modelo do computador",
  processor: "Processador",
  "memory.total": "Memória total",
  "memory.modules": "Módulos de memória",
  "storage.physicalDisks": "Discos físicos",
  "os.caption": "Sistema operacional",
  "os.version": "Versão do sistema",
  "os.build": "Build do sistema",
  "bios.version": "Versão da BIOS",
  "motherboard.serial": "Número de série da placa-mãe",
  "network.primaryIp": "IP principal",
  "network.primaryMac": "MAC principal",
  "security.tpm": "TPM",
  "security.defender": "Antivírus (Windows Defender)",
  "security.firewall": "Firewall",
  "security.bitlocker": "BitLocker",
};

export function humanizeChangeField(field: string): string {
  return CHANGE_FIELD_LABELS[field] || humanizeKey(field.split(".").pop() || field);
}

export function humanizeKey(key: string): string {
  if (KNOWN_LABELS[key]) return KNOWN_LABELS[key];
  // Fallback para uma chave desconhecida: camelCase -> "Camel Case", sem crase em maiúsculas.
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Campos numéricos que representam bytes e ganham a formatação de bytes() em vez do número cru.
const BYTE_KEYS = new Set(["capacityBytes", "sizeBytes", "freeBytes", "adapterRamBytes", "totalBytes", "memory.total"]);
const UNIT_SUFFIX: Record<string, string> = { maxClockMhz: " MHz", speedMhz: " MHz", freePercentage: "%", estimatedChargeRemaining: "%" };

export function formatBytes(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Não informado";
  if (value >= 1073741824) return `${(value / 1073741824).toFixed(2)} GB`;
  if (value >= 1048576) return `${(value / 1048576).toFixed(0)} MB`;
  return `${value} B`;
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

// Formata um valor-folha (não array). Arrays são tratados à parte por quem monta a lista de campos,
// pois um array de objetos precisa virar cartões, não um texto JSON cru.
export function formatInventoryValue(key: string, value: unknown): string {
  if (value == null || value === "") return "Não informado";
  if (BYTE_KEYS.has(key)) return formatBytes(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") {
    if (value in STATUS_LABELS) return STATUS_LABELS[value];
    if (ISO_DATETIME.test(value)) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR");
    }
    if (ISO_DATE.test(value)) {
      const parsed = new Date(`${value}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
    }
    return value;
  }
  if (typeof value === "number") return `${value}${UNIT_SUFFIX[key] || ""}`;
  if (Array.isArray(value)) {
    if (!value.length) return "Nenhum";
    if (value.every(isPrimitive)) return value.map((item) => formatInventoryValue(key, item)).join(", ");
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && !value.every(isPrimitive);
}
