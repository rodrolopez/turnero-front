/** Marketing prices only. Entitlements and subscription billing are handled separately. */
export const plans = [
  { id: 'agenda', name: 'Agenda', price: 5000, description: 'Para ordenar tus turnos y empezar a recibir reservas online.', includes: ['Agenda de turnos', 'Catálogo de servicios', 'Configuración de Mi empresa', 'Página pública de reservas'], excludes: 'Sin gestión de equipo, caja, contratos ni estadísticas.' },
  { id: 'integral', name: 'Integral', price: 10000, description: 'Para conectar toda la operación y tomar mejores decisiones.', includes: ['Todo lo incluido en Agenda', 'Sucursales y equipo de profesionales', 'Horarios y accesos por rol', 'Turnos directos y cobros', 'Contratos, saldos y liquidaciones', 'Estadísticas de ventas y reservas'], excludes: '' },
] as const
export function selectedPlan(value: string | null) { return plans.find((plan) => plan.id === value) }
export function planPrice(value: number) { return new Intl.NumberFormat('es-AR').format(value) }
