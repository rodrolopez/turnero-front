# Turnero — Frontend

React 19, Vite, TypeScript estricto y Tailwind CSS 4.
Se conserva TypeScript 7 instalado; npm requiere `--legacy-peer-deps` por el rango de compatibilidad declarado por typescript-eslint.

## Desarrollo local

```bash
npm install --legacy-peer-deps
npm run dev
```

Abrir la URL que imprime Vite y entrar a `/login` o `/register`.
La API debe estar ejecutándose en `http://localhost:3002` con PostgreSQL disponible.
En otra terminal, desde `../turnero`, ejecutar `npm run dev`.

La URL de la API tiene como valor predeterminado `http://localhost:3002/v1`.
Para cambiarla, copiar `.env.example` a `.env.local` y editar `VITE_API_URL`.
Las variables `VITE_*` son públicas: no colocar secretos.

```bash
npm run build  # TypeScript y bundle de producción
npm run lint
npm test       # Validaciones de formularios, horarios y contratos HTTP
```

## Fases implementadas

- Instancia Axios con timeout, JWT y `X-Tenant-Id` en endpoints administrativos.
- Zustand persiste usuario, access token y empresa activa en localStorage.
- React Query gestiona datos remotos; su caché se limpia al cambiar sesión o empresa.
- Formularios con React Hook Form, Zod y errores accesibles.
- `/login` y `/register` usan los contratos reales del backend.
- `/tenants` consulta `/v1/tenants/me`: entra automáticamente si hay una sola empresa, permite elegir si hay varias y crear si no hay ninguna.
- `/tenants?switch=1` permite cambiar o crear empresas explícitamente.
- `/dashboard` valida sesión y pertenencia a la empresa activa.
- Un `401` autenticado cierra la sesión y lleva al login; un `401` en login muestra el error de credenciales. El backend todavía no expone un endpoint de renovación de tokens.
- `PublicLayout` prepara las páginas públicas; el widget de reservas pertenece a la fase 5.

## Catálogo y horarios — Fases 3 y 4

- `/dashboard/branches`: sucursales, dirección, zona horaria y horarios comerciales.
- `/dashboard/services`: servicios, duración en múltiplos de 15 minutos y precio.
- `/dashboard/professionals`: profesionales, cuenta opcional, asignaciones de sucursales/servicios y horarios por sucursal.
- Todos los listados incluyen búsqueda por nombre y filtros Activos/Inactivos/Todos.
- Crear y editar usan POST/PATCH y validan las respuestas del servidor con Zod.
- Eliminar implementa **baja lógica** mediante PATCH `{ isActive: false }`: la API no ofrece DELETE. Las reservas y relaciones se conservan. Para restaurar un registro: Mostrar → Inactivos → Editar → activar → Guardar cambios.
- OWNER y ADMIN acceden al catálogo. STAFF sólo accede a su Agenda personal (consulta) y Finanzas personales. Las URLs administrativas redirigen a su Agenda y la API rechaza el acceso con 403.
- Cada día, de lunes a domingo, admite varios tramos sin superposición. Domingo se envía como `weekday: 0`. Sin tramos significa sin atención. No se admiten intervalos que crucen medianoche, conforme al backend.
- Los horarios del profesional se asignan a una sucursal y se interpretan en su zona horaria. Las asignaciones se editan y guardan completas, incluyendo los horarios de todas las sucursales.
- Al quitar una sucursal del profesional, también deben quitarse sus tramos; el formulario señala cualquier relación pendiente.
- Las consultas se identifican por tenant y recurso. Las mutaciones invalidan los datos del catálogo y horarios para actualizar los listados. Se conserva explícitamente el tenant de cada operación en su petición HTTP.
- Los formularios mantienen los datos ante un error de la API. Una respuesta inesperada muestra un aviso y requiere revisar el listado antes de repetir una escritura.

## Reservas públicas — Fase 5

