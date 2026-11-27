# Pedidos IPM

Aplicativo independente para planejamento, contagem, análise e geração de pedidos de estoque do Restaurante IPM.

## Estrutura planejada

- Visão geral
- Inputs: projeção de GC para 11 dias
- Contagem por categoria
- Análise de estoque, consumo projetado e mercadoria a receber
- Pedidos por ciclo (Regular, SMART e Hortifruti)
- Histórico e auditoria

## Regras de negócio já definidas

- Necessidade projetada: (GC dos 11 dias × MTC) / 1.000.
- Saldo para pedido: necessidade projetada − estoque contado − quantidade a receber.
- Pedido Regular: Congelados, Resfriados e Estoque; fecha segunda-feira às 11h e recebe quinta-feira.
- SMART: Batata e brindes; ciclos quarta-feira (recebe segunda-feira) e sábado (recebe quinta-feira).
- Hortifruti: ciclos quarta-feira (recebe segunda-feira) e sábado (recebe quinta-feira).

## Tecnologia

- Frontend PWA responsivo
- Hospedagem planejada: Cloudflare Pages
- Persistência planejada: Supabase (projeto e credenciais ainda precisam ser configurados)

## Observação

Os produtos, MTCs, unidades, embalagens e regras finais de arredondamento devem ser importados e conferidos com a planilha de referência antes de ativar cálculos operacionais.
