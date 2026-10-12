# Auditoría — Pagos y lógica de negocio (ronda 1)

Fecha: 2026-10-12 · Rama: `docs/project-audit` · Alcance: `supabase/schemas`, `supabase/functions` (Stripe, renovación), `src/lib` (precios, cancelación, admin). Solo lectura: sin cambios de código, sin `npm test`, sin remoto. SQL de solo lectura contra el Supabase local (`supabase_db_Luxe_Pass`).

No se repiten hallazgos ya abiertos; se referencian: **SEC-01** (RPC de recepción anónimas, no-show con fee), **SEC-02** (`confirm_booking` acepta pago `pending`), **SEC-04** (webhook sin idempotencia ni guarda de transición), **QA-03** (`stripe-charge-saved-method` escribe `payments.status`), **QA-07** (redondeo en flotante en cliente).

Contexto que condiciona la severidad: la tarifa de no-show / cancelación tardía ($35) **se registra pero nunca se cobra** (decisión documentada en `bookings.sql:39-44` y `support_tickets.sql:613-618`); no hay cargo off-session de esa tarifa que auditar. La membresía es cobro puntual sin Stripe Billing; la renovación sí cobra off-session.

## Resumen

| ID | Sev. | Título |
|---|---|---|
| PAY-01 | **Alta** | Los pagos con tarjeta nueva (Checkout Session) nunca guardan `stripe_payment_intent_id`: no se pueden reembolsar, ni reflejar fallos ni reembolsos del Dashboard |
| PAY-02 | **Alta** | Un fallo no-de-tarjeta en la renovación deja la membresía `active` para siempre sin cobrar |
| PAY-03 | Media | Reembolso sin efecto sobre reserva, membresía ni premio de referido |
| PAY-04 | Media | `stripe-refund-payment`: importe sin validar, sin idempotency key, carrera en reembolsos parciales y `stripe_refund_id` sobrescrito |
| PAY-05 | Media | `cancel_booking` decide la tarifa de 24 h con un `p_today` que manda el cliente y sin hora de la franja |
| PAY-06 | Media | Dos cobros de alta/subida de membresía en paralelo se cobran ambos y el segundo pisa el término del primero |
| PAY-07 | Media | Autorreferido trivial: un segundo email + un day pass pagado genera dos day passes |
| PAY-08 | Media | Cancelar una reserva pagada (sin tarifa) no reembolsa el day pass |
| PAY-09 | Media | Renovación off-session sin manejo de SCA (`authentication_required`) ni reintento: la membresía vence al primer rechazo |
| PAY-10 | Baja | Cupo mensual de 8 visitas y day passes de regalo consumibles en paralelo (carrera fuera del advisory lock) |
| PAY-11 | Baja | Sin idempotencia en creación de Checkout Session / PaymentIntent / Customer |
| PAY-12 | Baja | Tarjeta guardada con 3DS: `requires_action` se registra como `failed` sin ofrecer autenticación |
| PAY-13 | Baja | Impuesto fijo de NY (8,875 %) para todo lounge, sin Stripe Tax; precios duplicados en 3–4 sitios |
| PAY-14 | Baja | `confirm_booking` no valida que `p_date` sea futura ni que el pago corresponda a ese lounge/fecha; sin unicidad por miembro/franja |
| PAY-15 | Info | Espacio de códigos de referido pequeño (iniciales + 2 cifras) |

---

## Hallazgos

### PAY-01 — Pagos de Checkout Session sin `stripe_payment_intent_id` (Alta, Confirmado)

- **Ubicación:** `supabase/functions/stripe-create-checkout-session/index.ts:71-81`, `stripe-membership-checkout/index.ts:97-105`; `stripe-webhook/index.ts:44-53,63-107`; `stripe-refund-payment/index.ts:54-59`.
- **Evidencia:** con `ui_mode: "elements"` la sesión se crea sin PaymentIntent (se crea al confirmar), así que `session.payment_intent` es `null` y se inserta `null`. El webhook de `checkout.session.completed` actualiza por `stripe_checkout_session_id` pero **no rellena el PI**. SQL local: `select status, stripe_payment_intent_id is not null from payments` → los 3 pagos con sesión tienen `has_pi = f` (2 `succeeded`, 1 `pending`).
- **Impacto:**
  1. `stripe-refund-payment` responde 409 "Only a succeeded Stripe payment can be refunded" para **todo day pass/membresía pagado con tarjeta nueva**: el "Refund processing interface" (Story 8.1) no funciona para el caso principal.
  2. `charge.refunded` (reembolso desde el Dashboard) y `payment_intent.payment_failed` buscan por PI y no encuentran fila: un rechazo de tarjeta nueva deja el pago `pending` para siempre (alimenta SEC-02) y un reembolso externo nunca se refleja.
