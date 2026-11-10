import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ArrowDownToLine, ArrowRight, CarFront, Check, CheckCircle2, ClipboardList, CreditCard, FileDown, FileJson2, LayoutDashboard, Menu, Plus, Search, ShieldAlert, Wallet, Wrench, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatDate, formatMoney, localDate, monthlyOrders, parseBackup, paymentMethods, StorageService } from './workshopModel'
import type { PaymentMethod, VehicleOrder, WorkshopData } from './workshopModel'

type Page = 'dashboard' | 'orders' | 'deliveries' | 'income'
type OrderDraft = Omit<VehicleOrder, 'id' | 'status' | 'paidDate' | 'legacyPaid' | 'price'> & { price: string }

const navigation: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'orders', label: 'Vehículos ingresados', icon: ClipboardList },
  { id: 'deliveries', label: 'A entregar', icon: CarFront },
  { id: 'income', label: 'Ingresos mensuales', icon: Wallet },
]

const inputClass = 'mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
const secondaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800'
const primaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-950/40 hover:bg-red-500'

function App() {
  const [loaded] = useState(() => {
    try { return { ...StorageService.load(), error: '' } }
    catch (error) {
      console.error('Error al cargar los datos:', error)
      return { data: { version: 1 as const, orders: [] }, migrated: false, error: 'No se pudieron leer los datos guardados. No se modificaron; importá un respaldo válido o revisá el almacenamiento del navegador.' }
    }
  })
  const [data, setData] = useState<WorkshopData>(loaded.data)
  const [page, setPage] = useState<Page>('dashboard')
  const [formOrder, setFormOrder] = useState<VehicleOrder | 'new' | null>(null)
  const [receipt, setReceipt] = useState<VehicleOrder | null>(null)
  const [delivery, setDelivery] = useState<VehicleOrder | null>(null)
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(localDate().slice(0, 7))
  const [message, setMessage] = useState('')
  const [error, setError] = useState(loaded.error)
  const [storageLocked, setStorageLocked] = useState(Boolean(loaded.error))
  const [mobileMenu, setMobileMenu] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const pending = useMemo(() => data.orders.filter((order) => order.status === 'pending'), [data.orders])
  const paidThisMonth = useMemo(() => monthlyOrders(data.orders, month), [data.orders, month])
  const totalMonth = paidThisMonth.reduce((sum, order) => sum + Math.max(0, order.price - order.legacyPaid), 0)

  const persist = (next: WorkshopData, success: string): boolean => {
    if (storageLocked) {
      setError('Los datos guardados no se pudieron leer. Importá un respaldo válido antes de registrar cambios.')
      return false
    }
    try {
      StorageService.save(next)
      setData(next)
      setError('')
      setMessage(success)
      return true
    } catch (saveError) {
      console.error('Error al guardar:', saveError)
      setError('No se pudieron guardar los cambios. Revisá el espacio disponible o importá un respaldo válido.')
      return false
    }
  }
  const saveOrder = (order: VehicleOrder) => {
    const exists = data.orders.some((item) => item.id === order.id)
    const orders = exists ? data.orders.map((item) => item.id === order.id ? order : item) : [order, ...data.orders]
    if (persist({ ...data, orders }, exists ? 'Vehículo actualizado correctamente.' : 'Vehículo ingresado correctamente.')) setFormOrder(null)
  }
  const confirmDelivery = (order: VehicleOrder) => {
    if (!order.paymentMethod || order.price <= 0) { setError('Para entregar, primero registrá un precio y un medio de pago.'); return }
    const updated: VehicleOrder = { ...order, status: 'delivered', paidDate: localDate() }
    if (persist({ ...data, orders: data.orders.map((item) => item.id === order.id ? updated : item) }, 'Entrega y pago registrados correctamente.')) setDelivery(null)
  }
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!window.confirm('Importar el respaldo reemplazará los datos actuales de Taller M-T-G. ¿Querés continuar?')) { event.target.value = ''; return }
    try {
      const backup = parseBackup(JSON.parse(await file.text()) as unknown)
      StorageService.save(backup)
      setData(backup)
      setStorageLocked(false)
      setError('')
      setMessage('Respaldo importado correctamente.')
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No se pudo leer el respaldo.')
    }
    event.target.value = ''
  }
  const downloadPdf = async (order: VehicleOrder) => {
    try {
      const { downloadReceipt } = await import('./workshopPdf')
      downloadReceipt(order)
      setMessage('Se descargó el comprobante en PDF.')
    } catch (downloadError) {
      console.error('Error al generar PDF:', downloadError)
      setError('No se pudo generar el PDF. Intentá nuevamente.')
    }
  }
  const filtered = data.orders.filter((order) => `${order.customer} ${order.dni} ${order.phone} ${order.brand} ${order.model} ${order.plate} ${order.repair}`.toLocaleLowerCase('es-AR').includes(query.toLocaleLowerCase('es-AR')))

  return <div className="min-h-screen bg-zinc-950 text-zinc-100">
    {mobileMenu && <button className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-[#0c0c0e] transition-transform lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600"><Wrench size={21} /></div><div><div className="text-lg font-bold tracking-tight">Taller <span className="text-red-500">M-T-G</span></div><div className="text-[10px] font-semibold tracking-widest text-zinc-400">GESTIÓN DE TALLER</div></div><button onClick={() => setMobileMenu(false)} className="ml-auto lg:hidden" aria-label="Cerrar menú"><X size={20} /></button></div>
      <div className="px-5 pb-2 pt-7 text-[10px] font-bold tracking-[.18em] text-zinc-400">MENÚ PRINCIPAL</div>
      <nav className="flex-1 space-y-1 px-3">{navigation.map((item) => <button key={item.id} onClick={() => { setPage(item.id); setMobileMenu(false); setQuery('') }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${page === item.id ? 'bg-red-600/15 font-semibold text-red-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}><item.icon size={18} />{item.label}{item.id === 'deliveries' && <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">{pending.length}</span>}</button>)}</nav>
      <div className="border-t border-zinc-800 p-4"><div className="mb-3 text-xs text-zinc-400">Tus datos se guardan en este navegador.</div><div className="flex gap-2"><button disabled={storageLocked} onClick={() => { try { StorageService.download(data) } catch (downloadError) { console.error(downloadError); setError('No se pudo descargar el respaldo.') } }} className={`${secondaryClass} flex-1 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-40`}><ArrowDownToLine size={14} /> Exportar</button><button onClick={() => fileInput.current?.click()} className={`${secondaryClass} flex-1 px-2 text-xs`}><FileJson2 size={14} /> Importar</button><input ref={fileInput} type="file" accept=".json,application/json" onChange={importFile} className="hidden" /></div></div>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileMenu(true)} className="lg:hidden" aria-label="Abrir menú"><Menu size={21} /></button><span className="text-sm text-zinc-400">Taller M-T-G <span className="mx-2 text-zinc-600">/</span> <span className="font-medium text-zinc-100">{navigation.find((item) => item.id === page)?.label}</span></span></div><span className="hidden text-xs capitalize text-zinc-400 sm:inline">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></header>
      <main className="mx-auto max-w-[1400px] px-5 py-8 md:px-8">
        {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200"><ShieldAlert size={18} className="shrink-0" /><span className="flex-1">{error}</span><button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={16} /></button></div>}
        {message && <div role="status" className="mb-5 flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-100"><CheckCircle2 size={18} className="text-emerald-400" /><span className="flex-1">{message}</span><button onClick={() => setMessage('')} aria-label="Cerrar aviso"><X size={16} /></button></div>}
        {loaded.migrated && data.orders.some((order) => !order.enteredBy) && <div className="mb-5 rounded-xl border border-amber-800/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200">Se recuperaron órdenes guardadas en la versión anterior. Revisá sus datos faltantes; los cobros sin fecha no se suman a ningún mes. Los datos originales permanecen en este navegador.</div>}
        {page === 'dashboard' && <Dashboard orders={data.orders} pending={pending} setPage={setPage} openNew={() => setFormOrder('new')} onReceipt={setReceipt} onEdit={setFormOrder} onDeliver={setDelivery} />}
        {page === 'orders' && <><PageHeader eyebrow="REGISTRO DE REPARACIONES" title="Vehículos ingresados" description="Consultá los trabajos registrados y descargá sus comprobantes." action={<button onClick={() => setFormOrder('new')} className={primaryClass}><Plus size={17} /> Cargar vehículo</button>} /><SearchBox value={query} onChange={setQuery} /><OrderList orders={filtered} onEdit={setFormOrder} onReceipt={setReceipt} onDeliver={setDelivery} empty="Todavía no hay vehículos registrados." /></>}
        {page === 'deliveries' && <><PageHeader eyebrow="SEGUIMIENTO DE REPARACIONES" title="A entregar" description="Vehículos ingresados que aún están pendientes de entrega y pago." action={<button onClick={() => setFormOrder('new')} className={primaryClass}><Plus size={17} /> Cargar vehículo</button>} /><SearchBox value={query} onChange={setQuery} /><OrderList orders={filtered.filter((order) => order.status === 'pending')} onEdit={setFormOrder} onReceipt={setReceipt} onDeliver={setDelivery} empty="No hay vehículos pendientes de entrega." /></>}
        {page === 'income' && <><PageHeader eyebrow="CONTROL DE COBRANZAS" title="Ingresos mensuales" description="Se suman los vehículos entregados y cobrados en el mes seleccionado." action={<label className="flex items-center gap-3 text-sm text-zinc-300">Mes <input aria-label="Mes de ingresos" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>} /><div className="mb-6 grid gap-4 sm:grid-cols-3"><Stat icon={Wallet} label="Total cobrado" value={formatMoney(totalMonth)} note="Según fecha de entrega y pago" /><Stat icon={CheckCircle2} label="Vehículos entregados" value={String(paidThisMonth.length)} note="Cobros del mes seleccionado" /><Stat icon={CreditCard} label="Promedio por vehículo" value={formatMoney(paidThisMonth.length ? totalMonth / paidThisMonth.length : 0)} note="Total cobrado / vehículos" /></div><OrderList orders={paidThisMonth} onEdit={setFormOrder} onReceipt={setReceipt} onDeliver={setDelivery} empty="No hay cobros registrados en este mes." showPaidDate />{data.orders.some((order) => order.status === 'delivered' && !order.paidDate) && <p className="mt-4 text-sm text-amber-300">Hay entregas antiguas sin fecha de cobro; no se incluyen en el total mensual.</p>}</>}
      </main>
    </div>
    {formOrder && <OrderForm existing={formOrder === 'new' ? null : formOrder} onClose={() => setFormOrder(null)} onSave={saveOrder} />}
    {delivery && <Modal title="Confirmar entrega y pago" onClose={() => setDelivery(null)}><p className="text-sm leading-6 text-zinc-300">Al confirmar, <strong>{delivery.customer}</strong> retiró su <strong>{delivery.brand} {delivery.model}</strong> y abonó el trabajo. El cobro se registrará con la fecha de hoy.</p><div className="mt-5 space-y-2 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm"><InfoRow label="Total del trabajo" value={formatMoney(delivery.price)} />{delivery.legacyPaid > 0 && <><InfoRow label="Pago previo sin fecha" value={formatMoney(delivery.legacyPaid)} /><InfoRow label="A cobrar hoy" value={formatMoney(Math.max(0, delivery.price - delivery.legacyPaid))} /></>}<InfoRow label="Medio de pago" value={delivery.paymentMethod || 'Sin registrar'} /><InfoRow label="Fecha de cobro" value={formatDate(localDate())} /></div>{(!delivery.paymentMethod || delivery.price <= 0) && <p className="mt-3 text-sm text-red-300">Editá el vehículo para indicar precio y medio de pago antes de continuar.</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setDelivery(null)} className={secondaryClass}>Cancelar</button><button onClick={() => confirmDelivery(delivery)} disabled={!delivery.paymentMethod || delivery.price <= 0} className={`${primaryClass} disabled:cursor-not-allowed disabled:opacity-40`}><Check size={16} /> Confirmar entrega y pago</button></div></Modal>}
    {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} onDownload={() => void downloadPdf(receipt)} />}
  </div>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold tracking-[.18em] text-red-400">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h1><p className="mt-2 text-sm text-zinc-400">{description}</p></div>{action}</div>
}
function Stat({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex items-start justify-between"><span className="text-sm text-zinc-400">{label}</span><Icon size={19} className="text-red-400" /></div><div className="mt-4 font-mono text-2xl font-bold tabular-nums text-white">{value}</div><div className="mt-1 text-xs text-zinc-400">{note}</div></div>
}
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="mb-5 flex max-w-lg items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3"><Search size={17} className="text-zinc-400" /><span className="sr-only">Buscar vehículo o cliente</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar cliente, DNI, vehículo o patente..." className="w-full bg-transparent py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500" /></label>
}
function Dashboard({ orders, pending, setPage, openNew, onEdit, onReceipt, onDeliver }: { orders: VehicleOrder[]; pending: VehicleOrder[]; setPage: (page: Page) => void; openNew: () => void; onEdit: (order: VehicleOrder) => void; onReceipt: (order: VehicleOrder) => void; onDeliver: (order: VehicleOrder) => void }) {
  const currentMonth = localDate().slice(0, 7)
  const paid = monthlyOrders(orders, currentMonth)
  const total = paid.reduce((sum, item) => sum + Math.max(0, item.price - item.legacyPaid), 0)
  return <><PageHeader eyebrow="PANEL DEL TALLER" title="Todo tu taller, en un solo lugar." description="Gestioná los ingresos, las entregas y lo que cobraste este mes." action={<button onClick={openNew} className={primaryClass}><Plus size={17} /> Cargar vehículo</button>} /><div className="mb-7 grid gap-4 sm:grid-cols-3"><Stat icon={CarFront} label="Vehículos a entregar" value={String(pending.length)} note="Reparaciones pendientes" /><Stat icon={CheckCircle2} label="Entregados este mes" value={String(paid.length)} note="Vehículos con pago confirmado" /><Stat icon={Wallet} label="Cobrado este mes" value={formatMoney(total)} note="Según fecha de entrega y pago" /></div><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Próximas entregas</h2><p className="mt-1 text-sm text-zinc-400">Vehículos pendientes, ordenados por fecha estimada.</p></div><button onClick={() => setPage('deliveries')} className="flex items-center gap-1 text-sm font-semibold text-red-400 hover:text-red-300">Ver todos <ArrowRight size={15} /></button></div><OrderList orders={[...pending].sort((a, b) => (a.expectedDate || '9999').localeCompare(b.expectedDate || '9999')).slice(0, 5)} onEdit={onEdit} onReceipt={onReceipt} onDeliver={onDeliver} empty="Todavía no hay vehículos a entregar. Cargá el primero para comenzar." /></>
}
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-zinc-400">{label}</span><span className="text-right font-medium">{value}</span></div> }
function OrderList({ orders, onEdit, onReceipt, onDeliver, empty, showPaidDate = false }: { orders: VehicleOrder[]; onEdit: (order: VehicleOrder) => void; onReceipt: (order: VehicleOrder) => void; onDeliver: (order: VehicleOrder) => void; empty: string; showPaidDate?: boolean }) {
  if (!orders.length) return <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-5 py-14 text-center"><CarFront size={28} className="mx-auto text-zinc-500" /><p className="mt-3 text-sm text-zinc-400">{empty}</p></div>
  return <div className="grid gap-3">{orders.map((order) => <article key={order.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h3 className="text-base font-semibold">{order.brand} {order.model}</h3>{order.plate && <span className="font-mono text-xs uppercase text-zinc-400">{order.plate}</span>}<span className={`text-xs font-semibold ${order.status === 'delivered' ? 'text-emerald-400' : 'text-amber-300'}`}>{order.status === 'delivered' ? 'Entregado y pagado' : 'Pendiente de entrega'}</span></div><div className="mt-2 text-sm text-zinc-300">{order.customer} <span className="text-zinc-500">·</span> {order.phone || 'Sin teléfono'}</div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{order.repair}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400"><span>Ingreso: {formatDate(order.entryDate)}</span><span>{showPaidDate ? 'Cobrado' : 'Entrega estimada'}: {formatDate(showPaidDate ? order.paidDate : order.expectedDate || null)}</span><span>Pago: {order.paymentMethod || 'Sin registrar'}</span></div></div><div className="text-left sm:text-right"><div className="font-mono text-lg font-bold tabular-nums">{formatMoney(order.price)}</div>{showPaidDate && order.legacyPaid > 0 && <div className="mt-1 text-xs text-zinc-400">Cobrado en esta entrega: {formatMoney(Math.max(0, order.price - order.legacyPaid))}</div>}<div className="mt-3 flex flex-wrap gap-2 sm:justify-end"><button onClick={() => onReceipt(order)} className={`${secondaryClass} px-3 py-2 text-xs`}><FileDown size={14} /> Comprobante</button>{order.status === 'pending' && <><button onClick={() => onEdit(order)} className={`${secondaryClass} px-3 py-2 text-xs`}>Editar</button><button onClick={() => onDeliver(order)} className={`${primaryClass} px-3 py-2 text-xs`}><Check size={14} /> Entregado</button></>}</div></div></div></article>)}</div>
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-4"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-zinc-400 hover:text-white"><X size={20} /></button></div><div className="p-5 md:p-6">{children}</div></section></div>
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium text-zinc-300">{label}{children}</label> }
function OrderForm({ existing, onClose, onSave }: { existing: VehicleOrder | null; onClose: () => void; onSave: (order: VehicleOrder) => void }) {
  const [draft, setDraft] = useState<OrderDraft>(() => existing ? { ...existing, price: String(existing.price) } : { enteredBy: '', customer: '', dni: '', phone: '', brand: '', model: '', plate: '', repair: '', entryDate: localDate(), expectedDate: localDate(), price: '', paymentMethod: '' })
  const [error, setError] = useState('')
  const update = (patch: Partial<OrderDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.enteredBy.trim() || !draft.customer.trim() || !draft.dni.trim() || !draft.phone.trim() || !draft.brand.trim() || !draft.model.trim() || !draft.repair.trim()) { setError('Completá todos los campos obligatorios.'); return }
    if (draft.expectedDate < draft.entryDate) { setError('La fecha de entrega no puede ser anterior a la fecha de ingreso.'); return }
    const price = Number(draft.price)
    if (!Number.isFinite(price) || price <= 0 || !draft.paymentMethod) { setError('Ingresá un precio mayor a cero y seleccioná un medio de pago.'); return }
    if (existing && price < existing.legacyPaid) { setError('El precio no puede ser menor al pago previo registrado.'); return }
    const id = existing?.id ?? `MTG-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`
    onSave({ ...draft, enteredBy: draft.enteredBy.trim(), customer: draft.customer.trim(), dni: draft.dni.trim(), phone: draft.phone.trim(), brand: draft.brand.trim(), model: draft.model.trim(), repair: draft.repair.trim(), plate: draft.plate.trim().toUpperCase(), price, id, status: existing?.status ?? 'pending', paidDate: existing?.paidDate ?? null, legacyPaid: existing?.legacyPaid ?? 0 })
  }
  return <Modal title={existing ? 'Editar vehículo' : 'Cargar vehículo'} onClose={onClose} wide><form onSubmit={submit} className="space-y-7">
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">01</span><h3 className="text-sm font-bold uppercase tracking-wider">Persona que carga</h3></div><Field label="Nombre y apellido del dueño o empleado *"><input className={inputClass} value={draft.enteredBy} onChange={(e) => update({ enteredBy: e.target.value })} placeholder="Nombre y apellido" required /></Field></section>
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">02</span><h3 className="text-sm font-bold uppercase tracking-wider">Datos del cliente</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre y apellido *"><input className={inputClass} value={draft.customer} onChange={(e) => update({ customer: e.target.value })} required /></Field><Field label="DNI *"><input className={inputClass} inputMode="numeric" value={draft.dni} onChange={(e) => update({ dni: e.target.value })} required /></Field><Field label="Número de teléfono *"><input className={inputClass} type="tel" value={draft.phone} onChange={(e) => update({ phone: e.target.value })} required /></Field></div></section>
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">03</span><h3 className="text-sm font-bold uppercase tracking-wider">Datos del vehículo</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Marca *"><input className={inputClass} value={draft.brand} onChange={(e) => update({ brand: e.target.value })} placeholder="Ej. Volkswagen" required /></Field><Field label="Modelo *"><input className={inputClass} value={draft.model} onChange={(e) => update({ model: e.target.value })} placeholder="Ej. Gol" required /></Field><Field label="Patente (opcional)"><input className={`${inputClass} font-mono uppercase`} value={draft.plate} onChange={(e) => update({ plate: e.target.value })} placeholder="AF 123 XY" /></Field><div className="sm:col-span-2"><Field label="¿Qué tiene el auto? / A reparar *"><textarea className={`${inputClass} min-h-28 resize-y`} value={draft.repair} onChange={(e) => update({ repair: e.target.value })} placeholder="Describí el problema o trabajo a realizar..." required /></Field></div><Field label="Fecha de ingreso *"><input className={inputClass} type="date" value={draft.entryDate} onChange={(e) => update({ entryDate: e.target.value })} required /></Field><Field label="Fecha estimada de entrega *"><input className={inputClass} type="date" value={draft.expectedDate} min={draft.entryDate} onChange={(e) => update({ expectedDate: e.target.value })} required /></Field></div></section>
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">04</span><h3 className="text-sm font-bold uppercase tracking-wider">Precio y medio de pago</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Precio total del trabajo (ARS) *"><input className={`${inputClass} font-mono`} type="number" min="0.01" step="0.01" value={draft.price} onChange={(e) => update({ price: e.target.value })} placeholder="0,00" required /></Field><Field label="Medio de pago *"><select className={inputClass} value={draft.paymentMethod} onChange={(e) => update({ paymentMethod: e.target.value as PaymentMethod | '' })} required><option value="">Seleccionar medio</option>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field></div><p className="mt-3 text-xs leading-5 text-zinc-400">El cobro se registra al confirmar la entrega, no al cargar el vehículo.</p></section>
    {error && <div role="alert" className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}<div className="flex justify-end gap-2 border-t border-zinc-800 pt-5"><button type="button" onClick={onClose} className={secondaryClass}>Cancelar</button><button type="submit" className={primaryClass}><Check size={16} /> {existing ? 'Guardar cambios' : 'Guardar vehículo'}</button></div>
  </form></Modal>
}
function ReceiptModal({ order, onClose, onDownload }: { order: VehicleOrder; onClose: () => void; onDownload: () => void }) {
  return <Modal title="Comprobante del trabajo" onClose={onClose}><div className="rounded-lg bg-white p-5 text-zinc-900"><div className="border-b border-zinc-300 pb-4"><h3 className="text-xl font-bold">Taller M-T-G</h3><div className="mt-1 text-sm font-semibold">{order.status === 'delivered' ? 'Comprobante de trabajo y pago' : 'Presupuesto de reparación'}</div><p className="mt-1 text-xs text-zinc-600">Documento no fiscal. No reemplaza una factura autorizada por ARCA.</p></div><div className="space-y-2 py-4 text-sm"><InfoRow label="Orden" value={order.id} /><InfoRow label="Cargado por" value={order.enteredBy || 'Sin registrar'} /><InfoRow label="Cliente" value={order.customer} /><InfoRow label="DNI" value={order.dni || 'Sin registrar'} /><InfoRow label="Teléfono" value={order.phone || 'Sin registrar'} /><InfoRow label="Vehículo" value={[order.brand, order.model, order.plate].filter(Boolean).join(' · ')} /><InfoRow label="Ingreso" value={formatDate(order.entryDate)} /><InfoRow label="Entrega estimada" value={formatDate(order.expectedDate || null)} /><InfoRow label="Medio de pago" value={order.paymentMethod || 'Sin registrar'} /><InfoRow label="Estado" value={order.status === 'delivered' ? 'Entregado y pagado' : 'Pendiente'} /></div><div className="border-y border-zinc-300 py-3 text-sm"><span className="font-semibold">Trabajo:</span><p className="mt-1 whitespace-pre-wrap">{order.repair}</p></div><div className="mt-4 flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono">{formatMoney(order.price)}</span></div></div><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className={secondaryClass}>Cerrar</button><button onClick={onDownload} className={primaryClass}><FileDown size={16} /> Descargar PDF</button></div></Modal>
}

export default App
