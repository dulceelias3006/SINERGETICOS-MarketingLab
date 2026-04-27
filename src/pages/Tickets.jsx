import { useState, useRef } from 'react';

const COLUMNAS = [
  { id: 'backlog',    label: 'Backlog',       color: '#9ca3af' },
  { id: 'progreso',   label: 'En Progreso',   color: '#4a9eff' },
  { id: 'revision',   label: 'En Revisión',   color: '#facc15' },
  { id: 'completado', label: 'Completado',    color: '#4ade80' },
];

const PRIORIDADES = [
  { key: 'alta',  label: 'Alta',  color: '#ef4444', bg: '#fee2e2' },
  { key: 'media', label: 'Media', color: '#f59e0b', bg: '#fef3c7' },
  { key: 'baja',  label: 'Baja',  color: '#9ca3af', bg: '#f3f4f6' },
];

const TIPOS_DEFAULT = ['Diseño','Técnico','Contenido','SEO','Estrategia','Video','Analíticas'];

const FORM_INIT = {
  titulo: '', descripcion: '', prioridad: 'media',
  tipo: 'Diseño', asignadoId: '', columna: 'backlog',
  color: '#4a9eff', fechaVence: '',
};

function getIniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0] || '').join('').toUpperCase();
}

function renderMiniAvatar(m) {
  const base = { width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
  if (m.avatarType === 'photo' && m.avatarPhoto)
    return <div style={base}><img src={m.avatarPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (m.avatarType === 'emoji' && m.avatarEmoji)
    return <div style={{ ...base, background: m.avatarBg || '#1c1c2a', fontSize: 12 }}>{m.avatarEmoji}</div>;
  return <div style={{ ...base, background: m.avatarBg || '#6b7280', color: '#fff', fontWeight: 700, fontSize: 9 }}>{getIniciales(m.nombre)}</div>;
}

function PencilIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
}
function CalendarIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}

