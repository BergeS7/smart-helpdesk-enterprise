/**
 * Responsabilidade: Controlador HTTP de asset; valida a requisição e coordena regras e persistência.
 */
const crypto = require("crypto");
const pool = require("../config/database");
const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const clean = (v, max=255) => v == null ? null : String(v).trim().slice(0,max);
const number = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const ASSET_STATUSES = new Set(["online", "warning", "offline"]);
const { municipalities: SERVICE_MUNICIPALITIES } = require("../domain/serviceArea");
const inventoryDomain = require("../domain/assetInventory");
async function validInvite(token) {
  if (!token) return null;
  const result = await pool.query("SELECT id FROM agente_convites WHERE token_hash=$1 AND usado_em IS NULL AND revogado_em IS NULL AND expira_em>NOW()", [hash(token)]);
  return result.rows[0] || null;
}

function diagnosticStatus(body) {
  const metrics = [body.cpuUsage, body.ramUsage, body.diskUsage].map(number);
  return metrics.some((value) => value != null && value >= 85) || body.antivirusAtualizado === false
    ? "warning"
    : "online";
}

async function enroll(req, res) {
  const invite = await validInvite(req.body.enrollmentKey || req.headers["x-agent-enrollment"]);
  if (!invite) return res.status(403).json({ erro: "Convite de instalação inválido, expirado ou já utilizado" });
  const deviceId = clean(req.body.deviceId || req.body.serialNumber || req.body.hostname, 100);
  const hostname = clean(req.body.hostname);
  if (!deviceId || !hostname) return res.status(400).json({ erro: "deviceId e hostname são obrigatórios" });
  const token = crypto.randomBytes(32).toString("hex");
  const client = await pool.connect();
  try { await client.query("BEGIN");
  await client.query(`INSERT INTO ativos(device_id, token_hash, hostname, serial_number, municipio, unidade, latitude, longitude, agente_versao, ultimo_heartbeat)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT(device_id) DO UPDATE SET token_hash=EXCLUDED.token_hash, hostname=EXCLUDED.hostname,
    serial_number=EXCLUDED.serial_number, municipio=COALESCE(EXCLUDED.municipio,ativos.municipio), unidade=COALESCE(EXCLUDED.unidade,ativos.unidade),
    latitude=COALESCE(EXCLUDED.latitude,ativos.latitude), longitude=COALESCE(EXCLUDED.longitude,ativos.longitude), agente_versao=EXCLUDED.agente_versao, atualizado_em=NOW()`,
    [deviceId,hash(token),hostname,clean(req.body.serialNumber),clean(req.body.municipio,150),clean(req.body.unidade),number(req.body.latitude),number(req.body.longitude),clean(req.body.agentVersion,50)]);
  await client.query("UPDATE ativos SET usuario=COALESCE($1,usuario,'Usuário não identificado') WHERE device_id=$2",[clean(req.body.usuario||req.body.computer?.loggedUser),deviceId]);
  await client.query("UPDATE agente_convites SET usado_em=NOW() WHERE id=$1 AND usado_em IS NULL", [invite.id]);
  await client.query("COMMIT");
  res.status(201).json({ deviceId, token });
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function authenticateAgent(req, res, next) { const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,""); if(!token) return res.status(401).json({erro:"Token do agente não enviado"}); const result=await pool.query("SELECT id,device_id FROM ativos WHERE token_hash=$1",[hash(token)]); if(!result.rows[0]) return res.status(401).json({erro:"Token do agente inválido"}); req.asset=result.rows[0]; next(); }
async function heartbeat(req,res) {
  const b=req.body;
  const status=diagnosticStatus(b);
  const values=[clean(b.patrimonio,100),clean(b.hostname),clean(b.serialNumber),clean(b.municipio,150),clean(b.unidade),number(b.latitude),number(b.longitude),clean(b.ip,100),clean(b.mac,100),clean(b.usuario),clean(b.sistemaOperacional),clean(b.processador),number(b.ramTotal),clean(b.armazenamento),typeof b.antivirusAtualizado==="boolean"?b.antivirusAtualizado:null,clean(b.agentVersion,50),number(b.cpuUsage),number(b.ramUsage),number(b.diskUsage),status,number(b.uptimeHours),b.lastBoot||null,typeof b.firewallEnabled==="boolean"?b.firewallEnabled:null,clean(b.networkType,80),clean(b.linkSpeed,80),req.asset.id];
  const result=await pool.query(`UPDATE ativos SET patrimonio=$1,hostname=$2,serial_number=$3,municipio=COALESCE($4,municipio),unidade=COALESCE($5,unidade),latitude=COALESCE($6,latitude),longitude=COALESCE($7,longitude),ip=$8,mac=$9,usuario=$10,sistema_operacional=$11,processador=$12,ram_total=$13,armazenamento=$14,antivirus_atualizado=$15,agente_versao=$16,cpu_usage=$17,ram_usage=$18,disk_usage=$19,status=$20,uptime_hours=$21,last_boot=$22,firewall_enabled=$23,network_type=$24,link_speed=$25,ultimo_heartbeat=NOW(),atualizado_em=NOW() WHERE id=$26 RETURNING id`,values);
  await pool.query(`INSERT INTO ativo_metricas(ativo_id,cpu_usage,ram_usage,disk_usage)
    SELECT $1,$2,$3,$4 WHERE NOT EXISTS (
      SELECT 1 FROM ativo_metricas WHERE ativo_id=$1 AND coletado_em::date=CURRENT_DATE
    )`,[req.asset.id,number(b.cpuUsage),number(b.ramUsage),number(b.diskUsage)]);
  res.json({ok:true,receivedAt:new Date().toISOString(),id:result.rows[0].id,status});
}
function inventorySummary(payload){
  const volumes=payload.storage?.volumes||[],processors=payload.processors||[],network=payload.network||{};
  const total=Number(payload.storage?.totalBytes)||volumes.reduce((sum,v)=>sum+(Number(v.sizeBytes)||0),0),free=Number(payload.storage?.freeBytes)||volumes.reduce((sum,v)=>sum+(Number(v.freeBytes)||0),0);
  return {hostname:clean(payload.hostname||payload.computer?.hostname),manufacturer:clean(payload.computer?.manufacturer),model:clean(payload.computer?.model),serial:clean(payload.computer?.serialNumber||payload.bios?.serialNumber),os:clean(payload.operatingSystem?.caption),build:clean(payload.operatingSystem?.build,80),processor:clean(processors.map(p=>p.name).filter(Boolean).join(" | ")),ramBytes:number(payload.memory?.totalBytes),total,free,ip:clean(network.primaryIpv4||payload.ip,100),mac:clean(network.primaryMac||payload.mac,100),user:clean(payload.computer?.loggedUser||payload.usuario),lastBoot:payload.operatingSystem?.lastBoot||null};
}
async function reportInventory(req,res){
  const payload=req.body||{},errors=inventoryDomain.validateInventory(payload);if(errors.length)return res.status(400).json({erro:"Inventário inválido",detalhes:errors});
  const id=inventoryDomain.reportId(payload),summary=inventorySummary(payload),client=await pool.connect();
  try{await client.query("BEGIN");
    const current=await client.query("SELECT inventory_json FROM ativos WHERE id=$1 FOR UPDATE",[req.asset.id]);
    const inserted=await client.query(`INSERT INTO ativo_snapshots(ativo_id,report_id,coletado_em,schema_version,agente_versao,inventory_json)
      VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(ativo_id,report_id) DO NOTHING RETURNING id`,[req.asset.id,id,payload.collectedAt,Number(payload.schemaVersion),clean(payload.agentVersion,50),JSON.stringify(payload)]);
    if(!inserted.rows[0]){await client.query("ROLLBACK");return res.json({ok:true,duplicate:true,reportId:id});}
    const snapshotId=inserted.rows[0].id,changes=inventoryDomain.compareInventories(current.rows[0]?.inventory_json,payload);
    for(const change of changes)await client.query(`INSERT INTO ativo_alteracoes(ativo_id,snapshot_id,categoria,campo,valor_anterior,valor_novo,severidade,detectado_em) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)`,[req.asset.id,snapshotId,change.category,change.field,JSON.stringify(change.oldValue),JSON.stringify(change.newValue),change.severity,payload.collectedAt]);
    const alerts=[...inventoryDomain.volumeAlerts(payload,Number(process.env.ASSET_LOW_DISK_PERCENT)||10),...inventoryDomain.securityAlerts(payload)];
    await client.query("UPDATE ativo_alertas SET ativo=FALSE,atualizado_em=NOW() WHERE ativo_id=$1",[req.asset.id]);
    for(const alert of alerts)await client.query(`INSERT INTO ativo_alertas(ativo_id,codigo,categoria,titulo,mensagem,severidade,ativo) VALUES($1,$2,$3,$4,$5,$6,TRUE) ON CONFLICT(ativo_id,codigo) DO UPDATE SET titulo=EXCLUDED.titulo,mensagem=EXCLUDED.mensagem,severidade=EXCLUDED.severidade,ativo=TRUE,atualizado_em=NOW()`,[req.asset.id,alert.code,alert.category,alert.title,alert.message,alert.severity]);
    const diskUsage=summary.total?((summary.total-summary.free)/summary.total)*100:null,status=alerts.some(a=>a.severity==="CRITICAL")?"warning":alerts.length?"warning":"online";
    await client.query(`UPDATE ativos SET hostname=COALESCE($1,hostname),fabricante=$2,modelo=$3,serial_number=COALESCE($4,serial_number),sistema_operacional=$5,os_build=$6,processador=$7,ram_total_bytes=$8::bigint,ram_total=CASE WHEN $8::bigint IS NULL THEN ram_total ELSE ROUND(($8::numeric/1073741824),2) END,storage_total_bytes=$9::bigint,storage_free_bytes=$10::bigint,armazenamento=CASE WHEN $9::bigint IS NULL THEN armazenamento ELSE ROUND(($9::numeric/1073741824),1)||' GB total · '||ROUND(($10::numeric/1073741824),1)||' GB livres' END,ip=$11,mac=$12,usuario=$13,last_boot=$14,inventory_json=$15::jsonb,schema_version=$16,agente_versao=$17,ultimo_inventario=$18,ultimo_heartbeat=NOW(),disk_usage=COALESCE($19::numeric,disk_usage),status=$20,atualizado_em=NOW() WHERE id=$21`,[summary.hostname,summary.manufacturer,summary.model,summary.serial,summary.os,summary.build,summary.processor,summary.ramBytes,summary.total||null,summary.free||null,summary.ip,summary.mac,summary.user,summary.lastBoot,JSON.stringify(payload),Number(payload.schemaVersion),clean(payload.agentVersion,50),payload.collectedAt,diskUsage,status,req.asset.id]);
    await client.query("COMMIT");res.status(201).json({ok:true,reportId:id,snapshotId,changes:changes.length,alerts:alerts.length});
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}
function mapAsset(r){const communicationStatus=inventoryDomain.communicationStatus(r.ultimo_heartbeat);const status=communicationStatus==="no_communication"?"offline":ASSET_STATUSES.has(r.status)?r.status:"offline";return {id:String(r.id),deviceId:r.device_id,patrimonio:r.patrimonio||r.serial_number||r.device_id,hostname:r.hostname,fabricante:r.fabricante||null,modelo:r.modelo||null,serialNumber:r.serial_number||null,municipio:r.municipio||"Não informado",unidade:r.unidade||"Não informada",latitude:r.latitude==null?null:Number(r.latitude),longitude:r.longitude==null?null:Number(r.longitude),status,communicationStatus,ip:r.ip||"-",mac:r.mac||"-",usuario:r.usuario||"-",sistemaOperacional:r.sistema_operacional||"-",osBuild:r.os_build||null,processador:r.processador||"-",ramTotal:Number(r.ram_total)||0,ramTotalBytes:r.ram_total_bytes==null?null:Number(r.ram_total_bytes),storageTotalBytes:r.storage_total_bytes==null?null:Number(r.storage_total_bytes),storageFreeBytes:r.storage_free_bytes==null?null:Number(r.storage_free_bytes),armazenamento:r.armazenamento||"-",cpuUsage:Number(r.cpu_usage)||0,ramUsage:Number(r.ram_usage)||0,diskUsage:Number(r.disk_usage)||0,uptimeHours:Number(r.uptime_hours)||0,lastBoot:r.last_boot||null,firewallEnabled:r.firewall_enabled,networkType:r.network_type||"Não informado",linkSpeed:r.link_speed||"Não informada",ultimoHeartbeat:r.ultimo_heartbeat,ultimoInventario:r.ultimo_inventario||null,schemaVersion:r.schema_version||null,hasInventory:Boolean(r.inventory_json),agenteInstalado:true,antivirusAtualizado:r.antivirus_atualizado,responsavel:"Equipe de Infraestrutura"};}
async function list(req,res){const result=await pool.query("SELECT * FROM ativos ORDER BY municipio,hostname");res.json(result.rows.map(mapAsset));}
async function detail(req,res){const result=await pool.query("SELECT * FROM ativos WHERE id=$1",[req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Ativo não encontrado"});res.json(mapAsset(result.rows[0]));}
async function inventory(req,res){const result=await pool.query("SELECT inventory_json FROM ativos WHERE id=$1",[req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Ativo não encontrado"});res.json(result.rows[0].inventory_json);}
async function history(req,res){const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50)),offset=Math.max(0,Number(req.query.offset)||0);const result=await pool.query(`SELECT id,'snapshot' AS tipo,'Coleta de inventário' AS titulo,CASE WHEN EXISTS(SELECT 1 FROM ativo_alteracoes c WHERE c.snapshot_id=s.id) THEN 'Alterações relevantes detectadas' ELSE 'Nenhuma alteração relevante' END AS descricao,coletado_em AS horario FROM ativo_snapshots s WHERE ativo_id=$1 ORDER BY coletado_em DESC LIMIT $2 OFFSET $3`,[req.params.id,limit,offset]);res.json(result.rows.map(r=>({...r,id:String(r.id),deviceId:String(req.params.id)})));}
async function changes(req,res){const params=[req.params.id],where=["ativo_id=$1"];if(req.query.category){params.push(req.query.category);where.push(`categoria=$${params.length}`)}params.push(Math.min(200,Math.max(1,Number(req.query.limit)||100)));const result=await pool.query(`SELECT id,categoria AS category,campo AS field,valor_anterior AS "oldValue",valor_novo AS "newValue",severidade AS severity,detectado_em AS "detectedAt",reconhecida AS acknowledged FROM ativo_alteracoes WHERE ${where.join(" AND ")} ORDER BY detectado_em DESC LIMIT $${params.length}`,params);res.json(result.rows);}
async function snapshots(req,res){const result=await pool.query("SELECT id,report_id AS \"reportId\",coletado_em AS \"collectedAt\",schema_version AS \"schemaVersion\",agente_versao AS \"agentVersion\" FROM ativo_snapshots WHERE ativo_id=$1 ORDER BY coletado_em DESC LIMIT 100",[req.params.id]);res.json(result.rows);}
async function snapshot(req,res){const result=await pool.query("SELECT id,report_id AS \"reportId\",coletado_em AS \"collectedAt\",inventory_json AS inventory FROM ativo_snapshots WHERE ativo_id=$1 AND id=$2",[req.params.id,req.params.snapshotId]);if(!result.rows[0])return res.status(404).json({erro:"Snapshot não encontrado"});res.json(result.rows[0]);}
async function alerts(req,res){const result=await pool.query("SELECT id,codigo AS code,categoria AS category,titulo AS title,mensagem AS message,severidade AS severity,ativo AS active,detectado_em AS \"detectedAt\",reconhecido AS acknowledged FROM ativo_alertas WHERE ativo_id=$1 ORDER BY ativo DESC,severidade DESC,detectado_em DESC",[req.params.id]);res.json(result.rows);}
async function acknowledgeAlert(req,res){const result=await pool.query("UPDATE ativo_alertas SET reconhecido=TRUE,atualizado_em=NOW() WHERE id=$1 AND ativo_id=$2 RETURNING id",[req.params.alertId,req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Alerta não encontrado"});res.json({ok:true});}
async function locations(req,res){const invite=await validInvite(req.headers["x-agent-enrollment"]);if(!invite)return res.status(401).json({erro:"Convite de instalação válido é obrigatório"});const result=await pool.query("SELECT id,nome,municipio,latitude,longitude,rede_prefixo FROM ativo_unidades WHERE ativa=true AND municipio=ANY($1::text[]) ORDER BY municipio,nome",[SERVICE_MUNICIPALITIES]);res.json(result.rows);}
async function adminLocations(_req,res){const result=await pool.query("SELECT id,nome,municipio,latitude,longitude,rede_prefixo FROM ativo_unidades WHERE ativa=true AND municipio=ANY($1::text[]) ORDER BY municipio,nome",[SERVICE_MUNICIPALITIES]);res.json(result.rows);}
async function createInvite(req,res){const token=crypto.randomBytes(24).toString("base64url");const hours=Math.min(24,Math.max(1,Number(req.body?.validade_horas)||2));await pool.query("INSERT INTO agente_convites(token_hash,descricao,criado_por,expira_em) VALUES($1,$2,$3,NOW()+($4::text||' hours')::interval)",[hash(token),clean(req.body?.descricao||"Instalação de agente",255),req.user.id,hours]);res.status(201).json({convite:token,expira_em:new Date(Date.now()+hours*3600000).toISOString(),aviso:"O convite é exibido uma única vez."});}
async function updateLocation(req,res){const {municipio,unidade,latitude,longitude}=req.body;if(!municipio||!unidade||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude)))return res.status(400).json({erro:"Município, unidade e coordenadas são obrigatórios"});const result=await pool.query("UPDATE ativos SET municipio=$1,unidade=$2,latitude=$3,longitude=$4,atualizado_em=NOW() WHERE id=$5 RETURNING *",[clean(municipio,150),clean(unidade),Number(latitude),Number(longitude),req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Ativo não encontrado"});res.json(mapAsset(result.rows[0]));}
async function updateStatus(req,res){const status=clean(req.body.status,20)?.toLowerCase();if(!ASSET_STATUSES.has(status))return res.status(400).json({erro:"Estado deve ser online, warning ou offline"});const result=await pool.query("UPDATE ativos SET status=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *",[status,req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Ativo não encontrado"});res.json(mapAsset(result.rows[0]));}
async function saveLocation(req,res){const {nome,municipio,latitude,longitude,redePrefixo}=req.body;if(!nome||!municipio)return res.status(400).json({erro:"Nome e município são obrigatórios"});if(!SERVICE_MUNICIPALITIES.includes(String(municipio).trim()))return res.status(400).json({erro:"Município fora da área de atuação"});const result=await pool.query(`INSERT INTO ativo_unidades(nome,municipio,latitude,longitude,rede_prefixo) VALUES($1,$2,$3,$4,$5) ON CONFLICT(nome,municipio) DO UPDATE SET latitude=$3,longitude=$4,rede_prefixo=$5,ativa=true RETURNING *`,[clean(nome),clean(municipio,150),number(latitude),number(longitude),clean(redePrefixo,100)]);res.json(result.rows[0]);}
module.exports={enroll,authenticateAgent,heartbeat,reportInventory,list,detail,inventory,history,changes,snapshots,snapshot,alerts,acknowledgeAlert,locations,adminLocations,updateLocation,updateStatus,saveLocation,createInvite};
