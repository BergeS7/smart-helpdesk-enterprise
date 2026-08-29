/**
 * Responsabilidade: Módulo de asset inventory; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
const crypto = require("crypto");

const CHANGE_RULES = [
  ["IDENTITY", "hostname", "computer.hostname", "WARNING"],
  ["IDENTITY", "computer.serial", "computer.serialNumber", "CRITICAL"],
  ["HARDWARE", "computer.manufacturer", "computer.manufacturer", "INFO"],
  ["HARDWARE", "computer.model", "computer.model", "INFO"],
  ["HARDWARE", "processor", "processors", "WARNING"],
  ["HARDWARE", "memory.total", "memory.totalBytes", "WARNING"],
  ["HARDWARE", "memory.modules", "memory.modules", "WARNING"],
  ["HARDWARE", "storage.physicalDisks", "storage.physicalDisks", "WARNING"],
  ["SYSTEM", "os.caption", "operatingSystem.caption", "INFO"],
  ["SYSTEM", "os.version", "operatingSystem.version", "INFO"],
  ["SYSTEM", "os.build", "operatingSystem.build", "INFO"],
  ["SYSTEM", "bios.version", "bios.version", "INFO"],
  ["SYSTEM", "motherboard.serial", "motherboard.serialNumber", "CRITICAL"],
  ["NETWORK", "network.primaryIp", "network.primaryIpv4", "INFO"],
  ["NETWORK", "network.primaryMac", "network.primaryMac", "WARNING"],
  ["SECURITY", "security.tpm", "security.tpm.status", "WARNING"],
  ["SECURITY", "security.defender", "security.defender.status", "CRITICAL"],
  ["SECURITY", "security.firewall", "security.firewall.status", "CRITICAL"],
  ["SECURITY", "security.bitlocker", "security.bitlocker.status", "CRITICAL"],
];

function get(object, path) { return path.split(".").reduce((value, key) => value == null ? undefined : value[key], object); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stable(value[key])]));
  return value ?? null;
}
function equal(a,b) { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)); }
function reportId(payload) { return String(payload.reportId || crypto.createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex")); }
function compareInventories(previous, current) {
  if (!previous) return [];
  return CHANGE_RULES.flatMap(([category,field,path,severity])=>{
    const oldValue=get(previous,path),newValue=get(current,path);
    if (equal(oldValue,newValue)) return [];
    return [{category,field,oldValue:oldValue??null,newValue:newValue??null,severity}];
  });
}
function volumeAlerts(payload, threshold=10) {
  return (payload.storage?.volumes || []).filter((volume)=>Number(volume.freePercentage)<threshold).map((volume)=>({
    code:`LOW_DISK:${volume.drive||volume.deviceId||"unknown"}`,category:"STORAGE",severity:"WARNING",
    title:`Pouco espaço em ${volume.drive||volume.deviceId||"volume"}`,
    message:`${Number(volume.freePercentage).toFixed(1)}% livre`,
  }));
}
function securityAlerts(payload) {
  const alerts=[];
  for(const [key,label] of [["defender","Windows Defender"],["firewall","Firewall"],["bitlocker","BitLocker"]]){
    if(payload.security?.[key]?.status==="DISABLED") alerts.push({code:`SECURITY:${key}`,category:"SECURITY",severity:"CRITICAL",title:`${label} desativado`,message:"Proteção reportada como desativada pelo agente."});
  }
  return alerts;
}
function validateInventory(payload) {
  const errors=[];
  if(!payload||typeof payload!=="object") return ["Payload inválido"];
  if(!Number.isInteger(Number(payload.schemaVersion))||Number(payload.schemaVersion)<1) errors.push("schemaVersion inválido");
  if(!payload.hostname&&!payload.computer?.hostname) errors.push("hostname obrigatório");
  if(!payload.collectedAt) errors.push("collectedAt obrigatório");
  if(!payload.agentVersion) errors.push("agentVersion obrigatório");
  return errors;
}
function communicationStatus(lastSeen, now=new Date()) {
  if(!lastSeen)return "no_data";const hours=(now-new Date(lastSeen))/3600000;
  return hours<=30?"recent":hours<=72?"attention":"no_communication";
}
module.exports={CHANGE_RULES,compareInventories,volumeAlerts,securityAlerts,validateInventory,reportId,communicationStatus};
