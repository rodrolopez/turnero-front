import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login, register as registerAccount } from '../api/auth'
import { getErrorMessage } from '../api/client'
import { loginSchema, registerSchema, type RegisterInput } from '../lib/schemas'
import { selectedPlan, planPrice } from '../features/landing/plans'
import { useAuthStore } from '../stores/useAuthStore'
import { Field } from '../components/Field'
import { ErrorMessage } from '../components/Feedback'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const location = useLocation()
  const plan = selectedPlan(new URLSearchParams(location.search).get('plan'))
  const setChallenge = useAuthStore((state) => state.setPasswordChallenge)
  const setSession = useAuthStore((state) => state.setSession)
  // The shared form keeps both modes typed; login only submits email and password.
  const schema = isRegister ? registerSchema : loginSchema.extend({ fullName: z.string() })
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', fullName: '' } })
  const mutation = useMutation({
    mutationFn: async (values: { email: string; password: string; fullName?: string }) => isRegister
      ? registerAccount(registerSchema.parse(values)) : login(loginSchema.parse(values)),
    onSuccess: (session) => {
      if (session.requiresPasswordChange === true) { setChallenge(session); navigate('/force-password-change', { replace: true }) }
      else { setSession(session); navigate('/tenants', { replace: true }) }
    },
  })
  return <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
    <section className="hidden max-w-lg lg:block"><p className="eyebrow">GESTIÓN SIMPLE, TODOS LOS DÍAS</p><h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">Más tiempo para<br />hacer lo tuyo.</h1><p className="mt-6 text-lg leading-relaxed text-slate-500">Tu empresa, tu equipo y tus turnos, en un mismo lugar. Empezá por entrar a tu espacio de trabajo.</p><div className="mt-8 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800"><span className="h-2 w-2 rounded-full bg-teal-600" />Un espacio para cada empresa</div></section>
    <section className="card mx-auto w-full max-w-md"><h2 className="text-2xl font-semibold tracking-tight">{isRegister ? 'Creá tu cuenta' : 'Te damos la bienvenida'}</h2><p className="mt-2 text-sm text-slate-500">{isRegister ? 'Registrate para empezar a organizar tu negocio.' : 'Ingresá con tu correo y contraseña.'}</p>
      {isRegister && plan && <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"><p className="font-semibold">Plan {plan.name} · AR$ {planPrice(plan.price)} / mes</p><p className="mt-1 text-xs leading-relaxed">{plan.description} Este registro crea tu cuenta y no realiza un cobro automático.</p><Link to="/#planes" className="mt-2 inline-block text-xs font-semibold underline">Ver los planes</Link></div>}
      {typeof location.state?.message === 'string' && <p role="status" className="mt-4 text-sm text-amber-800">{location.state.message}</p>}
      <form noValidate className="mt-8 space-y-5" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <fieldset disabled={mutation.isPending} className="space-y-5 disabled:opacity-70">
          {isRegister && <Field label="Nombre completo" autoComplete="name" maxLength={150} {...register('fullName')} error={errors.fullName?.message} />}
          <Field label="Correo electrónico" type="email" autoComplete="email" placeholder="vos@tuempresa.com" maxLength={320} {...register('email')} error={errors.email?.message} />
          <Field label="Contraseña" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength={72} {...register('password')} error={errors.password?.message} hint={isRegister ? 'Al menos 8 caracteres.' : undefined} />
          <ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} />
          <button className="btn-primary w-full" type="submit">{mutation.isPending ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Ingresar'}<ArrowRight size={17} /></button>
        </fieldset>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">{isRegister ? '¿Ya tenés una cuenta?' : '¿Todavía no tenés cuenta?'} <Link className="font-semibold text-teal-700 hover:underline" to={`${isRegister ? '/login' : '/register'}${plan ? `?plan=${plan.id}` : ''}`}>{isRegister ? 'Ingresá' : 'Registrate'}</Link></p>
    </section>
  </div>
}
