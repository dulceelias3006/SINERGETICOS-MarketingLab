import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotificaciones } from '../context/NotificacionesContext';

const GCAL_CLIENT_ID = '559033586509-pbuqu2478s4terdb0c22b3t4akhuicit.apps.googleusercontent.com';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GCAL_COLOR_MAP = {
  '#e53e3e': '11', '#ea580c': '6', '#f59e0b': '5', '#16a34a': '2',
  '#0891b2': '7',  '#4a9eff': '1', '#7c3aed': '3',  '#ec4899': '4',
};

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

function displayNombre(m) {
  return m.aliasAsistencia || m.nombre?.split(' ')[0] || '?';
}

function cumplesDia(iso, equipo) {
  const mmdd = iso.slice(5);
  return (equipo || []).filter(m => m.cumpleanos && m.cumpleanos.slice(5) === mmdd)
    .map(m => ({ nombre: displayNombre(m) }));
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
      nombre: displayNombre(m),
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

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(total) {
  const s = Math.round(total / 15) * 15;
  const clamped = Math.max(HORA_INI * 60, Math.min(HORA_FIN * 60, s));
  return `${String(Math.floor(clamped / 60)).padStart(2,'0')}:${String(clamped % 60).padStart(2,'0')}`;
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function dayDiff(iso1, iso2) {
  return Math.round((new Date(iso2 + 'T00:00:00') - new Date(iso1 + 'T00:00:00')) / 86400000);
}

// ── MODAL ──────────────────────────────────────────────────────────
function EventoModal({ evento: init, isEdit, onGuardar, onEliminar, onClose, equipo = [] }) {
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
          <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 10 }}>Invitados</div>

          {/* Miembros del equipo */}
          {equipo.filter(m => m.email).length > 0 && (() => {
            const conEmail = equipo.filter(m => m.email);
            const todosEmails = conEmail.map(m => m.email.toLowerCase());
            const todosSeleccionados = todosEmails.every(e => ev.invitados.includes(e));
            function toggleTodos() {
              set('invitados', todosSeleccionados
                ? ev.invitados.filter(e => !todosEmails.includes(e))
                : [...new Set([...ev.invitados, ...todosEmails])]);
            }
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Del equipo</span>
                  <button onClick={toggleTodos}
                    style={{ fontSize: 11, fontWeight: 700, color: '#4a9eff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {todosSeleccionados ? 'Quitar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {conEmail.map(m => {
                    const email = m.email.toLowerCase();
                    const sel = ev.invitados.includes(email);
                    return (
                      <button key={m.id}
                        onClick={() => set('invitados', sel ? ev.invitados.filter(e => e !== email) : [...ev.invitados, email])}
                        title={email}
                        style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${sel ? '#4a9eff' : 'var(--app-border)'}`, background: sel ? '#4a9eff18' : 'var(--app-surface-2)', color: sel ? '#4a9eff' : 'var(--app-text)', fontSize: 12, fontWeight: sel ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {displayNombre(m)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Correo externo */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Otro correo</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={emailInput} onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="correo@ejemplo.com" style={{ ...inp, flex: 1 }} />
            <button onClick={addEmail}
              style={{ padding: '9px 14px', background: 'var(--app-surface-2)', border: '1.5px solid var(--app-border)', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--app-text)', fontWeight: 700 }}>+</button>
          </div>

          {/* Chips de todos los invitados */}
          {ev.invitados.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {ev.invitados.map(email => {
                const miembro = equipo.find(m => m.email?.toLowerCase() === email);
                return (
                  <span key={email} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                    {miembro && <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{displayNombre(miembro)}</span>}
                    <span style={{ color: 'var(--app-text-muted)' }}>{email}</span>
                    <button onClick={() => set('invitados', ev.invitados.filter(x => x !== email))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                  </span>
                );
              })}
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
function VistaMes({ hoy, navDate, eventos, onDiaClick, onEventoClick, onDragStart, dragPreview, canEditEvt, getAsist, getCumple }) {
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
            <div key={iso} data-dayiso={iso} onClick={() => onDiaClick(iso)}
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
              {(() => {
                const base = evs;
                const filtered = base.filter(ev => !(dragPreview?.id === ev.id && dragPreview.fechaInicio !== iso));
                const extra = (dragPreview?.fechaInicio === iso && !base.find(e => e.id === dragPreview.id))
                  ? [dragPreview] : [];
                const evsShow = [...extra, ...filtered];
                return (
                  <>
                    {evsShow.slice(0, 3).map(ev => {
                      const isDragging = dragPreview?.id === ev.id;
                      const canEdit = canEditEvt ? canEditEvt(ev) : false;
                      const draggable = ev.fechaInicio === iso && canEdit;
                      return (
                        <div key={ev.id}
                          onMouseDown={draggable ? e => { e.stopPropagation(); onDragStart(ev, 'mover-dia', e); } : undefined}
                          onClick={e => e.stopPropagation()}
                          style={{ background: ev.color, color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default', opacity: isDragging ? 0.7 : 1, userSelect: 'none' }}>
                          {!ev.todoElDia && ev.horaInicio && <span style={{ opacity: 0.85 }}>{ev.horaInicio} </span>}
                          {ev.titulo}
                        </div>
                      );
                    })}
                    {evsShow.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--app-text-muted)', paddingLeft: 5 }}>+{evsShow.length - 3} más</div>
                    )}
                  </>
                );
              })()}
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
                        {a.emoji} {a.nombre}
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
function VistaSemana({ hoy, navDate, eventos, onSlotClick, onEventoClick, onDragStart, dragPreview, canEditEvt, getAsist, getCumple }) {
  const hoyISO = toISO(hoy);
  const domingo = getDomingoDe(navDate);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo);
    d.setDate(domingo.getDate() + i);
    return d;
  });
  const isosSemana = diasSemana.map(d => toISO(d));
  const evsTodoDia = eventos.filter(ev => (ev.todoElDia || !ev.horaInicio) && isosSemana.some(iso => evtEnDia(ev, iso)));
  const evtsConFila = (() => {
    const sorted = [...evsTodoDia].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    const rowEnds = [];
    return sorted.map(ev => {
      const ini = ev.fechaInicio < isosSemana[0] ? isosSemana[0] : ev.fechaInicio;
      const fin = (ev.fechaFin || ev.fechaInicio) > isosSemana[6] ? isosSemana[6] : (ev.fechaFin || ev.fechaInicio);
      let row = 0;
      while (row < rowEnds.length && rowEnds[row] >= ini) row++;
      rowEnds[row] = fin;
      return { ev, row, ini, fin };
    });
  })();
  const alturaAllDay = Math.max(28, evtsConFila.reduce((m, x) => Math.max(m, x.row + 1), 0) * 24 + 8);
  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);
  const ahora = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();
  const topActual = (minActual - HORA_INI * 60) / 60 * PX_HR;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado días + fila todo-el-día */}
      <div style={{ position: 'sticky', top: 0, background: 'var(--app-surface)', zIndex: 10, flexShrink: 0, borderBottom: '2px solid var(--app-border)' }}>
        {/* Fila nombres/números de días */}
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '1px solid var(--app-border)' }}>
          <div style={{ borderRight: '1px solid var(--app-border)', minHeight: 56 }} />
          {diasSemana.map((d, i) => {
            const iso = toISO(d);
            const esHoy = iso === hoyISO;
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
                {getCumple(iso).map(c => (
                  <div key={'cumple-' + c.nombre}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f59e0b22', border: '1px solid #f59e0b50', borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'default' }}>
                    <span style={{ fontSize: 10 }}>🎂</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</span>
                    <span style={{ fontSize: 9, color: 'var(--app-text-muted)' }}>· Cumpleaños</span>
                  </div>
                ))}
                {getAsist(iso).map(a => (
                  <div key={a.nombre + a.status}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, background: a.color + '22', border: `1px solid ${a.color}50`, borderRadius: 4, padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'default' }}>
                    <span style={{ fontSize: 10 }}>{a.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</span>
                    <span style={{ fontSize: 9, color: 'var(--app-text-muted)' }}>· {a.label}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {/* Fila de barras continuas (todo el día / multi-día) */}
        <div style={{ display: 'flex', minHeight: alturaAllDay }}>
          <div style={{ width: 56, borderRight: '1px solid var(--app-border)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 6, paddingBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>todo<br/>día</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {isosSemana.slice(1).map((iso, i) => (
              <div key={iso} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((i + 1) / 7) * 100}%`, width: '1px', background: 'var(--app-border)', pointerEvents: 'none' }} />
            ))}
            {evtsConFila.map(({ ev, row, ini, fin }) => {
              const startIdx = isosSemana.indexOf(ini);
              const endIdx = isosSemana.indexOf(fin);
              const iniciaAqui = ev.fechaInicio >= isosSemana[0];
              const terminaAqui = (ev.fechaFin || ev.fechaInicio) <= isosSemana[6];
              return (
                <div key={ev.id}
                  onClick={e => onEventoClick(ev, e)}
                  style={{
                    position: 'absolute',
                    top: row * 24 + 4,
                    left: `calc(${(startIdx / 7) * 100}% + ${iniciaAqui ? 2 : 0}px)`,
                    width: `calc(${((endIdx - startIdx + 1) / 7) * 100}% - ${(iniciaAqui ? 2 : 0) + (terminaAqui ? 2 : 0)}px)`,
                    height: 20,
                    background: ev.color,
                    borderRadius: `${iniciaAqui ? 10 : 0}px ${terminaAqui ? 10 : 0}px ${terminaAqui ? 10 : 0}px ${iniciaAqui ? 10 : 0}px`,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                    paddingLeft: iniciaAqui ? 8 : 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    userSelect: 'none',
                  }}>
                  {iniciaAqui && ev.titulo}
                </div>
              );
            })}
          </div>
        </div>
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
            <div key={iso} data-coliso={iso} style={{ borderLeft: '1px solid var(--app-border)', position: 'relative', background: esHoy ? 'rgba(229,62,62,0.02)' : 'transparent' }}>
              {/* Slots de hora */}
              {horas.map(h => (
                <div key={h}
                  onClick={() => onSlotClick(iso, `${String(h).padStart(2,'0')}:00`)}
                  style={{ height: PX_HR, borderTop: '1px solid var(--app-border)', cursor: 'pointer', boxSizing: 'border-box' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,158,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
              ))}

              {/* Eventos con hora */}
              {(() => {
                const filtered = evsDia.filter(ev => !(dragPreview?.id === ev.id && dragPreview.fechaInicio !== iso));
                const extra = (dragPreview?.fechaInicio === iso && dragPreview.horaInicio && !evsDia.find(e => e.id === dragPreview.id))
                  ? [dragPreview] : [];
                return [...filtered, ...extra].map(ev => {
                  const d = (dragPreview?.id === ev.id) ? { ...ev, ...dragPreview } : ev;
                  const isDragging = dragPreview?.id === ev.id;
                  const canEdit = canEditEvt ? canEditEvt(ev) : false;
                  const [hI, mI] = d.horaInicio.split(':').map(Number);
                  const [hF, mF] = (d.horaFin || `${HORA_FIN}:00`).split(':').map(Number);
                  const top = (hI * 60 + mI - HORA_INI * 60) / 60 * PX_HR;
                  const height = Math.max(22, ((hF * 60 + mF) - (hI * 60 + mI)) / 60 * PX_HR - 2);
                  return (
                    <div key={ev.id}
                      onMouseDown={e => { e.stopPropagation(); if (canEdit) onDragStart(ev, 'mover', e); }}
                      onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', top, left: 2, right: 2, height, background: d.color, borderRadius: 6, overflow: 'hidden', cursor: isDragging ? 'grabbing' : canEdit ? 'grab' : 'default', zIndex: isDragging ? 10 : 1, boxSizing: 'border-box', userSelect: 'none', pointerEvents: isDragging ? 'none' : 'auto' }}>
                      {canEdit && <div onMouseDown={e => { e.stopPropagation(); onDragStart(ev, 'resize-top', e); }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize', zIndex: 3 }} />}
                      <div style={{ padding: '3px 6px', pointerEvents: 'none' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.titulo}</div>
                        {height > 32 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>{d.horaInicio} – {d.horaFin}</div>}
                      </div>
                      {canEdit && <div onMouseDown={e => { e.stopPropagation(); onDragStart(ev, 'resize-bottom', e); }}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize', zIndex: 3, background: 'rgba(0,0,0,0.15)', borderRadius: '0 0 6px 6px' }} />}
                    </div>
                  );
                });
              })()}

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

// ── VISTA DÍA ─────────────────────────────────────────────────────
function VistaDia({ hoy, navDate, eventos, onSlotClick, onEventoClick, onDragStart, dragPreview, canEditEvt, getAsist, getCumple }) {
  const iso = toISO(navDate);
  const hoyISO = toISO(hoy);
  const esHoy = iso === hoyISO;
  const horas = Array.from({ length: HORA_FIN - HORA_INI }, (_, i) => HORA_INI + i);
  const ahora = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();
  const topActual = (minActual - HORA_INI * 60) / 60 * PX_HR;

  const evsTodo = eventos.filter(ev => (ev.todoElDia || !ev.horaInicio) && evtEnDia(ev, iso));
  const evsDia  = eventos.filter(ev => ev.fechaInicio === iso && !ev.todoElDia && ev.horaInicio);
  const cumples = getCumple(iso);
  const asist   = getAsist(iso);

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', borderBottom: '2px solid var(--app-border)', position: 'sticky', top: 0, background: 'var(--app-surface)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ borderRight: '1px solid var(--app-border)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 6, paddingBottom: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>todo<br/>día</span>
        </div>
        <div style={{ padding: '10px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (evsTodo.length || cumples.length || asist.length) ? 8 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {DIAS_CORTO[navDate.getDay()]}
              </span>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: esHoy ? '#e53e3e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: esHoy ? '#fff' : 'var(--app-text)' }}>{navDate.getDate()}</span>
              </div>
            </div>
          </div>
          {/* Todo el día */}
          {evsTodo.map(ev => (
            <div key={ev.id} onClick={e => onEventoClick(ev, e)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: ev.color, color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '3px 8px', marginRight: 4, marginBottom: 4, cursor: 'pointer' }}>
              {ev.titulo}
            </div>
          ))}
          {/* Cumpleaños */}
          {cumples.map(c => (
            <div key={'cumple-' + c.nombre}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f59e0b22', border: '1px solid #f59e0b50', borderRadius: 5, padding: '3px 8px', marginRight: 4, marginBottom: 4, cursor: 'default' }}>
              <span style={{ fontSize: 11 }}>🎂</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-text)' }}>{c.nombre}</span>
              <span style={{ fontSize: 10, color: 'var(--app-text-muted)' }}>· Cumpleaños</span>
            </div>
          ))}
          {/* Asistencia */}
          {asist.map(a => (
            <div key={a.nombre + a.status}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: a.color + '22', border: `1px solid ${a.color}50`, borderRadius: 5, padding: '3px 8px', marginRight: 4, marginBottom: 4, cursor: 'default' }}>
              <span style={{ fontSize: 11 }}>{a.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-text)' }}>{a.nombre}</span>
              <span style={{ fontSize: 10, color: 'var(--app-text-muted)' }}>· {a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de horas */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', flex: 1 }}>
        {/* Horas */}
        <div style={{ borderRight: '1px solid var(--app-border)' }}>
          {horas.map(h => (
            <div key={h} style={{ height: PX_HR, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 10, color: 'var(--app-text-muted)', lineHeight: 1, marginTop: -6 }}>
                {String(h).padStart(2,'0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Columna del día */}
        <div style={{ position: 'relative', background: esHoy ? 'rgba(229,62,62,0.02)' : 'transparent' }}>
          {horas.map(h => (
            <div key={h}
              onClick={() => onSlotClick(iso, `${String(h).padStart(2,'0')}:00`)}
              style={{ height: PX_HR, borderTop: '1px solid var(--app-border)', cursor: 'pointer', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,158,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
          ))}

          {(() => {
            const filtered = evsDia.filter(ev => !(dragPreview?.id === ev.id && dragPreview.fechaInicio !== iso));
            const extra = (dragPreview?.fechaInicio === iso && dragPreview.horaInicio && !evsDia.find(e => e.id === dragPreview.id))
              ? [dragPreview] : [];
            return [...filtered, ...extra].map(ev => {
              const d = (dragPreview?.id === ev.id) ? { ...ev, ...dragPreview } : ev;
              const isDragging = dragPreview?.id === ev.id;
              const canEdit = canEditEvt ? canEditEvt(ev) : false;
              const [hI, mI] = d.horaInicio.split(':').map(Number);
              const [hF, mF] = (d.horaFin || `${HORA_FIN}:00`).split(':').map(Number);
              const top    = (hI * 60 + mI - HORA_INI * 60) / 60 * PX_HR;
              const height = Math.max(22, ((hF * 60 + mF) - (hI * 60 + mI)) / 60 * PX_HR - 2);
              return (
                <div key={ev.id}
                  onMouseDown={e => { e.stopPropagation(); if (canEdit) onDragStart(ev, 'mover', e); }}
                  onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', top, left: 4, right: 4, height, background: d.color, borderRadius: 8, overflow: 'hidden', cursor: isDragging ? 'grabbing' : canEdit ? 'grab' : 'default', zIndex: isDragging ? 10 : 1, boxSizing: 'border-box', userSelect: 'none', pointerEvents: isDragging ? 'none' : 'auto' }}>
                  {canEdit && <div onMouseDown={e => { e.stopPropagation(); onDragStart(ev, 'resize-top', e); }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', zIndex: 3 }} />}
                  <div style={{ padding: '5px 10px', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{d.titulo}</div>
                    {height > 36 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{d.horaInicio} – {d.horaFin}</div>}
                    {height > 60 && d.descripcion && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{d.descripcion}</div>}
                  </div>
                  {canEdit && <div onMouseDown={e => { e.stopPropagation(); onDragStart(ev, 'resize-bottom', e); }}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', zIndex: 3, background: 'rgba(0,0,0,0.12)', borderRadius: '0 0 8px 8px' }} />}
                </div>
              );
            });
          })()}

          {esHoy && minActual >= HORA_INI * 60 && minActual <= HORA_FIN * 60 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: topActual, height: 2, background: '#e53e3e', zIndex: 2, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#e53e3e' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PRINCIPAL ─────────────────────────────────────────────────────
export default function Agenda() {
  const { role, user } = useAuth();
  const { marcarVisto } = useNotificaciones();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingEventoRef = useRef(null);
  const [vista, setVista] = useState('mes');
  const [hoy] = useState(() => new Date());
  const [navDate, setNavDate] = useState(() => new Date());
  const [eventos, setEventos] = useState([]);
  const [modal, setModal] = useState(null);
  const fbRef = useRef(false);

  const [equipoData, setEquipoData] = useState([]);
  const [equipoReady, setEquipoReady] = useState(false);
  const [asistenciaData, setAsistenciaData] = useState({});
  const [estadoColoresData, setEstadoColoresData] = useState({});
  const [customEstadosData, setCustomEstadosData] = useState([]);
  const [estadosConfigData, setEstadosConfigData] = useState({});

  const [gcalToken, setGcalToken] = useState(() => localStorage.getItem('gcal_token') || null);
  const [gcalReady, setGcalReady] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalError, setGcalError] = useState(null);
  const tokenClientRef = useRef(null);

  const dragRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const guardarRef = useRef(null);
  const editarRef = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);

  useEffect(() => {
    marcarVisto();
    const eventoParam = searchParams.get('evento');
    if (eventoParam) { pendingEventoRef.current = eventoParam; setSearchParams({}); }
    dbGet('agenda_eventos').then(v => { if (Array.isArray(v)) setEventos(v); });
    const sub = dbSub('agenda_eventos', v => {
      if (!fbRef.current && Array.isArray(v)) setEventos(v);
    });
    dbGet('equipo').then(v => { if (Array.isArray(v)) setEquipoData(v); setEquipoReady(true); });
    return () => sub?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (pendingEventoRef.current && eventos.length > 0) {
      const ev = eventos.find(e => String(e.id) === pendingEventoRef.current);
      if (ev) { setModal({ mode: 'editar', evento: { ...ev } }); pendingEventoRef.current = null; }
    }
  }, [eventos]);

  useEffect(() => {
    dbGet('equipo_asistencia').then(v => { if (v && typeof v === 'object') setAsistenciaData(v); });
    dbGet('equipo_estado_colores').then(v => { if (v && typeof v === 'object') setEstadoColoresData(v); });
    dbGet('equipo_estados_custom').then(v => { if (Array.isArray(v)) setCustomEstadosData(v); });
    dbGet('equipo_estados_config').then(v => { if (v && typeof v === 'object') setEstadosConfigData(v); });
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setGcalReady(true);
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch(_) {} };
  }, []);

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current) return;
      const { tipo, ev, startY, startMin, durMin, durDias } = dragRef.current;
      const deltaMins = Math.round((e.clientY - startY) / PX_HR * 60 / 15) * 15;
      const preview = { ...ev };

      if (tipo === 'mover') {
        const ns = Math.max(HORA_INI * 60, Math.min(HORA_FIN * 60 - durMin, startMin + deltaMins));
        preview.horaInicio = minToTime(ns);
        preview.horaFin = minToTime(ns + durMin);
        const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-coliso]');
        if (col) { preview.fechaInicio = col.dataset.coliso; preview.fechaFin = col.dataset.coliso; }
      } else if (tipo === 'resize-bottom') {
        preview.horaFin = minToTime(Math.max(startMin - durMin + 15, Math.min(HORA_FIN * 60, startMin + deltaMins)));
      } else if (tipo === 'resize-top') {
        preview.horaInicio = minToTime(Math.max(HORA_INI * 60, Math.min(timeToMin(ev.horaFin) - 15, startMin + deltaMins)));
      } else if (tipo === 'mover-dia') {
        const day = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-dayiso]');
        if (day) { preview.fechaInicio = day.dataset.dayiso; preview.fechaFin = addDays(day.dataset.dayiso, durDias); }
      }

      dragPreviewRef.current = preview;
      setDragPreview({ ...preview });
    }

    function onUp(e) {
      if (!dragRef.current) return;
      const moved = Math.abs(e.clientY - dragRef.current.startY) > 5 || Math.abs(e.clientX - dragRef.current.startX) > 5;
      if (moved && dragPreviewRef.current) guardarRef.current?.(dragPreviewRef.current);
      else if (!moved) editarRef.current?.(dragRef.current.ev);
      dragRef.current = null;
      dragPreviewRef.current = null;
      setDragPreview(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const emailUsuario = user?.email?.toLowerCase();
  const esMiembro = equipoData.some(m => m.email?.toLowerCase() === emailUsuario);
  const tieneAcceso = role === 'superadmin' || esMiembro;
  const puedeEditar = role === 'superadmin' || (esMiembro && role === 'editor');

  function puedeEditarEv(ev) {
    if (role === 'superadmin') return true;
    if (!puedeEditar) return false;
    return ev.creadoPor?.toLowerCase() === emailUsuario;
  }

  guardarRef.current = guardar;
  editarRef.current = ev => { if (puedeEditarEv(ev)) setModal({ mode: 'editar', evento: { ...ev } }); };

  if (!equipoReady && role !== 'superadmin') return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-text-muted)', fontSize: 14 }}>
      Cargando…
    </div>
  );

  if (!tieneAcceso) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--app-text-muted)' }}>
      <span style={{ fontSize: 36 }}>🔒</span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>No tienes acceso al Calendario</span>
    </div>
  );

  function conectarGCal() {
    if (!gcalReady || !window.google) return;
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GCAL_CLIENT_ID,
        scope: GCAL_SCOPE,
        callback: (response) => {
          if (response.access_token) {
            setGcalToken(response.access_token);
            localStorage.setItem('gcal_token', response.access_token);
          }
        },
      });
    }
    tokenClientRef.current.requestAccessToken();
  }

  async function sincronizarGCal(ev, token) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City';
    const body = {
      summary: ev.titulo,
      description: ev.descripcion || '',
      start: ev.todoElDia
        ? { date: ev.fechaInicio }
        : { dateTime: `${ev.fechaInicio}T${ev.horaInicio || '09:00'}:00`, timeZone: tz },
      end: ev.todoElDia
        ? { date: ev.fechaFin || ev.fechaInicio }
        : { dateTime: `${ev.fechaFin || ev.fechaInicio}T${ev.horaFin || ev.horaInicio || '10:00'}:00`, timeZone: tz },
      attendees: (ev.invitados || []).map(email => ({ email })),
      colorId: GCAL_COLOR_MAP[ev.color] || '1',
    };
    const isUpdate = !!ev.gcalId;
    const url = isUpdate
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.gcalId}?sendUpdates=all`
      : `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all`;
    const res = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { setGcalToken(null); localStorage.removeItem('gcal_token'); throw new Error('Token expirado, reconecta Google Calendar'); }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Error ${res.status}: ${errData.error?.message || 'Error desconocido'}`);
    }
    const data = await res.json();
    return data.id || ev.gcalId || null;
  }

  async function guardar(ev) {
    let evFinal = { ...ev };
    if (gcalToken) {
      setGcalSyncing(true);
      setGcalError(null);
      try {
        const gcalId = await sincronizarGCal(ev, gcalToken);
        if (gcalId) evFinal = { ...ev, gcalId };
      } catch (err) {
        console.error('Error sync GCal:', err);
        setGcalError(err.message);
      }
      setGcalSyncing(false);
    }
    const miembro = equipoData.find(m => m.email?.toLowerCase() === user?.email?.toLowerCase());
    const miNombre = displayNombre(miembro) || user?.email?.split('@')[0] || 'Alguien';
    const evAnterior = eventos.find(e => e.id === ev.id);
    const cambioHorario = evAnterior && (
      ev.fechaInicio !== evAnterior.fechaInicio ||
      ev.fechaFin !== evAnterior.fechaFin ||
      ev.horaInicio !== evAnterior.horaInicio ||
      ev.horaFin !== evAnterior.horaFin ||
      ev.todoElDia !== evAnterior.todoElDia
    );
    evFinal = {
      ...evFinal,
      creadoPor: evFinal.creadoPor || user?.email || '',
      creadoPorNombre: evFinal.creadoPorNombre || miNombre,
      ...(cambioHorario ? { lastUpdated: Date.now(), modificadoPor: user?.email, modificadoPorNombre: miNombre } : {}),
    };
    fbRef.current = true;
    const nuevos = eventos.find(e => e.id === ev.id)
      ? eventos.map(e => e.id === ev.id ? evFinal : e)
      : [...eventos, evFinal];
    setEventos(nuevos);
    await dbSet('agenda_eventos', nuevos);
    fbRef.current = false;
  }

  async function eliminar(id) {
    const ev = eventos.find(e => e.id === id);
    if (gcalToken && ev?.gcalId) {
      try {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.gcalId}?sendUpdates=all`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${gcalToken}` } }
        );
      } catch (err) {
        console.error('Error eliminando evento GCal:', err);
      }
    }
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
      else if (vista === 'semana') n.setDate(n.getDate() - 7);
      else n.setDate(n.getDate() - 1);
      return n;
    });
  }

  function navNext() {
    setNavDate(d => {
      const n = new Date(d);
      if (vista === 'mes') n.setMonth(n.getMonth() + 1);
      else if (vista === 'semana') n.setDate(n.getDate() + 7);
      else n.setDate(n.getDate() + 1);
      return n;
    });
  }

  function tituloNav() {
    if (vista === 'mes') return `${MESES[navDate.getMonth()]} ${navDate.getFullYear()}`;
    if (vista === 'dia') return `${DIAS_CORTO[navDate.getDay()]} ${navDate.getDate()} de ${MESES[navDate.getMonth()]} ${navDate.getFullYear()}`;
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
    if (!puedeEditar) return;
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
    if (!puedeEditarEv(ev)) return;
    setModal({ mode: 'editar', evento: { ...ev } });
  }

  function iniciarDrag(ev, tipo, e) {
    if (!puedeEditarEv(ev)) return;
    e.preventDefault();
    e.stopPropagation();
    const durMin = Math.max(15, timeToMin(ev.horaFin) - timeToMin(ev.horaInicio));
    const durDias = dayDiff(ev.fechaInicio, ev.fechaFin || ev.fechaInicio);
    dragRef.current = {
      tipo, ev: { ...ev },
      startY: e.clientY, startX: e.clientX,
      startMin: tipo === 'resize-bottom' ? timeToMin(ev.horaFin) : timeToMin(ev.horaInicio),
      durMin, durDias,
    };
    dragPreviewRef.current = { ...ev };
    setDragPreview({ ...ev });
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>
      {/* Barra superior */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--app-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--app-text)' }}>📅 Calendario</h1>
        {gcalError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#dc2626', maxWidth: 400 }}>
            ⚠️ Google Cal: {gcalError}
          </div>
        )}

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
            {[['mes','Mes'],['semana','Semana'],['dia','Día']].map(([k, l]) => (
              <button key={k} onClick={() => setVista(k)}
                style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: vista === k ? 700 : 500, background: vista === k ? 'var(--app-surface)' : 'transparent', color: vista === k ? 'var(--app-text)' : 'var(--app-text-muted)', boxShadow: vista === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>

          <button
            disabled={!gcalReady && !gcalToken}
            title={gcalToken ? 'Desconectar Google Calendar' : 'Conectar Google Calendar'}
            style={{ padding: '7px 14px', background: gcalToken ? '#16a34a18' : 'var(--app-surface-2)', border: `1.5px solid ${gcalToken ? '#16a34a' : 'var(--app-border)'}`, borderRadius: 8, color: gcalToken ? '#16a34a' : 'var(--app-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            onClick={gcalToken ? () => { setGcalToken(null); localStorage.removeItem('gcal_token'); } : conectarGCal}>
            {gcalSyncing ? '⏳' : gcalToken ? '✓' : (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            {gcalSyncing ? 'Sincronizando…' : gcalToken ? 'Google Cal. conectado' : 'Conectar Google Cal.'}
          </button>

          {puedeEditar && (
            <button onClick={() => nuevoEvento(toISO(navDate), null)}
              style={{ padding: '7px 16px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      {vista === 'mes' && (
        <VistaMes hoy={hoy} navDate={navDate} eventos={eventos}
          onDiaClick={iso => { setNavDate(new Date(iso + 'T00:00:00')); setVista('dia'); }}
          onEventoClick={editarEvento}
          onDragStart={iniciarDrag} dragPreview={dragPreview} canEditEvt={puedeEditarEv}
          getAsist={getAsist} getCumple={getCumple} />
      )}
      {vista === 'semana' && (
        <VistaSemana hoy={hoy} navDate={navDate} eventos={eventos}
          onSlotClick={nuevoEvento}
          onEventoClick={editarEvento}
          onDragStart={iniciarDrag} dragPreview={dragPreview} canEditEvt={puedeEditarEv}
          getAsist={getAsist} getCumple={getCumple} />
      )}
      {vista === 'dia' && (
        <VistaDia hoy={hoy} navDate={navDate} eventos={eventos}
          onSlotClick={nuevoEvento}
          onEventoClick={editarEvento}
          onDragStart={iniciarDrag} dragPreview={dragPreview} canEditEvt={puedeEditarEv}
          getAsist={getAsist} getCumple={getCumple} />
      )}

      {/* Modal */}
      {modal && (
        <EventoModal
          evento={modal.evento}
          isEdit={modal.mode === 'editar'}
          onGuardar={guardar}
          onEliminar={eliminar}
          onClose={() => setModal(null)}
          equipo={equipoData}
        />
      )}
    </div>
  );
}
