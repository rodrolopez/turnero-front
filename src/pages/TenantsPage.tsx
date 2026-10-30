import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, Building2, LogOut, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createTenant, useTenants } from '../api/tenants'
import { getErrorMessage } from '../api/client'
import { createTenantSchema, type CreateTenantInput } from '../lib/schemas'
import { useAuthStore } from '../stores/useAuthStore'
import { Field } from '../components/Field'
import { ErrorMessage, Loading } from '../components/Feedback'

export function TenantsPage() {
  const tenants = useTenants()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const switching = params.get('switch') === '1'
  const { tenantId, setTenant, logout, user } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: { name: '', slug: '', timezone: 'America/Argentina/Buenos_Aires', slotIntervalMinutes: 15 },
  })
  useEffect(() => {
    if (!tenants.data || switching) return
    const selected = tenants.data.find((tenant) => tenant.id === tenantId)
    const target = selected ?? (tenants.data.length === 1 ? tenants.data[0] : undefined)
    if (target) { setTenant(target.id); navigate('/dashboard', { replace: true }) }
    else if (tenantId) setTenant(null)
  }, [tenants.data, tenantId, switching, setTenant, navigate])

  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: (tenant) => {
      setTenant(tenant.id)
      queryClient.setQueryData(['tenants', user?.id], [...(tenants.data ?? []), tenant])
      navigate('/dashboard', { replace: true })
    },
  })
  function selectTenant(id: string) { setTenant(id); navigate('/dashboard', { replace: true }) }
  if (tenants.isPending) return <Loading label="Buscando tus empresas…" />
  if (tenants.isError) return <div className="card mx-auto max-w-lg space-y-4"><ErrorMessage message={getErrorMessage(tenants.error)} /><button className="btn-primary" onClick={() => void tenants.refetch()}>Reintentar</button><button className="btn-secondary" onClick={logout}>Cerrar sesión</button></div>

  return <div className="mx-auto max-w-4xl"><div className="mb-9 flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">TU ESPACIO DE TRABAJO</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{tenants.data.length ? 'Elegí tu empresa' : 'Creá tu primera empresa'}</h1><p className="mt-3 text-slate-500">Hola, {user?.fullName}. {tenants.data.length ? 'Seleccioná dónde querés trabajar o creá una nueva empresa.' : 'Configurá tu negocio para empezar.'}</p></div><button className="btn-secondary" onClick={logout}><LogOut size={16} />Salir</button></div>
    <div className="grid items-start gap-8 md:grid-cols-2">
      <section aria-label="Tus empresas" className="space-y-3">{tenants.data.length ? tenants.data.map((tenant) => <button disabled={mutation.isPending} key={tenant.id} onClick={() => selectTenant(tenant.id)} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-teal-500 hover:shadow-sm disabled:opacity-60"><div className="rounded-xl bg-teal-50 p-3 text-teal-700"><Building2 size={22} /></div><div className="min-w-0 flex-1"><span className="block truncate font-semibold">{tenant.name}</span><span className="text-xs text-slate-500">{tenant.role} · /{tenant.slug}</span></div><ArrowRight size={18} className="text-slate-400" /></button>) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-slate-500"><Building2 size={32} className="mb-4 text-teal-700" /><h2 className="font-semibold text-slate-800">Todo empieza con tu empresa</h2><p className="mt-3 text-sm leading-relaxed">Usá un nombre reconocible. El identificador será parte del enlace público para reservar turnos.</p></div>}</section>
      <section className="card"><h2 className="flex items-center gap-2 text-xl font-semibold"><Plus size={20} />Nueva empresa</h2><form noValidate className="mt-6" onSubmit={handleSubmit((values) => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="space-y-5 disabled:opacity-70">
        <Field label="Nombre de la empresa" placeholder="Barbería Central" maxLength={150} {...register('name')} error={errors.name?.message} />
        <Field label="Identificador público" placeholder="barberia-central" maxLength={100} autoCapitalize="none" spellCheck={false} {...register('slug')} error={errors.slug?.message} hint="Letras minúsculas, números y guiones. Debe ser único." />
        <Field label="Zona horaria" {...register('timezone')} error={errors.timezone?.message} />
        <div className="space-y-1.5"><label htmlFor="slot-interval" className="block text-sm font-medium text-slate-700">Intervalo de turnos</label><select id="slot-interval" className="input" {...register('slotIntervalMinutes', { valueAsNumber: true })} aria-invalid={Boolean(errors.slotIntervalMinutes)} aria-describedby={errors.slotIntervalMinutes ? 'slot-error' : undefined}>{[5, 10, 15, 20, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select>{errors.slotIntervalMinutes && <p id="slot-error" className="text-xs text-red-600">{errors.slotIntervalMinutes.message}</p>}</div>
        <ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /><button className="btn-primary w-full" type="submit">{mutation.isPending ? 'Creando empresa…' : 'Crear empresa'}<ArrowRight size={17} /></button>
      </fieldset></form></section>
    </div>
  </div>
}
