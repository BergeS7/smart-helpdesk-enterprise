# Smart HelpDesk Agent

Distribua a pasta `agent` por canal corporativo controlado e peça ao colaborador para abrir **Instalar Smart HelpDesk.vbs**.
Antes da instalação, um administrador deve gerar um convite temporário e de uso único em `POST /api/assets/admin/invites`.
O instalador solicita a URL HTTPS e o convite; nenhum segredo global fica incluído no pacote.

Para a aplicação `https://smart-helpdesk-enterprise.vercel.app/`, a URL do agente é:

```text
https://smart-helpdesk-backend-dp5r.onrender.com/api/assets
```

A interface está na Vercel, mas a API está no Render. Não use o endereço da
Vercel no instalador. Também é possível copiar o parâmetro `-ServerUrl` do
comando em **Ativos → Gerar convite do agente**, após publicar o frontend corrigido.

```powershell
.\SmartHelpDeskAgent.ps1 -ServerUrl "https://smart-helpdesk-backend-dp5r.onrender.com/api/assets" -EnrollmentKey "CONVITE_TEMPORARIO" -Municipio "MUNICIPIO_CONFIRMADO" -Unidade "UNIDADE_CONFIRMADA" -Latitude LATITUDE_CONFIRMADA -Longitude LONGITUDE_CONFIRMADA -Install
```

O agente 2.1.0 coleta inventário técnico estruturado e métricas, registra um token exclusivo em
`C:\ProgramData\SmartHelpDeskAgent\agent.json` e envia um diagnóstico diariamente às 15h,
na inicialização do Windows, sem abrir janela do PowerShell. Se o computador estiver desligado nesse horário, a tarefa
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

## Ícone na bandeja (2.1.0)

O pacote inclui `SmartHelpDeskTray.exe`. Ele mostra o ícone do SmartHelpDesk perto do relógio com:
status do último envio, data do último envio, **Enviar diagnóstico agora**, **Abrir SmartHelpDesk**
e **Detalhes do agente**. O ícone inicia com o Windows (atalho em Inicializar de todos os usuários) e
apenas lê `C:\ProgramData\SmartHelpDeskAgent\status.json`; ele nunca lê o token. A coleta continua na
tarefa `SmartHelpDesk Agent` (conta SYSTEM), que executa `SmartHelpDeskTray.exe --collect` sem janela.
O ícone só aparece depois que o cadastro é confirmado pelo servidor e abre automaticamente ao final da instalação; abrir o `.exe` do pacote apenas inicia a instalação. Fechar o ícone não interrompe a coleta. O status reflete o último envio, não conexão em tempo real.

O instalador copia os arquivos para `C:\Program Files\SmartHelpDeskAgent` (gravável somente por
administradores/SYSTEM). Para recompilar e gerar o ZIP: `powershell -File agent\Build-Agent.ps1`
(requer .NET Framework 4.x, já presente no Windows).

## Atualização da versão 2.0

Publicar o backend corrigido para que os relatórios atualizem as métricas do painel.
Depois, gerar um novo convite para cada máquina e executar o instalador atualizado
como administrador. A reinstalação substitui o script da tarefa agendada e respeita
o servidor informado. O convite é de uso único; não é a URL nem o token salvo.

Sem reinstalar o agente, a versão 2.0 continua enviando CPU fixa em zero.
A partir da 2.0.1 o agente coleta a CPU e representa falhas de coleta como desconhecidas.
As métricas são fotografias do momento da coleta, não monitoramento em tempo real.
Para antecipar a coleta de uma máquina já configurada, execute a tarefa
**SmartHelpDesk Agent** pelo Agendador de Tarefas do Windows.
