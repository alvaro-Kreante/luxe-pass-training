# Auditoría — Calidad y testing

Fecha: 2026-10-12 · Rama auditada: `docs/project-audit` (desde `dev` `eae116a`) · Método: Kreante project-audit (checklist §1, §3, §9 + delivery gate).
Alcance: solo lectura. **`npm test` no se ejecutó** (Supabase local compartido entre sesiones); la suite se revisó leyendo los tests y el historial de CI (`gh run list`: últimos CI en `dev` en verde, 2026-10-12).

## Resumen

| Severidad | Nº |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 3 |
| Info | 2 |

Gate de entrega (calidad): **NO APTO** mientras siga abierto QA-01 (camino de pago real del webhook sin test) — afecta integridad de datos de pagos/membresías.

## Tabla de checks

| Check | Resultado | Evidencia |
|---|---|---|
| `npx tsc --noEmit` | PASS | salida vacía, exit 0 |
| `npm run lint` | PASS | exit 0, sin problemas |
| `npm run build` | PASS | exit 0, rutas listadas (sin warnings) |
| `npm test` (local) | BLOCKED | no ejecutado por recurso compartido; CI en verde en `dev` 2026-10-12 |
| Tests omitidos (`.skip`/`.todo`/`.only`) | PASS | 0 coincidencias en `src/**/*.test.*` |
| Tests triviales/placeholder | PASS | sin `expect(true)`; todos los archivos tienen `expect(` |
| Cobertura signup/login/reset | PASS | `src/app/{signup,login,forgot-password,reset-password,verify-email}/*.test.tsx`, `src/lib/authentication.test.ts` |
| Cobertura booking + pago | PARTIAL/FAIL | `src/lib/stripe-payments.test.ts`, `components/booking` (12) — webhook no probado (QA-01) |
| Cobertura check-in QR | PASS | `src/app/reception/page.test.tsx`, `src/lib/reception.test.ts`, `digital-pass-card.test.tsx` |
| Cobertura membresía/referidos | PARTIAL | `membership.test.ts`, `referrals.test.ts`, `app/join` — liquidación vía fixture, no webhook |
| Cobertura partner dashboard | PASS | `app/partner` (10), `components/partner` (5), `lib/partner*.test.ts` |
| Cobertura admin | PASS | `app/admin` (18), `lib/admin*.test.ts` |
| Tests de Edge Functions (Deno) | FAIL | 0 tests en `supabase/functions/**` (QA-02) |
| Umbral de cobertura | FAIL | sin `coverage` en `vitest.config.ts`/`package.json` (QA-05) |
| Dinero en centavos enteros | PASS | columnas `*_cents`, formateo `/100` solo en presentación |
| Fechas/zonas horarias | PASS con nota | `today(timeZone)` real con `Intl`; `parseDate` en UTC (QA-04 doc drift) |
| Detección de código muerto | N/A | no hay knip/ts-prune configurado (QA-07, Info) |

## Inventario de tests

- **139** archivos de test, **~1.118** casos `it/test`.
- Reparto: `app/admin` 18, `components/booking` 12, `app/partner` 10, `app/lounges` 9, `app/profile` 7, ~40 módulos en `src/lib/*.test.ts`, resto en `components/*` y pantallas de onboarding.
- Estilo: consultas por rol/etiqueta, contra Supabase local real y sandbox de Stripe real; solo se mockea `next/navigation` (coherente con CLAUDE.md).
- Positivos: sin tests omitidos; `cleanTestData` en global setup; CI levanta Supabase efímero y sirve Edge Functions para correr la suite completa.

## Findings

### QA-01 · High · El webhook de Stripe (fuente de verdad del pago) no tiene ningún test
- **Ubicación:** `supabase/functions/stripe-webhook/index.ts`; `src/lib/testing/membership-fixture.ts:53-59`; `src/lib/membership.test.ts:183-195`; `src/lib/stripe-payments.test.ts:107-118`.
- **Estado:** Confirmed.
- **Evidencia:** ningún test referencia `stripe-webhook`, `constructEvent` ni `stripe-signature`. El test "con tarjeta nueva, el plan solo se activa cuando el webhook liquida el pago" llama a `settleTestPayment`, que hace `update payments set status='succeeded'` con service role — se salta el webhook. El test "cobra con una tarjeta guardada y el webhook confirma el pago" solo comprueba `charge.status` devuelto por la function. CI no tiene `STRIPE_WEBHOOK_SECRET` ni `stripe listen`.
- **Impacto:** la verificación de firma, el mapeo de eventos (`payment_intent.succeeded/failed`, `checkout.session.completed`), la idempotencia ante reentregas y la activación de `memberships` dependen de código sin prueba automatizada. Una regresión puede aceptar eventos sin firma, duplicar membresías o dejar pagos en `pending` sin que CI lo detecte. Los nombres de los tests sugieren cobertura que no existe.
- **Remediación:** test de integración que firme un payload con `Stripe.webhooks.generateTestHeaderString` y un `STRIPE_WEBHOOK_SECRET` efímero de CI, invoque la function servida y verifique: 400 sin firma/firma inválida, transición `pending→succeeded`, alta de membresía, y reentrega del mismo evento sin efectos dobles. Renombrar los tests que hoy dicen "el webhook".
- **Cierre:** test en verde en CI que cubra firma inválida, éxito, fallo e idempotencia.

