import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ArrowLeft, ArrowRight, Building2, Check, Scissors, Sparkles, UserRound } from 'lucide-react'
import { usePublicCatalog } from '../features/booking/api'
import { ChoiceCard } from '../features/booking/ChoiceCard'
import { DateTimeStep } from '../features/booking/DateTimeStep'
import { CustomerStep } from '../features/booking/CustomerStep'
import { BookingSuccess } from '../features/booking/BookingSuccess'
import { eligibleProfessionals, formatPrice } from '../features/booking/utils'
import { slotConflictMessage } from '../features/booking/attempt'
import type { PublicCatalog, ProfessionalSelection, Slot, CustomerInput, BookingResponse } from '../features/booking/schemas'
import type { Visit } from '../features/booking/BookingSummary'
import { Button } from '../components/ui/Button'
import { BookingSkeleton } from '../features/booking/BookingSkeleton'
import { ErrorMessage } from '../components/Feedback'
import { getErrorMessage } from '../api/client'

const steps = ['Tu visita', 'Profesional', 'Fecha y hora', 'Tus datos']
const emptyCustomer: CustomerInput = { displayName: '', email: '', phone: '' }

export default function PublicBookingPage() {
  const { tenantSlug = '' } = useParams()
  const catalog = usePublicCatalog(tenantSlug)
  useEffect(() => {
    const previous = document.title
    document.title = catalog.data ? `Reservá tu turno | ${catalog.data.tenant.name}` : 'Reservá tu turno | Turnero'
    return () => { document.title = previous }
  }, [catalog.data])
  if (catalog.isPending) return <BookingSkeleton />
  if (catalog.isError) return <section className="card mx-auto max-w-lg space-y-4 text-center"><h1 className="text-2xl font-semibold">{isAxiosError(catalog.error) && catalog.error.response?.status === 404 ? 'No encontramos esta empresa' : 'No pudimos cargar las reservas'}</h1><p className="text-sm text-slate-500">{isAxiosError(catalog.error) && catalog.error.response?.status === 404 ? 'Revisá el enlace que te compartieron o consultá con la empresa.' : getErrorMessage(catalog.error)}</p><Button onClick={() => void catalog.refetch()}>Volver a intentar</Button></section>
  return <BookingWizard key={tenantSlug} slug={tenantSlug} catalog={catalog.data} refreshing={catalog.isFetching} onRefresh={() => void catalog.refetch()} />
}
function BookingWizard({ slug, catalog, refreshing, onRefresh }: { slug: string; catalog: PublicCatalog; refreshing: boolean; onRefresh: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [branchId, setBranchId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [schedulerId, setSchedulerId] = useState('')
  const [selection, setSelection] = useState<ProfessionalSelection>({ mode: 'any' })
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [draft, setDraft] = useState<CustomerInput>(emptyCustomer)
  const [rejectedStart, setRejectedStart] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [success, setSuccess] = useState<{ response: BookingResponse; visit: Visit } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [step, success])
  const branch = catalog.branches.find((item) => item.id === branchId)
  const service = catalog.services.find((item) => item.id === serviceId)
  const schedulers = catalog.schedulers.filter((item) => item.branch_id === null || item.branch_id === branchId)
  const scheduler = schedulers.find((item) => item.id === schedulerId) ?? schedulers[0]
  const professionals = branch && service && scheduler ? eligibleProfessionals(catalog.professionals, branch.id, service.id, scheduler) : []
  const validProfessional = professionals.length > 0 && (selection.mode === 'any' || professionals.some((item) => selection.mode === 'specific' && item.id === selection.professionalId))
  function clearTime() { setDate(''); setSlot(null); setRejectedStart(null); setConflict(false) }
  function reset() { setStep(1); setBranchId(''); setServiceId(''); setSchedulerId(''); setSelection({ mode: 'any' }); clearTime(); setDraft(emptyCustomer); setSuccess(null) }
  const baseReady = branch && service && scheduler
  const visit = baseReady && slot ? { branch, service, scheduler, professionals, selection, date, slot } : null
  const configured = catalog.branches.length > 0 && catalog.services.length > 0 && catalog.schedulers.length > 0

  return <div className="mx-auto max-w-4xl"><div className="mb-7 text-center"><p className="eyebrow">RESERVAS ONLINE</p><h1 ref={heading} tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-tight outline-none sm:text-4xl">{catalog.tenant.name}</h1><p className="mt-3 text-sm text-slate-500">Tu próximo turno, en unos pocos pasos.</p></div>
    <div className="card !p-5 sm:!p-8">
      {success ? <BookingSuccess response={success.response} visit={success.visit} onReset={reset} /> : !configured ? <section className="py-8 text-center"><Building2 className="mx-auto mb-4 text-teal-700" size={36} /><h2 className="text-xl font-semibold">Las reservas online todavía no están habilitadas</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">La empresa está preparando sus servicios y horarios. Por favor, consultá directamente para coordinar tu visita.</p><Button className="mt-5" onClick={onRefresh} busy={refreshing}>Volver a consultar</Button></section> : <>
        <nav aria-label="Pasos de la reserva"><ol className="mb-7 grid grid-cols-4 gap-2 border-b border-slate-100 pb-6">{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className="flex flex-col items-center gap-2 text-center"><span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step >= index + 1 ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{step > index + 1 ? <Check size={15} /> : index + 1}</span><span className={`text-[11px] sm:text-xs ${step === index + 1 ? 'font-semibold text-teal-800' : 'text-slate-500'}`}>{label}</span></li>)}</ol></nav>
        <div className="mb-6"><p className="text-xs font-medium text-teal-700">Paso {step} de 4</p><h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{['¿Dónde y qué te gustaría reservar?', '¿Con quién te gustaría atenderte?', 'Encontrá tu mejor momento', 'Ya casi estamos. Faltan tus datos.'][step - 1]}</h2></div>
        {step > 1 && !baseReady ? <div className="space-y-4"><ErrorMessage message="La configuración de esta visita cambió. Por favor, elegí la sucursal y el servicio nuevamente." /><Button onClick={reset}>Volver a empezar</Button></div> : <>
          {step === 1 && <><fieldset><legend className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 size={17} className="text-teal-700" />Elegí una sucursal</legend><div className="grid gap-3 sm:grid-cols-2">{catalog.branches.map((item) => <ChoiceCard key={item.id} name="branch" value={item.id} checked={branchId === item.id} onChange={() => { setBranchId(item.id); setSchedulerId(''); setSelection({ mode: 'any' }); clearTime() }}><span className="block text-sm font-semibold">{item.name}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.address || 'Dirección a coordinar con la empresa'}</span></ChoiceCard>)}</div></fieldset>
            <fieldset className="mt-7"><legend className="mb-3 flex items-center gap-2 text-sm font-semibold"><Scissors size={17} className="text-teal-700" />Elegí tu servicio</legend><div className="grid gap-3 sm:grid-cols-2">{catalog.services.map((item) => <ChoiceCard key={item.id} name="service" value={item.id} checked={serviceId === item.id} onChange={() => { setServiceId(item.id); setSelection({ mode: 'any' }); clearTime() }}><span className="block text-sm font-semibold">{item.name}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span>{item.duration_minutes} minutos</span><span>Precio: {formatPrice(item.price)}</span></span></ChoiceCard>)}</div></fieldset>
            {branch && schedulers.length > 1 && <div className="mt-6"><label htmlFor="public-scheduler" className="mb-2 block text-sm font-semibold">Agenda de atención</label><select id="public-scheduler" className="input" value={scheduler?.id ?? ''} onChange={(event) => { setSchedulerId(event.target.value); setSelection({ mode: 'any' }); clearTime() }}>{schedulers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.requires_approval ? ' · Con aprobación' : ''}</option>)}</select></div>}
            {branch && !schedulers.length && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Esta sucursal todavía no habilitó las reservas online. Podés elegir otra sucursal o consultar con la empresa.</p>}
            <div className="mt-7 flex justify-end border-t border-slate-100 pt-5"><Button variant="primary" disabled={!baseReady} onClick={() => setStep(2)}>Continuar<ArrowRight size={16} /></Button></div>
          </>}
          {step === 2 && <>{professionals.length ? <fieldset><legend className="mb-4 text-sm text-slate-500">Estos profesionales realizan el servicio y tienen horarios de atención configurados en la sucursal elegida.</legend><div className="space-y-3"><ChoiceCard name="professional" value="any" checked={selection.mode === 'any'} featured onChange={() => { setSelection({ mode: 'any' }); clearTime() }}><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><Sparkles size={22} /></span><div><span className="block text-sm font-semibold text-teal-900">Cualquiera disponible</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">Más opciones de horarios. Elegimos un profesional habilitado para vos.</span></div></div></ChoiceCard><div className="grid gap-3 sm:grid-cols-2">{professionals.map((professional) => <ChoiceCard key={professional.id} name="professional" value={professional.id} checked={selection.mode === 'specific' && selection.professionalId === professional.id} onChange={() => { setSelection({ mode: 'specific', professionalId: professional.id }); clearTime() }}><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={20} /></span><span className="text-sm font-semibold">{professional.display_name}</span></div></ChoiceCard>)}</div></div></fieldset> : <p className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">Todavía no hay profesionales con horarios compatibles para este servicio en la sucursal y agenda elegidas. Probá otro servicio o sucursal.</p>}<div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5"><Button onClick={() => setStep(1)}><ArrowLeft size={16} />Volver</Button><Button variant="primary" disabled={!validProfessional} onClick={() => setStep(3)}>Continuar<ArrowRight size={16} /></Button></div></>}
          {step === 3 && branch && service && scheduler && <>{conflict && <div className="mb-5"><ErrorMessage message={slotConflictMessage} /></div>}<DateTimeStep slug={slug} branch={branch} service={service} scheduler={scheduler} professionals={professionals} selection={selection} date={date} slot={slot} rejectedStart={rejectedStart} onDate={(value) => { setDate(value); setSlot(null); setRejectedStart(null) }} onSlot={(value) => { setSlot(value); setConflict(false) }} onBack={() => setStep(2)} onNext={() => setStep(4)} /></>}
          {step === 4 && visit && <CustomerStep slug={slug} visit={visit} draft={draft} onDraft={setDraft} onBack={() => setStep(3)} onConflict={() => { setRejectedStart(slot?.startAt ?? null); setSlot(null); setConflict(true); setStep(3); void queryClient.invalidateQueries({ queryKey: ['public-availability', slug] }) }} onSuccess={(response) => { setSuccess({ response, visit }); void queryClient.invalidateQueries({ queryKey: ['public-availability', slug] }) }} />}
        </>}
      </>}
    </div><p className="mt-5 text-center text-xs text-slate-400">Reservas con Turnero · Sin registro ni pagos online</p>
  </div>
}
