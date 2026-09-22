import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Chart, registerables } from 'chart.js'
import { fmt, downloadCSV } from '../utils'

const PRINT_URL = 'http://127.0.0.1:5001/print/cierre'

Chart.register(...registerables)

const pad = n => String(n).padStart(2, '0')

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function setRango(r) {
  const now = new Date()
  const fmt2 = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  let desde, hasta = fmt2(now)
  if (r === 'mes') {
    desde = fmt2(new Date(now.getFullYear(), now.getMonth(), 1))
  } else if (r === '3m') {
    const d = new Date(now); d.setMonth(d.getMonth() - 2); d.setDate(1); desde = fmt2(d)
  } else if (r === '6m') {
    const d = new Date(now); d.setMonth(d.getMonth() - 5); d.setDate(1); desde = fmt2(d)
  } else if (r === 'año') {
    desde = fmt2(new Date(now.getFullYear(), 0, 1))
  } else {
    desde = `${now.getFullYear()}-01-01`
  }
  return { desde, hasta }
}

function DistBar({ label, value, max, colorClass }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="met-bar-row">
      <div className="met-bar-label" title={label}>{label}</div>
      <div className="met-bar-track">
        <div className={`met-bar-fill ${colorClass}`} style={{ width: pct + '%' }} />
      </div>
      <div className="met-bar-count">{value}</div>
    </div>
  )
}

