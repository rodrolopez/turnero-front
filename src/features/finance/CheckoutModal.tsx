import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useCheckout } from './api'
import { checkoutInputSchema, type CheckoutInput, type Receipt } from './schemas'
import { money, sumMoney } from './utils'
import { SubmissionFeedback, useSafeSubmission } from './useSafeSubmission'
import type { AgendaAppointment } from '../agenda/schemas'

export function CheckoutModal({ appointment, onClose, onSaved }: { appointment: AgendaAppointment; onClose: () => void; onSaved: (receipt: Receipt) => void }) {
  const mutation = useCheckout()
  const form = useForm<CheckoutInput>({ resolver: zodResolver(checkoutInputSchema), defaultValues: { paymentMethod: 'cash', observations: appointment.observations ?? '' } })
  const state = useSafeSubmission((payload: CheckoutInput) => mutation.mutateAsync({ id: appointment.id, payload }), onSaved)
  return <Modal title="Cobrar turno" onClose={onClose} busy={state.locked}><form noValidate className="space-y-5" onSubmit={form.handleSubmit(state.submit)}>
    <div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">{appointment.customer.displayName}</p><p className="mt-1 text-sm text-slate-500">{appointment.branch.name} · {appointment.items.map((item) => item.serviceName).join(', ')}</p><p className="mt-3 text-2xl font-semibold text-teal-800">{money(sumMoney(appointment.items.map((item) => item.price)))}</p></div>
    <fieldset disabled={state.locked} className="space-y-4"><div><label htmlFor="checkout-method" className="mb-2 block text-sm font-medium">Medio de pago</label><select id="checkout-method" className="input" {...form.register('paymentMethod')}><option value="cash">Efectivo</option></select></div><div><label htmlFor="checkout-notes" className="mb-2 block text-sm font-medium">Observaciones</label><textarea id="checkout-notes" rows={3} className="input" maxLength={10000} {...form.register('observations')} aria-invalid={Boolean(form.formState.errors.observations)} /><p className="text-xs text-red-600">{form.formState.errors.observations?.message}</p></div></fieldset>
    <p className="text-xs text-slate-500">Al confirmar, el turno quedará completado y pagado. Cada profesional debe tener un contrato activo vigente.</p><SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onClose}>Volver</Button><Button variant="primary" type="submit" busy={state.busy} disabled={state.uncertain}>Confirmar cobro</Button></div>
  </form></Modal>
}
