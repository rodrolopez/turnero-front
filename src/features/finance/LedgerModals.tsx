import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { payoutInputSchema, voidInputSchema, type Balance, type PayoutInput, type Transaction } from './schemas'
import { usePayout, useVoid } from './api'
import { money, absoluteAmount } from './utils'
import { useSafeSubmission, SubmissionFeedback } from './useSafeSubmission'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/Field'

export function PayoutModal({ balance, onClose, onSaved }: { balance: Balance; onClose: () => void; onSaved: () => void }) {
  const mutation = usePayout()
  const receiving = balance.balance.startsWith('-')
  const form = useForm<PayoutInput>({ resolver: zodResolver(payoutInputSchema), defaultValues: { professionalId: balance.professionalId, amount: absoluteAmount(balance.balance), direction: receiving ? 'from_professional' : 'to_professional', description: receiving ? 'Cancelación de deuda' : 'Liquidación de saldo' } })
  const state = useSafeSubmission((payload: PayoutInput, key: string) => mutation.mutateAsync({ payload, key }), onSaved)
  return <Modal title={receiving ? 'Registrar cobro de deuda' : 'Registrar pago al profesional'} onClose={onClose} busy={state.locked}><form noValidate className="space-y-5" onSubmit={form.handleSubmit(state.submit)}><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">{balance.name}</p><p className="mt-2 text-xl font-semibold">{money(absoluteAmount(balance.balance))}</p><p className="mt-2 text-sm text-slate-500">{receiving ? 'El profesional entrega este importe al local para cancelar su deuda.' : 'El local entrega este importe al profesional para liquidar su saldo.'}</p></div>
    <fieldset disabled={state.locked} className="space-y-4"><Field label="Importe a registrar" value={absoluteAmount(balance.balance)} readOnly hint="Se registra el saldo completo mostrado. Si cambió, actualizá las cuentas corrientes." /><Field label="Concepto del pago" {...form.register('description')} error={form.formState.errors.description?.message} /></fieldset>
    {form.formState.errors.amount && <p role="alert" className="text-sm text-red-600">{form.formState.errors.amount.message}</p>}
    <SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" busy={state.busy} disabled={state.uncertain}>{receiving ? 'Confirmar cobro de deuda' : 'Confirmar pago'}</Button></div>
  </form></Modal>
}
export function VoidModal({ transaction, onClose, onSaved }: { transaction: Transaction; onClose: () => void; onSaved: (refund: boolean) => void }) {
  const mutation = useVoid()
  const form = useForm<z.infer<typeof voidInputSchema>>({ resolver: zodResolver(voidInputSchema), defaultValues: { reason: '' } })
  const state = useSafeSubmission((input: z.infer<typeof voidInputSchema>) => mutation.mutateAsync({ id: transaction.id, reason: input.reason }), (result) => onSaved(Boolean(result.externalRefundRequired)))
  return <Modal title="Anular cobro" onClose={onClose} busy={state.locked}><form noValidate className="space-y-5" onSubmit={form.handleSubmit(state.submit)}><p className="text-sm leading-relaxed text-slate-600">Vas a anular este recibo y compensar los saldos. Si incluye varios profesionales, se anulará el cobro completo y el turno volverá a estar pendiente de pago.</p><p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Esta operación es contable.{transaction.payment_method === 'mercado_pago' ? ' También deberás gestionar el reembolso en Mercado Pago; la anulación no devuelve el dinero automáticamente.' : ' Si corresponde devolver efectivo al cliente, hacelo por separado.'}</p><fieldset disabled={state.locked}><Field label="Motivo de la anulación" {...form.register('reason')} error={form.formState.errors.reason?.message} /></fieldset><SubmissionFeedback state={state} /><div className="flex justify-end gap-3"><Button disabled={state.locked} onClick={onClose}>Volver</Button><Button type="submit" variant="danger" busy={state.busy} disabled={state.uncertain}>Confirmar anulación</Button></div></form></Modal>
}
