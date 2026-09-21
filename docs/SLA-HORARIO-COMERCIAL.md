# SLA em horário comercial

O calendário utiliza America/Fortaleza (UTC−03): segunda a sexta, 08h–12h e
14h–18h; sábado, 08h–12h; domingo sem expediente. O almoço padrão da equipe
é 12h–14h, independentemente do intervalo individual de cada colaborador.
São oito horas úteis por dia de semana e quatro no sábado. Não há exceções
para feriados nesta regra.

Os valores configurados são **minutos úteis**, tanto para primeira resposta
quanto para resolução. Exemplos: sexta às 17h + 120 minutos vence sábado às
09h; sábado às 11h + 120 minutos vence segunda às 09h. O contador de saldo
e de atraso não avança fora do expediente. Um chamado já vencido continua
identificado como vencido. Alertas automáticos só são processados no expediente.

A pausa por `WAITING_USER` acumula apenas tempo útil na prorrogação dos
prazos, evitando somar a noite duas vezes. O contador histórico
`sla_tempo_pausado_segundos` continua registrando a duração corrida da pausa,
mas não é usado para calcular vencimentos. Mudanças de prioridade aplicam a
diferença entre os orçamentos de minutos úteis, preservando o tempo consumido
e as pausas; não alteram o prazo de resposta após a primeira resposta.

## Ativação

Publicar backend e frontend juntos. O backend aplica automaticamente
`1790000000000_business_hours_sla.js` antes de aceitar conexões. Na stack
Docker do projeto, reconstruir os serviços com `docker compose up -d --build backend frontend`.

A migração preserva o saldo corrente dos chamados abertos e converte o saldo
positivo em minutos úteis a partir da ativação (ou da referência da pausa
atual). Não recalcula retroativamente o consumo anterior, pois os totais
legados de pausa não permitem recuperar todos os intervalos. Chamados
encerrados e os prazos já vencidos ficam preservados. A migração é aplicada
uma única vez; sua reversão exige restaurar os prazos de um backup.

As colunas legadas são `timestamp` sem fuso: o fuso da sessão PostgreSQL e a
interpretação dos timestamps pelo processo Node devem permanecer alinhados,
como na stack Docker padrão (UTC). As funções convertem explicitamente para
Fortaleza para aplicar o expediente.

## Validação

`npm test` e `npm run check` no backend; `npm run build` no frontend.
Para os testes de integração, definir `SLA_TEST_DATABASE_URL` apontando
**exclusivamente para um PostgreSQL descartável**. O teste executa a migração
em transação, valida os fusos UTC e Fortaleza e faz rollback ao terminar.
