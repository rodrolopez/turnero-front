import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import type { Tenant } from '../../lib/schemas'
import { professionalFormSchema, professionalSchema } from '../catalog/schemas'
import { useCatalogMutation } from '../catalog/api'
import { contractInputSchema } from './schemas'
import { dateInZone } from '../booking/utils'
import { contractLabels } from './utils'
import { SubmissionFeedback, useSafeSubmission } from './useSafeSubmission'
import { adminInputSchema, useCreateAdmin } from '../team/api'
import { Field } from '../../components/Field'
import { Button } from '../../components/ui/Button'
import { ErrorMessage } from '../../components/Feedback'

const onboardingSchema = professionalFormSchema.extend({ email: z.union([z.literal(''), z.string().trim().toLowerCase().pipe(z.email('Ingresá un correo válido').max(320))]), contractType: contractInputSchema.shape.contractType, value: z.string(), billingCycle: contractInputSchema.shape.billingCycle, startDate: z.string() }).superRefine((value, ctx) => {
  if (value.email && value.userId) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Ingresá un email o un ID de usuario, no ambos' })
  const result = contractInputSchema.safeParse({ ...value, professionalId: '00000000-0000-4000-8000-000000000000', isActive: true })
  if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
})
type OnboardingInput = z.infer<typeof onboardingSchema>
type Props = { onCancel: () => void; onCreated: () => void; onBusyChange: (busy: boolean) => void }
export function ProfessionalCreateForm(props: Props) {
  const role = useAuthStore((s) => s.tenantRole)
  const [kind, setKind] = useState<'professional' | 'admin'>('professional')
  const [locked, setLocked] = useState(false)
  const handleLock = useCallback((value: boolean) => { setLocked(value); props.onBusyChange(value) }, [props.onBusyChange])
  if (role !== 'OWNER') return <p className="text-sm text-slate-500">Sólo el propietario puede agregar integrantes y configurar sus permisos.</p>
  return <div className="space-y-5"><fieldset disabled={locked} className="flex flex-wrap gap-4 rounded-xl bg-slate-50 p-4"><legend className="text-sm font-semibold">Tipo de integrante</legend><label className="check-label"><input type="radio" checked={kind === 'professional'} onChange={() => setKind('professional')} name="member-kind" />Profesional (atiende servicios)</label><label className="check-label"><input type="radio" checked={kind === 'admin'} onChange={() => setKind('admin')} name="member-kind" />ADMIN (administración)</label></fieldset>
    {kind === 'professional' ? <CreateProfessional {...props} onLock={handleLock} /> : <CreateAdmin {...props} onLock={handleLock} />}
  </div>
}
function CreateProfessional({ onCancel, onCreated, onLock }: Props & { onLock: (busy: boolean) => void }) {
  const tenant = useOutletContext<Tenant>()
  const form = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema), defaultValues: { displayName: '', userId: '', email: '', isActive: true, contractType: 'percentage', value: '0.00', billingCycle: null, startDate: dateInZone(tenant.timezone) } })
  const mutation = useCatalogMutation(async (tenantId, { input, key }: { input: OnboardingInput; key: string }) => {
    if (useAuthStore.getState().tenantRole !== 'OWNER') throw new Error('Sólo el propietario puede dar de alta al equipo')
    const { contractType, value, billingCycle, startDate, email, ...professional } = input
    return z.object({ professional: professionalSchema }).parse((await api.post<unknown>('/professionals', { ...professional, userId: professional.userId || null, ...(email ? { email } : {}), contract: { contractType, value, billingCycle, startDate, isActive: true } }, { headers: { 'X-Tenant-Id': tenantId, 'Idempotency-Key': key } })).data).professional
  })
  const state = useSafeSubmission((input: OnboardingInput, key: string) => mutation.mutateAsync({ input, key }), onCreated)
  const errors = form.formState.errors, type = form.watch('contractType')
  useEffect(() => { onLock(state.locked) }, [state.locked, onLock])
  // Ambiguous writes stay locked even after the network request has finished.
  const controlsLocked = state.locked
  return <form noValidate className="space-y-5" onSubmit={form.handleSubmit(state.submit)}><fieldset disabled={controlsLocked} className="space-y-4">
    <Field label="Nombre del profesional" {...form.register('displayName')} error={errors.displayName?.message} />
    <Field label="Email de acceso (opcional)" type="email" autoComplete="off" {...form.register('email')} error={errors.email?.message} hint="Si la cuenta es nueva, se creará con la contraseña 12345678 y deberá cambiarla al ingresar. Si ya existe, conserva su contraseña. Dejalo vacío para crear el perfil sin acceso." />
    <Field label="ID de usuario (opcional)" {...form.register('userId')} error={errors.userId?.message} hint="Alternativa al email: UUID de una cuenta existente. No completes ambos campos." />
    <label className="check-label"><input type="checkbox" {...form.register('isActive')} />Profesional activo</label>
    <h3 className="border-t border-slate-200 pt-5 font-semibold">Contrato obligatorio</h3><p className="text-sm text-slate-500">El profesional y su contrato se guardan juntos. No se realizará el alta si el contrato falla.</p>
    <div><label htmlFor="new-contract-type" className="mb-2 block text-sm font-medium">Modelo de trabajo</label><select id="new-contract-type" className="input" {...form.register('contractType', { onChange: () => form.setValue('billingCycle', null) })}>{Object.entries(contractLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <Field label={type === 'percentage' ? 'Porcentaje del profesional' : type === 'fixed_rent' ? 'Alquiler por ciclo' : 'Sueldo de referencia'} inputMode="decimal" {...form.register('value')} error={errors.value?.message} hint="Usá punto decimal. El porcentaje representa la parte del profesional." />
    {type === 'fixed_rent' && <div><label htmlFor="new-contract-cycle" className="mb-2 block text-sm font-medium">Ciclo de facturación</label><select id="new-contract-cycle" className="input" {...form.register('billingCycle', { setValueAs: (v: string) => v || null })}><option value="">Seleccioná un ciclo</option><option value="weekly">Semanal</option><option value="biweekly">Cada 14 días</option><option value="monthly">Mensual</option></select><ErrorMessage message={errors.billingCycle?.message} /></div>}
    <Field label="Fecha de inicio" type="date" {...form.register('startDate')} error={errors.startDate?.message} />
  </fieldset><SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onCancel}>Cancelar</Button><Button type="submit" variant="primary" busy={state.busy} disabled={state.uncertain}>Crear profesional y contrato</Button></div></form>
}
function CreateAdmin({ onCancel, onCreated, onLock }: Props & { onLock: (busy: boolean) => void }) {
  const form = useForm<z.infer<typeof adminInputSchema>>({ resolver: zodResolver(adminInputSchema), defaultValues: { email: '', fullName: '' } })
  const mutation = useCreateAdmin()
  const state = useSafeSubmission((input: z.infer<typeof adminInputSchema>, key: string) => mutation.mutateAsync({ input, key }), onCreated)
  useEffect(() => { onLock(state.locked) }, [state.locked, onLock])
  return <form noValidate className="space-y-5" onSubmit={form.handleSubmit(state.submit)}><p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">ADMIN gestiona el local y la caja. No atiende servicios y no tiene contrato profesional.</p><fieldset disabled={state.locked} className="space-y-4"><Field label="Nombre del administrador" autoComplete="name" {...form.register('fullName')} error={form.formState.errors.fullName?.message} /><Field type="email" label="Correo de la cuenta administradora" {...form.register('email')} error={form.formState.errors.email?.message} hint="Si la cuenta es nueva, se creará con la contraseña temporal 12345678 y deberá cambiarla al ingresar. Si ya existe, conserva su nombre y contraseña. Se le otorgará acceso ADMIN sólo a esta empresa." /></fieldset><SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onCancel}>Cancelar</Button><Button type="submit" variant="primary" busy={state.busy} disabled={state.uncertain}>Asignar ADMIN</Button></div></form>
}
