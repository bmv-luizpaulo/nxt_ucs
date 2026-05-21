# 📊 Relatório de Migração de Dados - Legado para Supabase (PostgreSQL)

## Resumo Geral da Execução

| Métrica | Valor |
| :--- | :--- |
| **Data/Hora do Relatório** | 21/05/2026, 09:08:05 |
| **Total de Sub-Importadores** | 38 |
| **Total de Registros Declarados no CSV** | **262.473** |
| **Total de Registros Importados (OK)** | **262.435** |
| **Total de Erros** | <span style="color:red;font-weight:bold;">0</span> |
| **Total de Ignorados (Skipped)** | 0 |
| **Tempo Total Acumulado de Importação** | 2m 52s |
| **Status Global** | ✅ SUCESSO ABSOLUTO (Sem erros) |

## Detalhamento por Tabela / Importador

| # | Chave do Importador | Tabela de Origem/Postgres | CSV de Origem | Registros CSV | Importados (OK) | Erros | Ignorados | Vazão (rows/s) | Duração |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `platforms` | `dbo_platform` | `dbo_platform.csv` | 9 | 8 | 0 | 0 | 2.7 | 3.3s |
| 2 | `platform_tags` | `dbo_platform_tags` | `dbo_platform_tags.csv` | 6 | 5 | 0 | 0 | 2.2 | 2.7s |
| 3 | `users` | `dbo_user` | `dbo_user.csv` | 1.804 | 1.803 | 0 | 0 | 478.9 | 3.8s |
| 4 | `distribution_configs` | `dbo_distribution_configuration` | `dbo_distribution_configuration.csv` | 14 | 13 | 0 | 0 | 5.6 | 2.5s |
| 5 | `projects` | `dbo_project` | `dbo_project.csv` | 9 | 8 | 0 | 0 | 3.5 | 2.5s |
| 6 | `areas` | `dbo_area` | `dbo_area.csv` | 257 | 256 | 0 | 0 | 86.7 | 3.0s |
| 7 | `role_users` | `dbo_role_user` | `dbo_role_user.csv` | 2.373 | 2.372 | 0 | 0 | 651.7 | 3.6s |
| 8 | `quotes` | `dbo_ucs_quote` | `dbo_ucs_quote.csv` | 403 | 402 | 0 | 0 | 150.0 | 2.7s |
| 9 | `harvests` | `dbo_harvest` | `dbo_harvest.csv` | 259 | 258 | 0 | 0 | 99.4 | 2.6s |
| 10 | `cprs` | `dbo_cpr` | `dbo_cpr.csv` | 22 | 21 | 0 | 0 | 7.3 | 3.0s |
| 11 | `ucs_batches` | `dbo_ucs_batch` | `dbo_ucs_batch.csv` | 1 | 0 | 0 | 0 | 71.4 | 14ms |
| 12 | `ucs_batches_2010` | `dbo_ucs_batch` | `dbo_ucs_batch__2010.csv` | 118.508 | 118.507 | 0 | 0 | 3922.2 | 30.2s |
| 13 | `ucs_batches_2020` | `dbo_ucs_batch` | `dbo_ucs_batch__2020.csv` | 202 | 201 | 0 | 0 | 65.6 | 3.1s |
| 14 | `ucs_batches_2022` | `dbo_ucs_batch` | `dbo_ucs_batch__2022.csv` | 295 | 294 | 0 | 0 | 109.3 | 2.7s |
| 15 | `ucs_batches_2023` | `dbo_ucs_batch` | `dbo_ucs_batch__2023.csv` | 5 | 4 | 0 | 0 | 1.6 | 3.1s |
| 16 | `distributions` | `dbo_distribution` | `dbo_distribution.csv` | 39.356 | 39.355 | 0 | 0 | 2555.9 | 15.4s |
| 17 | `consolidated_balances` | `dbo_consolidated_balance` | `dbo_consolidated_balance.csv` | 2.084 | 2.083 | 0 | 0 | 675.1 | 3.1s |
| 18 | `consolidated_balances_per_year` | `dbo_consolidated_balance_per_year` | `dbo_consolidated_balance_per_year.csv` | 22.943 | 22.942 | 0 | 0 | 2656.4 | 8.6s |
| 19 | `transactions` | `dbo_transaction` | `dbo_transaction.csv` | 56.280 | 56.279 | 0 | 0 | 2557.5 | 22.0s |
| 20 | `ownership_transfers` | `dbo_ownership_transfer_order` | `dbo_ownership_transfer_order.csv` | 371 | 370 | 0 | 0 | 138.9 | 2.7s |
| 21 | `financial_participants` | `financial_participant` | `financial_participant.csv` | 700 | 699 | 0 | 0 | 217.9 | 3.2s |
| 22 | `financial_bills` | `financial_bill_to_pay` | `financial_bill_to_pay.csv` | 7.572 | 7.571 | 0 | 0 | 1299.7 | 5.8s |
| 23 | `financial_write_offs` | `financial_bill_write_off` | `financial_bill_write_off.csv` | 4.595 | 4.594 | 0 | 0 | 1253.8 | 3.7s |
| 24 | `tv_certificate_orders` | `plat_tesouro_verde_certificate_order` | `plat_tesouro_verde_certificate_order.csv` | 657 | 656 | 0 | 0 | 226.2 | 2.9s |
| 25 | `tv_partners` | `plat_tesouro_verde_partners` | `plat_tesouro_verde_partners.csv` | 9 | 8 | 0 | 0 | 3.0 | 3.0s |
| 26 | `tv_campaigns` | `plat_tesouro_verde_campaigns` | `plat_tesouro_verde_campaigns.csv` | 14 | 13 | 0 | 0 | 5.0 | 2.8s |
| 27 | `tv_dare_royalties` | `plat_tesouro_verde_dare_royalties` | `plat_tesouro_verde_dare_royalties.csv` | 406 | 405 | 0 | 0 | 132.1 | 3.1s |
| 28 | `tv_compensation_intents` | `plat_tesouro_verde_compensation_intent` | `plat_tesouro_verde_compensation_intent.csv` | 190 | 189 | 0 | 0 | 59.0 | 3.2s |
| 29 | `akses_distributor_certificate_orders` | `plat_akses_distributor_certificate_order` | `plat_akses_distributor_certificate_order.csv` | 765 | 764 | 0 | 0 | 280.5 | 2.7s |
| 30 | `akses_client_certificate_orders` | `plat_akses_client_certificate_order` | `plat_akses_client_certificate_order.csv` | 54 | 53 | 0 | 0 | 18.8 | 2.9s |
| 31 | `akses_transfer_orders` | `plat_akses_transfer_order` | `plat_akses_transfer_order.csv` | 340 | 339 | 0 | 0 | 84.7 | 4.0s |
| 32 | `akses_purchase_orders` | `plat_akses_purchase_order` | `plat_akses_purchase_order.csv` | 34 | 33 | 0 | 0 | 11.2 | 3.0s |
| 33 | `akses_living_carbon_orders` | `plat_akses_living_carbon_certificate_order` | `plat_akses_living_carbon_certificate_order.csv` | 49 | 48 | 0 | 0 | 17.6 | 2.8s |
| 34 | `akses_sale_orders` | `plat_akses_sale_order` | `plat_akses_sale_order.csv` | 1 | 0 | 0 | 0 | 52.6 | 19ms |
| 35 | `stock_availability_cert_orders` | `dbo_stock_availability_certificate_order` | `dbo_stock_availability_certificate_order.csv` | 1 | 0 | 0 | 0 | 1000.0 | 1ms |
| 36 | `movement_intention_orders` | `dbo_movement_intention_order` | `dbo_movement_intention_order.csv` | 1 | 0 | 0 | 0 | 500.0 | 2ms |
| 37 | `adjustments` | `dbo_account_adjustments_order` | `dbo_account_adjustments_order.csv` | 1.588 | 1.587 | 0 | 0 | 375.6 | 4.2s |
| 38 | `blocked_ucs` | `dbo_blocked_ucs` | `dbo_blocked_ucs.csv` | 296 | 295 | 0 | 0 | 73.1 | 4.0s |


*Nota: A contagem de registros do CSV desconsidera a linha de cabeçalho. Algumas tabelas do banco legado podem possuir apenas a linha de cabeçalho (0 registros reais), o que é normal no mapeamento do sistema.*
