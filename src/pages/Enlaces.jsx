import { useState, useEffect, useRef } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const TIPOS = ['Archivo', 'Excel', 'Imagen', 'Enlace', 'Web', 'Carpeta'];
const CATEGORIAS = ['General', 'Reportes', 'Campañas', 'Diseño', 'Analytics'];

const COLORES = [
  { label: 'Gris',     value: '#6b7280' },
  { label: 'Rojo',     value: '#dc2626' },
  { label: 'Naranja',  value: '#f97316' },
  { label: 'Amarillo', value: '#eab308' },
  { label: 'Verde',    value: '#22c55e' },
  { label: 'Teal',     value: '#14b8a6' },
  { label: 'Azul',     value: '#3b82f6' },
  { label: 'Índigo',   value: '#6366f1' },
  { label: 'Morado',   value: '#8b5cf6' },
  { label: 'Rosa',     value: '#ec4899' },
  { label: 'Negro',    value: '#1a1a2e' },
];

const CAT_COLORES_INIT = {
  General:   '#6b7280',
  Reportes:  '#3b82f6',
  Campañas:  '#14b8a6',
  Diseño:    '#eab308',
  Analytics: '#8b5cf6',
};

const TAMANOS = {
  small:  'repeat(auto-fill, minmax(210px, 1fr))',
  medium: 'repeat(auto-fill, minmax(290px, 1fr))',
  large:  'repeat(auto-fill, minmax(400px, 1fr))',
};

function TipoIcon({ tipo, color }) {
  const c = color || '#3b82f6';
  const bg = c + '20';
  const icons = {
    Archivo:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    Excel:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,
    Imagen:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    Enlace:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    Web:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    Carpeta:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  };
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icons[tipo] || icons.Archivo}
    </div>
  );
}

function SizeIcon({ size }) {
  if (size === 'small') return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <rect x="0" y="0" width="6" height="6" rx="1"/><rect x="10" y="0" width="6" height="6" rx="1"/>
      <rect x="0" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/>
    </svg>
  );
  if (size === 'medium') return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/>
      <rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/>
    </svg>
  );
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <rect x="0" y="0" width="16" height="7" rx="1"/>
      <rect x="0" y="9" width="16" height="7" rx="1"/>
    </svg>
  );
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

const FORM_INIT = { nombre: '', url: '', tipo: 'Archivo', categoria: 'General' };

