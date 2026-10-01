# Story 10.4: Activar, suspender y gestionar el acceso de un partner

## User Story
Como administrador, quiero decidir cuándo un partner y sus usuarios reciben acceso, y poder retirarlo, para controlar qué organizaciones operan en LuxePass.

## Acceptance Criteria
- [ ] Un partner en `draft` solo se puede activar si tiene al menos un usuario
- [ ] Al activar el partner se envía a cada usuario el email para crear su contraseña
- [ ] Un usuario añadido a un partner ya `active` recibe el email al momento
- [ ] Por usuario se mantiene: suspender, reactivar, borrar y reenviar invitación — también para el representante
- [ ] Borrar al representante exige elegir antes uno nuevo si quedan otros usuarios
- [ ] Un partner `active` puede quedarse sin usuarios
- [ ] Suspender un partner suspende todos sus lounges y deshabilita el acceso de todos sus usuarios
- [ ] El admin puede suspender y reactivar un lounge individual
- [ ] Al reactivar un partner: los lounges que estaban publicados antes de suspenderlo vuelven a draft, los que el admin suspendió individualmente siguen suspendidos y los draft siguen en draft
- [ ] Cada acción destructiva (suspender, borrar) pide confirmación

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.4".

## Notes
- Publicar un lounge ya no envía invitaciones: solo activar el partner lo hace.
- Hoy los lounges solo tienen `live` / `draft` / `archived`: esta historia añade el estado `suspended` al lounge.
