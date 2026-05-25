import { useState, useEffect } from 'react';
import { dbGet, dbSub } from '../lib/supabase';

const CAT_COLORES_INIT = {
  General:   '#6b7280',
  Reportes:  '#3b82f6',
  Campañas:  '#14b8a6',
  Diseño:    '#eab308',
  Analytics: '#8b5cf6',
};

function TipoIcon({ tipo, color }) {
  const c = color || '#3b82f6';
  const icons = {
    Archivo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    Excel:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,
    Imagen:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    Enlace:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    Web:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    Carpeta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  };
  return (
    <div style={{ width: 34, height: 34, borderRadius: 8, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icons[tipo] || icons.Enlace}
    </div>
  );
}

export default function EnlacesDrawer({ onClose }) {
  const [enlaces, setEnlaces]     = useState([]);
  const [catColores, setCatColores] = useState(CAT_COLORES_INIT);
  const [busqueda, setBusqueda]   = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([dbGet('enlaces'), dbGet('enlaces_catColores')]).then(([en, cc]) => {
      if (en)  setEnlaces(en);
      if (cc)  setCatColores({ ...CAT_COLORES_INIT, ...cc });
      setLoading(false);
    });
    const s1 = dbSub('enlaces',           v => { if (v) setEnlaces(v); });
    const s2 = dbSub('enlaces_catColores', v => { if (v) setCatColores(c => ({ ...c, ...v })); });
    return () => { s1.unsubscribe(); s2.unsubscribe(); };
  }, []);

  const filtrados = busqueda.trim()
    ? enlaces.filter(e => e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || e.url?.toLowerCase().includes(busqueda.toLowerCase()))
    : enlaces;

  const categorias = [...new Set(filtrados.map(e => e.categoria || 'General'))];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw', background: 'var(--app-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', zIndex: 1001, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--app-border-light)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--app-text-subtle)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>Acceso rápido</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)' }}>🔗 Enlaces</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--app-text-subtle)', lineHeight: 1, padding: '4px 6px' }}>×</button>
          </div>
          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--app-text-subtle)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar enlace..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid var(--app-border)', borderRadius: 8, fontSize: 13, color: 'var(--app-text)', background: 'var(--app-surface-2)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#e53e3e'}
              onBlur={e => e.target.style.borderColor = 'var(--app-border)'}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--app-text-subtle)', fontSize: 13 }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 13, color: 'var(--app-text-subtle)' }}>Sin resultados</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {categorias.map(cat => {
                const color = catColores[cat] || '#6b7280';
                const items = filtrados.filter(e => (e.categoria || 'General') === cat);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 0.6 }}>{cat}</span>
                      <span style={{ fontSize: 11, color: 'var(--app-text-subtle)', fontWeight: 500 }}>{items.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.map(e => (
                        <a key={e.id} href={e.url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--app-surface-alt)', borderRadius: 10, border: '1px solid var(--app-border-light)', textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = color + '66'; e.currentTarget.style.background = color + '08'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-border-light)'; e.currentTarget.style.background = 'var(--app-surface-alt)'; }}>
                          <TipoIcon tipo={e.tipo} color={color} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.url}</div>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
