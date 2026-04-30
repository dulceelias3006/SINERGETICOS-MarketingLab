import { useState, useEffect, useRef } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';

const CATEGORIAS = ['General', 'Redes Sociales', 'Plataformas', 'Herramientas', 'Email', 'Analytics', 'Almacenamiento', 'Otros'];
const FORM_INIT = { nombre: '', url: '', usuario: '', contrasena: '', categoria: 'General', notas: '' };
const TAMANOS = {
  small:  'repeat(auto-fill, minmax(220px, 1fr))',
  medium: 'repeat(auto-fill, minmax(300px, 1fr))',
  large:  'repeat(auto-fill, minmax(420px, 1fr))',
};

function getDomain(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname; }
  catch { return url; }
}

function KeyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
function EyeIcon({ open }) {
  if (open) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
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
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function SizeIcon({ size }) {
  const gap = size === 'small' ? 2 : size === 'medium' ? 3 : 5;
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
      <rect x="2" y="2" width="16" height={gap} rx="1"/>
      <rect x="2" y={2 + gap + 2} width="16" height={gap} rx="1"/>
      <rect x="2" y={2 + (gap + 2) * 2} width="16" height={gap} rx="1"/>
    </svg>
  );
}

export default function Accesos() {
  const [accesos, setAccesos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('accesos') || '[]'); } catch { return []; }
  });
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INIT);
  const [showPassRow, setShowPassRow] = useState({});
  const [showPassModal, setShowPassModal] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const [copiado, setCopiado] = useState(null);
  const [tamano, setTamano] = useState('medium');
  const canSync = useRef(false);
  const fbAc = useRef(false);

  useEffect(() => { if (fbAc.current) { fbAc.current = false; return; } localStorage.setItem('accesos', JSON.stringify(accesos)); if (canSync.current) dbSet('accesos', accesos); }, [accesos]);

  useEffect(() => {
    dbGet('accesos').then(val => {
      canSync.current = true;
      if (val !== null) { fbAc.current = true; setAccesos(val); }
      else { let v; try { v = JSON.parse(localStorage.getItem('accesos')||'null'); } catch {} if (v?.length) dbSet('accesos', v); }
    });
    const sub = dbSub('accesos', v => { fbAc.current = true; setAccesos(p => JSON.stringify(p)===JSON.stringify(v)?p:v); });
    return () => sub.unsubscribe();
  }, []);

  const categoriasUsadas = [...new Set(accesos.map(a => a.categoria))];

  const filtrados = accesos.filter(a => {
    const matchFiltro = filtro === 'Todos' || a.categoria === filtro;
    const matchBusqueda = !busqueda ||
      a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.usuario.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusqueda;
  });

  const tabs = [
    { label: 'Todos', count: accesos.length },
    ...categoriasUsadas.map(cat => ({ label: cat, count: accesos.filter(a => a.categoria === cat).length }))
  ];

  function abrir() {
    setEditandoId(null);
    setForm(FORM_INIT);
    setShowPassModal(false);
    setShowCatDrop(false);
    setShowModal(true);
  }

  function abrirEditar(a) {
    setEditandoId(a.id);
    setForm({ nombre: a.nombre, url: a.url || '', usuario: a.usuario || '', contrasena: a.contrasena || '', categoria: a.categoria, notas: a.notas || '' });
    setShowPassModal(false);
    setShowCatDrop(false);
    setShowModal(true);
  }

  function guardar() {
    if (!form.nombre.trim()) return;
    if (editandoId) {
      setAccesos(prev => prev.map(a => a.id === editandoId ? { ...form, id: editandoId } : a));
    } else {
      setAccesos(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setShowModal(false);
  }

  function eliminar(id) {
    if (confirm('¿Eliminar este acceso?')) setAccesos(prev => prev.filter(a => a.id !== id));
  }

  function copiar(texto, key) {
    navigator.clipboard.writeText(texto).catch(() => {});
    setCopiado(key);
    setTimeout(() => setCopiado(null), 1500);
  }

  function cerrarModal() {
    setShowModal(false);
    setShowCatDrop(false);
  }

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', background: '#fff', borderBottom: '1px solid #e8e8ee', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Accesos</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, marginTop: 2 }}>
            {accesos.length} accesos · {categoriasUsadas.length} categorías
          </p>
        </div>
        <button onClick={abrir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Nuevo Acceso
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Search + Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e8e8ee', borderRadius: 8, padding: '8px 14px', flex: '1 1 200px', maxWidth: 380 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar accesos..." style={{ border: 'none', outline: 'none', background: 'none', fontSize: 13, color: '#1a1a2e', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button key={tab.label} onClick={() => setFiltro(tab.label)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filtro === tab.label ? 600 : 400, background: filtro === tab.label ? '#1a1a2e' : 'transparent', color: filtro === tab.label ? '#fff' : '#666' }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', background: '#fff', border: '1px solid #e8e8ee', borderRadius: 8, padding: 3 }}>
            {['small', 'medium', 'large'].map(s => (
              <button key={s} onClick={() => setTamano(s)} title={s} style={{ background: tamano === s ? '#e8e8ee' : 'none', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: tamano === s ? '#111827' : '#bbb', display: 'flex', alignItems: 'center' }}>
                <SizeIcon size={s} />
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9090a8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 6 }}>Sin accesos</div>
            <div style={{ fontSize: 13 }}>Agrega tu primer acceso con el botón "+ Nuevo Acceso"</div>
          </div>
        ) : (
          <>
            {menuAbierto && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setMenuAbierto(null)} />}
            <div style={{ display: 'grid', gridTemplateColumns: TAMANOS[tamano], gap: 12 }}>
              {filtrados.map(a => {
                const menuOpen = menuAbierto === a.id;
                const domain = a.url ? getDomain(a.url) : null;
                return (
                  <div key={a.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', position: 'relative', overflow: 'visible' }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 14px 10px' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53e3e', flexShrink: 0 }}>
                        <KeyIcon />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#f0f0f4', color: '#666', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'inline-block', marginTop: 3 }}>{a.categoria}</span>
                      </div>
                      {/* 3-dot menu */}
                      <div style={{ position: 'relative', flexShrink: 0, zIndex: menuOpen ? 60 : 1 }}>
                        <button onClick={() => setMenuAbierto(menuOpen ? null : a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 20, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}>⋯</button>
                        {menuOpen && (
                          <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e8e8ee', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 130, overflow: 'hidden' }}>
                            <button onClick={() => { abrirEditar(a); setMenuAbierto(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#333' }}><PencilIcon /> Editar</button>
                            <button onClick={() => { eliminar(a.id); setMenuAbierto(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#e53e3e' }}><TrashIcon /> Eliminar</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card data */}
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {/* Usuario */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#bbb', display: 'flex', flexShrink: 0 }}><UserIcon /></span>
                        <span style={{ fontSize: 12, color: '#6b7280', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.usuario || '—'}</span>
                        {a.usuario && (
                          <button onClick={() => copiar(a.usuario, `u-${a.id}`)} title="Copiar usuario" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiado === `u-${a.id}` ? '#4ade80' : '#bbb', padding: '1px', display: 'flex', flexShrink: 0 }}>
                            <CopyIcon />
                          </button>
                        )}
                      </div>
                      {/* Contraseña */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#bbb', display: 'flex', flexShrink: 0 }}><LockIcon /></span>
                        <span style={{ fontSize: 12, color: '#6b7280', flex: 1, letterSpacing: showPassRow[a.id] ? 0 : 1 }}>
                          {showPassRow[a.id] ? (a.contrasena || '—') : '•••••••'}
                        </span>
                        <button onClick={() => setShowPassRow(prev => ({ ...prev, [a.id]: !prev[a.id] }))} title="Mostrar/Ocultar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '1px', display: 'flex', flexShrink: 0 }}>
                          <EyeIcon open={showPassRow[a.id]} />
                        </button>
                        {a.contrasena && (
                          <button onClick={() => copiar(a.contrasena, `p-${a.id}`)} title="Copiar contraseña" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiado === `p-${a.id}` ? '#4ade80' : '#bbb', padding: '1px', display: 'flex', flexShrink: 0 }}>
                            <CopyIcon />
                          </button>
                        )}
                      </div>
                      {/* URL */}
                      {domain && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'flex', color: '#bbb', flexShrink: 0 }}><GlobeIcon /></span>
                          <span style={{ fontSize: 12, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</span>
                          <a href={a.url.startsWith('http') ? a.url : 'https://' + a.url} target="_blank" rel="noopener noreferrer" style={{ color: '#bbb', display: 'flex', flexShrink: 0 }}>
                            <ExternalIcon />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) cerrarModal(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#f5f5f7', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e0e0e6', background: '#fff', borderRadius: '14px 14px 0 0' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{editandoId ? 'Editar Acceso' : 'Nuevo Acceso'}</span>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {/* Nombre */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5 }}>Nombre del servicio *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Facebook Ads, Google Analytics" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              {/* URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5 }}>URL</label>
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              {/* Usuario + Contraseña */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5 }}>Usuario</label>
                  <input value={form.usuario} onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))} placeholder="usuario@email.com" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5 }}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input value={form.contrasena} onChange={e => setForm(p => ({ ...p, contrasena: e.target.value }))} type={showPassModal ? 'text' : 'password'} placeholder="••••••••" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 36px 10px 12px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                    <button onClick={() => setShowPassModal(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}>
                      <EyeIcon open={showPassModal} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Categoría */}
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5 }}>Categoría</label>
                <button onClick={() => setShowCatDrop(p => !p)} style={{ width: '100%', border: '2px solid #e53e3e', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1a1a2e', boxSizing: 'border-box' }}>
                  <span>{form.categoria}</span>
                  <ChevronIcon />
                </button>
                {showCatDrop && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #e0e0e6', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
                    {CATEGORIAS.map(cat => (
                      <button key={cat} onClick={() => { setForm(p => ({ ...p, categoria: cat })); setShowCatDrop(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: form.categoria === cat ? '#f8f8fa' : '#fff', cursor: 'pointer', fontSize: 13, color: '#1a1a2e', textAlign: 'left' }}>
                        {form.categoria === cat ? <CheckIcon /> : <span style={{ width: 14, display: 'inline-block' }} />}
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Notas */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5 }}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Información adicional..." rows={3} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #e0e0e6', background: '#fff', borderRadius: '0 0 14px 14px' }}>
              <button onClick={cerrarModal} style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' }}>Cancelar</button>
              <button onClick={guardar} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {editandoId ? 'Guardar cambios' : 'Crear Acceso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
