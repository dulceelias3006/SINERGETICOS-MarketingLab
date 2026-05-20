import { useState, useEffect, useRef } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import EventosDigitales from '../components/EventosDigitales';
import ResultadosDrawer from '../components/ResultadosDrawer';

const ESTADOS_CONFIG = [
  { key: 'planificado', label: 'Planificado', color: '#f59e0b' },
  { key: 'activo',      label: 'Activo',      color: '#4ade80' },
  { key: 'completado',  label: 'Completado',  color: '#4ade80' },
  { key: 'cancelado',   label: 'Cancelado',   color: '#ef4444' },
];

const TIPOS_DEFAULT = [
  { id: 'digital',    label: 'Digital',    color: '#4a9eff' },
  { id: 'presencial', label: 'Presencial', color: '#e53e3e' },
];

const REGIONES_DEFAULT = [
  { id: 'MEX',   label: 'MEX',      color: '#e53e3e' },
  { id: 'USA',   label: 'USA / CAN', color: '#4a9eff' },
  { id: 'LATAM', label: 'LATAM',    color: '#f59e0b' },
];

const DIVISAS = ['MXN', 'USD'];

const FORM_INIT = {
  nombre: '', descripcion: '', tipo: 'digital', estado: 'planificado',
  region: '', fecha: '', hora: '', hora2: '', ubicacion: '',
  registrosMeta: 0, registrosActuales: 0, vipVendidas: 0,
  registrosHora1: 0, registrosHora2: 0,
  presupuestoTotal: 0, presupuestoGastado: 0, divisa: 'MXN',
  urlRegistro: '', urlDrive: '',
};

function fmt(n, divisa = 'MXN') {
  return `$${Number(n || 0).toLocaleString('es-MX')} ${divisa}`;
}

function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'hace un momento';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
  return new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtActualizado(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const dm = new Date(d); dm.setHours(0, 0, 0, 0);
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (dm.getTime() === hoy.getTime()) return `hoy ${hora}`;
  if (dm.getTime() === ayer.getTime()) return `ayer ${hora}`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' ' + hora;
}

