import React, { useState } from 'react'
import { fmt } from '../utils'

export default function FinalizarEventoModal({ evento: ev, cajasAbiertas, config, onFinalizar, onClose }) {
  if (!ev) return null

  const saldoEvento = (ev.total || 0) - (ev.monto || 0)
  const consumosPendientes = (ev.consumos || []).filter(c => !c.cobrado)
  const totalConsumos = consumosPendientes.reduce((s, c) => s + (c.precioUnitario || 0) * c.qty, 0)
  const totalFinal = saldoEvento + totalConsumos

  const [metodoPago, setMetodoPago] = useState((config?.mets || [])[0] || 'Efectivo')
  const [multiMet, setMultiMet] = useState(false)
  const [metsPagados, setMetsPagados] = useState([{ id: 1, met: (config?.mets || [])[0] || 'Efectivo', monto: '' }])
  const [cajaId, setCajaId] = useState(cajasAbiertas[0]?.id || null)
  const [cargando, setCargando] = useState(false)

  function toggleMultiMet() {
    const mets = config?.mets || []
    if (!multiMet) {
      const cleanMet = mets.find(m => (metodoPago || '').startsWith(m)) || mets[0] || 'Efectivo'
      setMetsPagados([{ id: 1, met: cleanMet, monto: '' }])
      setMultiMet(true)
    } else {
      setMultiMet(false)
      setMetsPagados([{ id: 1, met: mets[0] || 'Efectivo', monto: '' }])
    }
  }
  function addMetPagado() {
    setMetsPagados(prev => [...prev, { id: Date.now(), met: (config?.mets || [])[0] || 'Efectivo', monto: '' }])
  }
  function removeMetPagado(id) {
    setMetsPagados(prev => prev.filter(m => m.id !== id))
  }
  function updateMetPagado(id, field, val) {
    setMetsPagados(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  async function handleConfirmar() {
    if (!cajaId) return
    let metodoPagoFinal
    if (multiMet) {
      metodoPagoFinal = metsPagados.map(m => `${m.met} $${Math.round(parseFloat(m.monto) || 0).toLocaleString('es-AR')}`).join(' + ')
    } else {
      metodoPagoFinal = metodoPago
    }
    setCargando(true)
    try {
      await onFinalizar({ metodoPago: metodoPagoFinal, cajaId, saldoEvento, consumosPendientes, totalFinal })
    } finally {
      setCargando(false)
    }
  }

  const cliente = ev.reservante || ev.cumple || 'Evento'

  return (
    <div className="ov op" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dm" style={{ maxWidth: 480 }}>
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">✅</div>
            <span>Finalizar evento</span>
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        {/* Resumen */}
        <div style={{ background: 'var(--nv3)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--nv)', marginBottom: 10 }}>
            📋 {cliente}
          </div>

          {/* Saldo evento */}
          {saldoEvento > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: consumosPendientes.length > 0 ? '1px solid var(--bd)' : 'none' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--tx)' }}>Saldo del evento</div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 1 }}>
                  Total {fmt(ev.total || 0)} — seña {fmt(ev.monto || 0)}
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--nv)' }}>{fmt(saldoEvento)}</span>
            </div>
          )}

          {saldoEvento === 0 && (
            <div style={{ fontSize: 12, color: 'var(--gn)', fontWeight: 700, padding: '4px 0', borderBottom: consumosPendientes.length > 0 ? '1px solid var(--bd)' : 'none' }}>
              ✓ Evento ya abonado completo
            </div>
          )}

          {/* Consumos pendientes */}
          {consumosPendientes.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                🛒 Adicionales pendientes ({consumosPendientes.length})
              </div>
              {consumosPendientes.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--tx)', padding: '3px 0' }}>
                  <span>{c.nombreProducto} ×{c.qty}</span>
                  <span style={{ fontWeight: 700 }}>{fmt((c.precioUnitario || 0) * c.qty)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: totalFinal > 0 ? 'rgba(232,98,26,0.08)' : 'rgba(34,197,94,0.08)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: `1px solid ${totalFinal > 0 ? 'rgba(232,98,26,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {totalFinal > 0 ? 'Total a cobrar ahora' : 'Sin saldo pendiente'}
          </span>
          <span style={{ fontWeight: 900, fontSize: 22, color: totalFinal > 0 ? 'var(--or)' : 'var(--gn)' }}>
            {fmt(totalFinal)}
          </span>
        </div>

        {totalFinal > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Método de pago
              </label>
              <button
                type="button"
                onClick={toggleMultiMet}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  border: `1.5px solid ${multiMet ? 'var(--nv)' : 'var(--bd2)'}`,
                  background: multiMet ? 'var(--nv3)' : 'transparent',
                  color: multiMet ? 'var(--nv)' : 'var(--mu)',
                  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                }}
              >
                {multiMet ? '✓ Múltiple' : '+ Más de un método'}
              </button>
            </div>

            {!multiMet ? (
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 12 }}>
                {(config?.mets || ['Efectivo', 'Débito', 'Crédito', 'Transferencia']).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {metsPagados.map(mp => (
                  <div key={mp.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={mp.met}
                      onChange={e => updateMetPagado(mp.id, 'met', e.target.value)}
                      style={{ flex: 1, border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
                    >
                      {(config?.mets || ['Efectivo', 'Débito', 'Crédito', 'Transferencia']).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={mp.monto}
                      onChange={e => updateMetPagado(mp.id, 'monto', e.target.value)}
                      placeholder="Monto $"
                      style={{ width: 120, border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, textAlign: 'right' }}
                    />
                    {metsPagados.length > 1 && (
                      <button className="bdng" style={{ padding: '5px 8px' }} onClick={() => removeMetPagado(mp.id)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="bg2 bsm" onClick={addMetPagado} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  + Agregar método
                </button>
                {(() => {
                  const cubierto = metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
                  const resta = totalFinal - cubierto
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, padding: '6px 10px', borderRadius: 8, background: resta <= 0 ? 'rgba(34,197,94,.1)' : 'rgba(232,98,26,.08)', color: resta <= 0 ? 'var(--gn)' : 'var(--am)', marginTop: 2 }}>
                      <span>{resta <= 0 ? 'Cubierto' : 'Falta cubrir'}</span>
                      <span>{resta <= 0 ? '✓' : `$${Math.round(Math.abs(resta)).toLocaleString('es-AR')}`}</span>
                    </div>
                  )
                })()}
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Acreditar en caja
            </label>
            <select value={cajaId || ''} onChange={e => setCajaId(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              {cajasAbiertas.length === 0
                ? <option value="">Sin cajas abiertas</option>
                : cajasAbiertas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.turno ? ` — ${c.turno}` : ''}</option>)
              }
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="bg2" onClick={onClose}>Cancelar</button>
          <button
            className="bp"
            onClick={handleConfirmar}
            disabled={cargando || (totalFinal > 0 && !cajaId)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {cargando ? 'Procesando...' : totalFinal > 0 ? `✅ Cobrar ${fmt(totalFinal)} y finalizar` : '✅ Marcar como finalizado'}
          </button>
        </div>
      </div>
    </div>
  )
}
