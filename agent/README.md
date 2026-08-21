# Smart HelpDesk Agent

Distribua a pasta `agent` por canal corporativo controlado e peça ao colaborador para abrir **Instalar Smart HelpDesk.vbs**.
Antes da instalação, um administrador deve gerar um convite temporário e de uso único em `POST /api/assets/admin/invites`.
O instalador solicita a URL HTTPS e o convite; nenhum segredo global fica incluído no pacote.

```powershell
.\SmartHelpDeskAgent.ps1 -ServerUrl "https://helpdesk.empresa.com/api/assets" -EnrollmentKey "CONVITE_TEMPORARIO" -Municipio "Santa Inês" -Unidade "Unidade Santa Inês" -Latitude -3.6667 -Longitude -45.38 -Install
```

O agente 2.0 coleta inventário técnico estruturado e métricas, registra um token exclusivo em
`C:\ProgramData\SmartHelpDeskAgent\agent.json` e envia um diagnóstico diariamente às 15h,
sem abrir uma janela do PowerShell. Se o computador estiver desligado nesse horário, a tarefa
será executada assim que o Windows voltar a disponibilizá-la.

O agente exige HTTPS em produção. Durante os testes, o instalador aceita HTTP somente em endereços privados (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x` ou localhost), exibe um alerta explícito e preserva `-AllowInsecureHttp` na tarefa agendada.

Para o ambiente atual, envie ao colaborador a pasta `agent` completa (ou o ZIP gerado), peça para extrair e executar `Instalar Smart HelpDesk.vbs`. No painel de Monitoramento de Ativos, use **Gerar convite do agente** e envie o código de uso único separadamente. A instalação só informa sucesso depois que o cadastro e o primeiro diagnóstico forem confirmados pelo servidor.

Diagnóstico e suporte:

- tarefa do Windows: `SmartHelpDesk Agent`, executada na inicialização e diariamente às 15h;
- configuração/token individual: `C:\ProgramData\SmartHelpDeskAgent\agent.json`;
- log de sucesso ou falha: `C:\ProgramData\SmartHelpDeskAgent\agent.log`;
- o estado atual permanece no sistema até novo diagnóstico ou atualização manual do técnico;
- cada execução cria um snapshot idempotente e o backend registra apenas mudanças relevantes;
- detalhes de arquitetura, privacidade e rollback estão em `docs/INVENTARIO_ATIVOS.md`.
