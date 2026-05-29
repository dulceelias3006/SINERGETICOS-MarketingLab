import { useState, useRef, useEffect } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const COLUMNAS = [
  { id: 'backlog',    label: 'Backlog',      color: '#94a3b8' },
  { id: 'progreso',   label: 'En Progreso',  color: '#4a9eff' },
  { id: 'revision',   label: 'En Revisión',  color: '#facc15' },
  { id: 'completado', label: 'Completado',   color: '#4ade80' },
];

const PRIORIDADES = [
  { key: 'alta',  label: 'Alta',  color: '#ef4444', bg: '#fee2e2' },
  { key: 'media', label: 'Media', color: '#f59e0b', bg: '#fef3c7' },
  { key: 'baja',  label: 'Baja',  color: '#94a3b8', bg: '#f1f5f9' },
];

const TIPOS_DEFAULT = ['Diseño', 'Técnico', 'Contenido', 'SEO', 'Estrategia', 'Video', 'Analíticas'];

const AREA_COLORES = ['#e53e3e', '#4a9eff', '#4ade80', '#f59e0b', '#8b5cf6', '#14b8a6', '#f472b6', '#fb923c'];

const TICKET_INIT = {
  titulo: '', descripcion: '', prioridad: 'media',
  tipo: 'Diseño', asignadoId: '', columna: 'backlog',
  fechaVence: '', areaId: '', proyectoId: '',
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getIniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0] || '').join('').toUpperCase();
}

