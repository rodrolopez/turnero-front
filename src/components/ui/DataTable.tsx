import type { ReactNode } from 'react'

export interface Column<T> { title: string; render: (row: T) => ReactNode; className?: string }
export function DataTable<T extends { id: string }>({ rows, columns, empty }: { rows: T[]; columns: Column<T>[]; empty: ReactNode }) {
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{empty}</div>
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th scope="col" key={column.title} className={`px-5 py-4 font-medium ${column.className ?? ''}`}>{column.title}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50/70">{columns.map((column) => <td key={column.title} className={`px-5 py-4 ${column.className ?? ''}`}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>
}
