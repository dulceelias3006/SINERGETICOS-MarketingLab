const PRECIOS = {
  MXN: { vip: 1000, vip2x1: 1500, club3: 9997, club6: 12997, club12: 14997 },
  USD: { vip: 59,   vip2x1: 99,   club3: 1499,  club6: 1799,  club12: 1999  },
};

function n(v) { return Number(v) || 0; }

function fmt(val, currency) {
  if (!val) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function Block({ title, children }) {
  return (
    <div style={{ background: 'var(--app-surface-alt)', borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: 'var(--app-text-subtle)', marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}

function LineRow({ label, qty, monto, currency, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--app-text-2)' }}>
        {label}{qty > 0 ? <span style={{ fontWeight: 700 }}> ×{qty}</span> : ''}
      </span>
      <span style={{ fontSize: 12, fontWeight: bold ? 800 : 700, color: bold ? '#e53e3e' : 'var(--app-text)' }}>{fmt(monto, currency)}</span>
    </div>
  );
}

function Divider({ label, qty, monto, currency }) {
  return (
    <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: 6, marginTop: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>{qty} ventas</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{fmt(monto, currency)}</span>
    </div>
  );
}

export default function ResultadoCard({ ev, regiones, onEdit }) {
  const isUSD    = ev.region === 'USA' || ev.region === 'CAN';
  const currency = isUSD ? 'USD' : 'MXN';
  const P        = PRECIOS[currency];
  const regionObj = regiones?.find(r => r.id === ev.region);
  const gasto     = ev.presupuestoGastado || 0;

  const res    = ev.resultados || {};
  const mañana = res.mañana || {};
  const tarde  = res.tarde  || {};

  // Asistencia
  const totalAsistencia    = n(mañana.asistencia)    + n(tarde.asistencia);
  const totalAsistenciaVIP = n(mañana.asistenciaVIP) + n(tarde.asistenciaVIP);
  const pctAsistencia      = ev.registrosActuales > 0 && totalAsistencia > 0
    ? +(totalAsistencia / ev.registrosActuales * 100).toFixed(1) : null;

  // Club
  const cant3m  = n(mañana.venta3meses)  + n(tarde.venta3meses);
  const cant6m  = n(mañana.venta6meses)  + n(tarde.venta6meses);
  const cant12m = n(mañana.venta12meses) + n(tarde.venta12meses);
  const monto3m  = cant3m  * P.club3;
  const monto6m  = cant6m  * P.club6;
  const monto12m = cant12m * P.club12;
  const allApts  = [...(mañana.apartados || []), ...(tarde.apartados || [])];
  const montoApt = allApts.reduce((s, a) => s + n(a.monto) * n(a.cantidad), 0);
  const cantApt  = allApts.reduce((s, a) => s + n(a.cantidad), 0);
  const totalClub = monto3m + monto6m + monto12m + montoApt;
  const cantClub  = cant3m + cant6m + cant12m + cantApt;

  // VIP
  const ventasVIP    = n(res.ventasVIP);
  const ventasVIP2x1 = n(res.ventasVIP2x1);
  const montoVIP     = ventasVIP    * P.vip;
  const montoVIP2x1  = ventasVIP2x1 * P.vip2x1;
  const totalVIP     = montoVIP + montoVIP2x1;
  const cantVIP      = ventasVIP + ventasVIP2x1;

  const totalGeneral = totalClub + totalVIP;
  const cantTotal    = cantClub + cantVIP;

  const roasClub  = gasto > 0 && totalClub    > 0 ? totalClub    / gasto : null;
  const roasTotal = gasto > 0 && totalGeneral  > 0 ? totalGeneral / gasto : null;

  const hasResults = totalAsistencia > 0 || cantVIP > 0 || cantClub > 0;

  const fechaFmt = ev.fecha
    ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ padding: '13px 15px 12px', borderBottom: '1px solid var(--app-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Completado · Presencial</span>
              </div>
              {regionObj && <span style={{ fontSize: 10, fontWeight: 700, background: regionObj.color + '22', color: regionObj.color, borderRadius: 5, padding: '2px 7px' }}>{regionObj.label}</span>}
              <span style={{ fontSize: 10, fontWeight: 700, background: isUSD ? '#2563eb18' : '#16a34a18', color: isUSD ? '#2563eb' : '#16a34a', borderRadius: 5, padding: '2px 7px' }}>{currency}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)', marginBottom: 5 }}>{ev.nombre}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {fechaFmt && <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>📅 {fechaFmt}</span>}
              {ev.ubicacion && <span style={{ fontSize: 11, color: 'var(--app-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>📍 {ev.ubicacion}</span>}
            </div>
          </div>
          <button onClick={() => onEdit(ev)} data-tooltip="Editar resultados"
            style={{ padding: '6px 8px', background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 8, cursor: 'pointer', color: 'var(--app-text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#e53e3e'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--app-surface-2)'; e.currentTarget.style.color = 'var(--app-text-subtle)'; e.currentTarget.style.borderColor = 'var(--app-border)'; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {!hasResults ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 4 }}>Sin resultados registrados</div>
          <div style={{ fontSize: 12, color: 'var(--app-text-subtle)', marginBottom: 16 }}>Aún no se han ingresado datos para este evento.</div>
          <button onClick={() => onEdit(ev)}
            style={{ padding: '8px 18px', background: '#e53e3e', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            Ingresar resultados
          </button>
        </div>
      ) : (
        <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Asistencia */}
          {totalAsistencia > 0 && (
            <Block title="Asistencia">
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: pctAsistencia !== null ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--app-text)', lineHeight: 1 }}>{totalAsistencia.toLocaleString('es-MX')}</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 2 }}>personas</div>
                </div>
                {totalAsistenciaVIP > 0 && (
                  <div style={{ textAlign: 'right', paddingBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text-2)' }}>{totalAsistenciaVIP.toLocaleString('es-MX')} VIP</div>
                    <div style={{ fontSize: 10, color: 'var(--app-text-subtle)' }}>incluidas en total</div>
                  </div>
                )}
              </div>
              {pctAsistencia !== null && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>de {(ev.registrosActuales || 0).toLocaleString('es-MX')} registros</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#e53e3e' }}>{pctAsistencia}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--app-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, pctAsistencia)}%`, background: 'linear-gradient(90deg, #e53e3e, #fc8181)', borderRadius: 3 }} />
                  </div>
                </div>
              )}
            </Block>
          )}

          {/* VIP + Club — lado a lado si ambos existen */}
          {(cantVIP > 0 || cantClub > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: cantVIP > 0 && cantClub > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>

              {cantVIP > 0 && (
                <Block title="Ventas VIP">
                  {ventasVIP    > 0 && <LineRow label="VIP"    qty={ventasVIP}    monto={montoVIP}    currency={currency} />}
                  {ventasVIP2x1 > 0 && <LineRow label="2×1"   qty={ventasVIP2x1} monto={montoVIP2x1} currency={currency} />}
                  <Divider qty={cantVIP} monto={totalVIP} currency={currency} />
                </Block>
              )}

              {cantClub > 0 && (
                <Block title="Ventas Club">
                  {cant3m  > 0 && <LineRow label="3 meses"  qty={cant3m}  monto={monto3m}  currency={currency} />}
                  {cant6m  > 0 && <LineRow label="6 meses"  qty={cant6m}  monto={monto6m}  currency={currency} />}
                  {cant12m > 0 && <LineRow label="12 meses" qty={cant12m} monto={monto12m} currency={currency} />}
                  {cantApt > 0 && <LineRow label="Apartados" qty={cantApt} monto={montoApt} currency={currency} />}
                  <Divider qty={cantClub} monto={totalClub} currency={currency} />
                </Block>
              )}
            </div>
          )}

          {/* Resumen + ROAS */}
          {cantTotal > 0 && (
            <div style={{ background: '#e53e3e08', border: '1px solid #e53e3e18', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: roasClub !== null || roasTotal !== null ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>Total ventas</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{cantTotal} ventas · Gasto: {fmt(gasto, currency)}</div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#e53e3e' }}>{fmt(totalGeneral, currency)}</div>
              </div>
              {(roasClub !== null || roasTotal !== null) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {roasClub !== null && (
                    <div style={{ flex: 1, background: 'var(--app-surface)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.4, marginBottom: 2 }}>ROAS Club</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--app-text)' }}>{roasClub.toFixed(2)}x</div>
                    </div>
                  )}
                  {roasTotal !== null && (
                    <div style={{ flex: 1, background: 'var(--app-surface)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', letterSpacing: 0.4, marginBottom: 2 }}>ROAS Total</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--app-text)' }}>{roasTotal.toFixed(2)}x</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
