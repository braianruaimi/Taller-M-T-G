# Taller M-T-G

Aplicación local para registrar reparaciones, preparar comprobantes y controlar entregas y cobros.

## Iniciar

Requiere Node.js 20.19+ o 22.12+ y npm.

```bash
npm install
npm run dev
```

Para comprobar la compilación de producción, ejecutar `npm run build`. Con `npm run preview` se puede revisar la versión compilada.

## Uso

1. Seleccionar **Cargar vehículo** y completar los datos de quien carga, cliente, vehículo, reparación, fechas, precio y medio de pago.
2. Desde el registro o **A entregar**, editar el trabajo y descargar su comprobante en PDF.
3. Al seleccionar **Entregado**, confirmar la entrega y el cobro. Se guarda la fecha del día y la orden deja de aparecer entre los pendientes.
4. En **Ingresos mensuales**, seleccionar un mes para ver los vehículos cobrados y el importe total según la fecha real de entrega y cobro.

El PDF es un **presupuesto o comprobante no fiscal**. No es una factura electrónica ni un comprobante autorizado por ARCA. Para emitir facturas fiscales reales se necesita una integración con ARCA o un proveedor autorizado y los datos fiscales del taller.

## Datos y respaldos

La información se guarda en el navegador y no se sincroniza entre dispositivos. Utilizar **Exportar** para guardar un respaldo JSON y **Importar** para recuperarlo; importar reemplaza los datos actuales. Conservar copias externas regularmente.

Si hay datos guardados de la versión anterior en el mismo navegador, las órdenes se recuperan sin borrar los datos originales. La información que no existía, como DNI o fecha prevista, debe completarse al editar. Las entregas antiguas sin fecha de cobro no se suman a ningún mes. Si existía un pago parcial anterior sin fecha, solo el saldo registrado en la nueva entrega se suma al mes de esa entrega.

La aplicación no incluye autenticación, sincronización multiusuario ni respaldo en servidor. No se recomienda como único registro de información importante.
