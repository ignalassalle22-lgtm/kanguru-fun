// ══════════════════════════════════════════════════════════════
// Mock Supabase client — datos demo en memoria para muestrario
// ══════════════════════════════════════════════════════════════

// ── Helpers ──
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[rnd(0, arr.length - 1)]
const pad = n => String(n).padStart(2, '0')
const fmtD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
let _id = 1000
const nid = () => _id++

// ── Data pools ──
const RESERVANTES = ['María López','Juan Pérez','Laura González','Carlos Martínez','Ana Rodríguez','Diego Fernández','Valentina García','Matías Sánchez','Lucía Romero','Tomás Díaz','Camila Torres','Sebastián Ruiz','Florencia Morales','Nicolás Castro','Sofía Álvarez','Martín Herrera','Julieta Acosta','Federico Medina','Carolina Suárez','Agustín Flores']
const CUMPLES = ['Mateo','Emma','Santiago','Valentina','Bautista','Martina','Thiago','Catalina','Benjamín','Isabella','Lautaro','Sofía','Felipe','Olivia','Joaquín','Mía','Ciro','Delfina','Santino','Alma','Bruno','Renata','Dante','Emilia','Gael','Luna']
const SALONES = ['Salón Naranja','Salón Azul','Salón Verde']
const TIPOS_EV = ['saltos','parque','saltos+parque']
const HORAS_EV = ['10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00']
const METODOS = ['Efectivo','Transferencia','Tarjeta débito','Tarjeta crédito','Mercado Pago']
const EMP_NOMBRES = ['Lucía','Marcos','Valentina','Tomás','Camila','Matías']
const CLIENTES_VENTA = ['','','','María G.','Carlos R.','Lucía F.','Tomás S.','Ana M.','Diego P.','']

