# Smart HelpDesk Profissional — Docker

Demandas de desenvolvimento, automações, melhorias e projetos são integradas ao chamado original. Consulte [docs/DESENVOLVIMENTO_E_PROJETOS.md](docs/DESENVOLVIMENTO_E_PROJETOS.md) para arquitetura, migration, API, fluxo e permissões.

O projeto está preparado para executar em três containers:

- **frontend**: React/Vite compilado e servido pelo Nginx;
- **backend**: Node.js/Express;
- **database**: PostgreSQL 16 com inicialização automática do schema.

## Requisitos

- Docker Desktop com Docker Compose;
- porta `8090` livre no host.

## Início rápido no Windows

1. Abra a pasta do projeto.
2. Execute `iniciar-docker.bat`.
3. Acesse `http://localhost:8090`.

Na primeira execução, o script cria o arquivo `.env` a partir de `.env.docker.example`. Troque `POSTGRES_PASSWORD` e `JWT_SECRET` antes de publicar o sistema.

## Início pelo terminal

No PowerShell ou terminal, dentro da pasta do projeto:

```bash
copy .env.docker.example .env
docker compose up -d --build
```

No Linux/macOS, use:

```bash
cp .env.docker.example .env
docker compose up -d --build
```

Acessos:

- sistema: `http://localhost:8090`;
- API e health check: `http://localhost:8090/api/health`;
- backend e PostgreSQL não são expostos diretamente pelo Compose atual.

## Comandos úteis

```bash
# Ver o estado dos serviços
docker compose ps

# Acompanhar os logs
docker compose logs -f

# Logs somente do backend
docker compose logs -f backend

# Reiniciar os serviços
docker compose restart

# Parar sem apagar dados
docker compose down

# Recompilar após alterações no código
docker compose up -d --build
```

## Persistência

O banco e os uploads ficam em volumes Docker:

- `smart-helpdesk-postgres-data`;
- `smart-helpdesk-uploads`.

`docker compose down` preserva os dados. Para apagar completamente banco e uploads:

```bash
docker compose down -v
```

Esse comando é destrutivo.

## Inicialização do banco

Os scripts em `docker/postgres/init` são executados automaticamente somente quando o volume do PostgreSQL é criado pela primeira vez. Em ambientes existentes, aplique as migrations de `database/migrations` após backup. Recriar volumes é permitido apenas para ambientes descartáveis e apaga banco e uploads.

## Manual operacional

Consulte [`docs/MANUAL_OPERACIONAL.md`](docs/MANUAL_OPERACIONAL.md) para atualização, backup, restauração, rotação de segredos, agente, HTTPS e recuperação.

## Produção

Antes de publicar:

1. defina senhas fortes em `.env`;
2. não envie o arquivo `.env` ao Git;
3. coloque HTTPS em um reverse proxy externo;
4. restrinja ou remova a exposição pública das portas `3001` e `5432` se não forem necessárias;
5. configure backups periódicos do volume PostgreSQL.

## Migration Teams Enterprise

Para ambientes que já possuem volume PostgreSQL, execute uma vez o arquivo `database/migrations/20260720_teams_enterprise.sql` antes de publicar o novo backend. Em volumes Docker novos, a migration equivalente é executada automaticamente durante a inicialização.
