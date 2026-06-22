import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbGet, dbSub } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotifCtx = createContext({});
export const useNotificaciones = () => useContext(NotifCtx);

export function NotificacionesProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [badge, setBadge] = useState(0);
  const conocidosRef = useRef(new Set());
  const listoRef = useRef(false);

  useEffect(() => {
    const guardados = JSON.parse(localStorage.getItem('notif_conocidos') || '[]');
    conocidosRef.current = new Set(guardados);

    let sub;
    dbGet('agenda_eventos').then(evs => {
      if (Array.isArray(evs)) {
        evs.forEach(ev => conocidosRef.current.add(ev.id));
        guardar();
      }
      listoRef.current = true;
      sub = dbSub('agenda_eventos', handleCambio);
    });

    return () => sub?.unsubscribe?.();
  }, []);

  function guardar() {
    localStorage.setItem('notif_conocidos', JSON.stringify([...conocidosRef.current]));
  }

  function handleCambio(evs) {
    if (!listoRef.current || !Array.isArray(evs)) return;
    const emailMio = user?.email?.toLowerCase();
    const nuevos = evs.filter(ev =>
      !conocidosRef.current.has(ev.id) &&
      ev.creadoPor?.toLowerCase() !== emailMio
    );
    if (!nuevos.length) return;

    nuevos.forEach(ev => conocidosRef.current.add(ev.id));
    guardar();
    setBadge(prev => prev + nuevos.length);

    nuevos.forEach(ev => {
      const tid = `${ev.id}_t`;
      setToasts(prev => [...prev, { tid, titulo: ev.titulo, fecha: ev.fechaInicio }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.tid !== tid)), 5500);
    });
  }

  function marcarVisto() { setBadge(0); }

  function quitarToast(tid) { setToasts(prev => prev.filter(t => t.tid !== tid)); }

  return (
    <NotifCtx.Provider value={{ badge, marcarVisto }}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.tid}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderLeft: '4px solid #e53e3e', borderRadius: 12, padding: '13px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 280, maxWidth: 360, display: 'flex', alignItems: 'flex-start', gap: 10, pointerEvents: 'all' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📅</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', marginBottom: 2 }}>Nuevo evento en el Calendario</div>
                <div style={{ fontSize: 12, color: 'var(--app-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo} · {t.fecha}</div>
              </div>
              <button onClick={() => quitarToast(t.tid)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </NotifCtx.Provider>
  );
}
