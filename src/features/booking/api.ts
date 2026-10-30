import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { publicCatalogSchema, availabilitySchema, bookingResponseSchema, bookingRequestSchema, type BookingRequest } from './schemas'

const publicPath = (slug: string) => `/public/${encodeURIComponent(slug)}`
export function usePublicCatalog(slug: string) {
  return useQuery({
    queryKey: ['public-catalog', slug], enabled: Boolean(slug),
    queryFn: async ({ signal }) => publicCatalogSchema.parse((await api.get<unknown>(`${publicPath(slug)}/catalog`, { signal })).data),
    retry: false, staleTime: 30_000, refetchOnWindowFocus: false, refetchOnReconnect: false,
  })
}
export function usePublicAvailability(slug: string, branchId: string, serviceId: string, date: string, schedulerId: string, professionalId?: string) {
  return useQuery({
    queryKey: ['public-availability', slug, branchId, serviceId, date, schedulerId, professionalId ?? 'any'],
    enabled: Boolean(slug && branchId && serviceId && date && schedulerId),
    queryFn: async ({ signal }) => {
      const response = await api.get<unknown>(`${publicPath(slug)}/availability`, { signal, params: { branchId, serviceId, date, ...(professionalId ? { professionalId } : {}) } })
      const result = availabilitySchema.parse(response.data)
      if (result.branchId !== branchId || result.serviceId !== serviceId || result.date !== date) throw new Error('La disponibilidad no corresponde a la selección actual')
      return result
    },
    staleTime: 0, retry: false, refetchInterval: 30_000,
  })
}
export async function submitPublicBooking(slug: string, input: BookingRequest, idempotencyKey: string) {
  const body = bookingRequestSchema.parse(input)
  const response = bookingResponseSchema.parse((await api.post<unknown>(`${publicPath(slug)}/appointments`, body, { headers: { 'Idempotency-Key': idempotencyKey } })).data)
  const appointment = response.appointment
  const item = appointment.items[0]!
  const requested = body.items[0]!
  if (appointment.branchId !== body.branchId || appointment.schedulerId !== body.schedulerId
    || appointment.items.length !== 1 || item.serviceId !== requested.serviceId
    || Date.parse(item.startsAt) !== Date.parse(body.startsAt)
    || (requested.professionalSelection.mode === 'specific' && item.professionalId !== requested.professionalSelection.professionalId)) {
    throw new Error('El comprobante recibido no corresponde a esta reserva')
  }
  return response
}