function MiniAvatar({ m }) {
  const base = { width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
  if (m.avatarType === 'photo' && m.avatarPhoto)
    return <div style={base}><img src={m.avatarPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /></div>;
  if (m.avatarType === 'emoji' && m.avatarEmoji)
    return <div style={{ ...base, background: m.avatarBg || '#1c1c2a', fontSize: 12 }}>{m.avatarEmoji}</div>;
  return <div style={{ ...base, background: m.avatarColor || '#6b7280', color: '#fff', fontWeight: 700, fontSize: 9 }}>{getIniciales(m.nombre)}</div>;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

export default function Tickets() {
  const { can } = useAuth();
  const canSync = useRef(false);

  // Data
  const [tickets,   setTickets]   = useState([]);
  const [areas,     setAreas]     = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [equipo,    setEquipo]    = useState([]);
  const [tipos,     setTipos]     = useState(TIPOS_DEFAULT);
  const [loading,   setLoading]   = useState(true);

  // Filtros
  const [filtroArea,     setFiltroArea]     = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');

  // Ticket modal
  const [showTicket,  setShowTicket]  = useState(false);
  const [editandoId,  setEditandoId]  = useState(null);
  const [form,        setForm]        = useState(TICKET_INIT);
  const [showTipoInput, setShowTipoInput] = useState(false);
  const [nuevoTipo,     setNuevoTipo]     = useState('');

  // Inline área
  const [showNewArea,    setShowNewArea]    = useState(false);
  const [newAreaNombre,  setNewAreaNombre]  = useState('');
  const [newAreaColor,   setNewAreaColor]   = useState(AREA_COLORES[0]);

  // Inline proyecto
  const [showNewProy,   setShowNewProy]   = useState(false);
  const [newProyNombre, setNewProyNombre] = useState('');

  // Drag
  const [draggingId,  setDraggingId]  = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Expand
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    Promise.all([
      dbGet('tickets'), dbGet('tickets_areas'), dbGet('tickets_proyectos'),
      dbGet('tickets_tipos'), dbGet('equipo'),
    ]).then(([tk, ar, pr, ti, eq]) => {
      canSync.current = true;
      if (tk) setTickets(tk);
      if (ar) setAreas(ar);
      if (pr) setProyectos(pr);
      if (ti) setTipos(ti);
      if (eq) setEquipo(eq);
      setLoading(false);
    });
    const s1 = dbSub('tickets',           v => v && setTickets(v));
    const s2 = dbSub('tickets_areas',     v => v && setAreas(v));
    const s3 = dbSub('tickets_proyectos', v => v && setProyectos(v));
    const s4 = dbSub('tickets_tipos',     v => v && setTipos(v));
    const s5 = dbSub('equipo',            v => v && setEquipo(v));
    return () => { s1.unsubscribe(); s2.unsubscribe(); s3.unsubscribe(); s4.unsubscribe(); s5.unsubscribe(); };
  }, []);

  function saveTickets(next)   { setTickets(next);   if (canSync.current) dbSet('tickets', next); }
  function saveAreas(next)     { setAreas(next);     if (canSync.current) dbSet('tickets_areas', next); }
  function saveProyectos(next) { setProyectos(next); if (canSync.current) dbSet('tickets_proyectos', next); }
  function saveTipos(next)     { setTipos(next);     if (canSync.current) dbSet('tickets_tipos', next); }

  // Datos filtrados
  const proyFiltrados   = filtroArea ? proyectos.filter(p => p.areaId === filtroArea) : proyectos;
  const ticketsFiltrados = tickets.filter(t => {
    if (filtroArea     && t.areaId     !== filtroArea)     return false;
    if (filtroProyecto && t.proyectoId !== filtroProyecto) return false;
    return true;
  });

  // Acciones áreas/proyectos
  function crearArea() {
    const nombre = newAreaNombre.trim();
    if (!nombre) return;
    const nueva = { id: uid(), nombre, color: newAreaColor };
    saveAreas([...areas, nueva]);
    setNewAreaNombre(''); setShowNewArea(false);
    setFiltroArea(nueva.id); setFiltroProyecto('');
  }
  function eliminarArea(id) {
    if (!confirm('¿Eliminar esta área y desvincular sus tickets?')) return;
    saveAreas(areas.filter(a => a.id !== id));
    saveProyectos(proyectos.filter(p => p.areaId !== id));
    saveTickets(tickets.map(t => t.areaId === id ? { ...t, areaId: '', proyectoId: '' } : t));
    if (filtroArea === id) { setFiltroArea(''); setFiltroProyecto(''); }
  }
  function crearProyecto() {
    const nombre = newProyNombre.trim();
    if (!nombre || !filtroArea) return;
    const nuevo = { id: uid(), areaId: filtroArea, nombre };
    saveProyectos([...proyectos, nuevo]);
    setNewProyNombre(''); setShowNewProy(false);
    setFiltroProyecto(nuevo.id);
  }
  function eliminarProyecto(id) {
    if (!confirm('¿Eliminar este proyecto y desvincular sus tickets?')) return;
    saveProyectos(proyectos.filter(p => p.id !== id));
    saveTickets(tickets.map(t => t.proyectoId === id ? { ...t, proyectoId: '' } : t));
    if (filtroProyecto === id) setFiltroProyecto('');
  }

  // Acciones tickets
  function abrirNuevoTicket(columna = 'backlog') {
    setEditandoId(null);
    setForm({ ...TICKET_INIT, columna, areaId: filtroArea, proyectoId: filtroProyecto });
    setShowTicket(true);
  }
  function abrirEditar(t) {
    setEditandoId(t.id);
    setForm({
      titulo: t.titulo, descripcion: t.descripcion || '', prioridad: t.prioridad || 'media',
      tipo: t.tipo || 'Diseño', asignadoId: t.asignadoId || '', columna: t.columna || 'backlog',
      fechaVence: t.fechaVence || '', areaId: t.areaId || '', proyectoId: t.proyectoId || '',
    });
    setShowTicket(true);
  }
  function guardar() {
    if (!form.titulo.trim()) return;
    if (editandoId) {
      saveTickets(tickets.map(t => t.id === editandoId ? { ...t, ...form } : t));
    } else {
      saveTickets([...tickets, { ...form, id: uid(), creadoEn: new Date().toISOString().slice(0, 10) }]);
    }
    setShowTicket(false);
  }
  function eliminarTicket(id) {
    if (confirm('¿Eliminar este ticket?')) {
      saveTickets(tickets.filter(t => t.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }
  function mover(id, col) {
    saveTickets(tickets.map(t => t.id === id ? { ...t, columna: col } : t));
  }
  function agregarTipo() {
    const t = nuevoTipo.trim();
    if (t && !tipos.includes(t)) saveTipos([...tipos, t]);
    setNuevoTipo(''); setShowTipoInput(false);
  }
  function eliminarTipo(t) { saveTipos(tipos.filter(x => x !== t)); }

  // Drag
  function onDragStart(e, id) { setDraggingId(id); e.dataTransfer.effectAllowed = 'move'; }
  function onDragOverCol(e, colId) { e.preventDefault(); setDragOverCol(colId); }
  function onDropCol(colId) { if (draggingId) mover(draggingId, colId); setDraggingId(null); setDragOverCol(null); }
  function onDragEnd() { setDraggingId(null); setDragOverCol(null); }

  const inp = (extra = {}) => ({
    width: '100%', border: '1px solid var(--app-border)', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, outline: 'none',
    background: 'var(--app-surface)', boxSizing: 'border-box', color: 'var(--app-text)', ...extra,
  });

  const areaActual = areas.find(a => a.id === filtroArea);

  if (loading) return <div style={{ minHeight: 200 }} />;

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky header + filtros ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)' }}>

        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--app-text)', margin: 0 }}>🎫 Tickets</h1>
            <p style={{ fontSize: 12, color: 'var(--app-text-subtle)', margin: '2px 0 0' }}>
              {ticketsFiltrados.length !== tickets.length
                ? `${ticketsFiltrados.length} de ${tickets.length} tickets`
                : `${tickets.length} tickets`}
              {' · '}
              {ticketsFiltrados.filter(t => t.columna === 'completado').length} completados
            </p>
          </div>
          {can('edit') && (
            <button onClick={() => abrirNuevoTicket()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Nuevo Ticket
            </button>
          )}
        </div>

        {/* Chips de Áreas */}
        <div style={{ padding: '0 24px 12px', display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0, marginRight: 2 }}>Área</span>

          <button onClick={() => { setFiltroArea(''); setFiltroProyecto(''); }}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, border: `1.5px solid ${!filtroArea ? '#e53e3e' : 'var(--app-border)'}`, background: !filtroArea ? '#e53e3e12' : 'var(--app-surface-2)', color: !filtroArea ? '#e53e3e' : 'var(--app-text-subtle)', whiteSpace: 'nowrap' }}>
            Todas
          </button>

          {areas.map(area => (
            <div key={area.id} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <button onClick={() => { setFiltroArea(filtroArea === area.id ? '' : area.id); setFiltroProyecto(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: filtroArea === area.id ? '20px 0 0 20px' : 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${filtroArea === area.id ? area.color : 'var(--app-border)'}`, borderRight: filtroArea === area.id ? 'none' : undefined, background: filtroArea === area.id ? area.color + '18' : 'var(--app-surface-2)', color: filtroArea === area.id ? area.color : 'var(--app-text-subtle)', whiteSpace: 'nowrap' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: area.color }} />
                {area.nombre}
              </button>
              {filtroArea === area.id && can('edit') && (
                <button onClick={() => eliminarArea(area.id)}
                  style={{ padding: '4px 7px', borderRadius: '0 20px 20px 0', fontSize: 11, cursor: 'pointer', border: `1.5px solid ${area.color}`, borderLeft: 'none', background: area.color + '18', color: area.color, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
          ))}

          {can('edit') && !showNewArea && (
            <button onClick={() => setShowNewArea(true)}
              style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', flexShrink: 0, border: '1.5px dashed var(--app-border)', background: 'none', color: 'var(--app-text-subtle)', whiteSpace: 'nowrap' }}>
              + Área
            </button>
          )}
          {showNewArea && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
              <input value={newAreaNombre} onChange={e => setNewAreaNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && crearArea()} placeholder="Nombre..." autoFocus
                style={{ width: 120, padding: '4px 9px', fontSize: 12, border: '1px solid var(--app-border)', borderRadius: 8, outline: 'none', background: 'var(--app-surface)', color: 'var(--app-text)' }} />
              {AREA_COLORES.map(c => (
                <div key={c} onClick={() => setNewAreaColor(c)}
                  style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0, outline: newAreaColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
              <button onClick={crearArea} style={{ padding: '3px 8px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>+</button>
              <button onClick={() => { setShowNewArea(false); setNewAreaNombre(''); }} style={{ padding: '3px 6px', background: 'none', border: '1px solid var(--app-border)', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: 'var(--app-text-subtle)' }}>×</button>
            </div>
          )}
        </div>

        {/* Chips de Proyectos (solo si hay área seleccionada) */}
        {filtroArea && (
          <div style={{ padding: '8px 24px 12px', display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flexWrap: 'nowrap', borderTop: '1px solid var(--app-border-light)' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0, marginRight: 2 }}>Proyecto</span>

            <button onClick={() => setFiltroProyecto('')}
              style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0, border: `1.5px solid ${!filtroProyecto ? (areaActual?.color || '#888') : 'var(--app-border)'}`, background: !filtroProyecto ? (areaActual?.color || '#888') + '15' : 'var(--app-surface-2)', color: !filtroProyecto ? (areaActual?.color || '#888') : 'var(--app-text-subtle)', whiteSpace: 'nowrap' }}>
              Todos
            </button>

            {proyFiltrados.map(p => (
              <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => setFiltroProyecto(filtroProyecto === p.id ? '' : p.id)}
                  style={{ padding: '3px 10px', borderRadius: filtroProyecto === p.id ? '20px 0 0 20px' : 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${filtroProyecto === p.id ? (areaActual?.color || '#888') : 'var(--app-border)'}`, borderRight: filtroProyecto === p.id ? 'none' : undefined, background: filtroProyecto === p.id ? (areaActual?.color || '#888') + '15' : 'var(--app-surface-2)', color: filtroProyecto === p.id ? (areaActual?.color || '#888') : 'var(--app-text-subtle)', whiteSpace: 'nowrap' }}>
                  {p.nombre}
                </button>
                {filtroProyecto === p.id && can('edit') && (
                  <button onClick={() => eliminarProyecto(p.id)}
                    style={{ padding: '3px 7px', borderRadius: '0 20px 20px 0', fontSize: 11, cursor: 'pointer', border: `1.5px solid ${areaActual?.color || '#888'}`, borderLeft: 'none', background: (areaActual?.color || '#888') + '15', color: areaActual?.color || '#888', lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            ))}

            {can('edit') && !showNewProy && (
              <button onClick={() => setShowNewProy(true)}
                style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer', flexShrink: 0, border: '1.5px dashed var(--app-border)', background: 'none', color: 'var(--app-text-subtle)', whiteSpace: 'nowrap' }}>
                + Proyecto
              </button>
            )}
            {showNewProy && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                <input value={newProyNombre} onChange={e => setNewProyNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && crearProyecto()} placeholder="Nombre..." autoFocus
                  style={{ width: 130, padding: '4px 9px', fontSize: 12, border: '1px solid var(--app-border)', borderRadius: 8, outline: 'none', background: 'var(--app-surface)', color: 'var(--app-text)' }} />
                <button onClick={crearProyecto} style={{ padding: '3px 8px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>+</button>
                <button onClick={() => { setShowNewProy(false); setNewProyNombre(''); }} style={{ padding: '3px 6px', background: 'none', border: '1px solid var(--app-border)', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: 'var(--app-text-subtle)' }}>×</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Kanban board ── */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 24px', overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
        {COLUMNAS.map(col => {
          const colTickets = ticketsFiltrados.filter(t => t.columna === col.id);
          const isDragOver = dragOverCol === col.id;
          return (
            <div key={col.id}
              onDragOver={e => onDragOverCol(e, col.id)}
              onDrop={() => onDropCol(col.id)}
              style={{ minWidth: 270, width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

              {/* Columna header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--app-text)' }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--app-text-subtle)', background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{colTickets.length}</span>
                </div>
                {can('edit') && (
                  <button onClick={() => abrirNuevoTicket(col.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>+</button>
                )}
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80, background: isDragOver ? 'rgba(229,62,62,0.04)' : 'transparent', borderRadius: 10, transition: 'background 0.15s', padding: isDragOver ? 6 : 0 }}>
                {colTickets.map(ticket => {
                  const prio     = PRIORIDADES.find(p => p.key === ticket.prioridad) || PRIORIDADES[1];
                  const asignado = equipo.find(m => String(m.id) === String(ticket.asignadoId));
                  const area     = areas.find(a => a.id === ticket.areaId);
                  const proyecto = proyectos.find(p => p.id === ticket.proyectoId);
                  const isExpanded = expandedId === ticket.id;
                  const hoy     = new Date().toISOString().slice(0, 10);
                  const vencido = ticket.fechaVence && ticket.fechaVence < hoy && ticket.columna !== 'completado';
                  const accent  = area?.color || '#4a9eff';

                  return (
                    <div key={ticket.id}
                      draggable={can('edit')}
                      onDragStart={can('edit') ? e => onDragStart(e, ticket.id) : undefined}
                      onDragEnd={can('edit') ? onDragEnd : undefined}
                      style={{ background: 'var(--app-surface)', borderRadius: 10, boxShadow: draggingId === ticket.id ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--app-border)', borderLeft: `4px solid ${accent}`, opacity: draggingId === ticket.id ? 0.5 : 1, cursor: can('edit') ? 'grab' : 'default', transition: 'box-shadow 0.15s, opacity 0.15s' }}>

                      <div style={{ padding: '10px 12px 8px' }}>
                        {/* Título + botones */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)', lineHeight: 1.4, flex: 1 }}>{ticket.titulo}</div>
                          {can('edit') && (
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => abrirEditar(ticket)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, display: 'flex' }}><PencilIcon /></button>
                              <button onClick={() => eliminarTicket(ticket.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, display: 'flex' }}><TrashIcon /></button>
                            </div>
                          )}
                        </div>

                        {/* Breadcrumb área › proyecto */}
                        {(area || proyecto) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                            {area && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: area.color, background: area.color + '15', borderRadius: 4, padding: '1px 6px' }}>{area.nombre}</span>
                            )}
                            {proyecto && (
                              <>
                                <span style={{ fontSize: 9, color: 'var(--app-text-subtle)' }}>›</span>
                                <span style={{ fontSize: 10, color: 'var(--app-text-subtle)', fontWeight: 500 }}>{proyecto.nombre}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: asignado || ticket.fechaVence ? 7 : 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: prio.bg, color: prio.color }}>{prio.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: 'var(--app-surface-2)', color: 'var(--app-text-subtle)' }}>{ticket.tipo}</span>
                          {ticket.fechaVence && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: vencido ? '#fee2e2' : '#f1f5f9', color: vencido ? '#ef4444' : '#6b7280', fontWeight: vencido ? 700 : 400 }}>
                              <CalendarIcon />{ticket.fechaVence}
                            </span>
                          )}
                        </div>

                        {/* Asignado */}
                        {asignado && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MiniAvatar m={asignado} />
                            <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>{asignado.aliasAsistencia || asignado.nombre.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>

                      {/* Toggle descripción + mover */}
                      <div onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                        style={{ borderTop: '1px solid var(--app-border-light)', padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#d1d5db' }}>{isExpanded ? '▲ menos' : '▼ más'}</span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '8px 12px 10px', borderTop: '1px solid var(--app-border-light)' }}>
                          {ticket.descripcion && (
                            <p style={{ fontSize: 12, color: 'var(--app-text-subtle)', lineHeight: 1.5, margin: '0 0 10px' }}>{ticket.descripcion}</p>
                          )}
                          {can('edit') && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {COLUMNAS.filter(c => c.id !== col.id).map(c => (
                                <button key={c.id} onClick={e => { e.stopPropagation(); mover(ticket.id, c.id); }}
                                  style={{ fontSize: 10, padding: '3px 9px', background: 'none', border: `1px solid ${c.color}`, borderRadius: 5, cursor: 'pointer', color: c.color, fontWeight: 600 }}>
                                  → {c.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTickets.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#d1d5db', fontSize: 12, border: '1px dashed var(--app-border)', borderRadius: 8, background: 'var(--app-surface)' }}>
                    Sin tickets
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal Ticket ── */}
      {showTicket && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowTicket(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--app-border-light)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--app-text)' }}>{editandoId ? 'Editar Ticket' : 'Nuevo Ticket'}</span>
              <button onClick={() => setShowTicket(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Título */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Descripción breve de la tarea" style={inp()} autoFocus />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles adicionales..." style={inp({ resize: 'vertical', minHeight: 80 })} />
              </div>

              {/* Área + Proyecto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Área</label>
                  <select value={form.areaId} onChange={e => setForm(p => ({ ...p, areaId: e.target.value, proyectoId: '' }))} style={inp()}>
                    <option value="">Sin área</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Proyecto</label>
                  <select value={form.proyectoId} onChange={e => setForm(p => ({ ...p, proyectoId: e.target.value }))} style={inp()} disabled={!form.areaId}>
                    <option value="">Sin proyecto</option>
                    {proyectos.filter(p => p.areaId === form.areaId).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Prioridad + Columna */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))} style={inp()}>
                    {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Columna</label>
                  <select value={form.columna} onChange={e => setForm(p => ({ ...p, columna: e.target.value }))} style={inp()}>
                    {COLUMNAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Tipo + Asignado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inp()}>
                    {tipos.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div style={{ marginTop: 7 }}>
                    {showTipoInput ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarTipo()} placeholder="Nuevo tipo" autoFocus style={inp({ padding: '5px 8px', fontSize: 11 })} />
                        <button onClick={agregarTipo} style={{ padding: '5px 10px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>+</button>
                        <button onClick={() => setShowTipoInput(false)} style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--app-border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: 'var(--app-text-subtle)' }}>×</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {tipos.filter(t => !TIPOS_DEFAULT.includes(t)).map(t => (
                          <span key={t} style={{ fontSize: 10, background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 4, padding: '2px 6px', display: 'inline-flex', gap: 3, alignItems: 'center', color: 'var(--app-text-subtle)' }}>
                            {t}
                            <button onClick={() => eliminarTipo(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        ))}
                        <button onClick={() => setShowTipoInput(true)} style={{ fontSize: 10, color: 'var(--app-text-subtle)', background: 'none', border: '1px dashed #d1d5db', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}>+ tipo</button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Asignado a</label>
                  <select value={form.asignadoId} onChange={e => setForm(p => ({ ...p, asignadoId: e.target.value }))} style={inp()}>
                    <option value="">Sin asignar</option>
                    {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Fecha vencimiento */}
              <div style={{ maxWidth: '50%', paddingRight: 6 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Fecha de vencimiento</label>
                <input type="date" value={form.fechaVence} onChange={e => setForm(p => ({ ...p, fechaVence: e.target.value }))} style={inp()} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid var(--app-border-light)' }}>
              <div>
                {editandoId && (
                  <button onClick={() => { eliminarTicket(editandoId); setShowTicket(false); }}
                    style={{ padding: '9px 16px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Eliminar
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowTicket(false)} style={{ padding: '9px 18px', border: '1px solid var(--app-border)', borderRadius: 8, background: 'var(--app-surface)', cursor: 'pointer', fontSize: 13, color: 'var(--app-text-subtle)' }}>Cancelar</button>
                <button onClick={guardar} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {editandoId ? 'Guardar cambios' : 'Crear ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
