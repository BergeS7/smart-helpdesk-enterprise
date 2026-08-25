# Smart Helpdesk - Checklist de produção

## Executar

npm install
npm run install:all
npm run dev

## Próximas etapas comerciais

- configurar domínio e HTTPS;
- configurar backup do banco;
- ativar monitoramento;
- criar pipeline CI/CD;
- executar testes automatizados;
- publicar em servidor/cloud.

## Segurança

- nunca versionar arquivos .env;
- usar senhas fortes no banco;
- trocar JWT_SECRET em produção.

## Fotos de perfil no Supabase Storage

O backend requer `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` para acessar o
bucket privado `avatars`. Configure as duas variáveis somente no ambiente do
backend (por exemplo, Render ou Docker). A service role nunca deve ser criada
como variável `VITE_*` nem configurada no frontend/Vercel.

Antes do deploy, execute a migration
`database/migrations/20260825_supabase_avatars.sql` no PostgreSQL/Supabase.
