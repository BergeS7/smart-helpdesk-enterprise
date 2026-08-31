/**
 * Responsabilidade: Controlador HTTP de performance; valida a requisição e coordena regras e persistência.
 */
const pool = require("../config/database");
const { calculateIndicators, updatePerformance, recordRating, ranking } = require("../services/performanceService");
const { isFinal } = require("../domain/ticketStatus");
const { montarUrlFotoPerfil } = require("../utils/profilePhoto");
const { usuarioPodeAvaliarChamado } = require("../services/ticketEvaluationAccessService");
const isAdmin = (user) => ["admin", "desenvolvedor", "super_admin"].includes(user?.perfil);
const number = (value, min, max) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
const period = (query) => ({ month: number(query.month,1,12) || new Date().getMonth()+1, year: number(query.year,2020,2100) || new Date().getFullYear() });

exports.rateTicket = async (req,res) => {
  try {
    const ticketId=number(req.params.id,1,Number.MAX_SAFE_INTEGER); if(!ticketId) return res.status(400).json({erro:"Chamado inválido"});
    const ticketResult=await pool.query("SELECT * FROM chamados WHERE id=$1",[ticketId]); const ticket=ticketResult.rows[0];
    if(!ticket) return res.status(404).json({erro:"Chamado não encontrado"});
    if(!(await usuarioPodeAvaliarChamado(ticket,req.user))) return res.status(403).json({erro:"Somente o solicitante ou o usuário vinculado ao ativo pode avaliar este chamado"});
    if(!isFinal(ticket.status)) return res.status(400).json({erro:"A pesquisa fica disponível após o encerramento do chamado"});
    const fields=["overall_rating","courtesy_rating","communication_rating","resolution_rating","speed_rating"];
    const rating={nps_score:number(req.body.nps_score,0,10),comment:String(req.body.comment||"").trim().slice(0,4000)};
    if(!rating.comment)return res.status(400).json({erro:"O comentário da avaliação é obrigatório"});
    for(const field of fields){rating[field]=number(req.body[field],1,5);if(!rating[field])return res.status(400).json({erro:`${field} deve ser uma nota de 1 a 5`});}
    if(rating.nps_score===null)return res.status(400).json({erro:"NPS deve estar entre 0 e 10"});
    const saved=await recordRating({ticket,clientId:req.user.id,rating}); return res.status(201).json(saved);
  } catch(error) { if(error.code==="23505")return res.status(409).json({erro:"Este chamado já foi avaliado"}); console.error("Erro performance rating:",error.message);return res.status(500).json({erro:"Erro ao registrar avaliação"}); }
};

exports.technicianDashboard = async (req,res) => {
  try {
    const technicianId=number(req.params.id,1,Number.MAX_SAFE_INTEGER);
    if(!technicianId)return res.status(400).json({erro:"Técnico inválido"});
    if(!isAdmin(req.user)&&req.user.id!==technicianId)return res.status(403).json({erro:"Acesso restrito à própria performance"});
    const p=period(req.query);
    const [score,details,distribution,ratings]=await Promise.all([
      updatePerformance({technicianId,date:new Date(p.year,p.month-1,1)}),
      pool.query(`SELECT ROUND(AVG(courtesy_rating)::numeric,2) courtesy_rating,ROUND(AVG(communication_rating)::numeric,2) communication_rating,ROUND(AVG(resolution_rating)::numeric,2) resolution_rating,ROUND(AVG(speed_rating)::numeric,2) speed_rating FROM performance_ratings WHERE technician_id=$1 AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3`,[technicianId,p.month,p.year]),
      pool.query(`SELECT overall_rating rating,COUNT(*)::int total FROM performance_ratings WHERE technician_id=$1 AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3 GROUP BY overall_rating ORDER BY overall_rating`,[technicianId,p.month,p.year]),
      pool.query(`SELECT overall_rating,courtesy_rating,communication_rating,resolution_rating,speed_rating,nps_score,comment,sentiment,created_at FROM performance_ratings WHERE technician_id=$1 AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3 ORDER BY created_at DESC LIMIT 10`,[technicianId,p.month,p.year])
    ]);
    const profile=await pool.query("SELECT nome,email,departamento,foto_perfil FROM usuarios WHERE id=$1",[technicianId]);
    res.json({...score,...details.rows[0],name:profile.rows[0]?.nome||req.user?.nome||"Técnico",email:profile.rows[0]?.email||req.user?.email||"",departamento:profile.rows[0]?.departamento||"",foto_url:await montarUrlFotoPerfil(req,technicianId,profile.rows[0]?.foto_perfil),rating_distribution:distribution.rows,recent_ratings:ratings.rows});
  }
  catch(error){console.error("Erro dashboard técnico:",error.message);res.status(500).json({erro:"Erro ao carregar performance"});}
};

