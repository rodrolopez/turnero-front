export function money(value: string): string {
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.')
  return `${negative ? '−' : ''}$ ${new Intl.NumberFormat('es-AR').format(BigInt(whole))},${fraction.padEnd(2, '0')}`
}
export function sumMoney(values: string[]): string {
  const cents = values.reduce((sum, value) => { const [a, b = ''] = value.split('.'); return sum + BigInt(a) * 100n + BigInt(b.padEnd(2, '0')) }, 0n)
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}
export function absoluteAmount(value: string) { return value.replace(/^-/, '') }
export const contractLabels = { percentage: 'Porcentaje', salary: 'Sueldo fijo', fixed_rent: 'Alquiler de silla' }
