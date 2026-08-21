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
  latitude: number | null;
  longitude: number | null;
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
  fabricante?: string | null;
  modelo?: string | null;
  serialNumber?: string | null;
  osBuild?: string | null;
  ramTotalBytes?: number | null;
  storageTotalBytes?: number | null;
  storageFreeBytes?: number | null;
  communicationStatus?: "recent" | "attention" | "no_communication" | "no_data";
  ultimoInventario?: string | null;
  schemaVersion?: number | null;
  hasInventory?: boolean;
};

export type AssetInventory = {
  schemaVersion:number; reportId:string; collectedAt:string; agentVersion:string;
  computer?:Record<string,unknown>; bios?:Record<string,unknown>; motherboard?:Record<string,unknown>;
  processors?:Record<string,unknown>[]; memory?:{totalBytes?:number;modules?:Record<string,unknown>[]};
  storage?:{totalBytes?:number;freeBytes?:number;physicalDisks?:Record<string,unknown>[];volumes?:Record<string,unknown>[]};
  videoAdapters?:Record<string,unknown>[]; network?:Record<string,unknown>; operatingSystem?:Record<string,unknown>;
  security?:Record<string,{status?:string;[key:string]:unknown}>; battery?:Record<string,unknown>|null;
  monitors?:Record<string,unknown>[]; printers?:Record<string,unknown>[]; updates?:Record<string,unknown>[]; metrics?:Record<string,number>;
};
export type AssetChange={id:string;category:string;field:string;oldValue:unknown;newValue:unknown;severity:"INFO"|"WARNING"|"CRITICAL";detectedAt:string;acknowledged:boolean};
export type AssetAlert={id:string;code:string;category:string;title:string;message:string;severity:"INFO"|"WARNING"|"CRITICAL";active:boolean;detectedAt:string;acknowledged:boolean};
export type AssetSnapshot={id:string;reportId:string;schemaVersion:number;collectedAt:string;receivedAt:string};

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