// ── Generate demo data ──
function generateDemoData() {
  const db = {
    usuarios: [
      { id: nid(), username: 'kanguru1', password: '123', rol: 'admin' },
      { id: nid(), username: 'kanguru2', password: '123', rol: 'pos' },
    ],
    configuracion: [
      { id: nid(), clave: 'menus', valor: [
        { id: 1, n: 'Menú Clásico', p: 4500 },
        { id: 2, n: 'Menú Premium', p: 6500 },
        { id: 3, n: 'Menú Vegano', p: 5000 },
        { id: 4, n: 'Menú Sin TACC', p: 5500 },
      ]},
      { id: nid(), clave: 'salones', valor: SALONES },
      { id: nid(), clave: 'promos', valor: [
        { id: 1, d: 'Cumple entre semana -10%', pct: 10 },
        { id: 2, d: 'Grupo +20 chicos -15%', pct: 15 },
        { id: 3, d: 'Promo verano -5%', pct: 5 },
      ]},
      { id: nid(), clave: 'mets', valor: METODOS },
      { id: nid(), clave: 'extras', valor: [
        { id: 1, n: 'Bebidas alcohólicas', p: 2500 },
        { id: 2, n: 'Medias antideslizantes', p: 3500 },
        { id: 3, n: 'Hora extra', p: 15000 },
        { id: 4, n: 'Saltos adicionales', p: 8000 },
        { id: 5, n: 'Parque aéreo adicional', p: 10000 },
        { id: 6, n: 'Comida extra x persona', p: 3500 },
        { id: 7, n: 'Torta personalizada', p: 25000 },
        { id: 8, n: 'Animador', p: 20000 },
      ]},
      { id: nid(), clave: 'pChico', valor: 28000 },
      { id: nid(), clave: 'pAdulto', valor: 5000 },
      { id: nid(), clave: 'pin', valor: '1234' },
      { id: nid(), clave: 'claves', valor: [
        { nombre: 'Admin', clave: '1234' },
        { nombre: 'Encargado', clave: '5678' },
      ]},
      { id: nid(), clave: 'notas_calendario', valor: [] },
      { id: nid(), clave: 'mets_caja', valor: ['Efectivo','Transferencia','Tarjeta débito','Tarjeta crédito','Mercado Pago','Otro'] },
      { id: nid(), clave: 'menu_digital', valor: { activo: false, titulo: 'Kanguru Fun', subtitulo: 'Hacé tu pedido', logoUrl: '', productosIds: [] } },
    ],
    empleados: [],
    categorias: [],
    productos: [],
    proveedores: [],
    eventos: [],
    cajas: [],
    ventas: [],
    venta_items: [],
    compras: [],
    compra_items: [],
    pedidos: [],
    pedido_items: [],
    caja_gastos: [],
    cofre_movimientos: [],
    asistencias: [],
    asistencia_obs: [],
    audit_log: [],
  }

  // Empleados
  EMP_NOMBRES.forEach(n => db.empleados.push({ id: nid(), nombre: n, activo: true, created_at: new Date().toISOString() }))

  // Categorías
  const catNames = ['Bebidas','Alimentos','Servicios','Indumentaria']
  const catMap = {}
  catNames.forEach(n => { const id = nid(); db.categorias.push({ id, nombre: n, created_at: new Date().toISOString() }); catMap[n] = id })

  // Productos
  const prodsData = [
    { nombre: 'Coca-Cola 500ml', cat: 'Bebidas', pv: 2500, pc: 1200, stock: 120 },
    { nombre: 'Sprite 500ml', cat: 'Bebidas', pv: 2500, pc: 1200, stock: 80 },
    { nombre: 'Agua mineral 500ml', cat: 'Bebidas', pv: 1800, pc: 800, stock: 150 },
    { nombre: 'Jugo de naranja', cat: 'Bebidas', pv: 3000, pc: 1500, stock: 60 },
    { nombre: 'Cerveza Quilmes 473ml', cat: 'Bebidas', pv: 3500, pc: 1800, stock: 48 },
    { nombre: 'Café con leche', cat: 'Bebidas', pv: 2800, pc: 900, stock: 999, ms: false },
    { nombre: 'Panchos', cat: 'Alimentos', pv: 3500, pc: 1200, stock: 40 },
    { nombre: 'Hamburguesa simple', cat: 'Alimentos', pv: 5500, pc: 2500, stock: 30 },
    { nombre: 'Hamburguesa completa', cat: 'Alimentos', pv: 7000, pc: 3200, stock: 30 },
    { nombre: 'Pizza porción', cat: 'Alimentos', pv: 3000, pc: 1100, stock: 50 },
    { nombre: 'Papas fritas', cat: 'Alimentos', pv: 4000, pc: 1500, stock: 40 },
    { nombre: 'Sandwich de miga x3', cat: 'Alimentos', pv: 4500, pc: 2000, stock: 25 },
    { nombre: 'Alfajor', cat: 'Alimentos', pv: 1500, pc: 600, stock: 80 },
    { nombre: 'Pochoclos', cat: 'Alimentos', pv: 3000, pc: 800, stock: 50 },
    { nombre: 'Helado 2 bochas', cat: 'Alimentos', pv: 4500, pc: 2000, stock: 40 },
    { nombre: 'Medias antideslizantes', cat: 'Indumentaria', pv: 3500, pc: 1500, stock: 200 },
    { nombre: 'Remera Kanguru Fun', cat: 'Indumentaria', pv: 12000, pc: 5000, stock: 30 },
    { nombre: 'Entrada saltos 1h', cat: 'Servicios', pv: 15000, pc: 0, stock: 999, ms: false },
    { nombre: 'Entrada parque aéreo', cat: 'Servicios', pv: 12000, pc: 0, stock: 999, ms: false },
    { nombre: 'Combo saltos + parque', cat: 'Servicios', pv: 22000, pc: 0, stock: 999, ms: false },
  ]
  prodsData.forEach(p => db.productos.push({
    id: nid(), codigo: null, nombre: p.nombre, categoria_id: catMap[p.cat],
    tipo: 'simple', precio_venta: p.pv, precio_costo: p.pc, unidad: 'unidad',
    stock_actual: p.stock, stock_minimo: 5, activo: true,
    maneja_stock: p.ms !== false, componentes: [], created_at: new Date().toISOString(),
  }))

  // Proveedores
  ;[
    { nombre: 'Distribuidora Don Mario', cuit: '20-12345678-9', obs: 'Bebidas y snacks' },
    { nombre: 'Carnes La Estancia', cuit: '30-87654321-0', obs: 'Hamburguesas y panchos' },
    { nombre: 'Textil Sur', cuit: '27-11223344-5', obs: 'Medias y remeras' },
    { nombre: 'Helados Grido', cuit: '20-55667788-1', obs: 'Helados' },
  ].forEach(p => db.proveedores.push({ id: nid(), ...p, created_at: new Date().toISOString() }))

  // ── Fechas junio-sept 2026 ──
  const start = new Date(2026, 5, 1)
  const end = new Date(2026, 8, 22)
  const allDates = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) allDates.push(new Date(d))

  // ── EVENTOS ──
  const eventDates = []
  for (const d of allDates) {
    const dow = d.getDay()
    if ((dow === 0 || dow === 6) && Math.random() < 0.7) { eventDates.push(new Date(d)); if (Math.random() < 0.4) eventDates.push(new Date(d)) }
    else if (dow >= 3 && Math.random() < 0.35) eventDates.push(new Date(d))
    else if (dow < 3 && Math.random() < 0.15) eventDates.push(new Date(d))
  }
  eventDates.forEach(d => {
    const chi = rnd(8, 30), adu = rnd(5, 20)
    const usePromo = Math.random() < 0.25
    const promoId = usePromo ? String(pick([1,2,3])) : null
    const promoPct = promoId === '1' ? 10 : promoId === '2' ? 15 : promoId === '3' ? 5 : 0
    const mrows = [{ mid: String(rnd(1,4)), qty: rnd(5, chi) }]
    if (Math.random() < 0.4) mrows.push({ mid: String(rnd(1,4)), qty: rnd(3, 10) })
    const extras = Math.random() < 0.5 ? [{ eid: String(rnd(1,8)), qty: rnd(1, chi) }] : []
    const subtotal = chi * 28000 + adu * 5000
    const total = Math.round(subtotal * (1 - promoPct / 100)) + rnd(0, 3) * 5000
    const isPast = d < new Date()
    const pago = isPast ? pick(['paid','paid','paid','sena']) : pick(['none','sena','paid','sena'])
    const monto = pago === 'paid' ? total : pago === 'sena' ? Math.round(total * rnd(30, 60) / 100) : 0
    db.eventos.push({
      id: nid(), fecha: fmtD(d), hora: pick(HORAS_EV), salon: pick(SALONES),
      reservante: pick(RESERVANTES), telefono: `11${rnd(2000,9999)}-${rnd(1000,9999)}`,
      cumple: pick(CUMPLES), edad: String(rnd(3, 14)), tipo: pick(TIPOS_EV),
      privado: false, chi, adu,
      obs: Math.random() < 0.15 ? pick(['Tiene celiaco','Lleva torta propia','Decoración Minecraft','Pide globos extra']) : null,
      pago, monto, met: pago !== 'none' ? pick(METODOS) : null, total,
      promo_id: promoId, interes: 0, interes_tipo: 'pct',
      mrows, extras, consumos: [], consumos_cobrados: false,
      menus_stock_aplicado: false, created_at: d.toISOString(),
    })
  })

  // ── CAJAS Y VENTAS ──
  let ticketNum = 1
  const pastDates = allDates.filter(d => d < new Date())
  for (const d of pastDates) {
    const dow = d.getDay()
    if (dow === 1 && Math.random() < 0.3) continue
    const fecha = fmtD(d)
    const turnos = (dow === 0 || dow === 6) ? ['Mañana','Tarde'] : Math.random() < 0.6 ? ['Tarde'] : ['Mañana','Tarde']

    for (const turno of turnos) {
      const horaAp = turno === 'Mañana' ? `${rnd(9,10)}:00` : `${rnd(14,15)}:00`
      const horaCi = turno === 'Mañana' ? `${rnd(13,14)}:${pad(rnd(0,59))}` : `${rnd(20,22)}:${pad(rnd(0,59))}`
      const empAp = pick(EMP_NOMBRES), empCi = Math.random() < 0.5 ? empAp : pick(EMP_NOMBRES)
      const saldoIni = rnd(5, 30) * 1000
      const cajaId = nid()
      const numVentas = turno === 'Mañana' ? rnd(3, 12) : rnd(8, 25)

      let totalVentas = 0, totalEfectivo = 0
      for (let v = 0; v < numVentas; v++) {
        const numItems = rnd(1, 4)
        const items = []
        const used = new Set()
        for (let i = 0; i < numItems; i++) {
          let prod; do { prod = pick(db.productos) } while (used.has(prod.id))
          used.add(prod.id)
          const qty = rnd(1, 3)
          items.push({ id: nid(), producto_id: prod.id, nombre_producto: prod.nombre, precio_unitario: prod.precio_venta, cantidad: qty, subtotal: prod.precio_venta * qty })
        }
        const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
        const descuento = Math.random() < 0.1 ? Math.round(subtotal * rnd(5, 15) / 100) : 0
        const total = subtotal - descuento
        const metodo = pick(METODOS)
        const horaV = turno === 'Mañana' ? `${rnd(9,13)}:${pad(rnd(0,59))}` : `${rnd(14,21)}:${pad(rnd(0,59))}`
        const estado = Math.random() < 0.03 ? 'anulada' : 'completada'
        const ventaId = nid()
        const numero = `KF-${String(ticketNum++).padStart(7, '0')}`

        db.ventas.push({
          id: ventaId, numero, fecha, hora: horaV,
          cliente: pick(CLIENTES_VENTA) || null,
          subtotal, descuento, total, metodo_pago: metodo, estado,
          caja_id: cajaId, empleado_id: pick(db.empleados).id, obs: null,
          created_at: d.toISOString(),
        })
        items.forEach(it => db.venta_items.push({ ...it, venta_id: ventaId, created_at: d.toISOString() }))

        if (estado !== 'anulada') {
          totalVentas += total
          if (metodo === 'Efectivo') totalEfectivo += total
        }
      }

      // Gastos de caja (algunos días)
      let totalGastos = 0
      if (Math.random() < 0.3) {
        const gm = rnd(1, 3) * 1000
        db.caja_gastos.push({ id: nid(), caja_id: cajaId, monto: gm, detalle: pick(['Bolsas','Limpieza','Reparación','Insumos']), persona: pick(EMP_NOMBRES), created_at: d.toISOString() })
        totalGastos += gm
      }

      const efectivoEsperado = saldoIni + totalEfectivo - totalGastos
      const diff = pick([0,0,0,0,0,rnd(-500,500)])
      db.cajas.push({
        id: cajaId, nombre: pick(['Buffet','Caja 1','Caja 2']), turno, fecha,
        hora_apertura: horaAp, hora_cierre: horaCi,
        saldo_inicial: saldoIni, saldo_final: efectivoEsperado + diff,
        total_ventas: totalVentas, total_efectivo: totalEfectivo,
        estado: 'cerrada', obs_cierre: null,
        empleado_apertura: empAp, empleado_cierre: empCi,
        created_at: d.toISOString(),
      })
    }
  }

  // ── COMPRAS ──
  for (let i = 0; i < allDates.length; i += rnd(4, 8)) {
    const d = allDates[i]
    if (d >= new Date()) break
    const compraId = nid()
    const items = []
    const used = new Set()
    const nItems = rnd(2, 5)
    for (let j = 0; j < nItems; j++) {
      const stockProds = db.productos.filter(p => p.maneja_stock)
      let prod; do { prod = pick(stockProds) } while (used.has(prod.id))
      used.add(prod.id)
      const qty = rnd(10, 50)
      items.push({ id: nid(), compra_id: compraId, producto_id: prod.id, nombre_producto: prod.nombre, precio_unitario: prod.precio_costo, cantidad: qty, subtotal: prod.precio_costo * qty, created_at: d.toISOString() })
    }
    db.compras.push({ id: compraId, fecha: fmtD(d), proveedor: pick(db.proveedores).nombre, numero_remito: `R-${rnd(1000,9999)}`, total: items.reduce((s,it)=>s+it.subtotal,0), metodo_pago: pick(['Efectivo','Transferencia']), obs: null, created_at: d.toISOString() })
    items.forEach(it => db.compra_items.push(it))
  }

  // ── ASISTENCIA ──
  for (const d of pastDates) {
    if (d.getDay() === 0) continue
    const fecha = fmtD(d)
    db.empleados.forEach(emp => {
      if (Math.random() < 0.12) return
      const vac = Math.random() < 0.03
      db.asistencias.push({
        id: nid(), empleado_id: emp.id, fecha,
        hora_entrada: vac ? null : `${rnd(8,10)}:${pad(rnd(0,59))}`,
        hora_salida: vac ? null : `${rnd(17,22)}:${pad(rnd(0,59))}`,
        vacaciones: vac, created_at: d.toISOString(),
      })
    })
  }

  // ── COFRE ──
  let cofreSaldo = 0
  for (let i = 0; i < 8; i++) {
    const m = rnd(5000, 30000)
    cofreSaldo += m
    db.cofre_movimientos.push({
      id: nid(), tipo: 'ingreso', monto: m,
      persona: pick(EMP_NOMBRES), obs: `Traspaso desde ${pick(['Buffet','Caja 1','Caja 2'])}`,
      created_at: new Date(2026, 5 + Math.floor(i / 2), rnd(1, 28)).toISOString(),
    })
  }
  if (cofreSaldo > 10000) {
    db.cofre_movimientos.push({
      id: nid(), tipo: 'egreso', monto: rnd(5000, 15000),
      persona: pick(EMP_NOMBRES), obs: 'Retiro para cambio',
      created_at: new Date(2026, 7, 15).toISOString(),
    })
  }

  return db
}

