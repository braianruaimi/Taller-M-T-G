import { jsPDF } from 'jspdf'
import { balance, formatDate, formatMoney, paidTotal } from './workshopModel'
import type { VehicleOrder } from './workshopModel'

export function createReceipt(order: VehicleOrder): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 18
  let y = 22
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Taller M-T-G', left, y)
  y += 8
  pdf.setFontSize(11)
  pdf.text(order.status === 'delivered' ? 'COMPROBANTE DE TRABAJO Y PAGO' : 'PRESUPUESTO DE REPARACIÓN', left, y)
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('Documento no fiscal. No reemplaza una factura autorizada por ARCA.', left, y)
  y += 5
  pdf.setDrawColor(150)
  pdf.line(left, y, 192, y)
  y += 9
  const row = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, left, y)
    pdf.setFont('helvetica', 'normal')
    const lines: string[] = pdf.splitTextToSize(value || 'Sin registrar', 125) as string[]
    for (const line of lines) {
      if (y > 275) { pdf.addPage(); y = 20 }
      pdf.text(line, 65, y)
      y += 6
    }
    y += 2
  }
  row('Nº de orden:', order.id)
  row('Cargado por:', order.enteredBy)
  row('Cliente:', order.customer)
  row('DNI:', order.dni)
  row('Teléfono:', order.phone)
  row('Vehículo:', [order.brand, order.model, order.plate].filter(Boolean).join(' · '))
  row('Trabajo a realizar:', order.repair)
  row('Fecha de ingreso:', formatDate(order.entryDate))
  row('Entrega estimada:', formatDate(order.expectedDate || null))
  row('Medio de pago:', order.paymentMethod)
  row('Estado:', order.status === 'delivered' ? 'Entregado y pagado' : 'Pendiente de entrega y pago')
  if (order.paidDate) row('Fecha de cobro:', formatDate(order.paidDate))
  row('Total abonado:', formatMoney(paidTotal(order)))
  row('Saldo pendiente:', formatMoney(balance(order)))
  y += 3
  if (y > 270) { pdf.addPage(); y = 20 }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text(`Total: ${formatMoney(order.price)}`, left, y)
  return pdf
}
export function downloadReceipt(order: VehicleOrder): void {
  createReceipt(order).save(`Taller-MTG-${order.id}.pdf`)
}
