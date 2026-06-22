import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Enlaces from './pages/Enlaces';
import Accesos from './pages/Accesos';
import Eventos from './pages/Eventos';
import Analiticas from './pages/Analiticas';
import Equipo from './pages/Equipo';
import Tickets from './pages/Tickets';
import Agenda from './pages/Agenda';
import { NotificacionesProvider } from './context/NotificacionesContext';
import Usuarios from './pages/Usuarios';
import Login from './pages/Login';
import Pendiente from './pages/Pendiente';

function NuevaContrasena() {
  const { updatePassword, setRecoveryMode } = useAuth();
  const [pass, setPass]       = useState('');
  const [pass2, setPass2]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk]           = useState(false);
  const inp = { width: '100%', border: '1.5px solid var(--app-border)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'var(--app-text)', outline: 'none', background: 'var(--app-surface-alt)', boxSizing: 'border-box', fontFamily: 'inherit' };
  async function handleSubmit(e) {
    e.preventDefault();
    if (pass.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    if (pass !== pass2) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    const err = await updatePassword(pass);
    setLoading(false);
    if (err) setError('Error al actualizar. Intenta de nuevo.');
    else setOk(true);
  }
  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--app-surface)', borderRadius: 18, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 46, height: 46, background: '#e53e3e', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🐝</div>
          <div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--app-text)' }}>SINERGÉTICOS</div><div style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>Marketing Lab</div></div>
        </div>
        {ok ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--app-text)', margin: '0 0 10px' }}>¡Contraseña actualizada!</h2>
            <p style={{ fontSize: 14, color: 'var(--app-text-muted)', margin: '0 0 24px' }}>Ya puedes usar tu nueva contraseña para iniciar sesión.</p>
            <button onClick={() => setRecoveryMode(false)} style={{ width: '100%', padding: '12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Continuar</button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)', margin: '0 0 4px' }}>Nueva contraseña</h1>
            <p style={{ fontSize: 14, color: 'var(--app-text-subtle)', margin: '0 0 28px' }}>Elige una contraseña segura para tu cuenta.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Nueva contraseña</label>
                <input type="password" value={pass} onChange={e => { setPass(e.target.value); setError(''); }} placeholder="Mínimo 6 caracteres" autoFocus style={inp} onFocus={e => e.target.style.borderColor='#e53e3e'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Confirmar contraseña</label>
                <input type="password" value={pass2} onChange={e => { setPass2(e.target.value); setError(''); }} placeholder="Repite tu contraseña" style={inp} onFocus={e => e.target.style.borderColor='#e53e3e'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ marginTop: 4, width: '100%', padding: '13px', background: loading ? '#fca5a5' : '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AppContent() {
  const { user, role, loading, recoveryMode } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)' }}>
        <div style={{ width: 46, height: 46, background: '#e53e3e', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🐝</div>
      </div>
    );
  }

  if (recoveryMode) return <NuevaContrasena />;
  if (!user) return <Login />;
  if (role === 'pending' || role === null) return <Pendiente />;

  return <AppAutenticado role={role} />;
}

function AppAutenticado({ role }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [collapsed, setCollapsed] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (windowWidth <= 768) setCollapsed(true);
  }, [windowWidth]);

  const isMobile = windowWidth <= 768;

  return (
    <BrowserRouter>
      <NotificacionesProvider>
      <div className="app-layout">
        {isMobile && !collapsed && (
          <div onClick={() => setCollapsed(true)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 199 }} />
        )}

        <Sidebar collapsed={collapsed} isMobile={isMobile} onToggle={() => setCollapsed(c => !c)} />

        <main className="main-content">
          <div style={{ height: 48, background: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', paddingLeft: 14, flexShrink: 0 }}>
            <button
              onClick={() => setCollapsed(c => !c)}
              data-tooltip={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#111827'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/enlaces"   element={<Enlaces />} />
              <Route path="/accesos"   element={<Accesos />} />
              <Route path="/eventos"   element={<Eventos />} />
              <Route path="/analiticas" element={<Analiticas />} />
              <Route path="/equipo"    element={role === 'viewer' ? <Dashboard /> : <Equipo />} />
              <Route path="/tickets"   element={<Tickets />} />
              <Route path="/agenda"    element={<Agenda />} />
              <Route path="/usuarios"  element={(role === 'admin' || role === 'superadmin') ? <Usuarios /> : <Dashboard />} />
            </Routes>
          </div>
        </main>
      </div>
      </NotificacionesProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