// ══════════════════════════════════════════
// Mock Supabase client
// ══════════════════════════════════════════
const DB = generateDemoData()

function applyFilters(rows, filters) {
  let result = [...rows]
  for (const f of filters) {
    if (f.type === 'eq') result = result.filter(r => r[f.col] == f.val)
    else if (f.type === 'neq') result = result.filter(r => r[f.col] != f.val)
    else if (f.type === 'gte') result = result.filter(r => r[f.col] >= f.val)
    else if (f.type === 'lte') result = result.filter(r => r[f.col] <= f.val)
    else if (f.type === 'like') {
      const pattern = f.val.replace(/%/g, '.*')
      const regex = new RegExp(`^${pattern}$`, 'i')
      result = result.filter(r => regex.test(String(r[f.col] || '')))
    }
    else if (f.type === 'not') result = result.filter(r => r[f.col] !== f.val)
    else if (f.type === 'in') result = result.filter(r => f.val.includes(r[f.col]))
  }
  return result
}

function resolveRelations(table, rows, selectStr) {
  if (!selectStr || !selectStr.includes('(')) return rows
  // Parse nested selects like "*, venta_items(*)" or "*, venta_items(*), cajas(id, nombre, turno)"
  const relRegex = /(\w+)\(([^)]*)\)/g
  let match
  const relations = []
  while ((match = relRegex.exec(selectStr)) !== null) {
    relations.push({ table: match[1], cols: match[2].trim() })
  }
  if (relations.length === 0) return rows
  return rows.map(row => {
    const extended = { ...row }
    for (const rel of relations) {
      const relTable = DB[rel.table]
      if (!relTable) { extended[rel.table] = []; continue }
      // Find foreign key: table_id or singular(table)_id
      const fkCandidates = [`${table.replace(/s$/, '')}_id`, `${table}_id`]
      // Check if relation is many (array) or single (object)
      const fk = fkCandidates.find(k => relTable[0] && k in relTable[0])
      if (fk) {
        let related = relTable.filter(r => r[fk] === row.id)
        if (rel.cols && rel.cols !== '*') {
          const cols = rel.cols.split(',').map(c => c.trim())
          related = related.map(r => {
            const o = {}; cols.forEach(c => { if (c in r) o[c] = r[c] }); o.id = r.id; return o
          })
        }
        extended[rel.table] = related
      } else {
        // Maybe it's a belongs-to (e.g., cajas from ventas via caja_id)
        const belongsFk = `${rel.table.replace(/s$/, '')}_id`
        if (belongsFk in row && row[belongsFk]) {
          const parent = relTable.find(r => r.id === row[belongsFk])
          if (parent) {
            if (rel.cols && rel.cols !== '*') {
              const cols = rel.cols.split(',').map(c => c.trim())
              const o = {}; cols.forEach(c => { if (c in parent) o[c] = parent[c] }); o.id = parent.id
              extended[rel.table] = o
            } else {
              extended[rel.table] = parent
            }
          } else {
            extended[rel.table] = null
          }
        } else {
          extended[rel.table] = []
        }
      }
    }
    return extended
  })
}

