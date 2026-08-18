# Manual operacional — Smart HelpDesk

Última revisão técnica: 18/08/2026.

## 1. Escopo e responsáveis

Este documento cobre instalação, atualização, backup, restauração, segredos, agente de diagnóstico, recuperação e migração para HTTPS. Somente administradores autorizados devem acessar `.env`, backups, volumes Docker ou o host.

Políticas de privacidade, retenção, incidentes e aviso de monitoramento ficam em `docs/legal`. Este manual não substitui validação jurídica das políticas.

Nunca envie `.env`, senha PostgreSQL, `JWT_SECRET`, token de agente ou backup por chat, e-mail comum ou chamado.

## 2. Arquitetura atual

| Serviço | Contêiner | Exposição |
|---|---|---|
| Portal React/Nginx | `smart-helpdesk-frontend` | `http://HOST:8090` |
| API Node.js | `smart-helpdesk-backend` | somente rede Docker, via `/api` no Nginx |
| PostgreSQL 16 | `smart-helpdesk-database` | somente rede Docker |

Volumes persistentes:

- `smart-helpdesk-postgres-data`: banco;
- `smart-helpdesk-uploads`: anexos, logos e fotos.

## 3. Instalação inicial

1. Instale Docker Desktop e confirme que o Compose funciona.
2. Copie `.env.docker.example` para `.env`.
3. Gere valores novos e fortes para `POSTGRES_PASSWORD` e `JWT_SECRET`.
4. Em teste local, configure `ALLOWED_ORIGINS=http://192.168.10.54:8090` e outras origens realmente necessárias, separadas por vírgula.
5. Execute `docker compose up -d --build`.
6. Confira `docker compose ps`; os três serviços devem aparecer como `healthy`.
7. Abra `http://192.168.10.54:8090`.

Os scripts de `docker/postgres/init` só executam na criação de um volume vazio. Em banco existente, aplique as migrations de `database/migrations` de forma controlada e com backup anterior.

## 4. Atualização segura

1. Comunique a janela de manutenção.
2. Faça backup do banco e dos uploads.
3. Registre a imagem/versão atualmente implantada.
4. Leia as migrations novas e confirme que são compatíveis com o banco atual.
5. Aplique as migrations em ordem cronológica.
6. Execute testes do backend e build do frontend.
7. Publique com `docker compose up -d --build backend frontend`.
8. Valide saúde, login, abertura de chamado, Kanban, histórico e relatórios.
9. Observe `docker compose logs --tail 100 backend`.

Não use `docker compose down -v` para atualizar. O parâmetro `-v` remove os volumes e apaga os dados persistidos.

## 5. Backup

Crie uma pasta protegida fora do diretório público do sistema. Exemplo PowerShell, executado na raiz do projeto:

```powershell
docker exec smart-helpdesk-database sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/smart-helpdesk.dump'
docker cp smart-helpdesk-database:/tmp/smart-helpdesk.dump C:\Backups\SmartHelpDesk\smart-helpdesk-AAAA-MM-DD.dump
docker run --rm -v smart-helpdesk-uploads:/source:ro -v "C:\Backups\SmartHelpDesk:/backup" alpine tar -czf /backup/uploads-AAAA-MM-DD.tar.gz -C /source .
```

Após o backup:

- confirme que os dois arquivos existem e têm tamanho maior que zero;
- calcule e registre um hash SHA-256;
- criptografe o armazenamento;
- mantenha ao menos uma cópia fora do host;
- teste restauração periodicamente;
- aplique a política de retenção e descarte seguro.

Um backup não testado não deve ser considerado recuperável.

## 6. Restauração

Restauração substitui estado e exige janela aprovada. Nunca restaure diretamente sobre produção sem preservar um backup do estado atual.

1. Suba um PostgreSQL isolado de teste.
2. Copie o `.dump` para o contêiner.
3. Restaure com `pg_restore --clean --if-exists --no-owner` no banco de destino.
4. Restaure o arquivo de uploads no volume correspondente.
5. Suba backend e frontend.
6. Valide contagens de usuários, chamados, avaliações e anexos.
7. Teste login e download de um anexo autorizado.
8. Somente depois aprove a restauração no ambiente principal.

Se a restauração falhar, preserve logs e arquivos; não repita comandos destrutivos sem entender a causa.

## 7. Rotação de segredos

### JWT

