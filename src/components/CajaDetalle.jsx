import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabase'
import { imprimirTicketBrowser } from '../utils'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

function parsearMetodos(metodo_pago, totalVenta) {
  if (!metodo_pago) return { Otro: totalVenta }
  if (metodo_pago.includes('$')) {
    const result = {}
    let sumParsed = 0
    metodo_pago.split(' + ').forEach(parte => {
      const idx = parte.lastIndexOf('$')
      if (idx === -1) return
      const nombre = parte.slice(0, idx).trim()
      const monto = parseFloat(parte.slice(idx + 1).replace(/\./g, '').replace(',', '.')) || 0
      if (nombre) { result[nombre] = (result[nombre] || 0) + monto; sumParsed += monto }
    })
    if (sumParsed > 0 && Math.abs(sumParsed - totalVenta) > 1) {
      const factor = totalVenta / sumParsed
      Object.keys(result).forEach(k => { result[k] = Math.round(result[k] * factor) })
    }
    return result
  }
  return { [metodo_pago]: totalVenta }
}

function ticketVentaHtml(venta) {
  const f = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
  const items = (venta.venta_items || []).map(it =>
    `<tr><td>${it.nombre_producto} x${it.cantidad}</td><td style="text-align:right">${f(it.subtotal)}</td></tr>`
  ).join('')
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:8px;width:74mm}
h1{font-size:10px;font-weight:bold;text-align:center;margin-bottom:2px}
.sub{text-align:center;font-size:8px;margin-bottom:3px}
table{width:100%;border-collapse:collapse}td{padding:1px 0;font-size:8px;vertical-align:top}
.sep{letter-spacing:0;font-size:8px;margin:2px 0}
.total td{font-size:10px;font-weight:bold;border-top:1px solid #000;padding-top:2px}
.foot{text-align:center;font-size:7px;color:#666;margin-top:4px}
</style></head><body>
<h1>KANGOO CUMPLES</h1>
<div class="sub">Ticket #${venta.numero || ''}</div>
<pre class="sep">--------------------------------</pre>
<table>
<tr><td>Fecha</td><td style="text-align:right">${venta.fecha || ''} ${venta.hora || ''}</td></tr>
${venta.cliente ? `<tr><td>Cliente</td><td style="text-align:right">${venta.cliente}</td></tr>` : ''}
<tr><td>Pago</td><td style="text-align:right">${venta.metodo_pago || '\u2014'}</td></tr>
</table>
<pre class="sep">--------------------------------</pre>
<table>${items}</table>
<pre class="sep">--------------------------------</pre>
<table>
${venta.descuento > 0 ? `<tr><td>Subtotal</td><td style="text-align:right">${f(venta.subtotal)}</td></tr><tr><td>Descuento</td><td style="text-align:right">-${f(venta.descuento)}</td></tr>` : ''}
<tr class="total"><td>TOTAL</td><td style="text-align:right">${f(venta.total)}</td></tr>
</table>
${venta.obs ? `<p style="font-size:7px;margin-top:4px">${venta.obs}</p>` : ''}
<div class="foot">Gracias por su compra!</div>
</body></html>`
}

function imprimirVentaCaja(venta) {
  fetch('http://127.0.0.1:5001/print/venta_caja', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    targetAddressSpace: 'loopback',
    body: JSON.stringify(venta),
  }).then(r => {
    if (!r.ok) imprimirTicketBrowser(ticketVentaHtml(venta))
  }).catch(() => {
    imprimirTicketBrowser(ticketVentaHtml(venta))
  })
}

function TicketDetalle({ venta, onClose }) {
  const fmt2 = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
  return (
    <div className="ov op" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dm" style={{ maxWidth: 420 }}>
        <div className="moh">
          <div className="mot"><div className="mot-icon">🧾</div>Ticket {venta.numero}</div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="dm-row"><span className="dm-label">Fecha / Hora</span><span className="dm-val">{venta.fecha} {venta.hora}</span></div>
          {venta.cliente && <div className="dm-row"><span className="dm-label">Cliente</span><span className="dm-val">{venta.cliente}</span></div>}
          <div className="dm-row"><span className="dm-label">Metodo de pago</span><span className="dm-val">{venta.metodo_pago || '\u2014'}</span></div>
          <div className="sdv" style={{ marginTop: 14 }}>Articulos</div>
          {(venta.venta_items || []).map((it, i) => (
            <div key={i} className="dm-row">
              <span className="dm-label">{it.nombre_producto} x{it.cantidad}</span>
              <span className="dm-val" style={{ color: 'var(--gn)', fontWeight: 700 }}>{fmt2(it.subtotal)}</span>
            </div>
          ))}
          <div className="tb" style={{ marginTop: 14 }}>
            <div className="tr"><span className="tl">Subtotal</span><span className="tv">{fmt2(venta.subtotal)}</span></div>
            {venta.descuento > 0 && <div className="tr"><span className="tl">Descuento</span><span className="tv" style={{ color: '#ff9f7a' }}>-{fmt2(venta.descuento)}</span></div>}
            <hr className="tsep" />
            <div className="tr big"><span className="tl">TOTAL</span><span className="tv">{fmt2(venta.total)}</span></div>
          </div>
          {venta.obs && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--mu)' }}>{venta.obs}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="bg2" onClick={onClose}>Cerrar</button>
          <button className="bp" onClick={() => imprimirVentaCaja(venta)}>🖨 Imprimir</button>
        </div>
      </div>
    </div>
  )
}

export default function CajaDetalle() {
  const params = new URLSearchParams(window.location.search)
  const cajaId = params.get('id')

  const [caja, setCaja] = useState(null)
  const [ventas, setVentas] = useState([])
  const [gastos, setGastos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketDetalle, setTicketDetalle] = useState(null)
  const [tab, setTab] = useState('tickets')

  useEffect(() => {
    if (!cajaId) return
    async function load() {
      setLoading(true)
      const [cajaRes, ventasRes, gastosRes, empRes] = await Promise.all([
        supabase.from('cajas').select('*').eq('id', cajaId).single(),
        supabase.from('ventas').select('*, venta_items(*)').eq('caja_id', cajaId).order('created_at', { ascending: false }),
        supabase.from('caja_gastos').select('*').eq('caja_id', cajaId).order('created_at', { ascending: false }),
        supabase.from('empleados').select('*').order('nombre'),
      ])
      if (cajaRes.data) setCaja(cajaRes.data)
      setVentas(ventasRes.data || [])
      setGastos(gastosRes.data || [])
      setEmpleados(empRes.data || [])
      setLoading(false)
    }
    load()
  }, [cajaId])

  const ventasActivas = useMemo(() => ventas.filter(v => v.estado !== 'anulada'), [ventas])

  const desglose = useMemo(() => {
    const map = {}
    ventasActivas.forEach(v => {
      const metodos = parsearMetodos(v.metodo_pago, v.total || 0)
      Object.entries(metodos).forEach(([met, monto]) => {
        map[met] = (map[met] || 0) + monto
      })
    })
    return map
  }, [ventasActivas])

  const totalVentas = ventasActivas.reduce((s, v) => s + (v.total || 0), 0)
  const totalEfectivo = desglose['Efectivo'] || 0

  const gastosReales = gastos.filter(g => !g.detalle?.startsWith('Traspaso al cofre'))
  const egresosCofre = gastos.filter(g => g.detalle?.startsWith('Traspaso al cofre'))
  const totalGastosReales = gastosReales.reduce((s, g) => s + (g.monto || 0), 0)
  const totalEgresosCofre = egresosCofre.reduce((s, g) => s + (g.monto || 0), 0)
  const totalGastos = totalGastosReales + totalEgresosCofre

  const estadoBadge = (estado) => {
    if (estado === 'anulada') return <span className="badge bnp">Anulada</span>
    return <span className="badge bpd">Completada</span>
  }

  const tabStyle = (id) => ({
    padding: '10px 24px', fontSize: 14, fontWeight: 700,
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: `3px solid ${tab === id ? 'var(--nv)' : 'transparent'}`,
    color: tab === id ? 'var(--nv)' : 'var(--mu)',
    marginBottom: -1, fontFamily: 'Nunito, sans-serif',
  })

  if (!cajaId) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
      <p>No se especifico una caja.</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p>Cargando detalle de caja...</p>
    </div>
  )

  if (!caja) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
      <p>No se encontro la caja.</p>
    </div>
  )

  const esperado = (caja.saldo_inicial || 0) + totalEfectivo - totalGastos
  const diff = (caja.saldo_final || 0) - esperado

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--nv)', padding: '16px 28px',
        borderBottom: '3px solid var(--or)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>🏪</span>
          <div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
              {caja.nombre || 'Caja'}
              {caja.turno && <span style={{ fontWeight: 500, fontSize: 14, marginLeft: 10, opacity: 0.6 }}>· {caja.turno}</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              {caja.fecha} · {caja.hora_apertura} — {caja.hora_cierre || '?'} hs
              {caja.empleado_apertura && ` · Abrió: ${caja.empleado_apertura}`}
              {caja.empleado_cierre && ` · Cerró: ${caja.empleado_cierre}`}
            </div>
          </div>
        </div>
        <span className="badge bpd" style={{ fontSize: 13 }}>
          {caja.estado === 'abierta' ? '● Abierta' : '● Cerrada'}
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px' }}>
        {/* Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div className="cc">
            <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Resumen</div>
            <div className="li"><span className="lin">Saldo inicial</span><span className="lis">{fmt(caja.saldo_inicial)}</span></div>
            <div className="li"><span className="lin">Total ventas</span><span className="lip">{fmt(totalVentas)}</span></div>
            {totalGastosReales > 0 && <div className="li"><span className="lin">Gastos</span><span style={{ fontWeight: 700, color: 'var(--rd)' }}>-{fmt(totalGastosReales)}</span></div>}
            {totalEgresosCofre > 0 && <div className="li"><span className="lin">Egresos al cofre</span><span style={{ fontWeight: 700, color: 'var(--rd)' }}>-{fmt(totalEgresosCofre)}</span></div>}
            <div className="li"><span className="lin">Efectivo contado</span><span className="lip">{fmt(caja.saldo_final)}</span></div>
            {caja.obs_cierre && <div className="li" style={{ marginTop: 8 }}><span className="lin">Obs.</span><span className="lis" style={{ fontStyle: 'italic' }}>{caja.obs_cierre}</span></div>}
          </div>

          <div className="cc">
            <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Por metodo de pago</div>
            {Object.keys(desglose).length === 0
              ? <p style={{ fontSize: 13, color: 'var(--mu2)', padding: '6px 0' }}>Sin ventas activas</p>
              : Object.keys(desglose).map(m => (
                <div key={m} className="li">
                  <span className="lin">{m}</span>
                  <span className="lip">{fmt(desglose[m])}</span>
                </div>
              ))
            }
          </div>

          <div className="cc">
            <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Balance</div>
            <div className="li"><span className="lin">Efectivo esperado</span><span className="lis">{fmt(esperado)}</span></div>
            <div className="li"><span className="lin">Efectivo contado</span><span className="lis">{fmt(caja.saldo_final)}</span></div>
            <div className="li" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
              <span className="lin" style={{ fontWeight: 800 }}>Diferencia</span>
              <span style={{
                fontWeight: 900, fontSize: 18,
                color: diff === 0 ? 'var(--gn)' : diff > 0 ? 'var(--am)' : 'var(--rd)'
              }}>
                {diff >= 0 ? '+' : ''}{fmt(diff)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bd)', marginBottom: 20 }}>
          <button style={tabStyle('tickets')} onClick={() => setTab('tickets')}>
            Tickets ({ventas.length})
          </button>
          <button style={tabStyle('gastos')} onClick={() => setTab('gastos')}>
            Gastos ({gastos.length})
          </button>
        </div>

        {/* Contenido */}
        {tab === 'tickets' && (
          ventas.length === 0 ? (
            <div className="empty"><div className="emj">🧾</div><p>No hay tickets en esta caja.</p></div>
          ) : (
            <div className="vtable-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>N° Ticket</th>
                    <th>Fecha / Hora</th>
                    <th>Cliente</th>
                    <th>Empleado</th>
                    <th>Metodo</th>
                    <th>Items</th>
                    <th className="num">Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.id} style={{ opacity: v.estado === 'anulada' ? 0.5 : 1 }}>
                      <td style={{ fontWeight: 700, fontFamily: 'Nunito', color: 'var(--nv)' }}>{v.numero}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.fecha}</div>
                        <div style={{ fontSize: 12, color: 'var(--mu)' }}>{v.hora}</div>
                      </td>
                      <td>{v.cliente || <span style={{ color: 'var(--mu2)' }}>—</span>}</td>
                      <td style={{ fontSize: 13 }}>
                        {v.empleado_id
                          ? (empleados.find(e => e.id === v.empleado_id)?.nombre || '—')
                          : <span style={{ color: 'var(--mu2)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{v.metodo_pago || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--mu)' }}>
                        {(v.venta_items || []).length} art.
                      </td>
                      <td className="num" style={{ fontWeight: 800, fontSize: 15, color: v.estado === 'anulada' ? 'var(--rd)' : 'var(--gn)' }}>
                        {fmt(v.total)}
                      </td>
                      <td>{estadoBadge(v.estado)}</td>
                      <td>
                        <button className="bg2 bsm" onClick={() => setTicketDetalle(v)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="num" style={{ fontSize: 12, color: 'var(--mu)' }}>
                      {ventasActivas.length} completada{ventasActivas.length !== 1 ? 's' : ''} · {ventas.length - ventasActivas.length} anulada{ventas.length - ventasActivas.length !== 1 ? 's' : ''}
                    </td>
                    <td className="num" style={{ fontWeight: 800 }}>{fmt(totalVentas)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}

        {tab === 'gastos' && (
          gastos.length === 0 ? (
            <div className="empty"><div className="emj">💸</div><p>No hay gastos registrados en esta caja.</p></div>
          ) : (
            <div className="vtable-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>Detalle</th>
                    <th>Responsable</th>
                    <th>Fecha / Hora</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.detalle || '—'}</td>
                      <td>{g.persona || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--mu)' }}>
                        {g.created_at
                          ? new Date(g.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="num" style={{ fontWeight: 800, color: 'var(--rd)' }}>-{fmt(g.monto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="num" style={{ fontSize: 12, color: 'var(--mu)' }}>Total gastos</td>
                    <td className="num" style={{ fontWeight: 800, color: 'var(--rd)' }}>-{fmt(totalGastos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>

      {ticketDetalle && <TicketDetalle venta={ticketDetalle} onClose={() => setTicketDetalle(null)} />}
    </div>
  )
}
