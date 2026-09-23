# Smart HelpDesk Agent

## Instalador de arquivo único

`powershell -File agent\Build-Agent.ps1` gera `output\Instalar-SmartHelpDesk-<versão>.exe`. É um único
arquivo com o logo do SmartHelpDesk: ele já traz os scripts do agente, a chave pública de atualização
e o endereço da API (`-ServerUrl`, padrão `https://smart-helpdesk-backend-dp5r.onrender.com/api/assets`).

1. No painel, **Ativos → Gerar convite do agente** mostra o código de uso único (vale 2 horas).
2. No computador, abra o instalador e aceite o pedido de administrador.
3. Cole o código (o comando inteiro copiado do painel também funciona), confirme a unidade e o aviso
   de privacidade e clique em **Cadastrar computador**.
4. Ao terminar, o ícone do SmartHelpDesk fica perto do relógio (o Windows pode escondê-lo na seta ^).

O assistente grava os arquivos em `C:\Program Files\SmartHelpDeskAgent` antes de executar
`SmartHelpDeskAgent.ps1 -Install`, e só informa sucesso depois que o cadastro e o primeiro
diagnóstico forem confirmados pelo servidor. O endereço da API é o do Render, não o da Vercel.

Instalação manual, sem assistente (PowerShell como administrador, na pasta `agent`):

```powershell
.\SmartHelpDeskAgent.ps1 -ServerUrl "https://smart-helpdesk-backend-dp5r.onrender.com/api/assets" -EnrollmentKey "CONVITE_TEMPORARIO" -Municipio "MUNICIPIO_CONFIRMADO" -Unidade "UNIDADE_CONFIRMADA" -Latitude LATITUDE_CONFIRMADA -Longitude LONGITUDE_CONFIRMADA -Install
```

O agente coleta inventário técnico estruturado e métricas, registra um token exclusivo em
`C:\ProgramData\SmartHelpDeskAgent\agent.json` e envia um diagnóstico diariamente às 15h,
na inicialização do Windows, sem abrir janela do PowerShell. Se o computador estiver desligado nesse horário, a tarefa
será executada assim que o Windows voltar a disponibilizá-la.

O agente exige HTTPS em produção. Durante os testes, o instalador aceita HTTP somente em endereços privados (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x` ou localhost), exibe um alerta explícito e preserva `-AllowInsecureHttp` na tarefa agendada.


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
administradores/SYSTEM). Para recompilar e gerar o instalador: `powershell -File agent\Build-Agent.ps1`
(requer .NET Framework 4.x, já presente no Windows).

## Atualização automática assinada (2.2.0)

A partir da 2.2.0, após cada coleta o agente consulta `GET /agent/update`. Havendo versão maior,
baixa o pacote e **só instala se a assinatura RSA conferir** com `update-public-key.xml`, instalado em
`C:\Program Files\SmartHelpDeskAgent`. A chave privada fica apenas com a TI; o servidor guarda o pacote,
mas não consegue assinar. Pacote adulterado é descartado (`update REJECTED` no log). Se a versão nova não
carregar, o agente restaura a anterior (`update ROLLBACK`) e não tenta a mesma versão de novo.

Configuração, uma vez só:

1. `powershell -File agent\Nova-ChaveAtualizacao.ps1` gera a chave privada em
   `%USERPROFILE%\SmartHelpDesk-Chave-Atualizacao\` e `agent\update-public-key.xml`. Faça backup da
   chave privada fora do computador; nunca a coloque no Git nem no servidor.
2. `powershell -File agent\Build-Agent.ps1` e reinstale os agentes com esse pacote. Agentes 2.1.0 ou
   anteriores não se atualizam sozinhos.

Para cada versão nova:

1. Aumente `$AgentVersion` em `SmartHelpDeskAgent.ps1`.
2. `powershell -File agent\Publicar-Atualizacao.ps1` compila, empacota e assina, gerando
   `output\SmartHelpDesk-Agent-<versão>.update.json`.
3. No painel, abra **Ativos → Atualizações do agente** e envie o arquivo. Cada computador instala na
   próxima coleta; o ícone da bandeja mostra a versão nova após o próximo login.

**Revogar** interrompe a distribuição; quem já atualizou permanece na versão. Para corrigir, publique
uma versão com número maior. Se a chave privada vazar, gere outra com `-Substituir` e reinstale os agentes.

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
