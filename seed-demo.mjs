// Seed script para cargar datos demo en kanguru-fun
// Uso: node seed-demo.mjs <SUPABASE_URL> <SUPABASE_ANON_KEY>

import { createClient } from '@supabase/supabase-js'

const url = process.argv[2] || process.env.VITE_SUPABASE_URL
const key = process.argv[3] || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Uso: node seed-demo.mjs <SUPABASE_URL> <ANON_KEY>')
  process.exit(1)
}

const supabase = createClient(url, key)

// ── Helpers ──
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[rnd(0, arr.length - 1)]
const pad = n => String(n).padStart(2, '0')
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ── Data pools ──
const NOMBRES_RESERVANTE = [
  'María López', 'Juan Pérez', 'Laura González', 'Carlos Martínez', 'Ana Rodríguez',
  'Diego Fernández', 'Valentina García', 'Matías Sánchez', 'Lucía Romero', 'Tomás Díaz',
  'Camila Torres', 'Sebastián Ruiz', 'Florencia Morales', 'Nicolás Castro', 'Sofía Álvarez',
  'Martín Herrera', 'Julieta Acosta', 'Federico Medina', 'Carolina Suárez', 'Agustín Flores',
  'Paula Vargas', 'Ramiro Ortiz', 'Micaela Sosa', 'Gonzalo Gutiérrez', 'Celeste Molina',
]

const NOMBRES_CUMPLE = [
  'Mateo', 'Emma', 'Santiago', 'Valentina', 'Bautista', 'Martina', 'Thiago', 'Catalina',
  'Benjamín', 'Isabella', 'Lautaro', 'Sofía', 'Felipe', 'Olivia', 'Joaquín', 'Mía',
  'Ciro', 'Delfina', 'Santino', 'Alma', 'Bruno', 'Renata', 'Dante', 'Emilia', 'Gael',
  'Luna', 'Tomás', 'Ámbar', 'Facundo', 'Juana',
]

const SALONES = ['Salón Naranja', 'Salón Azul', 'Salón Verde']
const TIPOS = ['saltos', 'parque', 'saltos+parque']
const HORAS = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago']
const TURNOS = ['Mañana', 'Tarde', 'Noche']

const EMPLEADOS_NOMBRES = ['Lucía', 'Marcos', 'Valentina', 'Tomás', 'Camila', 'Matías']

const PRODUCTOS_DEMO = [
  { nombre: 'Coca-Cola 500ml', cat: 'Bebidas', precio_venta: 2500, precio_costo: 1200, stock: 120 },
  { nombre: 'Sprite 500ml', cat: 'Bebidas', precio_venta: 2500, precio_costo: 1200, stock: 80 },
  { nombre: 'Agua mineral 500ml', cat: 'Bebidas', precio_venta: 1800, precio_costo: 800, stock: 150 },
  { nombre: 'Jugo de naranja', cat: 'Bebidas', precio_venta: 3000, precio_costo: 1500, stock: 60 },
  { nombre: 'Cerveza Quilmes 473ml', cat: 'Bebidas', precio_venta: 3500, precio_costo: 1800, stock: 48 },
  { nombre: 'Café con leche', cat: 'Bebidas', precio_venta: 2800, precio_costo: 900, stock: 999, maneja_stock: false },
  { nombre: 'Panchos', cat: 'Alimentos', precio_venta: 3500, precio_costo: 1200, stock: 40 },
  { nombre: 'Hamburguesa simple', cat: 'Alimentos', precio_venta: 5500, precio_costo: 2500, stock: 30 },
  { nombre: 'Hamburguesa completa', cat: 'Alimentos', precio_venta: 7000, precio_costo: 3200, stock: 30 },
  { nombre: 'Pizza porción', cat: 'Alimentos', precio_venta: 3000, precio_costo: 1100, stock: 50 },
  { nombre: 'Papas fritas', cat: 'Alimentos', precio_venta: 4000, precio_costo: 1500, stock: 40 },
  { nombre: 'Sandwich de miga x3', cat: 'Alimentos', precio_venta: 4500, precio_costo: 2000, stock: 25 },
  { nombre: 'Alfajor', cat: 'Alimentos', precio_venta: 1500, precio_costo: 600, stock: 80 },
  { nombre: 'Pochoclos', cat: 'Alimentos', precio_venta: 3000, precio_costo: 800, stock: 50 },
  { nombre: 'Medias antideslizantes', cat: 'Indumentaria', precio_venta: 3500, precio_costo: 1500, stock: 200 },
  { nombre: 'Remera Kanguru Fun', cat: 'Indumentaria', precio_venta: 12000, precio_costo: 5000, stock: 30 },
  { nombre: 'Entrada saltos 1h', cat: 'Servicios', precio_venta: 15000, precio_costo: 0, stock: 999, maneja_stock: false },
  { nombre: 'Entrada parque aéreo', cat: 'Servicios', precio_venta: 12000, precio_costo: 0, stock: 999, maneja_stock: false },
  { nombre: 'Combo saltos + parque', cat: 'Servicios', precio_venta: 22000, precio_costo: 0, stock: 999, maneja_stock: false },
  { nombre: 'Helado 2 bochas', cat: 'Alimentos', precio_venta: 4500, precio_costo: 2000, stock: 40 },
]

