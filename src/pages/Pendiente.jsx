import { useAuth } from '../context/AuthContext';

export default function Pendiente() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--app-surface)', borderRadius: 18, padding: '44px 36px', maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', textAlign: 'center' }}>

        {/* Ícono */}
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', fontSize: 32 }}>
          ⏳
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 36, height: 36, background: '#e53e3e', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🐝</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--app-text)', letterSpacing: 0.3 }}>SINERGÉTICOS</div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--app-text)', margin: '0 0 10px' }}>
          Acceso pendiente
        </h2>
        <p style={{ fontSize: 14, color: 'var(--app-text-muted)', lineHeight: 1.6, margin: '0 0 8px' }}>
          Tu cuenta está registrada con:
        </p>
        <div style={{ background: 'var(--app-surface-2)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--app-text-2)', fontWeight: 600, marginBottom: 20, display: 'inline-block' }}>
          {user?.email}
        </div>
        <p style={{ fontSize: 13, color: 'var(--app-text-subtle)', lineHeight: 1.6, margin: '0 0 28px' }}>
          El administrador debe asignarte un rol antes de que puedas acceder a la app. Por favor espera a que te notifiquen.
        </p>

        <button
          onClick={signOut}
          style={{ width: '100%', padding: '12px', background: 'var(--app-surface-2)', color: 'var(--app-text-2)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
