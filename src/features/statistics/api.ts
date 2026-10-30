import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import { decimalSchema } from '../finance/schemas'
import { validDate } from '../agenda/utils'
const count = z.number().int().nonnegative()
const date = z.string().refine(validDate, 'Ingresá una fecha válida')
export const filtersSchema = z.object({ startDate: date, endDate: date, branchId: z.string(), professionalId: z.string(), serviceId: z.string() }).superRefine((value, ctx) => {
  const days = (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86_400_000
  if (days < 0 || days > 365) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Elegí un período ordenado de hasta 366 días' })
  for (const key of ['branchId', 'professionalId', 'serviceId'] as const) if (value[key] && !z.uuid().safeParse(value[key]).success) ctx.addIssue({ code: 'custom', path: [key], message: 'Seleccioná una opción válida' })
})
export type StatisticsFilters = z.infer<typeof filtersSchema>
const ranking = z.object({ id: z.uuid(), name: z.string(), isActive: z.boolean(), quantity: count, revenue: decimalSchema })
const summary = z.object({ services: count, revenue: decimalSchema, reservations: count, webReservations: count })
export const reportSchema = z.object({
  timezone: z.string(), summary: summary.extend({ cashRevenue: decimalSchema }),
  previous: summary.extend({ startDate: date, endDate: date }),
  services: z.array(ranking), professionals: z.array(ranking),
  serviceWeekdays: z.array(z.object({ serviceId: z.uuid(), weekday: z.number().int().min(1).max(7), quantity: count })),
  weekdays: z.array(z.object({ weekday: z.number().int().min(1).max(7), quantity: count, revenue: decimalSchema })),
  daily: z.array(z.object({ date, quantity: count, revenue: decimalSchema, cashRevenue: decimalSchema, reservations: count, webReservations: count })),
  bookingHeatmap: z.array(z.object({ weekday: z.number().int().min(1).max(7), hour: z.number().int().min(0).max(23), total: count, web: count, walkIn: count, cancelled: count })),
})
export type StatisticsReport = z.infer<typeof reportSchema>
export type Ranking = z.infer<typeof ranking>
export function useStatistics(filters: StatisticsFilters) {
  const { tenantId, tenantRole, user } = useAuthStore()
  return useQuery({
    queryKey: ['statistics', tenantId, tenantRole, user?.id, filters],
    enabled: Boolean(tenantId && tenantRole === 'OWNER'), retry: false, staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const valid = filtersSchema.parse(filters)
      const params = { ...valid, branchId: valid.branchId || undefined, professionalId: valid.professionalId || undefined, serviceId: valid.serviceId || undefined }
      return reportSchema.parse((await api.get<unknown>('/statistics', { params, signal, headers: { 'X-Tenant-Id': tenantId } })).data)
    },
  })
}
