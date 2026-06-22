import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbGet, dbSub } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotifCtx = createContext({});
export const useNotificaciones = () => useContext(NotifCtx);

export function NotificacionesProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [badge, setBadge] = useState(0);
  const listoRef = useRef(false);
  const emailMioRef = useRef(null);

  useEffect(() => {
    emailMioRef.current = user?.email?.toLowerCase() || null;
    const ultimaVisita = parseInt(localStorage.getItem('agenda_ultima_visita') || '0', 10);

    dbGet('agenda_eventos').then(evs => {
      if (Array.isArray(evs)) {
        // Contar eventos creados después de la última visita por otros usuarios
        const perdidos = evs.filter(ev =>
          ev.id > ultimaVisita &&
          ev.creadoPor?.toLowerCase() !== emailMioRef.current
        );
        if (perdidos.length > 0) setBadge(perdidos.length);
      }
      listoRef.current = true;
    });

    const sub = dbSub('agenda_eventos', handleCambio);
    return () => sub?.unsubscribe?.();
  }, []);

  function handleCambio(evs) {
    if (!listoRef.current || !Array.isArray(evs)) return;
    const ultimaVisita = parseInt(localStorage.getItem('agenda_ultima_visita') || '0', 10);

    const nuevos = evs.filter(ev =>
      ev.id > ultimaVisita &&
      ev.creadoPor?.toLowerCase() !== emailMioRef.current
    );
    if (!nuevos.length) return;

    setBadge(nuevos.length);

    // Solo mostrar toasts para eventos recién creados (últimos 30 segundos)
    const ahora = Date.now();
    nuevos.filter(ev => ahora - ev.id < 30000).forEach(ev => {
      const tid = `${ev.id}_t`;
      setToasts(prev => {
        if (prev.find(t => t.tid === tid)) return prev;
        return [...prev, { tid, titulo: ev.titulo, fecha: ev.fechaInicio }];
      });
      setTimeout(() => setToasts(prev => prev.filter(t => t.tid !== tid)), 30000);
    });
  }

  function marcarVisto() {
    localStorage.setItem('agenda_ultima_visita', String(Date.now()));
    setBadge(0);
  }

  function quitarToast(tid) {
    setToasts(prev => prev.filter(t => t.tid !== tid));
  }

  return (
    <NotifCtx.Provider value={{ badge, marcarVisto }}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.tid} onClick={() => quitarToast(t.tid)}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderLeft: '4px solid #e53e3e', borderRadius: 12, padding: '13px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 280, maxWidth: 360, display: 'flex', alignItems: 'flex-start', gap: 10, pointerEvents: 'all', cursor: 'pointer' }}>
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
