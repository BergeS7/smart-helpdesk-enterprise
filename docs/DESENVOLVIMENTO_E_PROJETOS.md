# Desenvolvimento e projetos

O Smart HelpDesk usa o chamado como porta de entrada única. Incidentes e solicitações continuam no fluxo de suporte; Bug, Melhoria, Automação, Integração, Dashboard/Relatório e Novo Sistema criam uma demanda vinculada ao chamado original.

## Arquitetura

- `development_requests`: dados de negócio, triagem, pontuação, esforço e atribuição. Solicitante, título, descrição, anexos e comentários continuam no chamado.
- `development_history`: auditoria de criação, edição, prioridade, status, aprovação, homologação, implantação e conversão. Eventos internos não são retornados ao usuário comum.
- `development_projects` e `project_tasks`: projetos internos e tarefas leves.
- `development_approvals`: decisões de aprovação e homologação.
- `development_deployments`: ambiente, versão, responsável e evidências de implantação.
- `ticket_relations`: relações entre chamados e projetos.

A migration `1788177600000_add_development_workflow.js` é aditiva, idempotente e não remove dados no rollback. Códigos `DEV-AAAA-NNNNNN` e `PRJ-AAAA-NNNNNN` são amigáveis; as chaves internas permanecem numéricas.

## Fluxo

`Nova → Em análise → Levantamento de requisitos → Avaliação técnica → Aguardando aprovação → Backlog → Em desenvolvimento → Em testes → Homologação → Pronto para implantação → Implantação → Concluído`.

Cancelamento exige comentário. Homologação rejeitada ou com ajustes também exige comentário. A conversão preserva a demanda e cria uma relação com o projeto.

## Pontuação e benefício

Impacto, alcance, ganho e urgência recebem notas de 1 a 5. A soma (4–20) gera Baixa (até 7), Média (até 11), Alta (até 15) ou Crítica (16–20). Os limites ficam isolados em `backend/src/domain/development.js`.

Horas economizadas/mês = `(tempo anterior - tempo posterior) × execuções/mês × pessoas ÷ 60`. O dashboard também apresenta a projeção anual.

## API

- `GET/POST /api/development`
- `GET/PUT /api/development/:id`
- `PATCH /api/development/:id/status`
- `POST /api/development/:id/decisions`
- `POST /api/development/:id/deployments`
- `POST /api/development/:id/convert-project`
- `GET /api/development/dashboard`
- `GET/POST /api/development/projects`
- `GET /api/development/projects/:id`
- `POST /api/development/projects/:id/tasks`

Todos exigem JWT. Usuários comuns enxergam somente suas demandas/projetos e homologam apenas o que solicitaram. Operações internas são protegidas no backend.

## Permissões

- `desenvolvimento_visualizar`
- `desenvolvimento_analisar`
- `desenvolvimento_editar`
- `desenvolvimento_implantar`
- `desenvolvimento_converter_projeto`

Administradores e desenvolvedores mantêm acesso total pelo RBAC existente. Supervisores recebem visualização por padrão; as demais concessões são individuais pela matriz de acessos.

## Interface e operação

O workspace contém indicadores, filtros, backlog, Kanban responsivo, avaliação e projetos. O formulário do solicitante revela campos adicionais somente para naturezas de desenvolvimento. Execute `npm run migrate` em `backend/` antes da publicação. Nenhuma variável de ambiente nova é necessária.
