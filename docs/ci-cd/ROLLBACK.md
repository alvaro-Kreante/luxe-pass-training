# Volver atrás un release

CI-05 (`docs/audit/ci-cd-y-entornos.md`). Cada deploy a producción deja un tag `release-AAAAMMDD-HHMM` sobre el commit desplegado (último paso de `migrate-prod` en `.github/workflows/deploy.yml`). Es el punto de referencia para volver atrás.

## Qué se puede revertir y qué no

| Pieza | ¿Se revierte? | Cómo |
|---|---|---|
| Frontend (Vercel) | Sí, al instante | Vercel → proyecto → Deployments → el deploy del tag anterior → **Promote to Production** |
| Edge Functions | Sí | Lanzar `Deploy` a mano (`workflow_dispatch`) desde una rama que apunte al tag anterior, vía PR normal (ver abajo) |
| Base de datos | **No** | Las migraciones son solo hacia delante: se corrige con una migración nueva |

## Procedimiento

1. **Cortar el daño:** en Vercel, *Promote to Production* del deploy anterior. No toca la base de datos y dura segundos.
2. **Decidir sobre la base de datos.**
   - Si el release solo añadió cosas (columnas, funciones, tablas nuevas), el código anterior sigue funcionando sobre la base nueva: no hay que hacer nada.
   - Si cambió o borró algo que el código anterior necesita, se escribe la corrección en `supabase/schemas/`, se genera la migración y entra por PR como cualquier fix (`fix/*` → `dev` → `staging` → `main`).
   - Pérdida de datos: restaurar desde backup o PITR en el Dashboard de Supabase. Sobrescribe todo lo escrito después del punto elegido, así que es el último recurso y lo decide quien responde del proyecto.
3. **Revertir el código en git:** `git revert` de los commits del release en una rama `fix/*`, por PR hasta `main`. Al llegar a `main`, el deploy normal vuelve a publicar Vercel y las Edge Functions de ese estado.

## Para que un release sea reversible

- **Migraciones expand/contract:** primero se añade lo nuevo, en un release posterior se quita lo viejo. Nunca renombrar ni borrar en el mismo release que empieza a usar el reemplazo.
- **Backup antes de cada release a `main`:** comprobar en el Dashboard de `luxepass-prod` que hay un backup reciente (o PITR activo) antes de mergear `staging` → `main`.
- **El deploy solo sale con CI en verde** (CI-02): un release nunca debería necesitar rollback por un test rojo.
