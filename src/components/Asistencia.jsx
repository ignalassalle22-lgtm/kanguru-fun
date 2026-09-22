import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useAsistencia } from '../hooks/useAsistencia'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DIAS_SEMANA = ['D','L','M','X','J','V','S']
const AÑOS = Array.from({ length: 7 }, (_, i) => 2024 + i)

function diasEnMes(año, mes) { return new Date(año, mes, 0).getDate() }
function fechaStr(año, mes, dia) {
  return `${año}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
}
function diaSemana(año, mes, dia) { return new Date(año, mes - 1, dia).getDay() }

function calcHoras(entrada, salida) {
  if (!entrada || !salida) return 0
  const [eh, em] = entrada.split(':').map(Number)
  const [sh, sm] = salida.split(':').map(Number)
  const mins = (sh * 60 + sm) - (eh * 60 + em)
  return mins > 0 ? Math.round(mins) / 60 : 0
}

function fmtHoras(h) {
  if (!h) return '—'
  const hs = Math.floor(h)
  const ms = Math.round((h - hs) * 60)
  return ms > 0 ? `${hs}h ${ms}m` : `${hs}h`
}

// Cell para un día — usa inputs locales para no re-renderizar toda la tabla en cada keystroke
function DayCell({ empId, dia, año, mes, diaLimite, record, onSave }) {
  const isFuturo = dia > diaLimite
  const [entrada, setEntrada] = useState(record?.hora_entrada || '')
  const [salida, setSalida] = useState(record?.hora_salida || '')
  const vacaciones = record?.vacaciones || false

  // Sincronizar cuando cambia el mes o llegan datos frescos
  useEffect(() => {
    setEntrada(record?.hora_entrada || '')
    setSalida(record?.hora_salida || '')
  }, [record?.hora_entrada, record?.hora_salida, record?.vacaciones])

  const save = useCallback((e, s) => {
    onSave(empId, fechaStr(año, mes, dia), { hora_entrada: e, hora_salida: s, vacaciones: false })
  }, [empId, dia, año, mes, onSave])

  const toggleVac = useCallback(() => {
    if (vacaciones) {
      onSave(empId, fechaStr(año, mes, dia), { hora_entrada: '', hora_salida: '', vacaciones: false })
    } else {
      setEntrada(''); setSalida('')
      onSave(empId, fechaStr(año, mes, dia), { hora_entrada: '', hora_salida: '', vacaciones: true })
    }
  }, [vacaciones, empId, dia, año, mes, onSave])

  const horas = calcHoras(entrada, salida)
  const ds = diaSemana(año, mes, dia)
  const esFind = ds === 0 || ds === 6

  if (vacaciones) {
    return (
      <td style={{ textAlign: 'center', padding: '3px 2px', borderRight: '1px solid var(--bd)', background: 'rgba(43,82,153,0.12)', minWidth: 74 }}>
        <div
          onClick={!isFuturo ? toggleVac : undefined}
          title="Vacaciones · clic para quitar"
          style={{ cursor: isFuturo ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', gap: 2 }}
        >
          <span style={{ fontSize: 18 }}>🏖</span>
          <span style={{ fontSize: 9, color: '#2B5299', fontWeight: 700 }}>VAC</span>
        </div>
      </td>
    )
  }

  return (
    <td style={{ padding: '3px 3px', borderRight: '1px solid var(--bd)', minWidth: 74, background: esFind ? 'rgba(232,98,26,0.04)' : undefined }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <input
          type="time"
          value={entrada}
          disabled={isFuturo}
          onChange={e => setEntrada(e.target.value)}
          onBlur={e => save(e.target.value, salida)}
          title="Entrada"
          style={{ width: '100%', fontSize: 11, border: '1px solid var(--bd2)', borderRadius: 5, padding: '3px 4px', background: entrada ? '#f0fdf4' : 'var(--wh)', opacity: isFuturo ? 0.3 : 1 }}
        />
        <input
          type="time"
          value={salida}
          disabled={isFuturo}
          onChange={e => setSalida(e.target.value)}
          onBlur={e => save(entrada, e.target.value)}
          title="Salida"
          style={{ width: '100%', fontSize: 11, border: '1px solid var(--bd2)', borderRadius: 5, padding: '3px 4px', background: salida ? '#f0fdf4' : 'var(--wh)', opacity: isFuturo ? 0.3 : 1 }}
        />
        {horas > 0 && (
          <div style={{ fontSize: 10, textAlign: 'center', color: '#1A7A45', fontWeight: 800 }}>{fmtHoras(horas)}</div>
        )}
        {!isFuturo && (
          <button onClick={toggleVac} title="Marcar como vacaciones"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--mu2)', padding: '1px 0', lineHeight: 1 }}>
            🏖
          </button>
        )}
      </div>
    </td>
  )
}

export default function Asistencia({ empleados = [] }) {
  const hoy = new Date()
  const [año, setAño] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const { asistencias, observaciones, loading, fetchMes, saveAsistencia, saveObs } = useAsistencia()
  const [obsLocal, setObsLocal] = useState({})

  const empleadosActivos = useMemo(() => empleados.filter(e => {
    if (e.activo !== false) return true
    if (!e.fecha_baja) return false
    const [bajaAño, bajaMes] = e.fecha_baja.split('-').map(Number)
    return año < bajaAño || (año === bajaAño && mes <= bajaMes)
  }), [empleados, año, mes])
  const totalDias = diasEnMes(año, mes)
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1)
  const esActual = año === hoy.getFullYear() && mes === (hoy.getMonth() + 1)
  const diaLimite = esActual ? hoy.getDate() : totalDias

  useEffect(() => { fetchMes(año, mes) }, [año, mes, fetchMes])
  useEffect(() => { setObsLocal({}) }, [año, mes])

  function getRecord(empleadoId, dia) {
    return asistencias.find(a => a.empleado_id === empleadoId && a.fecha === fechaStr(año, mes, dia))
  }

  function getObs(empleadoId) {
    if (obsLocal[empleadoId] !== undefined) return obsLocal[empleadoId]
    return observaciones.find(o => o.empleado_id === empleadoId && o.año === año && o.mes === mes)?.obs || ''
  }

  function totalHorasEmpleado(empId) {
    return dias.reduce((sum, d) => {
      const r = getRecord(empId, d)
      return sum + calcHoras(r?.hora_entrada, r?.hora_salida)
    }, 0)
  }

  function diasVacEmpleado(empId) {
    return dias.filter(d => getRecord(empId, d)?.vacaciones).length
  }

  function diasTrabajadosEmpleado(empId) {
    return dias.filter(d => {
      const r = getRecord(empId, d)
      return r && (r.hora_entrada || r.hora_salida) && !r.vacaciones
    }).length
  }

  // Total general del mes
  const totalHorasMes = useMemo(() =>
    empleadosActivos.reduce((s, e) => s + totalHorasEmpleado(e.id), 0),
  [asistencias, empleadosActivos])

  const handleObsBlur = useCallback((empId) => {
    const val = obsLocal[empId]
    if (val !== undefined) saveObs(empId, año, mes, val)
  }, [obsLocal, año, mes, saveObs])

  // ── Exportar a Excel ──
  function exportarExcel() {
    const wb = XLSX.utils.book_new()
    const mesNombre = MESES[mes - 1]

    // ── Hoja 1: Resumen (se abre por defecto) ──
    const resumen = []
    resumen.push([`RESUMEN DE ASISTENCIA — ${mesNombre.toUpperCase()} ${año}`])
    resumen.push([])
    resumen.push(['Empleado', 'Días trabajados', 'Horas totales', 'Prom. hs/día', 'Días vacaciones', 'Observaciones'])
    empleadosActivos.forEach(emp => {
      const hs = Math.round(totalHorasEmpleado(emp.id) * 100) / 100
      const dias2 = diasTrabajadosEmpleado(emp.id)
      resumen.push([
        emp.nombre,
        dias2,
        hs,
        dias2 > 0 ? Math.round((hs / dias2) * 100) / 100 : 0,
        diasVacEmpleado(emp.id),
        getObs(emp.id) || '',
      ])
    })
    resumen.push([])
    resumen.push([
      'TOTAL GENERAL',
      empleadosActivos.reduce((s, e) => s + diasTrabajadosEmpleado(e.id), 0),
      Math.round(totalHorasMes * 100) / 100,
      '', '', '',
    ])

    const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
    wsResumen['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 45 }]
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // ── Hoja 2: Detalle día a día ──
    const detalle = []
    detalle.push([`DETALLE DE ASISTENCIA — ${mesNombre.toUpperCase()} ${año}`])
    detalle.push([])
    detalle.push(['Empleado', 'Fecha', 'Día', 'Entrada', 'Salida', 'Horas', 'Estado', 'Observaciones'])

    empleadosActivos.forEach(emp => {
      const obs = getObs(emp.id) || ''
      let primeraFila = true
      dias.forEach(d => {
        const r = getRecord(emp.id, d)
        const fecha = `${String(d).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${año}`
        const diaNombre = DIAS_SEMANA_FULL[diaSemana(año, mes, d)]
        const hs = calcHoras(r?.hora_entrada, r?.hora_salida)
        const estado = r?.vacaciones ? 'Vacaciones' : hs > 0 ? 'Trabajado' : '—'
        detalle.push([
          primeraFila ? emp.nombre : '',
          fecha,
          diaNombre,
          r?.hora_entrada || '',
          r?.hora_salida || '',
          hs > 0 ? Math.round(hs * 100) / 100 : '',
          estado,
          primeraFila ? obs : '',
        ])
        primeraFila = false
      })
      const total = Math.round(totalHorasEmpleado(emp.id) * 100) / 100
      detalle.push(['', '', '', '', 'TOTAL HORAS:', total, '', ''])
      detalle.push([])
    })

    const wsDetalle = XLSX.utils.aoa_to_sheet(detalle)
    wsDetalle['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 45 }]
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

    XLSX.writeFile(wb, `Asistencia_${mesNombre}_${año}.xlsx`)
  }

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">Asistencia</div>
          <div className="ps">Control de horarios y horas trabajadas</div>
        </div>
        <button className="bp" onClick={exportarExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          📥 Exportar Excel
        </button>
      </div>

      {/* Selectores */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ border: '1px solid var(--bd2)', borderRadius: 10, padding: '9px 14px', fontSize: 14, fontWeight: 700, color: 'var(--nv)', background: 'var(--wh)', cursor: 'pointer', minWidth: 140 }}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={año} onChange={e => setAño(Number(e.target.value))}
          style={{ border: '1px solid var(--bd2)', borderRadius: 10, padding: '9px 14px', fontSize: 14, fontWeight: 700, color: 'var(--nv)', background: 'var(--wh)', cursor: 'pointer', minWidth: 100 }}>
          {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E8F5EE', borderRadius: 10, padding: '8px 16px', border: '1px solid #1A7A4533' }}>
          <span style={{ fontSize: 16 }}>⏱</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#1A7A45' }}>Total del mes: {fmtHoras(totalHorasMes)}</div>
            <div style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>{empleadosActivos.length} empleados</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>Leyenda:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--mu)', fontWeight: 600 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f0fdf4', border: '1px solid var(--bd2)' }} /> Entrada/Salida
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--mu)', fontWeight: 600 }}>
            🏖 Vacaciones
          </div>
        </div>
      </div>

      {empleadosActivos.length === 0 ? (
        <div className="empty"><div className="emj">👥</div><p>No hay empleados activos. Cargalos desde Config.</p></div>
      ) : loading ? (
        <div className="empty"><div className="emj">⏳</div><p>Cargando...</p></div>
      ) : (
        <>
          {/* Tabla */}
          <div style={{ overflowX: 'auto', borderRadius: 14, boxShadow: '0 2px 12px rgba(27,58,107,0.09)', background: 'var(--wh)', border: '1px solid var(--bd)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${200 + totalDias * 76 + 100}px` }}>
              <thead>
                <tr style={{ background: 'var(--nv3)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 800, color: 'var(--nv)', width: 180, minWidth: 180, borderRight: '2px solid var(--bd)', position: 'sticky', left: 0, background: 'var(--nv3)', zIndex: 2 }}>
                    Empleado
                  </th>
                  {dias.map(d => {
                    const ds = diaSemana(año, mes, d)
                    const esFind = ds === 0 || ds === 6
                    const esFut = d > diaLimite
                    return (
                      <th key={d} style={{ width: 74, minWidth: 74, textAlign: 'center', padding: '6px 2px', borderRight: '1px solid var(--bd)', background: esFind ? 'rgba(232,98,26,0.1)' : undefined, opacity: esFut ? 0.4 : 1 }}>
                        <div style={{ fontSize: 10, color: esFind ? 'var(--or)' : 'var(--mu)', fontWeight: 700 }}>{DIAS_SEMANA[ds]}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--nv)' }}>{d}</div>
                      </th>
                    )
                  })}
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--nv)', minWidth: 90, borderLeft: '2px solid var(--bd)', position: 'sticky', right: 0, background: 'var(--nv3)', zIndex: 2 }}>
                    Total Hs
                  </th>
                </tr>
              </thead>
              <tbody>
                {empleadosActivos.map((emp, idx) => {
                  const totalHs = totalHorasEmpleado(emp.id)
                  const diasVac = diasVacEmpleado(emp.id)
                  return (
                    <tr key={emp.id} style={{ background: idx % 2 === 0 ? 'var(--wh)' : 'var(--bg)', borderBottom: '1px solid var(--bd)' }}>
                      <td style={{ padding: '8px 16px', fontWeight: 700, fontSize: 13, color: 'var(--tx)', borderRight: '2px solid var(--bd)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--wh)' : 'var(--bg)', zIndex: 1 }}>
                        {emp.nombre}
                      </td>
                      {dias.map(d => (
                        <DayCell
                          key={d}
                          empId={emp.id}
                          dia={d}
                          año={año}
                          mes={mes}
                          diaLimite={diaLimite}
                          record={getRecord(emp.id, d)}
                          onSave={saveAsistencia}
                        />
                      ))}
                      <td style={{ textAlign: 'center', padding: '8px 10px', borderLeft: '2px solid var(--bd)', position: 'sticky', right: 0, background: idx % 2 === 0 ? 'var(--wh)' : 'var(--bg)', zIndex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: totalHs > 0 ? '#1A7A45' : 'var(--mu)' }}>
                          {totalHs > 0 ? fmtHoras(totalHs) : '—'}
                        </div>
                        {diasVac > 0 && (
                          <div style={{ fontSize: 10, color: '#2B5299', fontWeight: 700, marginTop: 2 }}>🏖 {diasVac}d</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Resumen tarjetas */}
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {empleadosActivos.map(emp => {
              const hs = totalHorasEmpleado(emp.id)
              const dias2 = diasTrabajadosEmpleado(emp.id)
              const vac = diasVacEmpleado(emp.id)
              return (
                <div key={emp.id} style={{ background: 'var(--wh)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(27,58,107,0.08)', borderLeft: '4px solid #1A7A45' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--tx)', marginBottom: 6 }}>{emp.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: '#1A7A45' }}>{fmtHoras(hs)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 600, marginTop: 2 }}>
                    {dias2} días trabajados{vac > 0 ? ` · ${vac} días 🏖` : ''}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Observaciones */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--nv)', marginBottom: 14 }}>
              📝 Observaciones del mes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {empleadosActivos.map(emp => (
                <div key={emp.id} style={{ background: 'var(--wh)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(27,58,107,0.08)' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--tx)', marginBottom: 8 }}>{emp.nombre}</div>
                  <textarea
                    rows={3}
                    placeholder="Ej: Ausente 3 días por enfermedad, presentó certificado médico el día 15..."
                    value={getObs(emp.id)}
                    onChange={e => setObsLocal(prev => ({ ...prev, [emp.id]: e.target.value }))}
                    onBlur={() => handleObsBlur(emp.id)}
                    style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: 'var(--tx)', background: 'var(--bg)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
