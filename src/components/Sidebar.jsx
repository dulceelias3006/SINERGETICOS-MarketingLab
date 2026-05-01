import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IcoDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IcoLink = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IcoKey = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/>
  </svg>
);
const IcoCal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoBar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoTicket = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
  </svg>
);
const IcoUserGear = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <circle cx="19" cy="19" r="2"/><path d="M19 15v2M19 21v.01"/>
  </svg>
);
const IcoLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcoChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcoChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  editor:     'Editor',
  viewer:     'Viewer',
};

const navItems = [
  { path: '/',           label: 'Dashboard',  icon: <IcoDashboard />, end: true },
  { path: '/enlaces',    label: 'Enlaces',    icon: <IcoLink /> },
  { path: '/accesos',    label: 'Accesos',    icon: <IcoKey /> },
  { path: '/eventos',    label: 'Eventos',    icon: <IcoCal /> },
  { path: '/analiticas', label: 'Analíticas', icon: <IcoBar /> },
  { path: '/equipo',     label: 'Equipo',     icon: <IcoUsers /> },
  { path: '/tickets',    label: 'Tickets',    icon: <IcoTicket /> },
  { path: '/usuarios',   label: 'Usuarios',   icon: <IcoUserGear /> },
];

export default function Sidebar({ collapsed, isMobile, onToggle }) {
  const { user, role, signOut } = useAuth();

  const nombre = user?.email?.split('@')[0] || 'Usuario';
  const inicial = nombre[0]?.toUpperCase() || 'U';
  const roleLabel = ROLE_LABELS[role] || '';

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* Header */}
      <div style={{ padding: collapsed ? '20px 0 22px' : '20px 16px 22px', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: 44, height: 44, background: '#e53e3e', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          🐝
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f1f5', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>SINERGÉTICOS</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Marketing Lab</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            title={collapsed ? item.label : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 12, padding: collapsed ? '11px 0' : '11px 14px',
              margin: collapsed ? '2px 6px' : '2px 10px', borderRadius: 10,
              color: isActive ? '#ffffff' : '#9ca3af',
              background: isActive ? '#e53e3e' : 'transparent',
              textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
              transition: 'background 0.15s, color 0.15s', overflow: 'hidden', whiteSpace: 'nowrap',
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('e53e3e')) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('e53e3e')) e.currentTarget.style.background = 'transparent'; }}
          >
            {item.icon}
            {!collapsed && item.label}
          </NavLink>
        ))}

        {!isMobile && (
          <button
            onClick={onToggle}
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, padding: collapsed ? '10px 0' : '10px 14px',
              margin: collapsed ? '10px 6px 4px' : '10px 10px 4px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              width: collapsed ? 'calc(100% - 12px)' : 'calc(100% - 20px)',
              background: 'transparent', color: '#4b5563', fontSize: 13,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#9ca3af'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4b5563'; }}
          >
            {collapsed ? <IcoChevronRight /> : <><IcoChevronLeft /><span>Colapsar</span></>}
          </button>
        )}
      </nav>

      {/* Footer — usuario + logout */}
      <div style={{ padding: collapsed ? '14px 0' : '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {collapsed ? (
          <button
            onClick={signOut}
            title="Cerrar sesión"
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer' }}>
            {inicial}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {inicial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{roleLabel}</div>
            </div>
            <button
              onClick={signOut}
              title="Cerrar sesión"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
              <IcoLogout />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
