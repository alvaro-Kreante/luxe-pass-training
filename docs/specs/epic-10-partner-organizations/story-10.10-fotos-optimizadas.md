# Story 10.10: Fotos del lounge optimizadas al subirlas

## User Story
Como admin, quiero que las fotos del lounge se reduzcan al subirlas, para que la app cargue rápido sin preparar las imágenes a mano.

## Acceptance Criteria
- [ ] Al crear o editar un lounge, cada foto se redimensiona y comprime en el navegador antes de subirla
- [ ] Una foto más grande que el tamaño máximo se reduce manteniendo su proporción; una más pequeña no se agranda
- [ ] El resultado pesa menos que el original o, si no, se sube el original
- [ ] Un archivo que no es una imagen se rechaza con un mensaje claro
- [ ] El admin ve el progreso mientras se optimiza y sube cada foto

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.10".