- Ruta `/:tenantSlug/reservar` dentro de PublicLayout, sin autenticación.
- Wizard de cuatro pasos: sucursal/servicio/agenda, profesional o «Cualquiera disponible», calendario/horario y datos del cliente.
- El dashboard muestra el enlace público de la empresa para compartirlo.
- El catálogo público incluye la empresa, sucursales, servicios, profesionales con asignaciones y agendas activas. Una agenda sin restricciones devuelve `professionalIds: null`; una agenda restringida sin profesionales activos devuelve `[]`.
- La reserva requiere una agenda activa compatible con la sucursal (`schedulerId`, contrato existente del backend). Si hay varias se ofrece un selector; si no hay ninguna, se informa que las reservas todavía no están habilitadas. En **Mi empresa → Habilitar reservas online** se puede crear una agenda para una sucursal o para todas, elegir aprobación manual y su plazo, o reactivar una agenda existente. El panel usa `/v1/schedulers` e invalida el catálogo público al guardar.
- El calendario y los horarios se muestran en la zona horaria de la sucursal, aunque el visitante se encuentre en otro huso horario.
- En modo `any`, los horarios se deduplican por instante y la petición conserva `{ mode: "any" }`, para que el backend seleccione al profesional.
- React Query identifica la disponibilidad por empresa, sucursal, servicio, fecha, agenda y selección de profesional; refresca cada 30 segundos. Nunca se pueden seleccionar horarios pasados ni continuar con un slot que ya desapareció.
- El formulario usa React Hook Form y Zod. El teléfono es opcional, de acuerdo con la API. No se guardan los datos personales del cliente en localStorage.
- Se genera un UUID v4 mediante `uuid` al montar el formulario final. Se envía como `Idempotency-Key`, con una sola petición en vuelo y sin reintentos automáticos del POST.
- Si se pierde la respuesta o el resultado es incierto, se bloquean los cambios y «Verificar mi reserva» repite exactamente el payload y la clave originales. Una clave nueva para cada reintento produciría duplicados; por eso solo se renueva al cambiar la reserva.
- Ante `409`, el wizard vuelve al calendario, actualiza la disponibilidad y conserva los datos del cliente. El horario rechazado queda descartado para esa selección.
- El comprobante distingue reservas confirmadas y pendientes de aprobación, y muestra profesional asignado, código y plazo de aprobación cuando corresponde. No promete envíos de email/WhatsApp, todavía simulados por el worker.
- Las pruebas cubren doble clic, reintentos, recuperación ante 409 y zonas horarias, con solicitudes simuladas: `npm test`.

## Agenda administrativa — Fase 6

- `/dashboard` redirige a `/dashboard/agenda`, la pantalla principal. La información de la empresa y su enlace público quedan en `/dashboard/settings` (Mi empresa).
- Grilla horaria con vistas de día y semana (lunes a domingo), filtros por sucursal y profesional, selector de fecha y navegación anterior/siguiente/Hoy.
- En vista diaria, las columnas corresponden a los profesionales asignados a la sucursal, incluyendo quienes no tienen turnos. En vista semanal, las columnas corresponden a los días.
- Los colores distinguen profesionales y permanecen estables al filtrar. Los turnos superpuestos se distribuyen en carriles; los consecutivos pueden compartir un carril. Los profesionales con reservas históricas siguen visibles aunque ya no estén activos o asignados.
- El eje horario comienza en 08:00–22:00 y se amplía para incluir turnos fuera de ese rango. Cada bloque se posiciona con top/height según minutos locales de la sucursal y representa un servicio de la reserva. Los tramos nocturnos se recortan por día sin duplicar el extremo final.
- La grilla tiene scroll vertical y horizontal, encabezados fijos y eje de horas fijo. Se implementa con Tailwind y estilos matemáticos inline, sin librerías de calendario.
- El listado usa `GET /v1/appointments` con `startDate` y `endDate` inclusivos en la zona horaria de cada sucursal. En todas las sucursales, cada tarjeta identifica su zona horaria.
- La respuesta se pagina en bloques de 100 turnos, manteniendo el total del rango. Las sucursales inactivas siguen disponibles como filtro histórico.
- Cada bloque abre un modal con cliente y contacto, sucursal, profesional, todos los servicios y precios guardados en la reserva, horarios y estado. Confirmar y cancelar actúan sobre la reserva completa, aunque se abra desde un solo servicio.
- Se conserva la paginación del listado: el filtro visual por profesional se aplica a los registros de la página actual y la interfaz muestra el recuento correspondiente. Anterior/Siguiente permite recorrer las páginas restantes.
- Confirmar se ofrece para pendientes vigentes; cancelar para pendientes vigentes o confirmados. Vencidos, completados y ausencias se muestran sin acciones incompatibles.
- Cada mutación usa el tenant capturado, bloquea envíos repetidos, solicita confirmación y no se reintenta automáticamente.
- Al confirmar o cancelar se invalidan todas las consultas de agenda del tenant y la disponibilidad pública de esa empresa. Los errores también disparan una actualización, porque confirmar un hold vencido puede devolver 409 después de registrar su expiración.
- Actualización automática cada 30 segundos y botón Actualizar; errores con opción de reintento.
- Los tests de componentes verifican la actualización posterior a confirmar/cancelar, los filtros y el caso de conflicto: `npm test`.
- Las pruebas HTTP/PostgreSQL se ejecutan desde `turnero` con `RUN_DB_TESTS=1 npm test`. Usan fixtures aislados y ROLLBACK; no alteran reservas reales.