function fmtHora(hora) {
  if (!hora) return '';
  const [h, m] = hora.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function costoColor(costo, region) {
  if (!costo) return '#9ca3af';
  const isUSA = region === 'USA' || region === 'CAN';
  if (isUSA) {
    if (costo <= 90) return '#4ade80';
    if (costo <= 95) return '#facc15';
    return '#ef4444';
  } else {
    if (costo <= 30) return '#4ade80';
    if (costo <= 60) return '#facc15';
    return '#ef4444';
  }
}

// ── Mini event card used in both views ──────────────────────────────────────
function EventCard({ ev, tipos, regiones, estadoObj, onEdit, onAjustar, onResultados, compact = false }) {
  const [editReg, setEditReg]         = useState(null);
  const [editVip, setEditVip]         = useState(null);
  const [editGastado, setEditGastado] = useState(null);
  const [editH1, setEditH1]           = useState(null);
  const [editH2, setEditH2]           = useState(null);
  const [showHorarios, setShowHorarios] = useState(false);

  const tipoObj = tipos.find(t => t.id === ev.tipo);
  const regionObj = regiones.find(r => r.id === ev.region);
  const pct = ev.registrosMeta > 0 ? Math.min(100, Math.round((ev.registrosActuales || 0) / ev.registrosMeta * 100)) : 0;
  const gastadoPct = ev.presupuestoTotal > 0 ? Math.min(100, Math.round((ev.presupuestoGastado || 0) / ev.presupuestoTotal * 100)) : 0;
  const costoRegNum = ev.registrosActuales > 0 && ev.presupuestoGastado > 0
    ? Math.round(ev.presupuestoGastado / ev.registrosActuales) : null;
  const costoReg = costoRegNum !== null
    ? `$${costoRegNum.toLocaleString('es-MX')} ${ev.divisa || 'MXN'}` : '—';
  const fechaFmt = ev.fecha
    ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const tienePres = ev.presupuestoTotal > 0 || ev.presupuestoGastado > 0;

  function commitEdit(campo, rawVal, current, closeFn) {
    const next = Math.max(0, Number(rawVal) || 0);
    onAjustar(ev.id, campo, next - (Number(current) || 0));
    closeFn(null);
  }

  const inlineInput = (val, setVal, campo, current, closeFn) => (
    <input
      type="number" min="0" value={val} autoFocus
      onChange={e => setVal(e.target.value)}
      onBlur={() => commitEdit(campo, val, current, closeFn)}
      onKeyDown={e => {
        if (e.key === 'Enter') e.target.blur();
        if (e.key === 'Escape') closeFn(null);
      }}
      style={{ width: 70, border: '1px solid #e879a0', borderRadius: 6, padding: '2px 6px', fontSize: 13, fontWeight: 700, color: 'var(--app-text)', background: 'var(--app-surface)', outline: 'none', textAlign: 'center' }}
    />
  );

  return (
    <div style={{ background: 'var(--app-surface)', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid var(--app-border-light)', padding: compact ? '14px 16px' : '18px 20px' }}>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: estadoObj.color }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {estadoObj.label}{tipoObj ? ` · ${tipoObj.label}` : ''}
          </span>
          {regionObj && !compact && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: regionObj.color + '22', color: regionObj.color, border: `1px solid ${regionObj.color}44` }}>
              {regionObj.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {ev.estado === 'completado' && (
            <button onClick={() => onResultados(ev)} data-tooltip="Resultados"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: ev.resultados ? '#e53e3e' : '#d1d5db', display: 'flex', alignItems: 'center', padding: '2px 4px', borderRadius: 5 }}
              onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
              onMouseLeave={e => e.currentTarget.style.color = ev.resultados ? '#e53e3e' : '#d1d5db'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </button>
          )}
          {onEdit && <button onClick={() => onEdit(ev)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 20, lineHeight: 1, letterSpacing: 2, padding: '0 2px', fontWeight: 700 }}>···</button>}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: compact ? 15 : 19, fontWeight: 700, color: 'var(--app-text)', marginBottom: 8, lineHeight: 1.3 }}>{ev.nombre}</div>

      {/* Date + location */}
      {(fechaFmt || ev.ubicacion) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {fechaFmt && <span style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>📅 {fechaFmt}{ev.hora ? ` · ${fmtHora(ev.hora)}${ev.hora2 ? ` – ${fmtHora(ev.hora2)}` : ''}` : ''}</span>}
          {ev.ubicacion && <span style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>📍 {ev.ubicacion}</span>}
        </div>
      )}

      {/* Registros */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase' }}>👥 Registros ({pct}%)</span>
            {ev.hora2 && (
              <button onClick={() => setShowHorarios(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--app-text-subtle)', display: 'flex', alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showHorarios ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {onAjustar && <button onClick={() => onAjustar(ev.id, 'registrosActuales', -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: 0 }}>−</button>}
            {editReg !== null && onAjustar
              ? inlineInput(editReg, setEditReg, 'registrosActuales', ev.registrosActuales, setEditReg)
              : <span onClick={onAjustar ? () => setEditReg(String(ev.registrosActuales || 0)) : undefined} title={onAjustar ? "Clic para editar" : undefined} style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)', cursor: onAjustar ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>{(ev.registrosActuales || 0).toLocaleString('es-MX')}</span>
            }
            <span style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>/ {(ev.registrosMeta || 0).toLocaleString('es-MX')}</span>
            {onAjustar && <button onClick={() => onAjustar(ev.id, 'registrosActuales', 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>}
          </div>
        </div>
        <div style={{ height: 4, background: 'var(--app-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22c55e' : '#facc15', borderRadius: 99 }} />
        </div>

        {/* Registros por horario — solo si hay segundo horario y está expandido */}
        {ev.hora2 && showHorarios && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              ['registrosHora1', ev.hora,  editH1, setEditH1],
              ['registrosHora2', ev.hora2, editH2, setEditH2],
            ].map(([campo, hora, editVal, setEditVal]) => (
              <div key={campo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--app-surface-alt)', borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ fontSize: 11, color: 'var(--app-text-muted)', fontWeight: 600 }}>{fmtHora(hora)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {onAjustar && <button onClick={() => onAjustar(ev.id, campo, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 14, lineHeight: 1, padding: 0 }}>−</button>}
                  {editVal !== null && onAjustar
                    ? inlineInput(editVal, setEditVal, campo, ev[campo], setEditVal)
                    : <span onClick={onAjustar ? () => setEditVal(String(ev[campo] || 0)) : undefined} title={onAjustar ? 'Clic para editar' : undefined} style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', cursor: onAjustar ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>{(ev[campo] || 0).toLocaleString('es-MX')}</span>
                  }
                  {onAjustar && <button onClick={() => onAjustar(ev.id, campo, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 14, lineHeight: 1, padding: 0 }}>+</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget */}
      {tienePres && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '10px 0', borderTop: '1px solid var(--app-border-light)', borderBottom: '1px solid var(--app-border-light)', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: 'var(--app-text)' }}>{fmt(ev.presupuestoTotal, ev.divisa)}</div>
            <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 1 }}>Presupuesto</div>
          </div>
          <div>
            {editGastado !== null
              ? <>
                  <input
                    type="number" min="0" value={editGastado} autoFocus
                    onChange={e => setEditGastado(e.target.value)}
                    onBlur={() => commitEdit('presupuestoGastado', editGastado, ev.presupuestoGastado, setEditGastado)}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditGastado(null); }}
                    style={{ width: '100%', border: '1px solid #e879a0', borderRadius: 6, padding: '2px 6px', fontSize: compact ? 12 : 13, fontWeight: 700, color: 'var(--app-text)', background: 'var(--app-surface)', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 1 }}>Gastado ({gastadoPct}%)</div>
                </>
              : <>
                  <div onClick={onAjustar ? () => setEditGastado(String(ev.presupuestoGastado || 0)) : undefined} title={onAjustar ? 'Clic para editar' : undefined} style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: 'var(--app-text)', cursor: onAjustar ? 'text' : 'default' }}>{fmt(ev.presupuestoGastado, ev.divisa)}</div>
                  <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 1 }}>Gastado ({gastadoPct}%)</div>
                </>
            }
          </div>
          <div>
            <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: costoColor(costoRegNum, ev.region) }}>{costoReg}</div>
            <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 1 }}>Costo/Reg.</div>
          </div>
        </div>
      )}

      {/* VIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ev.urlRegistro || ev.urlDrive ? 8 : 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase' }}>🎟 VIP</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {onAjustar && <button onClick={() => onAjustar(ev.id, 'vipVendidas', -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: 0 }}>−</button>}
          {editVip !== null && onAjustar
            ? inlineInput(editVip, setEditVip, 'vipVendidas', ev.vipVendidas, setEditVip)
            : <span onClick={onAjustar ? () => setEditVip(String(ev.vipVendidas || 0)) : undefined} title={onAjustar ? "Clic para editar" : undefined} style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)', cursor: onAjustar ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>{ev.vipVendidas || 0}</span>
          }
          {onAjustar && <button onClick={() => onAjustar(ev.id, 'vipVendidas', 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>}
        </div>
      </div>

      {/* Links + actualizado */}
      {(ev.urlRegistro || ev.urlDrive || ev.updatedAt) && (
        <div style={{ borderTop: '1px solid var(--app-border-light)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {ev.urlRegistro && <a href={ev.urlRegistro} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600, textDecoration: 'none' }}>🔗 Registro</a>}
            {ev.urlDrive && <a href={ev.urlDrive} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4a9eff', fontWeight: 600, textDecoration: 'none' }}>📁 Drive</a>}
          </div>
          {ev.updatedAt && (
            <span style={{ fontSize: 11, color: '#c4c9d4', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              actualizado {fmtActualizado(ev.updatedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const EVENTOS_DEFAULT = [
  { id: 1, nombre: 'Hermosillo',           tipo: 'presencial', estado: 'activo',      region: 'MEX',   fecha: '2026-05-06', hora: '10:00', hora2: '18:00', ubicacion: 'EXPO FORUM',                       registrosMeta: 7033,  registrosActuales: 3238,  vipVendidas: 59,  presupuestoTotal: 400000, presupuestoGastado: 239903, divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 2, nombre: 'Querétaro',            tipo: 'presencial', estado: 'activo',      region: 'MEX',   fecha: '2026-05-12', hora: '10:00', hora2: '18:00', ubicacion: 'Grand Fiesta Americana',           registrosMeta: 6060,  registrosActuales: 3380,  vipVendidas: 35,  presupuestoTotal: 400000, presupuestoGastado: 134221, divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 3, nombre: 'CDMX',                tipo: 'presencial', estado: 'activo',      region: 'MEX',   fecha: '2026-05-16', hora: '10:00', hora2: '16:00', ubicacion: 'Hotel Royal Pedregal',             registrosMeta: 8000,  registrosActuales: 1405,  vipVendidas: 16,  presupuestoTotal: 400000, presupuestoGastado: 85185,  divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 4, nombre: 'Monterrey',           tipo: 'presencial', estado: 'activo',      region: 'MEX',   fecha: '2026-05-17', hora: '10:00', hora2: '',       ubicacion: 'Pabellón M',                      registrosMeta: 4000,  registrosActuales: 2582,  vipVendidas: 11,  presupuestoTotal: 200000, presupuestoGastado: 82649,  divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 5, nombre: 'Guadalajara',         tipo: 'presencial', estado: 'activo',      region: 'MEX',   fecha: '2026-05-23', hora: '10:00', hora2: '16:00', ubicacion: 'Barceló',                         registrosMeta: 3030,  registrosActuales: 2268,  vipVendidas: 10,  presupuestoTotal: 400000, presupuestoGastado: 103617, divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 6, nombre: 'Salt Lake City',      tipo: 'presencial', estado: 'planificado', region: 'USA',   fecha: '2026-05-26', hora: '18:00', hora2: '',       ubicacion: '',                                registrosMeta: 0,     registrosActuales: 0,     vipVendidas: 0,   presupuestoTotal: 300000, presupuestoGastado: 0,      divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 7, nombre: 'Denver',              tipo: 'presencial', estado: 'planificado', region: 'USA',   fecha: '2026-05-28', hora: '18:00', hora2: '',       ubicacion: 'Denver Marriott West',            registrosMeta: 0,     registrosActuales: 0,     vipVendidas: 0,   presupuestoTotal: 300000, presupuestoGastado: 0,      divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 8, nombre: 'San Diego',           tipo: 'presencial', estado: 'completado',  region: 'USA',   fecha: '2026-04-19', hora: '10:00', hora2: '',       ubicacion: 'Hilton La Jolla Torrey Pines',    registrosMeta: 3000,  registrosActuales: 2083,  vipVendidas: 85,  presupuestoTotal: 300000, presupuestoGastado: 327650, divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 9, nombre: 'Chicago',             tipo: 'presencial', estado: 'planificado', region: 'USA',   fecha: '2026-05-31', hora: '10:00', hora2: '',       ubicacion: "Hilton Rosemont / Chicago O'Hare", registrosMeta: 0,     registrosActuales: 0,     vipVendidas: 0,   presupuestoTotal: 300000, presupuestoGastado: 0,      divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 10, nombre: 'Newark',             tipo: 'presencial', estado: 'planificado', region: 'USA',   fecha: '2026-05-28', hora: '18:00', hora2: '',       ubicacion: '',                                registrosMeta: 0,     registrosActuales: 0,     vipVendidas: 0,   presupuestoTotal: 300000, presupuestoGastado: 0,      divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
  { id: 11, nombre: 'República Dominicana', tipo: 'presencial', estado: 'activo',    region: 'LATAM', fecha: '2026-04-25', hora: '10:00', hora2: '16:00', ubicacion: 'Sambil Santo Domingo',            registrosMeta: 15000, registrosActuales: 15556, vipVendidas: 448, presupuestoTotal: 400000, presupuestoGastado: 433740, divisa: 'MXN', urlRegistro: '', urlDrive: '', descripcion: '' },
];

function autoCompletarEventos(lista) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return lista.map(ev => {
    if (ev.estado !== 'activo' || !ev.fecha) return ev;
    const fechaEv = new Date(ev.fecha + 'T00:00:00');
    return fechaEv < hoy ? { ...ev, estado: 'completado' } : ev;
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Eventos() {
  const { can, nombre: nombreUsuario, avatarColor } = useAuth();
  const [eventos, setEventos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventos') || 'null') || EVENTOS_DEFAULT; } catch { return EVENTOS_DEFAULT; }
  });
  const [tipos, setTipos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventos_tipos') || 'null') || TIPOS_DEFAULT; } catch { return TIPOS_DEFAULT; }
  });
  const [regiones, setRegiones] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('eventos_regiones') || 'null');
      const base = stored || REGIONES_DEFAULT;
      return base
        .filter(r => r.id !== 'CAN')
        .map(r => r.id === 'USA' ? { ...r, label: 'USA / CAN' } : r);
    } catch { return REGIONES_DEFAULT; }
  });

  const [historial, setHistorial] = useState([]);

  const [modo, setModo] = useState('presenciales');
  const digitalesRef = useRef();
  const [vista, setVista] = useState('grid');
  const [filtro, setFiltro] = useState('activo');
  const [showModal, setShowModal] = useState(false);
  const [showRegionesConfig, setShowRegionesConfig] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [formError, setFormError] = useState(false);

  const [drawerEvento, setDrawerEvento] = useState(null);

  const [undoStack, setUndoStack] = useState([]);
  const [undoToast, setUndoToast] = useState(null);
  const toastTimer = useRef(null);
  const dehacerRef = useRef(null);
  const canSync = useRef(false);

  function saveEventos(next, desc = '') {
    setUndoStack(prev => [...prev, { snap: eventos, desc }].slice(-20));
    setEventos(next);
    localStorage.setItem('eventos', JSON.stringify(next));
    if (canSync.current) dbSet('eventos', next);
  }

  function guardarResultados(id, resultados) {
    saveEventos(eventos.map(ev => ev.id === id ? { ...ev, resultados, updatedAt: Date.now() } : ev), `resultados de "${eventos.find(e => e.id === id)?.nombre}"`);
    setDrawerEvento(null);
  }

  function dehacer() {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      setEventos(entry.snap);
      localStorage.setItem('eventos', JSON.stringify(entry.snap));
      if (canSync.current) dbSet('eventos', entry.snap);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setUndoToast(entry.desc ? `Deshecho: ${entry.desc}` : 'Cambio deshecho');
      toastTimer.current = setTimeout(() => setUndoToast(null), 2800);
      return prev.slice(0, -1);
    });
  }

  dehacerRef.current = dehacer;

  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        e.preventDefault();
        dehacerRef.current();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const localEv = () => { try { return JSON.parse(localStorage.getItem('eventos')||'null'); } catch { return null; } };
    const localTi = () => { try { return JSON.parse(localStorage.getItem('eventos_tipos')||'null'); } catch { return null; } };
    const localRe = () => { try { return JSON.parse(localStorage.getItem('eventos_regiones')||'null'); } catch { return null; } };
    Promise.all([dbGet('eventos'), dbGet('eventos_tipos'), dbGet('eventos_regiones'), dbGet('eventos_historial')]).then(([ev, ti, re, hist]) => {
      canSync.current = true;
      if (ev !== null) {
        const completados = autoCompletarEventos(ev);
        setEventos(completados);
        if (JSON.stringify(completados) !== JSON.stringify(ev)) {
          localStorage.setItem('eventos', JSON.stringify(completados));
          dbSet('eventos', completados);
        }
      } else { const v = localEv(); dbSet('eventos', v || EVENTOS_DEFAULT); }
      if (ti !== null) setTipos(ti); else { const v = localTi(); if (v) dbSet('eventos_tipos', v); }
      if (re !== null) setRegiones(re); else { const v = localRe(); if (v) dbSet('eventos_regiones', v); }
      if (hist !== null) {
        const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setHistorial(hist.filter(e => e.ts >= limite));
      }
    });
    const s1 = dbSub('eventos', v => setEventos(p => JSON.stringify(p) === JSON.stringify(v) ? p : v));
    const s2 = dbSub('eventos_tipos', v => setTipos(p => JSON.stringify(p) === JSON.stringify(v) ? p : v));
    const s3 = dbSub('eventos_regiones', v => setRegiones(p => JSON.stringify(p) === JSON.stringify(v) ? p : v));
    const s4 = dbSub('eventos_historial', v => {
      const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtrado = (v || []).filter(e => e.ts >= limite);
      setHistorial(p => JSON.stringify(p) === JSON.stringify(filtrado) ? p : filtrado);
    });
    return () => { s1.unsubscribe(); s2.unsubscribe(); s3.unsubscribe(); s4.unsubscribe(); };
  }, []);

  function saveTipos(next) { setTipos(next); localStorage.setItem('eventos_tipos', JSON.stringify(next)); if (canSync.current) dbSet('eventos_tipos', next); }
  function saveRegiones(next) { setRegiones(next); localStorage.setItem('eventos_regiones', JSON.stringify(next)); if (canSync.current) dbSet('eventos_regiones', next); }

  const USER_COLORS = ['#e53e3e','#4a9eff','#4ade80','#f59e0b','#a78bfa','#f472b6','#34d399','#fb923c','#60a5fa','#e879f9'];
  function colorForUser(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return USER_COLORS[Math.abs(h) % USER_COLORS.length];
  }

  async function log(tipo, eventoNombre, desc = '') {
    const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const usuario = nombreUsuario || 'Usuario';
    const color = avatarColor || colorForUser(usuario);
    const entry = { id: Date.now(), tipo, nombre: eventoNombre, desc, usuario, color, ts: Date.now() };
    const current = canSync.current ? (await dbGet('eventos_historial') || []) : [];
    const next = [entry, ...current].filter(e => e.ts >= limite).slice(0, 300);
    setHistorial(next);
    if (canSync.current) dbSet('eventos_historial', next);
  }

  const filtrados = eventos
    .filter(e => filtro === 'todos' || e.estado === filtro)
    .sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0;
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return new Date(a.fecha) - new Date(b.fecha);
    });
  const counts = {
    todos: eventos.length,
    activo: eventos.filter(e => e.estado === 'activo').length,
    planificado: eventos.filter(e => e.estado === 'planificado').length,
    completado: eventos.filter(e => e.estado === 'completado').length,
  };

  function abrir() { setEditandoId(null); setForm(FORM_INIT); setFormError(false); setShowModal(true); }
  function abrirEditar(ev) { setEditandoId(ev.id); setForm({ ...FORM_INIT, ...ev }); setFormError(false); setShowModal(true); }
  const CAMPO_LABELS = {
    nombre: 'nombre', tipo: 'tipo', estado: 'estado', region: 'región',
    fecha: 'fecha', hora: 'hora', hora2: '2° horario', ubicacion: 'ubicación',
    registrosMeta: 'meta', registrosActuales: 'registros', vipVendidas: 'VIP',
    presupuestoTotal: 'presupuesto', presupuestoGastado: 'gasto', divisa: 'divisa',
    urlRegistro: 'url registro', urlDrive: 'url drive',
  };

  function guardar() {
    if (!form.nombre.trim()) { setFormError(true); return; }
    if (editandoId) {
      const old = eventos.find(e => e.id === editandoId);
      const cambios = Object.keys(CAMPO_LABELS)
        .filter(k => String(old?.[k] ?? '') !== String(form[k] ?? ''))
        .map(k => CAMPO_LABELS[k]);
      const desc = cambios.length > 0 ? `Modificó: ${cambios.join(', ')}` : 'Sin cambios';
      saveEventos(eventos.map(e => e.id === editandoId ? { ...e, ...form, updatedAt: Date.now() } : e), `edición de "${form.nombre.trim()}"`);
      log('editado', form.nombre.trim(), desc);
    } else {
      saveEventos([...eventos, { ...form, id: Date.now(), updatedAt: Date.now() }], `creación de "${form.nombre.trim()}"`);
      log('creado', form.nombre.trim(), 'Evento creado');
    }
    setShowModal(false);
  }
  function eliminar(id) {
    const ev = eventos.find(e => e.id === id);
    if (confirm('¿Eliminar este evento?')) {
      saveEventos(eventos.filter(e => e.id !== id), `eliminación de "${ev?.nombre || 'Evento'}"`);
      log('eliminado', ev?.nombre || 'Evento', 'Evento eliminado');
      setShowModal(false);
    }
  }
  function ajustar(id, campo, delta) {
    const ev = eventos.find(e => e.id === id);
    const oldVal = Number(ev?.[campo]) || 0;
    const newVal = Math.max(0, oldVal + delta);
    const AJUSTE_LABELS = { registrosActuales: 'Registros', vipVendidas: 'VIP', presupuestoGastado: 'Gasto', registrosHora1: 'Reg. H1', registrosHora2: 'Reg. H2' };
    const label = AJUSTE_LABELS[campo] || campo;
    saveEventos(eventos.map(e => e.id === id ? { ...e, [campo]: newVal, updatedAt: Date.now() } : e), `ajuste de ${label} en "${ev?.nombre}"`);
    log('ajustado', ev?.nombre || 'Evento', `${label}: ${oldVal.toLocaleString('es-MX')} → ${newVal.toLocaleString('es-MX')}`);
  }

  function exportarPDF() {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Solo eventos activos
    const eventosActivos = eventos.filter(e => e.estado === 'activo');

    // Totales globales (solo activos)
    const totalReg = eventosActivos.reduce((s, e) => s + (e.registrosActuales || 0), 0);
    const totalMeta = eventosActivos.reduce((s, e) => s + (e.registrosMeta || 0), 0);
    const totalVip = eventosActivos.reduce((s, e) => s + (e.vipVendidas || 0), 0);
    const pctGlobal = totalMeta > 0 ? Math.round(totalReg / totalMeta * 100) : 0;

    // Agrupados por región (solo activos)
    const sinRegion = eventosActivos.filter(e => !e.region);
    const regionesConEventos = [
      ...regiones.map(r => ({
        label: r.label, color: r.color,
        evs: eventosActivos.filter(e => e.region === r.id || (r.id === 'USA' && e.region === 'CAN')),
      })),
      ...(sinRegion.length > 0 ? [{ label: 'Sin región', color: 'var(--app-text-subtle)', evs: sinRegion }] : []),
    ].filter(g => g.evs.length > 0);

    function fmtNum(n, div = 'MXN') {
      return `$${Number(n || 0).toLocaleString('es-MX')} ${div}`;
    }
    function fechaCorta(f) {
      if (!f) return '—';
      return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const regionSections = regionesConEventos.map(grupo => {
      const evsSorted = [...grupo.evs].sort((a, b) => {
        if (!a.fecha && !b.fecha) return 0;
        if (!a.fecha) return 1;
        if (!b.fecha) return -1;
        return new Date(a.fecha) - new Date(b.fecha);
      });

      const rows = evsSorted.map(ev => {
        const pct = ev.registrosMeta > 0 ? Math.round((ev.registrosActuales || 0) / ev.registrosMeta * 100) : 0;
        const gastadoPct = ev.presupuestoTotal > 0 ? Math.round((ev.presupuestoGastado || 0) / ev.presupuestoTotal * 100) : 0;
        const costoRegNum = ev.registrosActuales > 0 && ev.presupuestoGastado > 0
          ? Math.round(ev.presupuestoGastado / ev.registrosActuales) : null;
        const costoReg = costoRegNum !== null ? `$${costoRegNum.toLocaleString('es-MX')} ${ev.divisa || 'MXN'}` : '—';
        return `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#111827;">${ev.nombre}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;white-space:nowrap;">${fechaCorta(ev.fecha)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;text-align:right;">${(ev.registrosActuales || 0).toLocaleString('es-MX')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;text-align:right;">${(ev.registrosMeta || 0).toLocaleString('es-MX')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:${pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626'};text-align:right;">${pct}%</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;text-align:right;">${(ev.vipVendidas || 0).toLocaleString('es-MX')}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;text-align:right;">${ev.presupuestoTotal ? fmtNum(ev.presupuestoTotal, ev.divisa) : '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:${gastadoPct > 100 ? '#dc2626' : '#111827'};text-align:right;">${ev.presupuestoGastado ? `${fmtNum(ev.presupuestoGastado, ev.divisa)} <span style="font-size:10.5px;color:#9ca3af;">(${gastadoPct}%)</span>` : '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:${costoColor(costoRegNum, ev.region)};text-align:right;white-space:nowrap;">${costoReg}</td>
        </tr>`;
      }).join('');

      const regReg = grupo.evs.reduce((s, e) => s + (e.registrosActuales || 0), 0);
      const regMeta = grupo.evs.reduce((s, e) => s + (e.registrosMeta || 0), 0);
      const regPct = regMeta > 0 ? Math.round(regReg / regMeta * 100) : 0;

      return `<div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 14px;background:${grupo.color}12;border-left:4px solid ${grupo.color};border-radius:0 8px 8px 0;">
          <span style="font-size:13px;font-weight:800;color:${grupo.color};letter-spacing:0.5px;">${grupo.label}</span>
          <span style="font-size:11px;color:${grupo.color};opacity:0.7;">${grupo.evs.length} evento${grupo.evs.length !== 1 ? 's' : ''} · ${regReg.toLocaleString('es-MX')} / ${regMeta.toLocaleString('es-MX')} registros (${regPct}%)</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f9fafb;">
            <th style="text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Evento</th>
            <th style="text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Fecha</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Registros</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Meta</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">%Reg</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">VIP</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Presupuesto</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Gastado</th>
            <th style="text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;">Costo/Reg</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte de Eventos</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 40px 48px; background: #fff; color: #111827; }
      @media print { body { padding: 20px 28px; } }
    </style></head><body>
    <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #111827;">
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Sinergeticos · Marketing Lab</div>
      <h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 4px;">Reporte de Eventos</h1>
      <p style="font-size:13px;color:#6b7280;margin:0;">${hoyStr}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:32px;">
      ${[
        ['Eventos activos', eventosActivos.length, '#16a34a'],
        ['Total registros', totalReg.toLocaleString('es-MX'), '#111827'],
        ['Meta total', totalMeta.toLocaleString('es-MX'), '#6b7280'],
        ['Avance global', `${pctGlobal}%`, pctGlobal >= 80 ? '#16a34a' : pctGlobal >= 50 ? '#f59e0b' : '#dc2626'],
      ].map(([label, val, color]) => `
        <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;border:1px solid #e8e8ee;">
          <div style="font-size:20px;font-weight:800;color:${color};margin-bottom:3px;">${val}</div>
          <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
        </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:36px;">
      ${[
        ['VIP totales', totalVip.toLocaleString('es-MX'), '#7c3aed'],
        ['Regiones activas', regionesConEventos.length, '#111827'],
      ].map(([label, val, color]) => `
        <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;border:1px solid #e8e8ee;">
          <div style="font-size:20px;font-weight:800;color:${color};margin-bottom:3px;">${val}</div>
          <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
        </div>`).join('')}
    </div>

    ${regionSections}

    <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e8e8ee;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;">
      <span>Generado el ${hoy.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
      <span>marketinglab.sinergeticos.mx</span>
    </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Activa las ventanas emergentes en tu navegador para exportar el PDF'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  const inp = (extra = {}) => ({
    width: '100%', border: '1px solid var(--app-border)', borderRadius: 10, padding: '10px 14px',
    fontSize: 14, outline: 'none', background: 'var(--app-surface)', color: 'var(--app-text)', boxSizing: 'border-box', ...extra,
  });

  const sinRegion = filtrados.filter(e => !e.region);

  return (
    <>
    <div style={{ background: 'var(--app-bg)', minHeight: '100%' }}>

      {/* ── Íconos fijos en topbar ── */}
      <div style={{ position: 'fixed', top: 0, right: 14, height: 48, display: 'flex', alignItems: 'center', gap: 6, zIndex: 30 }}>
        <button
          onClick={modo === 'presenciales' ? exportarPDF : () => digitalesRef.current?.generarPDF()}
          data-tooltip="Reporte PDF"
          style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#6b7280', border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#111827'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </button>
        {modo === 'presenciales' && (
          <button onClick={() => setShowHistorial(true)} data-tooltip="Historial"
            style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#6b7280', border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#111827'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
        )}
      </div>

      {/* ── Undo toast ── */}
      {undoToast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {undoToast}
          {undoStack.length > 0 && <span style={{ color: 'var(--app-text-subtle)', fontSize: 11 }}>({undoStack.length} más)</span>}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>Eventos</h1>
          {/* Switcher Presenciales / Digitales */}
          <div style={{ display: 'flex', background: 'var(--app-surface-2)', borderRadius: 10, padding: 3 }}>
            {[['presenciales','🏟 Presenciales'],['digitales','📡 Digitales']].map(([key, label]) => (
              <button key={key} onClick={() => setModo(key)}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: modo === key ? 700 : 500, background: modo === key ? 'var(--app-surface)' : 'transparent', color: modo === key ? 'var(--app-text)' : 'var(--app-text-muted)', boxShadow: modo === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {modo === 'presenciales' ? (
            <>
              {/* Vista toggle */}
              <div style={{ display: 'flex', background: 'var(--app-surface-2)', borderRadius: 8, padding: 3 }}>
                {[['grid','⊞ Todos'],['regiones','⊟ Regiones']].map(([key, label]) => (
                  <button key={key} onClick={() => setVista(key)}
                    style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: vista === key ? 700 : 400, background: vista === key ? 'var(--app-surface)' : 'transparent', color: vista === key ? 'var(--app-text)' : 'var(--app-text-muted)', boxShadow: vista === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                    {label}
                  </button>
                ))}
              </div>

              {vista === 'regiones' && (
                <button onClick={() => setShowRegionesConfig(true)} title="Editar colores de regiones"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'var(--app-surface)', color: 'var(--app-text-2)', border: '1px solid var(--app-border)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {regiones.map(r => <span key={r.id} style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />)}
                  Regiones
                </button>
              )}

              {can('edit') && (
                <button onClick={abrir} data-tooltip="Nuevo Evento"
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 20, fontWeight: 400, cursor: 'pointer', flexShrink: 0 }}>
                  +
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {can('edit') && (
                <button onClick={() => digitalesRef.current?.abrir()} data-tooltip="Nueva Serie"
                  style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 20, fontWeight: 400, cursor: 'pointer', flexShrink: 0 }}>
                  +
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter tabs — solo en modo presenciales ── */}
      {modo === 'presenciales' && (
        <div style={{ padding: '12px 28px 0', background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['activo','Activos'],['planificado','Planificados'],['completado','Completados'],['todos','Todos']].map(([key, label]) => (
              <button key={key} onClick={() => setFiltro(key)}
                style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filtro === key ? 700 : 500, background: filtro === key ? '#111827' : 'var(--app-surface-2)', color: filtro === key ? '#fff' : 'var(--app-text-muted)', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {label}
                <span style={{ fontSize: 11, background: filtro === key ? 'rgba(255,255,255,0.2)' : 'var(--app-border)', color: filtro === key ? '#fff' : 'var(--app-text-subtle)', borderRadius: 10, padding: '1px 6px', fontWeight: 600 }}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── DIGITALES ── */}
      {modo === 'digitales' && <EventosDigitales ref={digitalesRef} />}

      {/* ── GRID VIEW ── */}
      {modo === 'presenciales' && vista === 'grid' && (
        <div style={{ padding: '20px 28px' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-text-subtle)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Sin eventos</div>
              <div style={{ fontSize: 13 }}>Crea el primer evento con "+ Nuevo Evento"</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
              {filtrados.map(ev => {
                const estadoObj = ESTADOS_CONFIG.find(e => e.key === ev.estado) || ESTADOS_CONFIG[0];
                return <EventCard key={ev.id} ev={ev} tipos={tipos} regiones={regiones} estadoObj={estadoObj} onEdit={can('edit') ? abrirEditar : undefined} onAjustar={can('edit') ? ajustar : undefined} onResultados={setDrawerEvento} />;
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REGIONES VIEW ── */}
      {modo === 'presenciales' && vista === 'regiones' && (
        <div style={{ padding: '20px 28px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', width: '100%' }}>
            {regiones.map(region => {
              const cols = filtrados.filter(e => e.region === region.id || (region.id === 'USA' && e.region === 'CAN'));
              return (
                <div key={region.id} style={{ flex: 1, minWidth: 260 }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '10px 14px', background: region.color + '18', borderRadius: 10, border: `1.5px solid ${region.color}44` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: region.color }} />
                      <span style={{ fontWeight: 800, fontSize: 14, color: region.color, letterSpacing: 0.5 }}>{region.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: region.color + '33', color: region.color, borderRadius: 10, padding: '1px 7px' }}>{cols.length}</span>
                    </div>
                    {can('edit') && <button onClick={() => { abrir(); }} title={`Agregar evento en ${region.label}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: region.color, fontSize: 20, lineHeight: 1, fontWeight: 700, opacity: 0.7 }}>+</button>}
                  </div>

                  {/* Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cols.map(ev => {
                      const estadoObj = ESTADOS_CONFIG.find(e => e.key === ev.estado) || ESTADOS_CONFIG[0];
                      return <EventCard key={ev.id} ev={ev} tipos={tipos} regiones={regiones} estadoObj={estadoObj} onEdit={can('edit') ? abrirEditar : undefined} onAjustar={can('edit') ? ajustar : undefined} onResultados={setDrawerEvento} compact />;
                    })}
                    {cols.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 10px', color: '#d1d5db', fontSize: 12, border: `1px dashed ${region.color}44`, borderRadius: 10, background: 'var(--app-surface)' }}>
                        Sin eventos
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Sin región column */}
            {sinRegion.length > 0 && (
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'var(--app-surface-2)', borderRadius: 10, border: '1.5px solid var(--app-border)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9ca3af' }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--app-text-subtle)' }}>Sin región</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#e5e7eb', color: 'var(--app-text-subtle)', borderRadius: 10, padding: '1px 7px' }}>{sinRegion.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sinRegion.map(ev => {
                    const estadoObj = ESTADOS_CONFIG.find(e => e.key === ev.estado) || ESTADOS_CONFIG[0];
                    return <EventCard key={ev.id} ev={ev} tipos={tipos} regiones={regiones} estadoObj={estadoObj} onEdit={can('edit') ? abrirEditar : undefined} onAjustar={can('edit') ? ajustar : undefined} onResultados={setDrawerEvento} compact />;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REGIONES CONFIG MODAL ── */}
      {showRegionesConfig && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowRegionesConfig(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 16, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--app-border-light)' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text)' }}>Colores de Regiones</div>
                <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 2 }}>Haz clic en el color para cambiarlo</div>
              </div>
              <button onClick={() => setShowRegionesConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {regiones.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: r.color + '10', borderRadius: 10, border: `1px solid ${r.color}33` }}>
                  <label title="Cambiar color" style={{ position: 'relative', width: 28, height: 28, borderRadius: 8, background: r.color, cursor: 'pointer', flexShrink: 0, border: '2px solid rgba(0,0,0,0.1)' }}>
                    <input type="color" value={r.color}
                      onChange={e => saveRegiones(regiones.map(x => x.id === r.id ? { ...x, color: e.target.value } : x))}
                      style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
                  </label>
                  <span style={{ fontSize: 15, fontWeight: 800, color: r.color, letterSpacing: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginLeft: 'auto' }}>{eventos.filter(e => e.region === r.id || (r.id === 'USA' && e.region === 'CAN')).length} eventos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EVENTO MODAL ── */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface-alt)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', background: 'var(--app-surface-alt)', borderBottom: '1px solid var(--app-border-light)', position: 'sticky', top: 0, zIndex: 5, borderRadius: '16px 16px 0 0' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--app-text)' }}>{editandoId ? 'Editar Evento' : 'Nuevo Evento'}</div>
                <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 2 }}>Completa la información del nuevo evento</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Nombre */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Nombre del evento</label>
                <input value={form.nombre} onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setFormError(false); }}
                  style={inp(formError && !form.nombre.trim() ? { border: '2px solid #e53e3e' } : {})} autoFocus />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={inp({ resize: 'vertical', minHeight: 80 })} />
              </div>

              {/* Tipo + Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inp()}>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Estado</label>
                  <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={inp()}>
                    {ESTADOS_CONFIG.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Región */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 8 }}>Región</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setForm(p => ({ ...p, region: '' }))}
                    style={{ padding: '7px 16px', borderRadius: 8, border: `2px solid ${!form.region ? '#374151' : 'var(--app-border)'}`, background: !form.region ? '#111827' : 'var(--app-surface)', color: !form.region ? '#fff' : 'var(--app-text-subtle)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Sin región
                  </button>
                  {regiones.map(r => (
                    <button key={r.id} type="button" onClick={() => setForm(p => ({ ...p, region: r.id }))}
                      style={{ padding: '7px 18px', borderRadius: 8, border: `2px solid ${form.region === r.id ? r.color : r.color + '44'}`, background: form.region === r.id ? r.color : r.color + '12', color: form.region === r.id ? '#fff' : r.color, fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5 }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha + Hora + Ubicación */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Ubicación</label>
                  <input value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Ciudad o plataforma" style={inp()} />
                </div>
              </div>

              {/* Segundo horario (opcional) */}
              {form.hora2
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>
                        Segundo horario
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--app-text-subtle)', marginLeft: 6 }}>opcional</span>
                      </label>
                      <input type="time" value={form.hora2} onChange={e => setForm(p => ({ ...p, hora2: e.target.value }))} style={inp({ maxWidth: 180 })} />
                    </div>
                    <button type="button" onClick={() => setForm(p => ({ ...p, hora2: '' }))}
                      style={{ marginTop: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 18, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}
                      title="Quitar segundo horario">×</button>
                  </div>
                : <button type="button" onClick={() => setForm(p => ({ ...p, hora2: '00:00' }))}
                    style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #e8e8ee', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--app-text-subtle)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    + Agregar segundo horario
                  </button>
              }

              {/* Registros */}
              <div style={{ background: 'var(--app-surface)', borderRadius: 12, border: '1px solid var(--app-border-light)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>👥 Registros</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[['registrosMeta','Meta',1000],['registrosActuales','Actuales',1],['vipVendidas','VIP vendidas',1]].map(([k, label, step]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--app-text-2)', marginBottom: 5 }}>{label}</label>
                      <input type="number" min="0" step={step} value={form[k] || 0} onChange={e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))}
                        style={{ width: '100%', border: '1px solid var(--app-border)', borderRadius: 8, padding: '8px', fontSize: 14, textAlign: 'center', outline: 'none', background: 'var(--app-surface-alt)', color: 'var(--app-text)', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Presupuesto */}
              <div style={{ background: 'var(--app-surface)', borderRadius: 12, border: '1px solid var(--app-border-light)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>$ Presupuesto</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[['presupuestoTotal','Total'],['presupuestoGastado','Gastado']].map(([k, label]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--app-text-2)', marginBottom: 5 }}>{label}</label>
                      <input type="number" min="0" step={50000} value={form[k] || 0} onChange={e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))}
                        style={{ width: '100%', border: '1px solid var(--app-border)', borderRadius: 8, padding: '8px', fontSize: 14, textAlign: 'center', outline: 'none', background: 'var(--app-surface-alt)', color: 'var(--app-text)', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--app-text-2)', marginBottom: 5 }}>Divisa</label>
                    <select value={form.divisa} onChange={e => setForm(p => ({ ...p, divisa: e.target.value }))}
                      style={{ width: '100%', border: '1px solid var(--app-border)', borderRadius: 8, padding: '8px', fontSize: 14, outline: 'none', background: 'var(--app-surface-alt)', color: 'var(--app-text)', boxSizing: 'border-box' }}>
                      {DIVISAS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Enlaces */}
              <div style={{ background: 'var(--app-surface)', borderRadius: 12, border: '1px solid var(--app-border-light)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>🔗 Enlaces</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--app-text-2)', marginBottom: 5 }}>Página de registro</label>
                    <input value={form.urlRegistro} onChange={e => setForm(p => ({ ...p, urlRegistro: e.target.value }))} placeholder="https://..." style={inp()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--app-text-2)', marginBottom: 5 }}>Carpeta de Drive</label>
                    <input value={form.urlDrive} onChange={e => setForm(p => ({ ...p, urlDrive: e.target.value }))} placeholder="https://drive.google.com/..." style={inp()} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid var(--app-border-light)', background: 'var(--app-surface-alt)', borderRadius: '0 0 16px 16px', position: 'sticky', bottom: 0 }}>
              <div>
                {editandoId && <button onClick={() => { eliminar(editandoId); setShowModal(false); }} style={{ padding: '9px 16px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid var(--app-border)', borderRadius: 8, background: 'var(--app-surface)', cursor: 'pointer', fontSize: 13, color: '#555' }}>Cancelar</button>
                <button onClick={guardar} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{editandoId ? 'Guardar cambios' : 'Crear Evento'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIAL PANEL ── */}
      {showHistorial && (() => {
        const TIPO_CFG = {
          creado:    { label: 'Creado',   bg: '#dcfce7', color: '#16a34a' },
          editado:   { label: 'Editado',  bg: '#dbeafe', color: '#2563eb' },
          eliminado: { label: 'Eliminado',bg: '#fee2e2', color: '#dc2626' },
          ajustado:  { label: 'Ajustado', bg: '#ede9fe', color: '#7c3aed' },
        };

        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);

        function getGrupo(ts) {
          const d = new Date(ts); d.setHours(0, 0, 0, 0);
          if (d.getTime() === hoy.getTime()) return 'Hoy';
          if (d.getTime() === ayer.getTime()) return 'Ayer';
          return 'Esta semana';
        }
        function fmtFechaHora(ts) {
          return new Date(ts).toLocaleString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true });
        }

        const grupos = ['Hoy', 'Ayer', 'Esta semana'];
        const porGrupo = {};
        historial.forEach(e => {
          const g = getGrupo(e.ts);
          if (!porGrupo[g]) porGrupo[g] = [];
          porGrupo[g].push(e);
        });

        return (
          <div onClick={e => { if (e.target === e.currentTarget) setShowHistorial(false); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 400, maxWidth: '94vw', background: '#f4f5f7', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 28px rgba(0,0,0,0.14)' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 22px 18px', background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text)' }}>Historial de cambios</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 2 }}>Últimos 7 días · {historial.length} {historial.length === 1 ? 'registro' : 'registros'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {historial.length > 0 && (
                    <button onClick={() => { setHistorial([]); if (canSync.current) dbSet('eventos_historial', []); }}
                      style={{ background: 'none', border: '1px solid var(--app-border)', cursor: 'pointer', fontSize: 11, color: 'var(--app-text-subtle)', padding: '4px 10px', borderRadius: 6 }}>
                      Limpiar
                    </button>
                  )}
                  <button onClick={() => setShowHistorial(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#aaa', lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {historial.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <div style={{ fontSize: 13, color: 'var(--app-text-subtle)' }}>Sin cambios registrados</div>
                  </div>
                ) : grupos.filter(g => porGrupo[g]?.length).map(grupo => (
                  <div key={grupo}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 2 }}>
                      {grupo}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {porGrupo[grupo].map(entry => {
                        const cfg = TIPO_CFG[entry.tipo] || { label: entry.tipo, bg: '#f3f4f6', color: 'var(--app-text-muted)' };
                        const dotColor = entry.color || colorForUser(entry.usuario || '');
                        return (
                          <div key={entry.id} style={{ background: 'var(--app-surface)', borderRadius: 12, border: '1px solid var(--app-border)', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.3 }}>
                                {fmtFechaHora(entry.ts)}
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: 20, flexShrink: 0, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                                {cfg.label}
                              </span>
                            </div>
                            {entry.nombre && (
                              <div style={{ fontSize: 12, color: 'var(--app-text-2)', fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.nombre}
                              </div>
                            )}
                            {entry.desc && (
                              <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                                {entry.desc}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{entry.usuario || 'Usuario'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>

    {drawerEvento && (
      <ResultadosDrawer
        evento={drawerEvento}
        regiones={regiones}
        onClose={() => setDrawerEvento(null)}
        onSave={guardarResultados}
      />
    )}
    </>
  );
}
