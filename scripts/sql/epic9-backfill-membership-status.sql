-- Epic 9 — corrección de datos, una sola vez por proyecto remoto
-- (luxepass-dev, luxepass-prod), DESPUÉS de que CI haya aplicado las
-- migraciones de Epic 9. Se ejecuta a mano en Studio → SQL Editor (no es una
-- migración: las migraciones declarativas no llevan cambios de datos).
--
-- Por qué: hasta Epic 9, `profiles.membership_status` nacía 'active' para
-- todo el mundo aunque nadie pagara un plan. Desde Epic 9 es un espejo de
-- `memberships` y un miembro nace 'inactive' hasta elegir plan. Las cuentas
-- creadas antes conservan 'active' sin fila en `memberships`: el admin las
-- ve como "Active member" mientras su propia página de membresía dice
-- "Inactive".
--
-- Decisión del usuario (23 sept 2026, opción A): dejarlas sin plan. No se
-- les bloquea nada — siguen entrando, viendo lounges y reservando; cada
-- visita se paga como day pass, igual que una cuenta nueva.
--
-- Idempotente: volver a ejecutarlo no cambia nada.
update public.profiles p
set membership_status = 'inactive', updated_at = now()
where p.membership_status = 'active'
  and not exists (
    select 1 from public.memberships m
    where m.member_id = p.id and m.status = 'active'
  );
