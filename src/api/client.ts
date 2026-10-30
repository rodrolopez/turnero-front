import axios, { AxiosError } from 'axios'
import { z, ZodError } from 'zod'
import { useAuthStore } from '../stores/useAuthStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const { accessToken, tenantId } = useAuthStore.getState()
  const path = config.url ?? ''
  const isAuth = /^\/?auth(?:\/|$)/.test(path)
  const isPublic = /^\/?public(?:\/|$)/.test(path)
  if (!isAuth && !isPublic && accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
  if (!isAuth && !isPublic && !/^\/?tenants(?:\/|$)/.test(path) && tenantId && !config.headers.has('X-Tenant-Id')) {
    config.headers.set('X-Tenant-Id', tenantId)
  }
  return config
})

api.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const session = useAuthStore.getState()
    // An expired request must not invalidate a newer session or hide login errors.
    if (session.accessToken && error.config?.headers.get('Authorization') === `Bearer ${session.accessToken}`) {
      session.logout()
    }
  }
  return Promise.reject(error)
})

const apiErrorSchema = z.object({ error: z.string(), details: z.array(z.object({ message: z.string(), path: z.array(z.union([z.string(), z.number()])).optional() })).optional() })
export function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) return 'Recibimos una respuesta inesperada. Actualizá el listado para comprobar los datos antes de repetir la operación.'
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data
    const parsed = apiErrorSchema.safeParse(data)
    if (parsed.success) {
      const details = parsed.data.details?.slice(0, 3).map((issue) => `${issue.path?.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`).join('; ')
      return details ? `${parsed.data.error}. ${details}` : parsed.data.error
    }
    if (error.response?.status === 429) return 'Demasiados intentos. Esperá unos minutos y volvé a intentar.'
    if (!error.response) return 'No pudimos conectar con la API. Verificá que esté disponible en el puerto 3002.'
    return 'No pudimos completar la solicitud. Intentá nuevamente.'
  }
  return 'La respuesta del servidor no es válida. Intentá nuevamente.'
}