- **Remediación:** en `checkout.session.completed`/`async_*` guardar `session.payment_intent` en la fila; para fallos síncronos escuchar también `checkout.session.expired` y fijar `expires_at` corto en la sesión; alternativamente, poner `metadata.payment_id` en `payment_intent_data.metadata` y resolver la fila por ese id.
- **Cierre:** test del webhook: `checkout.session.completed` deja `stripe_payment_intent_id` no nulo; `charge.refunded` sobre ese PI pasa la fila a `refunded`; `stripe-refund-payment` sobre un pago de sesión devuelve 200. Comprobación barata: la query SQL de arriba sin filas `has_cs=t, has_pi=f, status='succeeded'`.

### PAY-02 — Renovación que falla por error no-de-tarjeta deja la membresía activa indefinidamente (Alta, Confirmado por lectura)

- **Ubicación:** `memberships.sql:451-481` (`dispatch_membership_renewals`), `membership-renewal/index.ts:165-216,243-245`.
- **Evidencia:** el cron marca `renewal_attempted_at = now()` **antes** de llamar a la function y solo vuelve a intentar si es `null`. La function solo vence la membresía en `failRenewal` (sin tarjeta / `StripeCardError`). Cualquier otra excepción (error de red/API de Stripe, `insertError`, timeout de `pg_net` a 30 s, cold start) devuelve 500 y no toca la fila. El paso 1 del cron solo vence las de `not auto_renew`. Resultado: `status='active'`, `current_period_end` pasado, `renewal_attempted_at` no nulo → nunca se cobra ni se vence. Lo mismo si faltan los secretos de Vault (documentado en el propio comentario, `memberships.sql:436-438`). Peor: si el cobro **sí** se hizo y falla el `insert` en `payments`, el miembro paga y no se renueva.
- **Impacto:** servicio de membresía gratis indefinido (cobertura de 8 visitas/mes vía `booking_coverage_for`, que solo mira `status='active'`), o cobro sin término nuevo.
- **Remediación:** `idempotencyKey: renewal-<member>-<period_end>` en el PaymentIntent; reintento acotado (p. ej. `renewal_attempted_at < now() - interval '6 hours'` y contador); un periodo de gracia explícito tras el cual el cron vence toda membresía `active` con `current_period_end` pasado; reconciliar con `payment_intent.succeeded` por `metadata.kind = membership_renewal` si el insert falló.
- **Cierre:** test SQL: membresía `active`, `auto_renew`, término vencido hace > gracia y `renewal_attempted_at` puesto → tras `dispatch_membership_renewals()` queda `expired` o reintentada. Comprobación barata: `select count(*) from memberships where status='active' and current_period_end < now() - interval '1 day'` debe ser 0 en remoto.

### PAY-03 — El reembolso no revierte reserva, membresía ni referido (Media, Confirmado por lectura)

- **Ubicación:** `stripe-refund-payment/index.ts:75-88`; `stripe-webhook/index.ts:83-107`; triggers `apply_membership_payment` (`memberships.sql:234-285`) y `credit_referral_on_first_payment` (`referrals.sql:230-271`) solo reaccionan a `succeeded`.
- **Evidencia:** pasar un pago a `refunded` no dispara nada: la reserva ligada sigue `confirmed` (y ocupa plaza), la membresía comprada sigue `active` con su término completo, y el referido sigue `credited` (los dos day passes de regalo siguen disponibles en `booking_coverage_for`).
- **Impacto:** un reembolso total de membresía anual ($2.400) deja el año de servicio; un reembolso del primer pago del amigo deja ambos premios. Inconsistencia contable entre Stripe y la app. (SEC-04 añade el caso inverso: `refunded`→`succeeded` vuelve a aplicar la membresía.)
- **Remediación:** trigger `after update of status` en `payments` para `→ refunded`: si `membership_plan` no es null, vencer o recortar el término (decisión de producto); si `booking_id`, cancelar la reserva; si es el pago que acreditó un referido, revertir a `pending` o marcar `revoked` cuando el pase no se usó. Documentar la política en `ARCHITECTURE.md`.
- **Cierre:** tests SQL: reembolso total de pago de membresía → `memberships.status='expired'`; de day pass → reserva `cancelled`; del primer pago del referido → `referrals.status <> 'credited'`.

### PAY-04 — Reembolso: importe sin validar, sin idempotencia, carreras (Media, Confirmado por lectura)

