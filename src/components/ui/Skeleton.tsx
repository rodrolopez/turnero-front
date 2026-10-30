import type { ComponentProps, ReactNode } from 'react'

/** Decorative placeholder. Announce loading once through SkeletonScreen. */
export function Skeleton({ className = '', ...props }: ComponentProps<'span'>) {
  return <span {...props} aria-hidden="true" className={`block animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none ${className}`} />
}

export function SkeletonScreen({ label = 'Cargando…', children, className = '' }: { label?: string; children: ReactNode; className?: string }) {
  return <div role="status" aria-busy="true" className={className}><span className="sr-only">{label}</span><div aria-hidden="true">{children}</div></div>
}

export function CardsSkeleton({ label = 'Cargando…', count = 3 }: { label?: string; count?: number }) {
  return <SkeletonScreen label={label} className="w-full"><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: count }, (_, index) => <div key={index} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"><Skeleton className="h-11 w-11 shrink-0 rounded-xl" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div></SkeletonScreen>
}

export function TableSkeleton({ columns, label }: { columns: { title: string; className?: string }[]; label: string }) {
  return <SkeletonScreen label={label}><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr>{columns.map((column) => <th key={column.title} className={`px-5 py-4 ${column.className ?? ''}`}><Skeleton className="h-3 w-20" /></th>)}</tr></thead><tbody className="divide-y divide-slate-100">{Array.from({ length: 5 }, (_, row) => <tr key={row}>{columns.map((column, index) => <td key={column.title} className={`px-5 py-5 ${column.className ?? ''}`}><Skeleton className={`h-4 ${index === 0 ? 'w-32' : 'w-20'}`} /></td>)}</tr>)}</tbody></table></div></SkeletonScreen>
}
