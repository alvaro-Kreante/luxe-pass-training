# Auditoría — Pagos y lógica de negocio (ronda 1)

Fecha: 2026-10-12 · Rama: `docs/project-audit` · Alcance: `supabase/schemas`, `supabase/functions` (Stripe, renovación), `src/lib` (precios, cancelación, admin). Solo lectura: sin cambios de código, sin `npm test`, sin remoto. SQL de solo lectura contra el Supabase local (`supabase_db_Luxe_Pass`).

No se repiten hallazgos ya abiertos; se referencian: **QA-03** (`stripe-charge-saved-method` escribe `payments.status`), **QA-07** (redondeo en flotante en cliente).

Contexto que condiciona la severidad: la tarifa de no-show / cancelación tardía ($35) **se registra pero nunca se cobra** (decisión documentada en `bookings.sql:39-44` y `support_tickets.sql:613-618`); no hay cargo off-session de esa tarifa que auditar. La membresía es cobro puntual sin Stripe Billing; la renovación sí cobra off-session.

## Resumen

| ID | Sev. | Título |
|---|---|---|
| PAY-06 | Media | Dos cobros de alta/subida de membresía en paralelo se cobran ambos y el segundo pisa el término del primero |
| PAY-07 | Media | Autorreferido trivial: un segundo email + un day pass pagado genera dos day passes |
| PAY-08 | Media | Parcial: cancelar desde el admin (`admin_cancel_booking`) una reserva pagada no reembolsa el day pass |
| PAY-09 | Media | Renovación off-session sin manejo de SCA (`authentication_required`) ni reintento: la membresía vence al primer rechazo |
| PAY-10 | Baja | Cupo mensual de 8 visitas y day passes de regalo consumibles en paralelo (carrera fuera del advisory lock) |
| PAY-11 | Baja | Sin idempotencia en creación de Checkout Session / PaymentIntent / Customer |
| PAY-12 | Baja | Tarjeta guardada con 3DS: `requires_action` se registra como `failed` sin ofrecer autenticación |
| PAY-13 | Baja | Impuesto fijo de NY (8,875 %) para todo lounge, sin Stripe Tax; precios duplicados en 3–4 sitios |
| PAY-14 | Baja | `confirm_booking` no valida que `p_date` sea futura ni que el pago corresponda a ese lounge/fecha; sin unicidad por miembro/franja |
| PAY-15 | Info | Espacio de códigos de referido pequeño (iniciales + 2 cifras) |

---

## Hallazgos

### PAY-06 — Doble compra concurrente de membresía (Media, Inferido)

- **Ubicación:** `stripe-membership-checkout/index.ts:66-161`; `memberships.sql:158-218, 234-276`.
- **Evidencia:** el quote se calcula al crear la sesión, no al liquidar. Sin membresía activa, dos `create_session` (o un `create_session` pendiente + un `charge_saved`) producen dos pagos `join`; si ambos se pagan, `apply_membership_payment` aplica el segundo con `v_start = now()` (término aún vigente) y **reemplaza** el término del primero en vez de sumarlo. Igual con una subida mensual→anual pagada dos veces.
- **Impacto:** el miembro paga 2× ($2.400 + $2.400) por un solo año.
- **Remediación:** en el trigger, si el pago llega y ya hay término activo del mismo plan creado por otro pago, extender (`current_period_end + interval`) o marcar para reembolso automático; en la function, rechazar si existe un pago de membresía `pending` reciente del miembro; idempotency key por intención.
- **Cierre / confirmación barata:** en test, insertar dos pagos `succeeded` con `membership_plan='annual'` para el mismo miembro sin membresía y comprobar `current_period_end` (hoy = now()+1 año, no +2).

### PAY-07 — Autorreferido con cuentas múltiples (Media, Confirmado por lectura)

- **Ubicación:** `referrals.sql:157` (`referrer_id <> referee_id` como única defensa), `:175-227`, `:230-262`; `booking_coverage.sql:95-105`.
- **Evidencia:** basta otra cuenta con otro email y `?ref=CODIGO`. El crédito se da con **cualquier** primer pago `succeeded` del amigo, incluido un day pass de $81,66 (no exige membresía). Referidor y referido reciben cada uno un day pass. No hay límite de referidos por miembro, ni verificación de tarjeta/cliente distinto (mismo `card.fingerprint`).
- **Impacto:** un miembro genera day passes ilimitados para sí a coste de un day pass por cuenta (el pase del referidor ya compensa); con reembolso del pago del amigo, coste cero.
- **Remediación:** acreditar solo con el primer pago de **membresía** (o tras N días sin reembolso); rechazar si el fingerprint de la tarjeta del amigo coincide con una del referidor; tope anual por referidor; revertir al reembolsar.
- **Cierre:** test: referido cuyo primer pago es un day pass no acredita; pago con fingerprint del referidor no acredita.

### PAY-08 — Cancelar desde el admin una reserva pagada no devuelve el day pass (Media, parcial)

- **Ya corregido (#57, 13 oct 2026):** cuando cancela el miembro con más de 24 h, `stripe-cancel-booking` reembolsa el pago en Stripe.
- **Falta:** `admin_cancel_booking` (`support_tickets.sql`) solo cambia `bookings.status`; el pago queda `succeeded` y hay que reembolsarlo a mano desde la consola.
- **Remediación:** que la cancelación del admin pase por la misma lógica de reembolso (o lo ofrezca en el mismo paso).
- **Cierre:** test: el admin cancela una reserva pagada → el pago queda `refunded`.

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

- **Importes decididos en servidor:** day pass por `dayPassAmountCents()`, membresía por `membership_change_quote` llamada con el JWT del miembro; el navegador nunca manda importe (salvo el importe del reembolso de admin, validado en servidor).
- **Checkout Sessions `ui_mode: "elements"` sin `payment_method_types`** en ambas functions; PI de tarjeta guardada con `automatic_payment_methods`, conforme a CLAUDE.md.
- Importes en centavos (`integer`) en BD; `payments` y `memberships` sin policies de escritura para clientes; `memberships` nace solo por trigger desde `payments.status = 'succeeded'`.
- `stripe-payment-methods` comprueba que el PM pertenece al Customer antes de `detach`.
- Webhook verifica firma con `constructEventAsync` (Web Crypto).
- `confirm_booking` serializa la última plaza con `pg_advisory_xact_lock` por lounge/fecha/franja y recalcula plazas en vivo — sin sobreventa de aforo.
- Un pago de day pass no puede ligarse a dos reservas (`booking_id is null`) ni usarse uno de membresía.
- Referidos: `referee_id unique` + `status='pending'` en la actualización → un único premio por amigo; check de autorreferido de la misma cuenta.
- No-show/fee: transiciones `confirmed → completed` condicionadas (`status='confirmed' and checked_in_at is null`) → no se aplica dos veces; `admin_waive_booking_fee` exige rol admin.
- Renovación: el término nuevo empieza en `current_period_end`, no en `now()`; `renewal_attempted_at` evita doble cobro por el cron; la function re-lee la fila antes de cobrar.
- `stripe-refund-payment` exige rol `admin` (`has_role`) y solo pagos `succeeded`.
