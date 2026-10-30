import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { Field } from '../../components/Field'
import { Button } from '../../components/ui/Button'
import { ErrorMessage } from '../../components/Feedback'
import { getErrorMessage } from '../../api/client'
import { customerSchema, type CustomerInput, type BookingRequest, type BookingResponse } from './schemas'
import { BookingSummary, type Visit } from './BookingSummary'
import { submitPublicBooking } from './api'
import { createBookingAttempt, isSlotConflict, isUncertainResult } from './attempt'

export function CustomerStep({ slug, visit, draft, onDraft, onBack, onConflict, onSuccess }: { slug: string; visit: Visit; draft: CustomerInput; onDraft: (input: CustomerInput) => void; onBack: () => void; onConflict: () => void; onSuccess: (response: BookingResponse) => void }) {
  const [attempt] = useState(createBookingAttempt)
  const [uncertain, setUncertain] = useState(false)
  const inFlight = useRef(false)
  const lastPayload = useRef<BookingRequest | null>(null)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema), defaultValues: draft })
  const mutation = useMutation({
    mutationFn: (payload: BookingRequest) => {
      const request = attempt.forPayload(payload)
      return submitPublicBooking(slug, request.payload, request.idempotencyKey)
    },
    retry: false,
  })
  async function send(payload: BookingRequest) {
    if (inFlight.current) return
    inFlight.current = true
    lastPayload.current = payload
    try {
      const response = await mutation.mutateAsync(payload)
      onSuccess(response)
    } catch (error) {
      if (isSlotConflict(error)) onConflict()
      else setUncertain(isUncertainResult(error))
    } finally { inFlight.current = false }
  }
  async function submit(customer: CustomerInput) {
    if (uncertain) return
    onDraft(customer)
    await send({
      branchId: visit.branch.id, schedulerId: visit.scheduler.id, startsAt: visit.slot.startAt,
      items: [{ serviceId: visit.service.id, professionalSelection: visit.selection }],
      customer: { ...customer, phone: customer.phone || null },
    })
  }
  return <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]"><form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
    <p className="text-sm leading-relaxed text-slate-500">Completá tus datos para reservar. No necesitás crear una cuenta.</p>
    <fieldset disabled={mutation.isPending || uncertain} className="space-y-5 disabled:opacity-60">
      <Field label="Nombre y apellido" autoComplete="name" maxLength={150} {...register('displayName')} error={errors.displayName?.message} />
      <Field label="Correo electrónico" type="email" inputMode="email" autoComplete="email" placeholder="vos@correo.com" maxLength={320} {...register('email')} error={errors.email?.message} />
      <Field label="Teléfono (opcional)" type="tel" autoComplete="tel" placeholder="+54 9…" maxLength={40} {...register('phone')} error={errors.phone?.message} />
    </fieldset>
    {visit.scheduler.requires_approval && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Esta reserva requiere aprobación. Al enviarla, verás el plazo en el que la empresa debe confirmarla.</p>}
    {uncertain ? <div role="alert" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>No pudimos confirmar el resultado del envío. Para evitar duplicados, verificá la misma reserva antes de cambiar los datos o iniciar otra.</p><Button busy={mutation.isPending} variant="primary" onClick={() => { if (lastPayload.current) void send(lastPayload.current) }}>Verificar mi reserva</Button></div> : <ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} />}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><Button disabled={mutation.isPending || uncertain} onClick={() => { onDraft(getValues()); onBack() }}><ArrowLeft size={16} />Volver</Button>{!uncertain && <Button type="submit" variant="primary" busy={mutation.isPending}>{mutation.isPending ? 'Enviando…' : visit.scheduler.requires_approval ? 'Solicitar turno' : 'Reservar turno'}<ArrowRight size={16} /></Button>}</div>
    <p className="flex items-center gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck size={16} className="shrink-0 text-teal-700" />Esperá el comprobante antes de iniciar otra reserva.</p>
  </form><aside className="order-first lg:order-last"><BookingSummary visit={visit} /></aside></div>
}
