import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/Field'
import { ErrorMessage } from '../../components/Feedback'
import { QueryError, Loading } from '../../components/ui/QueryState'
import { getErrorMessage } from '../../api/client'
import type { Branch } from '../catalog/schemas'
import { branchHoursFormSchema, type BranchHoursInput } from './schemas'
import { useBranchHours, useSaveBranchHours } from './api'
import { WeekEditor } from './WeekEditor'

export function BranchHoursModal({ branch, onClose, onSaved }: { branch: Branch; onClose: () => void; onSaved: () => void }) {
  const query = useBranchHours(branch.id)
  const [busy, setBusy] = useState(false)
  return <Modal title={`Horarios · ${branch.name}`} onClose={onClose} wide busy={busy}>
    <p className="mb-5 text-sm text-slate-500">Horarios locales en {branch.timezone}. Podés definir varios tramos por día; sin tramos, la sucursal no atiende.</p>
    {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : <BranchHoursForm branchId={branch.id} initial={query.data} onClose={onClose} onSaved={onSaved} setBusy={setBusy} />}
  </Modal>
}
function BranchHoursForm({ branchId, initial, onClose, onSaved, setBusy }: { branchId: string; initial: BranchHoursInput; onClose: () => void; onSaved: () => void; setBusy: (busy: boolean) => void }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<BranchHoursInput>({ resolver: zodResolver(branchHoursFormSchema), defaultValues: initial })
  const { fields, append, remove } = useFieldArray({ control, name: 'hours' })
  const mutation = useSaveBranchHours(branchId)
  async function save(input: BranchHoursInput) {
    setBusy(true)
    try { await mutation.mutateAsync(input); onSaved() } catch { /* The mutation error is rendered below. */ } finally { setBusy(false) }
  }
  return <form noValidate onSubmit={handleSubmit(save)}><fieldset disabled={mutation.isPending}><WeekEditor rows={fields} limit={100} disabled={mutation.isPending} onAdd={(weekday) => append({ weekday, startsAt: '09:00', endsAt: '18:00' })} onRemove={remove} renderRow={(index, label) => <div className="grid grid-cols-2 gap-3">
    <Field label={`Desde (${label})`} type="time" step={60} {...register(`hours.${index}.startsAt`)} error={errors.hours?.[index]?.startsAt?.message} />
    <Field label={`Hasta (${label})`} type="time" step={60} {...register(`hours.${index}.endsAt`)} error={errors.hours?.[index]?.endsAt?.message} />
  </div>} /></fieldset><div className="mt-4 space-y-2"><ErrorMessage message={errors.hours?.root?.message ?? errors.hours?.message} /><ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /></div>
    <div className="mt-6 flex justify-end gap-3"><Button onClick={onClose} disabled={mutation.isPending}>Cancelar</Button><Button type="submit" variant="primary" busy={mutation.isPending}>Guardar horarios</Button></div>
  </form>
}
