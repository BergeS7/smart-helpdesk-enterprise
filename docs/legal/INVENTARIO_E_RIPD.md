# Inventário de Tratamento e Modelo Inicial de RIPD

## Operações

| Processo | Titulares | Dados | Finalidade | Acesso | Base a validar | Risco principal |
|---|---|---|---|---|---|---|
| Cadastro e autenticação | Colaboradores | Identificação, contato, credenciais, logs | Acesso e segurança | Usuário e administração | Contrato/legítimo interesse | Tomada de conta |
| Chamados | Colaboradores e pessoas citadas | Conteúdo, contato, anexos | Suporte e rastreabilidade | Solicitante e equipe autorizada | Contrato/legítimo interesse/exercício de direitos | Conteúdo excessivo ou sensível |
| Desempenho | Usuários e técnicos | Notas, comentários, indicadores | Qualidade operacional | Equipe e gestores autorizados | Legítimo interesse com balanceamento | Impacto laboral injusto |
| Auditoria | Usuários | Ação, autor, data | Segurança e responsabilização | Administração restrita | Legítimo interesse/obrigação | Monitoramento excessivo |
| Ativos | Usuários de equipamentos | Login Windows, IP, MAC e telemetria | Inventário e suporte | TI autorizada | Legítimo interesse com teste | Rastreamento laboral e vazamento |
| Comunicações | Usuários | E-mail e conteúdo de aviso | Recuperação e notificação | Sistema e operador SMTP | Contrato/legítimo interesse | Envio indevido |

## Avaliação inicial

Necessidade: a maior parte dos dados é coerente com suporte corporativo, mas campos livres e anexos permitem inserção excessiva. Telemetria deve permanecer limitada e não ser usada para produtividade individual sem nova avaliação.

Riscos relevantes: acesso indevido por permissão excessiva; tráfego HTTP; segredo de instalação compartilhado; sessão no armazenamento local; anexos maliciosos; retenção indefinida; detalhes internos em respostas de erro; dependência de mapas externos; inexistência de MFA.

Salvaguardas existentes: hash bcrypt, JWT com expiração, bloqueio de login, RBAC e permissões, limites e tipos de upload, trilha de auditoria, token individual do agente com hash, coleta diária limitada e retenção de métricas em 90 dias.

Plano prioritário: (1) HTTPS; (2) trocar todos os segredos atuais; (3) MFA administrativo; (4) antimalware de anexos; (5) revisar mensagens de erro; (6) retenção completa; (7) contrato com operadores; (8) teste formal de legítimo interesse; (9) canal do titular; (10) teste anual de incidente e restauração.

Conclusão preliminar: risco **médio/alto enquanto o acesso permanecer em HTTP e sem governança institucional preenchida**. O encarregado e o jurídico devem decidir se é necessário RIPD formal e aprovar o uso produtivo.
