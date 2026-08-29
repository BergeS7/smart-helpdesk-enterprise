/**
 * Responsabilidade: Testes automatizados que verificam asset inventory.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const inventory = require("../src/domain/assetInventory");

function sample(overrides={}) {
  return {
    schemaVersion: 1, reportId: "report-1", collectedAt: "2026-08-20T15:00:00.000Z", agentVersion: "2.0.0", hostname: "PC-01",
    computer: { hostname: "PC-01", serialNumber: "SER-1", manufacturer: "Dell", model: "OptiPlex" },
    processors: [{ name: "CPU A", cores: 4 }],
    memory: { totalBytes: 16_000_000_000, modules: [{ bank: "A1", capacityBytes: 8_000_000_000, serialNumber: "RAM1" }] },
    storage: { physicalDisks: [{ index: 0, model: "SSD A", serialNumber: "SSD1", sizeBytes: 512_000_000_000 }], volumes: [{ drive: "C:", sizeBytes: 500, freeBytes: 100, freePercentage: 20 }] },
    operatingSystem: { caption: "Windows 11", version: "10.0", build: "26100" },
    network: { primaryIpv4: "10.0.0.10", primaryMac: "00-AA", adapters: [] },
    security: { defender: { status: "ENABLED" }, firewall: { status: "ENABLED" }, bitlocker: { status: "UNKNOWN" } },
    ...overrides,
  };
}

test("a primeira coleta cria baseline e não gera alterações",()=>assert.deepEqual(inventory.compareInventories(null,sample()),[]));
test("inventários semanticamente iguais não geram alterações",()=>assert.deepEqual(inventory.compareInventories(sample(),sample()),[]));
test("detecta RAM adicionada ou removida",()=>{
  const next=sample(); next.memory={...next.memory,totalBytes:8_000_000_000,modules:[]};
  const fields=inventory.compareInventories(sample(),next).map(x=>x.field);
  assert.ok(fields.includes("memory.total")); assert.ok(fields.includes("memory.modules"));
});
test("detecta disco adicionado, removido ou substituído",()=>{
  const next=sample(); next.storage={...next.storage,physicalDisks:[{index:0,model:"SSD B",serialNumber:"SSD2",sizeBytes:1024}]};
  assert.ok(inventory.compareInventories(sample(),next).some(x=>x.field==="storage.physicalDisks"));
});
test("detecta build, IP, MAC e hostname",()=>{
  const next=sample({hostname:"PC-02",computer:{...sample().computer,hostname:"PC-02"},operatingSystem:{...sample().operatingSystem,build:"26101"},network:{...sample().network,primaryIpv4:"10.0.0.11",primaryMac:"00-BB"}});
  const fields=inventory.compareInventories(sample(),next).map(x=>x.field);
  for(const field of ["hostname","os.build","network.primaryIp","network.primaryMac"]) assert.ok(fields.includes(field),field);
});
test("reportId explícito sustenta idempotência e hash é determinístico",()=>{
  assert.equal(inventory.reportId(sample()),"report-1");
  const a=sample(); delete a.reportId; const b=JSON.parse(JSON.stringify(a));
  assert.equal(inventory.reportId(a),inventory.reportId(b));
});
test("valida payload mínimo e aceita inventário parcial",()=>{
  assert.deepEqual(inventory.validateInventory({schemaVersion:1,hostname:"PC",collectedAt:"2026-08-20T15:00:00Z",agentVersion:"2.0.0"}),[]);
  assert.ok(inventory.validateInventory({schemaVersion:1,collectedAt:"x",agentVersion:"2"}).includes("hostname obrigatório"));
});
test("alerta volume abaixo do limite e ignora segurança desconhecida",()=>{
  const payload=sample(); payload.storage.volumes[0].freePercentage=9.9; payload.security.defender.status="UNKNOWN";
  assert.equal(inventory.volumeAlerts(payload).length,1); assert.equal(inventory.securityAlerts(payload).length,0);
});
test("estado de comunicação usa janelas recente, atenção e sem comunicação",()=>{
  const now=new Date("2026-08-20T15:00:00Z");
  assert.equal(inventory.communicationStatus("2026-08-20T10:00:00Z",now),"recent");
  assert.equal(inventory.communicationStatus("2026-08-18T15:00:00Z",now),"attention");
  assert.equal(inventory.communicationStatus("2026-08-15T15:00:00Z",now),"no_communication");
});
