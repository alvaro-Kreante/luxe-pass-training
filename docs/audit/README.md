# Auditorías técnicas — LuxePass

Auditorías read-only con el método `engineering:project-audit` de Kreante. Rondas 1–3: 2026-10-12, sobre `dev` @ `eae116a`.

**Solo hallazgos abiertos.** Los corregidos (PRs #50–#66, 13–15 oct 2026) se borraron de los informes; su diagnóstico y cómo se arreglaron quedan en `docs/PENDIENTES.md` (filas con el ID del hallazgo) y en cada PR. SEC-03/E2E-03 y PAY-08 siguen abiertos solo en la parte que falta.

| Informe | Categoría | Critical | High | Medium | Low | Info |
|---|---|---|---|---|---|---|
| [seguridad-y-datos.md](seguridad-y-datos.md) | Seguridad, RLS, Edge Functions, Stripe | 0 | 1 | 1 | 4 | 2 |
| [ci-cd-y-entornos.md](ci-cd-y-entornos.md) | GitHub, CI/CD, entornos, operación | 1 | 1 | 4 | 3 | 1 |
| [calidad-y-testing.md](calidad-y-testing.md) | Calidad de código y tests (+ anexo `npm test`) | 0 | 1 | 3 | 3 | 2 |
| [frontend-rendimiento-y-accesibilidad.md](frontend-rendimiento-y-accesibilidad.md) | React/Next, bundle, a11y (revisión de código) | 0 | 2 | 2 | 2 | 0 |
| [e2e-flujos-criticos.md](e2e-flujos-criticos.md) | E2E local de flujos críticos | 0 | 1 | 4 | 4 | 0 |
| [pagos-y-logica-de-negocio.md](pagos-y-logica-de-negocio.md) | Pagos, reembolsos, membresía, referidos | 0 | 0 | 4 | 5 | 1 |
| [privacidad-y-datos-personales.md](privacidad-y-datos-personales.md) | Datos personales, borrado, retención | 0 | 1 | 4 | 3 | 2 |
| [cumplimiento-de-specs.md](cumplimiento-de-specs.md) | Criterios de aceptación (117/154 cumplen en Epics 1–9) | 0 | 1 | 5 | 4 | 1 |
| [base-de-datos.md](base-de-datos.md) | Índices, rendimiento RLS, crons, Realtime | 0 | 0 | 3 | 6 | 3 |
| [rendimiento-y-accesibilidad-medidos.md](rendimiento-y-accesibilidad-medidos.md) | Métricas por ruta, axe, teclado, zoom | 0 | 3 | 7 | 5 | 0 |
| [dependencias-y-supply-chain.md](dependencias-y-supply-chain.md) | npm audit, paquetes, imports de Deno | 0 | 0 | 3 | 5 | 2 |

Scripts y logs de las pruebas: `scripts/playwright/audit-e2e/` y `scripts/playwright/audit-perf-a11y/` (las capturas no se versionan).

## Pendientes

- E2E en Staging (requiere cuentas creadas por el equipo)
- Idioma técnico y nomenclatura (requiere decidir si el repo es Internal o Client-facing)
- Backups/PITR y observabilidad en los proyectos remotos
