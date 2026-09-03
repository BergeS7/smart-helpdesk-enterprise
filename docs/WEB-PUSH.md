# Notificações push

Em Meu perfil → Notificações, use **Ativar notificações** e autorize no aparelho.
**Enviar teste** envia somente para a conta autenticada e o aparelho atual.
No iPhone/iPad, é necessário iOS/iPadOS 16.4+ e abrir o webapp adicionado à Tela de Início.

Os eventos de chamados que já geram notificações internas agora também enviam push:
criação/atribuição, respostas, mudanças de status, conclusão e alertas de SLA.
Novos chamados de atendimento sem responsável enviam **Novo chamado na fila** a
todos os técnicos, supervisores, administradores e desenvolvedores ativos, conforme
o acesso compartilhado da fila atual. O mesmo evento gera o aviso interno e o push
nos aparelhos autorizados desses destinatários. Chamados já atribuídos não geram
esse alerta coletivo de fila.
A geração dos alertas de SLA continua no fluxo existente de consulta de chamados;
esta alteração não adiciona um agendador de SLA independente.
As notificações do módulo Desenvolvimento continuam internas.

O service worker recebe push mesmo sem uma janela aberta. O sistema operacional,
as permissões, a conexão e as configurações de foco/economia de bateria controlam
a apresentação e o momento da entrega. A confirmação do envio não comprova a exibição.
Toques em alertas de chamados abrem o chamado após a autenticação, respeitando a conta
destinatária e a autorização da API.

## Persistência e implantação

- `web_push_subscriptions` guarda endpoints e chaves públicas de cada aparelho,
  vinculados ao usuário e à versão de sua sessão. Contas inativas ou sessões revogadas
  não recebem novos envios. Sair encerra a inscrição local; endpoints expirados são
  removidos após respostas 404/410 do provedor.
- `web_push_keys` guarda um único par VAPID persistente, criado automaticamente no
  primeiro acesso autenticado à configuração. A chave privada nunca vai ao frontend,
  aos logs ou ao Git. Preserve esta tabela nos backups para manter as inscrições.
- As duas tabelas têm RLS habilitado e não concedem acesso a PUBLIC, anon ou authenticated.
  A API usa sua conexão PostgreSQL privada. Não conceda acesso público a essas tabelas.
- A migration cria as tabelas no servidor tradicional. No ambiente serverless, a
  inicialização idempotente usa uma transação com lock antes do primeiro uso do push.
  O usuário PostgreSQL da API precisa de permissão para criar as tabelas ou elas devem
  ser criadas previamente pela migration sob o mesmo proprietário.
- `VAPID_SUBJECT` é opcional: configure um `mailto:` de suporte ou URL HTTPS institucional.
  O padrão é a URL pública do repositório. Nenhuma conta Firebase ou certificado Apple
  adicional é necessário.
- Os envios são aguardados pelo evento HTTP, com limite de 5 segundos por provedor.
  Uma falha push não desfaz a notificação interna nem a operação do chamado.
  Não há fila de retentativas para falhas transitórias nesta versão.

## Validação

Os testes cobrem permissão concedida/negada, inscrição, destinos permitidos, isolamento
de contas, remoção de endpoints expirados, exibição pelo worker e abertura do chamado.
Para validar entrega real: ative no aparelho, envie o teste e depois gere uma resposta
em um chamado autorizado enquanto o destinatário estiver com o app fechado.
