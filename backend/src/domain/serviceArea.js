/**
 * Responsabilidade: Módulo de service area; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
const municipalities = Object.freeze([
  'Santa Inês', 'Santa Luzia do Tide', 'Bom Jardim', 'Pio XII', 'Brejo de Areia',
  'Alto Alegre do Pindaré', 'Vitória do Mearim', 'Luís Domingues', 'Amapá do Maranhão',
  'Carutapera', 'Bela Vista do Maranhão', 'Satubinha', 'Tufilândia', 'Altamira do Maranhão',
  'Buriticupu', 'Igarapé do Meio', 'Godofredo Viana', 'Boa Vista do Gurupi', 'Maracaçumé',
  'Santa Luzia do Paruá', 'Governador Nunes Freire', 'Cândido Mendes', 'Monção',
  'Pindaré-Mirim', 'Junco do Maranhão', 'São João do Carú', 'Presidente Médici'
]);
const allowed = new Set(municipalities);
const unitFor = (municipality) => municipality ? `Maranhão Motos - ${municipality}` : '';

function validLocation(municipality, unit) {
  if (!municipality && !unit) return true;
  return allowed.has(String(municipality || '').trim()) && String(unit || '').trim() === unitFor(String(municipality).trim());
}

module.exports = { municipalities, unitFor, validLocation };
