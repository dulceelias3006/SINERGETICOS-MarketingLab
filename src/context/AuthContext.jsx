import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sb, dbGet, dbSet } from '../lib/supabase';

const AuthContext = createContext(null);
const SUPER_ADMIN_EMAIL = 'diriza@zigma3.com';
const AVATAR_COLORS = ['#9ca3af','#6b7280','#7c3aed','#2563eb','#0891b2','#16a34a','#ca8a04','#ea580c','#dc2626'];

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback(async (u) => {
    if (!u) { setRole(null); setLoading(false); return; }
    if (u.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
      setRole('superadmin'); setLoading(false); return;
    }
    const roles = await dbGet('user_roles') || {};
    setRole(roles[u.email?.toLowerCase()] || 'pending');
    setLoading(false);
  }, []);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      loadRole(u);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadRole(u);
    });
    return () => subscription.unsubscribe();
  }, [loadRole]);

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signUp(email, password, nombre) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (!error && data.user) {
      const emailLower = email.toLowerCase();
      // Guardar perfil
      const profiles = await dbGet('user_profiles') || {};
      profiles[data.user.id] = { nombre, email: emailLower };
      await dbSet('user_profiles', profiles);
      // Agregar a la lista de usuarios si no existe
      const usuarios = await dbGet('usuarios') || [];
      if (!usuarios.some(u => u.email?.toLowerCase() === emailLower)) {
        const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        usuarios.push({ id: Date.now(), nombre, email: emailLower, rol: null, avatarBg: color });
        await dbSet('usuarios', usuarios);
      }
      // Marcar como pendiente en user_roles
      const roles = await dbGet('user_roles') || {};
      if (!roles[emailLower]) {
        roles[emailLower] = 'pending';
        await dbSet('user_roles', roles);
      }
    }
    return error;
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  function can(action) {
    if (role === 'superadmin') return true;
    if (role === 'admin') {
      if (action === 'edit_asistencia') return false;
      return true;
    }
    if (role === 'editor') {
      if (action === 'edit_asistencia') return false;
      if (action === 'change_roles')    return false;
      if (action === 'add_users')       return false;
      if (action === 'delete_user')     return false;
      return true;
    }
    if (role === 'viewer') {
      if (action === 'add_ticket')    return true;
      if (action === 'view')          return true;
      return false;
    }
    return false;
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
