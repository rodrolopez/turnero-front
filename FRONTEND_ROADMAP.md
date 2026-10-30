# Especificación Técnica V1 — Frontend Barbería Multitenant

**Estado:** Especificación para inicialización y desarrollo del proyecto.
**Ubicación:** Carpeta `frontend` (al mismo nivel que `turnero`).
**Objetivo:** Construir un dashboard administrativo para la barbería y un widget público de reservas que consuma la API REST existente.

## 1. Stack Tecnológico
- **Core:** React 18 + Vite + TypeScript (strict: true).
- **Estilos:** Tailwind CSS v3 o v4.
- **Enrutamiento:** React Router v6.
- **Llamadas a la API:** Axios, administrado con TanStack Query (React Query) para caché y estado del servidor.
- **Estado Global:** Zustand (sólo para guardar el JWT, el tenantId activo y datos del usuario).
- **Formularios:** React Hook Form + Zod (para compartir validaciones conceptuales con el backend).
- **Manejo de Fechas:** date-fns.

## 2. Arquitectura de Integración (API Backend)
- **URL Base de la API:** `http://localhost:3002/v1`
- **Interceptores de Axios:**
  - Inyectar siempre el header `Authorization: Bearer <token>` si existe en el estado (Zustand/localStorage).
  - Inyectar el header `X-Tenant-Id: <tenantId>` en las rutas protegidas del dashboard.
  - Manejar silenciosamente los errores `401 Unauthorized` redirigiendo al login.

## 3. Plan de Implementación por Fases
El agente debe seguir este orden para construir la aplicación paso a paso:

**Fase 1: Setup e Infraestructura Base**
- El proyecto ya fue inicializado con Vite. Instalar dependencias faltantes (Tailwind, React Router, Axios, Zustand, React Query, Zod, React Hook Form, date-fns, uuid).
- Configurar el enrutador base con dos layouts: `PublicLayout` (para el widget de reservas) y `DashboardLayout` (para la administración).
- Configurar la instancia global de Axios en `src/api/client.ts`.

**Fase 2: Autenticación y Selección de Tenant**
- Crear pantallas de Login y Registro conectadas a `/v1/auth/login` y `/v1/auth/register`.
- Tras el login, llamar a `/v1/tenants/me`. Si el usuario tiene un tenant, guardarlo en Zustand y redirigir al Dashboard. Si no tiene, mostrar pantalla para crear una empresa (Llamada a `POST /v1/tenants`).

**Fase 3: Dashboard de Catálogos (CRUDs)**
- Crear las vistas administrativas para consumir la API:
  - Listado y creación de Sucursales (`/v1/branches`).
  - Listado y creación de Servicios (`/v1/services`).
  - Listado y creación de Profesionales (`/v1/professionals`).

**Fase 4: Configuración de Horarios**
- Crear la interfaz para definir los horarios comerciales de la sucursal (`PUT /v1/branches/:branchId/hours`) de Lunes a Domingo.
- Asignar horarios a los profesionales (`PUT /v1/professionals/:professionalId/assignments`).

**Fase 5: Widget Público de Reservas (El "Turnero")**
- Crear el flujo público en `/:tenantSlug/reservar`:
  1. Mostrar selector de servicios y sucursales (vía `GET /v1/public/:tenantSlug/catalog`).
  2. Mostrar selector de profesional: permitir elegir uno específico (`mode: "specific"`) o la opción "Cualquiera disponible" (`mode: "any"`).
  3. Mostrar un calendario. Al seleccionar un día, llamar a `GET /v1/public/:tenantSlug/availability`.
  4. Mostrar los horarios (slots) disponibles.
  5. Formulario final (nombre, email, teléfono) y ejecución de `POST /v1/public/:tenantSlug/appointments`.
  6. **CRÍTICO:** Generar un UUID en el cliente al montar el formulario e inyectarlo en el header `Idempotency-Key` de Axios para evitar reservas duplicadas por "doble clic". Manejar el error HTTP 409 Conflict si PostgreSQL rebota por concurrencia.

**Fase 6: Agenda y Gestión (Dashboard)**
- Crear la vista principal del administrador/staff donde se vean los turnos del día.
- Implementar botones de acción para gestionar la agenda usando los endpoints transaccionales:
  - `POST /v1/appointments/:id/confirm` (para aprobar turnos pendientes).
  - `POST /v1/appointments/:id/cancel` (para cancelar y liberar la disponibilidad de los recursos instantáneamente).