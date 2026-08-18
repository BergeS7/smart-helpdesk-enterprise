export type DeviceStatus = "online" | "warning" | "offline";

export type DeviceMetrics = {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
};

export type Device = DeviceMetrics & {
  id: string;
  deviceId: string;
  patrimonio: string;
  hostname: string;
  municipio: string;
  unidade: string;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  ip: string;
  mac?: string;
  usuario: string;
  sistemaOperacional: string;
  processador: string;
  ramTotal: number;
  armazenamento: string;
  uptimeHours?: number;
  lastBoot?: string | null;
  firewallEnabled?: boolean | null;
  networkType?: string;
  linkSpeed?: string;
  ultimoHeartbeat: string;
  agenteInstalado?: boolean;
  antivirusAtualizado?: boolean;
  responsavel?: string;
};

export type DeviceHistory = {
  id: string;
  deviceId: string;
  tipo: "status" | "metric" | "ticket" | "inventory";
  titulo: string;
  descricao: string;
  horario: string;
};

export type Municipio = {
  nome: string;
  latitude: number;
  longitude: number;
};

export type DeviceAlert = {
  id: string;
  tipo: string;
  deviceId: string;
  hostname: string;
  municipio: string;
  horario: string;
  severidade: "info" | "warning" | "critical";
};

export type MunicipioSummary = {
  municipio: string;
  online: number;
  warning: number;
  offline: number;
  total: number;
};
