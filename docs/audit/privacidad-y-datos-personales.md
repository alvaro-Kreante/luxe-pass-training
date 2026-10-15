# Auditoría de privacidad y datos personales — LuxePass

Revisión **técnica** de solo lectura (código, `supabase/schemas`, Edge Functions y consultas de solo lectura al Supabase local, 12 oct 2026). Método: checklist de auditoría §4 "Clasificar el dato". **No es un dictamen de cumplimiento legal** (GDPR/LOPD/CCPA): señala qué hace el sistema con el dato personal y dónde la conducta no cuadra con lo que la UI promete.

Ya cubierto en `seguridad-y-datos.md` (se referencia, no se duplica): **SEC-05** (`email_exists` permite enumerar), SEC-07 (mensajes de error internos al cliente).

## Resumen

| ID | Severidad | Título |
|---|---|---|
| PRIV-02 | **Alta** | El borrado de cuenta deja datos personales fuera de Postgres (foto en Storage, cliente de Stripe) y borra en cascada el historial financiero |
| PRIV-03 | Media | Preferencias de notificación (push/email/SMS, horas de silencio) solo existen en el estado del navegador; los crons de email no consultan ninguna preferencia |
| PRIV-04 | Media | `partner_repeat_guests` expone a cada partner el email de todos sus huéspedes históricos sin límite temporal ni ligado a reserva abierta |
| PRIV-05 | Media | Sin retención ni limpieza: `login_attempts`, tickets de soporte, notificaciones, `referral_shares` crecen indefinidamente |
| PRIV-06 | Media | La exportación de datos ("Export your personal data") omite pagos, membresías, referidos, tickets de soporte y la foto |
| PRIV-07 | Baja | Ajustes de privacidad `privacy_*` (recomendaciones, research, marketing) se guardan pero ningún código los consume |
| PRIV-08 | Baja | El cron de borrado físico es silencioso si faltan los secretos de Vault: las cuentas en `deleted_at` nunca se borran sin que nadie lo note |
| PRIV-09 | Baja | `terms_accepted_at` se guarda sin versión del documento aceptado |
| PRIV-10 | Info | Logs de Edge Functions imprimen el email del destinatario cuando Brevo omite un envío |
| PRIV-11 | Info | Datos enviados a terceros (Stripe, Brevo, Google Maps): mínimos; inventario abajo |

Positivos verificados: bucket `profile-photos` **privado** con RLS por carpeta `auth.uid()`; la foto se recorta y re-codifica con `<canvas>` → JPEG (`src/lib/photo-crop.ts:81-84`), lo que **elimina EXIF/GPS**; `partner_guest_list` oculta email/teléfono/emergencia en reservas canceladas; Stripe recibe solo `email` + `member_id` (`_shared/stripe-context.ts:66-69`); datos de tarjeta solo en Stripe Elements.

---

## 1. Inventario y clasificación del dato

Clasificación: **ID directo** (identifica por sí solo), **Cuasi** (identifica combinado), **Seudónimo** (id interno/externo), **Sensible** (afecta a terceros o categoría delicada).

