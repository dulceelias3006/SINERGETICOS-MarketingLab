import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Enlaces from './pages/Enlaces';
import Accesos from './pages/Accesos';
import Eventos from './pages/Eventos';
import Analiticas from './pages/Analiticas';
import Equipo from './pages/Equipo';
import Tickets from './pages/Tickets';
import Usuarios from './pages/Usuarios';

export default function App() {
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
      <div className="app-layout">

        {/* Backdrop mobile */}
        {isMobile && !collapsed && (
          <div onClick={() => setCollapsed(true)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 199 }} />
        )}

        <Sidebar collapsed={collapsed} isMobile={isMobile} onToggle={() => setCollapsed(c => !c)} />

        <main className="main-content">

          {/* Topbar — solo cuando el sidebar está colapsado */}
          {collapsed && (
            <div style={{
              height: 48,
              background: '#fff',
              borderBottom: '1px solid #e8e8ee',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 14,
              flexShrink: 0,
            }}>
              <button
                onClick={() => setCollapsed(false)}
                title="Mostrar sidebar"
                style={{
                  width: 30, height: 30,
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#111827'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="18" rx="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </button>
            </div>
          )}

          {/* Área scrolleable con el contenido de las páginas */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/enlaces" element={<Enlaces />} />
              <Route path="/accesos" element={<Accesos />} />
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/analiticas" element={<Analiticas />} />
              <Route path="/equipo" element={<Equipo />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Routes>
          </div>

        </main>
      </div>
    </BrowserRouter>
  );
}
