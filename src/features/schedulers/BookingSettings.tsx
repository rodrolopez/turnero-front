import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck, Plus } from 'lucide-react'
import type { Tenant } from '../../lib/schemas'
import { useCatalog, branchesResource } from '../catalog/api'
import { getErrorMessage } from '../../api/client'
import { ErrorMessage, Loading } from '../../components/Feedback'
import { QueryError } from '../../components/ui/QueryState'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/Field'
import { schedulerInputSchema, useSaveScheduler, useSchedulers, type SchedulerInput, type Scheduler } from './api'

export function BookingSettings() {
  const tenant = useOutletContext<Tenant>()
  const schedulers = useSchedulers()
  const branches = useCatalog(branchesResource)
  const mutation = useSaveScheduler(tenant.slug)
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Scheduler | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const defaults: SchedulerInput = { name: 'Reservas online', branchId: '', requiresApproval: false, holdDurationMinutes: 30 }
  function closeForm() { setOpen(false); setEditing(null); mutation.reset(); form.reset(defaults) }
  function editScheduler(scheduler: Scheduler) {
    mutation.reset(); setNotice(''); setDeactivating(null); setEditing(scheduler); setOpen(true)
    form.reset({ name: scheduler.name, branchId: scheduler.branch_id ?? '', requiresApproval: scheduler.requires_approval, holdDurationMinutes: scheduler.hold_duration_minutes })
  }
  const form = useForm<SchedulerInput>({ resolver: zodResolver(schedulerInputSchema), defaultValues: { name: 'Reservas online', branchId: '', requiresApproval: false, holdDurationMinutes: 30 } })
  const requiresApproval = form.watch('requiresApproval')
  const canEdit = tenant.role === 'OWNER' || tenant.role === 'ADMIN'
  const active = schedulers.data?.filter((scheduler) => scheduler.is_active) ?? []
  const showForm = open || !active.length
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6" aria-label="Configuración de reservas online"><div className="flex items-start gap-3"><CalendarCheck className="mt-1 shrink-0 text-teal-700" size={24} /><div><h2 className="text-lg font-semibold">Agendas de reservas online</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Una agenda habilita la recepción de reservas. Además, cada profesional debe tener sucursales, servicios y horarios asignados.</p></div></div>
    {schedulers.isPending || branches.isPending ? <Loading /> : schedulers.isError ? <div className="mt-4"><QueryError error={schedulers.error} retry={() => void schedulers.refetch()} /></div> : branches.isError ? <div className="mt-4"><QueryError error={branches.error} retry={() => void branches.refetch()} /></div> : <div className="mt-5 space-y-4">
      {!active.length && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No tenés ninguna agenda activa. Por eso tu página pública todavía no permite reservar.</p>}
      {notice && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}
      {!!schedulers.data?.length && <ul className="space-y-2">{schedulers.data.map((scheduler) => <li key={scheduler.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">{scheduler.name} <span className={`ml-1 text-xs font-normal ${scheduler.is_active ? 'text-teal-700' : 'text-slate-400'}`}>{scheduler.is_active ? 'Activa' : 'Inactiva'}</span></p><p className="mt-1 text-xs text-slate-500">{scheduler.branch_id ? branches.data?.find((branch) => branch.id === scheduler.branch_id)?.name ?? 'Sucursal asignada' : 'Todas las sucursales'} · {scheduler.requires_approval ? 'Requiere aprobación' : 'Confirmación automática'}</p></div>{canEdit && <div className="flex flex-wrap gap-2">
        <Button disabled={mutation.isPending} onClick={() => editScheduler(scheduler)}>Editar</Button>
        {scheduler.is_active ? <Button disabled={mutation.isPending} onClick={() => { closeForm(); setNotice(''); setDeactivating(scheduler.id) }}>Desactivar</Button> : <Button busy={mutation.isPending} onClick={() => mutation.mutate({ id: scheduler.id, isActive: true }, { onSuccess: () => setNotice('Agenda reactivada. Volvé a consultar la página pública.') })}>Reactivar</Button>}
      </div>}
      {deactivating === scheduler.id && <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3" role="group" aria-label="Confirmar desactivación"><p className="text-sm text-amber-900">¿Desactivar «{scheduler.name}»? Dejará de recibir nuevas reservas. Los turnos existentes se conservan y podrás reactivarla.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={mutation.isPending} onClick={() => { setDeactivating(null); mutation.reset() }}>Volver</Button><Button variant="danger" busy={mutation.isPending} onClick={() => mutation.mutate({ id: scheduler.id, isActive: false }, { onSuccess: () => { setDeactivating(null); setNotice('Agenda desactivada. Los turnos existentes se conservan.') } })}>Confirmar desactivación</Button></div></div>}
      </li>)}</ul>}
      {canEdit ? showForm && !deactivating ? <form noValidate className="space-y-4 border-t border-slate-100 pt-5" onSubmit={form.handleSubmit((input) => mutation.mutate(editing ? { id: editing.id, input } : input, { onSuccess: () => { const wasEditing = Boolean(editing); closeForm(); setNotice(wasEditing ? 'Agenda actualizada.' : 'Agenda habilitada. Ya podés abrir tu página pública y consultar los horarios.') } }))}><h3 className="font-semibold">{editing ? `Editar agenda: ${editing.name}` : 'Nueva agenda'}</h3><fieldset disabled={mutation.isPending} className="space-y-4">
        <Field label="Nombre de la agenda" {...form.register('name')} error={form.formState.errors.name?.message} />
        <div><label htmlFor="booking-agenda-branch" className="mb-1.5 block text-sm font-medium">Sucursales habilitadas</label><select id="booking-agenda-branch" className="input" {...form.register('branchId')}><option value="">Todas las sucursales</option>{branches.data?.filter((branch) => branch.is_active || branch.id === editing?.branch_id).map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select><ErrorMessage message={form.formState.errors.branchId?.message} /></div>
        <label className="check-label"><input type="checkbox" {...form.register('requiresApproval')} />Quiero aprobar los turnos antes de confirmarlos</label>
        <p className="text-xs text-slate-500">Si no marcás esta opción, los turnos se confirman automáticamente al reservar.</p>
        {requiresApproval && <Field label="Plazo para aprobar (minutos)" type="number" min={5} max={1440} {...form.register('holdDurationMinutes', { valueAsNumber: true })} error={form.formState.errors.holdDurationMinutes?.message} hint="Si no aprobás el turno dentro de este plazo, vence y libera el horario." />}
      </fieldset><ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /><div className="flex flex-wrap justify-end gap-3">{(!!active.length || Boolean(editing)) && <Button disabled={mutation.isPending} onClick={closeForm}>Cancelar</Button>}<Button variant="primary" type="submit" busy={mutation.isPending} disabled={!editing && !branches.data?.some((branch) => branch.is_active)}>{editing ? 'Guardar cambios' : 'Habilitar agenda de reservas'}</Button></div></form> : <Button disabled={mutation.isPending} onClick={() => { closeForm(); setDeactivating(null); setOpen(true) }}><Plus size={16} />Crear otra agenda</Button> : <p className="text-sm text-slate-500">Un propietario o administrador debe habilitar las agendas de reservas.</p>}
      {mutation.isError && (!showForm || Boolean(deactivating)) && <ErrorMessage message={getErrorMessage(mutation.error)} />}
    </div>}
  </section>
}
