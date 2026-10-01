# Flow: Partner Organizations

**Covers:** [Epic 10 - Partner Organizations](../epic-10-partner-organizations/) — amplía Epic 7 (Partner Dashboard) y Epic 8 (Admin)

## Diagram

```mermaid
flowchart TD
    subgraph Story102["Story 10.2 - Listado de partners"]
        PartnersTab["Admin: pestaña Partners"] --> PartnersList["Listado: nombre, status, nº lounges, representante, ciudad"]
        PartnersList --> SearchFilter["Buscar por nombre / filtrar por status"]
    end

    subgraph Story103["Story 10.3 - Crear y editar partner"]
        NewPartner["Crear partner (draft)"] --> PartnerData["Datos: nombre, email contacto, dirección central"]
        PartnerData --> AddUsers["Añadir usuarios partner (sin emails en draft)"]
        AddUsers --> Representative["Primer usuario = representante; se puede cambiar"]
        Representative --> EditUser["Editar usuario (todo menos email)"]
        EditUser --> PartnerLounges["Lounges del partner → abrir vista de lounge"]
    end

    subgraph Story104["Story 10.4 - Activar y suspender"]
        Activate{"¿Tiene ≥1 usuario?"} -->|Sí| Active["Partner active → emails de crear contraseña"]
        Activate -->|No| Blocked["No se puede activar"]
        Active --> Suspend["Suspender partner → lounges suspendidos, usuarios sin acceso"]
        Suspend --> Reactivate["Reactivar → antes publicados vuelven a draft, suspendidos a mano siguen suspendidos, draft sigue draft"]
    end

    subgraph Story105["Story 10.5 - Lounge asociado a partner"]
        NewLounge["Crear lounge"] --> PickPartner{"¿Existe el partner?"}
        PickPartner -->|Sí, incluso draft| Assign["Asociar partner (solo lectura en el lounge)"]
        PickPartner -->|No| CreateFirst["Aviso: crear el partner primero"]
        Assign --> Publish{"¿Partner active?"}
        Publish -->|Sí| Live["Lounge publicado (sin emails)"]
        Publish -->|No| CannotPublish["No se puede publicar"]
    end

    subgraph Story106["Story 10.6 - Selector de lounge en /partner"]
        PartnerLogin["Login partner"] --> Header["Cabecera: partner fijo + desplegable de lounges"]
        Header --> SavedChoice["Elección guardada en la cuenta"]
        SavedChoice --> Today["Today / check-in: un lounge"]
        SavedChoice --> Analytics["Analytics, Guests, Reports: un lounge o All lounges"]
    end

    subgraph Story107["Story 10.7 - Notificaciones"]
        BookingEvent["Reserva / cancelación / digest"] --> AllUsers["Email a todos los usuarios activos del partner"]
    end

    subgraph Story108["Story 10.8 - Vista del miembro"]
        MemberViews["Explore, ficha, reserva, pase, emails"] --> PartnerName["Nombre del partner como contexto"]
    end

    SearchFilter --> NewPartner
    PartnerLounges --> Activate
    CreateFirst --> NewPartner
    Active --> Publish
    Live --> MemberViews
    Live --> BookingEvent
    Active --> PartnerLogin
```

## Story Segments

| Story | Segment in diagram |
|---|---|
| [Story 10.1 - Modelo de organización partner](../epic-10-partner-organizations/story-10.1-modelo-organizacion-partner.md) | Transversal: modelo de datos y permisos que soportan todos los nodos |
| [Story 10.2 - Listado de partners](../epic-10-partner-organizations/story-10.2-listado-de-partners.md) | Subgraph "Story 10.2": `Admin: pestaña Partners` → `Buscar / filtrar` |
| [Story 10.3 - Crear y editar partner](../epic-10-partner-organizations/story-10.3-crear-y-editar-partner.md) | Subgraph "Story 10.3": `Crear partner` → `Lounges del partner` |
| [Story 10.4 - Activar y suspender](../epic-10-partner-organizations/story-10.4-activar-y-suspender-partner.md) | Subgraph "Story 10.4": `¿Tiene ≥1 usuario?` → `Reactivar` |
| [Story 10.5 - Lounge asociado a partner](../epic-10-partner-organizations/story-10.5-lounge-asociado-a-partner.md) | Subgraph "Story 10.5": `Crear lounge` → `Lounge publicado` |
| [Story 10.6 - Selector de lounge](../epic-10-partner-organizations/story-10.6-selector-de-lounge-partner.md) | Subgraph "Story 10.6": `Login partner` → `Analytics…` |
| [Story 10.7 - Notificaciones](../epic-10-partner-organizations/story-10.7-notificaciones-al-partner.md) | Subgraph "Story 10.7" |
| [Story 10.8 - Vista del miembro](../epic-10-partner-organizations/story-10.8-partner-en-la-vista-del-miembro.md) | Subgraph "Story 10.8" |

## Notes

- Orden de implementación: 10.1 primero; luego 10.2 → 10.3 → 10.4 → 10.5; 10.6, 10.7 y 10.8 dependen solo de 10.1.
- Sin artboard previo para 10.2, 10.3, 10.4 y 10.6: se diseñan con `/design` en `docs/design/epic-10-partner-organizations/` antes de implementar.
