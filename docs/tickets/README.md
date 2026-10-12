# Tickets

Trabajo pendiente ya investigado y listo para tomar: bugs reproducidos (o con
hipótesis concretas), refactors y mejoras puntuales que no son una historia
nueva de `docs/specs/`.

## Convención

- Un archivo por ticket: `NNN-descripcion-en-kebab.md` (`001-…`, `002-…`), numerado en orden de creación. El número no se reutiliza.
- Cada ticket trae: contexto/síntoma, causas probables, plan de trabajo y **criterios de aceptación** (el contrato para darlo por cerrado).
- Al cerrarlo, cambiar su `Estado` a `Hecho` y enlazar el PR. No borrar el archivo.

| # | Ticket | Estado |
|---|---|---|
| 001 | [Formulario de tarjeta nueva en blanco en el paso de pago](001-booking-new-card-form-blank.md) | Hecho (pendiente de PR) |
| 002 | [Interacciones de tablas y del shell en Admin y Partner](002-admin-partner-table-and-shell-interactions.md) | Hecho (salvo `/partner/guests`) |
