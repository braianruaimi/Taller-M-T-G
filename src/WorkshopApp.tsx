import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ArrowDownToLine, ArrowRight, CarFront, Check, CheckCircle2, ClipboardList, CreditCard, FileDown, FileJson2, LayoutDashboard, Menu, Plus, Search, ShieldAlert, Wallet, Wrench, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { balance, formatDate, formatMoney, getPayments, localDate, monthlyOrders, normalizePlate, orderPayments, paidTotal, parseBackup, paymentMethods, repairStages, roundMoney, StorageService } from './workshopModel'
import type { Payment, PaymentMethod, RepairStage, VehicleOrder, WorkshopData } from './workshopModel'
import { createReceipt, downloadReceipt } from './workshopPdf'

type Page = 'dashboard' | 'orders' | 'deliveries' | 'income'
type OrderDraft = Omit<VehicleOrder, 'id' | 'status' | 'paidDate' | 'legacyPaid' | 'price' | 'payments' | 'repairStage'> & { price: string }

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
  const [paymentOrder, setPaymentOrder] = useState<VehicleOrder | null>(null)
  const [historyOrder, setHistoryOrder] = useState<VehicleOrder | null>(null)
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(localDate().slice(0, 7))
  const [message, setMessage] = useState('')
  const [error, setError] = useState(loaded.error)
  const [storageLocked, setStorageLocked] = useState(Boolean(loaded.error))
  const [mobileMenu, setMobileMenu] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const pending = useMemo(() => data.orders.filter((order) => order.status === 'pending'), [data.orders])
  const paidThisMonth = useMemo(() => monthlyOrders(data.orders, month), [data.orders, month])
  const totalMonth = orderPayments(data.orders).filter(({ payment }) => payment.date.startsWith(`${month}-`)).reduce((sum, { payment }) => sum + payment.amount, 0)

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
    if (order.price <= 0 || balance(order) > 0) { setError('Registrá el saldo pendiente antes de confirmar la entrega.'); return }
    const updated: VehicleOrder = { ...order, status: 'delivered', paidDate: localDate(), payments: getPayments(order) }
    if (persist({ ...data, orders: data.orders.map((item) => item.id === order.id ? updated : item) }, 'Entrega registrada correctamente.')) setDelivery(null)
  }
  const changeRepairStage = (order: VehicleOrder, repairStage: RepairStage) => {
    persist({ ...data, orders: data.orders.map((item) => item.id === order.id ? { ...item, repairStage } : item) }, `Estado actualizado: ${repairStages.find((stage) => stage.value === repairStage)?.label}.`)
  }
  const addPayment = (order: VehicleOrder, payment: Payment) => {
    if (payment.amount <= 0 || payment.amount > balance(order)) { setError('El pago debe ser mayor a cero y no superar el saldo pendiente.'); return }
    const updated = { ...order, payments: [...getPayments(order), payment] }
    if (persist({ ...data, orders: data.orders.map((item) => item.id === order.id ? updated : item) }, 'Pago registrado correctamente.')) setPaymentOrder(null)
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
      downloadReceipt(order)
      setMessage('Se descargó el comprobante en PDF.')
    } catch (downloadError) {
      console.error('Error al generar PDF:', downloadError)
      setError('No se pudo generar el PDF. Intentá nuevamente.')
    }
  }
    const sharePdf = async (order: VehicleOrder) => {
      try {
        const file = new File([createReceipt(order).output('blob')], `Taller-MTG-${order.id}.pdf`, { type: 'application/pdf' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Comprobante Taller M-T-G', text: 'Comprobante de reparación de Taller M-T-G' })
        } else {
          await downloadPdf(order)
          setMessage('PDF descargado. Abrí WhatsApp y adjuntalo manualmente al chat del cliente.')
        }
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') return
        console.error('Error al compartir PDF:', shareError)
        setError('No se pudo compartir el PDF. Probá descargarlo y adjuntarlo en WhatsApp.')
      }
    }
    const whatsapp = (order: VehicleOrder, kind: 'quote' | 'ready') => {
      if (kind === 'ready' && order.repairStage !== 'listo') {
        setError('Cambiá el estado a Listo antes de avisar al cliente.')
        return
      }
      const phone = order.phone.replace(/\D/g, '')
      if (!phone.startsWith('54') || phone.length < 12 || phone.length > 15) {
        setError('Para WhatsApp guardá el teléfono con código internacional, por ejemplo 54911XXXXXXXX.')
        return
      }
      const text = kind === 'quote'
        ? `Hola ${order.customer}, te enviamos el presupuesto de Taller M-T-G para tu ${order.brand} ${order.model}${order.plate ? ` (${order.plate})` : ''}.\nTrabajo: ${order.repair}\nTotal: ${formatMoney(order.price)}\nAbonado: ${formatMoney(paidTotal(order))}\nSaldo: ${formatMoney(balance(order))}.`
        : `Hola ${order.customer}, tu ${order.brand} ${order.model}${order.plate ? ` (${order.plate})` : ''} está listo para retirar en Taller M-T-G. Saldo pendiente: ${formatMoney(balance(order))}. ¡Te esperamos!`
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
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
        {page === 'dashboard' && <Dashboard orders={data.orders} pending={pending} setPage={setPage} openNew={() => setFormOrder('new')} onReceipt={setReceipt} onEdit={setFormOrder} onDeliver={setDelivery} onPayment={setPaymentOrder} onHistory={setHistoryOrder} onStage={changeRepairStage} onWhatsapp={whatsapp} />}
        {page === 'orders' && <><PageHeader eyebrow="REGISTRO DE REPARACIONES" title="Vehículos ingresados" description="Consultá los trabajos registrados y descargá sus comprobantes." action={<button onClick={() => setFormOrder('new')} className={primaryClass}><Plus size={17} /> Cargar vehículo</button>} /><SearchBox value={query} onChange={setQuery} /><OrderList orders={filtered} onEdit={setFormOrder} onReceipt={setReceipt} onDeliver={setDelivery} onPayment={setPaymentOrder} onHistory={setHistoryOrder} onStage={changeRepairStage} onWhatsapp={whatsapp} empty="Todavía no hay vehículos registrados." /></>}
        {page === 'deliveries' && <><PageHeader eyebrow="SEGUIMIENTO DE REPARACIONES" title="A entregar" description="Vehículos ingresados que aún están pendientes de entrega y pago." action={<button onClick={() => setFormOrder('new')} className={primaryClass}><Plus size={17} /> Cargar vehículo</button>} /><SearchBox value={query} onChange={setQuery} /><OrderList orders={filtered.filter((order) => order.status === 'pending')} onEdit={setFormOrder} onReceipt={setReceipt} onDeliver={setDelivery} onPayment={setPaymentOrder} onHistory={setHistoryOrder} onStage={changeRepairStage} onWhatsapp={whatsapp} empty="No hay vehículos pendientes de entrega." /></>}
        {page === 'income' && <IncomePage orders={data.orders} month={month} setMonth={setMonth} totalMonth={totalMonth} paidThisMonth={paidThisMonth.length} />}
      </main>
    </div>
    {formOrder && <OrderForm orders={data.orders} existing={formOrder === 'new' ? null : formOrder} onClose={() => setFormOrder(null)} onSave={saveOrder} />}
    {delivery && <Modal title="Confirmar entrega" onClose={() => setDelivery(null)}><p className="text-sm leading-6 text-zinc-300">Confirmá que {delivery.customer} retiró su vehículo y que el trabajo está totalmente pagado.</p><div className="mt-5 space-y-2 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm"><InfoRow label="Total" value={formatMoney(delivery.price)} /><InfoRow label="Abonado" value={formatMoney(paidTotal(delivery))} /><InfoRow label="Saldo pendiente" value={formatMoney(balance(delivery))} /></div>{balance(delivery) > 0 && <p className="mt-3 text-sm text-red-300">Registrá el saldo pendiente antes de confirmar la entrega.</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setDelivery(null)} className={secondaryClass}>Cancelar</button><button onClick={() => confirmDelivery(delivery)} disabled={balance(delivery) > 0 || delivery.price <= 0} className={`${primaryClass} disabled:opacity-40`}><Check size={16} /> Confirmar entrega</button></div></Modal>}
    {paymentOrder && <PaymentModal order={paymentOrder} onClose={() => setPaymentOrder(null)} onSave={(payment) => addPayment(paymentOrder, payment)} />}
    {historyOrder && <HistoryModal order={historyOrder} orders={data.orders} onClose={() => setHistoryOrder(null)} />}
    {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} onDownload={() => void downloadPdf(receipt)} onShare={() => void sharePdf(receipt)} />}
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
type OrderActions = { onEdit: (order: VehicleOrder) => void; onReceipt: (order: VehicleOrder) => void; onDeliver: (order: VehicleOrder) => void; onPayment: (order: VehicleOrder) => void; onHistory: (order: VehicleOrder) => void; onStage: (order: VehicleOrder, stage: RepairStage) => void; onWhatsapp: (order: VehicleOrder, kind: 'quote' | 'ready') => void }
function Dashboard({ orders, pending, setPage, openNew, ...actions }: { orders: VehicleOrder[]; pending: VehicleOrder[]; setPage: (page: Page) => void; openNew: () => void } & OrderActions) {
  const currentMonth = localDate().slice(0, 7)
  const paid = monthlyOrders(orders, currentMonth)
  const total = orderPayments(orders).filter(({ payment }) => payment.date.startsWith(`${currentMonth}-`)).reduce((sum, { payment }) => sum + payment.amount, 0)
  return <><PageHeader eyebrow="PANEL DEL TALLER" title="Todo tu taller, en un solo lugar." description="Gestioná los ingresos, las entregas y lo que cobraste este mes." action={<button onClick={openNew} className={primaryClass}><Plus size={17} /> Cargar vehículo</button>} /><div className="mb-7 grid gap-4 sm:grid-cols-3"><Stat icon={CarFront} label="Vehículos a entregar" value={String(pending.length)} note="Reparaciones pendientes" /><Stat icon={CheckCircle2} label="Entregados este mes" value={String(paid.length)} note="Vehículos con pago confirmado" /><Stat icon={Wallet} label="Cobrado este mes" value={formatMoney(total)} note="Incluye pagos parciales" /></div><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Próximas entregas</h2><p className="mt-1 text-sm text-zinc-400">Vehículos pendientes, ordenados por fecha estimada.</p></div><button onClick={() => setPage('deliveries')} className="flex items-center gap-1 text-sm font-semibold text-red-400 hover:text-red-300">Ver todos <ArrowRight size={15} /></button></div><OrderList orders={[...pending].sort((a, b) => (a.expectedDate || '9999').localeCompare(b.expectedDate || '9999')).slice(0, 5)} {...actions} empty="Todavía no hay vehículos a entregar. Cargá el primero para comenzar." /></>
}
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-zinc-400">{label}</span><span className="text-right font-medium">{value}</span></div> }
function OrderList({ orders, onEdit, onReceipt, onDeliver, onPayment, onHistory, onStage, onWhatsapp, empty }: { orders: VehicleOrder[]; empty: string } & OrderActions) {
  if (!orders.length) return <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-5 py-14 text-center"><CarFront size={28} className="mx-auto text-zinc-500" /><p className="mt-3 text-sm text-zinc-400">{empty}</p></div>
  return <div className="grid gap-3">{orders.map((order) => <article key={order.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h3 className="text-base font-semibold">{order.brand} {order.model}</h3>{order.plate && <span className="font-mono text-xs uppercase text-zinc-400">{order.plate}</span>}<span className="text-xs font-semibold text-amber-300">{order.status === 'delivered' ? 'Entregado y pagado' : repairStages.find((stage) => stage.value === (order.repairStage ?? 'ingresado'))?.label}</span></div><div className="mt-2 text-sm text-zinc-300">{order.customer} · {order.phone || 'Sin teléfono'}</div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{order.repair}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400"><span>Ingreso: {formatDate(order.entryDate)}</span><span>Entrega estimada: {formatDate(order.expectedDate || null)}</span></div>{order.status === 'pending' && <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-400">Estado <select aria-label={`Estado de ${order.customer}`} value={order.repairStage ?? 'ingresado'} onChange={(event) => onStage(order, event.target.value as RepairStage)} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100">{repairStages.map((stage) => <option value={stage.value} key={stage.value}>{stage.label}</option>)}</select></label>}</div><div className="text-left sm:text-right"><div className="font-mono text-lg font-bold tabular-nums">{formatMoney(order.price)}</div><div className="mt-1 text-xs text-zinc-400">Abonado: {formatMoney(paidTotal(order))} · Saldo: {formatMoney(balance(order))}</div><div className="mt-3 flex flex-wrap gap-2 sm:justify-end"><button onClick={() => onHistory(order)} className={`${secondaryClass} px-3 py-2 text-xs`}>Historial</button><button onClick={() => onReceipt(order)} className={`${secondaryClass} px-3 py-2 text-xs`}><FileDown size={14} /> Comprobante</button><button onClick={() => onWhatsapp(order, 'quote')} className={`${secondaryClass} px-3 py-2 text-xs`}>WhatsApp presupuesto</button>{order.status === 'pending' && <><button onClick={() => onWhatsapp(order, 'ready')} className={`${secondaryClass} px-3 py-2 text-xs`}>Avisar listo</button><button onClick={() => onEdit(order)} className={`${secondaryClass} px-3 py-2 text-xs`}>Editar</button>{balance(order) > 0 && <button onClick={() => onPayment(order)} className={`${secondaryClass} px-3 py-2 text-xs`}>Registrar pago</button>}<button onClick={() => onDeliver(order)} className={`${primaryClass} px-3 py-2 text-xs`}><Check size={14} /> Entregado</button></>}</div></div></div></article>)}</div>
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-4"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-zinc-400 hover:text-white"><X size={20} /></button></div><div className="p-5 md:p-6">{children}</div></section></div>
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium text-zinc-300">{label}{children}</label> }
function OrderForm({ existing, orders, onClose, onSave }: { existing: VehicleOrder | null; orders: VehicleOrder[]; onClose: () => void; onSave: (order: VehicleOrder) => void }) {
  const [draft, setDraft] = useState<OrderDraft>(() => existing ? { ...existing, price: String(existing.price) } : { enteredBy: '', customer: '', dni: '', phone: '', brand: '', model: '', plate: '', repair: '', entryDate: localDate(), expectedDate: localDate(), price: '', paymentMethod: '' })
  const [error, setError] = useState('')
  const update = (patch: Partial<OrderDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const previous = !existing && normalizePlate(draft.plate).length >= 6 ? [...orders].sort((a, b) => b.entryDate.localeCompare(a.entryDate)).find((order) => normalizePlate(order.plate) === normalizePlate(draft.plate)) : undefined
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.enteredBy.trim() || !draft.customer.trim() || !draft.dni.trim() || !draft.phone.trim() || !draft.brand.trim() || !draft.model.trim() || !draft.repair.trim()) { setError('Completá todos los campos obligatorios.'); return }
    if (draft.expectedDate < draft.entryDate) { setError('La fecha de entrega no puede ser anterior a la fecha de ingreso.'); return }
    const price = Number(draft.price)
    if (!Number.isFinite(price) || price <= 0 || !draft.paymentMethod) { setError('Ingresá un precio mayor a cero y seleccioná un medio de pago.'); return }
    if (existing && price < paidTotal(existing)) { setError('El precio no puede ser menor al total abonado.'); return }
    const id = existing?.id ?? `MTG-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`
    onSave({ ...draft, enteredBy: draft.enteredBy.trim(), customer: draft.customer.trim(), dni: draft.dni.trim(), phone: draft.phone.trim(), brand: draft.brand.trim(), model: draft.model.trim(), repair: draft.repair.trim(), plate: draft.plate.trim().toUpperCase(), price, id, status: existing?.status ?? 'pending', paidDate: existing?.paidDate ?? null, legacyPaid: existing?.legacyPaid ?? 0, repairStage: existing?.repairStage ?? 'ingresado', payments: existing ? getPayments(existing) : [] })
  }
  return <Modal title={existing ? 'Editar vehículo' : 'Cargar vehículo'} onClose={onClose} wide><form onSubmit={submit} className="space-y-7">
    {!existing && <div><Field label="Buscar visita anterior por patente"><input className={`${inputClass} font-mono uppercase`} value={draft.plate} onChange={(e) => update({ plate: e.target.value })} placeholder="AF 123 XY" /></Field>{previous && <div className="mt-2 rounded-lg border border-zinc-700 p-3 text-sm text-zinc-300">Visita encontrada: {previous.customer} · {previous.brand} {previous.model} <button type="button" className="ml-2 text-red-400 underline" onClick={() => update({ customer: previous.customer, dni: previous.dni, phone: previous.phone, brand: previous.brand, model: previous.model })}>Usar datos</button></div>}</div>}
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">01</span><h3 className="text-sm font-bold uppercase tracking-wider">Persona que carga</h3></div><Field label="Nombre y apellido del dueño o empleado *"><input className={inputClass} value={draft.enteredBy} onChange={(e) => update({ enteredBy: e.target.value })} placeholder="Nombre y apellido" required /></Field></section>
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">02</span><h3 className="text-sm font-bold uppercase tracking-wider">Datos del cliente</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre y apellido *"><input className={inputClass} value={draft.customer} onChange={(e) => update({ customer: e.target.value })} required /></Field><Field label="DNI *"><input className={inputClass} inputMode="numeric" value={draft.dni} onChange={(e) => update({ dni: e.target.value })} required /></Field><Field label="Número de teléfono *"><input className={inputClass} type="tel" value={draft.phone} onChange={(e) => update({ phone: e.target.value })} required /></Field></div></section>
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">03</span><h3 className="text-sm font-bold uppercase tracking-wider">Datos del vehículo</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Marca *"><input className={inputClass} value={draft.brand} onChange={(e) => update({ brand: e.target.value })} placeholder="Ej. Volkswagen" required /></Field><Field label="Modelo *"><input className={inputClass} value={draft.model} onChange={(e) => update({ model: e.target.value })} placeholder="Ej. Gol" required /></Field><Field label="Patente (opcional)"><input className={`${inputClass} font-mono uppercase`} value={draft.plate} onChange={(e) => update({ plate: e.target.value })} placeholder="AF 123 XY" /></Field><div className="sm:col-span-2"><Field label="¿Qué tiene el auto? / A reparar *"><textarea className={`${inputClass} min-h-28 resize-y`} value={draft.repair} onChange={(e) => update({ repair: e.target.value })} placeholder="Describí el problema o trabajo a realizar..." required /></Field></div><Field label="Fecha de ingreso *"><input className={inputClass} type="date" value={draft.entryDate} onChange={(e) => update({ entryDate: e.target.value })} required /></Field><Field label="Fecha estimada de entrega *"><input className={inputClass} type="date" value={draft.expectedDate} min={draft.entryDate} onChange={(e) => update({ expectedDate: e.target.value })} required /></Field></div></section>
    <section><div className="mb-4 flex items-center gap-2"><span className="font-mono text-xs text-red-400">04</span><h3 className="text-sm font-bold uppercase tracking-wider">Precio y medio de pago</h3></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Precio total del trabajo (ARS) *"><input className={`${inputClass} font-mono`} type="number" min="0.01" step="0.01" value={draft.price} onChange={(e) => update({ price: e.target.value })} placeholder="0,00" required /></Field><Field label="Medio de pago *"><select className={inputClass} value={draft.paymentMethod} onChange={(e) => update({ paymentMethod: e.target.value as PaymentMethod | '' })} required><option value="">Seleccionar medio</option>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field></div><p className="mt-3 text-xs leading-5 text-zinc-400">Las señas y pagos se registran después de guardar el vehículo.</p></section>
    {error && <div role="alert" className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}<div className="flex justify-end gap-2 border-t border-zinc-800 pt-5"><button type="button" onClick={onClose} className={secondaryClass}>Cancelar</button><button type="submit" className={primaryClass}><Check size={16} /> {existing ? 'Guardar cambios' : 'Guardar vehículo'}</button></div>
  </form></Modal>
}
function ReceiptModal({ order, onClose, onDownload, onShare }: { order: VehicleOrder; onClose: () => void; onDownload: () => void; onShare: () => void }) {
  return <Modal title="Comprobante del trabajo" onClose={onClose}><div className="rounded-lg bg-white p-5 text-zinc-900"><h3 className="text-xl font-bold">Taller M-T-G</h3><p className="mt-1 text-xs text-zinc-600">Documento no fiscal. No reemplaza una factura autorizada por ARCA.</p><div className="space-y-2 py-4 text-sm"><InfoRow label="Cliente" value={order.customer} /><InfoRow label="Vehículo" value={[order.brand, order.model, order.plate].filter(Boolean).join(' · ')} /><InfoRow label="Trabajo" value={order.repair} /><InfoRow label="Total" value={formatMoney(order.price)} /><InfoRow label="Abonado" value={formatMoney(paidTotal(order))} /><InfoRow label="Saldo" value={formatMoney(balance(order))} /></div></div><p className="mt-3 text-xs text-zinc-400">Compartir abre las aplicaciones compatibles del celular; elegí WhatsApp. Si no está disponible, descargá el PDF y adjuntalo manualmente.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={onClose} className={secondaryClass}>Cerrar</button><button onClick={onShare} className={secondaryClass}>Compartir PDF</button><button onClick={onDownload} className={primaryClass}><FileDown size={16} /> Descargar PDF</button></div></Modal>
}

function PaymentModal({ order, onClose, onSave }: { order: VehicleOrder; onClose: () => void; onSave: (payment: Payment) => void }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod | ''>(order.paymentMethod)
  const [date, setDate] = useState(localDate())
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = roundMoney(Number(amount))
    if (!Number.isFinite(value) || value <= 0 || value > balance(order) || !method || !date) { setError('Ingresá una fecha, medio y monto válido que no supere el saldo.'); return }
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('')
    onSave({ id, amount: value, date, method })
  }
  return <Modal title="Registrar pago o seña" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="rounded-lg border border-zinc-700 p-3 text-sm"><InfoRow label="Cliente" value={order.customer} /><InfoRow label="Saldo pendiente" value={formatMoney(balance(order))} /></div><Field label="Monto (ARS)"><input className={inputClass} type="number" step="0.01" min="0.01" max={balance(order)} value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field><Field label="Fecha de pago"><input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></Field><Field label="Medio de pago"><select className={inputClass} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod | '')} required><option value="">Seleccionar</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></Field>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className={secondaryClass} onClick={onClose}>Cancelar</button><button type="submit" className={primaryClass}>Guardar pago</button></div></form></Modal>
}

function HistoryModal({ order, orders, onClose }: { order: VehicleOrder; orders: VehicleOrder[]; onClose: () => void }) {
  const plate = normalizePlate(order.plate)
  const dni = order.dni.replace(/\D/g, '')
  const visits = orders.filter((item) => item.id === order.id || (plate.length >= 6 && normalizePlate(item.plate) === plate) || (dni.length >= 6 && item.dni.replace(/\D/g, '') === dni)).sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  return <Modal title="Ficha e historial" onClose={onClose} wide><div className="mb-4 space-y-1 text-sm text-zinc-300"><p><b>Cliente:</b> {order.customer} · DNI {order.dni || 'sin registrar'}</p><p><b>Teléfono:</b> {order.phone || 'sin registrar'}</p><p><b>Vehículo:</b> {order.brand} {order.model} · {order.plate || 'sin patente'}</p></div><p className="mb-3 text-xs text-zinc-400">Visitas relacionadas por patente o DNI. Revisá los datos si cambió el propietario.</p><div className="space-y-3">{visits.map((visit) => <div key={visit.id} className="rounded-lg border border-zinc-700 p-4 text-sm"><div className="font-semibold">{formatDate(visit.entryDate)} · {visit.brand} {visit.model} {visit.plate}</div><p className="mt-2 whitespace-pre-wrap text-zinc-300">{visit.repair}</p><div className="mt-2 text-zinc-400">Precio: {formatMoney(visit.price)} · Abonado: {formatMoney(paidTotal(visit))} · Saldo: {formatMoney(balance(visit))}</div>{visit.legacyPaid > 0 && <div className="mt-1 text-xs text-amber-300">Pago previo sin fecha: {formatMoney(visit.legacyPaid)}</div>}{getPayments(visit).map((payment) => <div key={payment.id} className="mt-1 text-xs text-zinc-400">{formatDate(payment.date)} · {payment.method || 'Medio sin registrar'} · {formatMoney(payment.amount)}</div>)}</div>)}</div></Modal>
}

function IncomePage({ orders, month, setMonth, totalMonth, paidThisMonth }: { orders: VehicleOrder[]; month: string; setMonth: (month: string) => void; totalMonth: number; paidThisMonth: number }) {
  const [date, setDate] = useState('')
  const [method, setMethod] = useState('')
  const payments = orderPayments(orders).filter(({ payment }) => payment.date.startsWith(`${month}-`) && (!date || payment.date === date) && (!method || payment.method === method)).sort((a, b) => b.payment.date.localeCompare(a.payment.date))
  const filteredTotal = roundMoney(payments.reduce((sum, { payment }) => sum + payment.amount, 0))
  return <><PageHeader eyebrow="CONTROL DE COBRANZAS" title="Ingresos mensuales" description="Incluye señas y pagos parciales según su fecha real." /><div className="mb-5 flex flex-wrap gap-3"><label className="text-sm text-zinc-300">Mes<input aria-label="Mes de ingresos" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setDate('') }} className={inputClass} /></label><label className="text-sm text-zinc-300">Día específico<input aria-label="Día de pago" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label><label className="text-sm text-zinc-300">Medio de pago<select aria-label="Filtrar medio de pago" value={method} onChange={(event) => setMethod(event.target.value)} className={inputClass}><option value="">Todos</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="mb-6 grid gap-4 sm:grid-cols-3"><Stat icon={Wallet} label="Total del mes" value={formatMoney(totalMonth)} note="Todos los medios de pago" /><Stat icon={CreditCard} label="Total filtrado" value={formatMoney(filteredTotal)} note={`${payments.length} pagos encontrados`} /><Stat icon={CheckCircle2} label="Entregados este mes" value={String(paidThisMonth)} note="Según fecha de entrega" /></div><div className="space-y-3">{payments.map(({ order, payment }) => <article key={`${order.id}-${payment.id}`} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-semibold">{order.customer} · {order.brand} {order.model}</div><div className="mt-1 text-xs text-zinc-400">{formatDate(payment.date)} · {payment.method || 'Medio sin registrar'} · {order.plate || 'Sin patente'}</div></div><div className="font-mono font-semibold">{formatMoney(payment.amount)}</div></div></article>)}{payments.length === 0 && <p className="rounded-lg border border-zinc-800 p-6 text-center text-sm text-zinc-400">No hay pagos para los filtros seleccionados.</p>}</div>{orders.some((order) => order.legacyPaid > 0) && <p className="mt-4 text-sm text-amber-300">Los pagos antiguos sin fecha no se incluyen en los ingresos por período.</p>}</>
}

export default App
