# Resumo da refatoração da navegação

## Arquivos criados

- `docs/navigation-refactor-diagnostic.md`
- `frontend/src/app/navigation/adminNavigation.ts`
- `frontend/src/app/components/WorkspaceNavigation.tsx`
- `frontend/src/app/components/TicketWorkspaceToolbar.tsx`
- `frontend/src/app/modules/indicadores/IndicatorsWorkspace.tsx`

## Arquivos modificados

- `frontend/src/app/App.tsx`
- `frontend/src/app/routes/useModuleRoute.ts`
- `frontend/src/app/modules/usuarios/UsersModule.tsx`
- `frontend/src/app/modules/fila/FilaChamadosView.tsx`
- `frontend/src/app/pages/Settings/SettingsWorkspace.tsx`

## Arquivos removidos

- Nenhum. A migração foi incremental e preservou os módulos existentes.

## Nova árvore principal

```text
/admin
├── atendimento
│   ├── fila
│   ├── meu-trabalho
│   ├── todos
│   └── historico
├── equipe
│   ├── pessoas
│   ├── carga
│   ├── grupos
│   └── acessos
├── indicadores
│   ├── operacao
│   ├── sla
│   ├── tecnicos
│   ├── satisfacao
│   ├── ativos
│   └── exportacoes
├── conhecimento
├── ativos/equipamentos
└── configuracoes
    ├── sistema
    ├── sla
    ├── catalogos
    ├── integracoes
    ├── manutencao
    └── diagnostico
```

## Compatibilidade

As rotas antigas de Fila, Kanban, Chamados, Histórico, Técnicos, Usuários,
Equipes, Satisfação, Relatórios, Ativos, Catálogos, Ajustes, Manutenção e
Diagnóstico são reconhecidas e normalizadas para a URL canônica após a
autenticação.

## Componentes compartilhados

- `WorkspaceNavigation`: breadcrumbs e abas acessíveis por área.
- `TicketWorkspaceToolbar`: pesquisa, prioridade, status, atualização e limpeza.
- `adminNavigation`: fonte única do menu, áreas, permissões, abas e URLs.
- O polling de chamados saiu da Fila e passou ao workspace administrativo.

## Backend e banco

- Nenhuma alteração de endpoint.
- Nenhuma alteração de contrato.
- Nenhuma migração de banco.
- RBAC existente foi preservado; Diagnóstico continua exclusivo do desenvolvedor.

## Testes realizados

- Verificação automática de vínculos JSX em todo o frontend.
- Build Vite de produção.
- 16 testes de backend.
- Todas as novas rotas e rotas legadas responderam HTTP 200.
- Deep link com filtros respondeu HTTP 200.
- API e banco operacionais.
- Contêineres frontend, backend e database saudáveis.
- Nenhum novo erro de frontend registrado após a publicação.

## Pendências deliberadas

- O detalhe compartilhado do chamado foi preservado; convertê-lo em drawer
  lateral exige uma migração visual própria para não contrariar decisões
  anteriores sobre a tela do chamado.
- Base de Conhecimento e Ativos permanecem independentes, mas suas futuras abas
  editoriais e técnicas ainda devem ser extraídas dos módulos atuais.
- Testes automatizados de viewport e fluxos autenticados por perfil devem ser
  adicionados quando houver contas de teste/E2E próprias. A validação atual
  cobriu build, RBAC do backend, deep links e disponibilidade das rotas.
- O agente de ativos está degradado por não possuir coleta recente; não é uma
  regressão da navegação.
