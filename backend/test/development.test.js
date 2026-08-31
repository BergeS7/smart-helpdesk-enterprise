const test=require("node:test");
const assert=require("node:assert/strict");
const { scoreDevelopment,calculateSavings,DEVELOPMENT_STATUSES }=require("../src/domain/development");
test("pontuação classifica limites configuráveis",()=>{assert.deepEqual(scoreDevelopment({impacto:1,alcance:1,ganho:1,urgencia:1}),{total:4,prioridade:"baixa"});assert.deepEqual(scoreDevelopment({impacto:5,alcance:5,ganho:5,urgencia:5}),{total:20,prioridade:"critica"});assert.equal(scoreDevelopment({impacto:4,alcance:3,ganho:5,urgencia:3}).prioridade,"alta");});
test("pontuação rejeita valores fora da escala",()=>assert.throws(()=>scoreDevelopment({impacto:0,alcance:3,ganho:3,urgencia:3}),/entre 1 e 5/));
test("economia mensal e anual segue o exemplo corporativo",()=>assert.deepEqual(calculateSavings({tempo_antes_minutos:30,tempo_depois_minutos:5,execucoes_mes:20,pessoas:3}),{horas_mes:25,horas_ano:300}));
test("fluxo inclui homologação e implantação",()=>{assert.ok(DEVELOPMENT_STATUSES.includes("homologacao"));assert.ok(DEVELOPMENT_STATUSES.includes("pronto_implantacao"));assert.ok(DEVELOPMENT_STATUSES.includes("implantacao"));});