- **Ubicación:** `stripe-refund-payment/index.ts:61-88`; `payments.sql:33` (`stripe_refund_id text unique`).
- **Evidencia:** `body.amountCents` no se valida (entero > 0, ≤ restante). No hay `idempotencyKey` en `refunds.create`. Dos peticiones simultáneas leen el mismo `refunded_amount_cents`, ambas reembolsan y la segunda escritura pisa a la primera (`totalRefunded` subcontado). Si `refund.status` es `pending` (frecuente en live) no se escribe nada. Con parciales sucesivos, `stripe_refund_id` guarda solo el último.
- **Impacto:** doble reembolso por doble clic (Stripe solo lo frena al superar el total del cargo); `refunded_amount_cents` inferior al real → el estado nunca llega a `refunded`; trazabilidad incompleta.
- **Remediación:** validar importe; `idempotencyKey` derivada de `(paymentId, importe, nonce del modal)`; tomar `refunded_amount_cents` de Stripe (`charge.amount_refunded`) en vez de sumar en local, o `update … where refunded_amount_cents is not distinct from <leído>`; tabla `payment_refunds` (1 fila por refund) en lugar de una columna única.
- **Cierre:** test de la function: `amountCents` negativo o mayor que el restante → 400; dos llamadas concurrentes → un único refund en Stripe.

### PAY-05 — Regla de 24 h decidida con fecha del cliente y sin hora (Media, Confirmado por lectura)

- **Ubicación:** `bookings.sql:454-497` (`cancel_booking(p_booking_id, p_today)`), cliente `src/lib/passes.ts:437-444`.
- **Evidencia:** `v_hours_until_arrival := greatest(date - p_today, 0) * 24`. `p_today` lo manda el navegador: pasando una fecha antigua cualquier cancelación sale sin tarifa. Además ignora `slot_time` y zona horaria del lounge: reservar mañana 8:00 y cancelar hoy a las 23:00 (9 h) cuenta como 24 h → gratis; cancelar a las 00:30 del mismo día una reserva de 18:00 cobra igual que una a las 17:59.
- **Impacto:** hoy la tarifa no se cobra (solo se registra), así que el daño es de datos/política (no-shows y cancelaciones tardías infra-registrados, analítica de partner Story 7.3 con su 50 % de $35). Pasa a Alta el día que la tarifa se cobre.
- **Remediación:** calcular en servidor con `now()` y la hora real de la franja en la zona del lounge (`(date + slot_time) at time zone lounge_tz - now() < interval '24 hours'`); quitar `p_today` o ignorarlo para la tarifa.
- **Cierre:** test SQL: `cancel_booking(id, '2000-01-01')` sobre una reserva de mañana registra `cancellation_fee_cents = 3500`.

### PAY-06 — Doble compra concurrente de membresía (Media, Inferido)

- **Ubicación:** `stripe-membership-checkout/index.ts:66-161`; `memberships.sql:158-218, 234-276`.
- **Evidencia:** el quote se calcula al crear la sesión, no al liquidar. Sin membresía activa, dos `create_session` (o un `create_session` pendiente + un `charge_saved`) producen dos pagos `join`; si ambos se pagan, `apply_membership_payment` aplica el segundo con `v_start = now()` (término aún vigente) y **reemplaza** el término del primero en vez de sumarlo. Igual con una subida mensual→anual pagada dos veces.
- **Impacto:** el miembro paga 2× ($2.400 + $2.400) por un solo año.
- **Remediación:** en el trigger, si el pago llega y ya hay término activo del mismo plan creado por otro pago, extender (`current_period_end + interval`) o marcar para reembolso automático; en la function, rechazar si existe un pago de membresía `pending` reciente del miembro; idempotency key por intención.
- **Cierre / confirmación barata:** en test, insertar dos pagos `succeeded` con `membership_plan='annual'` para el mismo miembro sin membresía y comprobar `current_period_end` (hoy = now()+1 año, no +2).

### PAY-07 — Autorreferido con cuentas múltiples (Media, Confirmado por lectura)

