import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbGet, dbSub } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotifCtx = createContext({});
export const useNotificaciones = () => useContext(NotifCtx);

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtFecha(iso, horaInicio, horaFin, todoElDia) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const hoy = new Date();
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const fmt = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const fechaLabel = iso === fmt(hoy) ? 'Hoy' : iso === fmt(manana) ? 'Mañana' : `${DIAS[dt.getDay()]} ${d} ${MESES[m - 1]}`;
  if (todoElDia) return `${fechaLabel} · Todo el día`;
  const hora = horaInicio ? `${horaInicio}${horaFin ? ' – ' + horaFin : ''}` : '';
  return hora ? `${fechaLabel} · ${hora}` : fechaLabel;
}

function clasificar(evs, ultimaVisita, emailMio) {
  const nuevos = [], modificados = [];
  evs.forEach(ev => {
    if (ev.id > ultimaVisita && ev.creadoPor?.toLowerCase() !== emailMio)
      nuevos.push({ ...ev, _tipo: 'nuevo' });
    else if (ev.lastUpdated && ev.lastUpdated > ultimaVisita && ev.modificadoPor?.toLowerCase() !== emailMio)
      modificados.push({ ...ev, _tipo: 'horario' });
  });
  return { nuevos, modificados };
}

export function NotificacionesProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [badge, setBadge] = useState(0);
  const listoRef = useRef(false);
  const emailMioRef = useRef(null);

  useEffect(() => {
    emailMioRef.current = user?.email?.toLowerCase() || null;
    const ultimaVisita = parseInt(localStorage.getItem('agenda_ultima_visita') || '0', 10);

    dbGet('agenda_eventos').then(evs => {
      if (Array.isArray(evs)) {
        const { nuevos, modificados } = clasificar(evs, ultimaVisita, emailMioRef.current);
        setBadge(nuevos.length + modificados.length);
      }
      listoRef.current = true;
    });

    const sub = dbSub('agenda_eventos', handleCambio);
    return () => sub?.unsubscribe?.();
  }, []);

  function handleCambio(evs) {
    if (!listoRef.current || !Array.isArray(evs)) return;
    const ultimaVisita = parseInt(localStorage.getItem('agenda_ultima_visita') || '0', 10);
    const ahora = Date.now();
    const { nuevos, modificados } = clasificar(evs, ultimaVisita, emailMioRef.current);

    setBadge(nuevos.length + modificados.length);

    nuevos.filter(ev => ahora - ev.id < 30000).forEach(ev => agregarToast({
      tid: `${ev.id}_n`,
      icono: '📅',
      titulo: 'Nuevo evento en el Calendario',
      autor: ev.creadoPorNombre || ev.creadoPor?.split('@')[0] || 'Alguien',
      eventoTitulo: ev.titulo,
      fecha: fmtFecha(ev.fechaInicio, ev.horaInicio, ev.horaFin, ev.todoElDia),
      descripcion: ev.descripcion || '',
      eventoId: ev.id,
    }));

    modificados.filter(ev => ahora - ev.lastUpdated < 30000).forEach(ev => agregarToast({
      tid: `${ev.id}_m`,
      icono: '🕐',
      titulo: 'Horario actualizado',
      autor: ev.modificadoPorNombre || ev.modificadoPor?.split('@')[0] || 'Alguien',
      eventoTitulo: ev.titulo,
      fecha: fmtFecha(ev.fechaInicio, ev.horaInicio, ev.horaFin, ev.todoElDia),
      descripcion: ev.descripcion || '',
      eventoId: ev.id,
    }));
  }

  function agregarToast(toast) {
    setToasts(prev => {
      if (prev.find(t => t.tid === toast.tid)) return prev;
      return [...prev, toast];
    });
    setTimeout(() => setToasts(prev => prev.filter(t => t.tid !== toast.tid)), 30000);
  }

  function marcarVisto() {
    localStorage.setItem('agenda_ultima_visita', String(Date.now()));
    setBadge(0);
  }

  function quitarToast(tid) {
    setToasts(prev => prev.filter(t => t.tid !== tid));
  }

  function irAEvento(toast) {
    quitarToast(toast.tid);
    navigate(`/agenda?evento=${toast.eventoId}`);
  }

  return (
    <NotifCtx.Provider value={{ badge, marcarVisto }}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.tid} onClick={() => irAEvento(t)}
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderLeft: '4px solid #e53e3e', borderRadius: 12, padding: '13px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: 320, display: 'flex', alignItems: 'flex-start', gap: 10, pointerEvents: 'all', cursor: 'pointer' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{t.icono}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e53e3e', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{t.titulo}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.eventoTitulo}</div>
                <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: t.descripcion ? 4 : 0 }}>
                  <span style={{ fontWeight: 600 }}>{t.autor}</span> · {t.fecha}
                </div>
                {t.descripcion && (
                  <div style={{ fontSize: 11, color: 'var(--app-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.descripcion}
                  </div>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); quitarToast(t.tid); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </NotifCtx.Provider>
  );
}
