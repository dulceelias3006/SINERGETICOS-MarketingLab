import { useState, useEffect } from 'react';
import { dbGet, dbSub } from '../lib/supabase';

// ── Catalog ───────────────────────────────────────────────────────────────────
const CATS = [
  { id: 'todos',       label: 'Todos',       count: 34 },
  { id: 'registros',   label: 'Registros',   count: 7  },
  { id: 'presupuesto', label: 'Presupuesto', count: 7  },
  { id: 'eventos',     label: 'Eventos',     count: 8  },
  { id: 'tickets',     label: 'Tickets',     count: 4  },
  { id: 'graficas',    label: 'Gráficas',    count: 7  },
  { id: 'tablas',      label: 'Tablas',      count: 1  },
];

const CATALOGO = [
  // Registros (7)
  { tipo: 'registros_totales',  nombre: 'Registros Totales',        desc: 'Total de registros en todos los eventos',           cat: 'registros' },
  { tipo: 'meta_registros',     nombre: 'Meta de Registros',         desc: 'Meta total de registros necesarios',                cat: 'registros' },
  { tipo: 'pct_registros',      nombre: '% Registros Logrados',      desc: 'Porcentaje de la meta de registros alcanzado',       cat: 'registros' },
  { tipo: 'registros_faltantes',nombre: 'Registros Faltantes',       desc: 'Cuántos registros faltan para cumplir la meta global',cat: 'registros' },
  { tipo: 'evento_mas_reg',     nombre: 'Evento con Más Registros',  desc: 'Evento con mayor cantidad de registros',            cat: 'registros' },
  { tipo: 'evento_menos_reg',   nombre: 'Evento con Menos Registros',desc: 'Evento activo con menor cantidad de registros',     cat: 'registros' },
  { tipo: 'promedio_reg',       nombre: 'Promedio Registros/Evento', desc: 'Promedio de registros por evento activo',           cat: 'registros' },
  // Presupuesto (7)
  { tipo: 'presupuesto_total',  nombre: 'Presupuesto Total',         desc: 'Suma del presupuesto en todos los eventos',         cat: 'presupuesto' },
  { tipo: 'costo_promedio',     nombre: 'Costo Promedio/Registro',   desc: 'Gasto promedio por cada registro logrado',          cat: 'presupuesto' },
  { tipo: 'total_gastado',      nombre: 'Total Gastado',             desc: 'Suma del gasto en todos los eventos (en MXN)',      cat: 'presupuesto' },
  { tipo: 'presupuesto_restante',nombre:'Presupuesto Restante',      desc: 'Cuánto presupuesto queda disponible (en MXN)',      cat: 'presupuesto' },
  { tipo: 'pct_presupuesto',    nombre: '% Presupuesto Usado',       desc: 'Porcentaje del presupuesto total utilizado',        cat: 'presupuesto' },
  { tipo: 'mejor_costo_reg',    nombre: 'Mejor Costo/Registro',      desc: 'Evento con el menor costo por registro',            cat: 'presupuesto' },
  { tipo: 'mayor_costo_reg',    nombre: 'Mayor Costo/Registro',      desc: 'Evento con el mayor costo por registro',            cat: 'presupuesto' },
  // Eventos (8)
  { tipo: 'total_eventos',      nombre: 'Total de Eventos',          desc: 'Cantidad total de eventos registrados',             cat: 'eventos' },
  { tipo: 'eventos_activos',    nombre: 'Eventos Activos',           desc: 'Eventos con estado activo',                        cat: 'eventos' },
  { tipo: 'eventos_planificados',nombre:'Eventos Planificados',      desc: 'Eventos con estado planificado',                   cat: 'eventos' },
  { tipo: 'eventos_completados',nombre: 'Eventos Completados',       desc: 'Eventos finalizados',                              cat: 'eventos' },
  { tipo: 'vip_vendidos',       nombre: 'VIP Vendidos',              desc: 'Total de entradas VIP vendidas',                   cat: 'eventos' },
  { tipo: 'vip_promedio',       nombre: 'VIP Promedio/Evento',       desc: 'Promedio de VIP vendidos por evento',              cat: 'eventos' },
  { tipo: 'eventos_presenciales',nombre:'Eventos Presenciales',      desc: 'Cantidad de eventos presenciales',                 cat: 'eventos' },
  { tipo: 'eventos_digitales',  nombre: 'Eventos Digitales',         desc: 'Cantidad de eventos digitales',                   cat: 'eventos' },
  // Tickets (4)
  { tipo: 'tickets_abiertos',   nombre: 'Tickets Abiertos',          desc: 'Total de tickets abiertos o en progreso',          cat: 'tickets' },
  { tipo: 'tickets_urgentes',   nombre: 'Tickets Urgentes',          desc: 'Tickets con prioridad urgente',                    cat: 'tickets' },
  { tipo: 'tickets_resueltos',  nombre: 'Tickets Resueltos',         desc: 'Tickets resueltos o cerrados',                    cat: 'tickets' },
  { tipo: 'panel_mas_tickets',  nombre: 'Panel con Más Tickets',     desc: 'Área con mayor cantidad de tickets abiertos',      cat: 'tickets' },
  // Gráficas (7)
  { tipo: 'por_estado',         nombre: 'Por Estado',                desc: 'Distribución de eventos por estado',               cat: 'graficas' },
  { tipo: 'por_tipo',           nombre: 'Por Tipo',                  desc: 'Distribución de eventos por tipo de evento',       cat: 'graficas' },
  { tipo: 'ranking_registros',  nombre: 'Ranking de Registros',      desc: 'Eventos ordenados por cantidad de registros',      cat: 'graficas' },
  { tipo: 'ranking_costo_reg',  nombre: 'Ranking Costo/Registro',    desc: 'Eventos ordenados por costo por registro',         cat: 'graficas' },
  { tipo: 'avance_registros',   nombre: 'Avance de Registros',       desc: 'Barra de progreso de registros por evento',        cat: 'graficas' },
  { tipo: 'uso_presupuesto',    nombre: 'Uso de Presupuesto',        desc: 'Barra de progreso de presupuesto por evento',      cat: 'graficas' },
  { tipo: 'destacados',         nombre: 'Destacados',                desc: 'Eventos destacados por métricas clave',            cat: 'graficas' },
  // Tablas (1)
  { tipo: 'comparativa',        nombre: 'Comparativa General',       desc: 'Tabla comparativa de todos los eventos',           cat: 'tablas' },
];