## Finanzas: mostrador y cuentas corrientes

- **Agenda (OWNER/ADMIN):** el detalle de un turno pendiente vigente, confirmado o
  completado sin pagar ofrece **Cobrar**. El modal registra efectivo y observaciones.
  **Nuevo Turno Directo (Walk-in)** registra y cobra un servicio ya realizado; pide
  sucursal, servicio, profesional, cliente y una agenda compatible. Si sólo hay una
  agenda compatible se selecciona automáticamente. El precio lo congela el servidor.
- **Profesionales → Editar → Contrato financiero (OWNER):** configurar porcentaje,
  sueldo o alquiler, importe, fecha, ciclo y vigencia. La baja es lógica; reactivar usa
  la misma fila mediante PUT. Se necesita contrato vigente para poder cobrar.
- **Finanzas (`/dashboard/finance`, OWNER):** resumen histórico, saldos por profesional,
  liquidación total de saldos positivos, cobro de deudas negativas, historial paginado
  con filtro por profesional y anulación de recibos. La anulación de un cobro de varios
  profesionales afecta al recibo completo. Un reembolso externo se gestiona aparte.
- **Finanzas (STAFF):** saldo e historial propios, sin bruto ni ganancias del local.
  La API identifica sus profesionales vinculados a la cuenta; las consultas del
  historial se filtran por esos IDs. Sin perfil vinculado no se consulta el historial.
  ADMIN opera caja desde Agenda y no accede al dashboard global ni contratos.

El rol de la empresa activa se sincroniza en Zustand desde `/tenants/me` antes de
mostrar el dashboard. No se persiste como un permiso confiable y se descarta al cambiar
empresa o cerrar sesión. Las queries de finanzas incluyen tenant, rol y usuario en sus
claves; las mutaciones conservan explícitamente el tenant de origen y comprueban roles.

Walk-ins y payouts generan UUID v4 en `Idempotency-Key`. Ante una respuesta de red/5xx
incierta o un recibo inválido, se bloquean la edición y el cierre del modal, y
**Verificar operación** reenvía exactamente el mismo cuerpo y clave. No se reintentan
escrituras automáticamente. Mantener abierta esa ventana hasta resolver el resultado.
Cobros, liquidaciones, anulaciones y contratos invalidan la caché financiera y de agenda.
Los importes usan strings decimales y el formateo/sumas preservan los centavos con BigInt.

El listado del backend `GET /v1/appointments` expone `paymentStatus` y `observations`
para determinar las acciones de caja; no se infiere que un turno está impago por su
estado de agenda. No hay cambios al esquema. Los formularios usan RHF/Zod y los estados
de carga mantienen skeletons.

Validación: `npm run build` y `npm test`. Las pruebas de UI usan adaptadores de Axios
simulados: no generan cobros ni datos reales en PostgreSQL.


## Equipo: alta con contrato y cuentas ADMIN

En Profesionales, el propietario usa **Agregar al equipo** para elegir:

- **Profesional:** completa sus datos y el contrato obligatorio en el mismo formulario.
  El backend guarda ambos en una sola transacción, con UUID de idempotencia para los
  reintentos. Ya no existe «Configurar más adelante». Una cuenta vinculada nueva recibe
  acceso STAFF; puede omitirse la cuenta si la persona no necesita ingresar al sistema.
- **ADMIN:** solicita nombre y correo. Crea la cuenta si no existe, con contraseña temporal `12345678` y cambio obligatorio en el primer acceso; si existe, conserva sus credenciales y nombre. El envío utiliza `Idempotency-Key` para reintentos seguros.
  No crea un perfil profesional, horarios ni contrato. ADMIN no atiende servicios.

