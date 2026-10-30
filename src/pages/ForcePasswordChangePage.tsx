import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import type { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { forcePasswordChange } from '../api/auth'
import { forcePasswordChangeSchema } from '../lib/schemas'
import { useAuthStore } from '../stores/useAuthStore'
import { Field } from '../components/Field'
import { Button } from '../components/ui/Button'
import { ErrorMessage } from '../components/Feedback'
import { getErrorMessage } from '../api/client'

export default function ForcePasswordChangePage() {
  const { passwordChallenge: challenge, accessToken, setSession, logout } = useAuthStore()
  const navigate = useNavigate()
  const sending = useRef(false)
  const form = useForm<z.infer<typeof forcePasswordChangeSchema>>({ resolver: zodResolver(forcePasswordChangeSchema), defaultValues: { password: '', confirmPassword: '' } })
  const mutation = useMutation({ mutationFn: (password: string) => forcePasswordChange(challenge!.temporaryToken, password), retry: false,
    onSuccess: (session) => { setSession(session); navigate('/tenants', { replace: true }) },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        logout(); navigate('/login', { replace: true, state: { message: 'La sesión temporal venció o ya fue utilizada. Si ya cambiaste tu contraseña, ingresá con la nueva.' } })
      }
    },
  })
  if (!challenge) return <Navigate to={accessToken ? '/tenants' : '/login'} replace />
  return <section className="card mx-auto max-w-md"><p className="eyebrow">PRIMER ACCESO</p><h1 className="mt-3 text-2xl font-semibold">Elegí tu nueva contraseña</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">Hola, {challenge.user.fullName}. Para ingresar al sistema tenés que reemplazar la contraseña temporal de tu cuenta.</p><form noValidate className="mt-6 space-y-5" onSubmit={form.handleSubmit(async ({ password }) => {
    if (sending.current) return
    sending.current = true
    try { await mutation.mutateAsync(password) } catch { /* Keep validation/API errors visible. */ } finally { sending.current = false }
  })}><fieldset disabled={mutation.isPending} className="space-y-5"><Field label="Nueva contraseña" type="password" autoComplete="new-password" {...form.register('password')} error={form.formState.errors.password?.message} hint="Al menos 8 caracteres. Debe ser diferente de 12345678." /><Field label="Repetir nueva contraseña" type="password" autoComplete="new-password" {...form.register('confirmPassword')} error={form.formState.errors.confirmPassword?.message} /></fieldset><ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /><p className="text-xs text-slate-500">Si se corta la conexión después de guardar, volvé al login e intentá ingresar con tu nueva contraseña.</p><Button type="submit" variant="primary" busy={mutation.isPending} className="w-full">Guardar contraseña e ingresar</Button><Button disabled={mutation.isPending} onClick={() => { logout(); navigate('/login', { replace: true }) }} className="w-full">Volver al login</Button></form></section>
}
