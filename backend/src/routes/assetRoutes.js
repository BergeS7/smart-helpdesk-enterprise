/**
 * Responsabilidade: Rotas de asset; associa endpoints aos middlewares e controladores autorizados.
 */
const router=require("express").Router();
const auth=require("../middlewares/authMiddleware"); const {exigirPerfis,exigirPermissao}=require("../middlewares/authMiddleware");
const c=require("../controllers/assetController");
const {agentEnrollmentLimiter}=require("../middlewares/securityMiddleware");
router.get("/agent/locations",agentEnrollmentLimiter,c.locations); router.post("/agent/enroll",agentEnrollmentLimiter,c.enroll); router.post("/agent/heartbeat",c.authenticateAgent,c.heartbeat); router.post("/agent/report",c.authenticateAgent,c.reportInventory);
const releases=require("../controllers/agentReleaseController");
router.get("/agent/update",c.authenticateAgent,releases.latestForAgent); router.get("/agent/update/package",c.authenticateAgent,releases.packageForAgent);
router.get("/admin/agent-releases",auth,exigirPerfis(["admin","desenvolvedor"]),releases.adminList);
router.post("/admin/agent-releases",auth,exigirPerfis(["admin","desenvolvedor"]),releases.adminPublish);
router.patch("/admin/agent-releases/:id/revoke",auth,exigirPerfis(["admin","desenvolvedor"]),releases.adminRevoke);
router.post("/admin/invites",auth,exigirPerfis(["admin","desenvolvedor"]),c.createInvite);
router.get("/admin/users",auth,exigirPermissao("administrar_ativos"),c.assignableUsers);
router.get("/admin/locations",auth,exigirPerfis(["admin","desenvolvedor"]),c.adminLocations);
router.get("/",auth,exigirPermissao("visualizar_patrimonio"),c.list);
router.get("/:id",auth,exigirPermissao("visualizar_patrimonio"),c.detail);
router.get("/:id/inventory",auth,exigirPermissao("visualizar_patrimonio"),c.inventory);
router.get("/:id/history",auth,exigirPermissao("visualizar_patrimonio"),c.history);
router.get("/:id/changes",auth,exigirPermissao("visualizar_patrimonio"),c.changes);
router.get("/:id/snapshots",auth,exigirPermissao("visualizar_patrimonio"),c.snapshots);
router.get("/:id/snapshots/:snapshotId",auth,exigirPermissao("visualizar_patrimonio"),c.snapshot);
router.get("/:id/alerts",auth,exigirPermissao("visualizar_patrimonio"),c.alerts);
router.patch("/:id/alerts/:alertId/acknowledge",auth,exigirPermissao("administrar_ativos"),c.acknowledgeAlert);
router.patch("/:id/location",auth,exigirPermissao("administrar_ativos"),c.updateLocation);
router.patch("/:id/user",auth,exigirPermissao("administrar_ativos"),c.setUser);
router.patch("/:id/status",auth,exigirPermissao("administrar_ativos"),c.updateStatus);
router.post("/admin/locations",auth,exigirPerfis(["admin","desenvolvedor"]),c.saveLocation);
module.exports=router;
