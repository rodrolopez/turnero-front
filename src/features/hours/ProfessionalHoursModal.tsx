import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/Field'
import { ErrorMessage } from '../../components/Feedback'
import { QueryError, Loading } from '../../components/ui/QueryState'
import { getErrorMessage } from '../../api/client'
import { branchesResource, servicesResource, useCatalog } from '../catalog/api'
import type { Branch, Professional, Service } from '../catalog/schemas'
import { assignmentsFormSchema, type AssignmentsInput } from './schemas'
import { useAssignments, useSaveAssignments } from './api'
import { WeekEditor } from './WeekEditor'

export function ProfessionalHoursModal({ professional, onClose, onSaved }: { professional: Professional; onClose: () => void; onSaved: () => void }) {
  const assignments = useAssignments(professional.id)
  const branches = useCatalog(branchesResource)
  const services = useCatalog(servicesResource)
  const [busy, setBusy] = useState(false)
  const queries = [assignments, branches, services]
  const failed = queries.find((query) => query.isError)
  return <Modal title={`Asignaciones y horarios · ${professional.display_name}`} onClose={onClose} busy={busy} wide>
    {failed ? <QueryError error={failed.error} retry={() => { void assignments.refetch(); void branches.refetch(); void services.refetch() }} /> : !assignments.data || !branches.data || !services.data ? <Loading /> : <AssignmentsForm professionalId={professional.id} initial={assignments.data} branches={branches.data} services={services.data} onClose={onClose} onSaved={onSaved} setBusy={setBusy} />}
  </Modal>
}
function AssignmentsForm({ professionalId, initial, branches, services, onClose, onSaved, setBusy }: { professionalId: string; initial: AssignmentsInput; branches: Branch[]; services: Service[]; onClose: () => void; onSaved: () => void; setBusy: (value: boolean) => void }) {
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<AssignmentsInput>({ resolver: zodResolver(assignmentsFormSchema), defaultValues: initial })
  const { fields, append, remove } = useFieldArray({ control, name: 'workingHours' })
  const selectedBranchIds = watch('branchIds')
  const currentHours = watch('workingHours')
  const selectedBranches = branches.filter((branch) => selectedBranchIds.includes(branch.id))
  const mutation = useSaveAssignments(professionalId)
  async function save(input: AssignmentsInput) {
    setBusy(true)
    try { await mutation.mutateAsync(input); onSaved() } catch { /* Keep the form open with the API error. */ } finally { setBusy(false) }
  }
  return <form noValidate onSubmit={handleSubmit(save)}><fieldset disabled={mutation.isPending} className="space-y-6">
    <p className="text-sm text-slate-500">Asigná sucursales y servicios. Los tramos se interpretan en la zona horaria de cada sucursal. Al desasignar una sucursal, quitá también sus tramos.</p>
    <div className="grid gap-5 sm:grid-cols-2"><fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold">Sucursales asignadas</legend>{!branches.length && <p className="text-sm text-slate-500">Primero creá una sucursal.</p>}{branches.map((branch) => <label key={branch.id} className="check-label mb-3"><input type="checkbox" value={branch.id} {...register('branchIds')} />{branch.name}{!branch.is_active && ' (inactiva)'}</label>)}<ErrorMessage message={errors.branchIds?.message} /></fieldset>
    <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold">Servicios que realiza</legend>{!services.length && <p className="text-sm text-slate-500">Primero creá un servicio.</p>}{services.map((service) => <label key={service.id} className="check-label mb-3"><input type="checkbox" value={service.id} {...register('serviceIds')} />{service.name}{!service.is_active && ' (inactivo)'}</label>)}<ErrorMessage message={errors.serviceIds?.message} /></fieldset></div>
    {!selectedBranches.length && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Seleccioná una sucursal para agregar horarios. Sin asignaciones y horarios, el profesional no ofrecerá turnos.</p>}
    <WeekEditor rows={fields} limit={500} disabled={mutation.isPending} addDisabled={!selectedBranches.length} onAdd={(weekday) => append({ branchId: selectedBranches[0]!.id, weekday, startsAt: '09:00', endsAt: '18:00' })} onRemove={remove} renderRow={(index, label) => <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1.5"><label htmlFor={`hour-branch-${index}`} className="block text-sm font-medium text-slate-700">Sucursal ({label})</label><select id={`hour-branch-${index}`} className="input" {...register(`workingHours.${index}.branchId`)} aria-invalid={Boolean(errors.workingHours?.[index]?.branchId)} aria-describedby={errors.workingHours?.[index]?.branchId ? `branch-error-${index}` : undefined}>
      {branches.filter((branch) => selectedBranchIds.includes(branch.id) || branch.id === currentHours[index]?.branchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{!branch.is_active ? ' (inactiva)' : ''} · {branch.timezone}</option>)}
    </select>{errors.workingHours?.[index]?.branchId && <p id={`branch-error-${index}`} className="text-xs text-red-600">{errors.workingHours[index]?.branchId?.message}</p>}</div>
    <Field label={`Desde (${label})`} type="time" step={60} {...register(`workingHours.${index}.startsAt`)} error={errors.workingHours?.[index]?.startsAt?.message} />
    <Field label={`Hasta (${label})`} type="time" step={60} {...register(`workingHours.${index}.endsAt`)} error={errors.workingHours?.[index]?.endsAt?.message} />
    </div>} />
  </fieldset><div className="mt-4 space-y-2"><ErrorMessage message={errors.workingHours?.root?.message ?? errors.workingHours?.message} /><ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /></div><div className="mt-6 flex justify-end gap-3"><Button onClick={onClose} disabled={mutation.isPending}>Cancelar</Button><Button variant="primary" type="submit" busy={mutation.isPending}>Guardar asignaciones y horarios</Button></div></form>
}
