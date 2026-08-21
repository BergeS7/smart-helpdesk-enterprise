# Inventário automatizado e histórico de ativos

## Arquitetura entregue

O agente Windows coleta um snapshot técnico versionado (`schemaVersion: 1`) por CIM/WMI e cmdlets nativos. Cada instalação possui token próprio, armazenado com ACL restrita; o servidor mantém apenas o SHA-256. O envio autenticado para `POST /api/assets/agent/report` é idempotente por `(ativo_id, report_id)`. O backend preserva o JSON bruto, atualiza o resumo consultável, registra apenas alterações da lista branca e mantém alertas ativos.

Não são coletados arquivos pessoais, conteúdo de documentos, histórico de navegação, senhas, teclas, áudio, câmera, geolocalização em tempo real ou conteúdo de e-mails. Município e unidade são metadados administrativos definidos na instalação.

## Banco e implantação

Em instalações existentes, aplique `database/migrations/20260820_asset_inventory_history.sql` ou reinicie a API, que executa a mesma evolução idempotente. Configure opcionalmente `ASSET_LOW_DISK_PERCENT=10`. Depois, reconstrua os serviços:

```powershell
docker compose up -d --build
```

Rollback somente após backup: remova `ativo_alertas`, `ativo_alteracoes`, `ativo_snapshots` e, por último, as novas colunas `inventory_json`, `schema_version`, `ultimo_inventario`, `fabricante`, `modelo`, `os_build`, `ram_total_bytes`, `storage_total_bytes` e `storage_free_bytes`. O rollback elimina o histórico coletado.

## Instalação e operação do agente

Gere no painel um convite temporário e execute como administrador:

```powershell
.\SmartHelpDeskAgent.ps1 -ServerUrl "https://helpdesk.empresa.com/api/assets" -EnrollmentKey "CONVITE" -Municipio "Santa Inês" -Unidade "Maranhão Motos - Santa Inês" -Latitude -3.6667 -Longitude -45.38 -Install
```

O script cria a tarefa `SmartHelpDesk Agent`, executada na inicialização e diariamente às 15h, com limite de dez minutos e reinício controlado. Cada categoria é isolada: falta de permissão em TPM, Defender ou BitLocker gera `PARTIAL`, sem invalidar o restante. O HTTP possui timeout de 60 segundos e três tentativas com espera de 2, 5 e 10 segundos. Logs ficam em `C:\ProgramData\SmartHelpDeskAgent\agent.log`, sem token.

Para forçar uma coleta, execute a tarefa pelo Agendador ou:

```powershell
Start-ScheduledTask -TaskName "SmartHelpDesk Agent"
```

## Endpoints e perfis

- Agente: `POST /agent/enroll`, `POST /agent/report` e compatibilidade em `POST /agent/heartbeat`.
- Usuários autenticados: lista, detalhe, inventário atual, histórico, alterações, snapshots e alertas.
- Administradores: convites, unidades e alterações administrativas. O agente não reutiliza JWT de usuário.

Ativos antigos continuam visíveis e exibem “Inventário automático ainda não recebido”. Comunicação é “recente” até 30 horas, “atenção” até 72 horas e “sem comunicação” depois disso. A primeira coleta forma o baseline; somente coletas posteriores geram alterações.

## Validação e evolução

O domínio possui testes para primeira coleta, ausência de mudança, RAM, disco, build do Windows, IP, MAC, hostname, payload parcial, alertas e idempotência. Rode `npm test --prefix backend`, `npm run check --prefix backend` e `npm run build --prefix frontend`.

Para evoluir o payload, acrescente campos sem alterar os atuais e incremente `schemaVersion`. Só inclua uma nova mudança automática em `backend/src/domain/assetInventory.js` depois de definir categoria, severidade e impacto; isso evita ruído de ordem, timestamps e campos voláteis.
