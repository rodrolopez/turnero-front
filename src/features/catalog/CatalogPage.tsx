import { useState, type ComponentType, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Clock3, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Tenant } from '../../lib/schemas'
import { getErrorMessage } from '../../api/client'
import { ErrorMessage } from '../../components/Feedback'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { QueryError } from '../../components/ui/QueryState'
import { useCatalog, useCatalogMutation, type CatalogResource, type CatalogEntity } from './api'
import type { EditorProps } from './forms'

export function CatalogPage<TEntity extends CatalogEntity, TInput>({ title, singular, description, resource, nameOf, columns, Editor, renderSchedule, renderEditorExtra, CreateEditor, canCreate: allowCreate, createLabel, createTitle, renderActions, canDelete = true, activeOnly = false }: {
  title: string; singular: string; description: string
  resource: CatalogResource<TEntity, TInput>
  nameOf: (item: TEntity) => string
  columns: Column<TEntity>[]
  Editor: ComponentType<EditorProps<TEntity, TInput>>
  canDelete?: boolean
  activeOnly?: boolean
  canCreate?: boolean
  createLabel?: string
  createTitle?: string
  CreateEditor?: ComponentType<{ onCancel: () => void; onCreated: () => void; onBusyChange: (busy: boolean) => void }>
  renderActions?: (item: TEntity) => ReactNode
  renderEditorExtra?: (item: TEntity) => ReactNode
  renderSchedule?: (item: TEntity, onClose: () => void, onSaved: () => void) => ReactNode
}) {
  const tenant = useOutletContext<Tenant>()
  const canEdit = tenant.role === 'OWNER' || tenant.role === 'ADMIN'
  const query = useCatalog(resource)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [editor, setEditor] = useState<{ item?: TEntity } | null>(null)
  const [deleting, setDeleting] = useState<TEntity | null>(null)
  const [schedule, setSchedule] = useState<TEntity | null>(null)
  const [creatingBusy, setCreatingBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const save = useCatalogMutation((tenantId, { input, id }: { input: TInput; id?: string }) => resource.save(tenantId, input, id))
  const remove = useCatalogMutation((tenantId, id: string) => resource.remove(tenantId, id))
  function openEditor(item?: TEntity) { setCreatingBusy(false); save.reset(); setNotice(''); setEditor({ item }) }
  function openDelete(item: TEntity) { remove.reset(); setNotice(''); setDeleting(item) }
  const rows = (query.data ?? []).filter((item) => (activeOnly ? item.is_active : (status === 'all' || item.is_active === (status === 'active'))) && nameOf(item).toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
  const allColumns: Column<TEntity>[] = [...columns,
    { title: 'Estado', render: (item) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.is_active ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span> },
    { title: 'Acciones', className: 'w-1', render: (item) => canEdit ? <div className="flex items-center justify-end gap-2">
      {renderActions?.(item)}
      {renderSchedule && <Button onClick={() => setSchedule(item)} aria-label={`Configurar horarios de ${nameOf(item)}`}><Clock3 size={16} /><span className="hidden xl:inline">Horarios</span></Button>}
      <Button onClick={() => openEditor(item)} aria-label={`Editar ${nameOf(item)}`}><Pencil size={16} /></Button>
      {canDelete && item.is_active && <Button onClick={() => openDelete(item)} aria-label={`Eliminar ${nameOf(item)}`}><Trash2 size={16} className="text-red-600" /></Button>}
    </div> : <span className="whitespace-nowrap text-xs text-slate-400">Solo lectura</span> },
  ]
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">CATÁLOGO DE {tenant.name.toLocaleUpperCase('es')}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p></div>{canEdit && allowCreate !== false && <Button variant="primary" onClick={() => openEditor()}><Plus size={17} />{createLabel ?? `Crear ${singular}`}</Button>}</div>
    {!canEdit && <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">Tenés acceso de lectura. Un administrador puede modificar el catálogo y los horarios.</p>}
    {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
    <div className="flex flex-wrap items-end justify-between gap-4"><div className="w-full max-w-sm"><label htmlFor={`${resource.key}-search`} className="mb-2 block text-sm font-medium">Buscar por nombre</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input id={`${resource.key}-search`} type="search" className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar en ${title.toLocaleLowerCase('es')}…`} /></div></div>{!activeOnly && <div><label htmlFor={`${resource.key}-status`} className="mb-2 block text-sm font-medium">Mostrar</label><select id={`${resource.key}-status`} className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select></div>}</div>
    {query.isPending ? <TableSkeleton columns={allColumns} label={`Cargando ${title.toLocaleLowerCase('es')}…`} /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : <><p className="text-xs text-slate-500">{rows.length} registros{query.isFetching ? ' · Actualizando…' : ''}</p><DataTable rows={rows} columns={allColumns} empty={query.data.length ? 'No hay registros para esta búsqueda y filtro.' : `Todavía no hay registros. ${canEdit ? 'Creá el primero para empezar.' : ''}`} /></>}
    {editor && <Modal title={editor.item ? `Editar ${singular}` : createTitle ?? `Crear ${singular}`} onClose={() => setEditor(null)} busy={save.isPending || creatingBusy}>{!editor.item && CreateEditor ? <CreateEditor onCancel={() => setEditor(null)} onBusyChange={setCreatingBusy} onCreated={() => { setCreatingBusy(false); setEditor(null); setNotice('El equipo se actualizó correctamente.') }} /> : <><Editor item={editor.item} busy={save.isPending} error={save.isError ? getErrorMessage(save.error) : undefined} onCancel={() => setEditor(null)} onSave={(input) => save.mutate({ input, id: editor.item?.id }, { onSuccess: () => { setEditor(null); setNotice('Los cambios se guardaron correctamente.') } })} />{editor.item && renderEditorExtra?.(editor.item)}</>}</Modal>}
    {canDelete && deleting && <Modal title={`Eliminar ${singular}`} onClose={() => setDeleting(null)} busy={remove.isPending}><p className="text-sm leading-relaxed text-slate-600">Se dará de baja a <strong>{nameOf(deleting)}</strong> del catálogo activo. Sus reservas e historial se conservarán. Podés reactivarlo editándolo desde el filtro «Inactivos».</p><div className="mt-4"><ErrorMessage message={remove.isError ? getErrorMessage(remove.error) : undefined} /></div><div className="mt-6 flex justify-end gap-3"><Button disabled={remove.isPending} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="danger" busy={remove.isPending} onClick={() => remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); setNotice('Registro dado de baja. Podés recuperarlo desde Inactivos.') } })}>Eliminar del catálogo activo</Button></div></Modal>}
    {schedule && renderSchedule?.(schedule, () => setSchedule(null), () => { setSchedule(null); setNotice('Los horarios y asignaciones se guardaron correctamente.') })}
  </div>
}
