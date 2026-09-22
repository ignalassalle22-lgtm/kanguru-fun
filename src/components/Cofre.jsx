import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-AR')

function fmtFecha(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function Cofre({ movimientos, saldo, loading, onAddRetiro, empleados = [], askPin, addToast }) {
  const [showForm, setShowForm] = useState(false)
  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  // Compute running balance: sort oldest→newest, accumulate, then reverse for display
  const movimientosConSaldo = useMemo(() => {
    const sorted = [...movimientos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    let acum = 0
    const withBalance = sorted.map(m => {
      acum += m.tipo === 'ingreso' ? (m.monto || 0) : -(m.monto || 0)
      return { ...m, saldoParcial: acum }
    })
    return withBalance.reverse() // newest first for display
  }, [movimientos])

  function handleRetiro() {
    const m = parseFloat(monto)
    if (!m || m <= 0) { addToast('Ingresá un monto válido', 'err'); return }
    if (!persona) { addToast('Indicá quién realiza el retiro', 'err'); return }
    if (m > saldo) { addToast('El monto supera el saldo disponible en el cofre', 'err'); return }
    askPin(`Retiro del cofre: $${m} — responsable: ${persona}${obs.trim() ? ` — "${obs.trim()}"` : ''}.`, async () => {
      setSaving(true)
      try {
        await onAddRetiro({ tipo: 'retiro', monto: m, persona, obs: obs.trim() })
        setMonto(''); setPersona(''); setObs('')
        setShowForm(false)
        addToast('✓ Retiro del cofre registrado')
      } catch (e) { addToast('Error: ' + e.message, 'err') }
      finally { setSaving(false) }
    })
  }

  function handleExport() {
    const rows = [...movimientosConSaldo].reverse() // export oldest→newest
    const data = rows.map(m => ({
      Fecha: fmtFecha(m.created_at),
      Tipo: m.tipo === 'ingreso' ? 'Ingreso' : 'Retiro',
      Persona: m.persona || '',
      Observaciones: m.obs || '',
      Monto: m.tipo === 'ingreso' ? m.monto : -m.monto,
      'Saldo parcial': m.saldoParcial,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cofre')
    XLSX.writeFile(wb, `cofre_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (m.monto || 0), 0)
  const totalRetiros = movimientos.filter(m => m.tipo === 'retiro').reduce((s, m) => s + (m.monto || 0), 0)

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">🔒 Cofre</div>
          <div className="ps">Efectivo retirado de cajas y administrado por los dueños</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {movimientos.length > 0 && (
            <button className="bg2" onClick={handleExport}>📥 Exportar Excel</button>
          )}
          <button className="bp" onClick={() => setShowForm(f => !f)}>
            {showForm ? '✕ Cancelar' : '− Registrar retiro'}
          </button>
        </div>
      </div>

      {/* Saldo cards */}
      <div className="sr" style={{ marginBottom: 24 }}>
        <div className="sc">
          <div className="sl">Saldo en cofre</div>
          <div className="sv" style={{ color: saldo >= 0 ? 'var(--gn)' : 'var(--rd)', fontSize: 26 }}>{fmt(saldo)}</div>
        </div>
        <div className="sc">
          <div className="sl">Total ingresos</div>
          <div className="sv" style={{ color: 'var(--gn)' }}>{fmt(totalIngresos)}</div>
        </div>
        <div className="sc">
          <div className="sl">Total retiros</div>
          <div className="sv" style={{ color: 'var(--rd)' }}>{fmt(totalRetiros)}</div>
        </div>
        <div className="sc">
          <div className="sl">Movimientos</div>
          <div className="sv">{movimientos.length}</div>
        </div>
      </div>

      {/* Formulario retiro */}
      {showForm && (
        <div className="cc" style={{ marginBottom: 24, borderTop: '3px solid var(--rd)' }}>
          <div className="ct"><div className="ct-icon">💸</div>Registrar retiro del cofre</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="fgg">
              <label>Monto a retirar $</label>
              <input type="number" min="0" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" autoFocus />
              {saldo > 0 && <span style={{ fontSize: 11, color: 'var(--mu)', marginTop: 3, display: 'block' }}>Disponible: {fmt(saldo)}</span>}
            </div>
            <div className="fgg">
              <label>Persona que retira</label>
              <select value={persona} onChange={e => setPersona(e.target.value)}>
                <option value="">Seleccionar...</option>
                {empleados.filter(e => e.activo !== false).map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="fgg">
              <label>Observaciones</label>
              <input type="text" value={obs} onChange={e => setObs(e.target.value)} placeholder="Motivo, destino, etc." />
            </div>
          </div>
          <button className="bp" style={{ background: 'var(--rd)', borderColor: 'var(--rd)' }} onClick={handleRetiro} disabled={saving}>
            {saving ? 'Guardando...' : '💸 Confirmar retiro'}
          </button>
        </div>
      )}

      {/* Historial */}
      {loading ? (
        <div className="empty"><div className="emj">⏳</div><p>Cargando...</p></div>
      ) : movimientos.length === 0 ? (
        <div className="empty"><div className="emj">🔒</div><p>Sin movimientos registrados aún.</p></div>
      ) : (
        <div>
          <div className="sdv">Historial de movimientos</div>
          <div className="vtable-wrap">
            <table className="vtable">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Persona</th>
                  <th>Observaciones</th>
                  <th className="num">Monto</th>
                  <th className="num">Saldo parcial</th>
                </tr>
              </thead>
              <tbody>
                {movimientosConSaldo.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                        background: m.tipo === 'ingreso' ? 'var(--gnb)' : 'var(--rdb)',
                        color: m.tipo === 'ingreso' ? 'var(--gn)' : 'var(--rd)',
                      }}>
                        {m.tipo === 'ingreso' ? '⬆ Ingreso' : '⬇ Retiro'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--mu)' }}>{fmtFecha(m.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{m.persona || <span style={{ color: 'var(--mu2)' }}>—</span>}</td>
                    <td style={{ fontSize: 13, color: 'var(--mu)' }}>{m.obs || <span style={{ color: 'var(--mu2)' }}>—</span>}</td>
                    <td className="num" style={{ fontWeight: 800, color: m.tipo === 'ingreso' ? 'var(--gn)' : 'var(--rd)' }}>
                      {m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: m.saldoParcial >= 0 ? 'var(--nv)' : 'var(--rd)' }}>
                      {fmt(m.saldoParcial)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
