/**
 * Responsabilidade: Rotas de team; associa endpoints aos middlewares e controladores autorizados.
 */
const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const { exigirPerfis } = require("../middlewares/authMiddleware");
const teams = require("../controllers/teamController");

router.use(auth);
router.get("/users/search", exigirPerfis(["admin","desenvolvedor","super_admin","tecnico"]), teams.searchUsers);
router.get("/", teams.list);
router.post("/", exigirPerfis(["admin","desenvolvedor","super_admin"]), teams.create);
router.get("/:id", teams.get);
router.patch("/:id", teams.update);
router.delete("/:id", exigirPerfis(["admin","desenvolvedor","super_admin"]), teams.remove);
router.get("/:id/members", teams.members);
router.post("/:id/members", teams.addMember);
router.delete("/:id/members/:userId", teams.removeMember);
router.put("/:id/manager", teams.changeManager);
module.exports = router;
