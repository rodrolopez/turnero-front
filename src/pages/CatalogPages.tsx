import { ResetProfessionalPasswordButton } from '../features/team/ResetProfessionalPasswordButton'
import { useAuthStore } from '../stores/useAuthStore'
import { TeamAccounts } from '../features/team/TeamAccounts'
import { roleLabels } from '../features/team/api'
import { ProfessionalCreateForm } from '../features/finance/ProfessionalCreateForm'
import { ProfessionalContractSection } from '../features/finance/ProfessionalContractSection'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { branchesResource, servicesResource, professionalsResource } from '../features/catalog/api'
import { BranchForm, ServiceForm, ProfessionalForm } from '../features/catalog/forms'
import { BranchHoursModal } from '../features/hours/BranchHoursModal'
import { ProfessionalHoursModal } from '../features/hours/ProfessionalHoursModal'

const number = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function BranchesPage() {
  return <CatalogPage title="Sucursales" singular="sucursal" description="Administrá tus lugares de atención y sus horarios de apertura." resource={branchesResource} nameOf={(item) => item.name} Editor={BranchForm} columns={[
    { title: 'Nombre', render: (item) => <span className="font-semibold">{item.name}</span> },
    { title: 'Dirección', render: (item) => item.address || 'Sin dirección' },
    { title: 'Zona horaria', render: (item) => <span className="text-xs text-slate-500">{item.timezone}</span> },
  ]} renderSchedule={(branch, onClose, onSaved) => <BranchHoursModal key={branch.id} branch={branch} onClose={onClose} onSaved={onSaved} />} />
}
export function ServicesPage() {
  return <CatalogPage title="Servicios" singular="servicio" description="Definí qué ofrecés, la duración de cada servicio y su precio." resource={servicesResource} nameOf={(item) => item.name} Editor={ServiceForm} columns={[
    { title: 'Nombre', render: (item) => <span className="font-semibold">{item.name}</span> },
    { title: 'Duración', render: (item) => `${item.duration_minutes} min` },
    { title: 'Precio', render: (item) => number.format(Number(item.price)) },
  ]} />
}
export function ProfessionalsPage() {
  const role = useAuthStore((s) => s.tenantRole)
  return <><CatalogPage canDelete={role === 'OWNER'} activeOnly={role === 'ADMIN'} canCreate={role === 'OWNER'} createLabel="Agregar al equipo" createTitle="Agregar al equipo" CreateEditor={ProfessionalCreateForm} title="Profesionales" singular="profesional" description="Organizá tu equipo, sus servicios y los horarios de atención en cada sucursal." resource={professionalsResource} nameOf={(item) => item.display_name} Editor={ProfessionalForm} columns={[
    { title: 'Nombre', render: (item) => <span className="font-semibold">{item.display_name}</span> },
    { title: 'Rol de acceso', render: (item) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{item.access_role ? roleLabels[item.access_role] : 'Profesional · Sin acceso'}</span> },
    { title: 'Cuenta vinculada', render: (item) => <span className="text-xs text-slate-500">{item.access_email || item.user_id || 'Sin cuenta vinculada'}</span> },
  ]} renderActions={(professional) => <ResetProfessionalPasswordButton professional={professional} />} renderEditorExtra={(professional) => <ProfessionalContractSection professional={professional} />} renderSchedule={(professional, onClose, onSaved) => <ProfessionalHoursModal key={professional.id} professional={professional} onClose={onClose} onSaved={onSaved} />} /><TeamAccounts /></>
}
