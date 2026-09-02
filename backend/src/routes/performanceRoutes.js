/**
 * Responsabilidade: Rotas de performance; associa endpoints aos middlewares e controladores autorizados.
 */
const router=require("express").Router();
const auth=require("../middlewares/authMiddleware");
const { exigirPermissao }=require("../middlewares/authMiddleware");
const performance=require("../controllers/performanceController");
router.use(auth);
router.post("/tickets/:id/rating",performance.rateTicket);
router.get("/tickets/:id/rating",performance.ticketRating);
router.get("/me",performance.myDashboard);
router.get("/technicians/:id",performance.technicianDashboard);
router.get("/teams/:id",performance.teamDashboard);
router.get("/company",performance.companyDashboard);
router.get("/ranking",exigirPermissao("visualizar_ranking_satisfacao"),performance.ranking);
module.exports=router;
