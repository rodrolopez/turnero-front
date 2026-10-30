import { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/useAuthStore'

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 }, mutations: { retry: false } } })
useAuthStore.subscribe((state, previous) => {
  if (state.accessToken !== previous.accessToken || state.tenantId !== previous.tenantId) queryClient.clear()
})
