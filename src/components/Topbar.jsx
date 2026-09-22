import React from 'react'

const TABS_VENTAS_ADMIN = [
  { id: 'ventas',    label: '🧾 Ventas' },
  { id: 'pedidos',   label: '📋 Pedidos' },
  { id: 'compras',   label: '📥 Compras' },
  { id: 'caja',      label: '💰 Caja' },
  { id: 'productos', label: '📦 Productos' },
  { id: 'reportes',  label: '📊 Reportes' },
  { id: 'config',    label: '⚙️ Config' },
]

const TABS_VENTAS_POS = [
  { id: 'ventas',    label: '🧾 Ventas' },
  { id: 'pedidos',   label: '📋 Pedidos' },
  { id: 'compras',   label: '📥 Compras' },
  { id: 'caja',      label: '💰 Caja' },
  { id: 'productos', label: '📦 Productos' },
]

const TABS_CUMPLES_ADMIN = [
  { id: 'eventos',    label: '🎂 Eventos' },
  { id: 'calendario', label: '📅 Calendario' },
  { id: 'metricas',   label: '📈 Métricas' },
  { id: 'config',     label: '⚙️ Config' },
]

const TABS_CUMPLES_POS = [
  { id: 'eventos',    label: '🎂 Eventos' },
  { id: 'calendario', label: '📅 Calendario' },
]

export default function Topbar({ activeSection, onNav, onNuevo, cajaActual, onNavCofre, usuario, onLogout }) {
  const isAdmin = !usuario || usuario.rol === 'admin'
  const TABS_VENTAS = isAdmin ? TABS_VENTAS_ADMIN : TABS_VENTAS_POS
  const TABS_CUMPLES = isAdmin ? TABS_CUMPLES_ADMIN : TABS_CUMPLES_POS

  const isVentas = TABS_VENTAS.some(t => t.id === activeSection)
  const isAsistencia = activeSection === 'asistencia'
  const isCofre = activeSection === 'cofre'
  const isCumples = !isVentas && !isAsistencia && !isCofre

  return (
    <div className="topbar" style={{ height: 'auto', padding: '0 28px', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      {/* Fila superior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div className="logo-wrap">
          <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--or2)', flexShrink: 0 }} />
          <div className="logo-texts">
            <div className="logo-name">Kangaroo<span> Fun</span></div>
            <div className="logo-sub">Sistema de gestión</div>
          </div>
        </div>

        {/* Selector de módulo */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '4px 6px' }}>
          <button
            className={`nb${isCumples ? ' on' : ''}`}
            onClick={() => onNav('eventos')}
            style={{ fontSize: 12, padding: '6px 16px' }}
          >🎂 Cumpleaños</button>
          <button
            className={`nb${isVentas ? ' on' : ''}`}
            onClick={() => onNav('ventas')}
            style={{ fontSize: 12, padding: '6px 16px' }}
          >🧾 Ventas</button>
          {isAdmin && (
            <button
              className={`nb${isAsistencia ? ' on' : ''}`}
              onClick={() => onNav('asistencia')}
              style={{ fontSize: 12, padding: '6px 16px' }}
            >👥 Asistencia</button>
          )}
          {isAdmin && (
            <button
              className={`nb${isCofre ? ' on' : ''}`}
              onClick={onNavCofre}
              style={{ fontSize: 12, padding: '6px 16px' }}
            >🔒 Cofre</button>
          )}
        </div>

        {/* Derecha: acción rápida + usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isCumples
            ? <button className="bp" onClick={onNuevo}>＋ Nuevo evento</button>
            : isVentas && cajaActual
              ? <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                  🟢 Caja abierta {cajaActual.hora_apertura}
                </span>
              : null
          }
          {usuario && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 8, fontWeight: 600 }}>
                {usuario.username}
                {!isAdmin && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>POS</span>}
              </span>
              <button
                onClick={onLogout}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                }}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fila inferior: tabs del módulo activo */}
      {!isAsistencia && !isCofre && (
        <div style={{ display: 'flex', gap: 2, paddingBottom: 0, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {(isVentas ? TABS_VENTAS : TABS_CUMPLES).map(t => (
            <button
              key={t.id}
              className={`nb${activeSection === t.id ? ' on' : ''}`}
              onClick={() => onNav(t.id)}
              style={{ fontSize: 12, padding: '8px 16px', borderRadius: '8px 8px 0 0' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