function createQueryBuilder(tableName) {
  const table = DB[tableName] || []
  let filters = []
  let selectStr = '*'
  let orderCol = null, orderAsc = true
  let limitN = null
  let rangeStart = null, rangeEnd = null
  let op = 'select'
  let insertData = null
  let updateData = null
  let upsertOpts = null

  const builder = {
    select(cols) { selectStr = cols || '*'; op = 'select'; return builder },
    eq(col, val) { filters.push({ type: 'eq', col, val }); return builder },
    neq(col, val) { filters.push({ type: 'neq', col, val }); return builder },
    gte(col, val) { filters.push({ type: 'gte', col, val }); return builder },
    lte(col, val) { filters.push({ type: 'lte', col, val }); return builder },
    like(col, val) { filters.push({ type: 'like', col, val }); return builder },
    not(col, _op, val) { filters.push({ type: 'not', col, val }); return builder },
    in(col, val) { filters.push({ type: 'in', col, val }); return builder },
    order(col, opts) { orderCol = col; orderAsc = opts?.ascending !== false; return builder },
    limit(n) { limitN = n; return builder },
    range(start, end) { rangeStart = start; rangeEnd = end; return builder },

    insert(data) {
      op = 'insert'
      insertData = Array.isArray(data) ? data : [data]
      return builder
    },
    update(data) {
      op = 'update'
      updateData = data
      return builder
    },
    upsert(data, opts) {
      op = 'upsert'
      insertData = Array.isArray(data) ? data : [data]
      upsertOpts = opts
      return builder
    },
    delete() {
      op = 'delete'
      return builder
    },

    single() { return execute(true, false) },
    maybeSingle() { return execute(false, true) },
    then(resolve, reject) { return execute(false, false).then(resolve, reject) },
  }

  // Make builder thenable
  function execute(isSingle, isMaybe) {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          if (op === 'select') {
            let result = applyFilters(table, filters)
            if (orderCol) result.sort((a, b) => {
              const va = a[orderCol], vb = b[orderCol]
              if (va == null) return 1; if (vb == null) return -1
              return orderAsc ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
            })
            result = resolveRelations(tableName, result, selectStr)
            if (rangeStart != null) result = result.slice(rangeStart, (rangeEnd || result.length) + 1)
            if (limitN) result = result.slice(0, limitN)
            // Apply column selection for non-relation selects
            if (selectStr && selectStr !== '*' && !selectStr.includes('(')) {
              const cols = selectStr.split(',').map(c => c.trim())
              result = result.map(r => { const o = {}; cols.forEach(c => { if (c in r) o[c] = r[c] }); return o })
            }
            if (isSingle) resolve({ data: result[0] || null, error: result.length === 0 ? { message: 'not found' } : null })
            else if (isMaybe) resolve({ data: result[0] || null, error: null })
            else resolve({ data: result, error: null })
          }
          else if (op === 'insert') {
            const inserted = insertData.map(row => ({ id: nid(), ...row, created_at: row.created_at || new Date().toISOString() }))
            if (!DB[tableName]) DB[tableName] = []
            DB[tableName].push(...inserted)
            if (isSingle) resolve({ data: inserted[0], error: null })
            else resolve({ data: inserted, error: null })
          }
          else if (op === 'update') {
            let result = applyFilters(table, filters)
            result.forEach(row => { Object.assign(row, updateData) })
            if (isSingle) resolve({ data: result[0] || null, error: null })
            else resolve({ data: result, error: null })
          }
          else if (op === 'upsert') {
            const conflict = upsertOpts?.onConflict?.split(',').map(c => c.trim()) || ['id']
            insertData.forEach(row => {
              const existing = table.find(r => conflict.every(c => r[c] == row[c]))
              if (existing) Object.assign(existing, row)
              else { const newRow = { id: nid(), ...row, created_at: new Date().toISOString() }; table.push(newRow) }
            })
            resolve({ data: insertData, error: null })
          }
          else if (op === 'delete') {
            const toDelete = applyFilters(table, filters)
            const ids = new Set(toDelete.map(r => r.id))
            DB[tableName] = table.filter(r => !ids.has(r.id))
            resolve({ data: toDelete, error: null })
          }
        } catch (e) {
          resolve({ data: null, error: { message: e.message } })
        }
      }, 5) // tiny delay to simulate async
    })
  }

  return builder
}

// ── Realtime mock (no-op) ──
const channelMock = {
  on() { return channelMock },
  subscribe() { return channelMock },
}

export const supabase = {
  from(table) { return createQueryBuilder(table) },
  channel() { return channelMock },
  removeChannel() {},
}