export default function Enlaces() {
  const { can } = useAuth();
  const [enlaces, setEnlaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enlaces') || '[]'); } catch { return []; }
  });
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [tamano, setTamano] = useState('medium');
  const [catColores, setCatColores] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enlaces_catColores') || 'null') || CAT_COLORES_INIT; } catch { return CAT_COLORES_INIT; }
  });
  const [showCatModal, setShowCatModal] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const canSync = useRef(false);
  const fbEn = useRef(false); const fbCc = useRef(false);

  useEffect(() => { if (fbEn.current) { fbEn.current = false; return; } localStorage.setItem('enlaces', JSON.stringify(enlaces)); if (canSync.current) dbSet('enlaces', enlaces); }, [enlaces]);
  useEffect(() => { if (fbCc.current) { fbCc.current = false; return; } localStorage.setItem('enlaces_catColores', JSON.stringify(catColores)); if (canSync.current) dbSet('enlaces_catColores', catColores); }, [catColores]);

  useEffect(() => {
    Promise.all([dbGet('enlaces'), dbGet('enlaces_catColores')]).then(([en, cc]) => {
      canSync.current = true;
      if (en !== null) { fbEn.current = true; setEnlaces(en); } else { let v; try { v = JSON.parse(localStorage.getItem('enlaces')||'null'); } catch {} if (v?.length) dbSet('enlaces', v); }
      if (cc !== null) { fbCc.current = true; setCatColores(cc); } else { let v; try { v = JSON.parse(localStorage.getItem('enlaces_catColores')||'null'); } catch {} if (v) dbSet('enlaces_catColores', v); }
    });
    const s1 = dbSub('enlaces', v => { fbEn.current = true; setEnlaces(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    const s2 = dbSub('enlaces_catColores', v => { fbCc.current = true; setCatColores(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    return () => { s1.unsubscribe(); s2.unsubscribe(); };
  }, []);

  const categoriasCon = [...new Set(enlaces.map(e => e.categoria))];
  const conteo = cat => enlaces.filter(e => e.categoria === cat).length;

  const filtrados = enlaces.filter(e => {
    const okCat = filtro === 'Todos' || e.categoria === filtro;
    const okBusq = e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      getDomain(e.url).toLowerCase().includes(busqueda.toLowerCase());
    return okCat && okBusq;
  });

  function abrir() { setEditandoId(null); setForm(FORM_INIT); setShowModal(true); }

  function abrirEditar(enlace) {
    setEditandoId(enlace.id);
    setForm({ nombre: enlace.nombre, url: enlace.url, tipo: enlace.tipo, categoria: enlace.categoria });
    setShowModal(true);
  }

  function guardar() {
    if (!form.nombre.trim() || !form.url.trim()) return;
    if (editandoId) {
      setEnlaces(prev => prev.map(e => e.id === editandoId ? { ...e, ...form } : e));
    } else {
      setEnlaces(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setShowModal(false);
    setEditandoId(null);
    setForm(FORM_INIT);
  }

  function eliminar(id) {
    if (window.confirm('¿Eliminar este enlace?')) {
      setEnlaces(prev => prev.filter(e => e.id !== id));
    }
  }

  function getCatStyle(cat) {
    const color = catColores[cat] || '#6b7280';
    return { bg: color + '22', color };
  }

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>Enlaces</h1>
          <p style={{ fontSize: 13, color: 'var(--app-text-subtle)', margin: 0, marginTop: 2 }}>{enlaces.length} enlaces · {categoriasCon.length} categorías</p>
        </div>
        {can('edit') && (
          <button onClick={abrir} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            + Nuevo Enlace
          </button>
        )}
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Búsqueda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, padding: '7px 14px', minWidth: 220 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar enlaces..." style={{ border: 'none', outline: 'none', background: 'none', fontSize: 13, color: 'var(--app-text-2)', width: '100%' }} />
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {['Todos', ...categoriasCon].map(cat => {
              const active = filtro === cat;
              const count = cat === 'Todos' ? enlaces.length : conteo(cat);
              return (
                <button key={cat} onClick={() => setFiltro(cat)} style={{ border: active ? 'none' : '1px solid var(--app-border)', background: active ? '#111827' : '#fff', color: active ? '#fff' : '#6b7280', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer' }}>
                  {cat}{count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          {/* Botón colores de categorías */}
          <button onClick={() => setShowCatModal(true)} title="Personalizar colores de categorías"
            style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--app-text-muted)' }}
            onMouseEnter={ev => ev.currentTarget.style.color = '#111827'}
            onMouseLeave={ev => ev.currentTarget.style.color = '#6b7280'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </button>

          {/* Control de tamaño */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, padding: 3 }}>
            {['small', 'medium', 'large'].map(t => (
              <button key={t} onClick={() => setTamano(t)} title={t === 'small' ? 'Compacto' : t === 'medium' ? 'Normal' : 'Grande'}
                style={{ background: tamano === t ? '#111827' : 'transparent', color: tamano === t ? '#fff' : '#9ca3af', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <SizeIcon size={t} />
              </button>
            ))}
          </div>
        </div>

        {/* Grid o empty state */}
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-text-subtle)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <p style={{ fontSize: 15, marginBottom: 4 }}>{enlaces.length === 0 ? 'Aún no hay enlaces' : 'No hay resultados'}</p>
            {enlaces.length === 0 && <p style={{ fontSize: 13 }}>Crea tu primer enlace con el botón "+ Nuevo Enlace"</p>}
          </div>
        ) : (
          <>
          {menuAbierto && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setMenuAbierto(null)} />}
          <div style={{ display: 'grid', gridTemplateColumns: TAMANOS[tamano], gap: 16 }}>
            {filtrados.map(e => {
              const catStyle = getCatStyle(e.categoria);
              const menuOpen = menuAbierto === e.id;
              return (
                <div key={e.id} style={{ background: 'var(--app-surface)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid var(--app-border)', position: 'relative' }}>
                  <div style={{ height: 4, background: catStyle.color, borderRadius: '12px 12px 0 0' }} />
                  <div style={{ padding: '16px 18px' }}>
                    {/* Ícono + nombre + 3 puntos */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <TipoIcon tipo={e.tipo} color={catStyle.color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>{getDomain(e.url)}</div>
                      </div>
                      {/* Botón 3 puntos — solo para quien puede editar */}
                      {can('edit') && <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setMenuAbierto(menuOpen ? null : e.id)}
                          style={{ background: menuOpen ? '#f3f4f6' : 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--app-text-subtle)', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={ev => { if (!menuOpen) ev.currentTarget.style.background = '#f3f4f6'; ev.currentTarget.style.color = '#374151'; }}
                          onMouseLeave={ev => { if (!menuOpen) ev.currentTarget.style.background = 'none'; ev.currentTarget.style.color = '#9ca3af'; }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                        </button>
                        {/* Dropdown */}
                        {menuOpen && (
                          <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 130, zIndex: 100, overflow: 'hidden' }}>
                            <button onClick={() => { abrirEditar(e); setMenuAbierto(null); }}
                              style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: 'var(--app-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
                              onMouseEnter={ev => ev.currentTarget.style.background = '#f9fafb'}
                              onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Editar
                            </button>
                            <button onClick={() => { eliminar(e.id); setMenuAbierto(null); }}
                              style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
                              onMouseEnter={ev => ev.currentTarget.style.background = '#fff5f5'}
                              onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>}
                    </div>

                    {/* Footer: badge + Abrir */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ background: catStyle.bg, color: catStyle.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {e.categoria}
                      </span>
                      <a href={e.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--app-text-subtle)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        onMouseEnter={ev => ev.currentTarget.style.color = '#374151'}
                        onMouseLeave={ev => ev.currentTarget.style.color = '#9ca3af'}>
                        Abrir
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Modal: colores de categorías */}
      {showCatModal && (
        <div onClick={ev => ev.target === ev.currentTarget && setShowCatModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--app-border-light)' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--app-text)' }}>Colores de Categorías</span>
              <button onClick={() => setShowCatModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--app-text-subtle)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CATEGORIAS.map(cat => (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)' }}>{cat}</span>
                    <span style={{ background: (catColores[cat] || '#6b7280') + '22', color: catColores[cat] || '#6b7280', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {cat}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {COLORES.map(col => (
                      <button key={col.value} onClick={() => setCatColores(prev => ({ ...prev, [cat]: col.value }))} title={col.label}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: col.value, border: catColores[cat] === col.value ? '3px solid #374151' : '2px solid transparent', outline: catColores[cat] === col.value ? '2px solid #fff' : 'none', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--app-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setCatColores(CAT_COLORES_INIT)} style={{ background: 'none', border: 'none', color: 'var(--app-text-subtle)', fontSize: 13, cursor: 'pointer' }}>
                Restaurar por defecto
              </button>
              <button onClick={() => setShowCatModal(false)} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nuevo / editar enlace */}
      {showModal && (
        <div onClick={ev => ev.target === ev.currentTarget && setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 14, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--app-border-light)' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text)' }}>{editandoId ? 'Editar Enlace' : 'Nuevo Enlace'}</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--app-text-subtle)', cursor: 'pointer', lineHeight: 1, padding: '2px 4px' }}>×</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--app-text-2)', marginBottom: 5 }}>Nombre</label>
                <input autoFocus value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Reporte Mensual Q4"
                  style={{ width: '100%', border: `1.5px solid ${form.nombre ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: 'var(--app-text)', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => { if (!form.nombre) e.target.style.borderColor = '#e5e7eb'; }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--app-text-2)', marginBottom: 5 }}>URL</label>
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://docs.google.com/..."
                  style={{ width: '100%', border: '1.5px solid var(--app-border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: 'var(--app-text)', background: 'var(--app-surface-alt)', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--app-text-2)', marginBottom: 5 }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={{ width: '100%', border: '1.5px solid var(--app-border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: 'var(--app-text)', background: 'var(--app-surface)', cursor: 'pointer', boxSizing: 'border-box' }}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--app-text-2)', marginBottom: 5 }}>Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} style={{ width: '100%', border: '1.5px solid var(--app-border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: 'var(--app-text)', background: 'var(--app-surface)', cursor: 'pointer', boxSizing: 'border-box' }}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--app-border-light)' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--app-surface)', border: '1.5px solid var(--app-border)', color: 'var(--app-text-2)', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={!form.nombre.trim() || !form.url.trim()}
                style={{ background: (!form.nombre.trim() || !form.url.trim()) ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: (!form.nombre.trim() || !form.url.trim()) ? 'not-allowed' : 'pointer' }}>
                {editandoId ? 'Guardar Cambios' : 'Crear Enlace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
