import { useState, useRef, useEffect } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { id: 'viewer', label: 'Viewer', color: 'var(--app-text-subtle)' },
  { id: 'editor', label: 'Editor', color: '#3b82f6' },
  { id: 'admin',  label: 'Admin',  color: '#e53e3e' },
];

const AVATAR_COLORS = [
  '#6b7280','#ef4444','#f97316','#eab308','#22c55e',
  '#14b8a6','#3b82f6','#6366f1','#8b5cf6','#ec4899',
  '#0891b2','#16a34a','#7c3aed','#dc2626','#1a1a2e',
];

const USUARIOS_DEFAULT = [
  { id: 1, nombre: 'Dulce Elias',    email: 'dulceelias3006@gmail.com', rol: 'editor', avatarBg: '#9ca3af' },
  { id: 2, nombre: 'David Iriza',    email: 'davidiriza@gmail.com',     rol: 'admin',  avatarBg: '#7c3aed' },
  { id: 3, nombre: 'D Iriza',        email: 'diriza@zigma3.com',        rol: 'admin',  avatarBg: '#6b7280' },
  { id: 4, nombre: 'Cinthia Robles', email: 'crobles@zigma3.com',       rol: 'admin',  avatarBg: '#6b7280' },
  { id: 5, nombre: 'saul david',     email: 'davimore.02@gmail.com',    rol: 'editor', avatarBg: '#9ca3af' },
  { id: 6, nombre: '',               email: 'saulmm@zigma3.com',        rol: 'editor', avatarBg: '#9ca3af' },
];

const FORM_INIT = { nombre: '', apellido: '', email: '', rol: 'viewer', password: '', password2: '' };

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoShield  = ({ color }) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoEye     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoChevron = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcoPencil  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoTrash   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IcoCheck   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoUsers   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoLock    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

