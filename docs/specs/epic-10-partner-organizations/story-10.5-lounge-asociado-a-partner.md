# Story 10.5: Lounge asociado a un partner

## User Story
Como administrador, quiero asociar cada lounge a un partner, para saber quién lo opera y controlar cuándo puede publicarse.

## Acceptance Criteria
- [ ] El listado de lounges muestra el nombre del partner de cada lounge
- [ ] Al crear o editar un lounge en borrador se elige su partner entre los existentes, incluidos los que están en `draft`
- [ ] Si el partner aún no existe, el formulario avisa de que hay que crearlo primero y enlaza a su creación
- [ ] Un lounge en borrador puede guardarse sin partner
- [ ] Un lounge solo se puede publicar si tiene partner y ese partner está `active`
- [ ] Publicar un lounge no envía emails de creación de contraseña
- [ ] El detalle del lounge muestra el nombre del partner; no es editable desde el lounge
- [ ] El nombre del partner enlaza a su detalle
- [ ] La gestión de usuarios partner sale del lounge y vive solo en el detalle del partner

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.5".
