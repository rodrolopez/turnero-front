import { useAuthStore } from '../../stores/useAuthStore'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext } from 'react-router-dom'
import { Field } from '../../components/Field'
import { ErrorMessage } from '../../components/Feedback'
import { Button } from '../../components/ui/Button'
import type { Tenant } from '../../lib/schemas'
import { branchFormSchema, serviceFormSchema, professionalFormSchema, type Branch, type Service, type Professional, type BranchInput, type ServiceInput, type ProfessionalInput } from './schemas'

export interface EditorProps<T, TInput> { item?: T; onSave: (input: TInput) => void; onCancel: () => void; busy: boolean; error?: string }
function FormBody({ children, busy, error, onCancel }: { children: ReactNode; busy: boolean; error?: string; onCancel: () => void }) {
  return <><fieldset disabled={busy} className="space-y-5 disabled:opacity-70">{children}</fieldset><div className="mt-5"><ErrorMessage message={error} /></div><div className="mt-6 flex justify-end gap-3"><Button onClick={onCancel} disabled={busy}>Cancelar</Button><Button type="submit" variant="primary" busy={busy}>Guardar cambios</Button></div></>
}
export function BranchForm({ item, onSave, ...rest }: EditorProps<Branch, BranchInput>) {
  const tenant = useOutletContext<Tenant>()
  const { register, handleSubmit, formState: { errors } } = useForm<BranchInput>({ resolver: zodResolver(branchFormSchema), defaultValues: { name: item?.name ?? '', address: item?.address ?? '', timezone: item?.timezone ?? tenant.timezone, isActive: item?.is_active ?? true } })
  return <form noValidate onSubmit={handleSubmit(onSave)}><FormBody {...rest}>
    <Field label="Nombre de la sucursal" maxLength={150} {...register('name')} error={errors.name?.message} />
    <Field label="Dirección" maxLength={2000} {...register('address')} error={errors.address?.message} />
    <Field label="Zona horaria" {...register('timezone')} error={errors.timezone?.message} hint="Los horarios se interpretan en esta zona horaria." />
    <label className="check-label"><input type="checkbox" {...register('isActive')} />Sucursal activa</label>
  </FormBody></form>
}
export function ServiceForm({ item, onSave, ...rest }: EditorProps<Service, ServiceInput>) {
  const { register, handleSubmit, formState: { errors } } = useForm<ServiceInput>({ resolver: zodResolver(serviceFormSchema), defaultValues: { name: item?.name ?? '', durationMinutes: item?.duration_minutes ?? 30, price: item ? Number(item.price) : 0, isActive: item?.is_active ?? true } })
  return <form noValidate onSubmit={handleSubmit(onSave)}><FormBody {...rest}>
    <Field label="Nombre del servicio" maxLength={150} {...register('name')} error={errors.name?.message} />
    <Field label="Duración (minutos)" type="number" min={15} step={15} {...register('durationMinutes', { valueAsNumber: true })} error={errors.durationMinutes?.message} hint="En intervalos de 15 minutos." />
    <Field label="Precio" type="number" min={0} step="0.01" {...register('price', { valueAsNumber: true })} error={errors.price?.message} />
    <label className="check-label"><input type="checkbox" {...register('isActive')} />Servicio activo</label>
  </FormBody></form>
}
export function ProfessionalForm({ item, onSave, creationExtras, ...rest }: EditorProps<Professional, ProfessionalInput> & { creationExtras?: ReactNode }) {
  const isAdmin = useAuthStore((state) => state.tenantRole === 'ADMIN')
  const { register, handleSubmit, formState: { errors } } = useForm<ProfessionalInput>({ resolver: zodResolver(professionalFormSchema), defaultValues: { displayName: item?.display_name ?? '', userId: item?.user_id ?? '', isActive: item?.is_active ?? true } })
  return <form noValidate onSubmit={handleSubmit(onSave)}><FormBody {...rest}>
    <Field label="Nombre del profesional" maxLength={150} {...register('displayName')} error={errors.displayName?.message} />
    <Field disabled={isAdmin} label="ID de usuario (opcional)" {...register('userId')} error={errors.userId?.message} hint={isAdmin ? "Sólo el propietario puede cambiar la cuenta vinculada." : "UUID del usuario existente. Dejalo vacío para no vincular una cuenta."} />
    {!isAdmin && <label className="check-label"><input type="checkbox" {...register('isActive')} />Profesional activo</label>}
  </FormBody></form>
}
