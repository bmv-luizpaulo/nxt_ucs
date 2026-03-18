# LedgerTrust Auditoria

Este projeto e um prototipo de auditoria e rastreabilidade para UCS em blockchain, feito com Next.js e Firebase.

## Funcionalidades

- Monitoramento de pedidos em tempo real
- Auditoria de movimentacoes
- Indicadores visuais de status (ok, pendente, erro)
- Exportacao de relatorios

## Firestore (regras e indices)

Se aparecer `Missing or insufficient permissions`, normalmente as regras locais nao foram publicadas no projeto correto.

1. Selecione o projeto Firebase no CLI:
   `firebase use <SEU_PROJECT_ID>`
2. Publique as regras:
   `npm run firebase:rules:deploy`
3. Publique os indices:
   `npm run firebase:indexes:deploy`

Observacao: se suas regras exigirem `request.auth.token.email_verified == true`, o usuario precisa validar o email.
