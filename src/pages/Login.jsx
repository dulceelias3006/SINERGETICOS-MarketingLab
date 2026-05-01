import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo]           = useState('login');
  const [form, setForm]           = useState({ nombre: '', email: '', password: '' });
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [registrado, setRegistrado] = useState(false);

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password.trim()) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    if (modo === 'login') {
      const err = await signIn(form.email.trim(), form.password);
      if (err) setError('Correo o contraseña incorrectos.');
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
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '11px 14px', fontSize: 14, color: '#111827', outline: 'none',
    background: '#f9fafb', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  if (registrado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>¡Registro exitoso!</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
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
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 46, height: 46, background: '#e53e3e', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🐝</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: 0.3 }}>SINERGÉTICOS</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Marketing Lab</div>
          </div>
        </div>

        {/* Título */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
          {modo === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
        </h1>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 28px' }}>
          {modo === 'login' ? 'Ingresa con tu correo y contraseña' : 'Regístrate para solicitar acceso'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {modo === 'registro' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nombre completo</label>
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              autoFocus={modo === 'login'}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#e53e3e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#e53e3e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
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
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
          {modo === 'login' ? (
            <>¿No tienes cuenta?{' '}
              <button onClick={() => { setModo('registro'); setError(''); }} style={{ background: 'none', border: 'none', color: '#e53e3e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Regístrate
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{' '}
              <button onClick={() => { setModo('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#e53e3e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Inicia sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
