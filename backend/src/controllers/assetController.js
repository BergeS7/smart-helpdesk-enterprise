const crypto = require("crypto");
const pool = require("../config/database");
const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const clean = (v, max=255) => v == null ? null : String(v).trim().slice(0,max);
const number = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const ASSET_STATUSES = new Set(["online", "warning", "offline"]);
const { municipalities: SERVICE_MUNICIPALITIES } = require("../domain/serviceArea");
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
function mapAsset(r){const status=ASSET_STATUSES.has(r.status)?r.status:"online";return {id:String(r.id),deviceId:r.device_id,patrimonio:r.patrimonio||r.serial_number||r.device_id,hostname:r.hostname,municipio:r.municipio||"Não informado",unidade:r.unidade||"Não informada",latitude:Number(r.latitude)||-2.5307,longitude:Number(r.longitude)||-44.3068,status,ip:r.ip||"-",mac:r.mac||"-",usuario:r.usuario||"-",sistemaOperacional:r.sistema_operacional||"-",processador:r.processador||"-",ramTotal:Number(r.ram_total)||0,armazenamento:r.armazenamento||"-",cpuUsage:Number(r.cpu_usage)||0,ramUsage:Number(r.ram_usage)||0,diskUsage:Number(r.disk_usage)||0,uptimeHours:Number(r.uptime_hours)||0,lastBoot:r.last_boot||null,firewallEnabled:r.firewall_enabled,networkType:r.network_type||"Não informado",linkSpeed:r.link_speed||"Não informada",ultimoHeartbeat:r.ultimo_heartbeat,agenteInstalado:true,antivirusAtualizado:r.antivirus_atualizado,responsavel:"Equipe de Infraestrutura"};}
async function list(req,res){const result=await pool.query("SELECT * FROM ativos ORDER BY municipio,hostname");res.json(result.rows.map(mapAsset));}
async function history(req,res){const result=await pool.query("SELECT id,cpu_usage,ram_usage,disk_usage,coletado_em FROM ativo_metricas WHERE ativo_id=$1 ORDER BY coletado_em DESC LIMIT 100",[req.params.id]);res.json(result.rows.map(r=>({id:String(r.id),deviceId:String(req.params.id),tipo:'metric',titulo:'Métricas coletadas',descricao:`CPU ${Number(r.cpu_usage)||0}% · RAM ${Number(r.ram_usage)||0}% · Disco ${Number(r.disk_usage)||0}%`,horario:r.coletado_em})));}
async function locations(req,res){const invite=await validInvite(req.headers["x-agent-enrollment"]);if(!invite)return res.status(401).json({erro:"Convite de instalação válido é obrigatório"});const result=await pool.query("SELECT id,nome,municipio,latitude,longitude,rede_prefixo FROM ativo_unidades WHERE ativa=true AND municipio=ANY($1::text[]) ORDER BY municipio,nome",[SERVICE_MUNICIPALITIES]);res.json(result.rows);}
async function adminLocations(_req,res){const result=await pool.query("SELECT id,nome,municipio,latitude,longitude,rede_prefixo FROM ativo_unidades WHERE ativa=true AND municipio=ANY($1::text[]) ORDER BY municipio,nome",[SERVICE_MUNICIPALITIES]);res.json(result.rows);}
async function createInvite(req,res){const token=crypto.randomBytes(24).toString("base64url");const hours=Math.min(24,Math.max(1,Number(req.body?.validade_horas)||2));await pool.query("INSERT INTO agente_convites(token_hash,descricao,criado_por,expira_em) VALUES($1,$2,$3,NOW()+($4::text||' hours')::interval)",[hash(token),clean(req.body?.descricao||"Instalação de agente",255),req.user.id,hours]);res.status(201).json({convite:token,expira_em:new Date(Date.now()+hours*3600000).toISOString(),aviso:"O convite é exibido uma única vez."});}
async function updateLocation(req,res){const {municipio,unidade,latitude,longitude}=req.body;if(!municipio||!unidade||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude)))return res.status(400).json({erro:"Município, unidade e coordenadas são obrigatórios"});const result=await pool.query("UPDATE ativos SET municipio=$1,unidade=$2,latitude=$3,longitude=$4,atualizado_em=NOW() WHERE id=$5 RETURNING *",[clean(municipio,150),clean(unidade),Number(latitude),Number(longitude),req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Ativo não encontrado"});res.json(mapAsset(result.rows[0]));}
async function updateStatus(req,res){const status=clean(req.body.status,20)?.toLowerCase();if(!ASSET_STATUSES.has(status))return res.status(400).json({erro:"Estado deve ser online, warning ou offline"});const result=await pool.query("UPDATE ativos SET status=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *",[status,req.params.id]);if(!result.rows[0])return res.status(404).json({erro:"Ativo não encontrado"});res.json(mapAsset(result.rows[0]));}
async function saveLocation(req,res){const {nome,municipio,latitude,longitude,redePrefixo}=req.body;if(!nome||!municipio)return res.status(400).json({erro:"Nome e município são obrigatórios"});if(!SERVICE_MUNICIPALITIES.includes(String(municipio).trim()))return res.status(400).json({erro:"Município fora da área de atuação"});const result=await pool.query(`INSERT INTO ativo_unidades(nome,municipio,latitude,longitude,rede_prefixo) VALUES($1,$2,$3,$4,$5) ON CONFLICT(nome,municipio) DO UPDATE SET latitude=$3,longitude=$4,rede_prefixo=$5,ativa=true RETURNING *`,[clean(nome),clean(municipio,150),number(latitude),number(longitude),clean(redePrefixo,100)]);res.json(result.rows[0]);}
module.exports={enroll,authenticateAgent,heartbeat,list,history,locations,adminLocations,updateLocation,updateStatus,saveLocation,createInvite};
