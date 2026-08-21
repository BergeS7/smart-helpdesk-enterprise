# Diagnóstico da navegação administrativa

## Estrutura atual

- `App.tsx` ainda coordena autenticação, dados compartilhados, navegação e várias telas legadas.
- Fila, Kanban, Chamados e Usuários já possuem módulos carregados sob demanda.
- Dashboard, Relatórios, Ajustes, Ativos e Diagnóstico também possuem chunks próprios.
- As rotas são controladas por `useModuleRoute`, sem React Router.

## Rotas e sobreposições

- Atendimento: `/admin/fila`, `/admin/kanban`, `/admin/chamados`, `/admin/historico`.
- Equipe: `/admin/tecnicos`, `/admin/usuarios`, `/admin/equipes` e matriz dentro de Usuários.
- Indicadores: `/admin/dashboard`, `/admin/satisfacao`, `/admin/relatorios`.
- Administração: `/admin/catalogos`, `/admin/configuracoes`, `/admin/manutencao`, `/admin/diagnostico`.
- Independentes: `/admin/conhecimento` e `/admin/ativos`.

## Consultas e endpoints preservados

- Chamados e ações: `/api/chamados/*`.
- Usuários e perfis: `/api/usuarios/*`.
- Equipes: `/api/teams/*`.
- Permissões: `/api/permissoes/*`.
- Indicadores e relatórios: `/api/dashboard`, `/api/chamados/relatorios/*`, `/api/performance/*`.
- Ativos: `/api/assets/*`.
- Configurações, manutenção e diagnóstico mantêm endpoints próprios.

## Permissões existentes

- Dashboard, relatórios, exportação, patrimônio, ativos, chamados, aceite, delegação,
  prioridade, encerramento, usuários, configurações e base possuem permissões explícitas.
- Diagnóstico continua exclusivo do perfil `desenvolvedor` no backend.
- A refatoração não altera contratos nem concede permissões novas.

## Duplicações identificadas

- Metadados e condicionais de menu dispersos no `AdminPanel`.
- Quatro destinos para perspectivas do mesmo conjunto de chamados.
- Três destinos e uma subtela para pessoas/equipes/acessos.
- Três destinos analíticos sem um agrupamento de navegação.
- Cabeçalhos e breadcrumbs locais inconsistentes.

## Plano seguro

1. Centralizar configuração do menu e URLs canônicas.
2. Adicionar layout compartilhado de workspace, breadcrumbs e abas acessíveis.
3. Reutilizar as telas existentes como painéis internos, preservando ações e API.
4. Manter aliases das rotas antigas e normalizá-los para as novas URLs.
5. Reduzir desktop e mobile às sete áreas solicitadas.
6. Validar vínculos JSX, build, backend, deep links e saúde dos serviços.

## Riscos controlados

- Não remover módulos antigos durante a migração.
- Não alterar banco ou backend sem necessidade.
- Não unificar estados de domínios diferentes.
- Não permitir que agrupamento visual substitua validação RBAC.