const TELEFONOS_DEMO = () => `11${rnd(2000, 9999)}-${rnd(1000, 9999)}`

// ── Main ──
async function main() {
  console.log('🧹 Limpiando datos existentes...')

  // Limpiar en orden por dependencias
  await supabase.from('pedido_items').delete().neq('id', 0)
  await supabase.from('pedidos').delete().neq('id', 0)
  await supabase.from('venta_items').delete().neq('id', 0)
  await supabase.from('ventas').delete().neq('id', 0)
  await supabase.from('compra_items').delete().neq('id', 0)
  await supabase.from('compras').delete().neq('id', 0)
  await supabase.from('asistencias').delete().neq('id', 0)
  await supabase.from('asistencia_obs').delete().neq('id', 0)
  await supabase.from('cajas').delete().neq('id', 0)
  await supabase.from('eventos').delete().neq('id', 0)
  await supabase.from('productos').delete().neq('id', 0)
  await supabase.from('categorias').delete().neq('id', 0)
  await supabase.from('empleados').delete().neq('id', 0)
  await supabase.from('proveedores').delete().neq('id', 0)
  await supabase.from('audit_log').delete().neq('id', 0)
  await supabase.from('configuracion').delete().neq('id', 0)

  // Actualizar usuarios
  await supabase.from('usuarios').delete().neq('id', 0)
  const { data: users } = await supabase.from('usuarios').insert([
    { username: 'kanguru1', password: '123', rol: 'admin' },
    { username: 'kanguru2', password: '123', rol: 'pos' },
  ]).select()
  console.log(`✓ Usuarios: ${users?.length || 0}`)

  // ── Configuración ──
  await supabase.from('configuracion').insert([
    { clave: 'menus', valor: [
      { id: 1, n: 'Menú Clásico', p: 4500 },
      { id: 2, n: 'Menú Premium', p: 6500 },
      { id: 3, n: 'Menú Vegano', p: 5000 },
      { id: 4, n: 'Menú Sin TACC', p: 5500 },
    ]},
    { clave: 'salones', valor: SALONES },
    { clave: 'promos', valor: [
      { id: 1, d: 'Cumple entre semana -10%', pct: 10 },
      { id: 2, d: 'Grupo +20 chicos -15%', pct: 15 },
      { id: 3, d: 'Promo verano -5%', pct: 5 },
    ]},
    { clave: 'mets', valor: METODOS },
    { clave: 'extras', valor: [
      { id: 1, n: 'Bebidas alcohólicas', p: 2500 },
      { id: 2, n: 'Medias antideslizantes', p: 3500 },
      { id: 3, n: 'Hora extra', p: 15000 },
      { id: 4, n: 'Saltos adicionales', p: 8000 },
      { id: 5, n: 'Parque aéreo adicional', p: 10000 },
      { id: 6, n: 'Comida extra x persona', p: 3500 },
      { id: 7, n: 'Torta personalizada', p: 25000 },
      { id: 8, n: 'Animador', p: 20000 },
    ]},
    { clave: 'pChico', valor: 28000 },
    { clave: 'pAdulto', valor: 5000 },
    { clave: 'pin', valor: '1234' },
    { clave: 'claves', valor: [
      { nombre: 'Admin', clave: '1234' },
      { nombre: 'Encargado', clave: '5678' },
    ]},
    { clave: 'notas_calendario', valor: [] },
    { clave: 'mets_caja', valor: ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Otro'] },
    { clave: 'menu_digital', valor: { activo: false, titulo: 'Kanguru Fun', subtitulo: 'Hacé tu pedido', logoUrl: '', productosIds: [] } },
  ])
  console.log('✓ Configuración')

  // ── Empleados ──
  const { data: empleados } = await supabase.from('empleados').insert(
    EMPLEADOS_NOMBRES.map(n => ({ nombre: n, activo: true }))
  ).select()
  console.log(`✓ Empleados: ${empleados.length}`)

  // ── Categorías ──
  const catNames = ['Bebidas', 'Alimentos', 'Servicios', 'Indumentaria']
  const { data: categorias } = await supabase.from('categorias').insert(
    catNames.map(n => ({ nombre: n }))
  ).select()
  const catMap = {}
  categorias.forEach(c => { catMap[c.nombre] = c.id })
  console.log(`✓ Categorías: ${categorias.length}`)

  // ── Productos ──
  const { data: productos } = await supabase.from('productos').insert(
    PRODUCTOS_DEMO.map(p => ({
      nombre: p.nombre,
      categoria_id: catMap[p.cat],
      tipo: 'simple',
      precio_venta: p.precio_venta,
      precio_costo: p.precio_costo,
      stock_actual: p.stock,
      stock_minimo: 5,
      activo: true,
      maneja_stock: p.maneja_stock !== false,
    }))
  ).select()
  console.log(`✓ Productos: ${productos.length}`)

  // ── Proveedores ──
  const { data: proveedores } = await supabase.from('proveedores').insert([
    { nombre: 'Distribuidora Don Mario', cuit: '20-12345678-9', obs: 'Bebidas y snacks' },
    { nombre: 'Carnes La Estancia', cuit: '30-87654321-0', obs: 'Hamburguesas y panchos' },
    { nombre: 'Textil Sur', cuit: '27-11223344-5', obs: 'Medias y remeras' },
    { nombre: 'Helados Grido', cuit: '20-55667788-1', obs: 'Helados' },
  ]).select()
  console.log(`✓ Proveedores: ${proveedores.length}`)

  // ── Generar fechas desde junio 2026 hasta hoy ──
  const startDate = new Date(2026, 5, 1) // 1 junio 2026
  const endDate = new Date(2026, 8, 22)  // 22 sept 2026
  const allDates = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    allDates.push(new Date(d))
  }

  // ── EVENTOS (cumpleaños) ──
  // ~3-5 por semana = ~15-20 por mes
  console.log('📅 Generando eventos...')
  const eventDates = []
  for (const d of allDates) {
    const dow = d.getDay()
    // Más fines de semana, pero también entre semana
    if (dow === 0 || dow === 6) {
      // Fines de semana: 70% chance de 1-2 eventos
      if (Math.random() < 0.7) {
        eventDates.push(new Date(d))
        if (Math.random() < 0.4) eventDates.push(new Date(d))
      }
    } else if (dow >= 3) {
      // Jue-Vie: 35% chance
      if (Math.random() < 0.35) eventDates.push(new Date(d))
    } else {
      // Lun-Mié: 15% chance
      if (Math.random() < 0.15) eventDates.push(new Date(d))
    }
  }

  const eventosToInsert = eventDates.map(d => {
    const chi = rnd(8, 30)
    const adu = rnd(5, 20)
    const pChico = 28000
    const pAdulto = 5000
    const salon = pick(SALONES)
    const tipo = pick(TIPOS)
    const hora = pick(HORAS)
    const usePromo = Math.random() < 0.25
    const promoId = usePromo ? String(pick([1, 2, 3])) : null
    const promoPct = promoId === '1' ? 10 : promoId === '2' ? 15 : promoId === '3' ? 5 : 0

    // Menús
    const menuCount = rnd(1, 3)
    const mrows = []
    const usedMenus = new Set()
    for (let i = 0; i < menuCount; i++) {
      let mid
      do { mid = rnd(1, 4) } while (usedMenus.has(mid))
      usedMenus.add(mid)
      mrows.push({ mid: String(mid), qty: rnd(5, chi) })
    }

    // Extras
    const extrasCount = rnd(0, 3)
    const extras = []
    const usedExtras = new Set()
    for (let i = 0; i < extrasCount; i++) {
      let eid
      do { eid = rnd(1, 8) } while (usedExtras.has(eid))
      usedExtras.add(eid)
      extras.push({ eid: String(eid), qty: rnd(1, chi) })
    }

    const subtotal = chi * pChico + adu * pAdulto
    const descuento = usePromo ? Math.round(subtotal * promoPct / 100) : 0
    const total = subtotal - descuento + rnd(0, 5) * 5000 // extras aprox

    const isPast = d < new Date()
    const pagoOptions = isPast ? ['paid', 'paid', 'paid', 'sena'] : ['none', 'sena', 'paid', 'sena']
    const pago = pick(pagoOptions)
    const monto = pago === 'paid' ? total : pago === 'sena' ? Math.round(total * rnd(30, 60) / 100) : 0
    const met = pago !== 'none' ? pick(METODOS) : null

    return {
      fecha: fmtDate(d),
      hora,
      salon,
      reservante: pick(NOMBRES_RESERVANTE),
      telefono: TELEFONOS_DEMO(),
      cumple: pick(NOMBRES_CUMPLE),
      edad: String(rnd(3, 14)),
      tipo,
      chi,
      adu,
      obs: Math.random() < 0.2 ? pick(['Tiene celiaco', 'Necesita silla de ruedas', 'Lleva torta propia', 'Decoración temática Minecraft', 'Pide globos extra']) : null,
      pago,
      monto,
      met,
      total,
      promo_id: promoId,
      mrows,
      extras,
    }
  })

  const { data: eventos } = await supabase.from('eventos').insert(eventosToInsert).select('id, fecha')
  console.log(`✓ Eventos: ${eventos.length}`)

  // ── CAJAS Y VENTAS ──
  // Generar cajas y ventas para días laborables
  console.log('💰 Generando cajas y ventas...')

  let ticketNum = 1
  const allVentas = []
  const allVentaItems = []
  const allCajas = []

  // Solo generar cajas para días hasta ayer (no hoy, para no confundir)
  const pastDates = allDates.filter(d => d < new Date(2026, 8, 22))

  for (const d of pastDates) {
    const dow = d.getDay()
    if (dow === 1 && Math.random() < 0.3) continue // Lunes a veces cerrado

    const fecha = fmtDate(d)

    // 1-2 turnos por día
    const turnos = dow === 0 || dow === 6
      ? ['Mañana', 'Tarde']  // Fines de semana: 2 turnos
      : Math.random() < 0.6 ? ['Tarde'] : ['Mañana', 'Tarde']

    for (const turno of turnos) {
      const horaApertura = turno === 'Mañana' ? `${rnd(9, 10)}:00` : `${rnd(14, 15)}:00`
      const horaCierre = turno === 'Mañana' ? `${rnd(13, 14)}:${pad(rnd(0, 59))}` : `${rnd(20, 22)}:${pad(rnd(0, 59))}`
      const empleadoApertura = pick(EMPLEADOS_NOMBRES)
      const empleadoCierre = Math.random() < 0.5 ? empleadoApertura : pick(EMPLEADOS_NOMBRES)
      const saldoInicial = rnd(5, 30) * 1000

      // Ventas para esta caja
      const numVentas = turno === 'Mañana' ? rnd(3, 12) : rnd(8, 25)
      const ventasCaja = []

      for (let v = 0; v < numVentas; v++) {
        const numItems = rnd(1, 5)
        const items = []
        const usedProds = new Set()

        for (let i = 0; i < numItems; i++) {
          let prod
          do { prod = pick(productos) } while (usedProds.has(prod.id))
          usedProds.add(prod.id)
          const qty = rnd(1, 4)
          items.push({
            producto_id: prod.id,
            nombre_producto: prod.nombre,
            precio_unitario: prod.precio_venta,
            cantidad: qty,
            subtotal: prod.precio_venta * qty,
          })
        }

        const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
        const descuento = Math.random() < 0.1 ? Math.round(subtotal * rnd(5, 15) / 100) : 0
        const total = subtotal - descuento
        const metodo = pick(METODOS)
        const horaVenta = turno === 'Mañana'
          ? `${rnd(9, 13)}:${pad(rnd(0, 59))}`
          : `${rnd(14, 21)}:${pad(rnd(0, 59))}`

        ventasCaja.push({
          numero: String(ticketNum++),
          fecha,
          hora: horaVenta,
          cliente: Math.random() < 0.3 ? pick(NOMBRES_RESERVANTE) : null,
          subtotal,
          descuento,
          total,
          metodo_pago: metodo,
          estado: Math.random() < 0.03 ? 'anulada' : 'completada',
          empleado_id: pick(empleados).id,
          items,
        })
      }

      const totalVentas = ventasCaja.filter(v => v.estado !== 'anulada').reduce((s, v) => s + v.total, 0)
      const totalEfectivo = ventasCaja.filter(v => v.estado !== 'anulada' && v.metodo_pago === 'Efectivo').reduce((s, v) => s + v.total, 0)
      const efectivoEsperado = saldoInicial + totalEfectivo
      const diferencia = pick([0, 0, 0, 0, 0, rnd(-500, 500)]) // Mayoría sin diferencia
      const saldoFinal = efectivoEsperado + diferencia

      allCajas.push({
        nombre: pick(['Buffet', 'Caja 1', 'Caja 2']),
        turno,
        fecha,
        hora_apertura: horaApertura,
        hora_cierre: horaCierre,
        saldo_inicial: saldoInicial,
        saldo_final: saldoFinal,
        total_ventas: totalVentas,
        total_efectivo: totalEfectivo,
        estado: 'cerrada',
        empleado_apertura: empleadoApertura,
        empleado_cierre: empleadoCierre,
        ventas: ventasCaja,
      })
    }
  }

  // Insert cajas y ventas
  for (const caja of allCajas) {
    const ventasData = caja.ventas
    delete caja.ventas

    const { data: cajaRow } = await supabase.from('cajas').insert(caja).select().single()

    for (const venta of ventasData) {
      const items = venta.items
      delete venta.items
      venta.caja_id = cajaRow.id

      const { data: ventaRow } = await supabase.from('ventas').insert(venta).select().single()

      if (ventaRow && items.length > 0) {
        await supabase.from('venta_items').insert(
          items.map(it => ({ ...it, venta_id: ventaRow.id }))
        )
      }
    }
  }
  console.log(`✓ Cajas cerradas: ${allCajas.length}`)
  console.log(`✓ Ventas totales: ${ticketNum - 1}`)

  // ── Compras (remitos) ──
  console.log('📥 Generando compras...')
  const comprasToInsert = []
  // 1-2 compras por semana
  for (let i = 0; i < allDates.length; i += rnd(3, 7)) {
    const d = allDates[i]
    if (d >= new Date()) break

    const numItems = rnd(2, 6)
    const items = []
    const usedProds = new Set()
    for (let j = 0; j < numItems; j++) {
      let prod
      do { prod = pick(productos.filter(p => p.maneja_stock !== false)) } while (usedProds.has(prod.id))
      usedProds.add(prod.id)
      const qty = rnd(10, 50)
      items.push({
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        precio_unitario: prod.precio_costo,
        cantidad: qty,
        subtotal: prod.precio_costo * qty,
      })
    }

    const total = items.reduce((s, it) => s + it.subtotal, 0)

    comprasToInsert.push({
      fecha: fmtDate(d),
      proveedor: pick(proveedores).nombre,
      numero_remito: `R-${rnd(1000, 9999)}`,
      total,
      metodo_pago: pick(['Efectivo', 'Transferencia']),
      obs: Math.random() < 0.2 ? 'Entrega parcial' : null,
      items,
    })
  }

  for (const compra of comprasToInsert) {
    const items = compra.items
    delete compra.items

    const { data: compraRow } = await supabase.from('compras').insert(compra).select().single()
    if (compraRow && items.length > 0) {
      await supabase.from('compra_items').insert(
        items.map(it => ({ ...it, compra_id: compraRow.id }))
      )
    }
  }
  console.log(`✓ Compras: ${comprasToInsert.length}`)

  // ── Asistencia ──
  console.log('👥 Generando asistencia...')
  const asistencias = []
  for (const d of pastDates) {
    const dow = d.getDay()
    if (dow === 0) continue // Domingos no
    const fecha = fmtDate(d)

    for (const emp of empleados) {
      if (Math.random() < 0.12) continue // ~12% ausente
      const vacaciones = Math.random() < 0.03
      asistencias.push({
        empleado_id: emp.id,
        fecha,
        hora_entrada: vacaciones ? null : `${rnd(8, 10)}:${pad(rnd(0, 59))}`,
        hora_salida: vacaciones ? null : `${rnd(17, 22)}:${pad(rnd(0, 59))}`,
        vacaciones,
      })
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < asistencias.length; i += 500) {
    await supabase.from('asistencias').insert(asistencias.slice(i, i + 500))
  }
  console.log(`✓ Asistencias: ${asistencias.length}`)

  console.log('\n🎉 ¡Seed completo! La demo está lista.')
  console.log('   Login: kanguru1 / 123 (admin) o kanguru2 / 123 (pos)')
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