const BLOQUES_DEFAULT = [
  { id: 'd1', tipo: 'registros_totales',  colSpan: 1 },
  { id: 'd2', tipo: 'presupuesto_total',  colSpan: 1 },
  { id: 'd3', tipo: 'costo_promedio',     colSpan: 1 },
  { id: 'd4', tipo: 'vip_vendidos',       colSpan: 1 },
  { id: 'd5', tipo: 'por_estado',         colSpan: 2 },
  { id: 'd6', tipo: 'por_tipo',           colSpan: 2 },
  { id: 'd7', tipo: 'destacados',         colSpan: 2 },
  { id: 'd8', tipo: 'comparativa',        colSpan: 4 },
];

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IcoUsers   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoDollar  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcoTarget  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IcoCrown   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20M5 20l2-8 5 4 5-4 2 8"/><circle cx="12" cy="6" r="2"/></svg>;
const IcoClock   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoBar     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoBolt    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IcoTable   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>;
const IcoHash    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IcoPct     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const IcoDown    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const IcoUp      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcoCal     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoTicket  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>;
const IcoAlert   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoGrid    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IcoList    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

function iconForTipo(tipo) {
  const m = {
    registros_totales: <IcoUsers />, meta_registros: <IcoHash />, pct_registros: <IcoPct />,
    registros_faltantes: <IcoHash />, evento_mas_reg: <IcoUp />, evento_menos_reg: <IcoDown />,
    promedio_reg: <IcoBar />, presupuesto_total: <IcoDollar />, costo_promedio: <IcoTarget />,
    total_gastado: <IcoDollar />, presupuesto_restante: <IcoDollar />, pct_presupuesto: <IcoPct />,
    mejor_costo_reg: <IcoDown />, mayor_costo_reg: <IcoUp />,
    total_eventos: <IcoCal />, eventos_activos: <IcoBolt />, eventos_planificados: <IcoClock />,
    eventos_completados: <IcoBar />, vip_vendidos: <IcoCrown />, vip_promedio: <IcoCrown />,
    eventos_presenciales: <IcoCal />, eventos_digitales: <IcoCal />,
    tickets_abiertos: <IcoTicket />, tickets_urgentes: <IcoAlert />, tickets_resueltos: <IcoBar />,
    panel_mas_tickets: <IcoGrid />,
    por_estado: <IcoClock />, por_tipo: <IcoBar />, ranking_registros: <IcoBar />,
    ranking_costo_reg: <IcoTarget />, avance_registros: <IcoList />, uso_presupuesto: <IcoDollar />,
    destacados: <IcoBolt />, comparativa: <IcoTable />,
  };
  return m[tipo] || <IcoBar />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Analiticas() {
  const [eventos, setEventos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventos') || '[]'); } catch { return []; }
  });
  const [tickets, setTickets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tickets') || '[]'); } catch { return []; }
  });
  const [tiposEvento, setTiposEvento] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eventos_tipos') || 'null') ||
        [{ id: 'digital', label: 'Digital' }, { id: 'presencial', label: 'Presencial' }];
    } catch { return [{ id: 'digital', label: 'Digital' }, { id: 'presencial', label: 'Presencial' }]; }
  });

  useEffect(() => {
    dbGet('eventos').then(v => { if (v !== null) setEventos(v); });
    dbGet('tickets').then(v => { if (v !== null) setTickets(v); });
    dbGet('eventos_tipos').then(v => { if (v !== null) setTiposEvento(v); });
    const s1 = dbSub('eventos', v => setEventos(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    const s2 = dbSub('tickets', v => setTickets(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    const s3 = dbSub('eventos_tipos', v => setTiposEvento(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    return () => { s1.unsubscribe(); s2.unsubscribe(); s3.unsubscribe(); };
  }, []);

  // ── Responsive columns ────────────────────────────────────────────────────────
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  const cols = winWidth >= 1200 ? 4 : winWidth >= 880 ? 3 : winWidth >= 580 ? 2 : 1;

  const [bloques, setBloques] = useState(() => {
    try { return JSON.parse(localStorage.getItem('analiticas_bloques') || 'null') || BLOQUES_DEFAULT; } catch { return BLOQUES_DEFAULT; }
  });
  const [editando, setEditando] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerCat, setPickerCat] = useState('todos');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // ── Computed data ────────────────────────────────────────────────────────────
  const totalRegistros   = eventos.reduce((s, e) => s + (Number(e.registrosActuales) || 0), 0);
  const metaTotal        = eventos.reduce((s, e) => s + (Number(e.registrosMeta)      || 0), 0);
  const totalPresupuesto = eventos.reduce((s, e) => s + (Number(e.presupuestoTotal)   || 0), 0);
  const totalGastado     = eventos.reduce((s, e) => s + (Number(e.presupuestoGastado) || 0), 0);
  const totalVip         = eventos.reduce((s, e) => s + (Number(e.vipVendidas)        || 0), 0);

  const pctRegistros        = metaTotal > 0 ? Math.round(totalRegistros / metaTotal * 100) : 0;
  const registrosFaltantes  = Math.max(0, metaTotal - totalRegistros);
  const costoPromedio       = totalRegistros > 0 ? Math.round(totalGastado / totalRegistros) : 0;
  const presupuestoRestante = Math.max(0, totalPresupuesto - totalGastado);
  const pctPresupuesto      = totalPresupuesto > 0 ? Math.round(totalGastado / totalPresupuesto * 100) : 0;

  const conCosto = eventos
    .filter(e => (Number(e.registrosActuales) || 0) > 0 && (Number(e.presupuestoGastado) || 0) > 0)
    .map(e => ({ ...e, costoReg: Math.round(e.presupuestoGastado / e.registrosActuales) }));

  const activos        = eventos.filter(e => e.estado === 'activo');
  const mejorCostoEv   = conCosto.length > 0 ? conCosto.reduce((a, b) => a.costoReg < b.costoReg ? a : b) : null;
  const mayorCostoEv   = conCosto.length > 0 ? conCosto.reduce((a, b) => a.costoReg > b.costoReg ? a : b) : null;
  const masRegistrosEv = eventos.length > 0 ? [...eventos].sort((a, b) => (b.registrosActuales || 0) - (a.registrosActuales || 0))[0] : null;

  const conCostoActivos = activos
    .filter(e => (Number(e.registrosActuales) || 0) > 0 && (Number(e.presupuestoGastado) || 0) > 0)
    .map(e => ({ ...e, costoReg: Math.round(e.presupuestoGastado / e.registrosActuales) }));
  const mejorCostoActivo  = conCostoActivos.length > 0 ? conCostoActivos.reduce((a, b) => a.costoReg < b.costoReg ? a : b) : null;
  const masRegistrosActivo = activos.length > 0 ? [...activos].sort((a, b) => (b.registrosActuales || 0) - (a.registrosActuales || 0))[0] : null;
  const menosRegistrosEv = activos.length > 0 ? [...activos].sort((a, b) => (a.registrosActuales || 0) - (b.registrosActuales || 0))[0] : null;

  const promedioReg = activos.length > 0 ? Math.round(activos.reduce((s, e) => s + (e.registrosActuales || 0), 0) / activos.length) : 0;
  const vipPromedio = eventos.length > 0 ? Math.round(totalVip / eventos.length) : 0;

  const estadoCounts = {
    activo:      activos.length,
    planificado: eventos.filter(e => e.estado === 'planificado').length,
    completado:  eventos.filter(e => e.estado === 'completado').length,
    cancelado:   eventos.filter(e => e.estado === 'cancelado').length,
  };
  const maxEstado = Math.max(...Object.values(estadoCounts), 1);

  const tipoCounts = {};
  eventos.forEach(e => { if (e.tipo) tipoCounts[e.tipo] = (tipoCounts[e.tipo] || 0) + 1; });
  const maxTipo = Math.max(...Object.values(tipoCounts), 1);

  const ticketsAbiertos  = tickets.filter(t => t.columna !== 'completado').length;
  const ticketsUrgentes  = tickets.filter(t => t.prioridad === 'alta').length;
  const ticketsResueltos = tickets.filter(t => t.columna === 'completado').length;
  const ticketsPorPanel  = {};
  tickets.filter(t => t.columna !== 'completado').forEach(t => {
    ticketsPorPanel[t.columna] = (ticketsPorPanel[t.columna] || 0) + 1;
  });
  const panelEntry = Object.entries(ticketsPorPanel).sort((a, b) => b[1] - a[1])[0];
  const PANEL_LABELS = { backlog: 'Backlog', progreso: 'En Progreso', revision: 'En Revisión' };

  const topReg   = [...eventos].sort((a, b) => (b.registrosActuales || 0) - (a.registrosActuales || 0)).slice(0, 8);
  const topCosto = [...conCosto].sort((a, b) => a.costoReg - b.costoReg).slice(0, 8);
  const maxTopReg   = topReg.length > 0 ? (topReg[0].registrosActuales || 1) : 1;
  const maxTopCosto = topCosto.length > 0 ? (topCosto[topCosto.length - 1].costoReg || 1) : 1;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function saveBloques(next) { setBloques(next); localStorage.setItem('analiticas_bloques', JSON.stringify(next)); }
  function agregarBloque(tipo) { saveBloques([...bloques, { id: Date.now(), tipo, colSpan: 1 }]); setShowPicker(false); }
  function eliminarBloque(id) { saveBloques(bloques.filter(b => b.id !== id)); }
  function cambiarSpan(id, span) { saveBloques(bloques.map(b => b.id === id ? { ...b, colSpan: span } : b)); }
  function restablecer() { saveBloques(BLOQUES_DEFAULT); }

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

  const fmtN   = n => Number(n || 0).toLocaleString('es-MX');
  const fmtMXN = n => `$${fmtN(n)}`;
  const pctColor = p => p >= 90 ? '#4ade80' : p >= 60 ? '#facc15' : '#ef4444';

  // ── Block content renderer ────────────────────────────────────────────────────
  function stat(icon, label, value, sub, valueColor = '#111827') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>{icon}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: valueColor, lineHeight: 1.1, letterSpacing: -0.5 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{sub}</div>}
      </div>
    );
  }

  function renderContenido(b) {
    const ESTADO_CFG = {
      activo:      { color: '#e53e3e', label: 'Activo' },
      planificado: { color: '#4a9eff', label: 'Planificado' },
      completado:  { color: '#4ade80', label: 'Completado' },
      cancelado:   { color: '#9ca3af', label: 'Cancelado' },
    };

    const sectionHeader = (icon, label) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ color: '#9ca3af' }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
      </div>
    );

    switch (b.tipo) {
      // ── Registros ──────────────────────────────────────────────────────────
      case 'registros_totales':
        return stat(<IcoUsers />, 'Registros Totales', fmtN(totalRegistros), `Meta: ${fmtN(metaTotal)}`);
      case 'meta_registros':
        return stat(<IcoHash />, 'Meta de Registros', fmtN(metaTotal), 'registros objetivo');
      case 'pct_registros':
        return stat(<IcoPct />, '% Registros Logrados', `${pctRegistros}%`, `${fmtN(totalRegistros)} / ${fmtN(metaTotal)}`, pctColor(pctRegistros));
      case 'registros_faltantes':
        return stat(<IcoHash />, 'Registros Faltantes', fmtN(registrosFaltantes), 'para cumplir meta global', '#f59e0b');
      case 'evento_mas_reg':
        return (
          <div>
            {sectionHeader(<IcoUp />, 'Evento con Más Registros')}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{masRegistrosEv?.nombre || '—'}</div>
            {masRegistrosEv && <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 700, marginTop: 6 }}>{fmtN(masRegistrosEv.registrosActuales)} registros</div>}
          </div>
        );
      case 'evento_menos_reg':
        return (
          <div>
            {sectionHeader(<IcoDown />, 'Evento con Menos Registros')}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{menosRegistrosEv?.nombre || '—'}</div>
            {menosRegistrosEv && <div style={{ fontSize: 14, color: '#f59e0b', fontWeight: 700, marginTop: 6 }}>{fmtN(menosRegistrosEv.registrosActuales)} registros</div>}
          </div>
        );
      case 'promedio_reg':
        return stat(<IcoBar />, 'Promedio Registros/Evento', fmtN(promedioReg), `${activos.length} eventos activos`);

      // ── Presupuesto ────────────────────────────────────────────────────────
      case 'presupuesto_total':
        return stat(<IcoDollar />, 'Presupuesto Total', fmtMXN(totalPresupuesto), 'presupuesto total');
      case 'costo_promedio':
        return stat(<IcoTarget />, 'Costo Promedio/Registro', fmtMXN(costoPromedio), `${fmtN(totalRegistros)} registros`, '#4ade80');
      case 'total_gastado':
        return stat(<IcoDollar />, 'Total Gastado', fmtMXN(totalGastado), 'MXN gastado total');
      case 'presupuesto_restante':
        return stat(<IcoDollar />, 'Presupuesto Restante', fmtMXN(presupuestoRestante), 'disponible', '#4ade80');
      case 'pct_presupuesto':
        return stat(<IcoPct />, '% Presupuesto Usado', `${pctPresupuesto}%`, 'del presupuesto total', pctColor(pctPresupuesto));
      case 'mejor_costo_reg':
        return (
          <div>
            {sectionHeader(<IcoDown />, 'Mejor Costo/Registro')}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{mejorCostoEv?.nombre || '—'}</div>
            {mejorCostoEv && <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 700, marginTop: 6 }}>{fmtMXN(mejorCostoEv.costoReg)} / registro</div>}
          </div>
        );
      case 'mayor_costo_reg':
        return (
          <div>
            {sectionHeader(<IcoUp />, 'Mayor Costo/Registro')}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{mayorCostoEv?.nombre || '—'}</div>
            {mayorCostoEv && <div style={{ fontSize: 14, color: '#ef4444', fontWeight: 700, marginTop: 6 }}>{fmtMXN(mayorCostoEv.costoReg)} / registro</div>}
          </div>
        );

      // ── Eventos ────────────────────────────────────────────────────────────
      case 'total_eventos':
        return stat(<IcoCal />, 'Total de Eventos', fmtN(eventos.length), 'eventos registrados');
      case 'eventos_activos':
        return stat(<IcoBolt />, 'Eventos Activos', fmtN(estadoCounts.activo), 'con estado activo', '#e53e3e');
      case 'eventos_planificados':
        return stat(<IcoClock />, 'Eventos Planificados', fmtN(estadoCounts.planificado), 'por iniciar', '#4a9eff');
      case 'eventos_completados':
        return stat(<IcoBar />, 'Eventos Completados', fmtN(estadoCounts.completado), 'finalizados', '#4ade80');
      case 'vip_vendidos':
        return stat(<IcoCrown />, 'VIP Vendidos', fmtN(totalVip), `en ${eventos.filter(e => (e.vipVendidas || 0) > 0).length} eventos`);
      case 'vip_promedio':
        return stat(<IcoCrown />, 'VIP Promedio/Evento', fmtN(vipPromedio), 'promedio por evento');
      case 'eventos_presenciales':
        return stat(<IcoCal />, 'Eventos Presenciales', fmtN(eventos.filter(e => e.tipo === 'presencial').length), 'eventos presenciales');
      case 'eventos_digitales':
        return stat(<IcoCal />, 'Eventos Digitales', fmtN(eventos.filter(e => e.tipo === 'digital').length), 'eventos digitales');

      // ── Tickets ────────────────────────────────────────────────────────────
      case 'tickets_abiertos':
        return stat(<IcoTicket />, 'Tickets Abiertos', fmtN(ticketsAbiertos), 'abiertos o en progreso');
      case 'tickets_urgentes':
        return stat(<IcoAlert />, 'Tickets Urgentes', fmtN(ticketsUrgentes), 'prioridad alta', '#ef4444');
      case 'tickets_resueltos':
        return stat(<IcoBar />, 'Tickets Resueltos', fmtN(ticketsResueltos), 'completados', '#4ade80');
      case 'panel_mas_tickets':
        return (
          <div>
            {sectionHeader(<IcoGrid />, 'Panel con Más Tickets')}
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{panelEntry ? (PANEL_LABELS[panelEntry[0]] || panelEntry[0]) : '—'}</div>
            {panelEntry && <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, marginTop: 6 }}>{panelEntry[1]} tickets abiertos</div>}
          </div>
        );

      // ── Gráficas ───────────────────────────────────────────────────────────
      case 'por_estado': {
        const estados = [
          { key: 'activo',      color: '#e53e3e', label: 'Activo'      },
          { key: 'planificado', color: '#4a9eff', label: 'Planificado' },
          { key: 'completado',  color: '#4ade80', label: 'Completado'  },
          { key: 'cancelado',   color: '#9ca3af', label: 'Cancelado'   },
        ];
        return (
          <div>
            {sectionHeader(<IcoClock />, 'Por Estado')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {estados.map(e => (
                <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151', minWidth: 90 }}>{e.label}</span>
                  <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                    {estadoCounts[e.key] > 0 && <div style={{ height: '100%', width: `${estadoCounts[e.key] / maxEstado * 100}%`, background: e.color, borderRadius: 99 }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', minWidth: 20, textAlign: 'right' }}>{estadoCounts[e.key]}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'por_tipo': {
        const tiposConConteo = tiposEvento.map(t => ({ ...t, count: tipoCounts[t.id] || 0 }));
        const maxT = Math.max(...tiposConConteo.map(t => t.count), 1);
        return (
          <div>
            {sectionHeader(<IcoBar />, 'Por Tipo')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tiposConConteo.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#374151', minWidth: 90 }}>{t.label}</span>
                  <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                    {t.count > 0 && <div style={{ height: '100%', width: `${t.count / maxT * 100}%`, background: t.color || '#e53e3e', borderRadius: 99 }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', minWidth: 20, textAlign: 'right' }}>{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'destacados':
        return (
          <div>
            {sectionHeader(<IcoBolt />, 'Destacados')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: '#4ade80' }}><IcoDown /></span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mejor Costo/Registro</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{mejorCostoActivo?.nombre || '—'}</div>
                {mejorCostoActivo && <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, marginTop: 2 }}>{fmtMXN(mejorCostoActivo.costoReg)} / registro</div>}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: '#f59e0b' }}><IcoUp /></span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Más Registros</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{masRegistrosActivo?.nombre || '—'}</div>
                {masRegistrosActivo && <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>{fmtN(masRegistrosActivo.registrosActuales)} registros</div>}
              </div>
            </div>
          </div>
        );

      case 'ranking_registros':
        return (
          <div>
            {sectionHeader(<IcoBar />, 'Ranking de Registros')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topReg.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>Sin datos</div>}
              {topReg.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', width: 16, textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nombre}</div>
                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', marginTop: 3 }}>
                      <div style={{ height: '100%', width: `${(e.registrosActuales || 0) / maxTopReg * 100}%`, background: '#e53e3e', borderRadius: 99 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', minWidth: 46, textAlign: 'right' }}>{fmtN(e.registrosActuales)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ranking_costo_reg':
        return (
          <div>
            {sectionHeader(<IcoTarget />, 'Ranking Costo/Registro')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topCosto.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>Sin datos</div>}
              {topCosto.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', width: 16, textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nombre}</div>
                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', marginTop: 3 }}>
                      <div style={{ height: '100%', width: `${e.costoReg / maxTopCosto * 100}%`, background: '#4ade80', borderRadius: 99 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', minWidth: 60, textAlign: 'right' }}>{fmtMXN(e.costoReg)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'avance_registros':
        return (
          <div>
            {sectionHeader(<IcoList />, 'Avance de Registros')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eventos.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>Sin eventos</div>}
              {eventos.map(e => {
                const pct = (e.registrosMeta || 0) > 0 ? Math.min(100, Math.round((e.registrosActuales || 0) / e.registrosMeta * 100)) : 0;
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{e.nombre}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pctColor(pct) }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pctColor(pct), borderRadius: 99 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 52, textAlign: 'right' }}>{fmtN(e.registrosActuales)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'uso_presupuesto':
        return (
          <div>
            {sectionHeader(<IcoDollar />, 'Uso de Presupuesto')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eventos.filter(e => (e.presupuestoTotal || 0) > 0).length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>Sin datos de presupuesto</div>}
              {eventos.filter(e => (e.presupuestoTotal || 0) > 0).map(e => {
                const pct = Math.min(100, Math.round((e.presupuestoGastado || 0) / e.presupuestoTotal * 100));
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{e.nombre}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pctColor(pct) }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pctColor(pct), borderRadius: 99 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 52, textAlign: 'right' }}>{fmtMXN(e.presupuestoGastado)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'comparativa': {
        const sorted = [...eventos].sort((a, b) => (b.registrosActuales || 0) - (a.registrosActuales || 0));
        const thStyle = { textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f0f5', whiteSpace: 'nowrap' };
        const tdStyle = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f9fafb', verticalAlign: 'middle' };

        function costoColor(costo, region) {
          if (!costo) return '#9ca3af';
          const isUSA = region === 'USA' || region === 'CAN';
          if (isUSA) {
            if (costo <= 90) return '#4ade80';
            if (costo <= 95) return '#fb923c';
            return '#ef4444';
          } else {
            if (costo <= 30) return '#4ade80';
            if (costo <= 60) return '#fb923c';
            return '#ef4444';
          }
        }

        function diasRestantes(e) {
          if (!e.fecha) return null;
          const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
          const fecha = new Date(e.fecha + 'T00:00:00');
          return Math.round((fecha - hoy) / 86400000);
        }
        function diasColor(dias) {
          if (dias > 14) return '#4ade80';
          if (dias > 7)  return '#facc15';
          if (dias > 3)  return '#fb923c';
          return '#ef4444';
        }
        function diasLabel(e) {
          if (e.estado === 'completado' || e.estado === 'cancelado') return null;
          const d = diasRestantes(e);
          if (d === null) return null;
          if (d < 0)  return { text: 'Pasado', color: '#9ca3af' };
          if (d === 0) return { text: 'Hoy', color: '#ef4444' };
          if (d === 1) return { text: '1 día', color: diasColor(d) };
          return { text: `${d}d`, color: diasColor(d) };
        }

        return (
          <div>
            {sectionHeader(<IcoTable />, 'Comparativa General')}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Evento</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Días</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Registros</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Meta</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>% Logrado</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Gastado</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Costo/Reg</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>VIP</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af' }}>Sin eventos</td></tr>
                  )}
                  {sorted.map(e => {
                    const pct = (e.registrosMeta || 0) > 0 ? Math.round((e.registrosActuales || 0) / e.registrosMeta * 100) : 0;
                    const costoR = (e.registrosActuales || 0) > 0 && (e.presupuestoGastado || 0) > 0
                      ? Math.round(e.presupuestoGastado / e.registrosActuales) : null;
                    const dotColor = ESTADO_CFG[e.estado]?.color || '#9ca3af';
                    const dias = diasLabel(e);
                    const esTerminado = e.estado === 'completado' || e.estado === 'cancelado';
                    return (
                      <tr key={e.id}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                            <span style={{ fontWeight: 500, color: '#111827' }}>{e.nombre}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {esTerminado
                            ? <span title={e.estado === 'completado' ? 'Completado' : 'Cancelado'} style={{ fontSize: 15 }}>{e.estado === 'completado' ? '✅' : '🚫'}</span>
                            : dias
                              ? <span style={{ fontSize: 12, fontWeight: 700, color: dias.color, background: dias.color + '18', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{dias.text}</span>
                              : <span style={{ color: '#d1d5db' }}>—</span>
                          }
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fmtN(e.registrosActuales)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#374151' }}>{fmtN(e.registrosMeta)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pctColor(pct) }}>{pct}%</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#374151' }}>{(e.presupuestoGastado || 0) > 0 ? fmtMXN(e.presupuestoGastado) : '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: costoR ? costoColor(costoR, e.region) : '#9ca3af' }}>{costoR ? fmtMXN(costoR) : '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#374151' }}>{e.vipVendidas || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      default:
        return <div style={{ color: '#9ca3af', fontSize: 13 }}>Bloque no disponible</div>;
    }
  }

  // ── Picker filter ─────────────────────────────────────────────────────────────
  const bloquesFiltrados = CATALOGO.filter(b =>
    (pickerCat === 'todos' || b.cat === pickerCat) &&
    (!pickerQuery || b.nombre.toLowerCase().includes(pickerQuery.toLowerCase()) || b.desc.toLowerCase().includes(pickerQuery.toLowerCase()))
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f5f6fa', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: winWidth < 600 ? '14px 16px 12px' : '20px 28px 16px', background: '#fff', borderBottom: '1px solid #e8e8ee', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Analíticas de Eventos</h1>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{eventos.length} eventos · {bloques.length} bloques activos</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editando && (
            <button onClick={restablecer}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9ca3af', padding: '7px 10px', borderRadius: 8 }}>
              Restablecer
            </button>
          )}
          <button onClick={() => { setEditando(!editando); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: editando ? '#111827' : '#fff', color: editando ? '#fff' : '#374151', border: `1px solid ${editando ? '#111827' : '#e8e8ee'}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {editando ? 'Listo' : 'Editar'}
          </button>
          <button onClick={() => { setShowPicker(true); setPickerQuery(''); setPickerCat('todos'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: winWidth < 600 ? '16px' : '24px 28px' }}>
        {bloques.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Sin bloques</div>
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
                  background: '#fff',
                  borderRadius: 16,
                  padding: '22px 24px',
                  border: `1.5px solid ${dragOverId === b.id ? '#e53e3e' : '#f0f0f5'}`,
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  position: 'relative',
                  opacity: draggingId === b.id ? 0.45 : 1,
                  cursor: editando ? 'grab' : 'default',
                  transition: 'border-color 0.15s',
                }}>

                {/* Edit toolbar */}
                {editando && (
                  <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: '#fff', border: '1px solid #e8e8ee', borderRadius: 20, padding: '4px 8px', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#9ca3af', fontSize: 12, padding: '0 3px', cursor: 'grab' }}>⠿</span>
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} onClick={() => cambiarSpan(b.id, n)}
                        style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: b.colSpan === n ? '#e53e3e' : 'transparent', color: b.colSpan === n ? '#fff' : '#374151', lineHeight: 1 }}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => eliminarBloque(b.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: '0 3px', marginLeft: 2 }}>
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

      {/* Block picker modal */}
      {showPicker && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Modal header */}
            <div style={{ padding: '22px 24px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Agregar Bloque de Datos</span>
                <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
              </div>

              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', border: '2px solid #e53e3e', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder="Buscar bloques..."
                  autoFocus style={{ background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#111827', flex: 1 }} />
              </div>

              {/* Category tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATS.map(c => (
                  <button key={c.id} onClick={() => setPickerCat(c.id)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: pickerCat === c.id ? 700 : 500, background: pickerCat === c.id ? '#111827' : 'transparent', color: pickerCat === c.id ? '#fff' : '#6b7280' }}>
                    {c.label} ({c.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Block list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
              {bloquesFiltrados.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
              )}
              {bloquesFiltrados.map(item => (
                <div key={item.tipo}
                  onClick={() => agregarBloque(item.tipo)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 12px', borderRadius: 12, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.querySelector('.add-btn').style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.add-btn').style.opacity = '0'; }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}>
                    {iconForTipo(item.tipo)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.nombre}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{item.desc}</div>
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
