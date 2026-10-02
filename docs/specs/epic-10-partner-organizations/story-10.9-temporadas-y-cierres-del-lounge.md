# Story 10.9: Temporadas y cierres especiales del lounge

## User Story
Como admin, quiero definir horarios de temporada y cierres especiales al crear o editar un lounge, para que los miembros vean y reserven solo cuando el lounge abre de verdad.

## Acceptance Criteria
- [ ] Al crear o editar un lounge, el admin puede añadir, editar y borrar temporadas: un periodo (desde/hasta) con su propio horario semanal
- [ ] Durante una temporada, su horario reemplaza al habitual en la disponibilidad, la ficha del lounge, `/explore` y la reserva
- [ ] Dos temporadas del mismo lounge no pueden solaparse; la fecha de fin no puede ser anterior a la de inicio
- [ ] Al crear o editar un lounge, el admin puede añadir, editar y borrar cierres especiales: un periodo con motivo y fecha de reapertura
- [ ] Un día de cierre especial no admite reservas y la ficha muestra el aviso de cierre (Story 3.2)
- [ ] Un cierre que cae sobre reservas ya confirmadas avisa al admin de cuántas son antes de guardarlo
- [ ] Solo el admin puede escribir temporadas y cierres; el partner y el miembro solo los leen
- [ ] En un lounge live, los cambios se aplican sin pasarlo a draft

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.9".