export default function Metricas({ eventos }) {
  const now = new Date()
  const [desde, setDesde] = useState(`${now.getFullYear()}-01-01`)
  const [hasta, setHasta] = useState(today())
  const [printing, setPrinting] = useState(false)
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const handleRango = (r) => {
    const { desde: d, hasta: h } = setRango(r)
    setDesde(d); setHasta(h)
  }

  // Filtered events
  const evs = useMemo(() => eventos.filter(ev => {
    if (!ev.fecha) return false
    if (desde && ev.fecha < desde) return false
    if (hasta && ev.fecha > hasta) return false
    return true
  }), [eventos, desde, hasta])

  // KPIs
  const kpis = useMemo(() => {
    const total = evs.length
    const ingresos = evs.reduce((s, e) => s + (e.total || 0), 0)
    const cobrado = evs.reduce((s, e) => {
      if (e.pago === 'paid') return s + (e.total || 0)
      if (e.pago === 'sena') return s + (e.monto || 0)
      return s
    }, 0)
    const pendiente = ingresos - cobrado
    const totalChicos = evs.reduce((s, e) => s + (e.chi || 0), 0)
    const avgChicos = total ? (totalChicos / total).toFixed(1) : '—'
    const avgIngreso = total ? Math.round(ingresos / total) : 0
    return { total, ingresos, cobrado, pendiente, totalChicos, avgChicos, avgIngreso }
  }, [evs])

  // By month
  const { byMonth, sortedMonths } = useMemo(() => {
    const byMonth = {}
    evs.forEach(ev => {
      const key = ev.fecha.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = { count: 0, chicos: 0, ingresos: 0, cobrado: 0 }
      byMonth[key].count++
      byMonth[key].chicos += ev.chi || 0
      byMonth[key].ingresos += ev.total || 0
      if (ev.pago === 'paid') byMonth[key].cobrado += ev.total || 0
      else if (ev.pago === 'sena') byMonth[key].cobrado += ev.monto || 0
    })
    return { byMonth, sortedMonths: Object.keys(byMonth).sort() }
  }, [evs])

  // Distributions
  const distTipos = useMemo(() => {
    const TIPO = { saltos: '🦘 Saltos', parque: '🏔 Parque aéreo', 'saltos+parque': '🦘🏔 Saltos+Parque', '': 'Sin especificar' }
    const counts = {}
    evs.forEach(e => { const k = e.tipo || ''; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).map(([k, v]) => ({ label: TIPO[k] || k, v })).sort((a, b) => b.v - a.v)
  }, [evs])

  const distSalones = useMemo(() => {
    const counts = {}
    evs.forEach(e => { const k = e.salon || 'Sin salón'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).map(([k, v]) => ({ label: k, v })).sort((a, b) => b.v - a.v)
  }, [evs])

  const distPagos = useMemo(() => {
    const PAGO = { paid: '✓ Pagado', sena: '◑ Seña dejada', none: '✗ Sin pago' }
    const COLOR = { paid: 'gn', sena: 'am', none: 'rd' }
    const counts = { paid: 0, sena: 0, none: 0 }
    evs.forEach(e => { counts[e.pago || 'none']++ })
    return Object.entries(counts).map(([k, v]) => ({ label: PAGO[k], v, color: COLOR[k] })).sort((a, b) => b.v - a.v)
  }, [evs])

  // Chart
  useEffect(() => {
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null }
    if (!chartRef.current || sortedMonths.length === 0) return

    const labels = sortedMonths.map(m => {
      const [y, mo] = m.split('-')
      return new Date(y, mo - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    })
    const counts = sortedMonths.map(m => byMonth[m].count)
    const ingArr = sortedMonths.map(m => byMonth[m].ingresos)

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Cumpleaños', data: counts,
            backgroundColor: 'rgba(43,82,153,0.75)', borderColor: '#1B3A6B',
            borderWidth: 1.5, borderRadius: 6, yAxisID: 'y', order: 2,
          },
          {
            label: 'Ingresos ($)', data: ingArr, type: 'line',
            borderColor: '#E8621A', backgroundColor: 'rgba(232,98,26,0.12)',
            borderWidth: 2.5, pointBackgroundColor: '#E8621A', pointRadius: 4,
            tension: 0.35, fill: true, yAxisID: 'y2', order: 1,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Nunito', size: 12 }, color: '#1B3A6B' } },
          tooltip: {
            callbacks: {
              label: ctx => ctx.datasetIndex === 0
                ? ` ${ctx.parsed.y} evento${ctx.parsed.y !== 1 ? 's' : ''}`
                : ` $${Math.round(ctx.parsed.y).toLocaleString('es-AR')}`,
            },
          },
        },
        scales: {
          y: {
            type: 'linear', position: 'left',
            ticks: { stepSize: 1, color: '#2B5299', font: { family: 'Nunito' } },
            grid: { color: 'rgba(27,58,107,0.08)' },
            title: { display: true, text: 'Eventos', color: '#2B5299', font: { family: 'Nunito', size: 11 } },
          },
          y2: {
            type: 'linear', position: 'right',
            ticks: { color: '#E8621A', font: { family: 'Nunito' }, callback: v => '$' + Math.round(v).toLocaleString('es-AR') },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Ingresos', color: '#E8621A', font: { family: 'Nunito', size: 11 } },
          },
          x: { ticks: { color: '#6B7A99', font: { family: 'Nunito', size: 11 } }, grid: { display: false } },
        },
      },
    })
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null } }
  }, [sortedMonths, byMonth])

  const maxTipo = Math.max(...distTipos.map(d => d.v), 1)
  const maxSalon = Math.max(...distSalones.map(d => d.v), 1)
  const maxPago = Math.max(...distPagos.map(d => d.v), 1)

  // Por método de pago (solo eventos con pago registrado)
  const porMet = useMemo(() => {
    const map = {}
    evs.forEach(ev => {
      if (!ev.met || ev.pago === 'none') return
      const monto = ev.pago === 'paid' ? (ev.total || 0) : (ev.monto || 0)
      if (!map[ev.met]) map[ev.met] = { met: ev.met, monto: 0, cant: 0 }
      map[ev.met].monto += monto
      map[ev.met].cant++
    })
    return Object.values(map).sort((a, b) => b.monto - a.monto)
  }, [evs])

  async function handlePrintCierre() {
    setPrinting(true)
    try {
      const pagados = evs.filter(e => e.pago === 'paid').length
      const senas   = evs.filter(e => e.pago === 'sena').length
      const sinPago = evs.filter(e => !e.pago || e.pago === 'none').length

      await fetch(PRINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        targetAddressSpace: 'loopback',
        body: JSON.stringify({
          desde,
          hasta,
          totalEventos: kpis.total,
          ingresos: kpis.ingresos,
          cobrado: kpis.cobrado,
          pendiente: kpis.pendiente,
          porMet,
          pagados,
          senas,
          sinPago,
        }),
      })
    } catch {
      alert('No se pudo conectar con el servidor de impresión.\nAsegurate de que kangoo_print_server.py esté corriendo.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Métricas</div>
          <div className="ps">
            {kpis.total > 0
              ? `${kpis.total} evento${kpis.total !== 1 ? 's' : ''} en el rango seleccionado`
              : 'Sin eventos en el rango seleccionado'}
          </div>
        </div>
        <button className="bg2" onClick={handlePrintCierre} disabled={printing || kpis.total === 0}>
          {printing ? 'Imprimiendo…' : '🖨 Imprimir cierre'}
        </button>
      </div>

      {/* Filtro rango */}
      <div className="met-filter-bar">
        <div className="met-filter-group">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="met-filter-group">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['mes', '3m', '6m', 'año', 'todo'].map(r => (
            <button key={r} className="bg2 bsm" onClick={() => handleRango(r)}>
              {r === 'mes' ? 'Este mes' : r === '3m' ? 'Últimos 3 meses' : r === '6m' ? 'Últimos 6 meses' : r === 'año' ? 'Este año' : 'Todo el historial'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="met-kpis">
        <div className="met-kpi">
          <div className="met-kpi-label">Total cumpleaños</div>
          <div className="met-kpi-val or">{kpis.total}</div>
          <div className="met-kpi-sub">{kpis.total === 0 ? 'Sin eventos' : `${kpis.total} evento${kpis.total !== 1 ? 's' : ''}`}</div>
        </div>
        <div className="met-kpi">
          <div className="met-kpi-label">Ingresos totales</div>
          <div className="met-kpi-val gn">{fmt(kpis.ingresos)}</div>
          <div className="met-kpi-sub">Cobrado: {fmt(kpis.cobrado)} · Pendiente: {fmt(kpis.pendiente)}</div>
        </div>
        <div className="met-kpi">
          <div className="met-kpi-label">Promedio chicos/cumple</div>
          <div className="met-kpi-val">{kpis.avgChicos}</div>
          <div className="met-kpi-sub">{kpis.totalChicos} chicos en total</div>
        </div>
        <div className="met-kpi">
          <div className="met-kpi-label">Ticket promedio</div>
          <div className="met-kpi-val am">{kpis.total ? fmt(kpis.avgIngreso) : '—'}</div>
          <div className="met-kpi-sub">Ingreso promedio por evento</div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="met-chart-wrap">
        <div className="met-chart-title">Cumpleaños e ingresos por mes</div>
        <div style={{ position: 'relative', height: 260 }}>
          {sortedMonths.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)', fontSize: 14 }}>Sin datos para el rango seleccionado</div>
            : <canvas ref={chartRef} />
          }
        </div>
      </div>

      {/* Tabla por mes */}
      <div className="met-table-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="met-chart-title" style={{ marginBottom: 0 }}>Detalle por mes</div>
          {sortedMonths.length > 0 && (
            <button className="bg2 bsm" onClick={() => {
              const rows = [['Mes', 'Eventos', 'Chicos', 'Prom. chicos', 'Ingresos', 'Cobrado', 'Pendiente', 'Ticket prom.']]
              sortedMonths.forEach(m => {
                const d = byMonth[m]
                const [y, mo] = m.split('-')
                const lbl = new Date(y, mo - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                rows.push([
                  lbl.charAt(0).toUpperCase() + lbl.slice(1),
                  d.count, d.chicos,
                  d.count ? (d.chicos / d.count).toFixed(1) : 0,
                  d.ingresos.toFixed(2), d.cobrado.toFixed(2),
                  (d.ingresos - d.cobrado).toFixed(2),
                  d.count ? Math.round(d.ingresos / d.count) : 0,
                ])
              })
              rows.push(['TOTAL', kpis.total, kpis.totalChicos,
                kpis.total ? (kpis.totalChicos / kpis.total).toFixed(1) : 0,
                kpis.ingresos.toFixed(2), kpis.cobrado.toFixed(2),
                kpis.pendiente.toFixed(2), kpis.total ? Math.round(kpis.avgIngreso) : 0,
              ])
              downloadCSV(rows, `metricas-cumples_${desde}_${hasta}.csv`)
            }}>
              ⬇ Excel
            </button>
          )}
        </div>
        {sortedMonths.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--mu)', fontSize: 13 }}>Sin datos para mostrar.</div>
        ) : (
          <table className="met-table">
            <thead>
              <tr>
                <th>Mes</th><th className="num">Eventos</th><th className="num">Chicos</th>
                <th className="num">Prom. chicos</th><th className="num">Ingresos</th>
                <th className="num">Cobrado</th><th className="num">Pendiente</th><th className="num">Ticket prom.</th>
              </tr>
            </thead>
            <tbody>
              {sortedMonths.map(m => {
                const d = byMonth[m]
                const [y, mo] = m.split('-')
                const lbl = new Date(y, mo - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                return (
                  <tr key={m}>
                    <td>{lbl.charAt(0).toUpperCase() + lbl.slice(1)}</td>
                    <td className="num">{d.count}</td>
                    <td className="num">{d.chicos}</td>
                    <td className="num">{d.count ? (d.chicos / d.count).toFixed(1) : '—'}</td>
                    <td className="num tot">{fmt(d.ingresos)}</td>
                    <td className="num" style={{ color: 'var(--gn)' }}>{fmt(d.cobrado)}</td>
                    <td className="num" style={{ color: 'var(--am)' }}>{fmt(d.ingresos - d.cobrado)}</td>
                    <td className="num">{d.count ? fmt(Math.round(d.ingresos / d.count)) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL</td>
                <td className="num">{kpis.total}</td>
                <td className="num">{kpis.totalChicos}</td>
                <td className="num">{kpis.total ? (kpis.totalChicos / kpis.total).toFixed(1) : '—'}</td>
                <td className="num tot">{fmt(kpis.ingresos)}</td>
                <td className="num" style={{ color: 'var(--gn)' }}>{fmt(kpis.cobrado)}</td>
                <td className="num" style={{ color: 'var(--am)' }}>{fmt(kpis.pendiente)}</td>
                <td className="num">{kpis.total ? fmt(kpis.avgIngreso) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Distribuciones */}
      <div className="met-row2">
        <div className="met-dist-wrap">
          <div className="met-chart-title">Por tipo de evento</div>
          {distTipos.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)' }}>Sin datos</div>
            : distTipos.map(d => <DistBar key={d.label} label={d.label} value={d.v} max={maxTipo} colorClass="or" />)
          }
        </div>
        <div className="met-dist-wrap">
          <div className="met-chart-title">Por salón</div>
          {distSalones.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)' }}>Sin datos</div>
            : distSalones.map(d => <DistBar key={d.label} label={d.label} value={d.v} max={maxSalon} colorClass="" />)
          }
        </div>
        <div className="met-dist-wrap">
          <div className="met-chart-title">Por estado de pago</div>
          {distPagos.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)' }}>Sin datos</div>
            : distPagos.map(d => <DistBar key={d.label} label={d.label} value={d.v} max={maxPago} colorClass={d.color} />)
          }
        </div>
      </div>
    </>
  )
}
