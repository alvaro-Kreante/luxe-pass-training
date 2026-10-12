# Auditorías técnicas — LuxePass

Auditorías read-only con el método `engineering:project-audit` de Kreante. Ronda 1: 2026-10-12, sobre `dev` @ `eae116a`.

| Informe | Categoría | Critical | High | Medium | Low | Info |
|---|---|---|---|---|---|---|
| [seguridad-y-datos.md](seguridad-y-datos.md) | Seguridad, RLS, Edge Functions, Stripe | 1 | 2 | 2 | 4 | 2 |
| [ci-cd-y-entornos.md](ci-cd-y-entornos.md) | GitHub, CI/CD, entornos, operación | 1 | 4 | 4 | 3 | 1 |
| [calidad-y-testing.md](calidad-y-testing.md) | Calidad de código y tests | 0 | 1 | 3 | 3 | 2 |
| [frontend-rendimiento-y-accesibilidad.md](frontend-rendimiento-y-accesibilidad.md) | React/Next, bundle, a11y | 0 | 2 | 2 | 2 | 0 |

## Pendientes

- E2E de flujos críticos en Staging
- Accesibilidad completa y contraste del tema oscuro
- Privacidad y datos personales
- Rendimiento medido (First Load JS, Web Vitals)
- Base de datos: índices y queries
- Idioma técnico y nomenclatura
