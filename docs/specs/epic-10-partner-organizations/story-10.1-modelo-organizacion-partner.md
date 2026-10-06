# Story 10.1: Modelo de organización partner

## User Story
Como administrador de LuxePass, quiero que un partner sea una organización (hotel, spa, club…) con varios lounges y varios usuarios, para reflejar cómo operan realmente los negocios asociados.

## Acceptance Criteria
- [ ] Un partner es una organización con nombre, email de contacto, dirección central (texto) y ciudad principal (derivada de la dirección central)
- [ ] Un partner tiene uno de tres estados: `draft`, `active` o `suspended`; nace en `draft`
- [ ] Un partner puede tener cero o más lounges; cada lounge pertenece como máximo a un partner
- [ ] Un partner puede tener cero o más usuarios partner; cada usuario pertenece a un solo partner
- [ ] Si el partner tiene usuarios, exactamente uno de ellos es el representante
- [ ] Un usuario partner ve los datos (reservas, huéspedes, analíticas) de todos los lounges de su partner y de ningún otro
- [ ] Un usuario de un partner `suspended` no puede acceder al dashboard
- [ ] Un miembro solo puede leer el nombre del partner de un lounge publicado; nunca sus emails ni sus usuarios
- [ ] Las reglas se hacen cumplir en el servidor (RLS/RPC), no solo en la interfaz
- [ ] La base local se vacía de partners, lounges, miembros y todos sus datos dependientes; solo queda el admin, y se cargan datos de ejemplo nuevos (al menos un partner con varios lounges)

## Related Flow
See [flow-partner-organizations.md](../flows/flow-partner-organizations.md) — segment "Story 10.1".

## Notes
- Sustituye el modelo anterior (partner = una persona con un solo lounge, migración `one_lounge_per_partner`).
- Sin Google Maps para la dirección central: es un campo de texto informativo.
