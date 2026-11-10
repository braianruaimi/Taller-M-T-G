export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta de crédito' | 'Tarjeta de débito'
export const paymentMethods: PaymentMethod[] = ['Efectivo', 'Transferencia', 'Tarjeta de crédito', 'Tarjeta de débito']

export interface VehicleOrder {
  id: string
  enteredBy: string
  customer: string
  dni: string
  phone: string
  brand: string
  model: string
  plate: string
  repair: string
  entryDate: string
  expectedDate: string
  price: number
  paymentMethod: PaymentMethod | ''
  status: 'pending' | 'delivered'
  paidDate: string | null
  legacyPaid: number
}

export interface WorkshopData {
  version: 1
  orders: VehicleOrder[]
}

const KEY = 'taller-mtg-v1'
const LEGACY_KEY = 'autotaller-pro-v1'
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const validDate = (value: unknown): value is string => {
  if (!isString(value) || !isoDate.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDate(date: string | null): string {
  if (!date) return 'Sin registrar'
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)

function isOrder(value: unknown): value is VehicleOrder {
  if (!isRecord(value)) return false
  const fields = ['id', 'enteredBy', 'customer', 'dni', 'phone', 'brand', 'model', 'plate', 'repair']
  return fields.every((field) => isString(value[field]))
    && validDate(value.entryDate) && (value.expectedDate === '' || validDate(value.expectedDate))
    && typeof value.price === 'number' && Number.isFinite(value.price) && value.price >= 0
    && (value.paymentMethod === '' || paymentMethods.some((method) => method === value.paymentMethod))
    && (value.status === 'pending' || value.status === 'delivered')
    && (value.paidDate === null || validDate(value.paidDate))
    && typeof value.legacyPaid === 'number' && Number.isFinite(value.legacyPaid) && value.legacyPaid >= 0 && value.legacyPaid <= value.price
    && (value.status !== 'pending' || value.paidDate === null)
}

export function parseBackup(value: unknown): WorkshopData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.orders) || !value.orders.every(isOrder)) {
    throw new Error('El archivo no es un respaldo válido de Taller M-T-G.')
  }
  const ids = value.orders.map((order) => order.id)
  if (new Set(ids).size !== ids.length) throw new Error('El respaldo contiene órdenes duplicadas.')
  return { version: 1, orders: value.orders }
}

function migrateLegacy(value: unknown): WorkshopData {
  if (!isRecord(value) || !Array.isArray(value.orders)) throw new Error('No se pudieron leer las órdenes de la versión anterior.')
  const orders = value.orders.map((item, index): VehicleOrder => {
    if (!isRecord(item) || !isString(item.customer) || !isString(item.car) || !isString(item.service) || !validDate(item.created) || typeof item.amount !== 'number' || !Number.isFinite(item.amount)) {
      throw new Error(`La orden anterior número ${index + 1} tiene datos inválidos. Exportá el respaldo antes de continuar.`)
    }
    return {
      id: isString(item.id) ? item.id : `ANT-${index + 1}`,
      enteredBy: '', customer: item.customer, dni: '', phone: isString(item.phone) ? item.phone : '',
      brand: item.car, model: '', plate: isString(item.plate) ? item.plate : '', repair: item.service,
      entryDate: item.created, expectedDate: '', price: Math.max(0, item.amount),
      paymentMethod: '', status: item.stage === 'entregado_cobrado' ? 'delivered' : 'pending',
      paidDate: null, legacyPaid: typeof item.paid === 'number' && Number.isFinite(item.paid) ? Math.max(0, item.paid) : 0,
    }
  })
  return parseBackup({ version: 1, orders })
}

export class StorageService {
  static load(): { data: WorkshopData; migrated: boolean } {
    const saved = localStorage.getItem(KEY)
    if (saved !== null) return { data: parseBackup(JSON.parse(saved) as unknown), migrated: false }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy !== null) {
      const data = migrateLegacy(JSON.parse(legacy) as unknown)
      this.save(data)
      return { data, migrated: true }
    }
    return { data: { version: 1, orders: [] }, migrated: false }
  }

  static save(data: WorkshopData): void {
    localStorage.setItem(KEY, JSON.stringify(parseBackup(data)))
  }

  static download(data: WorkshopData): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `taller-mtg-respaldo-${localDate()}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function monthlyOrders(orders: VehicleOrder[], month: string): VehicleOrder[] {
  return orders.filter((order) => order.status === 'delivered' && order.paidDate?.startsWith(`${month}-`))
}
