# Secretos de Supabase Vault

Los Database Webhooks y los jobs de `pg_cron` leen la URL de su Edge Function y un secreto compartido desde `vault.decrypted_secrets`. Hay que darlos de alta **una vez por proyecto** (local, `luxepass-dev`, `luxepass-prod`), nunca vía `supabase config push`.

**`supabase db reset` borra Vault**: después de un reset local hay que volver a darlos de alta.

Sin sus secretos, cada trigger/cron es un no-op (guard `if v_url is null or v_secret is null`): nunca rompe una escritura. Así se comporta `ci.yml` a propósito.

## Plantilla

```sql
select vault.create_secret('<url>', '<nombre_url>', '<descripción>');
select vault.create_secret('<valor del .env>', '<nombre_secret>', '<descripción>');
```

- **URL local:** `http://host.docker.internal:54331/functions/v1/<function>` (no `127.0.0.1`: Postgres corre en su propio contenedor).
- **URL staging/prod:** `https://<ref>.supabase.co/functions/v1/<function>`.
- **Valor del secreto:** el mismo que la variable correspondiente en `supabase/functions/.env`.

## Secretos por integración

| Integración | Edge Function | Secreto URL | Secreto compartido | Variable en `.env` |
|---|---|---|---|---|
| Recibo de reserva (4.2/5.1) | `send-booking-receipt` | `booking_receipt_webhook_url` | `booking_receipt_webhook_secret` | `BOOKING_RECEIPT_WEBHOOK_SECRET` |
| Recordatorio 24h (5.3) | `send-booking-reminder` | `booking_reminder_webhook_url` | `booking_reminder_webhook_secret` | `BOOKING_REMINDER_WEBHOOK_SECRET` |
| Borrado de cuenta (6.3) | `delete-account` | `account_deletion_webhook_url` | `account_deletion_webhook_secret` | `ACCOUNT_DELETION_WEBHOOK_SECRET` |
| Evento de reserva al partner (7.2) | `send-partner-booking-event` | `partner_notification_webhook_url` | `partner_notification_webhook_secret` | `PARTNER_NOTIFICATION_WEBHOOK_SECRET` |
| Digest matinal del partner (7.2) | `send-partner-digest` | `partner_digest_webhook_url` | `partner_digest_webhook_secret` | `PARTNER_DIGEST_WEBHOOK_SECRET` |
| Reportes programados (8.2) | `send-admin-report` | `admin_report_webhook_url` | `admin_report_webhook_secret` | `ADMIN_REPORT_WEBHOOK_SECRET` |
| Renovación de membresía (9.1) | `membership-renewal` | `membership_renewal_webhook_url` | `membership_renewal_webhook_secret` | `MEMBERSHIP_RENEWAL_WEBHOOK_SECRET` |

`MEMBERSHIP_RENEWAL_WEBHOOK_SECRET` también va en `.env.local`: los tests invocan el cobro directamente (en CI se genera al vuelo en `ci.yml`). Igual `STRIPE_WEBHOOK_SECRET` (el mismo valor que en `supabase/functions/.env`): `src/lib/stripe-webhook.test.ts` firma eventos con él (QA-01).

## Secretos de GitHub que usa `deploy.yml`

`deploy.yml` sube a cada proyecto remoto el lado "Edge Function" de cada secreto compartido desde un secret de GitHub con sufijo de ambiente (`_DEV` para `luxepass-dev`, `_PROD` para `luxepass-prod`). El lado Vault se sigue dando de alta a mano con la plantilla de arriba, y ambos valores deben coincidir.

| Secret de GitHub | Function |
|---|---|
| `PARTNER_NOTIFICATION_WEBHOOK_SECRET_DEV` / `_PROD` | `send-partner-booking-event` |
| `PARTNER_DIGEST_WEBHOOK_SECRET_DEV` / `_PROD` | `send-partner-digest` |
| `ADMIN_REPORT_WEBHOOK_SECRET_DEV` / `_PROD` | `send-admin-report` |

Si uno de estos tres no existe, el deploy sigue adelante con un warning y la function rechaza todas las llamadas (CI-03, `docs/audit/ci-cd-y-entornos.md`).