- **Ubicación:** `referrals.sql:157` (`referrer_id <> referee_id` como única defensa), `:175-227`, `:230-262`; `booking_coverage.sql:95-105`.
- **Evidencia:** basta otra cuenta con otro email y `?ref=CODIGO`. El crédito se da con **cualquier** primer pago `succeeded` del amigo, incluido un day pass de $81,66 (no exige membresía). Referidor y referido reciben cada uno un day pass. No hay límite de referidos por miembro, ni verificación de tarjeta/cliente distinto (mismo `card.fingerprint`), ni reversión si el pago se reembolsa (PAY-03).
- **Impacto:** un miembro genera day passes ilimitados para sí a coste de un day pass por cuenta (el pase del referidor ya compensa); con reembolso del pago del amigo, coste cero.
- **Remediación:** acreditar solo con el primer pago de **membresía** (o tras N días sin reembolso); rechazar si el fingerprint de la tarjeta del amigo coincide con una del referidor; tope anual por referidor; revertir al reembolsar.
- **Cierre:** test: referido cuyo primer pago es un day pass no acredita; pago con fingerprint del referidor no acredita.

### PAY-08 — Cancelar una reserva pagada no devuelve el day pass (Media, Inferido)

- **Ubicación:** `bookings.sql:483-493` (`cancel_booking`), `support_tickets.sql:445-473` (`admin_cancel_booking`).
- **Evidencia:** la cancelación con ≥ 24 h ("free cancellation") solo cambia `bookings.status`; el pago queda `succeeded` con `booking_id` apuntando a una reserva cancelada y no es reutilizable (`confirm_booking` exige `booking_id is null`). No hay reembolso automático ni crédito; solo el admin podría reembolsar (y PAY-01 lo impide para tarjeta nueva). Contraste: los day passes de regalo sí se devuelven al cancelar.
- **Impacto:** el miembro pierde $81,66 en una cancelación anunciada como gratuita → disputas/chargebacks.
- **Remediación (decisión de producto):** reembolso automático vía Stripe al cancelar sin tarifa, o liberar el pago (`booking_id = null`) como crédito reutilizable; reflejarlo en la copy.
- **Confirmación barata:** preguntar a producto la política; test de `cancel_booking` sobre reserva pagada.

### PAY-09 — Renovación off-session sin SCA ni reintentos (Media, Confirmado por lectura)

- **Ubicación:** `membership-renewal/index.ts:176-216`.
- **Evidencia:** un `StripeCardError` con `code = authentication_required` (frecuente en tarjetas europeas) o un rechazo transitorio (`insufficient_funds`) vence la membresía en el acto (`failRenewal`) — sin dunning, sin email (solo notificación in-app), sin enlace para autenticar. Además elige `default_payment_method` o la **primera** tarjeta listada, no necesariamente la guardada para la membresía.
- **Impacto:** churn involuntario de miembros que sí querían renovar; pérdida de ingresos recurrentes.
- **Remediación:** periodo de gracia con 2–3 reintentos; en `authentication_required` mandar email con enlace a un flujo on-session que confirme el mismo PI; guardar el PM de la membresía explícitamente.
- **Cierre:** test con tarjeta `4000002760003184` (stripe:test-cards): la membresía queda en gracia, no `expired`.

### PAY-10 — Cupo de visitas y pases de regalo en paralelo (Baja, Inferido)

- **Ubicación:** `bookings.sql:164-207`; `booking_coverage.sql:64-117`.
- **Evidencia:** la cobertura se evalúa **antes** del `pg_advisory_xact_lock`, y el lock es por lounge/fecha/franja. Dos `confirm_booking` simultáneos en franjas distintas con 7 visitas usadas ven ambos `membership`; dos con 1 pase de regalo ven ambos `day_pass_credit` (`day_pass_redemptions` es único por `booking_id`, no por crédito).
- **Impacto:** 9+ visitas/mes o pases duplicados; requiere peticiones paralelas deliberadas.
- **Remediación:** `pg_advisory_xact_lock(hashtext('coverage|'||member_id))` antes de evaluar la cobertura.
- **Cierre:** test con dos conexiones concurrentes que no supera 8.

### PAY-11 — Sin idempotencia en creación de cobros (Baja, Confirmado por lectura)

- **Ubicación:** `stripe-create-checkout-session/index.ts:45`, `stripe-charge-saved-method/index.ts:50`, `stripe-membership-checkout/index.ts:78,124`, `_shared/stripe-context.ts:51-78`.
- **Evidencia:** ninguna llamada a Stripe usa `idempotencyKey`. Doble clic en tarjeta guardada → dos PaymentIntents cobrados; cada apertura del modal deja una fila `pending` huérfana (sin cron que las expire); `ensureStripeCustomer` concurrente puede crear dos Customers (la tarjeta guardada queda en uno y "desaparece").
- **Remediación:** idempotency key por intento (uuid generado en cliente y validado), `expires_at` en sesiones + `checkout.session.expired` → `failed`; `update profiles … where stripe_customer_id is null` y reusar el ganador.

### PAY-12 — Tarjeta guardada con 3DS registrada como `failed` (Baja, Confirmado por lectura)

