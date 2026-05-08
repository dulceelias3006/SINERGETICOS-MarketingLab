import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGet } from '../lib/supabase';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo]             = useState('login');
  const [form, setForm]             = useState({ nombre: '', email: '', password: '' });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const [showPass, setShowPass]     = useState(false);

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const identifier = form.email.trim();
    if (!identifier || !form.password.trim()) { setError('Completa todos los campos.'); return; }
    setLoading(true);

    if (modo === 'login') {
      let emailToUse = identifier;
      if (!identifier.includes('@')) {
        // Buscar el correo asociado al nombre de usuario
        const profiles = await dbGet('user_profiles') || {};
        const match = Object.values(profiles).find(
          p => p.nombre?.toLowerCase() === identifier.toLowerCase()
        );
        if (!match) { setError('Usuario no encontrado. Intenta con tu correo.'); setLoading(false); return; }
        emailToUse = match.email;
      }
      const err = await signIn(emailToUse, form.password);
      if (err) setError('Usuario o contraseña incorrectos.');
    } else {
      if (!form.nombre.trim()) { setError('Ingresa tu nombre.'); setLoading(false); return; }
      if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setLoading(false); return; }
      const err = await signUp(form.email.trim(), form.password, form.nombre.trim());
      if (err) {
        if (err.message?.includes('already registered')) setError('Este correo ya está registrado. Inicia sesión.');
        else setError('Ocurrió un error. Intenta de nuevo.');
      } else {
        setRegistrado(true);
      }
    }
    setLoading(false);
  }

  const inp = {
    width: '100%', border: '1.5px solid var(--app-border)', borderRadius: 10,
    padding: '11px 14px', fontSize: 14, color: 'var(--app-text)', outline: 'none',
    background: 'var(--app-surface-alt)', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  if (registrado) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--app-surface)', borderRadius: 18, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--app-text)', margin: '0 0 10px' }}>¡Registro exitoso!</h2>
          <p style={{ fontSize: 14, color: 'var(--app-text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Tu cuenta fue creada con <strong>{form.email}</strong>.<br />
            El administrador necesita asignarte un rol antes de que puedas acceder a la app.
          </p>
          <button onClick={() => { setModo('login'); setRegistrado(false); setForm(p => ({ ...p, password: '' })); }}
            style={{ width: '100%', padding: '12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--app-surface)', borderRadius: 18, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 46, height: 46, background: '#e53e3e', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🐝</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--app-text)', letterSpacing: 0.3 }}>SINERGÉTICOS</div>
            <div style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>Marketing Lab</div>
          </div>
        </div>

        {/* Título */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)', margin: '0 0 4px' }}>
          {modo === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--app-text-subtle)', margin: '0 0 28px' }}>
          {modo === 'login' ? 'Ingresa con tu usuario o correo' : 'Regístrate para solicitar acceso'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {modo === 'registro' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Nombre completo</label>
              <input
                value={form.nombre}
                onChange={e => setField('nombre', e.target.value)}
                placeholder="Tu nombre"
                autoFocus={modo === 'registro'}
                style={inp}
                onFocus={e => e.target.style.borderColor = '#e53e3e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>
              {modo === 'login' ? 'Usuario o correo electrónico' : 'Correo electrónico'}
            </label>
            <input
              type={modo === 'login' ? 'text' : 'email'}
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder={modo === 'login' ? 'Tu nombre o correo@ejemplo.com' : 'correo@ejemplo.com'}
              autoFocus={modo === 'login'}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#e53e3e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
                style={{ ...inp, paddingRight: 42 }}
                onFocus={e => e.target.style.borderColor = '#e53e3e'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPass
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 4, width: '100%', padding: '13px', background: loading ? '#fca5a5' : '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {loading ? '...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {/* Cambiar modo */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--app-text-subtle)' }}>
          {modo === 'login' ? (
            <>¿No tienes cuenta?{' '}
              <button onClick={() => { setModo('registro'); setError(''); setShowPass(false); }} style={{ background: 'none', border: 'none', color: '#e53e3e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Regístrate
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{' '}
              <button onClick={() => { setModo('login'); setError(''); setShowPass(false); }} style={{ background: 'none', border: 'none', color: '#e53e3e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Inicia sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
