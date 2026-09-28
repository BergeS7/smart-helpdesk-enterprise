# Operação e implantação

## HTTPS

Informe no `.env` os caminhos absolutos do certificado e da chave:

```env
TLS_CERT_PATH=C:/certificados/fullchain.pem
TLS_KEY_PATH=C:/certificados/privkey.pem
HTTPS_PORT=443
HTTP_REDIRECT_PORT=80
ALLOWED_ORIGINS=https://helpdesk.seudominio.com.br
```

Inicie com `docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build`.
O certificado deve ser emitido para o domínio real por uma autoridade confiável. O sistema não cria certificado falso de produção.

## Backup

Execute `powershell -File scripts/backup.ps1`. O comando salva banco, anexos e hashes SHA-256 em `backups/`, com retenção padrão de 14 dias.

Para agendar diariamente às 02:00 no usuário do Docker Desktop, execute `powershell -File scripts/install-backup-task.ps1`. Em um servidor Windows elevado, acrescente `-System`.

Para restaurar, execute `powershell -File scripts/restore.ps1 -DatabaseBackup CAMINHO.dump -UploadsBackup CAMINHO.tar.gz`. A restauração exige confirmação explícita.

## Alertas

Defina `ALERT_WEBHOOK_URL` para receber alertas de banco, Redis, agentes atrasados e respostas 5xx. O envio ocorre na mudança do problema e tem repetição máxima a cada 30 minutos.

## E-mail

Com `RESEND_API_KEY` definida, os e-mails saem pela API HTTPS do Resend. Use essa opção em hospedagens que bloqueiam as portas SMTP, como o plano gratuito do Render:

```env
RESEND_API_KEY=re_sua_chave
EMAIL_FROM=Smart HelpDesk <nao-responda@seudominio.com.br>
APP_URL=https://endereco-do-portal
```

O domínio de `EMAIL_FROM` precisa estar verificado no Resend. Sem a chave, o envio usa as variáveis `SMTP_*`. `APP_URL` é o endereço do portal usado nos links dos e-mails; sem ela vale a primeira origem de `ALLOWED_ORIGINS`.

## Administração da plataforma

O diagnóstico do sistema, os avisos de manutenção e as versões do agente são da plataforma, não de uma empresa. Só a conta cujo e-mail está em `PLATFORM_OWNER_EMAIL` (e já confirmado) tem esse acesso; o admin de cada empresa não vê essas funções:

```env
PLATFORM_OWNER_EMAIL=dono@seudominio.com.br
```

Sem a variável, ninguém tem acesso de plataforma. Essa conta não pode ser alterada nem excluída por admins das empresas, e o e-mail dela não pode ser usado em outro cadastro.

## Isolamento entre empresas

Os dados de cada empresa são separados pelo próprio PostgreSQL (Row Level Security). Em toda requisição de um usuário logado, a conexão assume o papel `helpdesk_empresa` e grava a empresa em `app.empresa_id`; o banco só mostra e só aceita linhas dessa empresa. Login, rotas públicas, o agente antes de se identificar, rotinas agendadas e migrations rodam como o usuário dono do banco.

O usuário configurado em `DB_USER`/`DATABASE_URL` precisa poder criar o papel `helpdesk_empresa` e assumi-lo (a migration faz `GRANT helpdesk_empresa` para ele).

Ao criar uma tabela nova com dados de empresa, a migration precisa incluir `empresa_id`, ligar a RLS e criar a política `isolamento_empresa` (veja `backend/migrations/1791000000000_isolamento_por_empresa.js`). Sem RLS ligada, todas as empresas enxergam todas as linhas da tabela.