exports.teamDashboard = async (req,res) => {
  try { const teamId=number(req.params.id,1,Number.MAX_SAFE_INTEGER);const manager=await pool.query("SELECT manager_id FROM teams WHERE id=$1",[teamId]);if(!manager.rowCount)return res.status(404).json({erro:"Equipe não encontrada"});if(!isAdmin(req.user)&&manager.rows[0].manager_id!==req.user.id)return res.status(403).json({erro:"Acesso restrito à sua equipe"});const p=period(req.query);const score=await updatePerformance({teamId,date:new Date(p.year,p.month-1,1)});res.json(score); }
  catch(error){console.error("Erro dashboard equipe:",error.message);res.status(500).json({erro:"Erro ao carregar performance da equipe"});}
};

exports.companyDashboard = async (req,res) => { try { if(!isAdmin(req.user))return res.status(403).json({erro:"Acesso restrito a administradores"});const p=period(req.query);const active=await pool.query("SELECT id,foto_perfil FROM usuarios WHERE COALESCE(status,'ativo')='ativo' AND LOWER(COALESCE(perfil,'')) IN ('tecnico','admin','desenvolvedor','super_admin') ORDER BY nome");await Promise.all(active.rows.map(({id})=>updatePerformance({technicianId:id,date:new Date(p.year,p.month-1,1)})));const [company,techniciansRaw,teams,distribution,comments,keywords]=await Promise.all([updatePerformance({date:new Date(p.year,p.month-1,1)}),ranking({scope:"technicians",...p}),ranking({scope:"teams",...p}),pool.query("SELECT overall_rating rating,COUNT(*)::int total FROM performance_ratings WHERE EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2 GROUP BY overall_rating ORDER BY overall_rating",[p.month,p.year]),pool.query("SELECT pr.comment,pr.sentiment,pr.created_at,COALESCE(u.nome, 'Solicitante removido') client_name FROM performance_ratings pr LEFT JOIN usuarios u ON u.id=pr.client_id WHERE pr.comment IS NOT NULL AND EXTRACT(MONTH FROM pr.created_at)=$1 AND EXTRACT(YEAR FROM pr.created_at)=$2 ORDER BY pr.created_at DESC LIMIT 8",[p.month,p.year]),pool.query("SELECT keyword,COUNT(*)::int total FROM performance_ratings pr CROSS JOIN LATERAL jsonb_array_elements_text(pr.keywords) keyword WHERE EXTRACT(MONTH FROM pr.created_at)=$1 AND EXTRACT(YEAR FROM pr.created_at)=$2 GROUP BY keyword ORDER BY total DESC,keyword LIMIT 12",[p.month,p.year])]);const avatarPorId=new Map(active.rows.map((item)=>[Number(item.id),item.foto_perfil]));const technicians=await Promise.all(techniciansRaw.map(async(item,index)=>({...item,position:index+1,foto_url:await montarUrlFotoPerfil(req,item.technician_id,avatarPorId.get(Number(item.technician_id)))})));res.json({company,technicians,teams,rating_distribution:distribution.rows,recent_comments:comments.rows,keywords:keywords.rows}); } catch(error){console.error("Erro dashboard empresa:",error.message);res.status(500).json({erro:"Erro ao carregar dashboard corporativo"});} };
exports.myDashboard = (req,res) => { req.params.id=String(req.user.id); return exports.technicianDashboard(req,res); };
exports.ranking = async (req,res) => { try { const p=period(req.query);const scope=req.query.scope==="teams"?"teams":"technicians";if(!isAdmin(req.user)&&scope==="teams")return res.status(403).json({erro:"Acesso restrito"});res.json(await ranking({scope,...p})); } catch(error){res.status(500).json({erro:"Erro ao carregar ranking"});} };
exports.ticketRating = async (req,res) => { try {const result=await pool.query("SELECT id,ticket_id,overall_rating,courtesy_rating,communication_rating,resolution_rating,speed_rating,nps_score,comment,sentiment,keywords,created_at FROM performance_ratings WHERE ticket_id=$1 AND client_id=$2",[req.params.id,req.user.id]);res.json(result.rows[0]||null);}catch(_){res.status(500).json({erro:"Erro ao consultar avaliação"});} };
