import React, { useState } from 'react'
import { fmt, cumpleDisplay, fmtFechaHora } from '../utils'

const TIPO_LABEL = { saltos: 'Saltos', parque: 'Parque aéreo', 'saltos+parque': 'Saltos + Parque aéreo' }
const PRINT_URL = 'http://127.0.0.1:5001/print/venta'

function Row({ label, val, valStyle }) {
  if (!val && val !== 0) return null
  return (
    <div className="dm-row">
      <span className="dm-label">{label}</span>
      <span className="dm-val" style={valStyle}>{val}</span>
    </div>
  )
}

export default function DetalleModal({ evento: ev, config, onClose, onEditar, onAbrirCaja, onFinalizar }) {
  const [printing, setPrinting] = useState(false)

  if (!ev) return null

  const rest = (ev.total || 0) - (ev.monto || 0)
  const cd = cumpleDisplay(ev)

  const menuRows = ev.mrows && ev.mrows.length
    ? ev.mrows.map(r => {
        const m = config.menus.find(x => String(x.id) === String(r.mid))
        if (!m) return null
        return m.p ? `${m.n} ×${r.qty} = ${fmt(m.p * r.qty)}` : `${m.n} ×${r.qty}`
      }).filter(Boolean).join(' | ')
    : '—'

  const extrasDetail = ev.extras && ev.extras.length
    ? ev.extras.map(e => {
        if (e.custom) {
          return e.desc ? `${e.desc} ×${e.qty} = ${fmt((e.p || 0) * e.qty)}` : null
        }
        const ex = config.extras.find(x => String(x.id) === String(e.eid))
        if (!ex) return null
        const price = e.p !== undefined ? e.p : ex.p
        return `${ex.n} ×${e.qty} = ${fmt(price * e.qty)}`
      }).filter(Boolean).join(' | ')
    : null

  const promo = ev.promoId ? config.promos.find(p => String(p.id) === String(ev.promoId)) : null

  const bc = ev.pago === 'paid' ? 'bpd' : ev.pago === 'sena' ? 'bsn' : ev.pago === 'cancelado' ? 'bcn' : 'bnp'
  const bt = ev.pago === 'paid' ? '✓ Pagado completo' : ev.pago === 'sena' ? '◑ Seña dejada' : ev.pago === 'cancelado' ? '✕ Cancelado' : '✗ Sin pago'

  async function handlePrint() {
    setPrinting(true)
    try {
      const items = []

      const pChi = ev.precioChico != null ? ev.precioChico : (config.pChico || 0)
      const pAdu = ev.precioAdulto != null ? ev.precioAdulto : (config.pAdulto || 0)
      if (ev.chi > 0) items.push({ n: `Chicos (${ev.chi})`, qty: ev.chi, total: ev.chi * pChi })
      if (ev.adu > 0) items.push({ n: `Adultos (${ev.adu})`, qty: ev.adu, total: ev.adu * pAdu })

      if (ev.mrows) ev.mrows.forEach(r => {
        const m = config.menus.find(x => String(x.id) === String(r.mid))
        if (m && m.p) items.push({ n: m.n, qty: r.qty, total: m.p * r.qty })
      })

      if (ev.extras) ev.extras.forEach(e => {
        if (e.custom) {
          if (e.desc) items.push({ n: e.desc, qty: e.qty, total: (e.p || 0) * e.qty })
        } else {
          const ex = config.extras.find(x => String(x.id) === String(e.eid))
          if (ex) {
            const price = e.p !== undefined ? e.p : ex.p
            items.push({ n: ex.n, qty: e.qty, total: price * e.qty })
          }
        }
      })

      // Adicionales de la caja del evento
      if (ev.consumos) ev.consumos.forEach(c => {
        if (c.precioUnitario > 0) items.push({ n: c.nombreProducto, qty: c.qty, total: (c.precioUnitario || 0) * c.qty })
      })

      const subtotal = items.reduce((s, i) => s + i.total, 0)
      const descuento = promo ? Math.round(subtotal * promo.pct / 100) : 0

      await fetch(PRINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        targetAddressSpace: 'loopback',
        body: JSON.stringify({
          fecha: ev.fecha,
          hora: ev.hora,
          reservante: ev.reservante,
          telefono: ev.telefono,
          cumple: ev.cumple,
          edad: ev.edad,
          salon: ev.salon,
          chi: ev.chi,
          adu: ev.adu,
          items,
          subtotal,
          descuento,
          promo: promo ? promo.d : '',
          total: ev.total || 0,
          pago: ev.pago,
          monto: ev.monto || 0,
          met: ev.met || '',
        }),
      })
    } catch {
      alert('No se pudo conectar con el servidor de impresión.\nAsegurate de que "Iniciar Impresora Kangoo.bat" esté corriendo.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="ov op" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dm">
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">👁</div>
            <span>Detalle del evento</span>
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        {ev.reservante && (
          <div className="dm-row">
            <span className="dm-label">👤 Reservante</span>
            <span className="dm-val">
              {ev.reservante}
              {ev.privado && (
                <span style={{ background: 'var(--nv3)', color: 'var(--nv)', fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 700, marginLeft: 6 }}>
                  🔒 Privado
                </span>
              )}
            </span>
          </div>
        )}

        {ev.telefono && (
          <div className="dm-row">
            <span className="dm-label">📞 Teléfono</span>
            <span className="dm-val">
              <a href={`tel:${ev.telefono}`} style={{ color: 'var(--nv2)' }}>{ev.telefono}</a>
            </span>
          </div>
        )}

        {cd && <Row label="🎂 Cumpleañero/a" val={cd} />}

        <div className="dm-row">
          <span className="dm-label">📅 Fecha y hora</span>
          <span className="dm-val">
            {fmtFechaHora(ev.fecha, ev.hora)} hs
            {ev.hora_hasta && ` — ${ev.hora_hasta} hs`}
            {ev.extendido && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--nv3)', color: 'var(--nv)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Extendido</span>}
          </span>
        </div>

        <Row label="🏠 Salón" val={ev.salon} />
        {ev.tipo && <Row label="🏋 Tipo de evento" val={TIPO_LABEL[ev.tipo] || ev.tipo} />}

        <div className="dm-row">
          <span className="dm-label">👥 Asistentes</span>
          <span className="dm-val">{ev.chi || 0} chicos · {ev.adu || 0} adultos</span>
        </div>

        <div className="dm-row">
          <span className="dm-label">🍔 Menús</span>
          <span className="dm-val" style={{ lineHeight: 1.6 }}>{menuRows}</span>
        </div>

        {extrasDetail && (
          <div className="dm-row">
            <span className="dm-label">⭐ Extras</span>
            <span className="dm-val" style={{ lineHeight: 1.6 }}>{extrasDetail}</span>
          </div>
        )}

        <div className="dm-row">
          <span className="dm-label">🎁 Promoción</span>
          <span className="dm-val">{promo ? `${promo.d} (${promo.pct}% off)` : 'Sin promoción'}</span>
        </div>

        {ev.obs && <Row label="📝 Observaciones" val={ev.obs} />}

        <div className="dm-row">
          <span className="dm-label">💰 Total evento</span>
          <span className="dm-val" style={{ fontSize: 18, fontWeight: 800, color: 'var(--nv)' }}>{fmt(ev.total || 0)}</span>
        </div>

        <div className="dm-row">
          <span className="dm-label">Estado pago</span>
          <span className="dm-val"><span className={`badge ${bc}`}>{bt}</span></span>
        </div>

        {ev.pago !== 'none' && (
          <div className="dm-row">
            <span className="dm-label">Abonado</span>
            <span className="dm-val" style={{ color: 'var(--gn)', fontWeight: 700 }}>{fmt(ev.monto || 0)}</span>
          </div>
        )}

        {ev.pago !== 'paid' && (
          <div className="dm-row">
            <span className="dm-label">Restante</span>
            <span className="dm-val" style={{ color: 'var(--am)', fontWeight: 700 }}>{fmt(rest)}</span>
          </div>
        )}

        {ev.met && <Row label="Método de pago" val={ev.met} />}

        {ev.articulos && ev.articulos.filter(a => a.qty > 0).length > 0 && (
          <div className="dm-row" style={{ alignItems: 'flex-start' }}>
            <span className="dm-label">📦 Artículos incl.</span>
            <span className="dm-val" style={{ lineHeight: 1.8 }}>
              {ev.articulos.filter(a => a.qty > 0).map((a, i) => (
                <span key={i} style={{ display: 'block' }}>{a.nombre} ×{a.qty}</span>
              ))}
            </span>
          </div>
        )}

        {ev.consumos && ev.consumos.length > 0 && (
          <div className="dm-row" style={{ alignItems: 'flex-start' }}>
            <span className="dm-label">🛒 Adicionales</span>
            <span className="dm-val">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {ev.consumos_cobrados
                  ? <span style={{ fontSize: 11, background: 'rgba(34,197,94,.15)', color: 'var(--gn)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>✓ Cobrados</span>
                  : <span style={{ fontSize: 11, background: 'var(--amb)', color: 'var(--am)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Pendiente de cobro</span>
                }
              </span>
              {ev.consumos.map((c, i) => (
                <span key={i} style={{ display: 'block', lineHeight: 1.8 }}>
                  {c.nombreProducto} ×{c.qty}
                  {c.precioUnitario > 0 && <span style={{ color: 'var(--gn)', fontWeight: 700, marginLeft: 6 }}>{fmt((c.precioUnitario || 0) * c.qty)}</span>}
                </span>
              ))}
              <span style={{ display: 'block', fontWeight: 700, marginTop: 4 }}>
                Total: {fmt(ev.consumos.reduce((s, c) => s + (c.precioUnitario || 0) * c.qty, 0))}
              </span>
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, flexWrap: 'wrap' }}>
          <button className="bg2" onClick={onClose}>Cerrar</button>
          <button className="bg2" onClick={handlePrint} disabled={printing}>
            {printing ? 'Imprimiendo…' : '🖨 Imprimir ticket'}
          </button>
          {onAbrirCaja && (
            <button className="bn" onClick={() => onAbrirCaja(ev.id)}>💰 Caja del evento</button>
          )}
          {onFinalizar && ev.pago !== 'paid' && ev.pago !== 'cancelado' && (
            <button
              className="bp"
              onClick={() => onFinalizar(ev.id)}
              style={{ background: '#1A7A45', border: 'none' }}
            >
              ✅ Finalizar evento
            </button>
          )}
          <button className="bp" onClick={() => onEditar(ev.id)}>✏ Editar</button>
        </div>
      </div>
    </div>
  )
}