1. Gere um segredo aleatório com no mínimo 32 bytes.
2. Atualize `JWT_SECRET` no `.env` sem exibi-lo em terminal compartilhado.
3. Recrie o backend: `docker compose up -d --force-recreate backend`.
4. Confirme `/api/health` e faça novo login.

A troca invalida todas as sessões existentes. Isso é esperado.

### PostgreSQL

1. Faça e teste backup.
2. Defina uma senha nova e forte no PostgreSQL usando uma sessão administrativa segura.
3. Atualize `POSTGRES_PASSWORD` no `.env` imediatamente na mesma janela.
4. Recrie database e backend de forma coordenada.
5. Confirme conexão e saúde.
6. Revogue e descarte a senha anterior.

Não altere apenas o `.env`: em volume existente, isso não muda automaticamente a senha gravada no PostgreSQL.

## 8. Agente de diagnóstico

Pacote atual: `SmartHelpDesk-Agent-v6-Teste-HTTP.zip`.

Fluxo:

1. No Monitoramento de Ativos, clique em **Gerar convite do agente**.
2. Envie o ZIP e o convite por canal corporativo controlado.
3. O colaborador extrai a pasta completa e executa `Instalar Smart HelpDesk.vbs` como administrador.
4. Em laboratório local, use `http://192.168.10.54:8090/api/assets`.
5. Confirme o alerta de HTTP apenas dentro da rede privada.
6. Selecione a unidade e aceite o aviso de monitoramento.
7. O instalador só confirma sucesso depois do cadastro e do primeiro diagnóstico.

Arquivos no computador:

- configuração: `C:\ProgramData\SmartHelpDeskAgent\agent.json`;
- log: `C:\ProgramData\SmartHelpDeskAgent\agent.log`;
- tarefa: `SmartHelpDesk Agent`.

A tarefa executa na inicialização e diariamente às 15h. O estado permanece até novo diagnóstico ou atualização técnica. O histórico armazena no máximo uma amostra automática por ativo por dia.

## 9. Diagnóstico de falhas

| Sintoma | Verificação |
|---|---|
| Portal não abre | `docker compose ps`, porta 8090 e firewall do host |
| Origem não autorizada | conferir esquema, host e porta exatos em `ALLOWED_ORIGINS` |
| Backend não saudável | `docker compose logs --tail 100 backend` |
| Banco não saudável | `docker compose logs --tail 100 database` e espaço em disco |
| Agente não aparece | convite válido, URL `/api/assets`, acesso à porta 8090 e `agent.log` |
| Agente funcionou só uma vez | tarefa `SmartHelpDesk Agent`, argumentos e execução como `SYSTEM` |
| Alteração visual não aparece | recarregamento forçado do navegador e nome do bundle servido |
| Relatório diverge | confirmar os mesmos filtros e a metodologia da coorte por criação |

## 10. Migração de HTTP para HTTPS

Antes de expor o sistema fora da rede de testes:

- possuir domínio sob controle da empresa;
- configurar DNS para o proxy publicado;
- instalar certificado TLS válido e renovação automática;
- redirecionar HTTP para HTTPS;
- definir `ALLOWED_ORIGINS` somente com origens HTTPS oficiais;
- encaminhar `Host`, `X-Forwarded-For` e `X-Forwarded-Proto`;
- impedir exposição direta do PostgreSQL e do backend;
- gerar novo pacote/configuração do agente apontando para HTTPS;
- remover a permissão de HTTP dos computadores;
- executar varredura de segurança e teste de restauração antes da abertura externa.

## 11. Recuperação e rollback

1. Interrompa novas alterações e registre horário/sintoma.
2. Preserve logs e faça backup do estado atual.
3. Se apenas código falhou, volte para a imagem anterior sem remover volumes.
4. Se a migration falhou, use o rollback documentado ou restaure em ambiente isolado.
5. Se houver suspeita de credencial exposta, rotacione PostgreSQL, JWT e convites do agente.
6. Valide integridade antes de liberar usuários.
7. Registre causa, impacto, ações e prevenção.

Nunca use `docker compose down -v`, `git reset --hard` ou exclusão manual de volumes como procedimento comum de recuperação.

## 12. Checklist diário e mensal

Diário:

- três serviços saudáveis;
- ausência de erros repetidos nos logs;
- espaço em disco suficiente;
- chamados e diagnósticos recentes chegando.

Mensal:

- restauração de teste;
- revisão de usuários, perfis e permissões;
- revisão de convites de agente e dispositivos obsoletos;
- atualização de dependências e correções de segurança;
- revisão de retenção, incidentes e acessos administrativos.