- **Ubicación:** `stripe-charge-saved-method/index.ts:81`, `stripe-membership-checkout/index.ts:144`.
- **Evidencia:** `status = succeeded ? 'succeeded' : 'failed'`: un PI en `requires_action` se guarda `failed` y no se devuelve `client_secret` para `stripe.handleNextAction`. Si luego se completa, el webhook lo pasa a `succeeded` sin reserva ligada (o activa membresía de forma inesperada).
- **Remediación:** devolver `requires_action` + `client_secret` al cliente y dejar la fila `pending`; ver también QA-03.

### PAY-13 — Impuesto fijo y precios duplicados (Baja, Confirmado)

- **Ubicación:** `_shared/stripe-context.ts:86-91` (`TAX_RATE = 0.08875`), `src/lib/booking.ts`, `memberships.sql:189`, `membership-renewal/index.ts:33`, `src/lib/membership.ts`.
- **Evidencia:** day pass = `round(75 × 1,08875 × 100)` = 8166 ¢ para cualquier lounge (tipo de NY), sin desglose fiscal en Stripe; membresías sin impuesto. Moneda `usd` cableada. Precios repetidos en TS, SQL y dos functions sin test de paridad. Redondeo cliente ya cubierto por QA-07.
- **Remediación:** Stripe Tax (`automatic_tax`) o tabla de tasas por lounge; precio único en una tabla `prices` leída por SQL y functions; test de paridad mientras tanto.

### PAY-14 — Validaciones ausentes en `confirm_booking` (Baja, Confirmado por lectura)

- **Ubicación:** `bookings.sql:126-214`.
- **Evidencia:** no comprueba `p_date >= hoy` (se pueden crear reservas en el pasado, que consumen visitas de un mes ya cerrado o del futuro lejano), ni que `payments` corresponda al lounge/fecha de la metadata de Stripe, ni unicidad `(member_id, date, band)` (SQL local: solo índices no únicos en `bookings`). `join_waitlist` no comprueba que la franja exista.
- **Impacto:** un miembro puede acaparar plazas de una franja con sus visitas incluidas; datos incoherentes. El importe es fijo, así que no hay pérdida directa.
- **Remediación:** `p_date` contra el reloj real del servidor; índice único parcial `(member_id, date, band) where status in ('confirmed','waitlisted','in_progress')`.

### PAY-15 — Códigos de referido de baja entropía (Info, Confirmado)

- **Ubicación:** `referrals.sql:20-57`.
- **Evidencia:** `XX-SOLEIL-NN`: 90 valores por iniciales. No hay RPC anónima que valide un código (la búsqueda ocurre en el trigger de alta), así que enumerar exige crear cuentas; el impacto real es atribuir referidos a terceros, no robar premios.
- **Remediación:** sufijo aleatorio de ≥ 6 caracteres si se añade alguna validación pública de códigos.

---

## Controles positivos

- **Importes decididos en servidor:** day pass por `dayPassAmountCents()`, membresía por `membership_change_quote` llamada con el JWT del miembro; el navegador nunca manda importe (salvo el reembolso de admin, PAY-04).
- **Checkout Sessions `ui_mode: "elements"` sin `payment_method_types`** en ambas functions; PI de tarjeta guardada con `automatic_payment_methods`, conforme a CLAUDE.md.
- Importes en centavos (`integer`) en BD; `payments` y `memberships` sin policies de escritura para clientes; `memberships` nace solo por trigger desde `payments.status = 'succeeded'`.
- `stripe-payment-methods` comprueba que el PM pertenece al Customer antes de `detach`.
- Webhook verifica firma con `constructEventAsync` (Web Crypto).
- `confirm_booking` serializa la última plaza con `pg_advisory_xact_lock` por lounge/fecha/franja y recalcula plazas en vivo — sin sobreventa de aforo.
- Un pago de day pass no puede ligarse a dos reservas (`booking_id is null`) ni usarse uno de membresía.
- Referidos: `referee_id unique` + `status='pending'` en la actualización → un único premio por amigo; check de autorreferido de la misma cuenta.
- No-show/fee: transiciones `confirmed → completed` condicionadas (`status='confirmed' and checked_in_at is null`) → no se aplica dos veces; `admin_waive_booking_fee` exige rol admin.
- Renovación: el término nuevo empieza en `current_period_end`, no en `now()`; `renewal_attempted_at` evita doble cobro por el cron (a costa de PAY-02); la function re-lee la fila antes de cobrar.
- `stripe-refund-payment` exige rol `admin` (`has_role`) y solo pagos `succeeded`.
