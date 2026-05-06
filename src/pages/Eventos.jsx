import { useState, useEffect, useRef } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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

function fmtHora(hora) {
  if (!hora) return '';
  const [h, m] = hora.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

// ── Mini event card used in both views ──────────────────────────────────────
function EventCard({ ev, tipos, regiones, estadoObj, onEdit, onAjustar, compact = false }) {
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
  const costoReg = ev.registrosActuales > 0 && ev.presupuestoGastado > 0
    ? `$${Math.round(ev.presupuestoGastado / ev.registrosActuales).toLocaleString('es-MX')} ${ev.divisa || 'MXN'}`
    : '—';
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
      style={{ width: 70, border: '1px solid #e879a0', borderRadius: 6, padding: '2px 6px', fontSize: 13, fontWeight: 700, color: '#111827', background: '#fff', outline: 'none', textAlign: 'center' }}
    />
  );

  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f5', padding: compact ? '14px 16px' : '18px 20px' }}>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: estadoObj.color }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {estadoObj.label}{tipoObj ? ` · ${tipoObj.label}` : ''}
          </span>
          {regionObj && !compact && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: regionObj.color + '22', color: regionObj.color, border: `1px solid ${regionObj.color}44` }}>
              {regionObj.label}
            </span>
          )}
        </div>
        {onEdit && <button onClick={() => onEdit(ev)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 20, lineHeight: 1, letterSpacing: 2, padding: '0 2px', fontWeight: 700 }}>···</button>}
      </div>

      {/* Title */}
      <div style={{ fontSize: compact ? 15 : 19, fontWeight: 700, color: '#111827', marginBottom: 8, lineHeight: 1.3 }}>{ev.nombre}</div>

      {/* Date + location */}
      {(fechaFmt || ev.ubicacion) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {fechaFmt && <span style={{ fontSize: 12, color: '#6b7280' }}>📅 {fechaFmt}{ev.hora ? ` · ${fmtHora(ev.hora)}${ev.hora2 ? ` – ${fmtHora(ev.hora2)}` : ''}` : ''}</span>}
          {ev.ubicacion && <span style={{ fontSize: 12, color: '#6b7280' }}>📍 {ev.ubicacion}</span>}
        </div>
      )}

      {/* Registros */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' }}>👥 Registros ({pct}%)</span>
            {ev.hora2 && (
              <button onClick={() => setShowHorarios(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showHorarios ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {onAjustar && <button onClick={() => onAjustar(ev.id, 'registrosActuales', -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 0 }}>−</button>}
            {editReg !== null && onAjustar
              ? inlineInput(editReg, setEditReg, 'registrosActuales', ev.registrosActuales, setEditReg)
              : <span onClick={onAjustar ? () => setEditReg(String(ev.registrosActuales || 0)) : undefined} title={onAjustar ? "Clic para editar" : undefined} style={{ fontSize: 14, fontWeight: 700, color: '#111827', cursor: onAjustar ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>{(ev.registrosActuales || 0).toLocaleString('es-MX')}</span>
            }
            <span style={{ fontSize: 12, color: '#9ca3af' }}>/ {(ev.registrosMeta || 0).toLocaleString('es-MX')}</span>
            {onAjustar && <button onClick={() => onAjustar(ev.id, 'registrosActuales', 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>}
          </div>
        </div>
        <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#facc15', borderRadius: 99 }} />
        </div>

        {/* Registros por horario — solo si hay segundo horario y está expandido */}
        {ev.hora2 && showHorarios && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              ['registrosHora1', ev.hora,  editH1, setEditH1],
              ['registrosHora2', ev.hora2, editH2, setEditH2],
            ].map(([campo, hora, editVal, setEditVal]) => (
              <div key={campo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{fmtHora(hora)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {onAjustar && <button onClick={() => onAjustar(ev.id, campo, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>−</button>}
                  {editVal !== null && onAjustar
                    ? inlineInput(editVal, setEditVal, campo, ev[campo], setEditVal)
                    : <span onClick={onAjustar ? () => setEditVal(String(ev[campo] || 0)) : undefined} title={onAjustar ? 'Clic para editar' : undefined} style={{ fontSize: 13, fontWeight: 700, color: '#111827', cursor: onAjustar ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>{(ev[campo] || 0).toLocaleString('es-MX')}</span>
                  }
                  {onAjustar && <button onClick={() => onAjustar(ev.id, campo, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: 0 }}>+</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget */}
      {tienePres && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '10px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: '#111827' }}>{fmt(ev.presupuestoTotal, ev.divisa)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Presupuesto</div>
          </div>
          <div>
            {editGastado !== null
              ? <>
                  <input
                    type="number" min="0" value={editGastado} autoFocus
                    onChange={e => setEditGastado(e.target.value)}
                    onBlur={() => commitEdit('presupuestoGastado', editGastado, ev.presupuestoGastado, setEditGastado)}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditGastado(null); }}
                    style={{ width: '100%', border: '1px solid #e879a0', borderRadius: 6, padding: '2px 6px', fontSize: compact ? 12 : 13, fontWeight: 700, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Gastado ({gastadoPct}%)</div>
                </>
              : <>
                  <div onClick={onAjustar ? () => setEditGastado(String(ev.presupuestoGastado || 0)) : undefined} title={onAjustar ? 'Clic para editar' : undefined} style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: '#111827', cursor: onAjustar ? 'text' : 'default' }}>{fmt(ev.presupuestoGastado, ev.divisa)}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Gastado ({gastadoPct}%)</div>
                </>
            }
          </div>
          <div>
            <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: '#4ade80' }}>{costoReg}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Costo/Reg.</div>
          </div>
        </div>
      )}

      {/* VIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ev.urlRegistro || ev.urlDrive ? 8 : 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' }}>🎟 VIP</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {onAjustar && <button onClick={() => onAjustar(ev.id, 'vipVendidas', -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 0 }}>−</button>}
          {editVip !== null && onAjustar
            ? inlineInput(editVip, setEditVip, 'vipVendidas', ev.vipVendidas, setEditVip)
            : <span onClick={onAjustar ? () => setEditVip(String(ev.vipVendidas || 0)) : undefined} title={onAjustar ? "Clic para editar" : undefined} style={{ fontSize: 14, fontWeight: 700, color: '#111827', cursor: onAjustar ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>{ev.vipVendidas || 0}</span>
          }
          {onAjustar && <button onClick={() => onAjustar(ev.id, 'vipVendidas', 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>}
        </div>
      </div>

      {/* Links */}
      {(ev.urlRegistro || ev.urlDrive) && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, display: 'flex', gap: 14 }}>
          {ev.urlRegistro && <a href={ev.urlRegistro} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600, textDecoration: 'none' }}>🔗 Registro</a>}
          {ev.urlDrive && <a href={ev.urlDrive} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4a9eff', fontWeight: 600, textDecoration: 'none' }}>📁 Drive</a>}
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

  const [vista, setVista] = useState('grid');
  const [filtro, setFiltro] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showTiposModal, setShowTiposModal] = useState(false);
  const [showRegionesConfig, setShowRegionesConfig] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [formError, setFormError] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState({ label: '', color: '#4a9eff' });

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

  const filtrados = eventos.filter(e => filtro === 'todos' || e.estado === filtro);
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
      saveEventos(eventos.map(e => e.id === editandoId ? { ...e, ...form } : e), `edición de "${form.nombre.trim()}"`);
      log('editado', form.nombre.trim(), desc);
    } else {
      saveEventos([...eventos, { ...form, id: Date.now() }], `creación de "${form.nombre.trim()}"`);
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
    saveEventos(eventos.map(e => e.id === id ? { ...e, [campo]: newVal } : e), `ajuste de ${label} en "${ev?.nombre}"`);
    log('ajustado', ev?.nombre || 'Evento', `${label}: ${oldVal.toLocaleString('es-MX')} → ${newVal.toLocaleString('es-MX')}`);
  }

  function agregarTipo() {
    if (!nuevoTipo.label.trim()) return;
    saveTipos([...tipos, { id: 'tipo_' + Date.now(), label: nuevoTipo.label.trim(), color: nuevoTipo.color }]);
    setNuevoTipo({ label: '', color: '#4a9eff' });
  }
  function eliminarTipo(id) { saveTipos(tipos.filter(t => t.id !== id)); }

  const inp = (extra = {}) => ({
    width: '100%', border: '1px solid #e8e8ee', borderRadius: 10, padding: '10px 14px',
    fontSize: 14, outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box', ...extra,
  });

  const sinRegion = filtrados.filter(e => !e.region);

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100%' }}>

      {/* ── Undo toast ── */}
      {undoToast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {undoToast}
          {undoStack.length > 0 && <span style={{ color: '#9ca3af', fontSize: 11 }}>({undoStack.length} más)</span>}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', background: '#fff', borderBottom: '1px solid #e8e8ee', position: 'sticky', top: 0, zIndex: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Eventos</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>

          {/* Vista toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
            {[['grid','⊞ Todos'],['regiones','⊟ Regiones']].map(([key, label]) => (
              <button key={key} onClick={() => setVista(key)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: vista === key ? 700 : 400, background: vista === key ? '#fff' : 'transparent', color: vista === key ? '#111827' : '#6b7280', boxShadow: vista === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Regiones config */}
          {vista === 'regiones' && (
            <button onClick={() => setShowRegionesConfig(true)} title="Editar colores de regiones"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#fff', color: '#374151', border: '1px solid #e8e8ee', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {regiones.map(r => <span key={r.id} style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />)}
              Regiones
            </button>
          )}

          <button onClick={() => setShowTiposModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fff', color: '#374151', border: '1px solid #e8e8ee', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Tipos
          </button>

          <button onClick={() => setShowHistorial(true)} title="Ver historial"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fff', color: '#374151', border: '1px solid #e8e8ee', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Historial
          </button>

          {can('edit') && (
            <button onClick={abrir}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              + Nuevo Evento
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ padding: '12px 28px 0', background: '#fff', borderBottom: '1px solid #e8e8ee' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['todos','Todos'],['activo','Activos'],['planificado','Planificados'],['completado','Completados']].map(([key, label]) => (
              <button key={key} onClick={() => setFiltro(key)}
                style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filtro === key ? 700 : 500, background: filtro === key ? '#111827' : '#f3f4f6', color: filtro === key ? '#fff' : '#6b7280', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {label}
                <span style={{ fontSize: 11, background: filtro === key ? 'rgba(255,255,255,0.2)' : '#e5e7eb', color: filtro === key ? '#fff' : '#9ca3af', borderRadius: 10, padding: '1px 6px', fontWeight: 600 }}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

      {/* ── GRID VIEW ── */}
      {vista === 'grid' && (
        <div style={{ padding: '20px 28px' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Sin eventos</div>
              <div style={{ fontSize: 13 }}>Crea el primer evento con "+ Nuevo Evento"</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
              {filtrados.map(ev => {
                const estadoObj = ESTADOS_CONFIG.find(e => e.key === ev.estado) || ESTADOS_CONFIG[0];
                return <EventCard key={ev.id} ev={ev} tipos={tipos} regiones={regiones} estadoObj={estadoObj} onEdit={can('edit') ? abrirEditar : undefined} onAjustar={can('edit') ? ajustar : undefined} />;
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REGIONES VIEW ── */}
      {vista === 'regiones' && (
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
                      return <EventCard key={ev.id} ev={ev} tipos={tipos} regiones={regiones} estadoObj={estadoObj} onEdit={can('edit') ? abrirEditar : undefined} onAjustar={can('edit') ? ajustar : undefined} compact />;
                    })}
                    {cols.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 10px', color: '#d1d5db', fontSize: 12, border: `1px dashed ${region.color}44`, borderRadius: 10, background: '#fff' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: '#f3f4f6', borderRadius: 10, border: '1.5px solid #e5e7eb' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9ca3af' }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#9ca3af' }}>Sin región</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#e5e7eb', color: '#9ca3af', borderRadius: 10, padding: '1px 7px' }}>{sinRegion.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sinRegion.map(ev => {
                    const estadoObj = ESTADOS_CONFIG.find(e => e.key === ev.estado) || ESTADOS_CONFIG[0];
                    return <EventCard key={ev.id} ev={ev} tipos={tipos} regiones={regiones} estadoObj={estadoObj} onEdit={can('edit') ? abrirEditar : undefined} onAjustar={can('edit') ? ajustar : undefined} compact />;
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Colores de Regiones</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Haz clic en el color para cambiarlo</div>
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
                  <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{eventos.filter(e => e.region === r.id || (r.id === 'USA' && e.region === 'CAN')).length} eventos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TIPOS MODAL ── */}
      {showTiposModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowTiposModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Tipos de Evento</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Crea, edita o elimina tipos de evento</div>
              </div>
              <button onClick={() => setShowTiposModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '16px 22px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {tipos.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', background: t.color }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t.label}</span>
                    </div>
                    {!TIPOS_DEFAULT.find(d => d.id === t.id) && (
                      <button onClick={() => eliminarTipo(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, lineHeight: 1 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Nuevo Tipo</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ position: 'relative', width: 38, height: 38, borderRadius: 8, background: nuevoTipo.color, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}>
                  <input type="color" value={nuevoTipo.color} onChange={e => setNuevoTipo(p => ({ ...p, color: e.target.value }))} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
                </label>
                <input value={nuevoTipo.label} onChange={e => setNuevoTipo(p => ({ ...p, label: e.target.value }))} onKeyDown={e => e.key === 'Enter' && agregarTipo()} placeholder="Ej: conferencia" style={{ flex: 1, border: '1px solid #e8e8ee', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', background: '#f9fafb', color: '#111827' }} />
                <button onClick={agregarTipo} style={{ padding: '10px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENTO MODAL ── */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#f9fafb', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', background: '#f9fafb', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 5, borderRadius: '16px 16px 0 0' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{editandoId ? 'Editar Evento' : 'Nuevo Evento'}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Completa la información del nuevo evento</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Nombre */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nombre del evento</label>
                <input value={form.nombre} onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setFormError(false); }}
                  style={inp(formError && !form.nombre.trim() ? { border: '2px solid #e53e3e' } : {})} autoFocus />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={inp({ resize: 'vertical', minHeight: 80 })} />
              </div>

              {/* Tipo + Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inp()}>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Estado</label>
                  <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={inp()}>
                    {ESTADOS_CONFIG.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Región */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Región</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setForm(p => ({ ...p, region: '' }))}
                    style={{ padding: '7px 16px', borderRadius: 8, border: `2px solid ${!form.region ? '#374151' : '#e8e8ee'}`, background: !form.region ? '#111827' : '#fff', color: !form.region ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Ubicación</label>
                  <input value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Ciudad o plataforma" style={inp()} />
                </div>
              </div>

              {/* Segundo horario (opcional) */}
              {form.hora2
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Segundo horario
                        <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>opcional</span>
                      </label>
                      <input type="time" value={form.hora2} onChange={e => setForm(p => ({ ...p, hora2: e.target.value }))} style={inp({ maxWidth: 180 })} />
                    </div>
                    <button type="button" onClick={() => setForm(p => ({ ...p, hora2: '' }))}
                      style={{ marginTop: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 18, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}
                      title="Quitar segundo horario">×</button>
                  </div>
                : <button type="button" onClick={() => setForm(p => ({ ...p, hora2: '00:00' }))}
                    style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #e8e8ee', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#9ca3af', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    + Agregar segundo horario
                  </button>
              }

              {/* Registros */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f5', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>👥 Registros</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[['registrosMeta','Meta',1000],['registrosActuales','Actuales',1],['vipVendidas','VIP vendidas',1]].map(([k, label, step]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 5 }}>{label}</label>
                      <input type="number" min="0" step={step} value={form[k] || 0} onChange={e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))}
                        style={{ width: '100%', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px', fontSize: 14, textAlign: 'center', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Presupuesto */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f5', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>$ Presupuesto</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[['presupuestoTotal','Total'],['presupuestoGastado','Gastado']].map(([k, label]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 5 }}>{label}</label>
                      <input type="number" min="0" step={50000} value={form[k] || 0} onChange={e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))}
                        style={{ width: '100%', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px', fontSize: 14, textAlign: 'center', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 5 }}>Divisa</label>
                    <select value={form.divisa} onChange={e => setForm(p => ({ ...p, divisa: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px', fontSize: 14, outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}>
                      {DIVISAS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Enlaces */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f5', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>🔗 Enlaces</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 5 }}>Página de registro</label>
                    <input value={form.urlRegistro} onChange={e => setForm(p => ({ ...p, urlRegistro: e.target.value }))} placeholder="https://..." style={inp()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 5 }}>Carpeta de Drive</label>
                    <input value={form.urlDrive} onChange={e => setForm(p => ({ ...p, urlDrive: e.target.value }))} placeholder="https://drive.google.com/..." style={inp()} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid #eee', background: '#f9fafb', borderRadius: '0 0 16px 16px', position: 'sticky', bottom: 0 }}>
              <div>
                {editandoId && <button onClick={() => { eliminar(editandoId); setShowModal(false); }} style={{ padding: '9px 16px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e8e8ee', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' }}>Cancelar</button>
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 22px 18px', background: '#fff', borderBottom: '1px solid #e8e8ee' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Historial de cambios</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Últimos 7 días · {historial.length} {historial.length === 1 ? 'registro' : 'registros'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {historial.length > 0 && (
                    <button onClick={() => { setHistorial([]); if (canSync.current) dbSet('eventos_historial', []); }}
                      style={{ background: 'none', border: '1px solid #e8e8ee', cursor: 'pointer', fontSize: 11, color: '#9ca3af', padding: '4px 10px', borderRadius: 6 }}>
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
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>Sin cambios registrados</div>
                  </div>
                ) : grupos.filter(g => porGrupo[g]?.length).map(grupo => (
                  <div key={grupo}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 2 }}>
                      {grupo}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {porGrupo[grupo].map(entry => {
                        const cfg = TIPO_CFG[entry.tipo] || { label: entry.tipo, bg: '#f3f4f6', color: '#6b7280' };
                        const dotColor = entry.color || colorForUser(entry.usuario || '');
                        return (
                          <div key={entry.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8ee', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                                {fmtFechaHora(entry.ts)}
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: 20, flexShrink: 0, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                                {cfg.label}
                              </span>
                            </div>
                            {entry.nombre && (
                              <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.nombre}
                              </div>
                            )}
                            {entry.desc && (
                              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.4 }}>
                                {entry.desc}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{entry.usuario || 'Usuario'}</span>
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
  );
}