| Tabla.columna | Clase | Uso en UI (grep) | Quién lo lee |
|---|---|---|---|
| `auth.users.email` | ID directo | login, perfil, partner, admin | propio; partner vía RPC (PRIV-04); admin; `anon` vía SEC-05 |
| `profiles.full_name` | ID directo | perfil, partner, recepción, admin | propio (RLS); partner/recepción/admin vía RPC definer |
| `profiles.phone` | ID directo | perfil, `partner_guest_list`, búsqueda admin | propio; partner (reserva abierta); admin |
| `profiles.photo_url` + `storage profile-photos/<uid>/…` | ID directo (biométrico débil) | perfil, admin | propio + admin (policy `admin select profile photos`) |
| `profiles.birth_day/birth_month` | Cuasi | perfil (sin año: minimizado) | propio |
| `profiles.city`, `travel_cities`, `job_title`, `industry`, `company`, `interests` | Cuasi | onboarding/perfil | propio; admin |
| `profiles.emergency_contact_name/relation/phone` | **Sensible (dato de tercero)** | recepción y guest detail | propio; partner (reserva abierta, si el miembro lo comparte) |
| `profiles.stripe_customer_id` | Seudónimo | servidor | propio; Edge Functions |
| `profiles.referral_code` | Seudónimo (lleva iniciales) | referidos | propio |
| `profiles.preferred_amenities`, `privacy_*` | Preferencia | preferencias/privacidad | propio |
| `profiles.terms_accepted_at`, `deleted_at` | Metadato de consentimiento/estado | — | propio |
| `bookings.special_requests` | Texto libre (puede contener salud/dieta) | reserva, recepción, partner, emails | propio; partner; Brevo |
| `bookings.*` (lounge, fecha, hora, check-in, no-show) | Cuasi / comportamiento y ubicación | my-pass, partner, admin | propio; partner (su lounge); admin |
| `payments.stripe_*_id`, importes, plan | Seudónimo financiero | historial, admin | propio; admin |
| `memberships` | Estado contractual | membership | propio; admin |
| `referrals.referee_name/referee_email` | ID directo del amigo | `/profile` referidos | referrer y referee |
| `referral_shares.channel` | Comportamiento | — (solo analítica) | propio |
| `notifications.body` | Puede incluir lounge/fecha | campana | propio |
| `support_tickets.note/resolution_note`, `support_ticket_messages.body` | Texto libre | admin | solo admin |
| `login_attempts.email` | ID directo | lockout | `anon` vía RPC (SEC-03) |
| `partner_members.first_name/last_name/email/photo_path` | ID directo (staff partner) | partner team | partner org; admin |
| `partners.contact_email`, `address_*`; `lounges.phone/email/address/lat/lng` | Dato de empresa (no personal salvo autónomo) | público/explore | público |
| `scheduled_reports.recipients` | ID directo (admins) | admin reports | admin |

No hay columnas de IP, user-agent ni geolocalización del miembro: la ubicación del miembro solo se infiere de sus reservas y de `city`.

---

## 2. Hallazgos

### PRIV-02 — Borrado de cuenta incompleto fuera de Postgres y destructivo dentro (Alta, Confirmado)

- **Dónde:** `supabase/functions/delete-account/index.ts:73` (`auth.admin.deleteUser`), `supabase/schemas/account_deletion.sql`.
- **Evidencia (FK consultadas en local):** `profiles, bookings, payments, notifications, support_tickets, member_favorite_lounges, user_roles, partner_members → auth.users ON DELETE CASCADE`; `memberships, referrals (ambos lados), referral_shares, day_pass_redemptions → profiles CASCADE`. La función no toca `storage.objects`, ni Stripe, ni Brevo.
- **Qué queda:** (a) foto en `profile-photos/<uid>/…` huérfana (Storage no tiene FK a `auth.users`); (b) cliente de Stripe con email y métodos de pago guardados (`stripe_customer_id`); (c) contactos/logs transaccionales en Brevo (no se crean contactos explícitos; solo logs de envío).
- **Qué se pierde de más:** `payments` (incluidos cobros de no-show/cancelación) y `bookings` se borran en cascada → se pierde el registro contable/antifraude que normalmente debe retenerse; `referrals` del **referrer** desaparece cuando el amigo borra su cuenta (pierde historial/premio). `support_tickets` del miembro también desaparecen.
- **Impacto:** el miembro cree que "your data is erased" pero sus datos siguen en Storage y Stripe; a la vez el negocio pierde registros financieros sin política explícita.
- **Remediación:** en `delete-account`: borrar `profile-photos/<uid>/` con el cliente service; `stripe.customers.del(stripe_customer_id)` (o anonimizar); cambiar FKs de `payments`/`bookings` a `SET NULL` + anonimizar en lugar de cascada (decisión de retención con el cliente); `referrals.referee_id` a `SET NULL` conservando la fila anonimizada.
- **Cierre:** test de la función: tras el borrado no hay objetos bajo `<uid>/`, el customer de Stripe test está borrado, y `payments` del miembro persiste anonimizado (o la política escrita dice lo contrario).

