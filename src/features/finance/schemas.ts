import { z } from 'zod'
import { validDate } from '../agenda/utils'

export const decimalSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/)
export const amountInputSchema = z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Usá un importe positivo con hasta dos decimales (punto decimal)')
export const contractInputSchema = z.object({
  professionalId: z.uuid(), contractType: z.enum(['percentage', 'salary', 'fixed_rent']), value: amountInputSchema,
  billingCycle: z.enum(['weekly', 'biweekly', 'monthly']).nullable(), startDate: z.string().refine(validDate, 'Ingresá una fecha válida'), isActive: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.contractType === 'percentage' && Number(value.value) > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'El porcentaje debe estar entre 0 y 100' })
  if (value.contractType === 'fixed_rent' && (!value.billingCycle || Number(value.value) <= 0)) ctx.addIssue({ code: 'custom', path: ['billingCycle'], message: 'El alquiler necesita un importe mayor a cero y un ciclo' })
  if (value.contractType !== 'fixed_rent' && value.billingCycle !== null) ctx.addIssue({ code: 'custom', path: ['billingCycle'], message: 'El ciclo corresponde sólo a alquileres' })
})
export const contractSchema = z.object({ id: z.uuid(), professional_id: z.uuid(), contract_type: z.enum(['percentage', 'salary', 'fixed_rent']), value: decimalSchema, billing_cycle: z.enum(['weekly', 'biweekly', 'monthly']).nullable(), start_date: z.string().nullable(), is_active: z.boolean() })
export const contractsResponseSchema = z.object({ contracts: z.array(contractSchema) })
export const contractResponseSchema = z.object({ contract: contractSchema })
export const checkoutInputSchema = z.object({ paymentMethod: z.literal('cash'), observations: z.string().trim().max(10000, 'Máximo 10000 caracteres') })
export const receiptSchema = z.object({ appointmentId: z.uuid(), status: z.literal('completed'), paymentStatus: z.literal('paid'), totalAmount: decimalSchema, transactionIds: z.array(z.uuid()).min(1) })
export const walkInInputSchema = z.object({ branchId: z.uuid('Seleccioná una sucursal'), schedulerId: z.uuid('Seleccioná una agenda'), professionalId: z.uuid('Seleccioná un profesional'), serviceId: z.uuid('Seleccioná un servicio'), customer: z.object({ displayName: z.string().trim().min(1, 'Ingresá el nombre del cliente').max(150), email: z.string().trim().toLowerCase().pipe(z.email('Ingresá un correo válido').max(320)), phone: z.string().trim().max(40).nullable() }), observations: z.string().trim().max(10000), paymentMethod: z.literal('cash') })
export const balancesResponseSchema = z.object({ balances: z.array(z.object({ professionalId: z.uuid(), name: z.string(), balance: decimalSchema })) })
export const summarySchema = z.object({ totalAmount: decimalSchema, businessEarnings: decimalSchema, professionalEarnings: decimalSchema })
const txBase = { id: z.uuid(), professional_id: z.uuid(), status: z.enum(['completed', 'voided']), created_at: z.iso.datetime({ offset: true }) }
export const personalTransactionSchema = z.object({ ...txBase, amount: decimalSchema })
export const transactionSchema = z.object({ ...txBase, appointment_id: z.uuid().nullable(), total_amount: decimalSchema, business_earnings: decimalSchema, professional_earnings: decimalSchema, payment_method: z.enum(['cash', 'mercado_pago']) })
const pagination = z.object({ total: z.number().int().nonnegative(), limit: z.number().int().positive(), offset: z.number().int().nonnegative() })
export const transactionsResponseSchema = z.object({ entries: z.array(transactionSchema), pagination })
export const personalTransactionsResponseSchema = z.object({ entries: z.array(personalTransactionSchema), pagination })
export const payoutInputSchema = z.object({ professionalId: z.uuid(), amount: amountInputSchema.refine((v) => Number(v) > 0, 'El importe debe ser mayor a cero'), direction: z.enum(['to_professional', 'from_professional']), description: z.string().trim().min(1, 'Ingresá un concepto').max(1000) })
export const payoutResponseSchema = z.object({ settlement: z.object({ id: z.uuid(), professional_id: z.uuid(), amount: decimalSchema, type: z.literal('payout') }) })
export const voidInputSchema = z.object({ reason: z.string().trim().min(1, 'Indicá el motivo de la anulación').max(1000) })
export const voidResponseSchema = z.object({ transactionId: z.uuid(), status: z.literal('voided'), reversedTransactionIds: z.array(z.uuid()), externalRefundRequired: z.boolean().optional() })
export type Contract = z.infer<typeof contractSchema>
export type ContractInput = z.infer<typeof contractInputSchema>
export type WalkInInput = z.infer<typeof walkInInputSchema>
export type Receipt = z.infer<typeof receiptSchema>
export type Balance = z.infer<typeof balancesResponseSchema>['balances'][number]
export type Transaction = z.infer<typeof transactionSchema>
export type PersonalTransaction = z.infer<typeof personalTransactionSchema>
export type PayoutInput = z.infer<typeof payoutInputSchema>
export type CheckoutInput = z.infer<typeof checkoutInputSchema>