La tabla de profesionales muestra el rol real de acceso; sin membresía muestra
«Profesional · Sin acceso». Debajo, OWNER ve **Cuentas y roles del local**, incluyendo
propietarios y administradores aunque no tengan perfil profesional. Sólo OWNER da
altas y asigna roles. No se alteró el esquema ni se reclasificaron datos existentes.

## Primer acceso de empleados

El alta permite indicar un **Email de acceso** opcional. Una cuenta nueva recibe
`12345678` y debe cambiarla en el primer login; una existente conserva su contraseña.
El token temporal no autoriza rutas del dashboard. La pantalla
`/force-password-change` solicita y compara la nueva contraseña antes de instalar los
JWT definitivos. El desafío se conserva en sessionStorage para sobrevivir una recarga.

OWNER puede usar la llave de cada profesional vinculado para restablecer credenciales
STAFF, con confirmación e idempotencia. El reset invalida sesiones anteriores y exige
otro cambio. No permite modificar credenciales de OWNER/ADMIN. Ver
`../turnero/EMPLOYEE_ONBOARDING.md` para contratos, adición de esquema y seguridad.

También está disponible `npm run typecheck` (los proyectos TS están configurados con
noEmit). Las pruebas de interfaz simulan la API y no cambian contraseñas reales.

### Aislamiento de la agenda de STAFF

`GET /v1/appointments` limita en SQL los items al `user_id` de la sesión STAFF antes de contar y paginar. No acepta elegir otra identidad. `GET /v1/appointments/my-context` devuelve exclusivamente sus perfiles y sucursales asignadas o con historial propio. STAFF no puede crear, confirmar, cancelar ni cobrar turnos. Las claves de caché de Agenda incluyen empresa, rol y usuario.


### Profesionales: permisos de ADMIN

ADMIN sólo ve activos, sin selector de estado ni botón de baja. En la edición,
puede cambiar el nombre; el ID de usuario se muestra bloqueado y el control de
activación no aparece. El PATCH envía únicamente `displayName`. Puede organizar
horarios de profesionales activos. Las consultas de catálogo separan caché por
rol y usuario para no reutilizar listados de OWNER.

ADMIN no tiene acceso a «Mi empresa»: se oculta del menú, las rutas de configuración redirigen a Agenda y la API privada de schedulers queda reservada a OWNER.

## Estadísticas (exclusivo OWNER)

Ruta `/dashboard/finance/statistics`, API `/v1/statistics`. Incluye filtros por fechas,
sucursal, profesional y servicio; comparación con el período anterior; rankings
por cantidad/facturación, ventas por día de atención y evolución diaria.
El mapa de calor por día y hora usa la creación de la reserva, con origen online o
turno directo, para detectar picos de demanda. Muestra ceros y estados sin datos.
ADMIN/STAFF no ven el enlace y las URLs directas redirigen a Agenda.
Las fechas de creación, atención y cobro se presentan por separado; no se atribuyen
reservas a campañas sin datos de origen publicitario. Ver `turnero/STATISTICS_API.md`.

Estadísticas se encuentra dentro de Finanzas, en la navegación secundaria exclusiva de OWNER. La ruta anterior `/dashboard/statistics` redirige a la ubicación nueva.

## Landing pública

`/` muestra la landing comercial, separada del `PublicLayout` de autenticación y
reservas. Mantiene intactas las rutas de login, registro, reservas y dashboard.
Diseño responsive, navegación móvil, enlace para saltar al contenido, preguntas
frecuentes nativas y soporte de movimiento reducido. Los estilos están acotados a
`.landing`; las ilustraciones son HTML/CSS con datos identificados como ejemplos.

Precios comerciales centralizados en `src/features/landing/plans.ts`:

- Agenda: AR$ 5.000 mensuales; Agenda, Servicios, Mi empresa y reservas online.
- Integral: AR$ 10.000 mensuales; todas las capacidades actuales del producto.

Los CTA de precios llevan a `/register?plan=agenda` o `?plan=integral`; el registro
muestra la elección y la conserva al alternar con login. Esto no activa una
suscripción ni restringe módulos: la facturación recurrente y los permisos por
plan requieren una implementación de backend independiente. El registro sigue
creando cuentas mediante la API existente, sin cobros automáticos.
