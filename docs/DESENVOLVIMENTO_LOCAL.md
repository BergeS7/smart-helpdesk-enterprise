# Desenvolvimento local

Backend e frontend rodam direto no Node (com recarga automática); só PostgreSQL e Redis ficam no Docker.

## Requisitos

- Node.js 22 ou mais novo (o CI usa 22);
- Docker Desktop funcionando (no Windows, exige o WSL 2: `wsl --install` como administrador e reiniciar).

## Primeira vez

```bash
npm install
npm run install:all
copy backend\.env.example backend\.env
copy backend\.env.test.example backend\.env.test
```

Em `backend/.env`, troque `JWT_SECRET` por um valor gerado:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Para ativar o hook de pré-commit (typecheck, testes e build do que foi alterado):

```bash
git config core.hooksPath .githooks
```

## Dia a dia

```bash
npm run dev:infra   # sobe PostgreSQL (5432), PostgreSQL de testes (5433) e Redis (6379)
npm run dev         # backend em http://localhost:3001 e frontend em http://localhost:5173
```

O backend aplica as migrations ao iniciar. Sem usuários no banco, a tela de login oferece criar o primeiro administrador.
Para ter acesso às funções de plataforma, informe o mesmo e-mail em `PLATFORM_OWNER_EMAIL`.

Para parar a infraestrutura sem perder dados: `npm run dev:infra:down`.
Para zerar o banco local: `docker compose -f docker-compose.dev.yml down -v` (apaga os dados de desenvolvimento).

## Testes

```bash
npm test                                 # unitários do backend e do frontend
npm run test:integracao --prefix backend # contra o PostgreSQL de testes (porta 5433)
npm run test:e2e --prefix frontend       # Playwright; na primeira vez: npx playwright install chromium
```

O banco de testes não tem volume: recriar o container (`docker compose -f docker-compose.dev.yml up -d --force-recreate database-test`) devolve um banco limpo.
