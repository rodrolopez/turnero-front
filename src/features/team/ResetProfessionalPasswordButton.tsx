import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { z } from 'zod'
import { useAuthStore } from '../../stores/useAuthStore'
import { api } from '../../api/client'
import { useCatalogMutation } from '../catalog/api'
import type { Professional } from '../catalog/schemas'
import { useSafeSubmission, SubmissionFeedback } from '../finance/useSafeSubmission'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

export function ResetProfessionalPasswordButton({ professional }: { professional: Professional }) {
  const role = useAuthStore((s) => s.tenantRole)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  if (role !== 'OWNER' || !professional.user_id) return null
  return <><Button aria-label={`Restablecer contraseña de ${professional.display_name}`} title={professional.access_role === 'OWNER' || professional.access_role === 'ADMIN' ? 'El restablecimiento de empleados no modifica cuentas OWNER o ADMIN' : done ? 'Contraseña temporal restablecida' : 'Restablecer contraseña'} disabled={professional.access_role === 'OWNER' || professional.access_role === 'ADMIN'} onClick={() => setOpen(true)}><KeyRound size={16} /></Button>
    {done && <span role="status" className="text-xs text-teal-700">Contraseña temporal lista</span>}
    {open && <ResetModal professional={professional} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setDone(true) }} />}
  </>
}
function ResetModal({ professional, onClose, onSaved }: { professional: Professional; onClose: () => void; onSaved: () => void }) {
  const mutation = useCatalogMutation(async (tenantId, key: string) => {
    if (useAuthStore.getState().tenantRole !== 'OWNER') throw new Error('Sólo el propietario puede restablecer credenciales')
    const response = z.object({ professionalId: z.uuid(), requiresPasswordChange: z.literal(true) }).parse((await api.post<unknown>(`/professionals/${professional.id}/reset-password`, undefined, { headers: { 'X-Tenant-Id': tenantId, 'Idempotency-Key': key } })).data)
    if (response.professionalId !== professional.id) throw new Error('La respuesta no corresponde al profesional')
    return response
  })
  const state = useSafeSubmission((_input: { id: string }, key: string) => mutation.mutateAsync(key), onSaved)
  return <Modal title="Restablecer contraseña del empleado" onClose={onClose} busy={state.locked}><div className="space-y-5"><p className="text-sm leading-relaxed text-slate-600">La cuenta de <strong>{professional.display_name}</strong>{professional.access_email ? ` (${professional.access_email})` : ''} volverá a usar la contraseña temporal <strong>12345678</strong>. Se invalidarán sus sesiones anteriores y deberá elegir una contraseña nueva al ingresar.</p><SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onClose}>Cancelar</Button><Button variant="danger" busy={state.busy} disabled={state.uncertain} onClick={() => void state.submit({ id: professional.id })}>Restablecer contraseña</Button></div></div></Modal>
}
