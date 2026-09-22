import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { imprimirTicket, imprimirTicketBrowser } from '../utils'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
const fmtNum = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Otro']

// Parsea metodo_pago en un mapa {metodo: monto}.
// Single: "Efectivo" → {Efectivo: totalVenta}
// Multi:  "Efectivo $5.000 + Transferencia $3.000" → {Efectivo: 5000, Transferencia: 3000}
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
    // Si la suma del string supera el total real del ticket, escalar proporcionalmente
    if (sumParsed > 0 && Math.abs(sumParsed - totalVenta) > 1) {
      const factor = totalVenta / sumParsed
      Object.keys(result).forEach(k => { result[k] = Math.round(result[k] * factor) })
    }
    return result
  }
  return { [metodo_pago]: totalVenta }
}

function imprimirCierre({ caja, horaCierre, empleado, ticketsCount, totalVentas, totalEfectivo, desglose, gastos, gastosReales, egresosCofre, totalGastosReales, totalEgresosCofre, totalGastos, efectivoEsperado, saldoFinal, diferencia, obs }) {
  // Compatibilidad: si no vienen separados, separar internamente
  if (!gastosReales) {
    gastosReales = (gastos || []).filter(g => !g.detalle?.startsWith('Traspaso al cofre'))
    egresosCofre = (gastos || []).filter(g => g.detalle?.startsWith('Traspaso al cofre'))
    totalGastosReales = gastosReales.reduce((s, g) => s + (g.monto || 0), 0)
    totalEgresosCofre = egresosCofre.reduce((s, g) => s + (g.monto || 0), 0)
  }
  fetch('http://127.0.0.1:5001/print/cierre_caja', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    targetAddressSpace: 'loopback',
    body: JSON.stringify({
      caja,
      horaCierre,
      empleado,
      ticketsCount,
      totalVentas,
      totalEfectivo,
      desglose,
      gastos,
      totalGastos,
      efectivoEsperado,
      saldoFinal,
      saldoInicial: caja.saldo_inicial || 0,
      diferencia,
      obs,
    }),
  }).catch(() => {
    // fallback: impresion browser
    const fmtP = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
    const signo = (n) => n >= 0 ? '+' : ''
    const difColor = diferencia === 0 ? '#16a34a' : diferencia > 0 ? '#d97706' : '#dc2626'
    const totalOnline = totalVentas - totalEfectivo
    const onlineMetodos = Object.keys(desglose).filter(m => m !== 'Efectivo' && desglose[m] > 0)
    const gastosRealesRows = gastosReales.map(g =>
      `<tr><td style="padding:1px 0 1px 12px;color:#555">${g.detalle || '—'}${g.persona ? ` (${g.persona})` : ''}</td><td style="text-align:right;color:#dc2626">−${fmtP(g.monto)}</td></tr>`
    ).join('')
    const egresosCofreRows = egresosCofre.map(g =>
      `<tr><td style="padding:1px 0 1px 12px;color:#555">${g.detalle || '—'}${g.persona ? ` (${g.persona})` : ''}</td><td style="text-align:right;color:#7c3aed">−${fmtP(g.monto)}</td></tr>`
    ).join('')
    const onlineRows = onlineMetodos.map(m =>
      `<tr><td style="padding:1px 0 1px 12px;color:#555">${m}</td><td style="text-align:right">${fmtP(desglose[m])}</td></tr>`
    ).join('')
    const sep = '--------------------------------'; const sep2 = '================================'
    imprimirTicketBrowser(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:8px;color:#000;background:#fff;width:74mm}
h1{font-size:10px;font-weight:bold;text-align:center;white-space:nowrap;margin-bottom:2px}.sub{text-align:center;font-size:8px;margin-bottom:3px}
pre{font-family:inherit;font-size:8px;margin:2px 0;color:#555}table{width:100%;border-collapse:collapse}td{padding:1px 0;vertical-align:top;font-size:8px}
td.r{text-align:right;white-space:nowrap}.section{font-size:8px;font-weight:bold;text-transform:uppercase;margin:3px 0 1px}
.bold td{font-weight:bold}.big td{font-size:9px;font-weight:bold;padding-top:2px}.dif td{font-size:9px;font-weight:bold;color:${difColor}}
.foot{text-align:center;font-size:7px;color:#666;margin-top:4px}</style></head><body>
<h1>CIERRE DE CAJA</h1><div class="sub">Kangaroo Fun</div><pre>${sep2}</pre>
<table><tr><td>Caja</td><td class="r"><b>${caja.nombre||'Caja'}</b></td></tr>
${caja.turno?`<tr><td>Turno</td><td class="r">${caja.turno}</td></tr>`:''}
<tr><td>Fecha</td><td class="r">${caja.fecha||''}</td></tr>
<tr><td>Apertura</td><td class="r">${caja.hora_apertura||'—'} hs</td></tr>
<tr><td>Cierre</td><td class="r">${horaCierre} hs</td></tr>
${caja.empleado_apertura?`<tr><td>Abrió</td><td class="r">${caja.empleado_apertura}</td></tr>`:''}
${empleado?`<tr><td>Cerró</td><td class="r"><b>${empleado}</b></td></tr>`:''}</table>
<pre>${sep}</pre><div class="section">Ventas</div>
<table><tr><td>Tickets</td><td class="r">${ticketsCount}</td></tr>
<tr class="bold"><td>Total ventas</td><td class="r">${fmtP(totalVentas)}</td></tr>
<tr><td>Efectivo</td><td class="r">${fmtP(totalEfectivo)}</td></tr>
<tr><td>Online</td><td class="r">${fmtP(totalOnline)}</td></tr>${onlineRows}</table>
${totalGastosReales>0?`<pre>${sep}</pre><div class="section">Gastos</div><table><tr class="bold"><td>Total gastos</td><td class="r">−${fmtP(totalGastosReales)}</td></tr>${gastosRealesRows}</table>`:''}
${totalEgresosCofre>0?`<pre>${sep}</pre><div class="section">Egresos al cofre</div><table><tr class="bold"><td>Total egresos</td><td class="r" style="color:#7c3aed">−${fmtP(totalEgresosCofre)}</td></tr>${egresosCofreRows}</table>`:''}
<pre>${sep2}</pre><div class="section">Balance</div>
<table><tr><td>Saldo inicial</td><td class="r">${fmtP(caja.saldo_inicial)}</td></tr>
<tr><td>+ Efectivo cobrado</td><td class="r">+${fmtP(totalEfectivo)}</td></tr>
${totalGastosReales>0?`<tr><td>− Gastos</td><td class="r">−${fmtP(totalGastosReales)}</td></tr>`:''}
${totalEgresosCofre>0?`<tr><td>− Egresos cofre</td><td class="r">−${fmtP(totalEgresosCofre)}</td></tr>`:''}
<tr class="big"><td>Total teorico</td><td class="r">${fmtP(efectivoEsperado)}</td></tr>
<tr class="big"><td>Total real</td><td class="r">${fmtP(saldoFinal)}</td></tr>
<tr class="dif"><td>Diferencia</td><td class="r">${signo(diferencia)}${fmtP(diferencia)}</td></tr></table>
<pre>${sep2}</pre><div class="foot">${new Date().toLocaleString('es-AR')}</div></body></html>`)
  })
}

function imprimirEgresoCofre({ monto, persona, obs, cajaNombre }) {
  const ahora = new Date()
  const fecha = ahora.toLocaleDateString('es-AR')
  const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const f = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:8px;width:74mm}
h1{font-size:10px;font-weight:bold;text-align:center;margin-bottom:2px}
.sub{text-align:center;font-size:8px;margin-bottom:3px}
table{width:100%;border-collapse:collapse}td{padding:1px 0;font-size:8px;vertical-align:top}
.sep{letter-spacing:0;font-size:8px;margin:2px 0}
.total td{font-size:10px;font-weight:bold;border-top:1px solid #000;padding-top:2px}
.foot{text-align:center;font-size:7px;color:#666;margin-top:4px}
</style></head><body>
<h1>EGRESO AL COFRE</h1>
<div class="sub">Kangaroo Fun — ${cajaNombre || 'Caja'}</div>
<pre class="sep">--------------------------------</pre>
<table>
<tr><td>Fecha</td><td style="text-align:right">${fecha} ${hora}</td></tr>
<tr><td>Responsable</td><td style="text-align:right"><b>${persona || '—'}</b></td></tr>
</table>
<pre class="sep">--------------------------------</pre>
<table>
<tr class="total"><td>MONTO EGRESADO</td><td style="text-align:right">${f(monto)}</td></tr>
</table>
${obs ? `<pre class="sep">--------------------------------</pre><p style="font-size:7px;margin-top:2px">Obs: ${obs}</p>` : ''}
<pre class="sep">--------------------------------</pre>
<p style="font-size:7px;margin-top:6px">Firma: ___________________________</p>
<div class="foot">Recibo de egreso al cofre</div>
</body></html>`
  fetch('http://127.0.0.1:5001/print/egreso_cofre', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    targetAddressSpace: 'loopback',
    body: JSON.stringify({ monto, persona, obs, cajaNombre }),
  }).then(r => {
    if (!r.ok) imprimirTicketBrowser(html)
  }).catch(() => {
    imprimirTicketBrowser(html)
  })
}

function ticketVentaHtml(venta) {
  const f = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
  const items = (venta.venta_items || []).map(it =>
    `<tr><td>${it.nombre_producto} ×${it.cantidad}</td><td style="text-align:right">${f(it.subtotal)}</td></tr>`
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
<tr><td>Pago</td><td style="text-align:right">${venta.metodo_pago || '—'}</td></tr>
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
          <div className="dm-row"><span className="dm-label">Método de pago</span><span className="dm-val">{venta.metodo_pago || '—'}</span></div>
          <div className="sdv" style={{ marginTop: 14 }}>Artículos</div>
          {(venta.venta_items || []).map((it, i) => (
            <div key={i} className="dm-row">
              <span className="dm-label">{it.nombre_producto} ×{it.cantidad}</span>
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
          <button className="bp" onClick={() => { imprimirVentaCaja(venta) }}>🖨 Imprimir</button>
        </div>
      </div>
    </div>
  )
}

function CajaCard({ caja, ventas, ventasLoading = false, gastos = [], empleados = [], onCerrar, onAddGasto, onAddCofreIngreso, onRefresh, addToast, askPin }) {
  const [cerrando, setCerrando] = useState(false)
  const [saldoFinal, setSaldoFinal] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [verTickets, setVerTickets] = useState(false)
  const [ticketDetalle, setTicketDetalle] = useState(null)
  const [showGastos, setShowGastos] = useState(false)
  const [showCofre, setShowCofre] = useState(false)
  const [verGastos, setVerGastos] = useState(false)
  // Gasto form
  const [empleadoCierre, setEmpleadoCierre] = useState('')
  const [gastoMonto, setGastoMonto] = useState('')
  const [gastoDetalle, setGastoDetalle] = useState('')
  const [gastoPersona, setGastoPersona] = useState('')
  // Cofre form
  const [cofreMonto, setCofreMonto] = useState('')
  const [cofrePersona, setCofrePersona] = useState('')
  const [cofreObs, setCofreObs] = useState('')

  // Actualizar ventas al abrir el módulo y cada 30 segundos (para capturar ventas del POS en otra pestaña)
  // Usa ref para evitar loop infinito cuando onRefresh es una función inline
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => { onRefreshRef.current = onRefresh })
  useEffect(() => {
    onRefreshRef.current?.()
    const interval = setInterval(() => onRefreshRef.current?.(), 30000)
    return () => clearInterval(interval)
  }, [])

  const ventasCaja = useMemo(() =>
    ventas.filter(v => v.caja_id === caja.id && v.estado !== 'anulada'),
    [ventas, caja.id]
  )

  const totalVentas = ventasCaja.reduce((s, v) => s + (v.total || 0), 0)
  const gastosReales = gastos.filter(g => !g.detalle?.startsWith('Traspaso al cofre'))
  const egresosCofre = gastos.filter(g => g.detalle?.startsWith('Traspaso al cofre'))
  const totalGastosReales = gastosReales.reduce((s, g) => s + (g.monto || 0), 0)
  const totalEgresosCofre = egresosCofre.reduce((s, g) => s + (g.monto || 0), 0)
  const totalGastos = totalGastosReales + totalEgresosCofre

  const desglose = useMemo(() => {
    const map = {}
    ventasCaja.forEach(v => {
      const metodos = parsearMetodos(v.metodo_pago, v.total || 0)
      Object.entries(metodos).forEach(([met, monto]) => {
        map[met] = (map[met] || 0) + monto
      })
    })
    return map
  }, [ventasCaja])

  const totalEfectivo = desglose['Efectivo'] || 0
  const efectivoEsperado = (caja.saldo_inicial || 0) + totalEfectivo - totalGastos

  const diferencia = saldoFinal !== '' ? (parseFloat(saldoFinal) || 0) - efectivoEsperado : null

  async function handleCerrar() {
    const sf = parseFloat(saldoFinal)
    if (isNaN(sf) || sf < 0) { addToast('Ingresá el efectivo contado en caja', 'err'); return }
    if (!empleadoCierre) { addToast('Seleccioná el empleado que realiza el cierre', 'err'); return }
    askPin(`Cerrar caja "${caja.nombre || 'Caja'}"${caja.turno ? ` (${caja.turno})` : ''} — efectivo contado: $${sf}.`, async () => {
      setSaving(true)
      const horaCierre = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      try {
        await onCerrar({ cajaId: caja.id, saldo_final: sf, obs_cierre: obs, total_ventas: totalVentas, total_efectivo: totalEfectivo, empleado_cierre: empleadoCierre })
        addToast(`✓ Caja "${caja.nombre || ''}" cerrada`)
        imprimirCierre({
          gastosReales,
          egresosCofre,
          totalGastosReales,
          totalEgresosCofre,
          caja,
          horaCierre,
          empleado: empleadoCierre,
          ticketsCount: ventasCaja.length,
          totalVentas,
          totalEfectivo,
          desglose,
          gastos,
          totalGastos,
          efectivoEsperado,
          saldoFinal: sf,
          diferencia: sf - efectivoEsperado,
          obs,
        })
      } catch (e) { addToast('Error: ' + e.message, 'err') }
      finally { setSaving(false) }
    })
  }

  function handleAddGasto() {
    const m = parseFloat(gastoMonto)
    if (!m || m <= 0) { addToast('Ingresá un monto válido', 'err'); return }
    if (!gastoDetalle.trim()) { addToast('Ingresá el detalle del gasto', 'err'); return }
    if (!gastoPersona) { addToast('Indicá quién realiza el gasto', 'err'); return }
    if (m > efectivoEsperado) { addToast(`El monto supera el efectivo disponible en caja (${fmt(efectivoEsperado)})`, 'err'); return }
    askPin(`Gasto en caja "${caja.nombre || 'Caja'}": $${m} — "${gastoDetalle.trim()}" — responsable: ${gastoPersona.trim()}.`, async () => {
      try {
        await onAddGasto({ caja_id: caja.id, monto: m, detalle: gastoDetalle.trim(), persona: gastoPersona.trim() })
        setGastoMonto(''); setGastoDetalle(''); setGastoPersona('')
        addToast('✓ Gasto registrado')
      } catch (e) { addToast('Error: ' + e.message, 'err') }
    })
  }

  function handleTraspasarCofre() {
    const m = parseFloat(cofreMonto)
    if (!m || m <= 0) { addToast('Ingresá un monto válido', 'err'); return }
    if (!cofrePersona) { addToast('Indicá quién realiza el traspaso', 'err'); return }
    if (m > efectivoEsperado) { addToast(`El monto supera el efectivo disponible en caja (${fmt(efectivoEsperado)})`, 'err'); return }
    askPin(`Traspaso al cofre desde "${caja.nombre || 'Caja'}": $${m} — responsable: ${cofrePersona.trim()}.`, async () => {
      try {
        const obsText = cofreObs.trim()
        await onAddCofreIngreso({ tipo: 'ingreso', monto: m, persona: cofrePersona.trim(), obs: obsText || `Traspaso desde ${caja.nombre || 'Caja'}` })
        await onAddGasto({ caja_id: caja.id, monto: m, detalle: `Traspaso al cofre${obsText ? ': ' + obsText : ''}`, persona: cofrePersona.trim() })
        imprimirEgresoCofre({ monto: m, persona: cofrePersona.trim(), obs: obsText, cajaNombre: caja.nombre })
        setCofreMonto(''); setCofrePersona(''); setCofreObs('')
        setShowCofre(false)
        addToast('✓ Traspaso al cofre registrado')
      } catch (e) { addToast('Error: ' + e.message, 'err') }
    })
  }

  return (
    <div className="cc" style={{ borderTop: '3px solid var(--gn)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--nv)', fontFamily: 'Nunito, sans-serif' }}>
              {caja.nombre || 'Caja'}
            </span>
            {caja.turno && (
              <span style={{ fontSize: 12, background: 'var(--nv3)', color: 'var(--nv)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
                {caja.turno}
              </span>
            )}
            <span className="badge bpd">● Abierta</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>
            {caja.fecha} · apertura {caja.hora_apertura} hs{caja.empleado_apertura ? ` · ${caja.empleado_apertura}` : ''} · saldo inicial {fmt(caja.saldo_inicial)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="bg2 bsm" onClick={() => setVerTickets(!verTickets)}>
            {verTickets ? '▲ Ocultar tickets' : `🧾 Ver tickets (${ventasLoading ? '...' : ventasCaja.length})`}
          </button>
          {gastos.length > 0 && (
            <button className="bg2 bsm" onClick={() => setVerGastos(f => !f)}>
              {verGastos ? '▲ Ocultar gastos' : `💸 Ver gastos (${gastos.length})`}
            </button>
          )}
          <button className="bg2 bsm" onClick={() => { setShowGastos(f => !f); setShowCofre(false) }}>
            {showGastos ? '✕ Cancelar gasto' : '🧾 Registrar gasto'}
          </button>
          <button className="bg2 bsm" onClick={() => { setShowCofre(f => !f); setShowGastos(false) }}>
            {showCofre ? '✕ Cancelar traspaso' : '🔒 Traspasar al cofre'}
          </button>
          <button className="bg2 bsm" onClick={() => { if (onRefresh) onRefresh() }} title="Actualizar ventas (incluye ventas del POS)">
            🔄 Actualizar
          </button>
          <button className="bg2 bsm" onClick={() => setCerrando(!cerrando)}>
            {cerrando ? '✕ Cancelar' : '🔐 Cerrar caja'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Resumen</div>
          <div className="li"><span className="lin">Tickets registrados</span><span className="lis">{ventasLoading ? '...' : ventasCaja.length}</span></div>
          <div className="li"><span className="lin">Total facturado</span><span className="lip">{ventasLoading ? '...' : fmt(totalVentas)}</span></div>
          {totalGastosReales > 0 && (
            <div className="li"><span className="lin">Gastos</span><span style={{ fontWeight: 700, color: 'var(--rd)' }}>−{fmt(totalGastosReales)}</span></div>
          )}
          {totalEgresosCofre > 0 && (
            <div className="li"><span className="lin">Egresos al cofre</span><span style={{ fontWeight: 700, color: 'var(--rd)' }}>−{fmt(totalEgresosCofre)}</span></div>
          )}
          <div className="li"><span className="lin">Efectivo esperado en caja</span><span className="lip">{fmt(efectivoEsperado)}</span></div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Por método de pago</div>
          {Object.keys(desglose).length === 0
            ? <p style={{ fontSize: 13, color: 'var(--mu2)', padding: '8px 0' }}>Sin ventas aún</p>
            : (() => {
              const totalOnline = totalVentas - totalEfectivo
              const onlineKeys = Object.keys(desglose).filter(m => m !== 'Efectivo' && desglose[m] > 0)
              return <>
                <div className="li">
                  <span className="lin" style={{ fontWeight: 700 }}>Efectivo</span>
                  <span className="lip" style={{ fontWeight: 700 }}>{fmt(totalEfectivo)}</span>
                </div>
                {totalOnline > 0 && (
                  <div className="li" style={{ marginTop: 4 }}>
                    <span className="lin" style={{ fontWeight: 700 }}>Online</span>
                    <span className="lip" style={{ fontWeight: 700 }}>{fmt(totalOnline)}</span>
                  </div>
                )}
                {onlineKeys.map(m => (
                  <div key={m} className="li" style={{ paddingLeft: 12 }}>
                    <span className="lin" style={{ fontSize: 13, color: 'var(--mu)' }}>{m}</span>
                    <span className="lip" style={{ fontSize: 13, color: 'var(--mu)' }}>{fmt(desglose[m])}</span>
                  </div>
                ))}
              </>
            })()
          }
        </div>
      </div>

      {/* ── DETALLE GASTOS ── */}
      {verGastos && gastos.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Gastos registrados en esta caja
          </div>
          <div className="vtable-wrap">
            <table className="vtable">
              <thead>
                <tr>
                  <th>Detalle</th>
                  <th>Responsable</th>
                  <th style={{ fontSize: 11 }}>Fecha / Hora</th>
                  <th className="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.detalle || '—'}</td>
                    <td>{g.persona || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--mu)' }}>
                      {g.created_at ? new Date(g.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="num" style={{ fontWeight: 800, color: 'var(--rd)' }}>−{fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="num" style={{ fontSize: 12 }}>Total gastos</td>
                  <td className="num" style={{ fontWeight: 800, color: 'var(--rd)' }}>−{fmt(totalGastos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── FORM GASTO ── */}
      {showGastos && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Registrar gasto desde caja
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="fgg">
              <label>Monto $</label>
              <input type="number" min="0" value={gastoMonto} onChange={e => setGastoMonto(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div className="fgg">
              <label>Detalle del gasto</label>
              <input type="text" value={gastoDetalle} onChange={e => setGastoDetalle(e.target.value)} placeholder="Ej: Bolsas, limpieza, etc." />
            </div>
            <div className="fgg">
              <label>Responsable</label>
              <select value={gastoPersona} onChange={e => setGastoPersona(e.target.value)}>
                <option value="">Seleccionar...</option>
                {empleados.filter(e => e.activo !== false).map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
          </div>
          <button className="bp" style={{ background: 'var(--am)', borderColor: 'var(--am)' }} onClick={handleAddGasto}>
            ✓ Registrar gasto
          </button>
        </div>
      )}

      {/* ── FORM TRASPASO COFRE ── */}
      {showCofre && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Traspasar efectivo al cofre
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="fgg">
              <label>Monto a traspasar $</label>
              <input type="number" min="0" value={cofreMonto} onChange={e => setCofreMonto(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div className="fgg">
              <label>Responsable del traspaso</label>
              <select value={cofrePersona} onChange={e => setCofrePersona(e.target.value)}>
                <option value="">Seleccionar...</option>
                {empleados.filter(e => e.activo !== false).map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="fgg">
              <label>Observaciones</label>
              <input type="text" value={cofreObs} onChange={e => setCofreObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <button className="bp" style={{ background: 'var(--nv)', borderColor: 'var(--nv)' }} onClick={handleTraspasarCofre}>
            🔒 Confirmar traspaso al cofre
          </button>
        </div>
      )}

      {verTickets && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Tickets de esta caja
          </div>
          {ventasCaja.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--mu2)' }}>Sin ventas registradas aún.</p>
          ) : (
            <div className="vtable-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>N° Ticket</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th>Items</th>
                    <th className="num">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventasCaja.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700, color: 'var(--nv)', fontFamily: 'Nunito' }}>{v.numero}</td>
                      <td style={{ fontSize: 12, color: 'var(--mu)' }}>{v.hora}</td>
                      <td>{v.cliente || <span style={{ color: 'var(--mu2)' }}>—</span>}</td>
                      <td style={{ fontSize: 13 }}>{v.metodo_pago || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--mu)' }}>{(v.venta_items || []).length} art.</td>
                      <td className="num" style={{ fontWeight: 800, color: 'var(--gn)' }}>{fmt(v.total)}</td>
                      <td>
                        <button className="bg2 bsm" onClick={() => setTicketDetalle(v)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="num" style={{ fontSize: 12 }}>Total</td>
                    <td className="num">{fmt(totalVentas)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {ticketDetalle && <TicketDetalle venta={ticketDetalle} onClose={() => setTicketDetalle(null)} />}

      {cerrando && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--bd)', paddingTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 12 }}>
            Contá el efectivo físico en caja e ingresalo para verificar diferencias.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="fgg">
              <label>Empleado que cierra</label>
              <select value={empleadoCierre} onChange={e => setEmpleadoCierre(e.target.value)} autoFocus>
                <option value="">Seleccionar...</option>
                {empleados.filter(e => e.activo !== false).map(e => (
                  <option key={e.id} value={e.nombre}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div className="fgg">
              <label>Efectivo contado en caja $</label>
              <input type="number" min="0" step="0.01" value={saldoFinal}
                onChange={e => setSaldoFinal(e.target.value)} placeholder="0" />
            </div>
            <div className="fgg">
              <label>Observaciones de cierre</label>
              <input type="text" value={obs} onChange={e => setObs(e.target.value)}
                placeholder="Novedades, diferencias, detalles..." />
            </div>
          </div>
          {diferencia !== null && (
            <div style={{
              background: diferencia === 0 ? 'var(--gnb)' : diferencia > 0 ? 'var(--amb)' : 'var(--rdb)',
              border: `1px solid ${diferencia === 0 ? 'var(--gn)' : diferencia > 0 ? 'var(--am)' : 'var(--rd)'}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              color: diferencia === 0 ? 'var(--gn)' : diferencia > 0 ? 'var(--am)' : 'var(--rd)',
              fontWeight: 700, fontSize: 14
            }}>
              {diferencia === 0 ? '✓ Sin diferencias' :
                diferencia > 0 ? `⬆ Sobrante: ${fmt(Math.abs(diferencia))}` :
                  `⬇ Faltante: ${fmt(Math.abs(diferencia))}`}
            </div>
          )}
          <button
            className="bp"
            style={{ background: 'var(--rd)', borderColor: 'var(--rd)', width: '100%' }}
            onClick={handleCerrar}
            disabled={saving}
          >
            {saving ? 'Cerrando...' : `🔐 Confirmar cierre de "${caja.nombre || 'Caja'}"`}
          </button>
        </div>
      )}
    </div>
  )
}

function CajaHistorialModal({ caja, ventas: ventasCaja, gastos = [], empleados = [], onAnularVenta, onModificarVenta, onClose }) {
  const [ticketDetalle, setTicketDetalle] = useState(null)
  const [tab, setTab] = useState('tickets')

  const ventasActivas = ventasCaja.filter(v => v.estado !== 'anulada')

  const gastosReales = gastos.filter(g => !g.detalle?.startsWith('Traspaso al cofre'))
  const egresosCofre = gastos.filter(g => g.detalle?.startsWith('Traspaso al cofre'))
  const totalGastosReales = gastosReales.reduce((s, g) => s + (g.monto || 0), 0)
  const totalEgresosCofre = egresosCofre.reduce((s, g) => s + (g.monto || 0), 0)
  const totalGastos = totalGastosReales + totalEgresosCofre

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

  const estadoBadge = (estado) => {
    if (estado === 'anulada') return <span className="badge bnp">Anulada</span>
    return <span className="badge bpd">Completada</span>
  }

  const tabStyle = (id) => ({
    padding: '8px 18px', fontSize: 13, fontWeight: 700,
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: `3px solid ${tab === id ? 'var(--nv)' : 'transparent'}`,
    color: tab === id ? 'var(--nv)' : 'var(--mu)',
    marginBottom: -1, fontFamily: 'Nunito, sans-serif',
  })

  return (
    <div className="ov op" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mo" style={{ maxWidth: 980, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">🏪</div>
            <span>{caja.nombre || 'Caja'}</span>
            {caja.turno && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mu)', marginLeft: 8 }}>· {caja.turno}</span>}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mu)', marginLeft: 8 }}>— {caja.fecha}</span>
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        {/* Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '14px 0 18px' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Resumen</div>
            <div className="li"><span className="lin">Apertura / Cierre</span><span className="lis">{caja.hora_apertura} — {caja.hora_cierre} hs</span></div>
            {caja.empleado_apertura && <div className="li"><span className="lin">Abrió</span><span className="lis">{caja.empleado_apertura}</span></div>}
            {caja.empleado_cierre && <div className="li"><span className="lin">Cerró</span><span className="lis">{caja.empleado_cierre}</span></div>}
            <div className="li"><span className="lin">Saldo inicial</span><span className="lis">{fmt(caja.saldo_inicial)}</span></div>
            <div className="li"><span className="lin">Total ventas</span><span className="lip">{fmt(caja.total_ventas)}</span></div>
            {totalGastosReales > 0 && <div className="li"><span className="lin">Gastos</span><span style={{ fontWeight: 700, color: 'var(--rd)' }}>−{fmt(totalGastosReales)}</span></div>}
            {totalEgresosCofre > 0 && <div className="li"><span className="lin">Egresos al cofre</span><span style={{ fontWeight: 700, color: 'var(--rd)' }}>−{fmt(totalEgresosCofre)}</span></div>}
            <div className="li"><span className="lin">Efectivo contado</span><span className="lip">{fmt(caja.saldo_final)}</span></div>
            {caja.obs_cierre && <div className="li"><span className="lin">Obs. cierre</span><span className="lis" style={{ fontStyle: 'italic' }}>{caja.obs_cierre}</span></div>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Por método de pago</div>
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
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bd)', marginBottom: 16 }}>
          <button style={tabStyle('tickets')} onClick={() => setTab('tickets')}>
            Tickets ({ventasCaja.length})
          </button>
          <button style={tabStyle('gastos')} onClick={() => setTab('gastos')}>
            Gastos ({gastos.length})
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'tickets' && (
            ventasCaja.length === 0 ? (
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
                      <th>Método</th>
                      <th>Items</th>
                      <th className="num">Total</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasCaja.map(v => (
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
                          <div className="eact">
                            <button className="bg2 bsm" onClick={() => setTicketDetalle(v)}>Ver</button>
                            {v.estado !== 'anulada' && onModificarVenta && (
                              <button className="bg2 bsm" onClick={() => onModificarVenta(v)}>Modificar</button>
                            )}
                            {v.estado !== 'anulada' && onAnularVenta && (
                              <button className="bdng" onClick={() => onAnularVenta(v.id)}>Anular</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="num" style={{ fontSize: 12, color: 'var(--mu)' }}>
                        {ventasActivas.length} completada{ventasActivas.length !== 1 ? 's' : ''} · {ventasCaja.length - ventasActivas.length} anulada{ventasCaja.length - ventasActivas.length !== 1 ? 's' : ''}
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
                        <td className="num" style={{ fontWeight: 800, color: 'var(--rd)' }}>−{fmt(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="num" style={{ fontSize: 12, color: 'var(--mu)' }}>Total gastos</td>
                      <td className="num" style={{ fontWeight: 800, color: 'var(--rd)' }}>−{fmt(totalGastos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--bd)' }}>
          <button className="bg2" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      {ticketDetalle && <TicketDetalle venta={ticketDetalle} onClose={() => setTicketDetalle(null)} />}
    </div>
  )
}

export default function Caja({ cajasAbiertas, historial, loading, ventas, gastos = [], empleados = [], onAbrir, onCerrar, onAddGasto, onAddCofreIngreso, onAnularVenta, onModificarVenta, onRefreshVentas, fetchVentasByCaja, addToast, askPin }) {
  const [nombre, setNombre] = useState('')
  const [turno, setTurno] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [saldoSugerido, setSaldoSugerido] = useState(null)
  const [empleadoApertura, setEmpleadoApertura] = useState('')
  const [saving, setSaving] = useState(false)
  const [histExpanded, setHistExpanded] = useState({})
  const [ventasPorCaja, setVentasPorCaja] = useState({})
  const [loadingCaja, setLoadingCaja] = useState({})

  // Cargar ventas de cada caja abierta por caja_id (sin filtro de fecha)
  // para que cajas de días anteriores muestren sus tickets correctamente
  useEffect(() => {
    if (!cajasAbiertas.length || !fetchVentasByCaja) return
    cajasAbiertas.forEach(async (c) => {
      setLoadingCaja(prev => ({ ...prev, [c.id]: true }))
      const data = await fetchVentasByCaja(c.id)
      setVentasPorCaja(prev => ({ ...prev, [c.id]: data }))
      setLoadingCaja(prev => ({ ...prev, [c.id]: false }))
    })
  }, [cajasAbiertas, fetchVentasByCaja])

  // Auto-fill saldo inicial con el último cierre de la misma caja
  const buscarUltimoCierre = useCallback((nombreCaja) => {
    if (!nombreCaja.trim() || !historial.length) { setSaldoSugerido(null); return }
    const norm = nombreCaja.trim().toLowerCase()
    const ultimo = historial.find(c => (c.nombre || '').toLowerCase() === norm && c.saldo_final != null)
    if (ultimo) {
      setSaldoInicial(String(ultimo.saldo_final))
      setSaldoSugerido(ultimo.saldo_final)
    } else {
      setSaldoSugerido(null)
    }
  }, [historial])

  const loadVentasCaja = useCallback(async (cajaId) => {
    setLoadingCaja(prev => ({ ...prev, [cajaId]: true }))
    const data = await fetchVentasByCaja(cajaId)
    setVentasPorCaja(prev => ({ ...prev, [cajaId]: data }))
    setLoadingCaja(prev => ({ ...prev, [cajaId]: false }))
    return data
  }, [fetchVentasByCaja])

  async function handleAbrir() {
    if (!nombre) {
      addToast('Seleccioná el nombre de la caja', 'err')
      return
    }
    if (!empleadoApertura) {
      addToast('Seleccioná el empleado que abre la caja', 'err')
      return
    }
    if (saldoInicial === '' || isNaN(parseFloat(saldoInicial)) || parseFloat(saldoInicial) < 0) {
      addToast('Ingresá un saldo inicial válido (puede ser 0)', 'err')
      return
    }
    setSaving(true)
    try {
      await onAbrir({ saldo_inicial: parseFloat(saldoInicial), nombre: nombre.trim() || 'Caja', turno: turno.trim(), empleado_apertura: empleadoApertura })
      setNombre(''); setTurno(''); setSaldoInicial(''); setSaldoSugerido(null); setEmpleadoApertura('')
      addToast('✓ Caja abierta correctamente')
    } catch (e) { addToast('Error: ' + e.message, 'err') }
    finally { setSaving(false) }
  }

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">Caja</div>
          <div className="ps">
            {loading ? 'Cargando...' : cajasAbiertas.length === 0
              ? 'Sin cajas abiertas'
              : `${cajasAbiertas.length} caja${cajasAbiertas.length > 1 ? 's' : ''} abierta${cajasAbiertas.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty"><div className="emj">⏳</div><p>Cargando...</p></div>
      ) : (
        <>
          {/* ── ABRIR NUEVA CAJA ── */}
          <div className="cc" style={{ marginBottom: 24 }}>
            <div className="ct"><div className="ct-icon">🔓</div>Abrir nueva caja</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="fgg">
                <label>Nombre de la caja</label>
                <select value={nombre} onChange={e => { setNombre(e.target.value); buscarUltimoCierre(e.target.value) }}>
                  <option value="">Seleccionar...</option>
                  <option value="Buffet">Buffet</option>
                  <option value="Caja 1">Caja 1</option>
                  <option value="Caja 2">Caja 2</option>
                </select>
              </div>
              <div className="fgg">
                <label>Turno</label>
                <select value={turno} onChange={e => setTurno(e.target.value)}>
                  <option value="">Sin turno</option>
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
              <div className="fgg">
                <label>Empleado</label>
                <select value={empleadoApertura} onChange={e => setEmpleadoApertura(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {empleados.filter(e => e.activo !== false).map(e => (
                    <option key={e.id} value={e.nombre}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="fgg">
                <label>Saldo inicial en efectivo $</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saldoInicial}
                  onChange={e => { setSaldoInicial(e.target.value); setSaldoSugerido(null) }}
                  placeholder="0"
                  onKeyDown={e => e.key === 'Enter' && handleAbrir()}
                />
                {saldoSugerido != null && <small style={{ color: '#10b981', marginTop: 4 }}>Último cierre contado: {fmt(saldoSugerido)}</small>}
              </div>
            </div>
            <button className="bp" onClick={handleAbrir} disabled={saving}>
              {saving ? 'Abriendo...' : '🔓 Abrir caja'}
            </button>
          </div>

          {/* ── CAJAS ABIERTAS ── */}
          {cajasAbiertas.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="sdv">Cajas abiertas ({cajasAbiertas.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cajasAbiertas.map(c => {
                  const ventasReady = ventasPorCaja[c.id] !== undefined
                  const isLoading = loadingCaja[c.id]
                  return (
                    <CajaCard
                      key={c.id} caja={c}
                      ventas={ventasPorCaja[c.id] || []}
                      ventasLoading={!ventasReady || isLoading}
                      gastos={gastos.filter(g => g.caja_id === c.id)}
                      empleados={empleados}
                      onCerrar={onCerrar} onAddGasto={onAddGasto} onAddCofreIngreso={onAddCofreIngreso}
                      onRefresh={async () => {
                        if (onRefreshVentas) onRefreshVentas()
                        if (fetchVentasByCaja) {
                          const data = await fetchVentasByCaja(c.id)
                          setVentasPorCaja(prev => ({ ...prev, [c.id]: data }))
                        }
                      }}
                      addToast={addToast} askPin={askPin}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* ── HISTORIAL ── */}
          {historial.length > 0 && (
            <div>
              <div className="sdv">Historial de cajas cerradas</div>
              <div className="vtable-wrap">
                <table className="vtable">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Turno</th>
                      <th>Fecha</th>
                      <th>Apertura</th>
                      <th>Cierre</th>
                      <th className="num">Saldo inicial</th>
                      <th className="num">Total ventas</th>
                      <th className="num">Efect. esperado</th>
                      <th className="num">Contado</th>
                      <th className="num">Diferencia</th>
                      <th>Responsable</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(c => {
                      const gastosCaja = gastos.filter(g => g.caja_id === c.id)
                      const gastosRealesCaja = gastosCaja.filter(g => !g.detalle?.startsWith('Traspaso al cofre'))
                      const egresosCofrecaja = gastosCaja.filter(g => g.detalle?.startsWith('Traspaso al cofre'))
                      const totalGastosRealesCaja = gastosRealesCaja.reduce((s, g) => s + (g.monto || 0), 0)
                      const totalEgresosCofreCaja = egresosCofrecaja.reduce((s, g) => s + (g.monto || 0), 0)
                      const totalGastosCaja = totalGastosRealesCaja + totalEgresosCofreCaja
                      const esperado = (c.saldo_inicial || 0) + (c.total_efectivo || 0) - totalGastosCaja
                      const diff = (c.saldo_final || 0) - esperado
                      const expanded = histExpanded[c.id]
                      const ventasCargadas = ventasPorCaja[c.id]
                      return (
                        <React.Fragment key={c.id}>
                          <tr>
                            <td style={{ fontWeight: 600 }}>{c.nombre || '—'}</td>
                            <td style={{ color: 'var(--mu)' }}>{c.turno || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{c.fecha}</td>
                            <td>{c.hora_apertura}</td>
                            <td>{c.hora_cierre}</td>
                            <td className="num">{fmt(c.saldo_inicial)}</td>
                            <td className="num" style={{ color: 'var(--gn)', fontWeight: 700 }}>{fmt(c.total_ventas)}</td>
                            <td className="num">{fmt(esperado)}</td>
                            <td className="num">{fmt(c.saldo_final)}</td>
                            <td className="num" style={{
                              fontWeight: 700,
                              color: diff === 0 ? 'var(--gn)' : diff > 0 ? 'var(--am)' : 'var(--rd)'
                            }}>
                              {diff >= 0 ? '+' : ''}{fmt(diff)}
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--mu)', fontWeight: c.empleado_cierre ? 600 : 400 }}>
                              {c.empleado_cierre || '—'}
                            </td>
                            <td style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                              <button
                                className="bp bsm"
                                onClick={() => window.open(`/?mode=caja&id=${c.id}`, '_blank')}
                              >
                                Abrir
                              </button>
                              <button
                                className="bg2 bsm"
                                onClick={() => {
                                  const next = !histExpanded[c.id]
                                  setHistExpanded(prev => ({ ...prev, [c.id]: next }))
                                  if (next && !ventasPorCaja[c.id]) loadVentasCaja(c.id)
                                }}
                              >
                                {expanded ? '▲' : '▼'}
                              </button>
                              <button
                                className="bg2 bsm"
                                title="Reimprimir ticket de cierre"
                                onClick={async () => {
                                  const ventasData = ventasPorCaja[c.id] || await loadVentasCaja(c.id)
                                  const ventasCerrada = ventasData.filter(v => v.estado !== 'anulada')
                                  const desglose = {}
                                  ventasCerrada.forEach(v => {
                                    const metodos = parsearMetodos(v.metodo_pago, v.total || 0)
                                    Object.entries(metodos).forEach(([met, monto]) => {
                                      desglose[met] = (desglose[met] || 0) + monto
                                    })
                                  })
                                  imprimirCierre({
                                    caja: c,
                                    horaCierre: c.hora_cierre || '—',
                                    empleado: c.empleado_cierre || '',
                                    ticketsCount: ventasCerrada.length,
                                    totalVentas: c.total_ventas || 0,
                                    totalEfectivo: c.total_efectivo || 0,
                                    desglose,
                                    gastos: gastosCaja,
                                    gastosReales: gastosRealesCaja,
                                    egresosCofre: egresosCofrecaja,
                                    totalGastosReales: totalGastosRealesCaja,
                                    totalEgresosCofre: totalEgresosCofreCaja,
                                    totalGastos: totalGastosCaja,
                                    efectivoEsperado: esperado,
                                    saldoFinal: c.saldo_final || 0,
                                    diferencia: diff,
                                    obs: c.obs_cierre || '',
                                  })
                                }}
                              >
                                🖨
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={12} style={{ background: 'var(--bg)', padding: '14px 20px' }}>
                                {loadingCaja[c.id] ? (
                                  <span style={{ fontSize: 13, color: 'var(--mu)' }}>Cargando desglose...</span>
                                ) : ventasCargadas ? (() => {
                                  const ventasCerrada = ventasCargadas.filter(v => v.estado !== 'anulada')
                                  const desglose = {}
                                  ventasCerrada.forEach(v => {
                                    const metodos = parsearMetodos(v.metodo_pago, v.total || 0)
                                    Object.entries(metodos).forEach(([met, monto]) => {
                                      desglose[met] = (desglose[met] || 0) + monto
                                    })
                                  })
                                  return (
                                    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                                      <div>
                                        <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                                          Por método de pago
                                        </div>
                                        {Object.keys(desglose).length === 0
                                          ? <span style={{ fontSize: 13, color: 'var(--mu2)' }}>Sin ventas en esta caja</span>
                                          : Object.keys(desglose).map(m => (
                                            <div key={m} style={{ display: 'flex', gap: 20, marginBottom: 5 }}>
                                              <span style={{ fontSize: 13, color: 'var(--mu)', minWidth: 170 }}>{m}</span>
                                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nv)' }}>{fmt(desglose[m])}</span>
                                            </div>
                                          ))
                                        }
                                        <div style={{ marginTop: 8, borderTop: '1px solid var(--bd)', paddingTop: 8 }}>
                                          <div style={{ display: 'flex', gap: 20 }}>
                                            <span style={{ fontSize: 13, color: 'var(--mu)', minWidth: 170, fontWeight: 700 }}>Total tickets: {ventasCerrada.length}</span>
                                          </div>
                                        </div>
                                      </div>
                                      {c.obs_cierre && (
                                        <div>
                                          <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                                            Observaciones de cierre
                                          </div>
                                          <span style={{ fontSize: 13, color: 'var(--tx)' }}>{c.obs_cierre}</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })() : <span style={{ fontSize: 13, color: 'var(--mu)' }}>Cargando...</span>}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}
