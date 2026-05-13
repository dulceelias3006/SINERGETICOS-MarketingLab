import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { dbGet, dbSet, dbSub } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const REGIONES = [
  { id: 'MEX',   label: 'MEX',       color: '#e53e3e' },
  { id: 'USA',   label: 'USA / CAN', color: '#4a9eff' },
  { id: 'LATAM', label: 'LATAM',     color: '#f59e0b' },
];

const DIAS_SEMANA = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

const DIAS_FULL = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

function getMondayISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function fmtActualizado(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const dm = new Date(d); dm.setHours(0, 0, 0, 0);
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (dm.getTime() === hoy.getTime()) return `hoy ${hora}`;
  if (dm.getTime() === ayer.getTime()) return `ayer ${hora}`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' ' + hora;
}

function nextEventDates(dias) {
  if (!dias || !dias.length) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  return dias
    .map(d => {
      let diff = d - todayDay;
      if (diff <= 0) diff += 7;
      const next = new Date(today);
      next.setDate(today.getDate() + diff);
      return { dia: d, fecha: next };
    })
    .sort((a, b) => a.fecha - b.fecha);
}

function SerieCard({ s, onAjustar, onEditar, onCerrar, editable }) {
  const [expandHist, setExpandHist] = useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [editGasto, setEditGasto] = useState(null);
  const [editReg, setEditReg] = useState(null);
  const gastoInputRef = useRef();
  const regInputRef = useRef();

  const sem = s.semana || {};
  const pct = sem.meta > 0 ? Math.min(100, Math.round((sem.registros || 0) / sem.meta * 100)) : 0;
  const gastadoPct = sem.presupuestoTotal > 0 ? Math.round((sem.presupuestoGastado || 0) / sem.presupuestoTotal * 100) : 0;
  const costoReg = sem.registros > 0 && sem.presupuestoGastado > 0
    ? Math.round(sem.presupuestoGastado / sem.registros) : null;
  const reg = REGIONES.find(r => r.id === s.region);

  function commitGasto() {
    const val = Math.max(0, Number(editGasto) || 0);
    onAjustar(s.id, 'presupuestoGastado', val - (sem.presupuestoGastado || 0));
    setEditGasto(null);
  }
  function commitReg() {
    const val = Math.max(0, Number(editReg) || 0);
    onAjustar(s.id, 'registros', val - (sem.registros || 0));
    setEditReg(null);
  }

  return (
    <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Header de la tarjeta */}
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--app-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--app-text)' }}>{s.nombre}</div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
            {reg && (
              <span style={{ fontSize: 10, fontWeight: 700, background: reg.color + '22', color: reg.color, borderRadius: 6, padding: '3px 7px' }}>
                {reg.label}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, background: s.estado === 'activo' ? '#4ade8022' : '#f59e0b22', color: s.estado === 'activo' ? '#16a34a' : '#d97706', borderRadius: 6, padding: '3px 7px' }}>
              {s.estado === 'activo' ? 'Activo' : 'Pausado'}
            </span>
            {editable && (
              <button onClick={() => onEditar(s)} title="Editar serie"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', padding: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--app-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginBottom: s.diasEvento?.length ? 6 : 0 }}>
          Semana del {fmtFecha(sem.inicio)}
          {s.historial?.length > 0 && <span style={{ marginLeft: 8 }}>· {s.historial.length} sem. anteriores</span>}
          {s.urlRegistro && (
            <a href={s.urlRegistro} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: '#4a9eff', textDecoration: 'none' }}>↗ Link</a>
          )}
        </div>
        {s.diasEvento?.length > 0 && (() => {
          const proximas = nextEventDates(s.diasEvento);
          return (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {proximas.map(({ dia, fecha }) => (
                <span key={dia} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: '#4a9eff18', color: '#4a9eff', borderRadius: 6, padding: '3px 8px' }}>
                  📅 {DIAS_FULL[dia]} {fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Stats */}
      <div style={{ padding: '14px 18px', flex: 1 }}>

        {/* Registros */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              👥 Registros ({pct}%)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {editable && (
                <button onClick={() => onAjustar(s.id, 'registros', -1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: 0 }}>−</button>
              )}
              {editReg !== null ? (
                <input
                  ref={regInputRef}
                  value={editReg}
                  onChange={e => setEditReg(e.target.value)}
                  onBlur={commitReg}
                  onKeyDown={e => { if (e.key === 'Enter') commitReg(); if (e.key === 'Escape') setEditReg(null); }}
                  style={{ width: 60, textAlign: 'center', border: '1px solid var(--app-border)', borderRadius: 6, padding: '2px 4px', fontSize: 13, fontWeight: 700, background: 'var(--app-surface)', color: 'var(--app-text)', outline: 'none' }}
                />
              ) : (
                <span
                  onClick={editable ? () => { setEditReg(String(sem.registros || 0)); setTimeout(() => regInputRef.current?.select(), 10); } : undefined}
                  title={editable ? 'Clic para editar' : undefined}
                  style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)', cursor: editable ? 'text' : 'default', minWidth: 24, textAlign: 'center' }}>
                  {(sem.registros || 0).toLocaleString('es-MX')}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>/ {(sem.meta || 0).toLocaleString('es-MX')}</span>
              {editable && (
                <button onClick={() => onAjustar(s.id, 'registros', 1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>
              )}
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--app-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22c55e' : '#facc15', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Row: VIP + Gasto + Costo/Reg */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>

          {/* VIP */}
          <div style={{ background: 'var(--app-surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginBottom: 4 }}>VIP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {editable && (
                <button onClick={() => onAjustar(s.id, 'vip', -1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 14, lineHeight: 1, padding: 0 }}>−</button>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)' }}>{sem.vip || 0}</span>
              {editable && (
                <button onClick={() => onAjustar(s.id, 'vip', 1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-subtle)', fontSize: 14, lineHeight: 1, padding: 0 }}>+</button>
              )}
            </div>
          </div>

          {/* Gasto */}
          <div style={{ background: 'var(--app-surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginBottom: 4 }}>Gastado</div>
            {editGasto !== null ? (
              <input
                ref={gastoInputRef}
                value={editGasto}
                onChange={e => setEditGasto(e.target.value)}
                onBlur={commitGasto}
                onKeyDown={e => { if (e.key === 'Enter') commitGasto(); if (e.key === 'Escape') setEditGasto(null); }}
                style={{ width: '100%', border: '1px solid var(--app-border)', borderRadius: 6, padding: '2px 4px', fontSize: 12, fontWeight: 700, background: 'var(--app-surface)', color: 'var(--app-text)', outline: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <div
                onClick={editable ? () => { setEditGasto(String(sem.presupuestoGastado || 0)); setTimeout(() => gastoInputRef.current?.select(), 10); } : undefined}
                title={editable ? 'Clic para editar' : undefined}
                style={{ cursor: editable ? 'text' : 'default' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: gastadoPct > 100 ? '#ef4444' : 'var(--app-text)' }}>
                  ${(sem.presupuestoGastado || 0).toLocaleString('es-MX')}
                </span>
                <span style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginLeft: 2 }}>({gastadoPct}%)</span>
              </div>
            )}
          </div>

          {/* Costo/Reg */}
          <div style={{ background: 'var(--app-surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--app-text-subtle)', marginBottom: 4 }}>Costo/Reg</div>
            <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              color: costoReg === null ? 'var(--app-text-subtle)'
                : costoReg < 50 ? '#16a34a'
                : costoReg < 120 ? '#f59e0b'
                : '#ef4444' }}>
              {costoReg === null ? '—' : `$${costoReg.toLocaleString('es-MX')}`}
            </div>
          </div>
        </div>

        {/* Botones + actualizado */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Reloj — historial */}
          <button onClick={() => setExpandHist(v => !v)} title={expandHist ? 'Ocultar historial' : 'Ver historial'}
            style={{ padding: '7px 10px', background: expandHist ? 'var(--app-border)' : 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 8, cursor: 'pointer', color: expandHist ? 'var(--app-text)' : 'var(--app-text-muted)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {s.historial?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{s.historial.length}</span>}
          </button>

          {/* Cerrar semana */}
          {editable && (
            confirmCerrar ? (
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                <button onClick={() => { onCerrar(s.id); setConfirmCerrar(false); }}
                  style={{ flex: 1, padding: '7px 0', background: '#22c55e', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  ✓ Confirmar
                </button>
                <button onClick={() => setConfirmCerrar(false)}
                  style={{ padding: '7px 10px', background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 8, fontSize: 12, color: 'var(--app-text-muted)', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmCerrar(true)}
                style={{ flex: 1, padding: '7px 0', background: '#e53e3e', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Cerrar semana
              </button>
            )
          )}
        </div>

        {/* Actualizado — pie derecho */}
        {s.updatedAt && (
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#c4c9d4', fontStyle: 'italic' }}>
              actualizado {fmtActualizado(s.updatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Historial expandible */}
      {expandHist && (
        <div style={{ borderTop: '1px solid var(--app-border)', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Semanas anteriores
          </div>
          {!s.historial?.length ? (
            <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', textAlign: 'center', padding: '10px 0' }}>
              Sin semanas cerradas aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.historial.map((h, i) => {
                const hPct = h.meta > 0 ? Math.round((h.registros || 0) / h.meta * 100) : 0;
                const hCosto = h.registros > 0 && h.presupuestoGastado > 0
                  ? Math.round(h.presupuestoGastado / h.registros) : null;
                return (
                  <div key={i} style={{ background: 'var(--app-surface-2)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-text)', marginBottom: 2 }}>
                        {fmtFecha(h.inicio)} → {fmtFecha(h.fin)}
                        {h.diasEvento?.length > 0 && (
                          <span style={{ marginLeft: 6, fontWeight: 400, color: '#4a9eff' }}>
                            · {h.diasEvento.map(d => DIAS_FULL[d]).join(' & ')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>
                        {(h.registros || 0).toLocaleString('es-MX')} reg · {h.vip || 0} VIP
                        {hCosto !== null && <span> · ${hCosto.toLocaleString('es-MX')}/reg</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0,
                      color: hPct >= 100 ? '#22c55e' : hPct >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {hPct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EventosDigitales = forwardRef(function EventosDigitales(_, ref) {
  const { can } = useAuth();
  const canSync = useRef(false);
  const [series, setSeries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', region: 'MEX', estado: 'activo', urlRegistro: '', divisa: 'MXN', meta: 0, presupuestoTotal: 0, diasEvento: [] });
  const [formError, setFormError] = useState(false);

  function saveSeries(next) {
    setSeries(next);
    localStorage.setItem('series_digitales', JSON.stringify(next));
    if (canSync.current) dbSet('series_digitales', next);
  }

  useEffect(() => {
    dbGet('series_digitales').then(v => {
      canSync.current = true;
      if (v !== null) {
        setSeries(v);
      } else {
        try {
          const local = JSON.parse(localStorage.getItem('series_digitales') || 'null');
          if (local) { setSeries(local); dbSet('series_digitales', local); }
        } catch {}
      }
    });
    const sub = dbSub('series_digitales', v => {
      if (v !== null) setSeries(p => JSON.stringify(p) === JSON.stringify(v) ? p : v);
    });
    return () => sub.unsubscribe();
  }, []);

  function abrir() {
    setEditandoId(null);
    setForm({ nombre: '', region: 'MEX', estado: 'activo', urlRegistro: '', divisa: 'MXN', meta: 0, presupuestoTotal: 0, diasEvento: [] });
    setFormError(false);
    setShowModal(true);
  }

  function abrirEditar(s) {
    setEditandoId(s.id);
    setForm({
      nombre: s.nombre,
      region: s.region || 'MEX',
      estado: s.estado || 'activo',
      urlRegistro: s.urlRegistro || '',
      divisa: s.divisa || 'MXN',
      meta: s.semana?.meta || 0,
      presupuestoTotal: s.semana?.presupuestoTotal || 0,
      diasEvento: s.diasEvento || [],
    });
    setFormError(false);
    setShowModal(true);
  }

  useImperativeHandle(ref, () => ({ abrir, generarPDF }));

  function guardar() {
    if (!form.nombre.trim()) { setFormError(true); return; }
    if (editandoId) {
      saveSeries(series.map(s => s.id === editandoId
        ? {
            ...s,
            updatedAt: Date.now(),
            nombre: form.nombre.trim(),
            region: form.region,
            estado: form.estado,
            urlRegistro: form.urlRegistro,
            divisa: form.divisa,
            diasEvento: form.diasEvento,
            semana: { ...s.semana, meta: Number(form.meta), presupuestoTotal: Number(form.presupuestoTotal) },
          }
        : s
      ));
    } else {
      saveSeries([...series, {
        id: Date.now(),
        nombre: form.nombre.trim(),
        region: form.region,
        estado: form.estado,
        urlRegistro: form.urlRegistro,
        divisa: form.divisa,
        diasEvento: form.diasEvento,
        semana: { inicio: getMondayISO(), registros: 0, meta: Number(form.meta), presupuestoTotal: Number(form.presupuestoTotal), presupuestoGastado: 0, vip: 0 },
        historial: [],
      }]);
    }
    setShowModal(false);
  }

  function eliminar(id) {
    if (confirm('¿Eliminar esta serie digital?')) {
      saveSeries(series.filter(s => s.id !== id));
      setShowModal(false);
    }
  }

  function ajustar(id, campo, delta) {
    saveSeries(series.map(s => s.id === id
      ? { ...s, updatedAt: Date.now(), semana: { ...s.semana, [campo]: Math.max(0, (s.semana?.[campo] || 0) + delta) } }
      : s
    ));
  }

  function cerrarSemana(id) {
    const s = series.find(x => x.id === id);
    if (!s) return;
    const fin = new Date().toISOString().split('T')[0];
    const fechasEvento = (s.diasEvento || []).map(d => {
      const prox = nextEventDates([d]);
      return prox[0] ? prox[0].fecha.toISOString().split('T')[0] : null;
    }).filter(Boolean);
    const entrada = {
      inicio: s.semana?.inicio || getMondayISO(),
      fin,
      diasEvento: s.diasEvento || [],
      fechasEvento,
      registros: s.semana?.registros || 0,
      meta: s.semana?.meta || 0,
      presupuestoTotal: s.semana?.presupuestoTotal || 0,
      presupuestoGastado: s.semana?.presupuestoGastado || 0,
      vip: s.semana?.vip || 0,
    };
    const nextD = new Date();
    nextD.setDate(nextD.getDate() + 1);
    const nextInicio = nextD.toISOString().split('T')[0];
    saveSeries(series.map(x => x.id === id
      ? {
          ...x,
          updatedAt: Date.now(),
          historial: [entrada, ...(x.historial || [])],
          semana: { inicio: nextInicio, registros: 0, meta: s.semana?.meta || 0, presupuestoTotal: s.semana?.presupuestoTotal || 0, presupuestoGastado: 0, vip: 0 },
        }
      : x
    ));
  }

  function generarPDF() {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const activas = series.filter(s => s.estado === 'activo');
    const totalReg  = activas.reduce((s, x) => s + (x.semana?.registros || 0), 0);
    const totalMeta = activas.reduce((s, x) => s + (x.semana?.meta || 0), 0);
    const totalVip  = activas.reduce((s, x) => s + (x.semana?.vip || 0), 0);
    const totalGasto = activas.reduce((s, x) => s + (x.semana?.presupuestoGastado || 0), 0);
    const pctGlobal = totalMeta > 0 ? Math.round(totalReg / totalMeta * 100) : 0;
    const pctColor = p => p >= 100 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626';

    const filas = activas.map(s => {
      const sem = s.semana || {};
      const pct = sem.meta > 0 ? Math.round((sem.registros || 0) / sem.meta * 100) : 0;
      const costo = sem.registros > 0 && sem.presupuestoGastado > 0
        ? Math.round(sem.presupuestoGastado / sem.registros) : null;
      const gastadoPct = sem.presupuestoTotal > 0
        ? Math.round((sem.presupuestoGastado || 0) / sem.presupuestoTotal * 100) : 0;
      const dias = (s.diasEvento || []).map(d => DIAS_FULL[d]).join(' & ') || '—';
      const reg = REGIONES.find(r => r.id === s.region);
      return `
        <tr>
          <td style="font-weight:600">${s.nombre}</td>
          <td><span style="font-size:10px;font-weight:700;background:${reg ? reg.color + '22' : '#f3f4f6'};color:${reg ? reg.color : '#6b7280'};padding:2px 7px;border-radius:5px">${s.region || '—'}</span></td>
          <td style="color:#6b7280">${dias}</td>
          <td style="color:#6b7280">${fmtFecha(sem.inicio)}</td>
          <td style="text-align:right;font-weight:600">${(sem.registros || 0).toLocaleString('es-MX')}</td>
          <td style="text-align:right;color:#6b7280">${(sem.meta || 0).toLocaleString('es-MX')}</td>
          <td style="text-align:right;font-weight:700;color:${pctColor(pct)}">${pct}%</td>
          <td style="text-align:right">${sem.vip || 0}</td>
          <td style="text-align:right">${(sem.presupuestoGastado || 0).toLocaleString('es-MX')} <span style="font-size:10px;color:#9ca3af">(${gastadoPct}%)</span></td>
          <td style="text-align:right;font-weight:700;color:${costo === null ? '#9ca3af' : costo < 50 ? '#16a34a' : costo < 120 ? '#d97706' : '#dc2626'};white-space:nowrap">${costo === null ? '—' : '$' + costo.toLocaleString('es-MX')}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Reporte Digitales</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, Arial, sans-serif; padding: 32px 36px; color: #111827; font-size: 13px; }
      h1 { font-size: 22px; font-weight: 800; margin-bottom: 3px; }
      .sub { font-size: 12px; color: #6b7280; margin-bottom: 28px; }
      .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
      .stat { background: #f5f6fa; border-radius: 10px; padding: 14px 16px; }
      .stat-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
      .stat-value { font-size: 20px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 8px 10px; font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
      td { padding: 10px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #111827; vertical-align: middle; }
      tr:last-child td { border-bottom: none; }
    </style></head><body>
    <h1>📡 Reporte Eventos Digitales</h1>
    <div class="sub">${hoyStr} · ${activas.length} serie${activas.length !== 1 ? 's' : ''} activa${activas.length !== 1 ? 's' : ''}</div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Series activas</div><div class="stat-value">${activas.length}</div></div>
      <div class="stat"><div class="stat-label">Registros totales</div><div class="stat-value">${totalReg.toLocaleString('es-MX')}</div></div>
      <div class="stat"><div class="stat-label">Meta total</div><div class="stat-value">${totalMeta.toLocaleString('es-MX')}</div></div>
      <div class="stat"><div class="stat-label">Avance global</div><div class="stat-value" style="color:${pctColor(pctGlobal)}">${pctGlobal}%</div></div>
      <div class="stat"><div class="stat-label">VIP total</div><div class="stat-value">${totalVip.toLocaleString('es-MX')}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Serie</th><th>Región</th><th>Días evento</th><th>Semana del</th>
        <th style="text-align:right">Registros</th><th style="text-align:right">Meta</th>
        <th style="text-align:right">%Reg</th><th style="text-align:right">VIP</th>
        <th style="text-align:right">Gastado</th><th style="text-align:right">Costo/Reg</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Activa las ventanas emergentes para exportar el PDF'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  const inp = {
    width: '100%', border: '1px solid var(--app-border)', borderRadius: 10,
    padding: '10px 14px', fontSize: 14, outline: 'none', background: 'var(--app-surface)',
    color: 'var(--app-text)', boxSizing: 'border-box',
  };

  const activasSeries = series.filter(s => s.estado === 'activo');
  const pausadasSeries = series.filter(s => s.estado === 'pausado');

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100%' }}>

      {series.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📡</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text)', marginBottom: 8 }}>Sin series digitales</div>
          <div style={{ fontSize: 13, color: 'var(--app-text-muted)', marginBottom: 28, maxWidth: 320, margin: '0 auto 28px' }}>
            Crea una serie para cada evento digital recurrente. Actualiza los datos semana a semana y ciérrala al terminar el ciclo.
          </div>
          {can('edit') && (
            <button onClick={abrir}
              style={{ padding: '11px 28px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Nueva Serie
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '20px 28px' }}>

          {/* Activas */}
          {activasSeries.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
                Activas · {activasSeries.length}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: pausadasSeries.length ? 28 : 0 }}>
                {activasSeries.map(s => (
                  <SerieCard key={s.id} s={s} onAjustar={ajustar} onEditar={abrirEditar} onCerrar={cerrarSemana} editable={can('edit')} />
                ))}
              </div>
            </>
          )}

          {/* Pausadas */}
          {pausadasSeries.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
                Pausadas · {pausadasSeries.length}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {pausadasSeries.map(s => (
                  <SerieCard key={s.id} s={s} onAjustar={ajustar} onEditar={abrirEditar} onCerrar={cerrarSemana} editable={can('edit')} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal nueva / editar serie */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'var(--app-surface)', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>
                {editandoId ? 'Editar serie' : 'Nueva serie digital'}
              </h2>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--app-text-subtle)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>
                  Nombre de la serie *
                </label>
                <input
                  value={form.nombre}
                  onChange={e => { setForm(p => ({ ...p, nombre: e.target.value })); setFormError(false); }}
                  placeholder="ej. Webinar MEX"
                  style={{ ...inp, border: formError ? '1px solid #ef4444' : '1px solid var(--app-border)' }}
                />
                {formError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>El nombre es obligatorio</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>Región</label>
                  <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} style={inp}>
                    <option value="">Sin región</option>
                    {REGIONES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>Estado</label>
                  <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={inp}>
                    <option value="activo">Activo</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>Meta semanal de registros</label>
                  <input type="number" min="0" value={form.meta} onChange={e => setForm(p => ({ ...p, meta: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>Presupuesto semanal</label>
                  <input type="number" min="0" value={form.presupuestoTotal} onChange={e => setForm(p => ({ ...p, presupuestoTotal: e.target.value }))} style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>Divisa</label>
                  <select value={form.divisa} onChange={e => setForm(p => ({ ...p, divisa: e.target.value }))} style={inp}>
                    <option>MXN</option>
                    <option>USD</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 6 }}>URL de registro</label>
                  <input value={form.urlRegistro} onChange={e => setForm(p => ({ ...p, urlRegistro: e.target.value }))} placeholder="https://..." style={inp} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text-2)', display: 'block', marginBottom: 8 }}>Día(s) del evento</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DIAS_SEMANA.map(d => {
                    const sel = form.diasEvento.includes(d.id);
                    return (
                      <button key={d.id} type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          diasEvento: sel ? p.diasEvento.filter(x => x !== d.id) : [...p.diasEvento, d.id],
                        }))}
                        style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${sel ? '#4a9eff' : 'var(--app-border)'}`, background: sel ? '#4a9eff18' : 'var(--app-surface-2)', color: sel ? '#4a9eff' : 'var(--app-text-muted)', fontSize: 13, fontWeight: sel ? 700 : 500, cursor: 'pointer' }}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: editandoId ? 'space-between' : 'flex-end' }}>
              {editandoId && (
                <button onClick={() => eliminar(editandoId)}
                  style={{ padding: '10px 16px', background: 'none', border: '1px solid #fca5a5', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Eliminar serie
                </button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--app-text-2)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={guardar}
                  style={{ padding: '10px 24px', background: '#e53e3e', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  {editandoId ? 'Guardar cambios' : 'Crear serie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default EventosDigitales;
