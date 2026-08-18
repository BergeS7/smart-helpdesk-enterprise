# Fase P0 — segurança crítica

## Estado e decisões

Esta fase introduz validação de configuração, sessão revogável, anexos privados, limitação de abuso, convite temporário para agentes, proteção de rotas de inventário, autorização histórica no servidor e respostas de erro sanitizadas.

Não declarar o sistema pronto para Internet somente por estas mudanças. TLS, rotação dos segredos existentes, aplicação da migration e revisão das vulnerabilidades transitivas continuam sendo pré-requisitos operacionais.

## Variáveis obrigatórias

- `POSTGRES_PASSWORD`: 16+ caracteres, sem valor padrão e com variedade de caracteres.
- `JWT_SECRET`: 32+ caracteres, aleatório e diferente dos exemplos.
- `ALLOWED_ORIGINS`: lista separada por vírgula contendo somente origens HTTPS autorizadas.
- `JWT_EXPIRES_IN`: recomenda-se duração curta para o access token.

Gerar segredos localmente sem imprimi-los em chats ou logs. Exemplo administrativo: `openssl rand -base64 48`.

## Implantação segura

1. Fazer backup consistente do PostgreSQL e do volume de uploads.
2. Testar restauração do backup em ambiente separado.
3. Aplicar `database/migrations/20260818_p0_security.sql` com usuário autorizado.
4. Rotacionar a senha do usuário PostgreSQL e atualizar `.env` de forma atômica.
5. Gerar novo `JWT_SECRET`; isso encerra as sessões anteriores.
6. Definir `ALLOWED_ORIGINS` com o domínio real.
7. Publicar atrás de reverse proxy TLS; encaminhar `Host`, `X-Forwarded-For` e `X-Forwarded-Proto`.
8. Reconstruir os containers e validar `/api/health`.
9. Executar os testes negativos descritos abaixo.

O backend recusa inicialização em produção com configuração insegura. Não contorne essa proteção.

## TLS

O terminador TLS deve usar certificado válido ou PKI corporativa distribuída aos computadores. Redirecionar HTTP para HTTPS no proxy externo e renovar certificados automaticamente. O agente recusa HTTP por padrão.

## Anexos

Anexos de chamados não são mais servidos por `/uploads/chamados`. O download usa endpoint autenticado e verifica acesso ao chamado. Links antigos públicos deixam de funcionar. Logos e fotos de perfil continuam públicas por necessidade visual; não devem conter material confidencial.

Antivírus de arquivos permanece como risco residual: a validação atual confirma assinatura básica, extensão e MIME, mas não substitui mecanismo antimalware/quarentena.

## Matriz P0 de autorização

| Ação | Solicitante | Técnico responsável | Outro técnico | Admin/Dev |
|---|---:|---:|---:|---:|
| Consultar próprio/atribuído | Sim | Sim | Conforme fila/histórico | Sim |
| Consultar histórico coletivo | Não | Sim | Sim, leitura | Sim |
| Alterar histórico de outro técnico | Não | Não | Não | Administrativo |
| Comentar/anexar após encerramento | Não | Não | Não | Não; reabrir antes |
| Avaliar encerrado | Somente próprio | Não | Não | Não |
| Baixar anexo | Conforme acesso ao chamado | Conforme acesso | Conforme leitura histórica | Sim |

## Testes negativos obrigatórios

- Inicialização com segredos padrão deve falhar.
- Origem não autorizada deve receber bloqueio CORS.
- Repetição de login/recuperação deve receber 429.
- Usuário inativo e token com versão antiga devem receber 401.
- Download de anexo sem token deve receber 401.
- Técnico não responsável não pode comentar, anexar, encerrar ou reabrir chamado alheio.
- Chamado encerrado não aceita comentário ou anexo sem reabertura.
- Rota de unidades sem convite válido deve receber 401.
- Resposta 5xx em produção não pode conter `detalhe`, SQL ou stack.

## Rollback

1. Restaurar a imagem anterior do backend e frontend.
2. Restaurar as variáveis anteriores somente em rede isolada; não reutilizar segredos comprometidos.
3. As colunas e a tabela adicionadas são compatíveis com a versão anterior e podem permanecer.
4. Se a remoção do schema for indispensável, usar apenas o bloco de rollback comentado na migration após backup e janela aprovada.
5. Links públicos de anexos não devem ser reativados como rollback; disponibilizar temporariamente por endpoint autenticado.

## Riscos residuais

- Ausência de antivírus/quarentena real para anexos.
- Access token ainda não possui refresh token rotativo; a versão no banco permite revogação imediata.
- Limitação de requisições usa memória local e deve migrar para Redis em múltiplas instâncias.
- Migrações ainda não possuem executor versionado; isso pertence à P1.
- O projeto ainda não possui repositório Git nem CI/CD; isso pertence à P2.
- Políticas LGPD exigem validação jurídica e implementação ampliada de retenção na P3.
