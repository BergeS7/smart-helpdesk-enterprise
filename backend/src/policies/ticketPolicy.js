const { isFinal } = require("../domain/ticketStatus");
const profile = (user) => String(user?.perfil || "usuario").toLowerCase();
const isAdmin = (user) => ["admin", "desenvolvedor", "super_admin"].includes(profile(user));
const isTechnician = (user) => profile(user) === "tecnico";
const ownsAsRequester = (user, ticket) => Number(ticket?.usuario_id) === Number(user?.id) || (user?.email && String(ticket?.email_solicitante || "").toLowerCase() === String(user.email).toLowerCase());
const ownsAsTechnician = (user, ticket) => Number(ticket?.responsavel_id) === Number(user?.id);

function canMutate(user, ticket) {
  if (isAdmin(user)) return true;
  if (isTechnician(user)) return ownsAsTechnician(user, ticket);
  return ownsAsRequester(user, ticket);
}
function canAddContent(user, ticket) { return !isFinal(ticket?.status) && canMutate(user, ticket); }
function canRate(user, ticket) { return !isAdmin(user) && !isTechnician(user) && isFinal(ticket?.status) && ownsAsRequester(user, ticket); }

module.exports = { canMutate, canAddContent, canRate, isFinal };
