import { useState, useEffect, useRef } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const COLORES = ['#e53e3e','#ea580c','#f59e0b','#16a34a','#0891b2','#4a9eff','#7c3aed','#ec4899'];

const ESTADOS_BASE = [
  { key: 'falta',        label: 'Falta',             color: '#ef4444', emoji: '❌' },
  { key: 'vacaciones',   label: 'Vacaciones',        color: '#22d3ee', emoji: '🌴' },
  { key: 'homeoffice',   label: 'Home Office',       color: '#94a3b8', emoji: '💻' },
  { key: 'falta_just',   label: 'Falta Justificada', color: '#a855f7', emoji: '📋' },
  { key: 'feriado',      label: 'Feriado',           color: '#e879f9', emoji: '🎉' },
  { key: 'retardo',      label: 'Retardo',           color: '#f59e0b', emoji: '⏰' },
  { key: 'retardo_just', label: 'Retardo Just.',     color: '#f59e0b', emoji: '⏰' },
];

function cumplesDia(iso, equipo) {
  const mmdd = iso.slice(5);
  return (equipo || []).filter(m => m.cumpleanos && m.cumpleanos.slice(5) === mmdd)
    .map(m => ({ nombre: m.alias || m.nombre || '?' }));
}

function asistenciaDia(iso, equipo, asistencia, estadoColores, customEstados, estadosConfig) {
  const miembros = (equipo || []).filter(m => m.enAsistencia !== false);
  return miembros.reduce((acc, m) => {
    const entry = asistencia?.[String(m.id)]?.[iso];
    if (!entry?.status) return acc;
    const base = ESTADOS_BASE.find(e => e.key === entry.status)
      || (customEstados || []).find(e => e.key === entry.status)
      || { key: entry.status, label: entry.status, color: '#6b7280', emoji: '•' };
    const cfg = (estadosConfig || {})[entry.status] || {};
    acc.push({
      nombre: m.alias || m.nombre || '?',
      status: entry.status,
      label: cfg.label || base.label,
      color: (estadoColores || {})[entry.status] || base.color,
      emoji: cfg.emoji !== undefined ? cfg.emoji : base.emoji,
    });
    return acc;
  }, []);
}
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const HORA_INI = 6;
const HORA_FIN = 22;
const PX_HR = 64;

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDomingoDe(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function evtEnDia(ev, iso) {
  return iso >= ev.fechaInicio && iso <= (ev.fechaFin || ev.fechaInicio);
}

function horaFin1(horaInicio) {
  const h = parseInt(horaInicio.split(':')[0]);
  return `${String(Math.min(h + 1, 23)).padStart(2,'0')}:00`;
}

// ── MODAL ──────────────────────────────────────────────────────────
function EventoModal({ evento: init, isEdit, onGuardar, onEliminar, onClose }) {
  const [ev, setEv] = useState(init);
  const [emailInput, setEmailInput] = useState('');
  const set = (k, v) => setEv(p => ({ ...p, [k]: v }));

  const inp = {
    width: '100%', border: '1.5px solid var(--app-border)', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, color: 'var(--app-text)',
    background: 'var(--app-surface-alt)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  function addEmail() {
    const e = emailInput.trim().toLowerCase();
    if (!e || !e.includes('@') || ev.invitados.includes(e)) return;
    set('invitados', [...ev.invitados, e]);
    setEmailInput('');
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--app-surface)', borderRadius: 16, padding: 28, width: '100%',
          maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Barra de color + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 5, height: 46, borderRadius: 4, background: ev.color, flexShrink: 0 }} />
          <input value={ev.titulo} onChange={e => set('titulo', e.target.value)}
            placeholder="Título del evento" autoFocus
            style={{ ...inp, fontSize: 16, fontWeight: 600, flex: 1 }} />
        </div>

        {/* Todo el día */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13, color: 'var(--app-text-muted)', userSelect: 'none' }}>
          <input type="checkbox" checked={ev.todoElDia} onChange={e => set('todoElDia', e.target.checked)} />
          Todo el día
        </label>

        {/* Fechas y horas */}
        <div style={{ display: 'grid', gridTemplateColumns: ev.todoElDia ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 4 }}>Inicio</div>
            <input type="date" value={ev.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} style={inp} />
          </div>
          {!ev.todoElDia && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 4 }}>Hora</div>
              <input type="time" value={ev.horaInicio} onChange={e => set('horaInicio', e.target.value)} style={inp} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 4 }}>Fin</div>
            <input type="date" value={ev.fechaFin} onChange={e => set('fechaFin', e.target.value)} style={inp} />
          </div>
          {!ev.todoElDia && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 4 }}>Hora</div>
              <input type="time" value={ev.horaFin} onChange={e => set('horaFin', e.target.value)} style={inp} />
            </div>
          )}
        </div>

        {/* Descripción */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 4 }}>Descripción</div>
          <textarea value={ev.descripcion} onChange={e => set('descripcion', e.target.value)}
            placeholder="Descripción (opcional)" rows={3}
            style={{ ...inp, resize: 'vertical' }} />
        </div>

        {/* Color */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 8 }}>Color</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORES.map(c => (
              <div key={c} onClick={() => set('color', c)}
                style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                  outline: ev.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, transition: 'outline 0.1s',
                }} />
            ))}
          </div>
        </div>

        {/* Invitados */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 8 }}>Invitados</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={emailInput} onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="correo@ejemplo.com" style={{ ...inp, flex: 1 }} />
            <button onClick={addEmail}
              style={{ padding: '9px 14px', background: 'var(--app-surface-2)', border: '1.5px solid var(--app-border)', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--app-text)', fontWeight: 700 }}>+</button>
          </div>
          {ev.invitados.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {ev.invitados.map(email => (
                <span key={email} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                  {email}
                  <button onClick={() => set('invitados', ev.invitados.filter(x => x !== email))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEdit && (
            <button onClick={() => { onEliminar(ev.id); onClose(); }}
              style={{ padding: '10px 16px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Eliminar
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '10px 18px', background: 'var(--app-surface-2)', border: '1.5px solid var(--app-border)', borderRadius: 8, color: 'var(--app-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={() => { if (!ev.titulo.trim()) return; onGuardar(ev); onClose(); }}
              style={{ padding: '10px 22px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VISTA MES ─────────────────────────────────────────────────────
function VistaMes({ hoy, navDate, eventos, onDiaClick, onEventoClick, getAsist, getCumple }) {
  const primerDia = new Date(navDate.getFullYear(), navDate.getMonth(), 1);
  const inicioGrid = new Date(primerDia);
  inicioGrid.setDate(1 - primerDia.getDay());
  const hoyISO = toISO(hoy);
  const mes = navDate.getMonth();

  const dias = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrid);
    d.setDate(inicioGrid.getDate() + i);
    return d;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Encabezado días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', flexShrink: 0 }}>
        {DIAS_CORTO.map(d => (
          <div key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', flex: 1, overflow: 'hidden' }}>
        {dias.map((d, i) => {
          const iso = toISO(d);
          const esHoy = iso === hoyISO;
          const esMes = d.getMonth() === mes;
          const evs = eventos.filter(ev => evtEnDia(ev, iso));
          return (
            <div key={iso} onClick={() => onDiaClick(iso)}
              style={{
                borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--app-border)',
                borderBottom: '1px solid var(--app-border)',
                padding: '5px 4px 3px',
                background: esHoy ? 'rgba(229,62,62,0.04)' : 'var(--app-surface)',
                cursor: 'pointer', overflow: 'hidden',
                opacity: esMes ? 1 : 0.4,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = esHoy ? 'rgba(229,62,62,0.08)' : 'var(--app-surface-alt)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = esHoy ? 'rgba(229,62,62,0.04)' : 'var(--app-surface)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: esHoy ? '#e53e3e' : 'transparent', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: esHoy ? 700 : 400, color: esHoy ? '#fff' : 'var(--app-text)' }}>
                  {d.getDate()}
                </span>
              </div>
              {evs.slice(0, 3).map(ev => (
                <div key={ev.id} onClick={e => onEventoClick(ev, e)}
                  style={{ background: ev.color, color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                  {!ev.todoElDia && ev.horaInicio && <span style={{ opacity: 0.85 }}>{ev.horaInicio} </span>}
                  {ev.titulo}
                </div>
              ))}
              {evs.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--app-text-muted)', paddingLeft: 5 }}>+{evs.length - 3} más</div>
              )}
              {(() => {
                const asist = getAsist(iso);
                const cumples = getCumple(iso);
                if (!asist.length && !cumples.length) return null;
                const cumpleChips = cumples.map(c => ({ nombre: c.nombre, color: '#f59e0b', emoji: '🎂', key: 'cumple-' + c.nombre }));
                const asistChips = asist.map(a => ({ ...a, key: a.nombre + a.status }));
                const all = [...cumpleChips, ...asistChips];
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 }}>
                    {all.slice(0, 2).map(a => (
                      <span key={a.key}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: a.color + '28', border: `1px solid ${a.color}55`, borderRadius: 3, padding: '1px 4px', fontSize: 9, color: 'var(--app-text)', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden' }}>
                        {a.emoji} {a.nombre.split(' ')[0]}
                      </span>
                    ))}
                    {all.length > 2 && (
                      <span style={{ fontSize: 9, color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center' }}>+{all.length - 2}</span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VISTA SEMANA ──────────────────────────────────────────────────
function VistaSemana({ hoy, navDate, eventos, onSlotClick, onEventoClick, getAsist, getCumple }) {
  const hoyISO = toISO(hoy);
  const domingo = getDomingoDe(navDate);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo);
    d.setDate(domingo.getDate() + i);
    return d;
  });
  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);
  const ahora = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();
  const topActual = (minActual - HORA_INI * 60) / 60 * PX_HR;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado días + fila todo-el-día */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '2px solid var(--app-border)', position: 'sticky', top: 0, background: 'var(--app-surface)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ borderRight: '1px solid var(--app-border)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 6, paddingBottom: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>todo<br/>día</span>
        </div>
        {diasSemana.map((d, i) => {
          const iso = toISO(d);
          const esHoy = iso === hoyISO;
          const evsTodo = eventos.filter(ev => (ev.todoElDia || !ev.horaInicio) && evtEnDia(ev, iso));
          return (
            <div key={iso} style={{ borderLeft: i > 0 ? '1px solid var(--app-border)' : 'none', padding: '6px 4px 4px' }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {DIAS_CORTO[i]}
                </div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: esHoy ? '#e53e3e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: esHoy ? '#fff' : 'var(--app-text)' }}>{d.getDate()}</span>
                </div>
              </div>
              {evsTodo.map(ev => (
                <div key={ev.id} onClick={e => onEventoClick(ev, e)}
                  style={{ background: ev.color, color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                  {ev.titulo}
                </div>
              ))}
              {getCumple(iso).map(c => (
                <div key={'cumple-' + c.nombre}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f59e0b22', border: '1px solid #f59e0b50', borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'default' }}>
                  <span style={{ fontSize: 10 }}>🎂</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre.split(' ')[0]}</span>
                  <span style={{ fontSize: 9, color: 'var(--app-text-muted)' }}>· Cumpleaños</span>
                </div>
              ))}
              {getAsist(iso).map(a => (
                <div key={a.nombre + a.status}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: a.color + '22', border: `1px solid ${a.color}50`, borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'default' }}>
                  <span style={{ fontSize: 10 }}>{a.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre.split(' ')[0]}</span>
                  <span style={{ fontSize: 9, color: 'var(--app-text-muted)' }}>· {a.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Grid de horas */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', flex: 1 }}>
        {/* Columna de horas */}
        <div style={{ borderRight: '1px solid var(--app-border)' }}>
          {horas.map(h => (
            <div key={h} style={{ height: PX_HR, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 10, color: 'var(--app-text-muted)', lineHeight: 1, marginTop: -6 }}>
                {String(h).padStart(2,'0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        {diasSemana.map((d, colIdx) => {
          const iso = toISO(d);
          const esHoy = iso === hoyISO;
          const evsDia = eventos.filter(ev => ev.fechaInicio === iso && !ev.todoElDia && ev.horaInicio);
          return (
            <div key={iso} style={{ borderLeft: '1px solid var(--app-border)', position: 'relative', background: esHoy ? 'rgba(229,62,62,0.02)' : 'transparent' }}>
              {/* Slots de hora */}
              {horas.map(h => (
                <div key={h}
                  onClick={() => onSlotClick(iso, `${String(h).padStart(2,'0')}:00`)}
                  style={{ height: PX_HR, borderTop: '1px solid var(--app-border)', cursor: 'pointer', boxSizing: 'border-box' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,158,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
              ))}

              {/* Eventos con hora */}
              {evsDia.map(ev => {
                const [hI, mI] = ev.horaInicio.split(':').map(Number);
                const [hF, mF] = (ev.horaFin || `${HORA_FIN}:00`).split(':').map(Number);
                const top = (hI * 60 + mI - HORA_INI * 60) / 60 * PX_HR;
                const height = Math.max(22, ((hF * 60 + mF) - (hI * 60 + mI)) / 60 * PX_HR - 2);
                return (
                  <div key={ev.id} onClick={e => onEventoClick(ev, e)}
                    style={{ position: 'absolute', top, left: 2, right: 2, height, background: ev.color, borderRadius: 6, padding: '3px 6px', overflow: 'hidden', cursor: 'pointer', zIndex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.titulo}
                    </div>
                    {height > 32 && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>
                        {ev.horaInicio} – {ev.horaFin}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Indicador hora actual */}
              {esHoy && minActual >= HORA_INI * 60 && minActual <= HORA_FIN * 60 && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: topActual, height: 2, background: '#e53e3e', zIndex: 2, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#e53e3e' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PRINCIPAL ─────────────────────────────────────────────────────
export default function Agenda() {
  const { role } = useAuth();
  const [vista, setVista] = useState('mes');
  const [hoy] = useState(() => new Date());
  const [navDate, setNavDate] = useState(() => new Date());
  const [eventos, setEventos] = useState([]);
  const [modal, setModal] = useState(null);
  const fbRef = useRef(false);

  const [equipoData, setEquipoData] = useState([]);
  const [asistenciaData, setAsistenciaData] = useState({});
  const [estadoColoresData, setEstadoColoresData] = useState({});
  const [customEstadosData, setCustomEstadosData] = useState([]);
  const [estadosConfigData, setEstadosConfigData] = useState({});

  useEffect(() => {
    dbGet('agenda_eventos').then(v => { if (Array.isArray(v)) setEventos(v); });
    const sub = dbSub('agenda_eventos', v => {
      if (!fbRef.current && Array.isArray(v)) setEventos(v);
    });
    dbGet('equipo').then(v => { if (Array.isArray(v)) setEquipoData(v); });
    dbGet('equipo_asistencia').then(v => { if (v && typeof v === 'object') setAsistenciaData(v); });
    dbGet('equipo_estado_colores').then(v => { if (v && typeof v === 'object') setEstadoColoresData(v); });
    dbGet('equipo_estados_custom').then(v => { if (Array.isArray(v)) setCustomEstadosData(v); });
    dbGet('equipo_estados_config').then(v => { if (v && typeof v === 'object') setEstadosConfigData(v); });
    return () => sub?.unsubscribe?.();
  }, []);

  if (role !== 'superadmin') return null;

  async function guardar(ev) {
    fbRef.current = true;
    const nuevos = eventos.find(e => e.id === ev.id)
      ? eventos.map(e => e.id === ev.id ? ev : e)
      : [...eventos, ev];
    setEventos(nuevos);
    await dbSet('agenda_eventos', nuevos);
    fbRef.current = false;
  }

  async function eliminar(id) {
    fbRef.current = true;
    const nuevos = eventos.filter(e => e.id !== id);
    setEventos(nuevos);
    await dbSet('agenda_eventos', nuevos);
    fbRef.current = false;
  }

  function navPrev() {
    setNavDate(d => {
      const n = new Date(d);
      if (vista === 'mes') n.setMonth(n.getMonth() - 1);
      else n.setDate(n.getDate() - 7);
      return n;
    });
  }

  function navNext() {
    setNavDate(d => {
      const n = new Date(d);
      if (vista === 'mes') n.setMonth(n.getMonth() + 1);
      else n.setDate(n.getDate() + 7);
      return n;
    });
  }

  function tituloNav() {
    if (vista === 'mes') return `${MESES[navDate.getMonth()]} ${navDate.getFullYear()}`;
    const dom = getDomingoDe(navDate);
    const sab = new Date(dom); sab.setDate(dom.getDate() + 6);
    if (dom.getMonth() === sab.getMonth())
      return `${dom.getDate()} – ${sab.getDate()} de ${MESES[dom.getMonth()]} ${dom.getFullYear()}`;
    return `${dom.getDate()} ${MESES[dom.getMonth()].slice(0,3)} – ${sab.getDate()} ${MESES[sab.getMonth()].slice(0,3)} ${dom.getFullYear()}`;
  }

  function getAsist(iso) {
    return asistenciaDia(iso, equipoData, asistenciaData, estadoColoresData, customEstadosData, estadosConfigData);
  }
  function getCumple(iso) {
    return cumplesDia(iso, equipoData);
  }

  function nuevoEvento(iso, hora) {
    const fecha = iso || toISO(new Date());
    const hi = hora || '09:00';
    setModal({
      mode: 'crear',
      evento: {
        id: Date.now(), titulo: '', descripcion: '',
        fechaInicio: fecha, horaInicio: hi,
        fechaFin: fecha, horaFin: horaFin1(hi),
        todoElDia: false, color: '#4a9eff', invitados: [],
      }
    });
  }

  function editarEvento(ev, e) {
    e.stopPropagation();
    setModal({ mode: 'editar', evento: { ...ev } });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Barra superior */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--app-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--app-text)' }}>📅 Calendario</h1>

        <button onClick={() => setNavDate(new Date())}
          style={{ padding: '5px 12px', background: 'var(--app-surface-2)', border: '1.5px solid var(--app-border)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', cursor: 'pointer' }}>
          Hoy
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={navPrev}
            style={{ width: 28, height: 28, border: '1.5px solid var(--app-border)', borderRadius: 7, background: 'var(--app-surface-2)', cursor: 'pointer', fontSize: 18, color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ‹
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)', minWidth: 220, textAlign: 'center' }}>
            {tituloNav()}
          </span>
          <button onClick={navNext}
            style={{ width: 28, height: 28, border: '1.5px solid var(--app-border)', borderRadius: 7, background: 'var(--app-surface-2)', cursor: 'pointer', fontSize: 18, color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Switcher vista */}
          <div style={{ display: 'flex', background: 'var(--app-surface-2)', borderRadius: 8, padding: 2 }}>
            {[['mes','Mes'],['semana','Semana']].map(([k, l]) => (
              <button key={k} onClick={() => setVista(k)}
                style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: vista === k ? 700 : 500, background: vista === k ? 'var(--app-surface)' : 'transparent', color: vista === k ? 'var(--app-text)' : 'var(--app-text-muted)', boxShadow: vista === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>

          <button onClick={() => nuevoEvento(null, null)}
            style={{ padding: '7px 16px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Nuevo
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      {vista === 'mes'
        ? <VistaMes hoy={hoy} navDate={navDate} eventos={eventos}
            onDiaClick={iso => nuevoEvento(iso, null)}
            onEventoClick={editarEvento}
            getAsist={getAsist} getCumple={getCumple} />
        : <VistaSemana hoy={hoy} navDate={navDate} eventos={eventos}
            onSlotClick={nuevoEvento}
            onEventoClick={editarEvento}
            getAsist={getAsist} getCumple={getCumple} />
      }

      {/* Modal */}
      {modal && (
        <EventoModal
          evento={modal.evento}
          isEdit={modal.mode === 'editar'}
          onGuardar={guardar}
          onEliminar={eliminar}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