### QA-02 · Medium · Las 16 Edge Functions no tienen tests propios
- **Ubicación:** `supabase/functions/*` (16 functions; solo `_shared/test-recipient.ts` tiene contraparte en `src/lib/test-recipient.test.ts`).
- **Estado:** Confirmed.
- **Evidencia:** sin `*_test.ts`/`deno test`. Algunas se ejercitan indirectamente desde Vitest (stripe-create-checkout-session, stripe-charge-saved-method, stripe-payment-methods, membership-renewal); otras no en absoluto (`stripe-refund-payment`, `send-admin-report`, `send-partner-digest`, `send-partner-booking-event`, `delete-account`, `admin-partners`, `send-email`, recordatorios/recibos).
- **Impacto:** lógica de servidor con efectos irreversibles (reembolsos, borrado de cuentas, suspensión de partners) sin red de seguridad; agravado porque varias ni se despliegan (ver CI-03).
- **Remediación:** priorizar tests de autorización (secreto compartido/JWT/rol admin) y del camino feliz para `stripe-refund-payment`, `delete-account`, `admin-partners`.
- **Cierre:** cada function con efecto de escritura tiene al menos un test de rechazo sin credencial y uno de éxito.

### QA-03 · Medium · `stripe-charge-saved-method` escribe `payments.status` final sin pasar por el webhook
- **Ubicación:** `supabase/functions/stripe-charge-saved-method/index.ts:81-91`.
- **Estado:** Confirmed (código) / Inferred (impacto).
- **Evidencia:** `const status = paymentIntent.status === "succeeded" ? "succeeded" : "failed";` y se inserta en `payments` directamente. CLAUDE.md §Reglas vivas: "el webhook es la única fuente de verdad del `status` de `payments`".
- **Impacto:** es servidor (no cliente), por lo que no es una vulnerabilidad, pero hay dos escritores del estado: si el webhook también inserta/actualiza por `payment_intent_id`, riesgo de doble procesamiento de triggers (membresía/premio de referido) o carrera. Contradice la regla documentada.
- **Remediación:** decidir y documentar: o el webhook es la única fuente (insertar `pending` aquí) o se acepta el resultado síncrono y el webhook hace upsert idempotente por `stripe_payment_intent_id` con índice único. Cubrir con QA-01.
- **Cierre:** regla en ARCHITECTURE/CLAUDE.md coherente con el código y test de idempotencia.

### QA-04 · Medium · La documentación describe un `TODAY` fijo que ya no existe
- **Ubicación:** `CLAUDE.md:45`; comentarios en `src/lib/passes.ts:263,433`, `src/lib/partner.ts:404`, `src/lib/reception.ts:9`, `src/components/explore/availability-calendar.tsx:18`; cabecera `src/lib/availability.ts:1-5` ("No hay datos reales").
- **Estado:** Confirmed.
- **Evidencia:** `src/lib/availability.ts:49` exporta `today(timeZone?, now = new Date())` con el reloj real; no hay constante `TODAY`. CLAUDE.md sigue diciendo "`TODAY` fijo (`2025-09-09`)".
- **Impacto:** quien siga CLAUDE.md asumirá fechas fijas al escribir tests o RPC; comentarios engañosos en código revisable por el cliente (bloqueante contextual del gate: documentación que contradice el comportamiento).
- **Remediación:** actualizar CLAUDE.md §Reglas vivas y los comentarios; confirmar si las RPC siguen recibiendo `p_date` desde `today(lounge.timezone)`.
- **Cierre:** `grep -rn "TODAY" src CLAUDE.md docs/ARCHITECTURE.md` sin referencias a la constante obsoleta.

### QA-05 · Low · Sin medición ni umbral de cobertura
- **Ubicación:** `vitest.config.ts`, `package.json`.
- **Estado:** Confirmed. **Impacto:** imposible demostrar cobertura de flujos críticos ante revisión externa. **Remediación:** `@vitest/coverage-v8` con umbral mínimo en `src/lib`. **Cierre:** reporte de cobertura publicado en CI.

### QA-06 · Low · Tests de integración dependientes de servicios externos con estado compartido
- **Ubicación:** `vitest.config.ts` (testTimeout 20 s), `src/lib/stripe-payments.test.ts`, memoria del proyecto sobre rate limit de Stripe y `seats_left`.
- **Estado:** Inferred. **Impacto:** flakiness (rate limit de Stripe, plazas reales de `lounge_availability`) puede enmascarar regresiones o bloquear PRs. **Remediación:** aislar plazas por lounge `test-…`, reintentos acotados para 429 de Stripe. **Cierre:** 10 corridas seguidas de CI sin fallos intermitentes.

### QA-07 · Low · Redondeo de importes en flotante en el cálculo de precios
- **Ubicación:** `src/lib/booking.ts:179-181` (`round2`), `:209` (`toFixed(2)`).
- **Estado:** Inferred. **Evidencia:** el desglose en cliente usa dólares en `number`; el importe cobrado lo decide el servidor en centavos (correcto). **Impacto:** posible diferencia de 1 centavo entre el desglose mostrado y lo cobrado. **Remediación:** calcular el desglose en centavos enteros o mostrar el importe devuelto por la RPC. **Cierre:** test que compare desglose vs `amount_cents` de la RPC.

### QA-08 · Info · Sin herramienta de código muerto
- No hay knip/ts-prune; no se evaluó código muerto de forma exhaustiva. Recomendable `npx knip` puntual antes del handoff.

### QA-09 · Info · Calidad estática sólida
- tsc, lint y build limpios; CI ejecuta lint, typecheck, build y la suite completa con Supabase efímero. Control positivo.

## Controles positivos

- TDD real con ~1.118 casos, sin `.skip`/`.todo`; tests contra implementación real.
- Dinero persistido como `*_cents` enteros; importe decidido en servidor.
- "Hoy" calculado por huso del lounge (`today(timeZone)`), `parseDate` en UTC.
- Limpieza determinista de datos de test (`cleanTestData`).
