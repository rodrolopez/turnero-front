import { ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, MoreHorizontal, Plus } from 'lucide-react'

const days = ['Lun 12', 'Mar 13', 'Mié 14', 'Jue 15']
const appointments = [
  { day: 0, time: '09:00', service: 'Corte + barba', name: 'Nicolás', top: 34, height: 76, style: 'preview-booking-green' },
  { day: 0, time: '11:00', service: 'Corte', name: 'Julieta', top: 204, height: 68, style: 'preview-booking-beige' },
  { day: 1, time: '10:00', service: 'Color', name: 'Florencia', top: 120, height: 112, style: 'preview-booking-lilac' },
  { day: 2, time: '09:00', service: 'Corte', name: 'Santiago', top: 34, height: 68, style: 'preview-booking-beige' },
  { day: 2, time: '10:30', service: 'Corte + barba', name: 'Marcos', top: 164, height: 100, style: 'preview-booking-green' },
  { day: 3, time: '09:30', service: 'Corte', name: 'Martina', top: 77, height: 68, style: 'preview-booking-lilac' },
  { day: 3, time: '11:00', service: 'Corte', name: 'Lucía', top: 204, height: 68, style: 'preview-booking-beige' },
]
/** Static, clearly labelled product illustration; no invented customer results. */
export function ProductPreview() {
  return <div className="landing-product-wrap">
    <div className="landing-product" role="img" aria-label="Vista ilustrativa de una agenda semanal con turnos organizados por día. Los datos son de ejemplo.">
      <div className="preview-topbar"><span className="preview-logo"><CalendarDays size={17} />Mi local</span><span className="preview-online"><span /> En orden</span><span className="preview-avatar">ML</span></div>
      <div className="preview-toolbar"><div><span className="preview-eyebrow">TU SEMANA, A SIMPLE VISTA</span><p>Todo tiene su lugar.</p></div><div className="preview-add"><Plus size={14} /><span>Nuevo turno</span></div></div>
      <div className="preview-calendar-nav"><span>Octubre</span><div><ChevronLeft size={14} /><span>Esta semana</span><ChevronRight size={14} /></div><MoreHorizontal size={17} /></div>
      <div className="preview-calendar"><div className="preview-times">{['09:00', '10:00', '11:00', '12:00'].map((hour) => <span key={hour}>{hour}</span>)}</div><div className="preview-days">{days.map((day, index) => <div className="preview-day" key={day}><span className={index === 1 ? 'preview-today' : ''}>{day}</span><div className="preview-day-body">{appointments.filter((appointment) => appointment.day === index).map((appointment) => <div key={appointment.name} className={`preview-booking ${appointment.style}`} style={{ top: appointment.top, height: appointment.height }}><span>{appointment.time}</span><strong>{appointment.service}</strong><span>{appointment.name}</span></div>)}</div></div>)}</div></div>
      <div className="preview-bottom"><span><span className="preview-dot" /> Agenda organizada</span><span>Vista semanal <ArrowUpRight size={13} /></span></div>
    </div>
    <div className="preview-reservation"><span className="preview-check"><Check size={18} /></span><div><strong>Una reserva más. Un mensaje menos.</strong><span>Tu cliente eligió su horario online.</span></div></div>
    <div className="preview-insight"><span className="preview-insight-icon"><Clock3 size={18} /></span><p>Entendé cuándo<br /><strong>eligen reservar.</strong></p><div className="preview-mini-bars">{[30, 48, 37, 64, 90, 58, 42].map((height, i) => <span key={i} style={{ height }} />)}</div><span className="preview-insight-caption">Reservas por momento del día</span></div>
    <p className="preview-disclaimer">Vista ilustrativa · Datos de ejemplo</p>
  </div>
}
