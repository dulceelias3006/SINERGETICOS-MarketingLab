import { useState, useEffect, useRef } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const FORM_INIT = { nombre: '', puesto: '', email: '', telefono: '', departamento: '', cumpleanos: '', fechaIngreso: '' };

const AVATAR_COLORS = [
  '#1c1c2a','#374151','#6b7280','#9ca3af',
  '#e53e3e','#dd6b20','#d69e2e','#38a169',
  '#2b6cb0','#4299e1','#6b46c1','#d53f8c',
  '#2c7a7b','#1a365d','#744210','#276749',
];

const EMOJIS = [
  // Caras
  '😀','😄','😎','🤓','🥳','🤩','😇','🥸','🤠','😏','🧐','🤗','😈','🤑','🥹','😍','🤪','😜','🧏','🫡',
  // Animales
  '🦁','🐯','🦊','🐺','🦅','🐧','🦋','🐝','🦄','🐸','🐼','🐨','🦝','🦜','🦩','🦒','🐙','🦈','🐬','🦭',
  '🐻','🐮','🐷','🐔','🐱','🐶','🐭','🐹','🐰','🦔','🦦','🦥','🐿️','🪲','🦎','🐊','🦕','🦖','🦓',
  '🐘','🦏','🦛','🐆','🐅','🐃','🦬','🐎','🦌','🐖','🐏','🐑','🦙','🐓','🦃','🦤','🦚','🦡','🦫','🐇',
  // Vestimenta / accesorios
  '👒','🎩','🧢','💍','👗','👘','🥻','👙','🩱','👚','👕','👖','🩲','🩳','🧣','🧤','🧥','🥼','👔',
  '👠','👡','👢','🥾','👟','👞','🩴','🧦','👛','👜','🎒','🧳','🕶️','👓','🥽','⌚','💄',
  // Trabajo / tech
  '🧑‍💻','👩‍💻','👨‍💻','👩‍🎨','👨‍🎨','👩‍🏫','👨‍🏫','👩‍💼','👨‍💼','👩‍🔬','👨‍🔬','🧑‍🚀','👩‍🍳','👨‍🍳','👩‍🎤','👨‍🎤',
  '💼','📊','📈','💻','🖥️','📱','🔧','🎨','📸','📢','✍️','📝','🚀','💡','🎯','⭐','🔥','👑','🏆','💎',
];

const ESTADOS = [
  { key: 'asistio',      label: 'Asistió',             color: '#4ade80', emoji: ''   },
  { key: 'retardo',      label: 'Retardo',             color: '#facc15', emoji: ''   },
  { key: 'falta',        label: 'Falta',               color: '#ef4444', emoji: ''   },
  { key: 'vacaciones',   label: 'Vacaciones',          color: '#67e8f9', emoji: '🌴' },
  { key: 'enfermedad',   label: 'Enfermedad',          color: '#fde68a', emoji: '😷' },
  { key: 'homeoffice',   label: 'Home Office',         color: '#94a3b8', emoji: '💻' },
  { key: 'falta_just',   label: 'Falta Justificada',   color: '#a855f7', emoji: ''   },
  { key: 'retardo_just', label: 'Retardo Justificado', color: '#fb923c', emoji: ''   },
  { key: 'feriado',      label: 'Feriado',             color: '#e879f9', emoji: ''   },
];

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['', 'L', 'M', 'X', 'J', 'V'];

