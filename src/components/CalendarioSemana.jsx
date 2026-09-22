import React from 'react'
import { fmt, cumpleDisplay, fechaHoyAR } from '../utils'

const intlAR = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return intlAR.format(d)
}

export default function CalendarioSemana({ eventos, onEditar, onVerDetalle }) {
  const todayStr = fechaHoyAR()
  const pad = n => String(n).padStart(2, '0')

  const days = Array.from({ length: 7 }, (_, i) => addDays(todayStr, i))

  const weekEvs = eventos.filter(ev => ev.fecha && days.includes(ev.fecha))
  const wEvents = weekEvs.length
  const wChicos = weekEvs.reduce((s, e) => s + (e.chi || 0), 0)
  const wTotal = weekEvs.reduce((s, e) => s + (e.total || 0), 0)
  const wPend = weekEvs.reduce((s, e) => {
    if (e.pago !== 'paid') return s + (e.total || 0) - (e.monto || 0)
    return s
  }, 0)

  const tipoLabel = {
    saltos: '🦘 Saltos',
    parque: '🏔 Parque aéreo',
    'saltos+parque': '🦘🏔 Saltos + Parque',
  }

  return (
    <>
      <div className="cal-week-summary">
        <div className="cal-stat"><div className="sl">Eventos semana</div><div className="sv or">{wEvents}</div></div>
        <div className="cal-stat"><div className="sl">Chicos semana</div><div className="sv">{wChicos}</div></div>
        <div className="cal-stat"><div className="sl">Ingresos semana</div><div className="sv gn">{fmt(wTotal)}</div></div>
        <div className="cal-stat"><div className="sl">Por cobrar semana</div><div className="sv am">{fmt(wPend)}</div></div>
      </div>

      {days.map(dateStr => {
        const d = new Date(dateStr + 'T12:00:00')
        const isToday = dateStr === todayStr
        const dayName = d.toLocaleDateString('es-AR', { weekday: 'long' })
        const dayFmt = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
        const evs = eventos
          .filter(ev => ev.fecha === dateStr)
          .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))

        const hc = isToday ? 'today' : evs.length === 0 ? 'empty' : ''

        return (
          <div key={dateStr} className="cal-day">
            <div className={`cal-day-header ${hc}`}>
              <div>
                <div className="cal-day-title">
                  {isToday ? '⭐ HOY — ' : ''}{dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                </div>
                <div className="cal-day-date">{dayFmt}</div>
              </div>
              <div className="cal-day-count">{evs.length} evento{evs.length !== 1 ? 's' : ''}</div>
            </div>

            {evs.length === 0 ? (
              <div className="cal-empty-day">Sin cumpleaños agendados para este día</div>
            ) : (
              <div className="cal-events">
                {evs.map(ev => {
                  const bc = ev.pago === 'paid' ? 'bpd' : ev.pago === 'sena' ? 'bsn' : 'bnp'
                  const bt = ev.pago === 'paid' ? '✓ Pagado' : ev.pago === 'sena' ? '◑ Seña' : '✗ Sin pago'
                  const rest = (ev.total || 0) - (ev.monto || 0)
                  const cd = cumpleDisplay(ev)
                  return (
                    <div key={ev.id} className="cal-ev">
                      <div className="cal-ev-time">{ev.hora || '—'}</div>
                      <div className="cal-ev-info">
                        <div className="cal-ev-name">
                          {cd ? '🎂 ' + cd : ev.reservante || '(sin nombre)'}
                        </div>
                        <div className="cal-ev-detail">
                          🏠 {ev.salon || '—'} · 👦 {ev.chi || 0} chicos · 👤 {ev.adu || 0} adultos
                          {ev.tipo ? ' · ' + tipoLabel[ev.tipo] : ''}
                          {ev.privado ? ' · 🔒 Privado' : ''}
                          {ev.reservante ? ` · 👤 ${ev.reservante}${ev.telefono ? ' · 📞 ' + ev.telefono : ''}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="cal-ev-total">{fmt(ev.total || 0)}</div>
                        <span className={`badge ${bc}`} style={{ fontSize: 10, padding: '2px 7px' }}>{bt}</span>
                        {ev.pago !== 'paid' && (
                          <div style={{ fontSize: 11, color: 'var(--am)', fontWeight: 600, marginTop: 2 }}>
                            Resta: {fmt(rest)}
                          </div>
                        )}
                      </div>
                      <div className="cal-ev-actions">
                        <button className="bg2 bsm" onClick={() => onVerDetalle(ev.id)} title="Ver detalle">👁</button>
                        <button className="bg2 bsm" onClick={() => onEditar(ev.id)} title="Editar">✏</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
