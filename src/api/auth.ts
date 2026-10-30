import { api } from './client'
import { authResponseSchema, loginResponseSchema, type LoginInput, type RegisterInput } from '../lib/schemas'

export async function login(input: LoginInput) {
  return loginResponseSchema.parse((await api.post<unknown>('/auth/login', input)).data)
}
export async function register(input: RegisterInput) {
  return authResponseSchema.parse((await api.post<unknown>('/auth/register', input)).data)
}

export async function forcePasswordChange(temporaryToken: string, password: string) {
  return authResponseSchema.parse((await api.post<unknown>('/auth/force-password-change', { password }, { headers: { Authorization: `Bearer ${temporaryToken}` } })).data)
}