export default function Tickets() {
  const [tickets, setTickets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tickets') || '[]'); } catch { return []; }
  });
  const [tipos, setTipos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tickets_tipos') || 'null') || TIPOS_DEFAULT; } catch { return TIPOS_DEFAULT; }
  });
  const equipo = (() => {
    try { return JSON.parse(localStorage.getItem('equipo') || '[]'); } catch { return []; }
  })();

  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showTipoInput, setShowTipoInput] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  function saveTickets(next) {
    setTickets(next);
    localStorage.setItem('tickets', JSON.stringify(next));
  }
  function saveTipos(next) {
    setTipos(next);
    localStorage.setItem('tickets_tipos', JSON.stringify(next));
  }

  function abrir(columna = 'backlog') {
    setEditandoId(null);
    setForm({ ...FORM_INIT, columna });
    setShowModal(true);
  }
  function abrirEditar(t) {
    setEditandoId(t.id);
    setForm({ titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad, tipo: t.tipo, asignadoId: t.asignadoId || '', columna: t.columna, color: t.color, fechaVence: t.fechaVence || '' });
    setShowModal(true);
  }
  function guardar() {
    if (!form.titulo.trim()) return;
    if (editandoId) {
      saveTickets(tickets.map(t => t.id === editandoId ? { ...t, ...form } : t));
    } else {
      saveTickets([...tickets, { ...form, id: Date.now(), creadoEn: new Date().toISOString().slice(0, 10) }]);
    }
    setShowModal(false);
  }
  function eliminar(id) {
    if (confirm('¿Eliminar este ticket?')) {
      saveTickets(tickets.filter(t => t.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }
  function mover(id, col) {
    saveTickets(tickets.map(t => t.id === id ? { ...t, columna: col } : t));
  }

  function onDragStart(e, id) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOverCol(e, colId) {
    e.preventDefault();
    setDragOverCol(colId);
  }
  function onDropCol(colId) {
    if (draggingId) mover(draggingId, colId);
    setDraggingId(null); setDragOverCol(null); setDragOverIndex(null);
  }
  function onDragEnd() {
    setDraggingId(null); setDragOverCol(null); setDragOverIndex(null);
  }

  function agregarTipo() {
    const t = nuevoTipo.trim();
    if (t && !tipos.includes(t)) saveTipos([...tipos, t]);
    setNuevoTipo(''); setShowTipoInput(false);
  }
  function eliminarTipo(t) {
    saveTipos(tipos.filter(x => x !== t));
  }

  const inp = (extra = {}) => ({ width: '100%', border: '1px solid #e8e8ee', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#111827', ...extra });
  const total = tickets.length;
  const completados = tickets.filter(t => t.columna === 'completado').length;

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', background: '#fff', borderBottom: '1px solid #e8e8ee', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Tickets</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, marginTop: 2 }}>
            {total} tickets · {completados} completados
          </p>
        </div>
        <button onClick={() => abrir()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Nuevo Ticket
        </button>
      </div>

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 24px', overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
        {COLUMNAS.map(col => {
          const colTickets = tickets.filter(t => t.columna === col.id);
          const isDragOver = dragOverCol === col.id;
          return (
            <div key={col.id}
              onDragOver={e => onDragOverCol(e, col.id)}
              onDrop={() => onDropCol(col.id)}
              style={{ minWidth: 270, width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', background: '#fff', border: '1px solid #e8e8ee', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{colTickets.length}</span>
                </div>
                <button onClick={() => abrir(col.id)} title="Agregar ticket" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, lineHeight: 1, padding: '0 2px', display: 'flex', alignItems: 'center' }}>+</button>
              </div>

              {/* Cards container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80, background: isDragOver ? 'rgba(229,83,83,0.04)' : 'transparent', borderRadius: 10, transition: 'background 0.15s', padding: isDragOver ? '6px' : '0' }}>
                {colTickets.map(ticket => {
                  const prio = PRIORIDADES.find(p => p.key === ticket.prioridad) || PRIORIDADES[1];
                  const asignado = equipo.find(m => m.id === ticket.asignadoId);
                  const isExpanded = expandedId === ticket.id;
                  const vence = ticket.fechaVence;
                  const hoy = new Date().toISOString().slice(0, 10);
                  const vencido = vence && vence < hoy && ticket.columna !== 'completado';
                  return (
                    <div key={ticket.id}
                      draggable
                      onDragStart={e => onDragStart(e, ticket.id)}
                      onDragEnd={onDragEnd}
                      style={{ background: '#fff', borderRadius: 10, boxShadow: draggingId === ticket.id ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e8e8ee', borderLeft: `4px solid ${ticket.color}`, opacity: draggingId === ticket.id ? 0.5 : 1, cursor: 'grab', transition: 'box-shadow 0.15s, opacity 0.15s' }}>
                      {/* Card main row */}
                      <div style={{ padding: '10px 12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, flex: 1 }}>{ticket.titulo}</div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => abrirEditar(ticket)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, display: 'flex' }}><PencilIcon /></button>
                            <button onClick={() => eliminar(ticket.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, display: 'flex' }}><TrashIcon /></button>
                          </div>
                        </div>

                        {/* Tags row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: asignado || vence ? 7 : 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: prio.bg, color: prio.color }}>{prio.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280' }}>{ticket.tipo}</span>
                          {vence && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: vencido ? '#fee2e2' : '#f3f4f6', color: vencido ? '#ef4444' : '#6b7280', fontWeight: vencido ? 700 : 400 }}>
                              <CalendarIcon />{vence}
                            </span>
                          )}
                        </div>

                        {/* Assigned */}
                        {asignado && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {renderMiniAvatar(asignado)}
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{asignado.aliasAsistencia || asignado.nombre.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>

                      {/* Expand: description + move buttons */}
                      <div onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                        style={{ borderTop: '1px solid #f3f4f6', padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#d1d5db' }}>{isExpanded ? '▲ menos' : '▼ más'}</span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '8px 12px 10px', borderTop: '1px solid #f3f4f6' }}>
                          {ticket.descripcion && (
                            <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: '0 0 10px' }}>{ticket.descripcion}</p>
                          )}
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {COLUMNAS.filter(c => c.id !== col.id).map(c => (
                              <button key={c.id} onClick={e => { e.stopPropagation(); mover(ticket.id, c.id); }}
                                style={{ fontSize: 10, padding: '3px 9px', background: 'none', border: `1px solid ${c.color}`, borderRadius: 5, cursor: 'pointer', color: c.color, fontWeight: 600 }}>
                                → {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTickets.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#d1d5db', fontSize: 12, border: '1px dashed #e8e8ee', borderRadius: 8, background: '#fff' }}>
                    Sin tickets
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{editandoId ? 'Editar Ticket' : 'Nuevo Ticket'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Título</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Descripción breve de la tarea" style={inp()} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles..." style={inp({ resize: 'vertical', minHeight: 80 })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))} style={inp()}>
                    {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Columna</label>
                  <select value={form.columna} onChange={e => setForm(p => ({ ...p, columna: e.target.value }))} style={inp()}>
                    {COLUMNAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inp()}>
                    {tipos.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div style={{ marginTop: 6 }}>
                    {showTipoInput ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarTipo()} placeholder="Nuevo tipo" autoFocus style={inp({ padding: '5px 8px', fontSize: 11 })} />
                        <button onClick={agregarTipo} style={{ padding: '5px 10px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>+</button>
                        <button onClick={() => setShowTipoInput(false)} style={{ padding: '5px 8px', background: 'none', border: '1px solid #e8e8ee', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#6b7280' }}>×</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {tipos.filter(t => !TIPOS_DEFAULT.includes(t)).map(t => (
                          <span key={t} style={{ fontSize: 10, background: '#f3f4f6', border: '1px solid #e8e8ee', borderRadius: 4, padding: '2px 6px', display: 'inline-flex', gap: 3, alignItems: 'center', color: '#6b7280' }}>
                            {t}
                            <button onClick={() => eliminarTipo(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        ))}
                        <button onClick={() => setShowTipoInput(true)} style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: '1px dashed #d1d5db', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}>+ tipo</button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Asignado a</label>
                  <select value={form.asignadoId} onChange={e => setForm(p => ({ ...p, asignadoId: e.target.value ? parseInt(e.target.value) : '' }))} style={inp()}>
                    <option value="">Sin asignar</option>
                    {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Fecha de vencimiento</label>
                  <input type="date" value={form.fechaVence} onChange={e => setForm(p => ({ ...p, fechaVence: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Color de acento</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 38, height: 38, border: '1px solid #e8e8ee', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Borde izquierdo de la tarjeta</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid #eee' }}>
              <div>
                {editandoId && <button onClick={() => { eliminar(editandoId); setShowModal(false); }} style={{ padding: '9px 16px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #e8e8ee', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' }}>Cancelar</button>
                <button onClick={guardar} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{editandoId ? 'Guardar cambios' : 'Crear ticket'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
