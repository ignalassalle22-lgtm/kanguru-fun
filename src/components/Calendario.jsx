import React, { useState } from 'react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function eventosDelDia(eventos, anio, mes, dia) {
  return eventos.filter((ev) => {
    const f = new Date(ev.fecha)
    return f.getMonth() === mes && f.getDate() === dia
  })
}

export default function Calendario({ eventos, onEditar }) {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const anteriorMes = () => {
    if (mes === 0) { setMes(11); setAnio((a) => a - 1) }
    else setMes((m) => m - 1)
  }
  const siguienteMes = () => {
    if (mes === 11) { setMes(0); setAnio((a) => a + 1) }
    else setMes((m) => m + 1)
  }

  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  return (
    <div className="calendario">
      <div className="calendario-header">
        <button className="btn-icon" onClick={anteriorMes}>◀</button>
        <h2>{MESES[mes]} {anio}</h2>
        <button className="btn-icon" onClick={siguienteMes}>▶</button>
      </div>

      <div className="calendario-grid">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="cal-dia-semana">{d}</div>
        ))}

        {celdas.map((dia, idx) => {
          if (!dia) return <div key={`empty-${idx}`} className="cal-celda vacia" />

          const evs = eventosDelDia(eventos, anio, mes, dia)
          const esHoy =
            dia === hoy.getDate() &&
            mes === hoy.getMonth() &&
            anio === hoy.getFullYear()

          return (
            <div key={dia} className={`cal-celda ${esHoy ? 'cal-hoy' : ''} ${evs.length ? 'cal-con-evento' : ''}`}>
              <span className="cal-numero">{dia}</span>
              {evs.slice(0, 2).map((ev) => (
                <div
                  key={ev.id}
                  className="cal-evento-chip"
                  onClick={() => onEditar(ev)}
                  title={ev.nombre}
                >
                  {ev.emoji} {ev.nombre}
                </div>
              ))}
              {evs.length > 2 && (
                <div className="cal-mas">+{evs.length - 2} más</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
