import React, { useState, useMemo, useEffect } from 'react'
import { downloadCSV, downloadXLSXArticulos, fechaHoyAR } from '../utils'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
const fmtNum = (n) => Math.round(Number(n || 0))

// Parsea "Efectivo $6.000 + Transferencia $10.000" → { Efectivo: 6000, Transferencia: 10000 }
function parsearMetodos(metodo_pago, totalVenta) {
  if (!metodo_pago) return { 'Sin especificar': totalVenta }
  if (metodo_pago.includes(' + ')) {
    const result = {}
    metodo_pago.split(' + ').forEach(parte => {
      const idx = parte.lastIndexOf('$')
      if (idx === -1) return
      const nombre = parte.slice(0, idx).trim()
      const monto = parseFloat(parte.slice(idx + 1).replace(/\./g, '').replace(',', '.')) || 0
      if (nombre) result[nombre] = (result[nombre] || 0) + monto
    })
    return Object.keys(result).length ? result : { [metodo_pago]: totalVenta }
  }
  return { [metodo_pago]: totalVenta }
}

function primerDiaMes() {
  const hoy = fechaHoyAR()
  return hoy.slice(0, 8) + '01'
}
function hoy() { return fechaHoyAR() }

export default function ReportesVentas({ ventas: ventasGlobal, productos = [], categorias = [], fetchVentasRango }) {
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoy())
  const [ventasLocales, setVentasLocales] = useState(null)

  const ventas = ventasLocales !== null ? ventasLocales : ventasGlobal

  // Pedir a Supabase solo el rango de fechas visible (sin pisar el estado global)
  useEffect(() => {
    if (fetchVentasRango) {
      fetchVentasRango(desde, hasta).then(data => setVentasLocales(data))
    }
  }, [desde, hasta, fetchVentasRango])

  // Mapa producto_id → categoria
  const prodMap = useMemo(() => {
    const m = {}
    productos.forEach(p => { m[p.id] = p })
    return m
  }, [productos])

  const catMap = useMemo(() => {
    const m = {}
    categorias.forEach(c => { m[c.id] = c.nombre })
    return m
  }, [categorias])

  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v =>
      v.estado !== 'anulada' &&
      v.fecha >= desde && v.fecha <= hasta
    )
  }, [ventas, desde, hasta])

  // KPIs
  const kpis = useMemo(() => {
    const total = ventasFiltradas.reduce((s, v) => s + (v.total || 0), 0)
    const count = ventasFiltradas.length
    const ticket = count ? total / count : 0
    const descuentos = ventasFiltradas.reduce((s, v) => s + (v.descuento || 0), 0)
    return { total, count, ticket, descuentos }
  }, [ventasFiltradas])

  // Por producto (incluye señas/cobros de eventos agrupados)
  const porProducto = useMemo(() => {
    const map = {}
    const SENAS_KEY = '_senas_eventos'
    for (const v of ventasFiltradas) {
      for (const it of (v.venta_items || [])) {
        if (!it.producto_id) {
          // Agrupar señas, pagos y saldos de eventos bajo una sola línea
          if (!map[SENAS_KEY]) map[SENAS_KEY] = {
            id: null,
            nombre: 'Señas / Cobros eventos',
            categoria: 'Eventos',
            catId: null,
            cantidad: 0,
            total: 0,
          }
          map[SENAS_KEY].cantidad += it.cantidad
          map[SENAS_KEY].total += it.subtotal
          continue
        }
        const prod = prodMap[it.producto_id]
        const catId = prod?.categoria_id || null
        const catNombre = catId ? (catMap[catId] || 'Sin categoría') : 'Sin categoría'
        const key = it.producto_id
        if (!map[key]) map[key] = {
          id: it.producto_id,
          nombre: it.nombre_producto || prod?.nombre || '(sin nombre)',
          categoria: catNombre,
          catId,
          cantidad: 0,
          total: 0,
        }
        map[key].cantidad += it.cantidad
        map[key].total += it.subtotal
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [ventasFiltradas, prodMap, catMap])

  // Agrupado por categoría
  const porCategoria = useMemo(() => {
    const map = {}
    for (const p of porProducto) {
      const cat = p.categoria
      if (!map[cat]) map[cat] = { nombre: cat, productos: [], cantidad: 0, total: 0 }
      map[cat].productos.push(p)
      map[cat].cantidad += p.cantidad
      map[cat].total += p.total
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [porProducto])

  // Por día
  const porDia = useMemo(() => {
    const map = {}
    for (const v of ventasFiltradas) {
      if (!map[v.fecha]) map[v.fecha] = { fecha: v.fecha, count: 0, total: 0 }
      map[v.fecha].count++
      map[v.fecha].total += v.total || 0
    }
    return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [ventasFiltradas])

  // Por método de pago
  const porMetodo = useMemo(() => {
    const map = {}
    for (const v of ventasFiltradas) {
      const metodos = parsearMetodos(v.metodo_pago, v.total || 0)
      for (const [nombre, monto] of Object.entries(metodos)) {
        if (!map[nombre]) map[nombre] = { metodo: nombre, count: 0, total: 0 }
        map[nombre].count++
        map[nombre].total += monto
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [ventasFiltradas])

  const totalMetodos = porMetodo.reduce((s, m) => s + m.total, 0) || 1
  const maxDia = porDia.reduce((m, d) => Math.max(m, d.total), 0) || 1
  const maxProd = porProducto[0]?.total || 1

  const totalUnidades = porProducto.reduce((s, p) => s + p.cantidad, 0)
  const totalArticulos = porProducto.reduce((s, p) => s + p.total, 0)

  function descargarExcelArticulos() {
    downloadXLSXArticulos(porCategoria, totalUnidades, totalArticulos, desde, hasta)
  }

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">Reportes de ventas</div>
          <div className="ps">Análisis por artículo, período y método de pago</div>
        </div>
      </div>

      {/* Filtro de fecha */}
      <div className="met-filter-bar">
        <div className="met-filter-group">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="met-filter-group">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </div>

      {/* KPIs */}
      <div className="met-kpis">
        <div className="met-kpi">
          <div className="met-kpi-label">Total facturado</div>
          <div className="met-kpi-val gn">{fmt(kpis.total)}</div>
          <div className="met-kpi-sub">{kpis.count} ventas</div>
        </div>
        <div className="met-kpi">
          <div className="met-kpi-label">Ticket promedio</div>
          <div className="met-kpi-val">{fmt(kpis.ticket)}</div>
          <div className="met-kpi-sub">por venta</div>
        </div>
        <div className="met-kpi">
          <div className="met-kpi-label">Descuentos otorgados</div>
          <div className="met-kpi-val am">{fmt(kpis.descuentos)}</div>
          <div className="met-kpi-sub">total período</div>
        </div>
        <div className="met-kpi">
          <div className="met-kpi-label">Artículos vendidos</div>
          <div className="met-kpi-val or">{totalUnidades}</div>
          <div className="met-kpi-sub">unidades ({porProducto.length} productos)</div>
        </div>
      </div>

      <div className="met-row2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Ventas por día */}
        <div className="met-dist-wrap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="met-chart-title" style={{ marginBottom: 0 }}>Ventas por día</div>
            {porDia.length > 0 && (
              <button className="bg2 bsm" onClick={() => downloadCSV([
                ['Fecha', 'Cantidad de ventas', 'Total ($)'],
                ...porDia.map(d => [d.fecha, d.count, fmtNum(d.total)]),
                ['TOTAL', porDia.reduce((s, d) => s + d.count, 0), fmtNum(porDia.reduce((s, d) => s + d.total, 0))],
              ], `ventas-por-dia_${desde}_${hasta}.csv`)}>
                ⬇ Excel
              </button>
            )}
          </div>
          {porDia.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--mu2)' }}>Sin datos en el período.</p>
            : porDia.map(d => (
              <div key={d.fecha} className="met-bar-row">
                <div className="met-bar-label">{d.fecha}</div>
                <div className="met-bar-track">
                  <div className="met-bar-fill or" style={{ width: `${(d.total / maxDia) * 100}%` }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--nv)', fontWeight: 700, width: 90, textAlign: 'right', fontFamily: 'Nunito' }}>
                  {fmt(d.total)}
                </div>
                <div className="met-bar-count">{d.count}v</div>
              </div>
            ))}
        </div>

        {/* Por método de pago */}
        <div className="met-dist-wrap">
          <div className="met-chart-title">Por método de pago</div>
          {porMetodo.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--mu2)' }}>Sin datos.</p>
            : porMetodo.map(m => (
              <div key={m.metodo} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.metodo}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nv)', fontFamily: 'Nunito' }}>{fmt(m.total)}</span>
                </div>
                <div className="met-bar-track">
                  <div className="met-bar-fill gn" style={{ width: `${(m.total / totalMetodos) * 100}%` }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{Math.round((m.total / totalMetodos) * 100)}%</div>
              </div>
            ))}
        </div>
      </div>

      {/* Ventas por artículo agrupado por categoría */}
      <div className="met-table-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="met-chart-title" style={{ marginBottom: 0 }}>Ventas por artículo — por categoría</div>
          {porProducto.length > 0 && (
            <button className="bg2 bsm" onClick={descargarExcelArticulos}>⬇ Excel</button>
          )}
        </div>
        {porCategoria.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--mu2)' }}>Sin datos en el período.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {porCategoria.map(cat => (
              <div key={cat.nombre}>
                {/* Encabezado de categoría */}
                <div style={{
                  background: 'var(--nv3)', border: '1px solid var(--bd2)',
                  borderRadius: '10px 10px 0 0', padding: '8px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--nv)' }}>
                    {cat.nombre}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nv)', fontFamily: 'Nunito' }}>
                    {cat.cantidad} uds · {fmt(cat.total)}
                  </span>
                </div>
                {/* Productos de la categoría */}
                <table className="met-table" style={{ borderRadius: '0 0 10px 10px', overflow: 'hidden', marginTop: 0 }}>
                  <tbody>
                    {cat.productos.sort((a, b) => b.total - a.total).map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--mu)', fontWeight: 700, width: 30 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                        <td className="num" style={{ width: 110 }}>{p.cantidad} uds</td>
                        <td className="num tot" style={{ width: 130 }}>{fmt(p.total)}</td>
                        <td style={{ width: 160 }}>
                          <div className="met-bar-track" style={{ height: 8 }}>
                            <div className="met-bar-fill or" style={{ width: `${(p.total / maxProd) * 100}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {/* Total general */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--bd)', fontSize: 14, fontWeight: 800, color: 'var(--nv)', fontFamily: 'Nunito' }}>
              <span>Total: {totalUnidades} unidades</span>
              <span>{fmt(totalArticulos)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Detalle de ventas */}
      <div className="met-table-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="met-chart-title" style={{ marginBottom: 0 }}>Detalle de ventas del período</div>
          {ventasFiltradas.length > 0 && (
            <button className="bg2 bsm" onClick={() => downloadCSV([
              ['Ticket', 'Fecha', 'Hora', 'Cliente', 'Método de pago', 'Subtotal', 'Descuento', 'Total'],
              ...ventasFiltradas.map(v => [
                v.numero || '', v.fecha, v.hora || '', v.cliente || '',
                v.metodo_pago || '', fmtNum(v.subtotal), fmtNum(v.descuento), fmtNum(v.total),
              ]),
              ['', '', '', '', 'TOTAL', fmtNum(ventasFiltradas.reduce((s, v) => s + (v.subtotal || 0), 0)), fmtNum(kpis.descuentos), fmtNum(kpis.total)],
            ], `detalle-ventas_${desde}_${hasta}.csv`)}>
              ⬇ Excel
            </button>
          )}
        </div>
        {ventasFiltradas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--mu2)' }}>Sin ventas en el período seleccionado.</p>
        ) : (
          <table className="met-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Método</th>
                <th className="num">Subtotal</th>
                <th className="num">Descuento</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(v => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: 13 }}>{v.numero}</td>
                  <td>{v.fecha} {v.hora}</td>
                  <td>{v.cliente || '—'}</td>
                  <td>{v.metodo_pago}</td>
                  <td className="num">{fmt(v.subtotal)}</td>
                  <td className="num" style={{ color: v.descuento > 0 ? 'var(--am)' : 'var(--mu2)' }}>
                    {v.descuento > 0 ? `-${fmt(v.descuento)}` : '—'}
                  </td>
                  <td className="num tot">{fmt(v.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total ({ventasFiltradas.length} ventas)</td>
                <td className="num">{fmt(ventasFiltradas.reduce((s, v) => s + (v.subtotal || 0), 0))}</td>
                <td className="num">{fmt(kpis.descuentos)}</td>
                <td className="num tot">{fmt(kpis.total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
