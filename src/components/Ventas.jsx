import React, { useState, useMemo, useEffect } from 'react'
import { fechaHoyAR, imprimirTicketBrowser } from '../utils'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
const hoy = () => fechaHoyAR()

export default function Ventas({ ventas: ventasGlobal, loading: loadingGlobal, cajaActual, onNueva, onAnular, onModificar, fetchVentasRango, empleados = [], isAdmin = true }) {
  const [desde, setDesde] = useState(hoy())
  const [hasta, setHasta] = useState(hoy())
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busca, setBusca] = useState('')
  const [showDetalle, setShowDetalle] = useState(null)
  const [ventasLocales, setVentasLocales] = useState(null)
  const [loadingLocal, setLoadingLocal] = useState(false)

  const ventas = ventasLocales !== null ? ventasLocales : ventasGlobal
  const loading = ventasLocales !== null ? loadingLocal : loadingGlobal

  async function aplicarFiltro() {
    setLoadingLocal(true)
    const data = await fetchVentasRango(desde, hasta)
    setVentasLocales(data)
    setLoadingLocal(false)
  }

  // Cargar ventas de hoy al montar
  useEffect(() => {
    aplicarFiltro()
  }, [])

  const filtradas = useMemo(() => {
    let lista = ventas
    if (filtroEstado) lista = lista.filter(v => v.estado === filtroEstado)
    if (busca) lista = lista.filter(v =>
      (v.numero || '').toLowerCase().includes(busca.toLowerCase()) ||
      (v.cliente || '').toLowerCase().includes(busca.toLowerCase())
    )
    return lista
  }, [ventas, filtroEstado, busca])

  const stats = useMemo(() => {
    const activas = filtradas.filter(v => v.estado !== 'anulada')
    const total = activas.reduce((s, v) => s + (v.total || 0), 0)
    const efectivo = activas.filter(v => v.metodo_pago === 'Efectivo').reduce((s, v) => s + (v.total || 0), 0)
    return { count: activas.length, total, efectivo, ticket: activas.length ? total / activas.length : 0 }
  }, [filtradas])

  const estadoBadge = (estado) => {
    if (estado === 'anulada') return <span className="badge bnp">Anulada</span>
    return <span className="badge bpd">Completada</span>
  }

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">Ventas</div>
          <div className="ps">Tickets de venta · {cajaActual ? `Caja abierta desde ${cajaActual.hora_apertura}` : 'Sin caja abierta'}</div>
        </div>
        <button className="bp" onClick={() => window.open('/?mode=pos', '_blank')}>
          🏪 Sistema de ventas
        </button>
      </div>

      {!cajaActual && (
        <div style={{ background: 'var(--amb)', border: '1px solid rgba(168,98,0,.3)', borderRadius: 10, padding: '11px 16px', color: 'var(--am)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          ⚠ Para registrar ventas primero tenés que abrir una caja desde el módulo Caja.
        </div>
      )}

      {isAdmin && (
        <div className="sr" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="sc"><div className="sl">Ventas</div><div className="sv">{stats.count}</div></div>
          <div className="sc"><div className="sl">Total facturado</div><div className="sv gn">{fmt(stats.total)}</div></div>
          <div className="sc"><div className="sl">Ticket promedio</div><div className="sv">{fmt(stats.ticket)}</div></div>
          <div className="sc"><div className="sl">Efectivo</div><div className="sv">{fmt(stats.efectivo)}</div></div>
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: 16, background: 'var(--wh)', border: '1px solid var(--bd)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 11px', fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 11px', fontSize: 13 }} />
        </div>
        <button className="bn bsm" onClick={aplicarFiltro} style={{ marginTop: 18 }}>Filtrar</button>
        <input placeholder="Buscar ticket o cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{ border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 200, marginTop: 18 }} />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 18 }}>
          <option value="">Todos</option>
          <option value="completada">Completadas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {loading ? (
        <div className="empty"><div className="emj">⏳</div><p>Cargando...</p></div>
      ) : filtradas.length === 0 ? (
        <div className="empty">
          <div className="emj">🧾</div>
          <p>No hay ventas en este período.</p>
          <button className="bp" onClick={() => window.open('/?mode=pos', '_blank')}>🏪 Sistema de ventas</button>
        </div>
      ) : (
        <div className="vtable-wrap">
          <table className="vtable">
            <thead>
              <tr>
                <th>N° Ticket</th>
                <th>Fecha / Hora</th>
                <th>Cliente</th>
                <th>Empleado</th>
                <th>Caja</th>
                <th>Items</th>
                <th>Método</th>
                <th className="num">Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => (
                <tr key={v.id} style={{ opacity: v.estado === 'anulada' ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 700, fontFamily: 'Nunito', color: 'var(--nv)' }}>{v.numero}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.fecha}</div>
                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>{v.hora}</div>
                  </td>
                  <td>{v.cliente || <span style={{ color: 'var(--mu2)' }}>—</span>}</td>
                  <td style={{ fontSize: 13 }}>
                    {v.empleado_id ? (empleados.find(e => e.id === v.empleado_id)?.nombre || '—') : <span style={{ color: 'var(--mu2)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {v.cajas
                      ? <span>{v.cajas.nombre || 'Caja'}{v.cajas.turno ? <span style={{ color: 'var(--mu)', fontSize: 12 }}> · {v.cajas.turno}</span> : ''}</span>
                      : <span style={{ color: 'var(--mu2)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--mu)' }}>
                    {(v.venta_items || []).length} {(v.venta_items || []).length === 1 ? 'artículo' : 'artículos'}
                  </td>
                  <td><span style={{ fontSize: 13 }}>{v.metodo_pago || '—'}</span></td>
                  <td className="num" style={{ fontWeight: 800, fontSize: 15, color: v.estado === 'anulada' ? 'var(--rd)' : 'var(--gn)' }}>
                    {fmt(v.total)}
                  </td>
                  <td>{estadoBadge(v.estado)}</td>
                  <td>
                    <div className="eact">
                      <button className="bg2 bsm" onClick={() => setShowDetalle(v)}>Ver</button>
                      {v.estado !== 'anulada' && (
                        <button className="bg2 bsm" onClick={() => onModificar(v)}>Modificar</button>
                      )}
                      {v.estado !== 'anulada' && (
                        <button className="bdng" onClick={() => onAnular(v.id)}>Anular</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle de venta */}
      {showDetalle && (
        <div className="ov op" onClick={e => e.target === e.currentTarget && setShowDetalle(null)}>
          <div className="dm" style={{ maxWidth: 500 }}>
            <div className="moh">
              <div className="mot"><div className="mot-icon">🧾</div>Ticket {showDetalle.numero}</div>
              <button className="xcl" onClick={() => setShowDetalle(null)}>✕</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="dm-row"><span className="dm-label">Fecha</span><span className="dm-val">{showDetalle.fecha} {showDetalle.hora}</span></div>
              <div className="dm-row"><span className="dm-label">Cliente</span><span className="dm-val">{showDetalle.cliente || '—'}</span></div>
              {showDetalle.empleado_id && (
                <div className="dm-row"><span className="dm-label">Empleado</span><span className="dm-val">{empleados.find(e => e.id === showDetalle.empleado_id)?.nombre || '—'}</span></div>
              )}
              <div className="dm-row"><span className="dm-label">Método de pago</span><span className="dm-val">{showDetalle.metodo_pago}</span></div>
              {showDetalle.cajas && (
                <div className="dm-row">
                  <span className="dm-label">Caja</span>
                  <span className="dm-val">{showDetalle.cajas.nombre || 'Caja'}{showDetalle.cajas.turno ? ` · ${showDetalle.cajas.turno}` : ''}</span>
                </div>
              )}
              <div className="dm-row"><span className="dm-label">Estado</span><span className="dm-val">{estadoBadge(showDetalle.estado)}</span></div>
              <div className="sdv" style={{ marginTop: 14 }}>Artículos</div>
              {(showDetalle.venta_items || []).map((it, i) => (
                <div key={i} className="dm-row">
                  <span className="dm-label">{it.nombre_producto} ×{it.cantidad}</span>
                  <span className="dm-val" style={{ color: 'var(--gn)', fontWeight: 700 }}>{fmt(it.subtotal)}</span>
                </div>
              ))}
              <div className="tb" style={{ marginTop: 14 }}>
                <div className="tr"><span className="tl">Subtotal</span><span className="tv">{fmt(showDetalle.subtotal)}</span></div>
                {showDetalle.descuento > 0 && <div className="tr"><span className="tl">Descuento</span><span className="tv" style={{ color: '#ff9f7a' }}>-{fmt(showDetalle.descuento)}</span></div>}
                <hr className="tsep" />
                <div className="tr big"><span className="tl">TOTAL</span><span className="tv">{fmt(showDetalle.total)}</span></div>
              </div>
              {showDetalle.obs && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--mu)' }}>{showDetalle.obs}</p>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="bg2" onClick={() => setShowDetalle(null)}>Cerrar</button>
              <button className="bp" onClick={() => {
                const v = showDetalle
                const f = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
                const items = (v.venta_items || []).map(it =>
                  `<tr><td>${it.nombre_producto} x${it.cantidad}</td><td style="text-align:right">${f(it.subtotal)}</td></tr>`
                ).join('')
                const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:9px;width:74mm}
h1{font-size:11px;font-weight:bold;text-align:center;margin-bottom:2px}
pre{font-size:8px;margin:2px 0}table{width:100%;border-collapse:collapse}
td{padding:1px 0;font-size:9px}td.r{text-align:right}
.big td{font-size:10px;font-weight:bold}.foot{text-align:center;font-size:8px;margin-top:4px}
</style></head><body>
<h1>KANGOO CUMPLES</h1>
<pre>--------------------------------</pre>
<table>
<tr><td>N°</td><td class="r"><b>${v.numero || ''}</b></td></tr>
<tr><td>Fecha</td><td class="r">${v.fecha || ''} ${v.hora || ''}</td></tr>
${v.cliente ? `<tr><td>Cliente</td><td class="r">${v.cliente}</td></tr>` : ''}
<tr><td>Pago</td><td class="r">${v.metodo_pago || '—'}</td></tr>
</table>
<pre>--------------------------------</pre>
<table>${items}</table>
<pre>--------------------------------</pre>
<table>
${v.descuento > 0 ? `<tr><td>Subtotal</td><td class="r">${f(v.subtotal)}</td></tr><tr><td>Descuento</td><td class="r">-${f(v.descuento)}</td></tr>` : ''}
<tr class="big"><td>TOTAL</td><td class="r">${f(v.total)}</td></tr>
</table>
<div class="foot">Gracias por tu visita!</div>
</body></html>`
                fetch('http://127.0.0.1:5001/print/venta_caja', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  targetAddressSpace: 'loopback',
                  body: JSON.stringify(v),
                }).then(r => { if (!r.ok) throw new Error() }).catch(() => imprimirTicketBrowser(html))
              }}>🖨 Imprimir ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