### PRIV-03 — Preferencias de notificación no persistidas ni respetadas (Media, Confirmado)

- **Dónde:** `src/app/profile/notifications/page.tsx:23-33` (`React.useState(NOTIFICATION_CHANNEL_SETTINGS)`, sin escritura); crons `send-booking-reminders`, `send-morning-notifications`, `send-partner-morning-digest`.
- **Evidencia:** no existe columna/tabla de preferencias de canal ni horas de silencio (`grep notif|email_` en `profiles.sql` vacío). Los toggles se pierden al recargar; las funciones de envío no consultan preferencias.
- **Impacto:** el miembro "desactiva" emails o fija horas de silencio y sigue recibiéndolos. Además el único mecanismo de pausa (`email_pause`) es global/admin, no por usuario.
- **Remediación:** tabla `notification_preferences` (RLS propia) y filtro en los despachadores SQL/Edge Functions, salvo los transaccionales que la copy declara obligatorios ("Anything about a live booking always reaches you by email").
- **Cierre:** test: preferencia email off para recordatorios → `dispatch` no encola el envío; preferencia persiste tras recarga.

### PRIV-04 — Partners ven el email de todos sus huéspedes históricos (Media, Confirmado)

- **Dónde:** `supabase/schemas/partner_analytics.sql:90-133` (`partner_repeat_guests`, `grant … to authenticated`, autorizado por `partner_lounge_ids()`).
- **Evidencia:** devuelve `member_name` y `u.email` agrupado por miembro sobre todas las reservas, sin filtro de estado ni de antigüedad — contradice la regla de `partner_guest_list` ("contact details are shown while the booking is open").
- **Impacto:** un partner puede construir una lista de emails de clientes LuxePass (posible uso de marketing propio fuera de la plataforma).
- **Remediación:** devolver solo nombre (o iniciales) + `member_id` seudónimo; si el email es necesario, limitarlo a reservas abiertas y al toggle de privacidad.
- **Cierre:** test: `partner_repeat_guests` no devuelve email para reservas cerradas/canceladas.

### PRIV-05 — Sin política de retención ni jobs de limpieza (Media, Confirmado)

- **Dónde:** `cron.job` local: solo `send-booking-reminders`, `dispatch-account-deletions`, `send-morning-notifications`, `send-partner-morning-digest`, `dispatch-scheduled-reports`, `dispatch-membership-renewals`.
- **Evidencia:** `login_attempts` (`login_attempts.sql:10`, PK = email en claro) no se purga salvo login exitoso: guarda emails de cualquiera que se haya equivocado, incluso no miembros. `support_tickets`/`support_ticket_messages`, `notifications`, `referral_shares`, `net._http_response` (pg_net guarda cuerpos de respuesta) sin expiración.
- **Remediación:** cron de limpieza: `login_attempts` con `updated_at < now() - 24h`; notificaciones leídas > N meses; tickets resueltos > N años (decidir con el cliente); revisar `net._http_response`.
- **Cierre:** job programado + test que verifica la purga; tabla de retención documentada en `ARCHITECTURE.md`.

### PRIV-06 — Exportación de datos parcial (Media, Confirmado)

- **Dónde:** `src/lib/profile.ts:368-395` (`exportMemberData`).
- **Evidencia:** exporta `profiles`, favoritos, `bookings` (sin `special_requests`) y `notifications`. Omite `payments`, `memberships`, `referrals`, `referral_shares`, `support_tickets` (ni siquiera legibles por el miembro vía RLS) y la foto. `delete-account-modal.tsx:61` dice que tras borrar ya no se puede pedir.
- **Remediación:** RPC `export_my_data()` definer que agregue todas las tablas con `member_id = auth.uid()` (incluido soporte) + URL firmada de la foto.
- **Cierre:** test: el JSON exportado contiene una clave por cada tabla con FK al miembro (lista derivada de §1).

### PRIV-07 — Ajustes `privacy_*` sin consumidor (Baja, Confirmado)

