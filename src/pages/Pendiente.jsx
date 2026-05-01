import { useAuth } from '../context/AuthContext';

export default function Pendiente() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '44px 36px', maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', textAlign: 'center' }}>

        {/* Ícono */}
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: 32 }}>
          ⏳
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 36, height: 36, background: '#e53e3e', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🐝</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', letterSpacing: 0.3 }}>SINERGÉTICOS</div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
          Acceso pendiente
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: '0 0 8px' }}>
          Tu cuenta está registrada con:
        </p>
        <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 20, display: 'inline-block' }}>
          {user?.email}
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 28px' }}>
          El administrador debe asignarte un rol antes de que puedas acceder a la app. Por favor espera a que te notifiquen.
        </p>

        <button
          onClick={signOut}
          style={{ width: '100%', padding: '12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
