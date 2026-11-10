import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import {
  Activity, ArrowDown, ArrowRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Clock3, Download,
  FileJson2, FileText, Gauge, LayoutDashboard, List, Menu, MessageCircle, MoreHorizontal,
  Package, Plus, Printer, Search, Send, ShieldAlert, Smartphone, Wrench,
  X, CarFront, TrendingUp, Camera, Receipt, Wallet,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { QRCodeSVG } from 'qrcode.react'

type Stage = 'ingresado' | 'diagnostico' | 'espera_aprobacion' | 'en_reparacion' | 'control_calidad' | 'listo_para_entrega' | 'entregado_cobrado'
type Damage = { x: number; y: number; kind: string; view?: string }
type EstimateLine = { id: string; title: string; kind: 'labor' | 'part'; quantity: number; unitPrice: number; partId?: string }
type EvidencePhoto = { name: string; stage: string; dataUrl: string }
type Order = {
  id: string; plate: string; customer: string; phone: string; car: string; year: number; km: number
  mechanic: string; stage: Stage; service: string; amount: number; paid: number; created: string
  damages: Damage[]; fuel: string; observations: string; color?: string; version?: string
  checklist?: Record<string, boolean>; photos?: EvidencePhoto[]; lines?: EstimateLine[]; discount?: number; vatRate?: number
}
type Part = { id: string; sku: string; name: string; brand: string; category: string; location: string; stock: number; min: number; cost: number; price: number }
type Appointment = { id: string; time: string; customer: string; phone: string; car: string; plate: string; reason: string; duration: number; mechanic: string }
type NotificationLog = { id: string; title: string; body: string; segment: string; sentAt: string; delivered: number }
type AppData = { orders: Order[]; parts: Part[]; appointments: Appointment[]; notifications: NotificationLog[] }

const mechanics = [
  { name: 'Carlos Gómez', bay: 'Bahía 1', equipment: 'Elevador tijera', specialty: 'Mecánica general', color: '#dc2626' },
  { name: 'Roberto Benítez', bay: 'Bahía 2', equipment: 'Fosa alineación', specialty: 'Frenos y suspensión', color: '#f97316' },
  { name: 'Marcelo Rossi', bay: 'Bahía 3', equipment: 'Elevador 2 columnas', specialty: 'Inyección y diagnóstico', color: '#eab308' },
  { name: 'Lucas Fernández', bay: 'Bahía 4', equipment: 'Elevador 4 columnas', specialty: 'Electricidad y clima', color: '#a1a1aa' },
]
const stages: { id: Stage; label: string; short: string }[] = [
  { id: 'ingresado', label: 'Ingresado', short: 'Ingreso' }, { id: 'diagnostico', label: 'Diagnóstico', short: 'Diagnóstico' },
  { id: 'espera_aprobacion', label: 'Esperando aprobación', short: 'Aprobación' }, { id: 'en_reparacion', label: 'En reparación', short: 'Reparación' },
  { id: 'control_calidad', label: 'Control de calidad', short: 'Calidad' }, { id: 'listo_para_entrega', label: 'Listo para entregar', short: 'Listo' },
  { id: 'entregado_cobrado', label: 'Entregado y cobrado', short: 'Entregado' },
]
const initialData: AppData = {
  orders: [
    { id: 'OT-2408', plate: 'AF 234 QZ', customer: 'Martín González', phone: '5491162345678', car: 'Volkswagen Vento 2.0 TSI', year: 2020, km: 68420, mechanic: 'Carlos Gómez', stage: 'en_reparacion', service: 'Distribución y bomba de agua', amount: 485000, paid: 200000, created: '2026-11-07', damages: [{ x: 70, y: 33, kind: 'Rayón' }], fuel: '3/4', observations: 'Ruidito al arrancar en frío' },
    { id: 'OT-2407', plate: 'AE 908 LM', customer: 'Lucía Fernández', phone: '5491145678901', car: 'Ford EcoSport Titanium', year: 2019, km: 52110, mechanic: 'Roberto Benítez', stage: 'espera_aprobacion', service: 'Cambio de discos y pastillas', amount: 320000, paid: 0, created: '2026-11-07', damages: [], fuel: '1/2', observations: 'Vibra al frenar a alta velocidad' },
    { id: 'OT-2406', plate: 'AC 122 BD', customer: 'Santiago López', phone: '5491134456677', car: 'Toyota Corolla XEI', year: 2022, km: 33800, mechanic: 'Marcelo Rossi', stage: 'diagnostico', service: 'Diagnóstico electrónico', amount: 85000, paid: 0, created: '2026-11-06', damages: [], fuel: '1/4', observations: 'Testigo de motor encendido' },
    { id: 'OT-2405', plate: 'AD 551 RT', customer: 'Valeria Méndez', phone: '5491167890123', car: 'Chevrolet Cruze LTZ', year: 2021, km: 41200, mechanic: 'Lucas Fernández', stage: 'listo_para_entrega', service: 'Service completo + batería', amount: 275000, paid: 150000, created: '2026-11-05', damages: [], fuel: 'Reserva', observations: 'Cambio de batería realizado' },
    { id: 'OT-2404', plate: 'AA 431 VX', customer: 'Diego Acosta', phone: '5491155567788', car: 'Fiat Cronos Precision', year: 2023, km: 22100, mechanic: 'Carlos Gómez', stage: 'ingresado', service: 'Service 20.000 km', amount: 145000, paid: 0, created: '2026-11-08', damages: [], fuel: 'Lleno', observations: 'Trae aceite comprado por cliente' },
    { id: 'OT-2403', plate: 'AB 881 JK', customer: 'Camila Ruiz', phone: '5491144433221', car: 'Peugeot 208 Feline', year: 2018, km: 79300, mechanic: 'Roberto Benítez', stage: 'entregado_cobrado', service: 'Embrague completo', amount: 630000, paid: 630000, created: '2026-11-03', damages: [], fuel: '1/2', observations: '' },
  ],
  parts: [
    { id: 'p1', sku: 'FIL-001', name: 'Filtro de aceite PH6017', brand: 'Mann', category: 'Filtros', location: 'Estante A1', stock: 4, min: 5, cost: 8500, price: 12750 },
    { id: 'p2', sku: 'PAS-024', name: 'Pastillas de freno delanteras', brand: 'Fras-le', category: 'Frenos', location: 'Estante B2', stock: 2, min: 4, cost: 42000, price: 63000 },
    { id: 'p3', sku: 'ACE-005', name: 'Aceite sintético 5W-40 1L', brand: 'Elaion', category: 'Lubricantes', location: 'Depósito C1', stock: 18, min: 6, cost: 11000, price: 16500 },
    { id: 'p4', sku: 'BAT-012', name: 'Batería 12x65 Ah', brand: 'Willard', category: 'Electricidad', location: 'Estante D1', stock: 3, min: 3, cost: 105000, price: 147000 },
    { id: 'p5', sku: 'DIS-008', name: 'Disco de freno ventilado', brand: 'Fremax', category: 'Frenos', location: 'Estante B3', stock: 8, min: 2, cost: 38000, price: 57000 },
  ],
  appointments: [
    { id: 'a1', time: '08:30', customer: 'María Sosa', phone: '5491165421987', car: 'Honda HR-V EXL', plate: 'AF 449 PO', reason: 'Service 60.000 km', duration: 120, mechanic: 'Carlos Gómez' },
    { id: 'a2', time: '09:00', customer: 'Pablo Torres', phone: '5491132127890', car: 'Renault Sandero', plate: 'AC 808 ZT', reason: 'Alineación y balanceo', duration: 90, mechanic: 'Roberto Benítez' },
    { id: 'a3', time: '10:00', customer: 'Florencia Díaz', phone: '5491156893421', car: 'Nissan Kicks', plate: 'AE 109 CX', reason: 'Check engine', duration: 60, mechanic: 'Marcelo Rossi' },
    { id: 'a4', time: '11:30', customer: 'Julián Romero', phone: '5491143210987', car: 'Jeep Renegade', plate: 'AD 773 MN', reason: 'Revisión de aire acondicionado', duration: 90, mechanic: 'Lucas Fernández' },
    { id: 'a5', time: '14:00', customer: 'Carolina Peralta', phone: '5491177654321', car: 'Citroën C4 Cactus', plate: 'AF 650 YR', reason: 'Cambio de pastillas', duration: 90, mechanic: 'Roberto Benítez' },
  ],
  notifications: [],
}

class StorageService {
  private static key = 'autotaller-pro-v1'
  static load(): AppData {
    try {
      const saved = localStorage.getItem(this.key)
      return saved ? { ...initialData, ...JSON.parse(saved) as Partial<AppData> } : initialData
    } catch (error) {
      console.error('No se pudieron leer los datos guardados.', error)
      return initialData
    }
  }
  static save(data: AppData): void {
    localStorage.setItem(this.key, JSON.stringify(data))
  }
  static download(data: AppData): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `autotaller-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url)
  }
}

const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
const waLink = (phone: string, message: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
const stageLabel = (stage: Stage) => stages.find((item) => item.id === stage)?.label ?? stage
const monthNames = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']
const revenueData = monthNames.map((month, i) => ({ month, ingresos: [1720000, 1940000, 1680000, 2260000, 2130000, 2840000][i], cobranzas: [1480000, 1660000, 1490000, 1920000, 1830000, 2380000][i] }))
const serviceData = [{ name: 'Service', value: 18 }, { name: 'Frenos', value: 13 }, { name: 'Distribución', value: 9 }, { name: 'Diagnóstico', value: 8 }, { name: 'Electricidad', value: 6 }]
const formatPlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
const fmtPlate = (value: string) => {
  const raw = formatPlate(value)
  if (raw.length <= 6) return raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw
  return `${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5, 7)}`
}

type Page = 'dashboard' | 'orders' | 'inventory' | 'agenda' | 'billing' | 'reports' | 'notifications' | 'portal'
const navItems: { id: Page; label: string; icon: typeof LayoutDashboard; section: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'PRINCIPAL' },
  { id: 'orders', label: 'Órdenes de trabajo', icon: ClipboardList, section: 'OPERACIONES' },
  { id: 'agenda', label: 'Agenda y turnos', icon: CalendarDays, section: 'OPERACIONES' },
  { id: 'inventory', label: 'Inventario', icon: Package, section: 'OPERACIONES' },
  { id: 'billing', label: 'Facturación', icon: Receipt, section: 'ADMINISTRACIÓN' },
  { id: 'reports', label: 'Reportes', icon: TrendingUp, section: 'ADMINISTRACIÓN' },
  { id: 'notifications', label: 'Notificaciones', icon: Bell, section: 'COMUNICACIÓN' },
  { id: 'portal', label: 'Portal cliente', icon: Smartphone, section: 'COMUNICACIÓN' },
]

function App() {
  const [data, setData] = useState<AppData>(() => StorageService.load())
  const [page, setPage] = useState<Page>('dashboard')
  const [search, setSearch] = useState('')
  const [mechanicFilter, setMechanicFilter] = useState('Todos')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [orderMode, setOrderMode] = useState<'kanban' | 'list'>('kanban')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)
  const [showInvoice, setShowInvoice] = useState<Order | null>(null)
  const [quoteOrder, setQuoteOrder] = useState<Order | null>(null)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedPortal, setSelectedPortal] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const updateData = (next: AppData) => {
    try { StorageService.save(next); setData(next) }
    catch (error) {
      console.error('No se pudieron guardar los datos.', error)
      notify('No se pudieron guardar los cambios en este dispositivo. Revisá el espacio disponible.')
    }
  }
  const filteredOrders = useMemo(() => data.orders.filter((order) => {
    const text = `${order.plate} ${order.customer} ${order.car} ${order.id}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (mechanicFilter === 'Todos' || order.mechanic === mechanicFilter) && (stageFilter === 'all' || order.stage === stageFilter)
  }), [data.orders, search, mechanicFilter, stageFilter])

  const changeStage = (id: string, direction: number) => {
    const order = data.orders.find((item) => item.id === id)
    if (!order) return
    const index = stages.findIndex((item) => item.id === order.stage)
    const nextStage = stages[Math.min(stages.length - 1, Math.max(0, index + direction))].id
    if (nextStage === 'espera_aprobacion' && order.amount <= 0) {
      notify('Agregá un presupuesto antes de solicitar aprobación.')
      return
    }
    if (nextStage === 'entregado_cobrado' && order.paid < order.amount) {
      notify('Registrá el pago pendiente antes de cerrar esta orden.')
      return
    }
    const updated = data.orders.map((item) => item.id === id ? { ...item, stage: nextStage } : item)
    updateData({ ...data, orders: updated })
    notify(`Orden ${id}: ${stageLabel(nextStage)}`)
  }
  const updateStock = (id: string, amount: number) => {
    const part = data.parts.find((item) => item.id === id)
    if (!part || part.stock + amount < 0) { notify('El stock no puede ser menor a cero.'); return }
    updateData({ ...data, parts: data.parts.map((item) => item.id === id ? { ...item, stock: item.stock + amount } : item) })
  }
  const convertAppointment = (appointment: Appointment) => {
    const existing = data.orders.some((item) => formatPlate(item.plate) === formatPlate(appointment.plate))
    if (existing) { notify(`Ya existe una orden para ${appointment.plate}.`); return }
    const order: Order = { id: `OT-${String(2409 + data.orders.length).padStart(4, '0')}`, plate: appointment.plate, customer: appointment.customer, phone: appointment.phone, car: appointment.car, year: 2021, km: 0, mechanic: appointment.mechanic, stage: 'ingresado', service: appointment.reason, amount: 0, paid: 0, created: new Date().toISOString().slice(0, 10), damages: [], fuel: '1/2', observations: '' }
    updateData({ ...data, orders: [order, ...data.orders], appointments: data.appointments.filter((item) => item.id !== appointment.id) })
    notify(`Turno convertido en ${order.id}.`)
    setPage('orders')
  }
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as AppData
      if (!Array.isArray(parsed.orders) || !Array.isArray(parsed.parts) || !Array.isArray(parsed.appointments)) throw new Error('Formato de backup no válido.')
      updateData({ ...initialData, ...parsed })
      notify('Backup importado correctamente.')
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo importar el backup.') }
    event.target.value = ''
  }

  const renderPage = () => {
    const common = { data, notify, updateData, setPage, setShowInvoice, setQuoteOrder, selectedPortal, setSelectedPortal }
    switch (page) {
      case 'orders': return <OrdersPage {...common} filteredOrders={filteredOrders} search={search} setSearch={setSearch} mechanicFilter={mechanicFilter} setMechanicFilter={setMechanicFilter} stageFilter={stageFilter} setStageFilter={setStageFilter} orderMode={orderMode} setOrderMode={setOrderMode} changeStage={changeStage} openCreate={() => setShowOrderForm(true)} />
      case 'inventory': return <InventoryPage {...common} criticalOnly={criticalOnly} setCriticalOnly={setCriticalOnly} updateStock={updateStock} openCreate={() => setShowPartForm(true)} />
      case 'agenda': return <AgendaPage {...common} convertAppointment={convertAppointment} />
      case 'billing': return <BillingPage {...common} />
      case 'reports': return <ReportsPage {...common} />
      case 'notifications': return <NotificationsPage {...common} />
      case 'portal': return <PortalPage {...common} />
      default: return <DashboardPage {...common} />
    }
  }
  const active = navItems.find((item) => item.id === page)
  return <div className="min-h-screen bg-[#09090b] text-zinc-100">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-zinc-800 bg-[#0c0c0e] transition-transform lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-zinc-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-md shadow-red-950/50"><Wrench size={21} strokeWidth={2.5} /></div>
        <div><div className="text-[17px] font-bold tracking-tight">AutoTaller <span className="text-red-500">Pro</span></div><div className="text-[10px] font-semibold tracking-[.2em] text-zinc-500">GESTIÓN INTELIGENTE</div></div>
        <button className="ml-auto text-zinc-500 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú"><X size={19} /></button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {['PRINCIPAL', 'OPERACIONES', 'ADMINISTRACIÓN', 'COMUNICACIÓN'].map((section) => <div key={section}>
          <div className="mb-2 px-3 text-[10px] font-bold tracking-[.18em] text-zinc-600">{section}</div>
          <div className="space-y-1">{navItems.filter((item) => item.section === section).map((item) => {
            const Icon = item.icon
            return <button key={item.id} onClick={() => { setPage(item.id); setMobileMenu(false) }} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${page === item.id ? 'bg-red-600/10 font-semibold text-red-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}>
              <Icon size={17} className={page === item.id ? 'text-red-500' : 'text-zinc-500 group-hover:text-zinc-300'} />{item.label}
              {item.id === 'inventory' && data.parts.filter((part) => part.stock <= part.min).length > 0 && <span className="ml-auto rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">{data.parts.filter((part) => part.stock <= part.min).length}</span>}
            </button>
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-zinc-900/70 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">JM</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">Juan Martínez</div><div className="text-[10px] text-zinc-500">Administrador</div></div><MoreHorizontal size={17} className="text-zinc-500" /></div>
        <div className="flex gap-2">
          <button onClick={() => StorageService.download(data)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 py-2 text-[10px] font-medium text-zinc-400 hover:border-zinc-700 hover:text-white"><Download size={13} /> Backup</button>
          <button onClick={() => importRef.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 py-2 text-[10px] font-medium text-zinc-400 hover:border-zinc-700 hover:text-white"><FileJson2 size={13} /> Importar</button>
          <input ref={importRef} type="file" accept=".json,application/json" onChange={importBackup} className="hidden" />
        </div>
      </div>
    </aside>
    {mobileMenu && <button className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" />}
    <div className="lg:pl-[260px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-zinc-800/90 bg-[#09090b]/95 px-5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setMobileMenu(true)} className="text-zinc-400 lg:hidden" aria-label="Abrir menú"><Menu size={21} /></button><div><div className="text-[11px] text-zinc-500">Taller mecánico <span className="px-1 text-zinc-700">/</span> <span className="text-zinc-300">{active?.label}</span></div><div className="mt-1 text-xs font-medium capitalize text-zinc-400">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div>
        <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 sm:flex"><Search size={14} className="text-zinc-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar patente, cliente..." className="w-40 bg-transparent text-xs outline-none placeholder:text-zinc-600 md:w-52" onKeyDown={(e) => { if (e.key === 'Enter') setPage('orders') }} /></div><button onClick={() => setPage('notifications')} className="relative rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-white"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" /></button><div className="hidden h-8 w-px bg-zinc-800 sm:block" /><span className="hidden text-xs font-medium text-zinc-300 sm:block">Taller Central</span></div>
      </header>
      <main className="mx-auto max-w-[1600px] px-5 py-7 md:px-8">{renderPage()}</main>
    </div>
    {showOrderForm && <OrderModal data={data} close={() => setShowOrderForm(false)} save={(order) => {
      const consumed = new Map<string, number>()
      order.lines?.forEach((line) => { if (line.partId) consumed.set(line.partId, (consumed.get(line.partId) ?? 0) + line.quantity) })
      const parts = data.parts.map((part) => ({ ...part, stock: part.stock - (consumed.get(part.id) ?? 0) }))
      updateData({ ...data, orders: [order, ...data.orders], parts })
      setShowOrderForm(false)
      notify(`${order.id} creada correctamente.`)
    }} />}
    {showPartForm && <PartModal close={() => setShowPartForm(false)} save={(part) => { updateData({ ...data, parts: [part, ...data.parts] }); setShowPartForm(false); notify('Repuesto agregado al inventario.') }} />}
    {showInvoice && <InvoiceModal order={showInvoice} close={() => setShowInvoice(null)} />}
    {quoteOrder && <QuoteModal order={quoteOrder} close={() => setQuoteOrder(null)} save={(updated) => {
      updateData({ ...data, orders: data.orders.map((order) => order.id === updated.id ? updated : order) })
      setQuoteOrder(null)
      notify(`Presupuesto de ${updated.id} actualizado.`)
    }} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm shadow-2xl"><CheckCircle2 size={17} className="text-emerald-500" />{toast}</div>}
  </div>
}

type CommonProps = { data: AppData; notify: (message: string) => void; updateData: (data: AppData) => void; setPage: (page: Page) => void; setShowInvoice: (order: Order | null) => void; setQuoteOrder: (order: Order | null) => void; selectedPortal: string; setSelectedPortal: (id: string) => void }
export default App
function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <div className="mb-2 text-[10px] font-bold tracking-[.2em] text-red-500">{eyebrow}</div>}<h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">{title}</h1>{description && <p className="mt-1.5 text-sm text-zinc-500">{description}</p>}</div>{action}</div>
}
function Button({ children, onClick, variant = 'primary', className = '', type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; className?: string; type?: 'button' | 'submit' }) {
  const styles = variant === 'primary' ? 'bg-red-600 text-white shadow-md shadow-red-950/40 hover:bg-red-500' : variant === 'secondary' ? 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
  return <button type={type} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition ${styles} ${className}`}>{children}</button>
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-zinc-800 bg-[#101012] ${className}`}>{children}</section> }
function Status({ stage }: { stage: Stage }) {
  const styles: Record<Stage, string> = { ingresado: 'text-blue-300 bg-blue-400/10', diagnostico: 'text-amber-300 bg-amber-400/10', espera_aprobacion: 'text-orange-300 bg-orange-400/10', en_reparacion: 'text-red-300 bg-red-400/10', control_calidad: 'text-violet-300 bg-violet-400/10', listo_para_entrega: 'text-emerald-300 bg-emerald-400/10', entregado_cobrado: 'text-zinc-300 bg-zinc-700/50' }
  return <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-semibold ${styles[stage]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{stageLabel(stage)}</span>
}
function Metric({ label, value, note, icon: Icon, tone = 'red', trend }: { label: string; value: string; note: string; icon: typeof Activity; tone?: 'red' | 'green' | 'amber' | 'blue'; trend?: string }) {
  const tones = { red: 'bg-red-500/10 text-red-400', green: 'bg-emerald-500/10 text-emerald-400', amber: 'bg-amber-500/10 text-amber-400', blue: 'bg-blue-500/10 text-blue-400' }
  return <Card className="p-4 md:p-5"><div className="flex items-start justify-between"><div className="text-[11px] font-medium text-zinc-500">{label}</div><span className={`rounded-lg p-2 ${tones[tone]}`}><Icon size={16} /></span></div><div className="mt-3 flex items-baseline gap-2"><div className="text-[23px] font-bold tracking-tight tabular-nums text-zinc-100">{value}</div>{trend && <div className="text-[10px] font-semibold text-emerald-400">{trend}</div>}</div><div className="mt-1 text-[10px] text-zinc-600">{note}</div></Card>
}
function SectionHeading({ title, link, onClick }: { title: string; link?: string; onClick?: () => void }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-zinc-100">{title}</h2>{link && <button onClick={onClick} className="text-[11px] font-medium text-red-400 hover:text-red-300">{link} <ArrowRight size={12} className="ml-1 inline" /></button>}</div>
}

function DashboardPage({ data, setPage }: CommonProps) {
  const open = data.orders.filter((order) => order.stage !== 'entregado_cobrado')
  const revenue = data.orders.reduce((sum, order) => sum + order.paid, 0)
  const due = data.orders.reduce((sum, order) => sum + order.amount - order.paid, 0)
  const critical = data.parts.filter((part) => part.stock <= part.min)
  return <>
    <PageTitle eyebrow="JORNADA ACTIVA" title="Buen día, Juan 👋" description="Este es el resumen de actividad de tu taller." action={<Button onClick={() => setPage('orders')}><Plus size={15} /> Nueva orden</Button>} />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Órdenes abiertas" value={String(open.length).padStart(2, '0')} note={`${data.orders.filter((order) => order.stage === 'entregado_cobrado').length} entregadas este mes`} icon={ClipboardList} trend="+2 esta semana" />
      <Metric label="Ingresos cobrados" value={money(revenue)} note="Cobranzas registradas en noviembre" icon={CircleDollarSign} tone="green" trend="+12,8%" />
      <Metric label="Cuentas por cobrar" value={money(due)} note={`${data.orders.filter((order) => order.amount > order.paid).length} órdenes con saldo pendiente`} icon={Wallet} tone="amber" />
      <Metric label="Vehículos este mes" value={`${data.orders.length} / 15`} note="Meta mensual de ingresos" icon={CarFront} tone="blue" />
    </div>
    <div className="mb-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Card className="p-5">
        <SectionHeading title="Rendimiento del taller" link="Ver reporte" onClick={() => setPage('reports')} />
        <div className="mb-3 flex items-center gap-4 text-[10px] text-zinc-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />Ingresos</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-zinc-500" />Cobranzas</span></div>
        <div className="h-[235px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenueData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}><CartesianGrid stroke="#27272a" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="month" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value: number) => `$${(value / 1000000).toFixed(1)}M`} width={48} /><Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }} formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: '#dc2626' }} /><Line type="monotone" dataKey="cobranzas" name="Cobranzas" stroke="#71717a" strokeWidth={2} dot={{ r: 2, fill: '#71717a' }} /></LineChart></ResponsiveContainer></div>
      </Card>
      <Card className="p-5">
        <SectionHeading title="Carga por mecánico" link="Ver agenda" onClick={() => setPage('agenda')} />
        <div className="space-y-[18px] pt-2">{mechanics.map((mechanic) => {
          const count = open.filter((order) => order.mechanic === mechanic.name).length
          const pct = Math.min(100, Math.round(count / 3 * 100))
          return <div key={mechanic.name}><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: mechanic.color }} /><span className="text-xs font-medium">{mechanic.name}</span></div><span className="font-mono text-[10px] text-zinc-500">{count} / 3 autos</span></div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: mechanic.color }} /></div><div className="mt-1 text-[9px] text-zinc-600">{mechanic.bay} · {mechanic.specialty}</div></div>
        })}</div>
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4"><span className="text-[11px] text-zinc-500">Objetivo mensual</span><span className="font-mono text-xs font-semibold text-zinc-200">{Math.min(100, Math.round(data.orders.length / 15 * 100))}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-red-600" style={{ width: `${Math.min(100, Math.round(data.orders.length / 15 * 100))}%` }} /></div>
      </Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Card className="overflow-hidden">
        <div className="p-5 pb-3"><SectionHeading title="Órdenes activas" link="Ver todas" onClick={() => setPage('orders')} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-y border-zinc-800 text-[9px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-3 font-semibold">Orden / Vehículo</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Etapa</th><th className="px-5 py-3 text-right font-semibold">Presupuesto</th></tr></thead><tbody>{open.slice(0, 5).map((order) => <tr key={order.id} className="border-b border-zinc-800/70 last:border-0"><td className="px-5 py-3"><div className="font-mono text-[11px] font-semibold text-zinc-300">{order.plate}</div><div className="mt-1 text-[10px] text-zinc-600">{order.car}</div></td><td className="px-4 py-3 text-[11px] text-zinc-400">{order.customer}</td><td className="px-4 py-3"><Status stage={order.stage} /></td><td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-zinc-300">{money(order.amount)}</td></tr>)}</tbody></table></div>
      </Card>
      <Card className="p-5">
        <SectionHeading title="Agenda de hoy" link="Abrir agenda" onClick={() => setPage('agenda')} />
        <div className="space-y-1">{data.appointments.slice(0, 4).map((item) => <div key={item.id} className="flex gap-3 rounded-lg px-2 py-3 hover:bg-zinc-900/80"><div className="w-11 pt-0.5 font-mono text-[11px] font-semibold text-red-400">{item.time}</div><div className="min-w-0 flex-1 border-l border-zinc-800 pl-3"><div className="truncate text-xs font-medium">{item.customer}</div><div className="mt-1 truncate text-[10px] text-zinc-500">{item.car} · {item.reason}</div></div><span className="text-[9px] text-zinc-600">{item.mechanic.split(' ')[0]}</span></div>)}</div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2.5"><ShieldAlert size={15} className="shrink-0 text-red-400" /><span className="text-[10px] text-zinc-300"><b className="text-red-300">{critical.length} alertas</b> de stock crítico</span><button onClick={() => setPage('inventory')} className="ml-auto text-[10px] font-semibold text-red-400">Revisar</button></div>
      </Card>
    </div>
  </>
}

function OrdersPage({ data, filteredOrders, search, setSearch, mechanicFilter, setMechanicFilter, stageFilter, setStageFilter, orderMode, setOrderMode, changeStage, openCreate, setQuoteOrder }: CommonProps & { filteredOrders: Order[]; search: string; setSearch: (value: string) => void; mechanicFilter: string; setMechanicFilter: (value: string) => void; stageFilter: Stage | 'all'; setStageFilter: (value: Stage | 'all') => void; orderMode: 'kanban' | 'list'; setOrderMode: (value: 'kanban' | 'list') => void; changeStage: (id: string, direction: number) => void; openCreate: () => void }) {
  const whatsapp = (order: Order) => {
    const text = order.stage === 'ingresado'
      ? `Hola ${order.customer}, recibimos tu ${order.car} (${order.plate}) en AutoTaller Pro. Orden ${order.id}. Te mantendremos al tanto del diagnóstico.`
      : order.stage === 'espera_aprobacion'
        ? `Hola ${order.customer}, presupuesto para ${order.car} (${order.plate}): ${order.service}. Total: ${money(order.amount)}. Respondé este mensaje para aprobarlo.`
        : order.stage === 'listo_para_entrega'
          ? `Hola ${order.customer}, tu ${order.car} (${order.plate}) ya está listo para retirar. Saldo pendiente: ${money(order.amount - order.paid)}. ¡Te esperamos!`
          : `Hola ${order.customer}, te compartimos novedades de la orden ${order.id} para tu ${order.car} (${order.plate}). Etapa: ${stageLabel(order.stage)}.`
    window.open(waLink(order.phone, text), '_blank', 'noopener,noreferrer')
  }
  return <>
    <PageTitle eyebrow="OPERACIONES · FLUJO DE TALLER" title="Órdenes de trabajo" description="Seguimiento de cada vehículo desde su ingreso hasta la entrega." action={<Button onClick={openCreate}><Plus size={15} /> Nueva orden</Button>} />
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{stages.map((stage, i) => {
      const count = data.orders.filter((order) => order.stage === stage.id).length
      return <button key={stage.id} onClick={() => setStageFilter(stageFilter === stage.id ? 'all' : stage.id)} className={`rounded-lg border p-3 text-left transition ${stageFilter === stage.id ? 'border-red-700 bg-red-950/30' : 'border-zinc-800 bg-[#101012] hover:border-zinc-700'}`}><div className="flex items-center justify-between"><span className="text-[9px] font-semibold text-zinc-500">{stage.short}</span><span className={`font-mono text-base font-bold ${count ? 'text-zinc-100' : 'text-zinc-700'}`}>{String(count).padStart(2, '0')}</span></div><div className="mt-2 h-0.5 rounded-full" style={{ background: i < 3 ? '#dc2626' : i < 5 ? '#52525b' : '#16a34a', opacity: count ? .9 : .25 }} /></button>
    })}</div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5"><button onClick={() => setMechanicFilter('Todos')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${mechanicFilter === 'Todos' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}>Todos</button>{mechanics.map((m) => <button key={m.name} onClick={() => setMechanicFilter(m.name)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium ${mechanicFilter === m.name ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}>{m.name.split(' ')[0]}</button>)}</div>
      <div className="flex items-center gap-2"><div className="flex items-center gap-2 rounded-lg border border-zinc-800 px-2.5 py-2 sm:hidden"><Search size={13} className="text-zinc-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-32 bg-transparent text-xs outline-none" /></div><div className="flex rounded-lg border border-zinc-800 p-1"><button onClick={() => setOrderMode('kanban')} title="Kanban" className={`rounded p-1.5 ${orderMode === 'kanban' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><LayoutDashboard size={14} /></button><button onClick={() => setOrderMode('list')} title="Lista" className={`rounded p-1.5 ${orderMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><List size={14} /></button></div></div>
    </div>
    {orderMode === 'kanban' ? <div className="grid gap-3 xl:grid-cols-3 2xl:grid-cols-4">{(stageFilter === 'all' ? stages.filter((s) => filteredOrders.some((o) => o.stage === s.id)) : stages.filter((s) => s.id === stageFilter)).map((stage) => <div key={stage.id} className="min-h-48 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ background: stage.id === 'entregado_cobrado' ? '#16a34a' : stage.id === 'listo_para_entrega' ? '#22c55e' : '#dc2626' }} />{stage.label}</div><span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">{filteredOrders.filter((o) => o.stage === stage.id).length}</span></div><div className="space-y-2">{filteredOrders.filter((order) => order.stage === stage.id).map((order) => <OrderCard key={order.id} order={order} changeStage={changeStage} whatsapp={whatsapp} onQuote={() => setQuoteOrder(order)} />)}</div>{filteredOrders.filter((o) => o.stage === stage.id).length === 0 && <div className="py-6 text-center text-[10px] text-zinc-700">Sin órdenes</div>}</div>)}</div> :
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead><tr className="border-b border-zinc-800 text-[9px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-3">Orden / Patente</th><th className="px-4 py-3">Cliente / Vehículo</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Mecánico</th><th className="px-4 py-3 text-right">Presupuesto</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id} className="border-b border-zinc-800/70 text-xs last:border-0"><td className="px-5 py-3"><div className="font-mono font-semibold text-zinc-200">{order.plate}</div><div className="mt-1 text-[10px] text-zinc-600">{order.id}</div></td><td className="px-4 py-3"><div>{order.customer}</div><div className="mt-1 text-[10px] text-zinc-500">{order.car}</div></td><td className="px-4 py-3"><Status stage={order.stage} /></td><td className="px-4 py-3 text-zinc-400">{order.mechanic}</td><td className="px-4 py-3 text-right font-mono tabular-nums">{money(order.amount)}</td><td className="px-5 py-3 text-right"><div className="inline-flex gap-1"><button onClick={() => whatsapp(order)} title="WhatsApp" className="rounded p-2 text-emerald-500 hover:bg-emerald-950/40"><MessageCircle size={15} /></button>{order.amount === 0 && <button onClick={() => setQuoteOrder(order)} className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[10px] font-semibold text-amber-300">Cotizar</button>}{order.stage !== 'entregado_cobrado' && <button onClick={() => changeStage(order.id, 1)} className="rounded-md bg-red-600/10 px-2 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-600/20">Avanzar →</button>}</div></td></tr>)}{filteredOrders.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-sm text-zinc-500">No hay órdenes para mostrar.</td></tr>}</tbody></table></div></Card>}
  </>
}
function OrderCard({ order, changeStage, whatsapp, onQuote }: { order: Order; changeStage: (id: string, direction: number) => void; whatsapp: (order: Order) => void; onQuote: () => void }) {
  return <div className="rounded-lg border border-zinc-800 bg-[#111113] p-3.5 transition hover:border-zinc-700"><div className="flex items-start justify-between"><div><div className="font-mono text-[11px] font-bold tracking-wide text-zinc-200">{order.plate}</div><div className="mt-1 text-[9px] text-zinc-600">{order.id}</div></div><button onClick={() => whatsapp(order)} title="Contactar por WhatsApp" className="text-emerald-500 hover:text-emerald-400"><MessageCircle size={15} /></button></div><div className="mt-3 text-xs font-medium text-zinc-200">{order.customer}</div><div className="mt-1 text-[10px] text-zinc-500">{order.car}</div><div className="mt-3 flex items-center gap-1.5 text-[9px] text-zinc-500"><Wrench size={11} />{order.mechanic}</div><div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2.5"><span className="font-mono text-[11px] tabular-nums text-zinc-300">{money(order.amount)}</span><div className="flex gap-1">{order.amount === 0 && <button onClick={onQuote} className="rounded bg-amber-500/10 px-2 py-1 text-[9px] font-semibold text-amber-300">Cotizar</button>}<button onClick={() => changeStage(order.id, -1)} disabled={order.stage === 'ingresado'} title="Retroceder etapa" className="rounded border border-zinc-800 px-2 py-1 text-[9px] text-zinc-500 hover:text-white disabled:opacity-30">←</button><button onClick={() => changeStage(order.id, 1)} disabled={order.stage === 'entregado_cobrado'} className="rounded bg-red-600 px-2 py-1 text-[9px] font-semibold text-white hover:bg-red-500 disabled:opacity-30">Avanzar →</button></div></div></div>
}

function InventoryPage({ data, criticalOnly, setCriticalOnly, updateStock, openCreate }: CommonProps & { criticalOnly: boolean; setCriticalOnly: (value: boolean) => void; updateStock: (id: string, amount: number) => void; openCreate: () => void }) {
  const [query, setQuery] = useState('')
  const critical = data.parts.filter((part) => part.stock <= part.min)
  const parts = (criticalOnly ? critical : data.parts).filter((part) => `${part.name} ${part.sku} ${part.brand} ${part.category}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageTitle eyebrow="OPERACIONES · REPUESTOS" title="Inventario" description="Control de existencias, costos y márgenes de venta." action={<Button onClick={openCreate}><Plus size={15} /> Agregar repuesto</Button>} />
    {critical.length > 0 && <button onClick={() => setCriticalOnly(!criticalOnly)} className={`mb-5 flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${criticalOnly ? 'border-red-700 bg-red-950/40' : 'border-red-900/50 bg-red-950/20 hover:bg-red-950/30'}`}><ShieldAlert size={19} className="shrink-0 text-red-400" /><div className="flex-1"><div className="text-xs font-semibold text-red-200">{critical.length} repuestos requieren reposición</div><div className="mt-0.5 text-[10px] text-zinc-500">Stock actual igual o inferior al mínimo de seguridad.</div></div><span className="text-[10px] font-semibold text-red-400">{criticalOnly ? 'Ver todos' : 'Filtrar críticos →'}</span></button>}
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Metric label="Productos activos" value={String(data.parts.length)} note="Repuestos e insumos registrados" icon={Package} tone="blue" /><Metric label="Unidades en stock" value={String(data.parts.reduce((sum, p) => sum + p.stock, 0))} note="Unidades disponibles en taller" icon={Gauge} /><Metric label="Valor de inventario" value={money(data.parts.reduce((sum, p) => sum + p.stock * p.cost, 0))} note="Valorizado a costo de compra" icon={CircleDollarSign} tone="green" /></div>
    <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div><div className="text-sm font-semibold">Catálogo de repuestos</div><div className="mt-1 text-[10px] text-zinc-500">{parts.length} artículos visibles</div></div><div className="rounded-lg border border-zinc-800 px-3 py-2"><Search size={13} className="inline text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar SKU o repuesto" className="ml-2 w-36 bg-transparent text-xs outline-none placeholder:text-zinc-600" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-zinc-800 text-[9px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-3">Artículo</th><th className="px-4 py-3">Categoría / Ubicación</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Precio venta</th><th className="px-4 py-3 text-right">Margen</th><th className="px-5 py-3 text-right">Ajuste rápido</th></tr></thead><tbody>{parts.map((part) => {
      const margin = part.price ? Math.round((part.price - part.cost) / part.price * 100) : 0
      const low = part.stock <= part.min
      return <tr key={part.id} className="border-b border-zinc-800/70 last:border-0"><td className="px-5 py-3.5"><div className="text-xs font-medium text-zinc-200">{part.name}</div><div className="mt-1 font-mono text-[9px] text-zinc-600">{part.sku} · {part.brand}</div></td><td className="px-4 py-3"><div className="text-[11px] text-zinc-400">{part.category}</div><div className="mt-1 text-[9px] text-zinc-600">{part.location}</div></td><td className="px-4 py-3"><div className={`font-mono text-xs font-bold ${low ? 'text-red-400' : 'text-zinc-200'}`}>{part.stock} <span className="text-[9px] font-normal text-zinc-600">/ mín. {part.min}</span></div>{low && <div className="mt-1 text-[9px] font-semibold text-red-400">Stock crítico</div>}</td><td className="px-4 py-3 text-right font-mono text-[11px] text-zinc-400">{money(part.cost)}</td><td className="px-4 py-3 text-right font-mono text-[11px] text-zinc-200">{money(part.price)}</td><td className="px-4 py-3 text-right font-mono text-[11px] text-emerald-400">{margin}%</td><td className="px-5 py-3 text-right"><div className="inline-flex items-center gap-2"><button onClick={() => updateStock(part.id, -1)} aria-label="Descontar unidad" className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-300 hover:border-red-700 hover:text-red-400"><ArrowDown size={12} /></button><button onClick={() => updateStock(part.id, 1)} aria-label="Agregar unidad" className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-300 hover:border-emerald-700 hover:text-emerald-400"><Plus size={13} /></button></div></td></tr>
    })}{parts.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-sm text-zinc-500">No se encontraron repuestos.</td></tr>}</tbody></table></div></Card>
  </>
}

function AgendaPage({ data, updateData, notify, convertAppointment }: CommonProps & { convertAppointment: (appointment: Appointment) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedMechanic, setSelectedMechanic] = useState(mechanics[0].name)
  const openForm = (mechanic = mechanics[0].name) => { setSelectedMechanic(mechanic); setShowForm(true) }
  return <>
    <PageTitle eyebrow="OPERACIONES · PLANIFICACIÓN" title="Agenda y turnos" description="Organización diaria por bahía y especialidad." action={<Button onClick={() => openForm()}><Plus size={15} /> Nuevo turno</Button>} />
    <div className="mb-5 flex items-center justify-between rounded-xl border border-zinc-800 bg-[#101012] p-3"><div className="flex items-center gap-2"><button className="rounded-lg border border-zinc-800 p-2 text-zinc-400" aria-label="Día anterior"><ChevronLeft size={15} /></button><div className="px-2 text-xs font-semibold capitalize">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div><button className="rounded-lg border border-zinc-800 p-2 text-zinc-400" aria-label="Día siguiente"><ChevronRight size={15} /></button></div><div className="flex items-center gap-2 text-[10px] text-zinc-500"><span className="h-2 w-2 rounded-full bg-red-500" />{data.appointments.length} turnos programados</div></div>
    <div className="grid gap-4 xl:grid-cols-4">{mechanics.map((mechanic) => {
      const appointments = data.appointments.filter((item) => item.mechanic === mechanic.name)
      const activeCount = data.orders.filter((order) => order.mechanic === mechanic.name && order.stage !== 'entregado_cobrado').length
      return <Card key={mechanic.name} className="overflow-hidden"><div className="border-b border-zinc-800 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: mechanic.color }} /><div className="text-xs font-semibold">{mechanic.name}</div></div><span className="font-mono text-[9px] text-zinc-600">{activeCount}/3 vehículos</span></div><div className="mt-2 text-[9px] text-zinc-500">{mechanic.bay} · {mechanic.equipment}</div><div className="mt-1 text-[9px] text-zinc-600">{mechanic.specialty}</div></div><div className="min-h-60 space-y-2 bg-zinc-950/30 p-3">{appointments.length ? appointments.map((item) => <div key={item.id} className="rounded-lg border border-zinc-800 bg-[#121214] p-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-xs font-bold text-red-400">{item.time}</span><span className="flex items-center gap-1 text-[9px] text-zinc-600"><Clock3 size={10} />{item.duration} min</span></div><div className="text-xs font-semibold">{item.customer}</div><div className="mt-1 font-mono text-[9px] text-zinc-500">{item.plate} · {item.car}</div><div className="mt-2 rounded bg-zinc-900 px-2 py-1.5 text-[10px] text-zinc-400">{item.reason}</div><div className="mt-3 flex gap-1.5"><button onClick={() => convertAppointment(item)} className="flex-1 rounded bg-red-600/10 py-1.5 text-[9px] font-semibold text-red-400 hover:bg-red-600/20">Crear orden →</button><a href={waLink(item.phone, `Hola ${item.customer}, te recordamos tu turno en AutoTaller Pro hoy a las ${item.time} para tu ${item.car} (${item.plate}). ¡Te esperamos!`)} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded border border-zinc-800 px-2 text-emerald-500 hover:bg-emerald-950/30"><MessageCircle size={13} /></a></div></div>) : <div className="py-12 text-center text-[10px] text-zinc-700">Sin turnos asignados</div>}</div><button onClick={() => openForm(mechanic.name)} className="m-3 flex w-[calc(100%-24px)] items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-800 py-2 text-[10px] text-zinc-600 hover:text-zinc-300"><Plus size={12} /> Agendar turno</button></Card>
    })}</div>
    {showForm && <AppointmentModal mechanic={selectedMechanic} close={() => setShowForm(false)} save={(appointment) => {
      if (data.appointments.some((item) => item.mechanic === appointment.mechanic && item.time === appointment.time)) {
        notify('Ese mecánico ya tiene un turno en ese horario.')
        return
      }
      updateData({ ...data, appointments: [...data.appointments, appointment].sort((a, b) => a.time.localeCompare(b.time)) })
      setShowForm(false)
      notify('Turno agendado correctamente.')
    }} />}
  </>
}

function AppointmentModal({ mechanic, close, save }: { mechanic: string; close: () => void; save: (appointment: Appointment) => void }) {
  const [time, setTime] = useState('09:00')
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [car, setCar] = useState('')
  const [plate, setPlate] = useState('')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('60')
  const [assigned, setAssigned] = useState(mechanic)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    save({ id: `a-${Date.now()}`, time, customer, phone: phone.replace(/\D/g, ''), car, plate: fmtPlate(plate), reason, duration: Number(duration), mechanic: assigned })
  }
  return <Modal title="Agendar turno" subtitle="Asignación de servicio a una bahía" close={close}><form onSubmit={submit} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Horario"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} required /></Field><Field label="Duración estimada"><select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass}>{['30', '60', '90', '120', '180'].map((v) => <option key={v} value={v}>{v} minutos</option>)}</select></Field><Field label="Cliente"><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputClass} required /></Field><Field label="WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} required /></Field><Field label="Patente"><input value={plate} onChange={(e) => setPlate(fmtPlate(e.target.value))} className={`${inputClass} font-mono uppercase`} placeholder="AF 123 XY" required /></Field><Field label="Vehículo"><input value={car} onChange={(e) => setCar(e.target.value)} className={inputClass} required /></Field><div className="col-span-2"><Field label="Motivo del servicio"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} required /></Field></div><div className="col-span-2"><Field label="Mecánico / bahía"><select value={assigned} onChange={(e) => setAssigned(e.target.value)} className={inputClass}>{mechanics.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field></div></div><div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><Button variant="secondary" onClick={close}>Cancelar</Button><Button type="submit"><CalendarDays size={14} /> Confirmar turno</Button></div></form></Modal>
}

function BillingPage({ data, setShowInvoice, updateData, notify }: CommonProps) {
  const [paymentOrder, setPaymentOrder] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [method, setMethod] = useState('Transferencia CBU/CVU')
  const invoices = data.orders.filter((order) => order.amount > 0)
  const registerPayment = (event: FormEvent) => {
    event.preventDefault()
    const order = data.orders.find((item) => item.id === paymentOrder)
    const value = Number(paymentAmount)
    if (!order || value <= 0 || !Number.isFinite(value)) { notify('Ingresá un importe válido para cobrar.'); return }
    if (value > order.amount - order.paid) { notify('El importe supera el saldo pendiente.'); return }
    updateData({ ...data, orders: data.orders.map((item) => item.id === order.id ? { ...item, paid: item.paid + value, stage: item.stage === 'listo_para_entrega' && item.paid + value >= item.amount ? 'entregado_cobrado' : item.stage } : item) })
    setPaymentAmount(''); setPaymentOrder(''); notify(`Cobranza de ${money(value)} registrada (${method}).`)
  }
  return <>
    <PageTitle eyebrow="ADMINISTRACIÓN · ARCA" title="Facturación y cobranzas" description="Comprobantes simulados, pagos parciales y saldos de clientes." />
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Facturación emitida" value={money(invoices.reduce((sum, o) => sum + o.amount, 0))} note="Órdenes con presupuesto" icon={FileText} /><Metric label="Cobrado" value={money(invoices.reduce((sum, o) => sum + o.paid, 0))} note="Cobranzas acumuladas" icon={CircleDollarSign} tone="green" /><Metric label="Saldo pendiente" value={money(invoices.reduce((sum, o) => sum + o.amount - o.paid, 0))} note="Importe a cobrar" icon={Wallet} tone="amber" /></div>
    <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_1.7fr]">
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><div className="rounded-lg bg-red-500/10 p-2 text-red-400"><Wallet size={16} /></div><div><div className="text-sm font-semibold">Registrar cobranza</div><div className="mt-0.5 text-[10px] text-zinc-500">Ingreso parcial o total de una OT</div></div></div><form onSubmit={registerPayment} className="space-y-3"><Field label="Orden de trabajo"><select value={paymentOrder} onChange={(e) => setPaymentOrder(e.target.value)} required className={inputClass}><option value="">Seleccionar orden...</option>{invoices.filter((o) => o.amount > o.paid).map((order) => <option key={order.id} value={order.id}>{order.id} · {order.plate} · saldo {money(order.amount - order.paid)}</option>)}</select></Field><Field label="Importe"><input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" min="1" placeholder="0" className={inputClass} required /></Field><Field label="Medio de pago"><select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>{['Efectivo', 'Transferencia CBU/CVU', 'Mercado Pago QR', 'Tarjeta de débito', 'Tarjeta de crédito'].map((value) => <option key={value}>{value}</option>)}</select></Field><Button type="submit" className="w-full"><Check size={14} /> Registrar pago</Button></form></Card>
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div><div className="text-sm font-semibold">Comprobantes y órdenes</div><div className="mt-1 text-[10px] text-zinc-500">Punto de venta 0004 · Simulador ARCA</div></div><span className="rounded bg-zinc-900 px-2 py-1 text-[9px] text-zinc-500">MODO DEMO</span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-zinc-800 text-[9px] uppercase text-zinc-600"><th className="px-5 py-3">OT / Cliente</th><th className="px-4 py-3">Importe</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Factura</th></tr></thead><tbody>{invoices.map((order) => <tr key={order.id} className="border-b border-zinc-800/70 last:border-0"><td className="px-5 py-3"><div className="text-xs font-semibold">{order.id} · {order.plate}</div><div className="mt-1 text-[10px] text-zinc-500">{order.customer}</div></td><td className="px-4 py-3 font-mono text-[11px]">{money(order.amount)}</td><td className="px-4 py-3 font-mono text-[11px] text-amber-300">{money(order.amount - order.paid)}</td><td className="px-4 py-3"><span className={`text-[10px] ${order.paid >= order.amount ? 'text-emerald-400' : 'text-amber-400'}`}>{order.paid >= order.amount ? 'Pagado' : order.paid ? 'Pago parcial' : 'Pendiente'}</span></td><td className="px-5 py-3 text-right"><button onClick={() => setShowInvoice(order)} className="rounded border border-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:border-zinc-600">Emitir / ver</button></td></tr>)}</tbody></table></div></Card>
    </div>
    <div className="text-[10px] leading-relaxed text-zinc-600">La emisión de CAE y comprobantes en este modo es demostrativa. Para operar en producción, integrar un proveedor autorizado de facturación electrónica ARCA y credenciales fiscales del contribuyente.</div>
  </>
}

function ReportsPage({ data }: CommonProps) {
  const total = data.orders.reduce((sum, order) => sum + order.amount, 0)
  const paid = data.orders.reduce((sum, order) => sum + order.paid, 0)
  const iva = Math.round(total * 21 / 121)
  return <>
    <PageTitle eyebrow="ADMINISTRACIÓN · ANALÍTICA" title="Reporte gerencial" description="Indicadores de facturación, rendimiento y operación del taller." action={<Button variant="secondary" onClick={() => window.print()}><Printer size={14} /> Imprimir / PDF</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Facturación bruta" value={money(total)} note="Período noviembre 2026" icon={CircleDollarSign} /><Metric label="Neto gravado" value={money(total - iva)} note="Base imponible estimada" icon={FileText} tone="blue" /><Metric label="IVA liquidado (21%)" value={money(iva)} note="Estimación sobre facturación" icon={Receipt} tone="amber" /><Metric label="Cobranzas totales" value={money(paid)} note="Ticket medio por vehículo" icon={Wallet} tone="green" /></div>
    <div className="mb-5 grid gap-5 xl:grid-cols-2"><Card className="p-5"><SectionHeading title="Ingresos y cobranzas · últimos 6 meses" /><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenueData} margin={{ top: 12, right: 15, left: 4, bottom: 0 }}><CartesianGrid stroke="#27272a" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="month" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(1)}M`} /><Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }} formatter={(value) => money(Number(value))} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="cobranzas" name="Cobranzas" stroke="#71717a" strokeWidth={2} dot={{ r: 2 }} /></LineChart></ResponsiveContainer></div></Card>
    <Card className="p-5"><SectionHeading title="Servicios más demandados" /><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={serviceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid stroke="#27272a" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="name" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} /><YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" name="Intervenciones" radius={[4, 4, 0, 0]}>{serviceData.map((_, i) => <Cell key={i} fill={['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#52525b'][i]} />)}</Bar></BarChart></ResponsiveContainer></div></Card></div>
    <Card className="overflow-hidden"><div className="border-b border-zinc-800 px-5 py-4"><div className="text-sm font-semibold">Rendimiento operativo por mecánico</div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="text-[9px] uppercase text-zinc-600"><th className="px-5 py-3">Mecánico</th><th className="px-4 py-3">Órdenes abiertas</th><th className="px-4 py-3">Entregadas</th><th className="px-4 py-3">Facturación asignada</th><th className="px-5 py-3">Ocupación</th></tr></thead><tbody>{mechanics.map((m) => { const assigned = data.orders.filter((o) => o.mechanic === m.name); const open = assigned.filter((o) => o.stage !== 'entregado_cobrado').length; const amount = assigned.reduce((sum, o) => sum + o.amount, 0); return <tr key={m.name} className="border-t border-zinc-800/70 text-xs"><td className="px-5 py-3">{m.name}</td><td className="px-4 py-3 font-mono">{open}</td><td className="px-4 py-3 font-mono">{assigned.length - open}</td><td className="px-4 py-3 font-mono">{money(amount)}</td><td className="px-5 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 rounded bg-zinc-800"><div className="h-full rounded bg-red-600" style={{ width: `${Math.min(100, open / 3 * 100)}%` }} /></div><span className="font-mono text-[10px] text-zinc-500">{Math.round(Math.min(100, open / 3 * 100))}%</span></div></td></tr> })}</tbody></table></div></Card>
  </>
}

function NotificationsPage({ data, updateData, notify }: CommonProps) {
  const [segment, setSegment] = useState('Autos en taller')
  const [title, setTitle] = useState('Novedades de tu vehículo')
  const [body, setBody] = useState('Tu vehículo está avanzando en nuestro taller. Consultá el estado de tu reparación.')
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const segments = ['Autos en taller', 'Listos para entrega', 'Próximos turnos', 'Todos los clientes', 'Por patente / cliente']
  const send = async () => {
    if (typeof Notification === 'undefined') { notify('Este navegador no admite notificaciones web.'); return }
    let granted = permission
    if (granted !== 'granted') granted = await Notification.requestPermission()
    setPermission(granted)
    if (granted !== 'granted') { notify('Se necesita permiso para enviar notificaciones.'); return }
    const notification = new Notification(title || 'AutoTaller Pro', { body, icon: '/vite.svg' })
    notification.onclick = () => window.focus()
    const entry: NotificationLog = { id: `n-${Date.now()}`, title, body, segment, sentAt: new Date().toLocaleString('es-AR'), delivered: segment === 'Autos en taller' ? data.orders.filter((o) => o.stage !== 'entregado_cobrado').length : segment === 'Listos para entrega' ? data.orders.filter((o) => o.stage === 'listo_para_entrega').length : segment === 'Próximos turnos' ? data.appointments.length : data.orders.length }
    updateData({ ...data, notifications: [entry, ...data.notifications] })
    notify('Notificación enviada y agregada al historial.')
  }
  return <>
    <PageTitle eyebrow="COMUNICACIÓN · PUSH" title="Centro de notificaciones" description="Mensajes segmentados para mantener a tus clientes informados." />
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card className="p-5 md:p-6"><div className="mb-5 text-sm font-semibold">Redactar notificación</div><div className="space-y-4"><Field label="Segmento de clientes"><select value={segment} onChange={(e) => setSegment(e.target.value)} className={inputClass}>{segments.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Título"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} className={inputClass} /></Field><Field label="Mensaje"><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} rows={4} className={`${inputClass} resize-none`} /><div className="mt-1 text-right text-[9px] text-zinc-600">{body.length}/180 caracteres</div></Field><div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4"><div className="text-[10px] text-zinc-500">Permiso navegador: <span className={permission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}>{permission}</span></div><Button onClick={send}><Send size={14} /> Enviar notificación</Button></div></div>
        <div className="mt-6 border-t border-zinc-800 pt-5"><SectionHeading title="Historial de envíos" /><div className="space-y-2">{data.notifications.length ? data.notifications.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg bg-zinc-950/70 p-3"><div className="rounded-lg bg-red-500/10 p-2 text-red-400"><Bell size={14} /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{item.title}</div><div className="mt-1 text-[9px] text-zinc-500">{item.segment} · {item.sentAt}</div></div><div className="text-right"><div className="font-mono text-xs">{item.delivered}</div><div className="text-[9px] text-zinc-600">destinatarios</div></div></div>) : <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-600">Todavía no hay notificaciones enviadas.</div>}</div></div>
      </Card>
      <div className="mx-auto w-full max-w-[360px]"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-wider text-zinc-500"><Smartphone size={14} /> VISTA PREVIA · PANTALLA DE BLOQUEO</div><div className="relative min-h-[550px] overflow-hidden rounded-[36px] border-[7px] border-zinc-800 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black p-5 shadow-2xl"><div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black" /><div className="mt-14 text-center"><div className="text-6xl font-light tracking-tight text-white">09:41</div><div className="mt-2 text-xs text-zinc-300">Sábado, 8 de noviembre</div></div><div className="mt-10 rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md"><div className="mb-3 flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600"><Wrench size={13} /></div><span className="text-[10px] font-semibold text-white">AUTOTALLER PRO</span><span className="ml-auto text-[9px] text-zinc-400">ahora</span></div><div className="text-sm font-semibold">{title || 'Título de notificación'}</div><div className="mt-1.5 text-xs leading-relaxed text-zinc-300">{body || 'El mensaje aparecerá aquí.'}</div></div><div className="absolute bottom-8 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/70" /></div></div>
    </div>
  </>
}

function PortalPage({ data, updateData, notify, selectedPortal, setSelectedPortal }: CommonProps) {
  const activeOrders = data.orders.filter((order) => order.stage !== 'entregado_cobrado')
  const order = data.orders.find((item) => item.id === selectedPortal) ?? activeOrders[0] ?? data.orders[0]
  return <>
    <PageTitle eyebrow="COMUNICACIÓN · EXPERIENCIA CLIENTE" title="Portal de seguimiento" description="Vista previa del estado de reparación tal como la ve tu cliente." action={<div className="flex items-center gap-2"><span className="text-[10px] text-zinc-500">Vehículo</span><select value={order?.id ?? ''} onChange={(e) => setSelectedPortal(e.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200">{data.orders.map((o) => <option value={o.id} key={o.id}>{o.plate} · {o.customer}</option>)}</select></div>} />
    {!order ? <Card className="p-10 text-center text-sm text-zinc-500">No hay órdenes para mostrar.</Card> : <div className="grid items-start gap-8 xl:grid-cols-[1fr_380px]"><div><Card className="overflow-hidden"><div className="border-b border-zinc-800 p-5"><div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold tracking-widest text-red-400">ORDEN {order.id}</div><div className="mt-2 text-xl font-bold">{order.car}</div><div className="mt-1 font-mono text-xs text-zinc-500">{order.plate} · {order.customer}</div></div><Status stage={order.stage} /></div></div><div className="p-5"><div className="mb-5 text-xs font-semibold">Progreso de reparación</div><div className="relative space-y-0">{stages.map((stage, i) => { const active = stages.findIndex((s) => s.id === order.stage) >= i; const current = stage.id === order.stage; return <div className="relative flex min-h-[54px] gap-4" key={stage.id}><div className="relative flex w-5 justify-center"><span className={`z-10 flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-red-500 bg-red-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-600'}`}>{active ? <Check size={11} /> : <span className="h-1 w-1 rounded-full bg-current" />}</span>{i < stages.length - 1 && <span className={`absolute top-5 h-[34px] w-px ${active && i < stages.findIndex((s) => s.id === order.stage) ? 'bg-red-700' : 'bg-zinc-800'}`} />}</div><div className={`pb-4 text-xs ${current ? 'font-semibold text-red-300' : active ? 'text-zinc-300' : 'text-zinc-600'}`}>{stage.label}{current && <span className="ml-2 text-[9px] font-normal text-red-400">EN CURSO</span>}</div></div> })}</div><div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"><div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Servicio solicitado</div><div className="mt-1.5 text-xs font-medium">{order.service}</div><div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500"><Wrench size={12} className="text-red-400" />Mecánico a cargo: <span className="text-zinc-300">{order.mechanic}</span></div></div></div></Card></div><div className="mx-auto w-full max-w-[380px]"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-wider text-zinc-500"><Smartphone size={14} /> EXPERIENCIA MÓVIL</div><div className="rounded-[34px] border-[7px] border-zinc-800 bg-[#f7f7f7] p-4 text-zinc-900 shadow-2xl"><div className="mx-auto mb-4 h-5 w-24 rounded-full bg-zinc-900" /><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><Wrench size={23} /></div><div className="mt-3 text-lg font-bold">AutoTaller <span className="text-red-600">Pro</span></div><div className="mt-1 text-[10px] text-zinc-500">Hola, {order.customer.split(' ')[0]} 👋</div></div><div className="mt-5 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"><div className="flex justify-between"><div><div className="font-mono text-[9px] text-zinc-500">{order.plate}</div><div className="mt-1 text-xs font-bold">{order.car}</div></div><CarFront size={20} className="text-red-600" /></div><div className="mt-3 rounded-md bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-700">{stageLabel(order.stage)}</div><div className="mt-3 h-1.5 rounded-full bg-zinc-100"><div className="h-full rounded-full bg-red-600" style={{ width: `${Math.round((stages.findIndex((s) => s.id === order.stage) + 1) / stages.length * 100)}%` }} /></div><div className="mt-1.5 text-right text-[9px] text-zinc-400">{Math.round((stages.findIndex((s) => s.id === order.stage) + 1) / stages.length * 100)}% completado</div></div><div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Presupuesto</div><div className="mt-2 flex justify-between text-[10px] text-zinc-600"><span>{order.service}</span><span>{money(order.amount)}</span></div><div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-xs font-bold"><span>Saldo pendiente</span><span className="font-mono text-red-600">{money(order.amount - order.paid)}</span></div>{order.stage === 'espera_aprobacion' && <button onClick={() => { updateData({ ...data, orders: data.orders.map((item) => item.id === order.id ? { ...item, stage: 'en_reparacion' } : item) }); notify('Presupuesto aprobado por el cliente.') }} className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white">Aprobar presupuesto</button>}<div className="mt-5 text-center text-[9px] text-zinc-400">Actualización en tiempo real · AutoTaller Pro</div></div></div></div>}
  </>
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-700 focus:ring-1 focus:ring-red-900'
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-[10px] font-semibold text-zinc-400">{label}{children}</label> }
function Modal({ title, subtitle, close, children, wide = false }: { title: string; subtitle?: string; close: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) close() }}><div className={`max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-2xl border border-zinc-700 bg-[#101012] shadow-2xl`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-800 bg-[#101012] px-5 py-4"><div><h2 className="text-base font-bold">{title}</h2>{subtitle && <div className="mt-1 text-[10px] text-zinc-500">{subtitle}</div>}</div><button onClick={close} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Cerrar"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>
}
function OrderModal({ data, close, save }: { data: AppData; close: () => void; save: (order: Order) => void }) {
  const [plate, setPlate] = useState('')
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [car, setCar] = useState('')
  const [color, setColor] = useState('')
  const [year, setYear] = useState('2022')
  const [km, setKm] = useState('')
  const [mechanic, setMechanic] = useState(mechanics[0].name)
  const [service, setService] = useState('')
  const [fuel, setFuel] = useState('1/2')
  const [observations, setObservations] = useState('')
  const [existing, setExisting] = useState(false)
  const [view, setView] = useState('Lateral derecho')
  const [damageKind, setDamageKind] = useState('Rayón')
  const [damages, setDamages] = useState<Damage[]>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>({ 'Rueda de auxilio': false, Gato: false, 'Llave de ruedas': false, Balizas: false, Cédula: false })
  const [photos, setPhotos] = useState<EvidencePhoto[]>([])
  const [photoStage, setPhotoStage] = useState('Ingreso')
  const [lines, setLines] = useState<EstimateLine[]>([{ id: `line-${Date.now()}`, title: 'Mano de obra', kind: 'labor', quantity: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState('0')
  const [vatRate, setVatRate] = useState('21')
  const [error, setError] = useState('')
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const taxable = Math.max(0, subtotal - (Number(discount) || 0))
  const total = Math.round(taxable + taxable * Number(vatRate) / 100)
  const findHistory = (value: string) => {
    const found = data.orders.find((o) => formatPlate(o.plate) === formatPlate(value))
    if (found) { setCustomer(found.customer); setPhone(found.phone); setCar(found.car); setYear(String(found.year)); setExisting(true) } else setExisting(false)
  }
  const addLine = (kind: 'labor' | 'part') => setLines((current) => [...current, {
    id: `line-${Date.now()}-${current.length}`, title: kind === 'labor' ? 'Mano de obra' : '', kind, quantity: 1, unitPrice: 0,
  }])
  const updateLine = (id: string, patch: Partial<EstimateLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line))
  const addDamage = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setDamages((current) => [...current, { x: Math.round((event.clientX - rect.left) / rect.width * 100), y: Math.round((event.clientY - rect.top) / rect.height * 100), kind: damageKind, view }])
  }
  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    try {
      const results = await Promise.all(files.map(async (file): Promise<EvidencePhoto> => {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name}: el archivo no es una imagen.`)
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No se pudo procesar la imagen.')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close()
        return { name: file.name, stage: photoStage, dataUrl: canvas.toDataURL('image/jpeg', 0.72) }
      }))
      setPhotos((current) => [...current, ...results].slice(0, 8))
      setError('')
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'No se pudieron cargar las fotos.') }
    event.target.value = ''
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const usage = new Map<string, number>()
    lines.forEach((line) => { if (line.partId) usage.set(line.partId, (usage.get(line.partId) ?? 0) + line.quantity) })
    for (const [partId, quantity] of usage) {
      const part = data.parts.find((item) => item.id === partId)
      if (!part || part.stock < quantity) { setError(`Stock insuficiente para ${part?.name ?? 'el repuesto seleccionado'}.`); return }
    }
    const order: Order = {
      id: `OT-${String(2409 + data.orders.length).padStart(4, '0')}`, plate: fmtPlate(plate), customer, phone: phone.replace(/\D/g, ''),
      car, color, year: Number(year), km: Number(km) || 0, mechanic, stage: 'ingresado', service, amount: total, paid: 0,
      created: new Date().toISOString().slice(0, 10), damages, fuel, observations, checklist, photos, lines, discount: Number(discount) || 0, vatRate: Number(vatRate),
    }
    save(order)
  }
  return <Modal title="Nueva orden de trabajo" subtitle="Recepción, ficha clínica y presupuesto del vehículo" close={close} wide><form onSubmit={submit} className="space-y-6">
    <div><div className="mb-3 text-xs font-semibold text-zinc-200">Datos del cliente y vehículo</div><div className="grid gap-3 sm:grid-cols-2">
      <Field label="Patente argentina"><input value={plate} onChange={(e) => { const value = fmtPlate(e.target.value); setPlate(value); findHistory(value) }} placeholder="AF 123 XY o AAA 123" className={`${inputClass} font-mono uppercase`} required />{existing && <span className="mt-1 inline-block text-[9px] font-semibold text-emerald-400">✓ Historial encontrado. Datos autocompletados.</span>}</Field>
      <Field label="Cliente"><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nombre y apellido" className={inputClass} required /></Field>
      <Field label="WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="54911..." className={inputClass} required /></Field>
      <Field label="Vehículo (marca y modelo)"><input value={car} onChange={(e) => setCar(e.target.value)} placeholder="Toyota Corolla XEI" className={inputClass} required /></Field>
      <Field label="Año"><input type="number" min="1950" max="2027" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} required /></Field>
      <Field label="Kilometraje actual"><input type="number" min="0" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" className={inputClass} /></Field>
      <Field label="Color"><input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Gris plata" className={inputClass} /></Field>
      <Field label="Nivel de combustible"><select value={fuel} onChange={(e) => setFuel(e.target.value)} className={inputClass}>{['Reserva', '1/4', '1/2', '3/4', 'Lleno'].map((v) => <option key={v}>{v}</option>)}</select></Field>
      <Field label="Mecánico / bahía"><select value={mechanic} onChange={(e) => setMechanic(e.target.value)} className={inputClass}>{mechanics.map((m) => <option key={m.name}>{m.name}</option>)}</select></Field>
      <Field label="Servicio solicitado"><input value={service} onChange={(e) => setService(e.target.value)} placeholder="Ej. Service 60.000 km" className={inputClass} required /></Field>
    </div></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div><div className="mb-2 text-xs font-semibold">Checklist de ingreso</div><div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">{Object.entries(checklist).map(([label, checked]) => <label key={label} className="flex items-center gap-2 text-[10px] text-zinc-400"><input type="checkbox" checked={checked} onChange={(e) => setChecklist((current) => ({ ...current, [label]: e.target.checked }))} className="accent-red-600" />{label}</label>)}</div><textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} placeholder="Observaciones de ingreso, ruidos o pertenencias..." className={`${inputClass} resize-none`} /></div>
      <div><div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold">Diagrama de daños</div><select value={damageKind} onChange={(e) => setDamageKind(e.target.value)} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px]">{['Rayón', 'Abolladura', 'Rotura / fisura', 'Detalle de pintura'].map((kind) => <option key={kind}>{kind}</option>)}</select></div><div className="mb-2 flex gap-1">{['Lateral derecho', 'Lateral izquierdo', 'Frontal', 'Trasera'].map((side) => <button type="button" key={side} onClick={() => setView(side)} className={`rounded px-2 py-1 text-[9px] ${view === side ? 'bg-red-600/20 text-red-300' : 'bg-zinc-900 text-zinc-500'}`}>{side}</button>)}</div><svg viewBox="0 0 300 130" onClick={addDamage} role="button" aria-label="Marcar daño haciendo clic en la carrocería" className="h-[122px] w-full cursor-crosshair rounded-lg border border-zinc-800 bg-zinc-950 p-2">
        <path d={view === 'Frontal' || view === 'Trasera' ? 'M92 20 Q105 10 150 10 Q195 10 208 20 L230 42 L224 90 L206 108 Q150 122 94 108 L76 90 L70 42 Z' : 'M34 67 L50 65 L69 43 Q80 32 105 30 L183 30 Q204 34 220 50 L246 56 L264 64 L268 81 L255 91 L43 91 L29 82 Z'} fill="#27272a" stroke="#71717a" strokeWidth="2" />
        {view !== 'Frontal' && view !== 'Trasera' ? <><path d="M75 59 L91 39 Q101 34 117 34 L117 59 Z M124 34 L180 34 Q195 37 210 59 L124 59 Z" fill="#18181b" stroke="#52525b" /><circle cx="78" cy="88" r="13" fill="#09090b" stroke="#71717a" strokeWidth="3" /><circle cx="220" cy="88" r="13" fill="#09090b" stroke="#71717a" strokeWidth="3" /></> : <><path d="M99 35 L201 35 L214 56 L214 88 L86 88 L86 56 Z" fill="#18181b" stroke="#52525b" /><path d="M76 37 L65 48 M224 37 L235 48" stroke="#a1a1aa" strokeWidth="4" /></>}
        {damages.filter((d) => (d.view ?? 'Lateral derecho') === view).map((damage, index) => <g key={`${damage.x}-${damage.y}-${index}`}><circle cx={damage.x / 100 * 300} cy={damage.y / 100 * 130} r="7" fill="#dc2626" fillOpacity=".85" stroke="white" strokeWidth="1.5" /><text x={damage.x / 100 * 300} y={damage.y / 100 * 130 + 3} textAnchor="middle" fill="white" fontSize="7">{index + 1}</text></g>)}
      </svg><div className="mt-1 text-[9px] text-zinc-600">Clic en la silueta para marcar {damageKind.toLowerCase()} · {damages.length} marcas</div></div>
    </div>
    <div><div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold">Evidencia fotográfica</div><div className="flex items-center gap-2"><select value={photoStage} onChange={(e) => setPhotoStage(e.target.value)} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[9px]">{['Ingreso', 'Diagnóstico', 'Repuesto viejo desgastado', 'Repuesto nuevo instalado', 'Trabajo finalizado'].map((stage) => <option key={stage}>{stage}</option>)}</select><label className="cursor-pointer rounded border border-zinc-700 px-2.5 py-1.5 text-[9px] font-semibold text-zinc-300 hover:bg-zinc-800"><Camera size={12} className="mr-1 inline" />Agregar<input type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" /></label></div></div>{photos.length > 0 && <div className="grid grid-cols-4 gap-2">{photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative overflow-hidden rounded-lg border border-zinc-800"><img src={photo.dataUrl} alt={photo.name} className="h-16 w-full object-cover" /><button type="button" onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white"><X size={10} /></button><div className="truncate px-1.5 py-1 text-[8px] text-zinc-500">{photo.stage}</div></div>)}</div>}</div>
    <div><div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold">Presupuesto y costos</div><div className="flex gap-1.5"><Button variant="secondary" className="px-2 py-1.5 text-[9px]" onClick={() => addLine('labor')}><Plus size={11} /> Mano de obra</Button><Button variant="secondary" className="px-2 py-1.5 text-[9px]" onClick={() => addLine('part')}><Plus size={11} /> Repuesto</Button></div></div><div className="space-y-2">{lines.map((line) => <div key={line.id} className="grid grid-cols-[1fr_80px_110px_80px_28px] items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
      {line.kind === 'part' ? <select value={line.partId ?? ''} onChange={(e) => { const part = data.parts.find((item) => item.id === e.target.value); updateLine(line.id, { partId: part?.id, title: part?.name ?? '', unitPrice: part?.price ?? 0 }) }} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px]"><option value="">Seleccionar repuesto</option>{data.parts.map((part) => <option key={part.id} value={part.id}>{part.name} · stock {part.stock}</option>)}</select> : <input value={line.title} onChange={(e) => updateLine(line.id, { title: e.target.value })} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px]" aria-label="Descripción de mano de obra" />}
      <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value)) })} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px]" aria-label="Cantidad" />
      <input type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(line.id, { unitPrice: Math.max(0, Number(e.target.value)) })} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px]" aria-label="Precio unitario" />
      <div className="text-right font-mono text-[10px] text-zinc-400">{money(line.quantity * line.unitPrice)}</div>
      <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="text-zinc-600 hover:text-red-400" aria-label="Quitar ítem"><X size={14} /></button>
    </div>)}</div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_140px]"><Field label="Descuento (ARS)"><input type="number" min="0" max={subtotal} value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} /></Field><Field label="IVA"><select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={inputClass}>{['21', '10.5', '0'].map((v) => <option key={v} value={v}>{v}%</option>)}</select></Field><div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><div className="text-[9px] text-zinc-500">TOTAL ESTIMADO</div><div className="mt-1 font-mono text-sm font-bold text-white">{money(total)}</div></div></div></div>
    <div className="flex items-end justify-between gap-4 border-t border-zinc-800 pt-4"><div>{error && <div role="alert" className="mb-2 text-[10px] text-red-400">{error}</div>}<div className="text-[9px] text-zinc-600">Los repuestos presupuestados se descontarán del stock al crear la orden.</div></div><div className="flex shrink-0 gap-2"><Button variant="secondary" onClick={close}>Cancelar</Button><Button type="submit"><Check size={14} /> Crear orden</Button></div></div>
  </form></Modal>
}
function QuoteModal({ order, close, save }: { order: Order; close: () => void; save: (order: Order) => void }) {
  const [service, setService] = useState(order.service)
  const [labor, setLabor] = useState(String(order.amount || ''))
  const [discount, setDiscount] = useState(String(order.discount ?? 0))
  const [vatRate, setVatRate] = useState(String(order.vatRate ?? 21))
  const taxable = Math.max(0, Number(labor || 0) - Number(discount || 0))
  const total = Math.round(taxable + taxable * Number(vatRate) / 100)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (total <= 0) return
    save({ ...order, service, amount: total, discount: Number(discount), vatRate: Number(vatRate), lines: [{ id: `quote-${Date.now()}`, title: service, kind: 'labor', quantity: 1, unitPrice: Number(labor) }], stage: 'espera_aprobacion' })
  }
  return <Modal title={`Presupuesto · ${order.id}`} subtitle={`${order.plate} · ${order.customer}`} close={close}><form onSubmit={submit} className="space-y-4"><Field label="Trabajo a realizar"><input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} required /></Field><Field label="Importe neto (mano de obra y repuestos)"><input type="number" min="1" value={labor} onChange={(e) => setLabor(e.target.value)} className={inputClass} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Descuento (ARS)"><input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} /></Field><Field label="IVA"><select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={inputClass}>{['21', '10.5', '0'].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select></Field></div><div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><div className="text-[9px] text-zinc-500">TOTAL A SOLICITAR</div><div className="mt-1 font-mono text-lg font-bold text-white">{money(total)}</div></div><div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><Button variant="secondary" onClick={close}>Cancelar</Button><Button type="submit"><Send size={14} /> Enviar a aprobación</Button></div></form></Modal>
}
function PartModal({ close, save }: { close: () => void; save: (part: Part) => void }) {
  const [name, setName] = useState(''); const [sku, setSku] = useState(''); const [brand, setBrand] = useState(''); const [category, setCategory] = useState('Filtros'); const [location, setLocation] = useState(''); const [stock, setStock] = useState('0'); const [min, setMin] = useState('1'); const [cost, setCost] = useState('0'); const [price, setPrice] = useState('0')
  const margin = Number(price) > 0 ? Math.round((Number(price) - Number(cost)) / Number(price) * 100) : 0
  const submit = (event: FormEvent) => { event.preventDefault(); save({ id: `p-${Date.now()}`, sku, name, brand, category, location, stock: Number(stock), min: Number(min), cost: Number(cost), price: Number(price) }) }
  return <Modal title="Agregar repuesto" subtitle="Nuevo artículo de inventario" close={close}><form onSubmit={submit} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="SKU"><input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} required /></Field><Field label="Marca"><input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} /></Field><div className="col-span-2"><Field label="Nombre del repuesto"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></Field></div><Field label="Categoría"><select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>{['Filtros', 'Frenos', 'Lubricantes', 'Electricidad', 'Suspensión', 'Otros'].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Ubicación"><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Estante A1" /></Field><Field label="Stock actual"><input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className={inputClass} /></Field><Field label="Stock mínimo"><input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} className={inputClass} /></Field><Field label="Costo de compra"><input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} /></Field><Field label="Precio de venta"><input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} /></Field></div><div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">Margen comercial estimado <span className="float-right font-mono font-bold text-emerald-400">{margin}%</span></div><div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><Button variant="secondary" onClick={close}>Cancelar</Button><Button type="submit"><Plus size={14} /> Agregar artículo</Button></div></form></Modal>
}
function InvoiceModal({ order, close }: { order: Order; close: () => void }) {
  const [kind, setKind] = useState('B')
  const [includeVat, setIncludeVat] = useState(true)
  const [number] = useState(() => `00004-${String(Math.floor(10000000 + Math.random() * 89999999)).slice(0, 8)}`)
  const [cae] = useState(() => String(Math.floor(10000000000000 + Math.random() * 89999999999999)))
  const expiry = new Date(Date.now() + 10 * 86400000).toLocaleDateString('es-AR')
  const qrData = JSON.stringify({ ver: 1, fecha: new Date().toISOString().slice(0, 10), cuit: 20123456789, ptoVta: 4, tipoCmp: kind === 'A' ? 1 : kind === 'B' ? 6 : 11, nroCmp: Number(number.split('-')[1]), importe: order.amount, moneda: 'PES', ctz: 1, tipoDocRec: 96, nroDocRec: 30123456, tipoCodAut: 'E', codAut: cae })
  const base = includeVat ? order.amount / 1.21 : order.amount
  return <Modal title="Comprobante fiscal" subtitle="Simulación de factura electrónica · Punto de venta 0004" close={close} wide><div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{['A', 'B', 'C'].map((v) => <button key={v} onClick={() => setKind(v)} className={`rounded-lg border px-4 py-2 text-xs font-semibold ${kind === v ? 'border-red-700 bg-red-950/30 text-red-300' : 'border-zinc-800 text-zinc-500'}`}>Factura {v}</button>)}</div><label className="flex items-center gap-2 text-[10px] text-zinc-400"><input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="accent-red-600" /> IVA incluido (21%)</label><Button onClick={() => window.print()} variant="secondary"><Printer size={14} /> Imprimir / Guardar PDF</Button></div><div className="print-area rounded border border-zinc-300 bg-white p-7 text-black"><div className="flex items-start justify-between border-b-2 border-black pb-4"><div><div className="text-xl font-black tracking-tight">AUTOTALLER PRO</div><div className="mt-1 text-[9px]">Servicios de mantenimiento y reparación automotor</div><div className="mt-1 text-[9px]">Av. Taller 1234 · Buenos Aires · IVA Responsable Inscripto</div></div><div className="mx-5 border-x border-black px-4 text-center"><div className="text-2xl font-bold">{kind}</div><div className="text-[8px]">COD. {kind === 'A' ? '001' : kind === 'B' ? '006' : '011'}</div></div><div className="text-right"><div className="text-sm font-bold">FACTURA {kind}</div><div className="mt-1 text-[9px]">Punto de Venta: 0004</div><div className="text-[9px]">Comp. Nro: {number.split('-')[1]}</div><div className="text-[9px]">Fecha: {new Date().toLocaleDateString('es-AR')}</div></div></div><div className="grid grid-cols-2 gap-4 border-b border-zinc-400 py-4 text-[9px]"><div><b>Señor/a:</b> {order.customer}<br /><b>Vehículo:</b> {order.car}<br /><b>Patente:</b> {order.plate}</div><div><b>Condición frente al IVA:</b> Consumidor Final<br /><b>CUIT:</b> 20-12345678-9<br /><b>Orden de trabajo:</b> {order.id}</div></div><table className="my-4 w-full text-left text-[9px]"><thead><tr className="border-y border-black"><th className="py-2">Descripción</th><th className="py-2 text-right">Cantidad</th><th className="py-2 text-right">Precio unit.</th><th className="py-2 text-right">Subtotal</th></tr></thead><tbody><tr className="border-b border-zinc-300"><td className="py-3">{order.service}</td><td className="py-3 text-right">1</td><td className="py-3 text-right font-mono">{money(order.amount)}</td><td className="py-3 text-right font-mono">{money(order.amount)}</td></tr></tbody></table><div className="ml-auto w-56 space-y-1 text-right text-[9px]"><div>Neto gravado: <span className="font-mono">{money(base)}</span></div>{includeVat && <div>IVA 21%: <span className="font-mono">{money(order.amount - base)}</span></div>}<div className="mt-2 border-t border-black pt-2 text-sm font-bold">TOTAL: {money(order.amount)}</div></div><div className="mt-5 flex items-end justify-between border-t border-zinc-400 pt-4"><div className="text-[8px]"><div className="font-bold">CAE: {cae}</div><div>Vencimiento CAE: {expiry}</div><div className="mt-2 max-w-xs text-[7px]">Comprobante generado como demostración. La autorización fiscal debe emitirse mediante ARCA.</div></div><QRCodeSVG value={qrData} size={86} level="M" /></div></div></Modal>
}