// ── Role pill ─────────────────────────────────────────────────────────────────
function RolPill({ usuario, onCambiarRol, canChange }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  const btnRef = useRef(null);
  const rol = ROLES.find(r => r.id === usuario.rol) || ROLES[0];

  useEffect(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function handleOpen() {
    if (!canChange) return;
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen(o => !o);
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'var(--app-surface-alt)', border: `1.5px solid ${open ? '#e53e3e' : '#e5e7eb'}`, cursor: canChange ? 'pointer' : 'default', fontSize: 13, fontWeight: 500, color: 'var(--app-text-2)', transition: 'border-color 0.15s' }}>
        <IcoShield color={rol.color} />
        <IcoShield color={rol.color} />
        <span style={{ marginLeft: 2 }}>{rol.label}</span>
        {canChange ? <IcoChevron /> : <span style={{ color: '#d1d5db', marginLeft: 2 }}><IcoLock /></span>}
      </button>

      {open && canChange && (
        <div style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, background: 'var(--app-surface)', borderRadius: 10, border: '1px solid var(--app-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 9999, minWidth: 148, overflow: 'hidden' }}>
          {ROLES.map(r => {
            const selected = r.id === usuario.rol;
            return (
              <div key={r.id} onClick={() => { onCambiarRol(r.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: selected ? '#fef9f9' : 'transparent', fontSize: 13, fontWeight: selected ? 600 : 400, color: 'var(--app-text-2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected ? '#fef9f9' : 'transparent'; }}>
                {r.id === 'viewer' ? <IcoEye /> : <IcoShield color={r.color} />}
                <span style={{ flex: 1 }}>{r.label}</span>
                {selected && <IcoCheck />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Usuarios() {
  const { user, role, can, signUp } = useAuth();
  const [usuarios, setUsuarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuarios') || 'null') || USUARIOS_DEFAULT; }
    catch { return USUARIOS_DEFAULT; }
  });

  const [editandoId, setEditandoId]       = useState(null);
  const [editForm, setEditForm]           = useState({ nombre: '', apellido: '' });
  const [colorPickerId, setColorPickerId] = useState(null);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const [showModal, setShowModal]         = useState(false);
  const [nuevoForm, setNuevoForm]   = useState(FORM_INIT);
  const [formError, setFormError]   = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showPass, setShowPass]     = useState(false);

  const canSync = useRef(false);

  useEffect(() => {
    dbGet('usuarios').then(val => {
      canSync.current = true;
      if (val !== null) setUsuarios(val);
      else { let v; try { v = JSON.parse(localStorage.getItem('usuarios')||'null'); } catch {} dbSet('usuarios', v || USUARIOS_DEFAULT); }
    });
    const sub = dbSub('usuarios', v => setUsuarios(p => JSON.stringify(p)===JSON.stringify(v)?p:v));
    return () => sub.unsubscribe();
  }, []);

  function save(next) { setUsuarios(next); localStorage.setItem('usuarios', JSON.stringify(next)); if (canSync.current) dbSet('usuarios', next); }

  async function cambiarRolYSincronizar(id, nuevoRol) {
    const next = usuarios.map(u => u.id === id ? { ...u, rol: nuevoRol } : u);
    save(next);
    // Sincronizar también user_roles para el sistema de auth
    const usuario = usuarios.find(u => u.id === id);
    if (usuario?.email) {
      const roles = await dbGet('user_roles') || {};
      roles[usuario.email.toLowerCase()] = nuevoRol;
      await dbSet('user_roles', roles);
    }
  }

  function getIniciales(nombre) {
    if (!nombre?.trim()) return '?';
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  function abrirEditar(u) {
    const parts = (u.nombre || '').trim().split(/\s+/);
    setEditForm({ nombre: parts[0] || '', apellido: parts.slice(1).join(' ') || '' });
    setEditandoId(u.id);
  }

  function guardarNombre() {
    const nombre = `${editForm.nombre} ${editForm.apellido}`.trim();
    save(usuarios.map(u => u.id === editandoId ? { ...u, nombre } : u));
    setEditandoId(null);
  }

  function eliminar(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    save(usuarios.filter(u => u.id !== id));
  }

  function abrirModal() { setNuevoForm(FORM_INIT); setFormError(''); setFormLoading(false); setShowPass(false); setShowModal(true); }

  async function agregarUsuario() {
    if (!nuevoForm.email.trim()) { setFormError('El email es obligatorio.'); return; }
    if (!nuevoForm.password) { setFormError('La contraseña es obligatoria.'); return; }
    if (nuevoForm.password.length < 6) { setFormError('Mínimo 6 caracteres en la contraseña.'); return; }
    if (nuevoForm.password !== nuevoForm.password2) { setFormError('Las contraseñas no coinciden.'); return; }
    if (usuarios.some(u => u.email.toLowerCase() === nuevoForm.email.trim().toLowerCase())) {
      setFormError('Ya existe un usuario con ese email.');
      return;
    }
    setFormLoading(true);
    const nombre = `${nuevoForm.nombre} ${nuevoForm.apellido}`.trim();
    const error = await signUp(nuevoForm.email.trim(), nuevoForm.password, nombre);
    if (error) {
      setFormLoading(false);
      const msg = error.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setFormError('Este email ya tiene una cuenta registrada.');
      } else {
        setFormError(msg || 'Error al crear el usuario.');
      }
      return;
    }
    // signUp sets role to 'pending'; override with selected role
    const emailLower = nuevoForm.email.trim().toLowerCase();
    const roles = await dbGet('user_roles') || {};
    roles[emailLower] = nuevoForm.rol;
    await dbSet('user_roles', roles);
    const lista = await dbGet('usuarios') || [];
    await dbSet('usuarios', lista.map(u => u.email?.toLowerCase() === emailLower ? { ...u, rol: nuevoForm.rol } : u));
    setFormLoading(false);
    setShowModal(false);
  }

  const inp = { background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--app-text-2)', outline: 'none', width: 100 };
  const fInp = { width: '100%', background: 'var(--app-surface-alt)', border: '1.5px solid var(--app-border)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--app-text)', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ padding: '28px 32px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53e3e' }}>
          <IcoUsers />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>Usuarios</h1>
          <div style={{ fontSize: 13, color: 'var(--app-text-subtle)', marginTop: 2 }}>Administra los nombres y roles de los usuarios</div>
        </div>
        {can('add_users') && (
          <button onClick={abrirModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            + Agregar usuario
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ margin: '0 32px 32px', background: 'var(--app-surface)', borderRadius: 16, border: '1px solid var(--app-border-light)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `2fr 2fr 180px ${can('add_users') ? '76px' : '40px'}`, padding: '12px 24px', borderBottom: '1px solid var(--app-border-light)' }}>
          {['USUARIO', 'EMAIL', 'ROL', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textAlign: i === 2 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {usuarios.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--app-text-subtle)', fontSize: 14 }}>Sin usuarios</div>
        )}

        {usuarios.map(u => {
          const esYo    = u.email?.toLowerCase() === user?.email?.toLowerCase();
          const editando = editandoId === u.id;

          return (
            <div key={u.id}
              style={{ display: 'grid', gridTemplateColumns: `2fr 2fr 180px ${can('add_users') ? '76px' : '40px'}`, alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fafafa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

              {/* Avatar + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    onClick={e => {
                      if (!can('edit')) return;
                      if (colorPickerId === u.id) { setColorPickerId(null); return; }
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pickerW = 162; // 5 cols × 24px + gaps + padding
                      const pickerH = 112;
                      const left = rect.left + rect.width / 2 - pickerW / 2;
                      const spaceBelow = window.innerHeight - rect.bottom;
                      const top = spaceBelow >= pickerH + 8 ? rect.bottom + 6 : rect.top - pickerH - 6;
                      setColorPickerPos({ top, left: Math.max(8, Math.min(left, window.innerWidth - pickerW - 8)) });
                      setColorPickerId(u.id);
                    }}
                    title={can('edit') ? 'Cambiar color' : undefined}
                    style={{ width: 34, height: 34, borderRadius: '50%', background: u.avatarBg || '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', cursor: can('edit') ? 'pointer' : 'default' }}>
                    {u.avatarPhoto
                      ? <img src={u.avatarPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getIniciales(u.nombre)}
                  </div>
                </div>
                {editando ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input value={editForm.nombre} autoFocus onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" style={inp} />
                    <input value={editForm.apellido} onChange={e => setEditForm(p => ({ ...p, apellido: e.target.value }))} placeholder="Apellido" style={inp}
                      onKeyDown={e => { if (e.key === 'Enter') guardarNombre(); if (e.key === 'Escape') setEditandoId(null); }} />
                    <button onClick={guardarNombre} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4ade80', fontSize: 16 }}>✓</button>
                    <button onClick={() => setEditandoId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--app-text-subtle)', fontSize: 16 }}>×</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--app-text)' }}>
                    {u.nombre || <span style={{ color: 'var(--app-text-subtle)' }}>Sin nombre</span>}
                    {esYo && <span style={{ fontSize: 12, color: 'var(--app-text-subtle)', fontWeight: 400, marginLeft: 6 }}>(tú)</span>}
                  </span>
                )}
              </div>

              {/* Email */}
              <span style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>{u.email}</span>

              {/* Rol */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <RolPill usuario={u} onCambiarRol={rol => cambiarRolYSincronizar(u.id, rol)} canChange={can('change_roles') && !esYo} />
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                {!editando && can('edit') && (
                  <button onClick={() => abrirEditar(u)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, borderRadius: 6, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#6b7280'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; }}>
                    <IcoPencil />
                  </button>
                )}
                {can('delete_user') && !esYo && !editando && (
                  <button onClick={() => eliminar(u.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, borderRadius: 6, display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; }}>
                    <IcoTrash />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Color picker — posición fixed para no quedar cortado */}
      {colorPickerId !== null && (() => {
        const u = usuarios.find(x => x.id === colorPickerId);
        if (!u) return null;
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setColorPickerId(null)} />
            <div style={{ position: 'fixed', top: colorPickerPos.top, left: colorPickerPos.left, background: 'var(--app-surface)', borderRadius: 12, border: '1px solid var(--app-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 10, zIndex: 999, display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: 6 }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => { save(usuarios.map(x => x.id === u.id ? { ...x, avatarBg: c } : x)); setColorPickerId(null); }}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: (u.avatarBg || '#9ca3af') === c ? '3px solid #111827' : '2px solid transparent', outline: (u.avatarBg || '#9ca3af') === c ? '2px solid #fff' : 'none', cursor: 'pointer', boxSizing: 'border-box' }} />
              ))}
            </div>
          </>
        );
      })()}

      {/* Add user modal */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 18, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

            {/* Modal header */}
            <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--app-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text)' }}>Agregar usuario</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--app-text-subtle)', lineHeight: 1 }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 6 }}>Nombre</div>
                  <input value={nuevoForm.nombre} onChange={e => setNuevoForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre" style={fInp} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 6 }}>Apellido</div>
                  <input value={nuevoForm.apellido} onChange={e => setNuevoForm(p => ({ ...p, apellido: e.target.value }))}
                    placeholder="Apellido" style={fInp} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 6 }}>Email <span style={{ color: '#ef4444' }}>*</span></div>
                <input value={nuevoForm.email} onChange={e => { setNuevoForm(p => ({ ...p, email: e.target.value })); setFormError(''); }}
                  placeholder="correo@ejemplo.com" type="email" style={{ ...fInp }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 6 }}>Contraseña <span style={{ color: '#ef4444' }}>*</span></div>
                  <div style={{ position: 'relative' }}>
                    <input value={nuevoForm.password} onChange={e => { setNuevoForm(p => ({ ...p, password: e.target.value })); setFormError(''); }}
                      placeholder="Mín. 6 caracteres" type={showPass ? 'text' : 'password'} style={{ ...fInp, paddingRight: 36 }} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 0 }}>
                      {showPass
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 6 }}>Confirmar <span style={{ color: '#ef4444' }}>*</span></div>
                  <input value={nuevoForm.password2} onChange={e => { setNuevoForm(p => ({ ...p, password2: e.target.value })); setFormError(''); }}
                    placeholder="Repite la contraseña" type={showPass ? 'text' : 'password'} style={{ ...fInp }} />
                </div>
              </div>
              {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#dc2626' }}>{formError}</div>}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 6 }}>Rol</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => setNuevoForm(p => ({ ...p, rol: r.id }))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 10, border: `2px solid ${nuevoForm.rol === r.id ? r.color : '#e5e7eb'}`, background: nuevoForm.rol === r.id ? r.color + '12' : '#f9fafb', cursor: 'pointer', fontSize: 13, fontWeight: nuevoForm.rol === r.id ? 700 : 500, color: nuevoForm.rol === r.id ? r.color : '#6b7280', transition: 'all 0.15s' }}>
                      {r.id === 'viewer' ? <IcoEye /> : <IcoShield color={nuevoForm.rol === r.id ? r.color : '#9ca3af'} />}
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--app-border-light)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', background: 'transparent', border: '1.5px solid var(--app-border)', borderRadius: 10, fontSize: 14, fontWeight: 500, color: 'var(--app-text-muted)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={agregarUsuario} disabled={formLoading}
                style={{ padding: '9px 20px', background: formLoading ? '#fca5a5' : '#e53e3e', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', cursor: formLoading ? 'not-allowed' : 'pointer' }}>
                {formLoading ? 'Creando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
