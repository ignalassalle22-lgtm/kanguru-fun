import React, { useState } from 'react'
import { cumpleDisplay, fechaHoyAR } from '../utils'

const DOWS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const pad = n => String(n).padStart(2, '0')

const NOTA_TIPOS = [
  { id: 'por-cerrar', label: 'Por cerrar', color: '#f59e0b', bg: 'rgba(245,158,11,.13)' },
  { id: 'borrador',   label: 'Borrador',   color: '#6366f1', bg: 'rgba(99,102,241,.13)' },
  { id: 'bloqueado',  label: 'No disponible', color: '#ef4444', bg: 'rgba(239,68,68,.13)' },
]

function getTipoStyle(tipo) {
  return NOTA_TIPOS.find(t => t.id === tipo) || NOTA_TIPOS[0]
}

function NotaModal({ nota, onSave, onDelete, onClose }) {
  const [texto, setTexto] = useState(nota.texto || '')
  const [tipo, setTipo] = useState(nota.tipo || 'por-cerrar')

  return (
    <div
      className="ov op"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="mo" style={{ maxWidth: 360 }}>
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">📌</div>
            <span>{nota.id ? 'Editar anotación' : 'Nueva anotación'} — {nota.fecha}</span>
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
          <div className="fgg">
            <label>Tipo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {NOTA_TIPOS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    border: `2px solid ${tipo === t.id ? t.color : 'var(--bd2)'}`,
                    background: tipo === t.id ? t.bg : 'transparent',
                    color: tipo === t.id ? t.color : 'var(--mu)',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fgg">
            <label>Texto</label>
            <input
              type="text"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Ej: Familia García — pendiente de confirmar menú"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && texto.trim() && onSave({ ...nota, texto: texto.trim(), tipo })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          {nota.id && (
            <button
              className="bg2"
              style={{ color: 'var(--rd)', borderColor: 'var(--rd)' }}
              onClick={() => onDelete(nota.id)}
            >
              Eliminar
            </button>
          )}
          <button className="bg2" onClick={onClose}>Cancelar</button>
          <button
            className="bp"
            disabled={!texto.trim()}
            onClick={() => texto.trim() && onSave({ ...nota, texto: texto.trim(), tipo })}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarioMes({ eventos, onEditar, onVerDetalle, notas = [], onSaveNota, onDeleteNota, isAdmin = true }) {
  const now = new Date()
  const todayStr = fechaHoyAR()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [notaEdit, setNotaEdit] = useState(null) // { fecha, id?, texto, tipo }

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }
  const goToday = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()) }

  const labelDate = new Date(calYear, calMonth, 1)
  const label = labelDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1)

  // Build cells: start from Monday of first week
  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0

  const cells = []
  for (let i = 0; i < startDow; i++) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - (startDow - i))
    cells.push({ date: d, cur: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    cells.push({ date: new Date(calYear, calMonth, i), cur: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    const d = new Date(last)
    d.setDate(last.getDate() + 1)
    cells.push({ date: d, cur: false })
  }

  const monthEvs = eventos.filter(ev => {
    if (!ev.fecha) return false
    const d = new Date(ev.fecha + 'T12:00:00')
    return d.getFullYear() === calYear && d.getMonth() === calMonth
  })

  const monthNotas = notas.filter(n => {
    if (!n.fecha) return false
    const d = new Date(n.fecha + 'T12:00:00')
    return d.getFullYear() === calYear && d.getMonth() === calMonth
  })

  function openNewNota(fecha) {
    setNotaEdit({ fecha, texto: '', tipo: 'por-cerrar' })
  }

  function openEditNota(nota) {
    setNotaEdit({ ...nota })
  }

  async function handleSaveNota(nota) {
    if (onSaveNota) await onSaveNota(nota)
    setNotaEdit(null)
  }

  async function handleDeleteNota(id) {
    if (onDeleteNota) await onDeleteNota(id)
    setNotaEdit(null)
  }

  return (
    <>
      <div className="cal-month-nav" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <div className="cal-month-label">{labelCap}</div>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        <button className="bg2 bsm" onClick={goToday} style={{ marginLeft: 8 }}>Hoy</button>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--mu)' }}>
          {monthEvs.length} evento{monthEvs.length !== 1 ? 's' : ''} en {labelCap}
        </span>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 12 }}>
            {NOTA_TIPOS.map(t => (
              <span key={t.id} style={{ fontSize: 11, color: t.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="cal-month-grid">
        <div className="cal-month-header">
          {DOWS.map((d, i) => (
            <div key={d} className={`cal-month-dow${i >= 5 ? ' weekend' : ''}`}>{d}</div>
          ))}
        </div>
        <div className="cal-month-body">
          {cells.map(({ date, cur }, idx) => {
            const ds = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
            const isToday = ds === todayStr
            const evs = eventos
              .filter(ev => ev.fecha === ds)
              .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
            const dayNotas = notas.filter(n => n.fecha === ds)
            const hasEvs = evs.length > 0
            const hasNotas = dayNotas.length > 0
            const maxShow = 3

            let cls = ''
            if (!cur) cls += ' other-month'
            if (isToday) cls += ' is-today'
            if (hasEvs) cls += ' has-events'

            return (
              <div key={idx} className={`cal-month-cell${cls}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="cal-cell-num">{date.getDate()}</div>
                  {isAdmin && cur && (
                    <button
                      onClick={() => openNewNota(ds)}
                      title="Agregar anotación"
                      style={{
                        fontSize: 11, lineHeight: 1, padding: '1px 5px', borderRadius: 5,
                        border: '1px solid var(--bd2)', background: 'transparent',
                        color: 'var(--mu)', cursor: 'pointer', opacity: 0.5,
                      }}
                    >＋</button>
                  )}
                </div>

                {/* Eventos */}
                {evs.slice(0, maxShow).map(ev => {
                  const name = cumpleDisplay(ev) || ev.reservante || '(sin nombre)'
                  const pClass = ev.pago === 'paid' ? 'paid' : ev.pago === 'sena' ? 'sena' : 'none'
                  return (
                    <button
                      key={ev.id}
                      className={`cal-cell-ev ${pClass}`}
                      onClick={() => onVerDetalle(ev.id)}
                      title={`${name}${ev.hora ? ' · ' + ev.hora : ''}${ev.salon ? ' · ' + ev.salon : ''}`}
                    >
                      {ev.hora ? ev.hora + ' ' : ''}{name}
                    </button>
                  )
                })}
                {evs.length > maxShow && (
                  <div
                    className="cal-cell-more"
                    onClick={() => {
                      const names = evs.map(ev => `• ${ev.hora || '—'} ${ev.reservante || cumpleDisplay(ev) || '(sin nombre)'}`).join('\n')
                      alert(`Eventos del ${ds}:\n${names}`)
                    }}
                  >
                    +{evs.length - maxShow} más
                  </div>
                )}

                {/* Anotaciones */}
                {dayNotas.map(nota => {
                  const ts = getTipoStyle(nota.tipo)
                  return (
                    <button
                      key={nota.id}
                      onClick={() => isAdmin ? openEditNota(nota) : undefined}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        fontSize: 10, fontWeight: 700, padding: '2px 5px',
                        borderRadius: 5, marginTop: 2,
                        background: ts.bg, color: ts.color,
                        border: `1px solid ${ts.color}40`,
                        cursor: isAdmin ? 'pointer' : 'default',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      title={nota.texto}
                    >
                      📌 {nota.texto}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {notaEdit && (
        <NotaModal
          nota={notaEdit}
          onSave={handleSaveNota}
          onDelete={handleDeleteNota}
          onClose={() => setNotaEdit(null)}
        />
      )}
    </>
  )
}