function getFeriadosMexico(year) {
  function nthMonday(month, n) {
    const d = new Date(year, month, 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + (n - 1) * 7);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const pad = m => String(m).padStart(2, '0');
  return {
    [`${year}-01-01`]: 'Año Nuevo',
    [nthMonday(1, 1)]:  'Día de la Constitución',
    [nthMonday(2, 3)]:  'Natalicio de Benito Juárez',
    [`${year}-05-01`]: 'Día del Trabajo',
    [`${year}-09-16`]: 'Día de la Independencia',
    [nthMonday(10, 3)]: 'Día de la Revolución',
    [`${year}-12-25`]: 'Navidad',
  };
}

function getWeekdays(year, month) {
  const days = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push({
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        day: d.getDate(),
        dow,
        isMonday: dow === 1,
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getIniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0] || '').join('').toUpperCase();
}

function renderAvatar(m, size = 44) {
  const radius = size <= 44 ? 12 : 10;
  const base = { width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (m.avatarType === 'photo' && m.avatarPhoto)
    return <div style={base}><img src={m.avatarPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (m.avatarType === 'emoji' && m.avatarEmoji)
    return <div style={{ ...base, background: m.avatarBg || '#1c1c2a', fontSize: size * 0.5 }}>{m.avatarEmoji}</div>;
  return <div style={{ ...base, background: m.avatarBg || '#1c1c2a', color: '#fff', fontWeight: 700, fontSize: size * 0.32, letterSpacing: 0.5 }}>{getIniciales(m.nombre)}</div>;
}

function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function PencilIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function diasLFT(años) {
  if (años < 1) return 0;
  if (años <= 5) return 10 + años * 2;
  return 20 + Math.floor((años - 1) / 5) * 2;
}

function calcVacaciones(fechaIngreso, asistencia, memberId) {
  if (!fechaIngreso) return null;
  const ingreso = new Date(fechaIngreso + 'T12:00:00');
  const hoy = new Date();

  let ultimoAniv = new Date(ingreso);
  ultimoAniv.setFullYear(hoy.getFullYear());
  if (ultimoAniv > hoy) ultimoAniv.setFullYear(hoy.getFullYear() - 1);

  const añosCumplidos = ultimoAniv.getFullYear() - ingreso.getFullYear();

  const proximoAniv = new Date(ultimoAniv);
  proximoAniv.setFullYear(ultimoAniv.getFullYear() + 1);

  const diasCorresponden = diasLFT(añosCumplidos);

  const registros = asistencia[String(memberId)] || {};
  let usados = 0;
  for (const [fecha, entry] of Object.entries(registros)) {
    if (entry?.status === 'vacaciones') {
      const d = new Date(fecha + 'T12:00:00');
      if (d >= ultimoAniv && d < proximoAniv) usados++;
    }
  }

  return { añosCumplidos, diasCorresponden, usados, disponibles: Math.max(0, diasCorresponden - usados), desde: ultimoAniv, hasta: proximoAniv };
}

function fmtFecha(d) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EQUIPO_DEFAULT = [
  { id: 1,  nombre: 'David Jose Iriza Petit',              puesto: 'Director de Marketing',                           departamento: 'Marketing',              email: 'diriza@zigma3.com',    telefono: '7771868027', cumpleanos: '1993-06-29', avatarType: 'emoji', avatarBg: '#7c3aed', avatarEmoji: '🤠', avatarPhoto: '', enAsistencia: false },
  { id: 2,  nombre: 'Saúl David Moreno Martinez',          puesto: 'Director de Edición',                             departamento: 'Marketing – Edición',    email: 'saulmm@zigma3.com',    telefono: '3313972845', cumpleanos: '2002-04-30', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: false },
  { id: 3,  nombre: 'Dulce Lucero Elias Alvarez',          puesto: 'Asistente de Dirección',                          departamento: 'Marketing',              email: 'diriza@zigma3.com',    telefono: '3322580258', cumpleanos: '2001-06-30', avatarType: 'emoji', avatarBg: '#db2777', avatarEmoji: '😇', avatarPhoto: '', enAsistencia: false },
  { id: 4,  nombre: 'Cintia Daniela Robles Pérez',         puesto: 'Proyect Manager',                                 departamento: 'Marketing',              email: 'crobles@zigma3.com',   telefono: '3334610893', cumpleanos: '1999-01-06', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 5,  nombre: 'Jorge Daniel Cano Urrutia',           puesto: 'Líder de Funnels',                                departamento: 'Marketing',              email: 'ycano@zigma3.com',     telefono: '5519472571', cumpleanos: '2003-04-09', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 6,  nombre: 'Juan Luis Mares Alvarado',            puesto: 'Lider de Programación',                           departamento: 'Marketing – Programación', email: 'jmares@zigma3.com', telefono: '3314370136', cumpleanos: '1996-01-02', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 7,  nombre: 'Angela Fernanada Bautista Morales',   puesto: 'Diseñadora Gráfica',                              departamento: 'Marketing – Diseño',     email: 'fbautista@zigma3.com', telefono: '6692166216', cumpleanos: '2001-02-16', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 8,  nombre: 'Itzia Monserrat Renteria Mendoza',    puesto: 'Community manager – Soporte de Programación',     departamento: 'Marketing – Programación', email: 'irenteria@zigma3.com', telefono: '3322585991', cumpleanos: '2000-07-27', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 9,  nombre: 'Guillermo García Sainz',              puesto: 'Programador Jr.',                                 departamento: 'Marketing – Programación', email: 'mgarcia@zigma3.com',  telefono: '3319025255', cumpleanos: '2003-06-20', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 10, nombre: 'Jorge Alberto Cardozo Zaragoza',      puesto: 'Diseñador Gráfico',                               departamento: 'Marketing – Diseño',     email: 'jzaragoza@zigma3.com', telefono: '4433321834', cumpleanos: '1998-05-24', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 11, nombre: 'Ernesto Alexander Larios Vázquez',    puesto: 'Control y Verificación de Errores',               departamento: 'Marketing',              email: 'elarios@zigma3.com',   telefono: '3331480844', cumpleanos: '2001-03-24', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
  { id: 12, nombre: 'Jesús Alejandro Dávalos Raygoza',     puesto: 'Editor',                                          departamento: 'Marketing – Edición',    email: 'jraygoza@zigma3.com',  telefono: '3310725543', cumpleanos: '',           avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: false },
  { id: 13, nombre: 'Matías Ezequiel Villafañe',           puesto: 'Editor',                                          departamento: 'Marketing – Edición',    email: 'mvillafane@zigma3.com', telefono: '3325964705', cumpleanos: '1999-12-14', avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '', enAsistencia: true },
];

export default function Equipo() {
  const { can } = useAuth();
  const [equipo, setEquipo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('equipo') || 'null') || EQUIPO_DEFAULT; } catch { return EQUIPO_DEFAULT; }
  });
  const [asistencia, setAsistencia] = useState(() => {
    try { return JSON.parse(localStorage.getItem('equipo_asistencia') || '{}'); } catch { return {}; }
  });
  const [estadoColores, setEstadoColores] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('equipo_estado_colores') || 'null');
      if (saved) return saved;
    } catch {}
    return Object.fromEntries(ESTADOS.map(e => [e.key, e.color]));
  });
  const [tab, setTab] = useState('miembros');
  const [nameColWidth, setNameColWidth] = useState(140);
  const resizingRef = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [openCell, setOpenCell] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [customEstados, setCustomEstados] = useState(() => {
    try { return JSON.parse(localStorage.getItem('equipo_estados_custom') || '[]'); } catch { return []; }
  });
  const [estadosConfig, setEstadosConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('equipo_estados_config') || '{}'); } catch { return {}; }
  });
  const [showNewEstado, setShowNewEstado] = useState(false);
  const [newEstadoForm, setNewEstadoForm] = useState({ label: '', color: '#94a3b8', emoji: '' });
  const [editandoEstadoKey, setEditandoEstadoKey] = useState(null);
  const [editFormEstado, setEditFormEstado] = useState({ label: '', emoji: '', color: '#94a3b8' });
  const [editingAlias, setEditingAlias] = useState(null);
  const [aliasInput, setAliasInput] = useState('');
  const [feriadoTooltip, setFeriadoTooltip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [expandido, setExpandido] = useState(null);
  const [focusDept, setFocusDept] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [hoverAvatar, setHoverAvatar] = useState(null);
  const [avatarEditorId, setAvatarEditorId] = useState(null);
  const [avatarTab, setAvatarTab] = useState('color');
  const [avatarDraft, setAvatarDraft] = useState({ type: 'initials', bg: '#1c1c2a', emoji: '', photo: '' });
  const fileRef = useRef();
  const canSync = useRef(false);
  const fbEq = useRef(false); const fbAs = useRef(false); const fbEc = useRef(false); const fbCe = useRef(false); const fbCfg = useRef(false);

  useEffect(() => { if (fbEq.current) { fbEq.current = false; return; } localStorage.setItem('equipo', JSON.stringify(equipo)); if (canSync.current) dbSet('equipo', equipo); }, [equipo]);
  useEffect(() => { if (fbAs.current) { fbAs.current = false; return; } localStorage.setItem('equipo_asistencia', JSON.stringify(asistencia)); if (canSync.current) dbSet('equipo_asistencia', asistencia); }, [asistencia]);
  useEffect(() => { if (fbEc.current) { fbEc.current = false; return; } localStorage.setItem('equipo_estado_colores', JSON.stringify(estadoColores)); if (canSync.current) dbSet('equipo_estado_colores', estadoColores); }, [estadoColores]);
  useEffect(() => { if (fbCe.current) { fbCe.current = false; return; } localStorage.setItem('equipo_estados_custom', JSON.stringify(customEstados)); if (canSync.current) dbSet('equipo_estados_custom', customEstados); }, [customEstados]);
  useEffect(() => { if (fbCfg.current) { fbCfg.current = false; return; } localStorage.setItem('equipo_estados_config', JSON.stringify(estadosConfig)); if (canSync.current) dbSet('equipo_estados_config', estadosConfig); }, [estadosConfig]);

  useEffect(() => {
    Promise.all([dbGet('equipo'), dbGet('equipo_asistencia'), dbGet('equipo_estado_colores'), dbGet('equipo_estados_custom'), dbGet('equipo_estados_config')]).then(([eq, as, ec, ce, cfg]) => {
      canSync.current = true;
      const gl = k => { try { return JSON.parse(localStorage.getItem(k)||'null'); } catch { return null; } };
      if (eq !== null) { fbEq.current = true; setEquipo(eq); } else { const v = gl('equipo'); if (v?.length) dbSet('equipo', v); }
      if (as !== null) { fbAs.current = true; setAsistencia(as); } else { const v = gl('equipo_asistencia'); if (v) dbSet('equipo_asistencia', v); }
      if (ec !== null) { fbEc.current = true; setEstadoColores(ec); } else { const v = gl('equipo_estado_colores'); if (v) dbSet('equipo_estado_colores', v); }
      if (ce !== null) { fbCe.current = true; setCustomEstados(ce); } else { const v = gl('equipo_estados_custom'); if (v?.length) dbSet('equipo_estados_custom', v); }
      if (cfg !== null) { fbCfg.current = true; setEstadosConfig(cfg); } else { const v = gl('equipo_estados_config'); if (v) dbSet('equipo_estados_config', v); }
    });
    const s1 = dbSub('equipo', v => { fbEq.current = true; setEquipo(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    const s2 = dbSub('equipo_asistencia', v => { fbAs.current = true; setAsistencia(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    const s3 = dbSub('equipo_estado_colores', v => { fbEc.current = true; setEstadoColores(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    const s4 = dbSub('equipo_estados_custom', v => { fbCe.current = true; setCustomEstados(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    const s5 = dbSub('equipo_estados_config', v => { fbCfg.current = true; setEstadosConfig(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    return () => { s1.unsubscribe(); s2.unsubscribe(); s3.unsubscribe(); s4.unsubscribe(); s5.unsubscribe(); };
  }, []);

  const todosEstados = [
    ...ESTADOS
      .filter(e => !estadosConfig[e.key]?.hidden)
      .map(e => ({ ...e, label: estadosConfig[e.key]?.label ?? e.label, emoji: estadosConfig[e.key]?.emoji ?? e.emoji })),
    ...customEstados,
  ];
  const weekdays = getWeekdays(viewDate.year, viewDate.month);
  const feriadosMexico = getFeriadosMexico(viewDate.year);

  const vacacionesMap = {};
  equipo.filter(m => m.enAsistencia !== false).forEach(m => {
    const vac = calcVacaciones(m.fechaIngreso, asistencia, m.id);
    if (!vac || vac.diasCorresponden === 0) return;
    const registros = asistencia[String(m.id)] || {};
    const vacDays = Object.entries(registros)
      .filter(([fecha, ent]) => {
        if (ent?.status !== 'vacaciones') return false;
        const dObj = new Date(fecha + 'T12:00:00');
        return dObj >= vac.desde && dObj < vac.hasta;
      })
      .map(([fecha]) => fecha)
      .sort();
    vacacionesMap[m.id] = { vac, vacDays };
  });

  function agregarEstado() {
    if (!newEstadoForm.label.trim()) return;
    const key = 'custom_' + Date.now();
    setCustomEstados(prev => [...prev, { key, label: newEstadoForm.label.trim(), color: newEstadoForm.color, emoji: newEstadoForm.emoji.trim() }]);
    setEstadoColores(prev => ({ ...prev, [key]: newEstadoForm.color }));
    setNewEstadoForm({ label: '', color: '#94a3b8', emoji: '' });
    setShowNewEstado(false);
  }
  function eliminarEstado(key) {
    setCustomEstados(prev => prev.filter(e => e.key !== key));
    setEstadoColores(prev => { const next = { ...prev }; delete next[key]; return next; });
  }
  function ocultarEstado(key) {
    if (key.startsWith('custom_')) { eliminarEstado(key); return; }
    setEstadosConfig(prev => ({ ...prev, [key]: { ...(prev[key] || {}), hidden: true } }));
  }
  function iniciarEditEstado(e) {
    setEditFormEstado({ label: e.label, emoji: e.emoji || '', color: estadoColores[e.key] || e.color });
    setEditandoEstadoKey(e.key);
  }
  function guardarEditEstado() {
    const key = editandoEstadoKey;
    if (!editFormEstado.label.trim()) return;
    setEstadoColores(prev => ({ ...prev, [key]: editFormEstado.color }));
    if (key.startsWith('custom_')) {
      setCustomEstados(prev => prev.map(e => e.key === key ? { ...e, label: editFormEstado.label.trim(), emoji: editFormEstado.emoji.trim(), color: editFormEstado.color } : e));
    } else {
      setEstadosConfig(prev => ({ ...prev, [key]: { ...(prev[key] || {}), label: editFormEstado.label.trim(), emoji: editFormEstado.emoji.trim() } }));
    }
    setEditandoEstadoKey(null);
  }

  function prevMonth() {
    setViewDate(v => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function nextMonth() {
    setViewDate(v => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    resizeStartX.current = e.clientX;
    resizeStartW.current = nameColWidth;
    const onMove = ev => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizeStartX.current;
      setNameColWidth(Math.max(80, Math.min(300, resizeStartW.current + delta)));
    };
    const onUp = () => {
      resizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function clickCell(e, memberId, dateStr) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const current = asistencia[memberId]?.[dateStr];
    setNoteInput(current?.note || '');
    setOpenCell({ memberId, dateStr, x: rect.left, y: rect.bottom + 6 });
  }

  function setEstado(key) {
    if (!openCell) return;
    const { memberId, dateStr } = openCell;
    setAsistencia(prev => {
      const memberData = { ...(prev[memberId] || {}) };
      if (key === null) { delete memberData[dateStr]; }
      else { memberData[dateStr] = { status: key, note: noteInput }; }
      return { ...prev, [memberId]: memberData };
    });
    setOpenCell(null);
  }

  function confirmarNota(key) {
    if (!openCell) return;
    const { memberId, dateStr } = openCell;
    setAsistencia(prev => {
      const memberData = { ...(prev[memberId] || {}) };
      memberData[dateStr] = { status: key, note: noteInput };
      return { ...prev, [memberId]: memberData };
    });
    setOpenCell(null);
  }

  function abrir() { setEditandoId(null); setForm(FORM_INIT); setShowModal(true); }
  function abrirEditar(m) {
    setEditandoId(m.id);
    setForm({ nombre: m.nombre, puesto: m.puesto || '', email: m.email || '', telefono: m.telefono || '', departamento: m.departamento || '', cumpleanos: m.cumpleanos || '', fechaIngreso: m.fechaIngreso || '' });
    setShowModal(true);
  }
  function guardar() {
    if (!form.nombre.trim()) return;
    if (editandoId) {
      setEquipo(prev => prev.map(m => m.id === editandoId ? { ...m, ...form } : m));
    } else {
      setEquipo(prev => [...prev, { ...form, id: Date.now(), avatarType: 'initials', avatarBg: '#1c1c2a', avatarEmoji: '', avatarPhoto: '' }]);
    }
    setShowModal(false);
  }
  function eliminar(id) {
    if (confirm('¿Eliminar este miembro?')) {
      setEquipo(prev => prev.filter(m => m.id !== id));
      if (expandido === id) setExpandido(null);
    }
  }
  function onDragStart(i) { setDragIndex(i); }
  function onDragOver(e, i) { e.preventDefault(); if (i !== dragIndex) setDragOver(i); }
  function onDrop(i) {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDragOver(null); return; }
    setEquipo(prev => { const arr = [...prev]; const [item] = arr.splice(dragIndex, 1); arr.splice(i, 0, item); return arr; });
    setDragIndex(null); setDragOver(null);
  }
  function onDragEnd() { setDragIndex(null); setDragOver(null); }

  function toggleAsistencia(id) {
    setEquipo(prev => prev.map(m => m.id === id ? { ...m, enAsistencia: m.enAsistencia === false ? true : false } : m));
  }
  function startEditAlias(m) {
    setAliasInput(m.aliasAsistencia || '');
    setEditingAlias(m.id);
  }
  function saveAlias(id) {
    setEquipo(prev => prev.map(m => m.id === id ? { ...m, aliasAsistencia: aliasInput.trim() } : m));
    setEditingAlias(null);
  }

  function abrirAvatarEditor(m) {
    setAvatarDraft({ type: m.avatarType || 'initials', bg: m.avatarBg || '#1c1c2a', emoji: m.avatarEmoji || '', photo: m.avatarPhoto || '' });
    setAvatarTab('color'); setAvatarEditorId(m.id);
  }
  function guardarAvatar() {
    setEquipo(prev => prev.map(m => m.id === avatarEditorId
      ? { ...m, avatarType: avatarDraft.type, avatarBg: avatarDraft.bg, avatarEmoji: avatarDraft.emoji, avatarPhoto: avatarDraft.photo }
      : m
    ));
    setAvatarEditorId(null);
  }
  function onFotoChange(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarDraft(d => ({ ...d, type: 'photo', photo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  const avatarPreviewMember = equipo.find(m => m.id === avatarEditorId);
  const previewM = avatarPreviewMember ? { ...avatarPreviewMember, avatarType: avatarDraft.type, avatarBg: avatarDraft.bg, avatarEmoji: avatarDraft.emoji, avatarPhoto: avatarDraft.photo } : null;
  const inp = (extra = {}) => ({ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'var(--app-surface)', boxSizing: 'border-box', ...extra });

  const openEstado = openCell ? ESTADOS.find(e => e.key === asistencia[openCell.memberId]?.[openCell.dateStr]?.status) : null;
  const needsNote = openCell && (asistencia[openCell.memberId]?.[openCell.dateStr]?.status === 'retardo' || asistencia[openCell.memberId]?.[openCell.dateStr]?.status === 'retardo_just' || asistencia[openCell.memberId]?.[openCell.dateStr]?.status === 'falta_just');

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100%' }} onClick={() => setOpenCell(null)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ paddingBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>Equipo</h1>
          <p style={{ fontSize: 13, color: 'var(--app-text-subtle)', margin: 0, marginTop: 2 }}>{equipo.length} miembros</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'var(--app-surface-2)', borderRadius: 8, padding: 3 }}>
            {[['miembros','Miembros'],['asistencia','Asistencia'],['vacaciones','🌴 Vacaciones']].filter(([key]) => key !== 'vacaciones' || can('view_vacaciones')).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 600 : 400, background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#111827' : '#6b7280', boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'miembros' && can('edit_team') && (
            <button onClick={abrir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              + Agregar
            </button>
          )}
        </div>
      </div>

      {/* ── MIEMBROS TAB ── */}
      {tab === 'miembros' && (
        <div style={{ padding: '20px 24px' }}>
          {equipo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9090a8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 6 }}>Sin miembros</div>
              <div style={{ fontSize: 13 }}>Agrega el primer miembro con el botón "+ Agregar"</div>
            </div>
          ) : (
            <div style={{ background: 'var(--app-surface)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {equipo.map((m, i) => (
                <div key={m.id} draggable={can('edit_team')} onDragStart={() => can('edit_team') && onDragStart(i)} onDragOver={e => can('edit_team') && onDragOver(e, i)} onDrop={() => can('edit_team') && onDrop(i)} onDragEnd={onDragEnd}
                  style={{ opacity: dragIndex === i ? 0.4 : 1, borderTop: dragOver === i && dragIndex !== i ? '2px solid #e53e3e' : '2px solid transparent', transition: 'opacity 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: expandido === m.id || i === equipo.length - 1 ? 'none' : '1px solid var(--app-border-light)', cursor: 'grab' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
                    </svg>
                    <div style={{ position: 'relative', flexShrink: 0, cursor: can('edit_team') ? 'pointer' : 'default' }}
                      onMouseEnter={() => can('edit_team') && setHoverAvatar(m.id)} onMouseLeave={() => setHoverAvatar(null)}
                      onClick={e => { if (!can('edit_team')) return; e.stopPropagation(); abrirAvatarEditor(m); }}>
                      {renderAvatar(m, 44)}
                      {hoverAvatar === m.id && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <PencilIcon size={14} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--app-text)' }}>{m.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginTop: 1 }}>{[m.puesto, m.departamento].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, cursor: 'default' }} onClick={e => e.stopPropagation()}>
                      {can('edit_team') && <button onClick={() => toggleAsistencia(m.id)} title={m.enAsistencia === false ? 'Excluido de asistencia (clic para incluir)' : 'Incluido en asistencia (clic para excluir)'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: m.enAsistencia === false ? '#ef4444' : '#bbb', display: 'flex', padding: 4 }}>{m.enAsistencia === false ? <EyeOffIcon /> : <EyeIcon />}</button>}
                      <button onClick={() => setExpandido(expandido === m.id ? null : m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', display: 'flex', padding: 4 }}><ChevronIcon open={expandido === m.id} /></button>
                      {can('edit_team') && <button onClick={() => abrirEditar(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', display: 'flex', padding: 4 }}><PencilIcon /></button>}
                      {can('edit_team') && <button onClick={() => eliminar(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', display: 'flex', padding: 4 }}><TrashIcon /></button>}
                    </div>
                  </div>
                  {expandido === m.id && (
                    <div style={{ padding: '0 20px 14px 78px', borderBottom: i < equipo.length - 1 ? '1px solid var(--app-border-light)' : 'none', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      {m.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--app-text-muted)', fontSize: 12 }}><span style={{ color: '#bbb', display: 'flex' }}><MailIcon /></span>{m.email}</div>}
                      {m.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--app-text-muted)', fontSize: 12 }}><span style={{ color: '#bbb', display: 'flex' }}><PhoneIcon /></span>{m.telefono}</div>}
                      {m.cumpleanos && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--app-text-muted)', fontSize: 12 }}>
                        <span style={{ color: '#bbb' }}>🎂</span>
                        {new Date(m.cumpleanos + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                        <span style={{ color: 'var(--app-text-subtle)', fontSize: 11 }}>({new Date().getFullYear() - parseInt(m.cumpleanos.slice(0, 4))} años)</span>
                      </div>}
                      {m.fechaIngreso && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--app-text-muted)', fontSize: 12 }}>
                        <span style={{ color: '#bbb' }}>📅</span>
                        Ingreso: {new Date(m.fechaIngreso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ASISTENCIA TAB ── */}
      {tab === 'asistencia' && (
        <div style={{ padding: '16px 24px 24px' }}>
          {/* Legend */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginRight: 2 }}>Estados:</span>
              {todosEstados.map(e => (
                <div key={e.key} style={{ display: 'flex', flexDirection: 'column', background: 'var(--app-surface)', border: `1px solid ${editandoEstadoKey === e.key ? '#e53e3e' : 'var(--app-border)'}`, borderRadius: 6, overflow: 'hidden' }}>
                  {/* Chip — clic abre editor */}
                  <div onClick={() => can('edit_asistencia') && (editandoEstadoKey === e.key ? setEditandoEstadoKey(null) : iniciarEditEstado(e))}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 5px', cursor: can('edit_asistencia') ? 'pointer' : 'default' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: estadoColores[e.key] || e.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                    <span style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>{e.emoji} {e.label}</span>
                    {can('edit_asistencia') && (
                      <button onClick={ev => { ev.stopPropagation(); if (confirm(`¿Eliminar el estado "${e.label}"?`)) ocultarEstado(e.key); }} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 14, lineHeight: 1, padding: '0 0 0 2px', display: 'flex', alignItems: 'center' }}>×</button>
                    )}
                  </div>
                  {/* Editor inline */}
                  {editandoEstadoKey === e.key && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderTop: '1px solid #fecaca', background: '#fff5f5' }}>
                      <label title="Color" style={{ position: 'relative', width: 26, height: 26, borderRadius: 5, background: editFormEstado.color, flexShrink: 0, cursor: 'pointer', border: '2px solid rgba(0,0,0,0.12)' }}>
                        <input type="color" value={editFormEstado.color} onChange={ev => setEditFormEstado(p => ({ ...p, color: ev.target.value }))} style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                      </label>
                      <input value={editFormEstado.label} onChange={ev => setEditFormEstado(p => ({ ...p, label: ev.target.value }))} placeholder="Nombre" autoFocus onKeyDown={ev => { if (ev.key === 'Enter') guardarEditEstado(); if (ev.key === 'Escape') setEditandoEstadoKey(null); }} style={{ flex: 1, minWidth: 80, border: '1px solid #fca5a5', borderRadius: 4, padding: '3px 6px', fontSize: 12, outline: 'none', background: '#fff' }} />
                      <button onClick={guardarEditEstado} style={{ background: '#e53e3e', border: 'none', borderRadius: 4, padding: '4px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#fff' }}>OK</button>
                    </div>
                  )}
                </div>
              ))}
              {can('edit_asistencia') && (
                <button onClick={() => setShowNewEstado(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: showNewEstado ? '#f3f4f6' : '#fff', border: '1px dashed #d1d5db', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--app-text-muted)', fontWeight: 500 }}>
                  + Estado
                </button>
              )}
            </div>
            {showNewEstado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                <label style={{ position: 'relative', width: 28, height: 28, borderRadius: 6, background: newEstadoForm.color, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} title="Elegir color">
                  <input type="color" value={newEstadoForm.color} onChange={e => setNewEstadoForm(p => ({ ...p, color: e.target.value }))} style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                </label>
                <input value={newEstadoForm.label} onChange={e => setNewEstadoForm(p => ({ ...p, label: e.target.value }))} placeholder="Nombre del estado" onKeyDown={e => e.key === 'Enter' && agregarEstado()} autoFocus style={{ border: '1px solid var(--app-border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, outline: 'none', width: 160 }} />
                <input value={newEstadoForm.emoji} onChange={e => setNewEstadoForm(p => ({ ...p, emoji: e.target.value }))} placeholder="Emoji (opcional)" style={{ border: '1px solid var(--app-border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, outline: 'none', width: 130 }} />
                <button onClick={agregarEstado} style={{ padding: '5px 14px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Agregar</button>
                <button onClick={() => setShowNewEstado(false)} style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--app-border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--app-text-muted)' }}>Cancelar</button>
              </div>
            )}
          </div>

          {equipo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9090a8', background: 'var(--app-surface)', borderRadius: 14 }}>
              <div style={{ fontSize: 13 }}>Agrega miembros primero en la pestaña Miembros.</div>
            </div>
          ) : (
            <div style={{ background: 'var(--app-surface)', borderRadius: 14, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                <thead>
                  {/* Month name row */}
                  <tr>
                    <th rowSpan={2} style={{ position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 5, padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--app-text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid var(--app-border)', borderRight: '2px solid var(--app-border)', width: nameColWidth, minWidth: nameColWidth, maxWidth: nameColWidth, whiteSpace: 'nowrap', userSelect: 'none', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Nombre</span>
                        <div onMouseDown={startResize} style={{ width: 6, height: 20, cursor: 'col-resize', borderRadius: 3, background: '#d1d5db', flexShrink: 0, marginRight: -4 }} title="Arrastra para redimensionar" />
                      </div>
                    </th>
                    <th colSpan={weekdays.length} style={{ background: '#f8f9fa', borderBottom: '1px solid var(--app-border)', padding: '4px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--app-border)', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 15, color: '#555', lineHeight: 1 }}>‹</button>
                        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--app-text-2)', letterSpacing: 1, textTransform: 'uppercase', minWidth: 130, textAlign: 'center' }}>{MESES[viewDate.month]} {viewDate.year}</span>
                        <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--app-border)', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 15, color: '#555', lineHeight: 1 }}>›</button>
                      </div>
                    </th>
                  </tr>
                  {/* Day columns row */}
                  <tr>
                    {weekdays.map(d => {
                      const feriadoNombre = feriadosMexico[d.dateStr];
                      return (
                        <th key={d.dateStr} title={feriadoNombre || undefined} style={{ padding: '0', textAlign: 'center', borderBottom: '2px solid var(--app-border)', borderLeft: d.isMonday ? '2px solid var(--app-border)' : '1px solid var(--app-border-light)', minWidth: 26, width: 26, background: feriadoNombre ? 'rgba(232,121,240,0.1)' : 'transparent' }}>
                          <div style={{ fontSize: 9, color: feriadoNombre ? '#d946ef' : '#bbb', paddingTop: 3 }}>{DIAS[d.dow]}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: feriadoNombre ? '#d946ef' : '#374151', paddingBottom: 3 }}>{d.day}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {equipo.filter(m => m.enAsistencia !== false).map((m, mi) => (
                    <tr key={m.id} style={{ background: mi % 2 === 0 ? '#fff' : '#fafafa' }}>
                      {/* Sticky name cell */}
                      <td style={{ position: 'sticky', left: 0, background: mi % 2 === 0 ? '#fff' : '#fafafa', zIndex: 4, padding: '6px 12px', borderBottom: '1px solid var(--app-border-light)', borderRight: '2px solid var(--app-border)', width: nameColWidth, minWidth: nameColWidth, maxWidth: nameColWidth, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {renderAvatar(m, 24)}
                          {editingAlias === m.id && can('edit_asistencia') ? (
                            <input autoFocus value={aliasInput} onChange={e => setAliasInput(e.target.value)}
                              onBlur={() => saveAlias(m.id)}
                              onKeyDown={e => { if (e.key === 'Enter') saveAlias(m.id); if (e.key === 'Escape') setEditingAlias(null); }}
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text)', border: '1px solid #e53e3e', borderRadius: 4, padding: '1px 4px', outline: 'none', flex: 1, minWidth: 0, background: 'var(--app-surface)' }} />
                          ) : (
                            <span onClick={can('edit_asistencia') ? e => { e.stopPropagation(); startEditAlias(m); } : undefined} title={can('edit_asistencia') ? "Clic para editar nombre en asistencia" : undefined}
                              style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text)', cursor: can('edit_asistencia') ? 'text' : 'default', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.aliasAsistencia || m.nombre}
                            </span>
                          )}
                          {m.cumpleanos && m.cumpleanos.slice(5, 7) === String(viewDate.month + 1).padStart(2, '0') && (
                            <span title={`Cumpleaños: ${m.cumpleanos.split('-').reverse().slice(0,2).join('/')}`} style={{ fontSize: 11, flexShrink: 0 }}>🎂</span>
                          )}
                        </div>
                      </td>
                      {weekdays.map(d => {
                        const entry = asistencia[m.id]?.[d.dateStr];
                        const estado = entry ? todosEstados.find(e => e.key === entry.status) : null;
                        const feriadoNombre = feriadosMexico[d.dateStr];
                        const esFeriado = !entry && !!feriadoNombre;
                        const feriadoEstado = ESTADOS.find(e => e.key === 'feriado');
                        const esBirthday = m.cumpleanos && d.dateStr.slice(5) === m.cumpleanos.slice(5);
                        const color = estado ? (estadoColores[estado.key] || estado.color) : (esFeriado ? estadoColores['feriado'] : (esBirthday ? '#fef9c3' : null));
                        const tooltipParts = [];
                        if (feriadoNombre) tooltipParts.push(feriadoNombre);
                        if (esBirthday && m.cumpleanos) tooltipParts.push(`🎂 ${viewDate.year - parseInt(m.cumpleanos.slice(0, 4))} años`);
                        if (entry?.status === 'vacaciones' && vacacionesMap[m.id]) {
                          const { vac, vacDays } = vacacionesMap[m.id];
                          const idx = vacDays.indexOf(d.dateStr);
                          if (idx !== -1) tooltipParts.push(`🌴 ${idx + 1}/${vac.diasCorresponden}`);
                        }
                        return (
                          <td key={d.dateStr}
                            onClick={can('edit_asistencia') ? e => clickCell(e, m.id, d.dateStr) : undefined}
                            onMouseEnter={tooltipParts.length ? e => { const r = e.currentTarget.getBoundingClientRect(); setFeriadoTooltip({ text: tooltipParts.join(' · '), x: r.left + r.width / 2, y: r.top - 6 }); } : undefined}
                            onMouseLeave={tooltipParts.length ? () => setFeriadoTooltip(null) : undefined}
                            style={{ position: 'relative', padding: 0, borderBottom: '1px solid var(--app-border-light)', borderLeft: d.isMonday ? '2px solid var(--app-border)' : '1px solid var(--app-border-light)', background: color || 'transparent', cursor: can('edit_asistencia') ? 'pointer' : 'default', textAlign: 'center', height: 30, minWidth: 26, width: 26, verticalAlign: 'middle' }}>
                            {(estado || esFeriado) && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: 1 }}>
                                {estado?.emoji ? <span style={{ fontSize: 15 }}>{estado.emoji}</span> : null}
                                {esFeriado && feriadoEstado?.emoji ? <span style={{ fontSize: 15 }}>{feriadoEstado.emoji}</span> : null}
                                {entry?.note ? <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(0,0,0,0.6)' }}>{entry.note}</span> : null}
                              </div>
                            )}
                            {esBirthday && !estado && !esFeriado && (
                              <span style={{ fontSize: 15, lineHeight: 1 }}>🎂</span>
                            )}
                            {esBirthday && (estado || esFeriado) && (
                              <span style={{ position: 'absolute', top: 1, right: 1, fontSize: 8, lineHeight: 1 }}>🎂</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ── VACACIONES TAB ── */}
      {tab === 'vacaciones' && can('view_vacaciones') && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, padding: '6px 14px' }}>
              Los días se calculan según la <strong>LFT 2023</strong> por año de aniversario. Los días usados se toman de los registros de asistencia con estado <span style={{ color: '#67e8f9', fontWeight: 700 }}>🌴 Vacaciones</span>.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {equipo.filter(m => m.enAsistencia !== false).map(m => {
              const vac = calcVacaciones(m.fechaIngreso, asistencia, m.id);
              const sinFecha = !m.fechaIngreso;

              return (
                <div key={m.id} style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                  {/* Avatar + Nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1 }}>
                    {renderAvatar(m, 38)}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)' }}>{m.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{m.puesto}</div>
                    </div>
                  </div>

                  {sinFecha ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 2 }}>
                      <span style={{ fontSize: 12, color: '#f59e0b', background: '#fef3c7', borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>⚠️ Sin fecha de ingreso</span>
                      {can('edit_team') && (
                        <button onClick={() => abrirEditar(m)} style={{ fontSize: 11, color: '#e53e3e', background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                          + Agregar fecha
                        </button>
                      )}
                    </div>
                  ) : vac.añosCumplidos < 1 ? (
                    <div style={{ flex: 2 }}>
                      <span style={{ fontSize: 12, color: 'var(--app-text-subtle)', background: 'var(--app-surface-alt)', borderRadius: 6, padding: '4px 10px' }}>
                        Ingresó el {fmtFecha(new Date(m.fechaIngreso + 'T12:00:00'))} — aún no cumple 1 año
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Antigüedad + período */}
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Período actual</div>
                        <div style={{ fontSize: 12, color: 'var(--app-text-2)', fontWeight: 600 }}>
                          {vac.añosCumplidos} {vac.añosCumplidos === 1 ? 'año' : 'años'} de antigüedad
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 2 }}>
                          {fmtFecha(vac.desde)} → {fmtFecha(vac.hasta)}
                        </div>
                      </div>

                      {/* Números */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--app-text)', lineHeight: 1 }}>{vac.diasCorresponden}</div>
                          <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 2 }}>corresponden</div>
                        </div>
                        <div style={{ fontSize: 18, color: 'var(--app-border)', fontWeight: 300 }}>–</div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#67e8f9', lineHeight: 1 }}>{vac.usados}</div>
                          <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 2 }}>usados</div>
                        </div>
                        <div style={{ fontSize: 18, color: 'var(--app-border)', fontWeight: 300 }}>=</div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: vac.disponibles === 0 ? '#ef4444' : '#4ade80', lineHeight: 1 }}>{vac.disponibles}</div>
                          <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 2 }}>disponibles</div>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div style={{ minWidth: 100, flex: 1 }}>
                        <div style={{ height: 6, background: 'var(--app-border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, vac.diasCorresponden > 0 ? (vac.usados / vac.diasCorresponden) * 100 : 0)}%`, background: vac.usados >= vac.diasCorresponden ? '#ef4444' : '#67e8f9', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginTop: 3, textAlign: 'right' }}>
                          {vac.diasCorresponden > 0 ? Math.round((vac.usados / vac.diasCorresponden) * 100) : 0}% utilizado
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feriado tooltip */}
      {feriadoTooltip && (
        <div style={{ position: 'fixed', left: feriadoTooltip.x, top: feriadoTooltip.y, transform: 'translate(-50%, -100%)', background: '#1f2937', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {feriadoTooltip.text}
          <div style={{ position: 'absolute', left: '50%', bottom: -4, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #1f2937' }} />
        </div>
      )}

      {/* Cell popover */}
      {openCell && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', left: Math.min(openCell.x, window.innerWidth - 230), top: Math.min(openCell.y, window.innerHeight - 60), transform: openCell.y + 40 > window.innerHeight - 60 ? 'translateY(-100%)' : 'none', background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 200, width: 220, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--app-border-light)', fontSize: 11, color: 'var(--app-text-subtle)', fontWeight: 600 }}>
            {openCell.dateStr}
          </div>
          <div style={{ padding: 6, maxHeight: 320, overflowY: 'auto' }}>
            {todosEstados.map(e => {
              const isCurrent = asistencia[openCell.memberId]?.[openCell.dateStr]?.status === e.key;
              const needNote = e.key === 'retardo' || e.key === 'retardo_just' || e.key === 'falta_just';
              const cellColor = estadoColores[e.key] || e.color;
              return (
                <div key={e.key}>
                  <button onClick={() => { if (!needNote) setEstado(e.key); else { setAsistencia(prev => { const md = { ...(prev[openCell.memberId] || {}) }; md[openCell.dateStr] = { status: e.key, note: noteInput }; return { ...prev, [openCell.memberId]: md }; }); } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', border: 'none', borderRadius: 6, background: isCurrent ? cellColor + '33' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: cellColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--app-text-2)', flex: 1 }}>{e.emoji} {e.label}</span>
                    {isCurrent && <span style={{ fontSize: 10, color: 'var(--app-text-subtle)' }}>✓</span>}
                  </button>
                  {isCurrent && needNote && (
                    <div style={{ display: 'flex', gap: 4, padding: '2px 8px 6px 28px' }}>
                      <input value={noteInput} onChange={ev => setNoteInput(ev.target.value)} placeholder={e.key === 'falta_just' ? 'Motivo' : 'ej: 30min'} style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '3px 6px', fontSize: 11, outline: 'none' }} onKeyDown={ev => ev.key === 'Enter' && confirmarNota(e.key)} />
                      <button onClick={() => confirmarNota(e.key)} style={{ background: cellColor, border: 'none', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>OK</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ padding: '6px 10px', borderTop: '1px solid var(--app-border-light)' }}>
            <button onClick={() => setEstado(null)} style={{ width: '100%', padding: '5px', border: 'none', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444' }}>
              Limpiar celda
            </button>
          </div>
        </div>
      )}

      {/* Avatar Editor Modal */}
      {avatarEditorId && previewM && (
        <div onClick={e => { if (e.target === e.currentTarget) setAvatarEditorId(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 14, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--app-border-light)' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)' }}>Editar avatar</span>
              <button onClick={() => setAvatarEditorId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>{renderAvatar(previewM, 72)}</div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--app-border-light)', marginBottom: 16 }}>
                {[['color','Color de fondo'],['emoji','Emoji'],['foto','Foto']].map(([t, label]) => (
                  <button key={t} onClick={() => setAvatarTab(t)} style={{ flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: avatarTab === t ? 600 : 400, color: avatarTab === t ? '#e53e3e' : '#6b7280', borderBottom: avatarTab === t ? '2px solid #e53e3e' : '2px solid transparent', marginBottom: -1 }}>
                    {label}
                  </button>
                ))}
              </div>
              {avatarTab === 'color' && (
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, marginBottom: 14 }}>
                    {AVATAR_COLORS.map(c => (
                      <button key={c} onClick={() => setAvatarDraft(d => ({ ...d, type: 'initials', bg: c }))} style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: c, border: avatarDraft.bg === c && avatarDraft.type === 'initials' ? '3px solid #e53e3e' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>Color personalizado</label>
                    <input type="color" value={avatarDraft.bg} onChange={e => setAvatarDraft(d => ({ ...d, type: 'initials', bg: e.target.value }))} style={{ width: 36, height: 30, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  </div>
                </div>
              )}
              {avatarTab === 'emoji' && (
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, marginBottom: 14, maxHeight: 220, overflowY: 'auto' }}>
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => setAvatarDraft(d => ({ ...d, type: 'emoji', emoji: e }))} style={{ fontSize: 22, padding: '4px 0', border: avatarDraft.emoji === e && avatarDraft.type === 'emoji' ? '2px solid #e53e3e' : '2px solid transparent', borderRadius: 8, background: avatarDraft.emoji === e && avatarDraft.type === 'emoji' ? '#fff5f5' : 'none', cursor: 'pointer' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}>Fondo:</label>
                    <input type="color" value={avatarDraft.bg} onChange={e => setAvatarDraft(d => ({ ...d, bg: e.target.value }))} style={{ width: 36, height: 30, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  </div>
                </div>
              )}
              {avatarTab === 'foto' && (
                <div style={{ paddingBottom: 20 }}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFotoChange} style={{ display: 'none' }} />
                  <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed #ddd', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                    <div style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>Haz clic para seleccionar una imagen</div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>JPG, PNG, GIF</div>
                  </div>
                  {avatarDraft.type === 'photo' && avatarDraft.photo && (
                    <button onClick={() => setAvatarDraft(d => ({ ...d, type: 'initials', photo: '' }))} style={{ marginTop: 10, width: '100%', padding: '7px', border: '1px solid var(--app-border-light)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: '#e53e3e' }}>
                      Quitar foto
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--app-border-light)' }}>
              <button onClick={() => setAvatarEditorId(null)} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: 'var(--app-surface)', cursor: 'pointer', fontSize: 13, color: '#555' }}>Cancelar</button>
              <button onClick={guardarAvatar} style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--app-border-light)' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--app-text)' }}>{editandoId ? 'Editar Miembro' : 'Nuevo Miembro'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>Nombre completo</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={inp()} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>Puesto</label>
                <input value={form.puesto} onChange={e => setForm(p => ({ ...p, puesto: e.target.value }))} style={inp()} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>Email</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" style={inp()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>Telefono</label>
                  <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>Departamento</label>
                  <input value={form.departamento} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))}
                    onFocus={() => setFocusDept(true)} onBlur={() => setFocusDept(false)}
                    style={inp(focusDept ? { border: '2px solid #e53e3e' } : {})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>🎂 Cumpleaños</label>
                  <input type="date" value={form.cumpleanos} onChange={e => setForm(p => ({ ...p, cumpleanos: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--app-text-2)', marginBottom: 6 }}>📅 Fecha de ingreso</label>
                  <input type="date" value={form.fechaIngreso} onChange={e => setForm(p => ({ ...p, fechaIngreso: e.target.value }))} style={inp()} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--app-border-light)' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: 8, background: 'var(--app-surface)', cursor: 'pointer', fontSize: 13, color: '#555' }}>Cancelar</button>
              <button onClick={guardar} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {editandoId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
