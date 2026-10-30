import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useOutletContext } from 'react-router-dom'
import type { Tenant } from '../../lib/schemas'
import { usePublicCatalog } from '../booking/api'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/Field'
import { ErrorMessage, Loading } from '../../components/Feedback'
import { QueryError } from '../../components/ui/QueryState'
import { walkInInputSchema, type WalkInInput, type Receipt } from './schemas'
import { useWalkIn } from './api'
import { SubmissionFeedback, useSafeSubmission } from './useSafeSubmission'
import { money } from './utils'

export function WalkInModal({ initialBranch, onClose, onSaved }: { initialBranch: string; onClose: () => void; onSaved: (receipt: Receipt) => void }) {
  const tenant = useOutletContext<Tenant>()
  const catalog = usePublicCatalog(tenant.slug)
  const mutation = useWalkIn()
  const form = useForm<WalkInInput>({ resolver: zodResolver(walkInInputSchema), defaultValues: { branchId: initialBranch, serviceId: '', professionalId: '', schedulerId: '', customer: { displayName: '', email: '', phone: '' }, observations: '', paymentMethod: 'cash' } })
  const state = useSafeSubmission((payload: WalkInInput, key: string) => mutation.mutateAsync({ payload, key }), onSaved)
  const branchId = form.watch('branchId'), serviceId = form.watch('serviceId'), schedulerId = form.watch('schedulerId')
  const schedulers = catalog.data?.schedulers.filter((s) => !s.branch_id || s.branch_id === branchId) ?? []
  const schedulerIds = schedulers.map((s) => s.id).join(',')
  useEffect(() => {
    const ids = schedulerIds ? schedulerIds.split(',') : []
    if (!ids.includes(schedulerId)) form.setValue('schedulerId', ids.length === 1 ? ids[0] : '')
  }, [schedulerIds, schedulerId, form])
  const scheduler = schedulers.find((s) => s.id === schedulerId)
  const professionals = catalog.data?.professionals.filter((p) => p.branchIds.includes(branchId) && p.serviceIds.includes(serviceId) && scheduler && (scheduler.professionalIds === null || scheduler.professionalIds.includes(p.id))) ?? []
  const service = catalog.data?.services.find((s) => s.id === serviceId)
  const errors = form.formState.errors
  return <Modal title="Nuevo Turno Directo (Walk-in)" onClose={onClose} busy={state.locked} wide>
    {catalog.isPending ? <Loading label="Preparando mostrador…" /> : catalog.isError ? <QueryError error={catalog.error} retry={() => void catalog.refetch()} /> : !catalog.data.schedulers.length ? <p className="text-sm text-slate-600">Primero habilitá una agenda de reservas en <Link to="/dashboard/settings" className="text-teal-700 underline">Mi empresa</Link>.</p> : <form noValidate className="space-y-5" onSubmit={form.handleSubmit((input) => {
      if (!professionals.some((p) => p.id === input.professionalId)) { form.setError('professionalId', { message: 'Elegí un profesional habilitado para esta combinación' }); return }
      void state.submit({ ...input, customer: { ...input.customer, phone: input.customer.phone || null } })
    })}><p className="text-sm text-slate-500">Registrá un servicio ya realizado y cobralo en efectivo. No necesita una reserva previa.</p><fieldset disabled={state.locked} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="walkin-branch" className="mb-2 block text-sm font-medium">Sucursal</label><select id="walkin-branch" className="input" {...form.register('branchId', { onChange: () => { form.setValue('professionalId', ''); form.setValue('schedulerId', '') } })}><option value="">Seleccioná una sucursal</option>{catalog.data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><ErrorMessage message={errors.branchId?.message} /></div>
      <div><label htmlFor="walkin-service" className="mb-2 block text-sm font-medium">Servicio</label><select id="walkin-service" className="input" {...form.register('serviceId', { onChange: () => form.setValue('professionalId', '') })}><option value="">Seleccioná un servicio</option>{catalog.data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ErrorMessage message={errors.serviceId?.message} /></div>
      <div><label htmlFor="walkin-scheduler" className="mb-2 block text-sm font-medium">Agenda de la sucursal</label><select id="walkin-scheduler" className="input" {...form.register('schedulerId', { onChange: () => form.setValue('professionalId', '') })}><option value="">Seleccioná una agenda</option>{schedulers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ErrorMessage message={errors.schedulerId?.message} /></div>
      <div><label htmlFor="walkin-professional" className="mb-2 block text-sm font-medium">Profesional</label><select id="walkin-professional" className="input" {...form.register('professionalId')}><option value="">Seleccioná un profesional</option>{professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select><ErrorMessage message={errors.professionalId?.message} /></div></div>
      {branchId && serviceId && schedulerId && !professionals.length && <p role="status" className="text-sm text-amber-800">No hay profesionales habilitados para esta combinación.</p>}
      {service && <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Total en efectivo: <strong>{money(service.price)}</strong> · {service.duration_minutes} minutos. El servidor congela el precio al registrar el turno.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre y apellido del cliente" {...form.register('customer.displayName')} error={errors.customer?.displayName?.message} /><Field label="Correo del cliente" type="email" {...form.register('customer.email')} error={errors.customer?.email?.message} /><Field label="Teléfono del cliente (opcional)" type="tel" {...form.register('customer.phone')} error={errors.customer?.phone?.message} /></div>
      <div><label htmlFor="walkin-notes" className="mb-2 block text-sm font-medium">Observaciones</label><textarea id="walkin-notes" rows={3} className="input" {...form.register('observations')} /><ErrorMessage message={errors.observations?.message} /></div>
    </fieldset><SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" busy={state.busy} disabled={state.uncertain}>Registrar y cobrar efectivo</Button></div></form>}
  </Modal>
}
