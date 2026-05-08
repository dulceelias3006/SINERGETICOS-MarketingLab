import { useState, useEffect } from 'react';
import { dbGet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const BLOQUES_DEFAULT = [
  { id: 'd1', tipo: 'stat_proximo_evento', colSpan: 1 },
  { id: 'd2', tipo: 'stat_presupuesto',    colSpan: 1 },
  { id: 'd3', tipo: 'stat_tickets',        colSpan: 1 },
  { id: 'd4', tipo: 'stat_costo_reg',      colSpan: 1 },
  { id: 'd5', tipo: 'proximos_eventos',    colSpan: 3 },
  { id: 'd6', tipo: 'atencion_requerida',  colSpan: 1 },
  { id: 'd7', tipo: 'rendimiento',         colSpan: 1 },
  { id: 'd8', tipo: 'accesos_rapidos',     colSpan: 3 },
];

const CATS = [
  { id: 'todos',   label: 'Todos',   count: 14 },
  { id: 'resumen', label: 'Resumen', count: 8  },
  { id: 'eventos', label: 'Eventos', count: 2  },
  { id: 'tickets', label: 'Tickets', count: 1  },
  { id: 'otros',   label: 'Otros',   count: 3  },
];

const CATALOGO = [
  { tipo: 'stat_proximo_evento',  nombre: 'Próximo Evento',      desc: 'Fecha del próximo evento programado',          cat: 'resumen' },
  { tipo: 'stat_presupuesto',     nombre: 'Presupuesto',         desc: '% del presupuesto total utilizado',            cat: 'resumen' },
  { tipo: 'stat_tickets',         nombre: 'Tickets Abiertos',    desc: 'Total de tickets activos y urgentes',          cat: 'resumen' },
  { tipo: 'stat_costo_reg',       nombre: 'Costo/Registro',      desc: 'Costo promedio por registro logrado',          cat: 'resumen' },
  { tipo: 'stat_total_reg',       nombre: 'Total Registros',     desc: 'Suma de registros en todos los eventos',       cat: 'resumen' },
  { tipo: 'stat_eventos_activos', nombre: 'Eventos Activos',     desc: 'Cantidad de eventos en estado activo',         cat: 'resumen' },
  { tipo: 'stat_total_eventos',   nombre: 'Total Eventos',       desc: 'Cantidad total de eventos registrados',        cat: 'resumen' },
  { tipo: 'stat_vip',             nombre: 'VIP Vendidos',        desc: 'Total de entradas VIP vendidas',               cat: 'resumen' },
  { tipo: 'proximos_eventos',     nombre: 'Próximos Eventos',    desc: 'Próximos 4 eventos con avance de registros',   cat: 'eventos' },
  { tipo: 'avance_general',       nombre: 'Avance General',      desc: 'Barras de progreso de registros por evento',   cat: 'eventos' },
  { tipo: 'atencion_requerida',   nombre: 'Atención Requerida',  desc: 'Tickets urgentes que necesitan atención',      cat: 'tickets' },
  { tipo: 'rendimiento',          nombre: 'Rendimiento',         desc: 'Mejor y mayor costo por registro',             cat: 'otros'   },
  { tipo: 'accesos_rapidos',      nombre: 'Accesos Rápidos',     desc: 'Accesos rápidos a los enlaces guardados',      cat: 'otros'   },
  { tipo: 'actividad_reciente',   nombre: 'Actividad Reciente',  desc: 'Últimas acciones registradas en eventos',      cat: 'otros'   },
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoCal    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoDollar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcoTicket = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>;
const IcoTarget = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IcoUsers  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoBolt   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IcoCrown  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20M5 20l2-8 5 4 5-4 2 8"/><circle cx="12" cy="6" r="2"/></svg>;
const IcoAlert  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoBar    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoLink   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IcoClock  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoDown   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const IcoUp     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;

function iconForTipo(tipo) {
  const m = {
    stat_proximo_evento: <IcoCal />, stat_presupuesto: <IcoDollar />, stat_tickets: <IcoTicket />,
    stat_costo_reg: <IcoTarget />, stat_total_reg: <IcoUsers />, stat_eventos_activos: <IcoBolt />,
    stat_total_eventos: <IcoCal />, stat_vip: <IcoCrown />, proximos_eventos: <IcoCal />,
    avance_general: <IcoBar />, atencion_requerida: <IcoAlert />, rendimiento: <IcoTarget />,
    accesos_rapidos: <IcoLink />, actividad_reciente: <IcoClock />,
  };
  return m[tipo] || <IcoBar />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function diasHasta(f) {
  if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(f + 'T00:00:00');
  return Math.round((d - hoy) / 86400000);
}

function fmtHora(h) {
  if (!h) return '';
  const [hr, m] = h.split(':').map(Number);
  const ap = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 || 12;
  return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2, '0')}${ap}`;
}

function fmtFecha(f) {
  if (!f) return '';
  return new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'hace un momento';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
  return new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

const fmtN   = n => Number(n || 0).toLocaleString('es-MX');
const fmtMXN = n => `$${fmtN(n)}`;
const pctColor = p => p >= 90 ? '#4ade80' : p >= 60 ? '#facc15' : '#ef4444';

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { can } = useAuth();
  const [eventos, setEventos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventos') || '[]'); } catch { return []; }
  });
  const [tickets, setTickets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tickets') || '[]'); } catch { return []; }
  });
  const [enlaces, setEnlaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enlaces') || '[]'); } catch { return []; }
  });
  const [historial] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventos_historial') || '[]').slice(0, 8); } catch { return []; }
  });

  useEffect(() => {
    dbGet('eventos').then(v => { if (v !== null) setEventos(v); });
    dbGet('tickets').then(v => { if (v !== null) setTickets(v); });
    dbGet('enlaces').then(v => { if (v !== null) setEnlaces(v); });
    const s1 = dbSub('eventos', v => setEventos(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    const s2 = dbSub('tickets', v => setTickets(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    const s3 = dbSub('enlaces', v => setEnlaces(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    return () => { s1.unsubscribe(); s2.unsubscribe(); s3.unsubscribe(); };
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────────
  const totalRegistros   = eventos.reduce((s, e) => s + (Number(e.registrosActuales) || 0), 0);
  const metaTotal        = eventos.reduce((s, e) => s + (Number(e.registrosMeta)      || 0), 0);
  const totalPresupuesto = eventos.reduce((s, e) => s + (Number(e.presupuestoTotal)   || 0), 0);
  const totalGastado     = eventos.reduce((s, e) => s + (Number(e.presupuestoGastado) || 0), 0);
  const totalVip         = eventos.reduce((s, e) => s + (Number(e.vipVendidas)        || 0), 0);
  const pctPresupuesto   = totalPresupuesto > 0 ? Math.round(totalGastado / totalPresupuesto * 100) : 0;
  const costoPromedio    = totalRegistros > 0 ? Math.round(totalGastado / totalRegistros) : 0;
  const activos          = eventos.filter(e => e.estado === 'activo');

  const conCosto = activos
    .filter(e => (Number(e.registrosActuales) || 0) > 0 && (Number(e.presupuestoGastado) || 0) > 0)
    .map(e => ({ ...e, costoReg: Math.round(e.presupuestoGastado / e.registrosActuales) }));
  const mejorCostoEv = conCosto.length > 0 ? conCosto.reduce((a, b) => a.costoReg < b.costoReg ? a : b) : null;
  const mayorCostoEv = conCosto.length > 0 ? conCosto.reduce((a, b) => a.costoReg > b.costoReg ? a : b) : null;

  const ticketsAbiertos      = tickets.filter(t => t.columna !== 'completado').length;
  const ticketsUrgentes      = tickets.filter(t => t.prioridad === 'alta' && t.columna !== 'completado').length;
  const ticketsUrgentesLista = tickets.filter(t => t.prioridad === 'alta' && t.columna !== 'completado').slice(0, 6);

  const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
  const proximosFiltrados = [...eventos]
    .filter(e => e.fecha && new Date(e.fecha + 'T00:00:00') >= hoyDate)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(0, 4);
  const proximoEvento = proximosFiltrados[0] || null;
  const diasProx = proximoEvento ? diasHasta(proximoEvento.fecha) : null;

  // ── Responsive columns ────────────────────────────────────────────────────────
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  const cols = winWidth >= 1200 ? 4 : winWidth >= 880 ? 3 : winWidth >= 580 ? 2 : 1;

  // ── Block state ───────────────────────────────────────────────────────────────
  const [bloques, setBloques] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dashboard_bloques') || 'null') || BLOQUES_DEFAULT; }
    catch { return BLOQUES_DEFAULT; }
  });
  const [editando, setEditando]     = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerCat, setPickerCat]   = useState('todos');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  function saveBloques(next) { setBloques(next); localStorage.setItem('dashboard_bloques', JSON.stringify(next)); }
  function agregarBloque(tipo) { saveBloques([...bloques, { id: Date.now(), tipo, colSpan: 1 }]); setShowPicker(false); }
  function eliminarBloque(id)  { saveBloques(bloques.filter(b => b.id !== id)); }
  function cambiarSpan(id, n)  { saveBloques(bloques.map(b => b.id === id ? { ...b, colSpan: n } : b)); }
  function restablecer()       { saveBloques(BLOQUES_DEFAULT); }

  function onDragStart(id) { setDraggingId(id); }
  function onDragOver(e, id) { e.preventDefault(); setDragOverId(id); }
  function onDrop(id) {
    if (!draggingId || draggingId === id) { setDraggingId(null); setDragOverId(null); return; }
    const arr = [...bloques];
    const fi = arr.findIndex(b => b.id === draggingId);
    const ti = arr.findIndex(b => b.id === id);
    const [rem] = arr.splice(fi, 1);
    arr.splice(ti, 0, rem);
    saveBloques(arr);
    setDraggingId(null); setDragOverId(null);
  }

  // ── Render helpers ────────────────────────────────────────────────────────────
  function statBlock(icon, label, value, valueColor, sub, extra) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ color: 'var(--app-text-subtle)' }}>{icon}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: valueColor || '#111827', lineHeight: 1.1, letterSpacing: -0.5 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 6 }}>{sub}</div>}
        {extra}
      </div>
    );
  }

  function panelHeader(icon, label, link, linkLabel) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'var(--app-text-subtle)' }}>{icon}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
        </div>
        {link && <a href={link} style={{ fontSize: 12, color: 'var(--app-text-subtle)', textDecoration: 'none' }}>{linkLabel} →</a>}
      </div>
    );
  }

  function badgeDias(dias) {
    const label = dias === 0 ? 'HOY' : `${dias}d`;
    const color = dias === 0 ? '#e53e3e' : dias <= 3 ? '#f97316' : dias <= 7 ? '#f59e0b' : '#9ca3af';
    return <span style={{ padding: '2px 9px', background: color, color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{label}</span>;
  }

  // ── Block renderer ────────────────────────────────────────────────────────────
  function renderContenido(b) {
    switch (b.tipo) {

      case 'stat_proximo_evento': {
        const rel = diasProx === null ? '—' : diasProx === 0 ? 'Hoy' : diasProx === 1 ? 'Mañana' : `En ${diasProx} días`;
        const sub = proximoEvento
          ? `${proximoEvento.nombre}${proximoEvento.hora ? ' ' + fmtHora(proximoEvento.hora) : ''}`
          : 'Sin eventos próximos';
        return statBlock(<IcoCal />, 'Próximo Evento', rel, '#111827', sub);
      }

      case 'stat_presupuesto': {
        const barColor = pctPresupuesto >= 100 ? '#ef4444' : '#4a9eff';
        const extra = (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 5, background: 'var(--app-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(pctPresupuesto, 100)}%`, background: barColor, borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 5 }}>{fmtMXN(totalGastado)} de {fmtMXN(totalPresupuesto)}</div>
          </div>
        );
        return statBlock(<IcoDollar />, 'Presupuesto', `${pctPresupuesto}%`, '#111827', null, extra);
      }

      case 'stat_tickets':
        return statBlock(
          <IcoTicket />, 'Tickets Abiertos', fmtN(ticketsAbiertos), '#111827',
          ticketsUrgentes > 0
            ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>{ticketsUrgentes} urgentes</span>
            : 'sin urgentes'
        );

      case 'stat_costo_reg':
        return statBlock(<IcoTarget />, 'Costo/Registro', fmtMXN(costoPromedio), '#4ade80', `${fmtN(totalRegistros)} registros totales`);

      case 'stat_total_reg':
        return statBlock(<IcoUsers />, 'Total Registros', fmtN(totalRegistros), '#111827', `Meta: ${fmtN(metaTotal)}`);

      case 'stat_eventos_activos':
        return statBlock(<IcoBolt />, 'Eventos Activos', fmtN(activos.length), '#e53e3e', 'con estado activo');

      case 'stat_total_eventos':
        return statBlock(<IcoCal />, 'Total Eventos', fmtN(eventos.length), '#111827', 'registrados');

      case 'stat_vip':
        return statBlock(<IcoCrown />, 'VIP Vendidos', fmtN(totalVip), '#111827',
          `en ${eventos.filter(e => (e.vipVendidas || 0) > 0).length} eventos`);

      case 'proximos_eventos':
        return (
          <div>
            {panelHeader(<IcoCal />, 'Proximos Eventos', '/eventos', 'Ver todos')}
            {proximosFiltrados.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--app-text-subtle)', textAlign: 'center', padding: '24px 0' }}>Sin eventos próximos</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: winWidth >= 700 ? '1fr 1fr' : '1fr', gap: 14 }}>
                  {proximosFiltrados.map(ev => {
                    const dias = diasHasta(ev.fecha);
                    const regPct = (ev.registrosMeta || 0) > 0
                      ? Math.min(100, Math.round((ev.registrosActuales || 0) / ev.registrosMeta * 100)) : 0;
                    const gasW = (ev.presupuestoTotal || 0) > 0
                      ? Math.min(100, Math.round((ev.presupuestoGastado || 0) / ev.presupuestoTotal * 100)) : 0;
                    const gasColor = (ev.presupuestoGastado || 0) > (ev.presupuestoTotal || 0) ? '#ef4444' : '#4a9eff';
                    return (
                      <div key={ev.id} style={{ padding: 14, background: 'var(--app-surface-alt)', borderRadius: 12, border: '1px solid var(--app-border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.3 }}>{ev.nombre}</span>
                          {dias !== null && dias >= 0 && badgeDias(dias)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginBottom: 12 }}>
                          {fmtFecha(ev.fecha)}{ev.tipo ? ` · ${ev.tipo.charAt(0).toUpperCase() + ev.tipo.slice(1)}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 14 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>Registros</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-2)' }}>{fmtN(ev.registrosActuales)}/{fmtN(ev.registrosMeta)}</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--app-border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${regPct}%`, background: pctColor(regPct), borderRadius: 99 }} />
                            </div>
                          </div>
                          {(ev.presupuestoTotal || 0) > 0 && (
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>Gastado</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-2)' }}>{fmtMXN(ev.presupuestoGastado)}</span>
                              </div>
                              <div style={{ height: 4, background: 'var(--app-border)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${gasW}%`, background: gasColor, borderRadius: 99 }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        );

      case 'avance_general':
        return (
          <div>
            {panelHeader(<IcoBar />, 'Avance General', '/eventos', 'Ver todos')}
            {eventos.length === 0 && <div style={{ fontSize: 13, color: 'var(--app-text-subtle)' }}>Sin eventos</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eventos.map(e => {
                const pct = (e.registrosMeta || 0) > 0
                  ? Math.min(100, Math.round((e.registrosActuales || 0) / e.registrosMeta * 100)) : 0;
                return (
                  <div key={e.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{e.nombre}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pctColor(pct) }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--app-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pctColor(pct), borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'atencion_requerida':
        return (
          <div>
            {panelHeader(<IcoAlert />, 'Atencion Requerida', '/tickets', 'Tickets')}
            {ticketsUrgentesLista.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--app-text-subtle)', textAlign: 'center', padding: '20px 0' }}>Sin tickets urgentes</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ticketsUrgentesLista.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--app-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</div>
                        <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {t.tipo || 'General'} · Urgente
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        );

      case 'rendimiento':
        return (
          <div>
            {panelHeader(<IcoTarget />, 'Rendimiento', null, null)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                  <span style={{ color: '#4ade80' }}><IcoDown /></span><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mejor Costo/Registro</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)' }}>{mejorCostoEv?.nombre || '—'}</div>
                {mejorCostoEv && <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', marginTop: 3 }}>{fmtMXN(mejorCostoEv.costoReg)}</div>}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                  <span style={{ color: '#ef4444' }}><IcoUp /></span><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mayor Costo/Registro</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)' }}>{mayorCostoEv?.nombre || '—'}</div>
                {mayorCostoEv && <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginTop: 3 }}>{fmtMXN(mayorCostoEv.costoReg)}</div>}
              </div>
            </div>
          </div>
        );

      case 'accesos_rapidos':
        return (
          <div>
            {panelHeader(<IcoLink />, 'Accesos Rapidos', '/enlaces', 'Ver todos')}
            {enlaces.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--app-text-subtle)' }}>Sin enlaces guardados</div>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {enlaces.slice(0, 16).map(e => (
                    <a key={e.id} href={e.url} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', background: 'var(--app-surface-alt)', border: '1px solid var(--app-border-light)', borderRadius: 20, fontSize: 12, fontWeight: 500, color: 'var(--app-text-2)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = '#f0f0f5'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = 'var(--app-surface-alt)'; }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.color || '#9ca3af', flexShrink: 0 }} />
                      {e.nombre}
                    </a>
                  ))}
                </div>
              )}
          </div>
        );

      case 'actividad_reciente':
        return (
          <div>
            {panelHeader(<IcoClock />, 'Actividad Reciente', '/eventos', 'Eventos')}
            {historial.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--app-text-subtle)', textAlign: 'center', padding: '20px 0' }}>Sin actividad registrada</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {historial.map(h => {
                    const cfg = {
                      creado:    { icon: '✨', color: '#4ade80', label: 'Creado'    },
                      editado:   { icon: '✏️', color: '#4a9eff', label: 'Editado'   },
                      eliminado: { icon: '🗑',  color: '#ef4444', label: 'Eliminado' },
                    }[h.tipo] || { icon: '·', color: 'var(--app-text-subtle)', label: h.tipo };
                    return (
                      <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{cfg.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>{cfg.label} · {relTime(h.ts)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        );

      default:
        return <div style={{ fontSize: 13, color: 'var(--app-text-subtle)' }}>Bloque no disponible</div>;
    }
  }

  const bloquesFiltrados = CATALOGO.filter(b =>
    (pickerCat === 'todos' || b.cat === pickerCat) &&
    (!pickerQuery || b.nombre.toLowerCase().includes(pickerQuery.toLowerCase()) || b.desc.toLowerCase().includes(pickerQuery.toLowerCase()))
  );

  const fechaHoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: winWidth < 600 ? '14px 16px 12px' : '20px 28px 16px', background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>Centro de Control</h1>
          <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 3 }}>{fechaHoy} · {bloques.length} bloques</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {can('edit') && editando && (
            <button onClick={restablecer}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--app-text-subtle)', padding: '7px 10px', borderRadius: 8 }}>
              Restablecer
            </button>
          )}
          {can('edit') && (
            <button onClick={() => setEditando(!editando)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: editando ? '#111827' : 'var(--app-surface)', color: editando ? '#fff' : 'var(--app-text-2)', border: `1px solid ${editando ? '#111827' : 'var(--app-border)'}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {editando ? 'Listo' : 'Editar'}
            </button>
          )}
          {can('edit') && (
            <button onClick={() => { setShowPicker(true); setPickerQuery(''); setPickerCat('todos'); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              + Agregar
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: winWidth < 600 ? '16px' : '24px 28px' }}>
        {bloques.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-text-subtle)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Sin bloques</div>
            <div style={{ fontSize: 13 }}>Agrega bloques con el botón "+ Agregar"</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: winWidth < 600 ? 10 : 16, alignItems: 'start' }}>
            {bloques.map(b => (
              <div key={b.id}
                draggable={editando}
                onDragStart={() => editando && onDragStart(b.id)}
                onDragOver={e => editando && onDragOver(e, b.id)}
                onDrop={() => editando && onDrop(b.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                style={{
                  gridColumn: `span ${Math.min(b.colSpan, cols)}`,
                  background: 'var(--app-surface)',
                  borderRadius: 16,
                  padding: '22px 24px',
                  border: `1.5px solid ${dragOverId === b.id ? '#e53e3e' : '#f0f0f5'}`,
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  position: 'relative',
                  opacity: draggingId === b.id ? 0.45 : 1,
                  cursor: editando ? 'grab' : 'default',
                  transition: 'border-color 0.15s',
                }}>
                {editando && (
                  <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 20, padding: '4px 8px', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--app-text-subtle)', fontSize: 12, padding: '0 3px', cursor: 'grab' }}>⠿</span>
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} onClick={() => cambiarSpan(b.id, n)}
                        style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: b.colSpan === n ? '#e53e3e' : 'transparent', color: b.colSpan === n ? '#fff' : 'var(--app-text-2)', lineHeight: 1 }}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => eliminarBloque(b.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: '0 3px', marginLeft: 2 }}>
                      ×
                    </button>
                  </div>
                )}
                {renderContenido(b)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '22px 24px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--app-text)' }}>Agregar Bloque</span>
                <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--app-surface-alt)', border: '2px solid #e53e3e', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder="Buscar bloques..."
                  autoFocus style={{ background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--app-text)', flex: 1 }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATS.map(c => (
                  <button key={c.id} onClick={() => setPickerCat(c.id)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: pickerCat === c.id ? 700 : 500, background: pickerCat === c.id ? '#111827' : 'transparent', color: pickerCat === c.id ? '#fff' : 'var(--app-text-muted)' }}>
                    {c.label} ({c.count})
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
              {bloquesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--app-text-subtle)', fontSize: 13 }}>Sin resultados</div>}
              {bloquesFiltrados.map(item => (
                <div key={item.tipo} onClick={() => agregarBloque(item.tipo)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--app-surface-alt)'; e.currentTarget.querySelector('.add-btn').style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.add-btn').style.opacity = '0'; }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--app-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-text-muted)', flexShrink: 0 }}>
                    {iconForTipo(item.tipo)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--app-text)' }}>{item.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <span className="add-btn" style={{ fontSize: 18, fontWeight: 700, color: '#e53e3e', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}>+</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