- **Dónde:** `profiles.sql:51-55`. `privacy_personalized_recommendations`, `privacy_product_research`, `privacy_marketing_analytics` solo se leen/escriben en `src/lib/profile.ts`. Hoy no hay analítica ni marketing que los ignore (no se encontró SDK de analítica), así que el riesgo es futuro: cualquier integración nueva debe filtrar por ellos. Defaults: recomendaciones `true` (opt-out), marketing/research `false` (opt-in) — correcto.
- **Cierre:** documentar en `ARCHITECTURE.md` que toda integración de marketing/analítica consulta estas columnas; test cuando exista el consumidor.

### PRIV-08 — Borrado físico silencioso si faltan secretos (Baja, Inferido)

- **Dónde:** `account_deletion.sql` (`dispatch_account_deletions`: `if v_url is null or v_secret is null then return;`).
- **Impacto:** en un entorno sin los secretos dados de alta (ver `docs/ci-cd/VAULT-SECRETS.md`; `supabase db reset` los borra) las cuentas quedan soft-deleted indefinidamente, incumpliendo "erased after 30 days" sin alerta. No verificado en remotos (sin acceso).
- **Remediación:** `raise warning`/fila en una tabla de salud, o alerta si existen perfiles con `deleted_at < now() - 31 days`.
- **Cierre:** consulta de monitorización documentada y sin filas en staging/prod.

### PRIV-09 — Consentimiento sin versión (Baja, Confirmado)

- **Dónde:** `profiles.terms_accepted_at` (`profiles.sql:23`), escrito desde `src/app/signup/page.tsx:91` vía metadatos de Auth.
- **Evidencia:** se guarda la fecha pero no qué versión de Términos/Privacidad se aceptó; no hay consentimiento separado de marketing al registrarse (correcto que no esté pre-marcado).
- **Remediación:** `terms_version text` junto a la fecha; re-aceptación cuando cambie.

### PRIV-10 — Email en logs de Edge Functions (Info, Confirmado)

- **Dónde:** `supabase/functions/_shared/brevo.ts:36` — `console.log(\`brevo: skipped ${to} …\`)`. Solo en envíos omitidos (CI/local/destinatarios de test), por lo que en prod el impacto es bajo. Errores devueltos al cliente: ver SEC-07.
- **Remediación:** enmascarar (`a***@dominio`).

### PRIV-11 — Datos personales a terceros (Info, Confirmado)

| Tercero | Qué recibe | Fuente |
|---|---|---|
| Stripe | email, `member_id` (metadata), lounge/plan, `special_requests` en metadata de `stripe-charge-saved-method` | `_shared/stripe-context.ts:66`, `stripe-charge-saved-method/index.ts:63-69` |
| Brevo | email destinatario, nombre, lounge, fecha, `special_requests` (recibo/recordatorio), datos de huéspedes en emails al partner | `send-booking-receipt`, `send-booking-reminder`, `_shared/partner-emails.ts` |
| Google Maps | IP/navegador del visitante al cargar tiles; no se envía ubicación del usuario desde código | `src/components/explore/*` |

`special_requests` (texto libre, potencialmente datos de salud/dieta) viaja a Stripe metadata sin necesidad: **recomendación** quitarlo de la metadata de Stripe.

---

## 3. Cobertura del checklist §4

| Punto | Estado |
|---|---|
| Inventario y clasificación | Hecho (§1) |
| Quién lee cada dato (RLS / definer) | Parcial — PRIV-04 |
| Borrado de cuenta | Fallo — PRIV-02, PRIV-08 |
| PII en logs/emails/errores/terceros | OK con reservas — PRIV-10, PRIV-11, SEC-07 |
| Consentimiento y preferencias | Parcial — PRIV-03, PRIV-07, PRIV-09 |
| Retención | Fallo — PRIV-05 |
| Exportación / acceso | Parcial — PRIV-06 |
| Storage (público/privado, EXIF) | OK — `profile-photos` privado, EXIF eliminado por re-codificación; `lounge-images` público (solo contenido de empresa) |
