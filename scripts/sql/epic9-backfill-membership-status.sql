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
--
-- Orden: dev en cuanto `staging` tenga Epic 9 desplegado; prod solo después
-- de promocionar `staging` → `main`. Si el proyecto aún no tiene las
-- migraciones de Epic 9 (tabla `memberships`) — p. ej. prod antes de esa
-- promoción —, el bloque de abajo corta con un mensaje claro en vez del
-- críptico "column p.membership_status does not exist".
do $$
begin
  if to_regclass('public.memberships') is null then
    raise exception 'Este proyecto todavía no tiene las migraciones de Epic 9 (falta public.memberships). Ejecuta este script después del deploy de Epic 9 en este entorno.';
  end if;
end;
$$;

update public.profiles p
set membership_status = 'inactive', updated_at = now()
where p.membership_status = 'active'
  and not exists (
    select 1 from public.memberships m
    where m.member_id = p.id and m.status = 'active'
  );
