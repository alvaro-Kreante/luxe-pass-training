# Story 10.6: Selector de lounge en el dashboard del partner

## User Story
Como usuario partner, quiero ver el nombre de mi organización y elegir qué lounge consultar, para trabajar con cada edificio sin cambiar de cuenta.

## Acceptance Criteria
- [ ] La cabecera de `/partner` muestra el nombre real del partner y del usuario (no datos fijos)
- [ ] La cabecera tiene un desplegable visible con los lounges del partner
- [ ] El partner no se puede cambiar; solo el lounge
- [ ] La elección de lounge se guarda en la cuenta del usuario y se recupera en cualquier dispositivo y sesión
- [ ] Today (lista de huéspedes, check-in, no-show) funciona siempre sobre un lounge concreto
- [ ] Analytics, Guests y Reports ofrecen además la opción "All lounges", que suma todos los lounges del partner
- [ ] Si el lounge guardado ya no pertenece al partner, se usa otro lounge del partner
- [ ] Un partner sin lounges ve un estado vacío en lugar de un error

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.6".
