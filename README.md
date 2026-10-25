# Connect Kadosh — Loja virtual (fase 1)

Compra de tags NFC + QR Code, pagamento real (Pix e cartão via Mercado Pago) e acompanhamento do pedido.
Next.js 14 + Supabase (PostgreSQL) + Vercel. Tudo configurável por interfaces web.

**Fase 1 (este pacote):** catálogo, carrinho, checkout, pedido com código público seguro, Pix, Checkout Pro, webhook com assinatura, página de acompanhamento, WhatsApp.
**Fase 2:** painel administrativo (login, mudar status, previsão, "saiu para entrega", tempo real).
**Fase 3:** gestão de produtos/estoque/frete, relatórios, avaliações reais de clientes.

Até a fase 2, o administrador muda o status direto no Supabase (Table Editor > `orders` > coluna `status`).
A linha do tempo do cliente atualiza sozinha em até 6 segundos.

## 1. GitHub (sem linha de comando)
1. Crie uma conta e um repositório **privado** em github.com > New.
2. No repositório: Add file > Upload files. Arraste TODO o conteúdo desta pasta (não envie `.env`) e clique em Commit.

## 2. Supabase
1. supabase.com > New project (anote a senha do banco).
2. SQL Editor > New query > cole o conteúdo de `supabase/migrations/001_schema.sql` > Run.
3. Project Settings > API: copie a **Project URL** (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`). Essa chave é secreta: só vai na Vercel.
4. Table Editor > `shipping_options`: ajuste nome e preço do frete (os valores iniciais são exemplo). `products`: confira o preço da tag (R$ 15,00 = `1500` centavos).

## 3. Mercado Pago
1. mercadopago.com.br/developers > Suas integrações > sua aplicação.
2. Credenciais de **teste**: copie o Access Token de teste para `MP_ACCESS_TOKEN` e faça todos os testes primeiro. Só depois troque pelo de produção.
3. Webhooks (depois do passo 4): Suas integrações > Webhooks > Configurar notificações. URL: `https://SEU-DOMINIO/api/webhooks/mercadopago`, evento **Pagamentos**. Copie a **assinatura secreta** para `MP_WEBHOOK_SECRET`.

## 4. Vercel
1. vercel.com > Add New > Project > importe o repositório do GitHub.
2. Em Environment Variables, crie as variáveis de `.env.example` (`MP_ACCESS_TOKEN`, `PAYMENT_DESCRIPTION`, `MP_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP`).
3. Deploy. Depois de ter o endereço final, ajuste `NEXT_PUBLIC_SITE_URL`, faça Redeploy e volte ao passo 3.3.

## Testes
- Automáticos (preço no servidor, validações, assinatura do webhook): `npm test`.
- Manuais (ambiente de teste do Mercado Pago):
  1. Comprar 3 tags com personalização: o total deve ser 3 × R$ 15,00 + frete escolhido.
  2. Alterar o preço no navegador (DevTools) não muda o total cobrado.
  3. Gerar Pix, pagar com a conta de teste: o status deve ir para "Pagamento aprovado" sozinho.
  4. Cartão: concluir no Checkout Pro com cartão de teste; ao voltar, o status vem da API, não da URL.
  5. Cartão recusado: o pedido continua pendente e permite nova tentativa.
  6. Webhook com assinatura errada responde 401 (Mercado Pago > Webhooks > Simular).
  7. Abrir `/pedido/codigo-invalido`: "Pedido não encontrado".
  8. No Supabase, mudar `status` para `saiu_entrega`: a página do cliente mostra a mensagem de saída para entrega.

## Checklist de publicação
- [ ] Testes manuais acima aprovados com credenciais de teste.
- [ ] Credenciais de produção do Mercado Pago na Vercel + novo Redeploy.
- [ ] Webhook de produção configurado com o `MP_WEBHOOK_SECRET` correspondente.
- [ ] Um pagamento real de baixo valor feito e conferido (e estornado, se quiser).
- [ ] Preços, fretes e produtos conferidos no Supabase.
- [ ] Número de WhatsApp conferido (`NEXT_PUBLIC_WHATSAPP`).
- [ ] Repositório privado e nenhum token no GitHub.
- [ ] Páginas de políticas (troca, privacidade, LGPD) redigidas e linkadas no rodapé.

## Como trocar preço ou cadastrar produto (até a fase 3)
Supabase > Table Editor > `products`: edite `price_cents` (R$ 15,00 = 1500), `stock` (vazio = ilimitado) e `active`. Novos produtos: Insert row (`slug` sem espaços, ex.: `tag-premium`).

## Pontos ainda em aberto
- Cartão de **débito**: depende da conta e do Checkout Pro. O site não promete débito; confira na tela de pagamento em teste.
- Estoque: hoje só bloqueia compra acima do estoque; a baixa automática entra na fase 3.
- WhatsApp automático (avisos de pagamento/entrega) exige WhatsApp Business Platform. Por ora são links com mensagem pronta.
- Sem rastreamento GPS (nenhum mapa simulado).
