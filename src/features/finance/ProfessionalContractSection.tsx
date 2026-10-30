import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '../../stores/useAuthStore'
import type { Tenant } from '../../lib/schemas'
import type { Professional } from '../catalog/schemas'
import { useContracts, useDeactivateContract, useSaveContract } from './api'
import { contractInputSchema, type Contract, type ContractInput } from './schemas'
import { contractLabels, money } from './utils'
import { dateInZone } from '../booking/utils'
import { Loading, ErrorMessage } from '../../components/Feedback'
import { QueryError } from '../../components/ui/QueryState'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/Field'
import { getErrorMessage } from '../../api/client'

export function ProfessionalContractSection({ professional, initialEditing = false, onConfigured, onBusyChange }: { professional: Professional; initialEditing?: boolean; onConfigured?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const role = useAuthStore((state) => state.tenantRole)
  return role === 'OWNER' ? <OwnerContractSection professional={professional} initialEditing={initialEditing} onConfigured={onConfigured} onBusyChange={onBusyChange} /> : null
}
function OwnerContractSection({ professional, initialEditing, onConfigured, onBusyChange }: { professional: Professional; initialEditing: boolean; onConfigured?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const query = useContracts()
  const [editing, setEditing] = useState(initialEditing)
  const [deactivating, setDeactivating] = useState(false)
  const [notice, setNotice] = useState('')
  const deactivate = useDeactivateContract()
  const contract = query.data?.find((item) => item.professional_id === professional.id)
  return <section className="mt-7 space-y-4 border-t border-slate-200 pt-6" aria-label="Contrato financiero"><h3 className="font-semibold">Contrato financiero · Sólo propietario</h3><p className="text-sm text-slate-500">Definí cómo se distribuyen los cobros de {professional.display_name}. Los cobros anteriores conservan su reparto original.</p>
    {notice && <p role="status" className="text-sm text-teal-800">{notice}</p>}
    {query.isPending ? <Loading label="Cargando contrato…" /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : editing ? <ContractForm professional={professional} contract={contract} onBusyChange={onBusyChange} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice('Contrato guardado.'); onConfigured?.() }} /> : <>
      {contract ? <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">{contractLabels[contract.contract_type]} · {contract.is_active ? 'Activo' : 'Inactivo'}</p><p className="mt-2">{contract.contract_type === 'percentage' ? `${contract.value}% para el profesional` : money(contract.value)} · Desde {contract.start_date ?? 'Sin fecha configurada'}</p></div> : <p className="text-sm text-amber-800">Sin contrato. No se podrán cobrar sus servicios hasta configurarlo.</p>}
      <div className="flex flex-wrap gap-3"><Button onClick={() => { setNotice(''); setDeactivating(false); setEditing(true) }}>{contract ? 'Editar contrato' : 'Configurar contrato'}</Button>{contract?.is_active && <Button onClick={() => { deactivate.reset(); setDeactivating(true) }}>Desactivar contrato</Button>}</div>
      {deactivating && contract && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm">El profesional no podrá recibir nuevos cobros ni cargos de alquiler mientras el contrato esté inactivo. El historial se conserva.</p><ErrorMessage message={deactivate.isError ? getErrorMessage(deactivate.error) : undefined} /><div className="flex gap-3"><Button disabled={deactivate.isPending} onClick={() => setDeactivating(false)}>Volver</Button><Button variant="danger" busy={deactivate.isPending} onClick={() => deactivate.mutate(contract.id, { onSuccess: () => { setDeactivating(false); setNotice('Contrato desactivado.') } })}>Confirmar baja del contrato</Button></div></div>}
    </>}
  </section>
}
function ContractForm({ professional, contract, onCancel, onSaved, onBusyChange }: { professional: Professional; contract?: Contract; onCancel: () => void; onSaved: () => void; onBusyChange?: (busy: boolean) => void }) {
  const tenant = useOutletContext<Tenant>()
  const mutation = useSaveContract()
  const sending = useRef(false)
  const form = useForm<ContractInput>({ resolver: zodResolver(contractInputSchema), defaultValues: { professionalId: professional.id, contractType: contract?.contract_type ?? 'percentage', value: contract?.value ?? '0.00', billingCycle: contract?.billing_cycle ?? null, startDate: contract?.start_date ?? dateInZone(tenant.timezone), isActive: contract?.is_active ?? true } })
  const type = form.watch('contractType'), errors = form.formState.errors
  return <form noValidate className="space-y-4" onSubmit={form.handleSubmit(async (payload) => {
    if (sending.current) return
    sending.current = true; onBusyChange?.(true)
    try { await mutation.mutateAsync({ id: contract?.id, payload }); onSaved() } catch { /* Render API error and keep data. */ } finally { sending.current = false; onBusyChange?.(false) }
  })}><fieldset disabled={mutation.isPending} className="space-y-4"><div><label htmlFor="contract-type" className="mb-2 block text-sm font-medium">Modelo de trabajo</label><select id="contract-type" className="input" {...form.register('contractType', { onChange: () => form.setValue('billingCycle', null) })}>{Object.entries(contractLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <Field label={type === 'percentage' ? 'Porcentaje del profesional' : type === 'fixed_rent' ? 'Alquiler por ciclo' : 'Sueldo de referencia'} inputMode="decimal" {...form.register('value')} error={errors.value?.message} hint={type === 'percentage' ? '0% asigna todo al local; 100% al profesional.' : type === 'salary' ? 'Los servicios no generan comisiones ni saldo por sueldo.' : 'El alquiler se carga por adelantado en cada vencimiento.'} />
    {type === 'fixed_rent' && <div><label htmlFor="contract-cycle" className="mb-2 block text-sm font-medium">Ciclo de facturación</label><select id="contract-cycle" className="input" {...form.register('billingCycle', { setValueAs: (v: string) => v || null })}><option value="">Seleccioná un ciclo</option><option value="weekly">Semanal</option><option value="biweekly">Cada 14 días</option><option value="monthly">Mensual</option></select><ErrorMessage message={errors.billingCycle?.message} /></div>}
    <Field type="date" label="Fecha de inicio" {...form.register('startDate')} error={errors.startDate?.message} /><label className="check-label"><input type="checkbox" {...form.register('isActive')} />Contrato activo</label>
  </fieldset><ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /><div className="flex justify-end gap-3"><Button disabled={mutation.isPending} onClick={onCancel}>Volver al contrato</Button><Button type="submit" variant="primary" busy={mutation.isPending}>Guardar contrato</Button></div></form>
}
