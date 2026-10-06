# Story 10.3: Crear y editar un partner

## User Story
Como administrador, quiero crear un partner con sus datos y sus usuarios y editarlos después, para preparar la organización antes de darle acceso.

## Acceptance Criteria
- [ ] El partner se crea en estado `draft` con nombre, email de contacto y dirección central como campos de texto
- [ ] La ciudad principal se obtiene de la dirección central
- [ ] El email de contacto y el email del representante son campos distintos; pueden coincidir
- [ ] El detalle muestra una tabla de usuarios partner (nombre, apellido, email, teléfono, estado)
- [ ] Se pueden añadir usuarios con la misma lógica del formulario de partners del lounge (campos obligatorios, email no repetido)
- [ ] Cada cuenta tiene un solo rol (miembro, partner o admin): un email que ya existe en la base de datos, con cualquier rol, se rechaza; el usuario partner siempre es una cuenta nueva
- [ ] Cada fila tiene un botón lápiz para editar nombre, apellido y teléfono; el email no es editable
- [ ] El primer usuario añadido queda como representante
- [ ] Se puede cambiar el representante a otro usuario mediante un botón
- [ ] No se puede borrar al representante mientras haya otros usuarios: primero hay que elegir uno nuevo
- [ ] En `draft`, añadir usuarios no envía ningún email
- [ ] El detalle lista los lounges del partner con su status y un botón para abrir cada uno en la vista de lounge existente

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.3".
