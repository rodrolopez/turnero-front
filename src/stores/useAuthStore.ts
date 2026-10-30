import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { z } from 'zod'
import { userSchema, passwordChallengeSchema, type PasswordChallenge, type AuthResponse, type User, type Tenant } from '../lib/schemas'

interface AuthState {
  passwordChallenge: PasswordChallenge | null
  setPasswordChallenge: (challenge: PasswordChallenge) => void
  accessToken: string | null
  user: User | null
  tenantRole: Tenant['role'] | null
  setTenantRole: (tenantId: string, role: Tenant['role']) => void
  tenantId: string | null
  setSession: (session: AuthResponse) => void
  setTenant: (tenantId: string | null) => void
  logout: () => void
}
const emptySession = { accessToken: null, user: null, tenantId: null, tenantRole: null, passwordChallenge: null }
const persistedSchema = z.object({ accessToken: z.string().min(1), user: userSchema, tenantId: z.uuid().nullable() })

const challengeStorageKey = 'turnero-password-challenge'
function readChallenge(): PasswordChallenge | null {
  try { return passwordChallengeSchema.parse(JSON.parse(sessionStorage.getItem(challengeStorageKey) ?? 'null')) } catch { return null }
}
function clearChallenge() { try { sessionStorage.removeItem(challengeStorageKey) } catch { /* Session-only memory remains usable. */ } }
export const useAuthStore = create<AuthState>()(persist((set) => ({
  ...emptySession,
  passwordChallenge: readChallenge(),
  setSession: ({ accessToken, user }) => { clearChallenge(); set({ ...emptySession, accessToken, user }) },
  setPasswordChallenge: (challenge) => {
    try { sessionStorage.setItem(challengeStorageKey, JSON.stringify(challenge)) } catch { /* Keep it in memory if storage is unavailable. */ }
    set({ ...emptySession, passwordChallenge: challenge })
  },
  setTenant: (tenantId) => set((state) => ({ tenantId, tenantRole: state.tenantId === tenantId ? state.tenantRole : null })),
  setTenantRole: (tenantId, tenantRole) => set((state) => state.tenantId === tenantId ? { tenantRole } : {}),
  logout: () => { clearChallenge(); set(emptySession) },
}), {
  name: 'turnero-session',
  storage: createJSONStorage(() => localStorage),
  partialize: ({ accessToken, user, tenantId }) => ({ accessToken, user, tenantId }),
  merge: (persisted, current) => {
    const challenge = readChallenge()
    if (challenge) return { ...current, ...emptySession, passwordChallenge: challenge }
    const parsed = persistedSchema.safeParse(persisted)
    return { ...current, ...(parsed.success ? parsed.data : emptySession), tenantRole: null }
  },
}))
