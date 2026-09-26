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
