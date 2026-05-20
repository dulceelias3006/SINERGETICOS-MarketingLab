import { useState } from 'react';

const PRECIOS = {
  MXN: { vip: 1000, vip2x1: 1500, club3: 9997, club6: 12997, club12: 14997 },
  USD: { vip: 59,   vip2x1: 99,   club3: 1499,  club6: 1799,  club12: 1999  },
};

const SHIFT_INIT = {
  asistencia: '', ventasVIP: '', ventasVIP2x1: '',
  venta3meses: '', venta6meses: '', venta12meses: '',
  apartados: '', montoApartados: '',
};

const RES_INIT = { mañana: { ...SHIFT_INIT }, tarde: { ...SHIFT_INIT } };

function loadRes(raw) {
  if (!raw) return RES_INIT;
  if (raw.mañana !== undefined || raw.tarde !== undefined) {
    return {
      mañana: { ...SHIFT_INIT, ...(raw.mañana || {}) },
      tarde:  { ...SHIFT_INIT, ...(raw.tarde  || {}) },
    };
  }
  // migrate old flat format → mañana
  return { mañana: { ...SHIFT_INIT, ...raw }, tarde: { ...SHIFT_INIT } };
}

function n(v) { return Number(v) || 0; }

function fmt(val, currency) {
  if (!val) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
}

function sumShifts(a, b) {
  return Object.fromEntries(
    Object.keys(SHIFT_INIT).map(k => [k, n(a[k]) + n(b[k])])
  );
}

function calcMetrics(shift, P) {
  const montoVIP    = n(shift.ventasVIP)    * P.vip;
  const montoVIP2x1 = n(shift.ventasVIP2x1) * P.vip2x1;
  const monto3m     = n(shift.venta3meses)  * P.club3;
  const monto6m     = n(shift.venta6meses)  * P.club6;
  const monto12m    = n(shift.venta12meses) * P.club12;
  const montoApt    = n(shift.montoApartados);
  const totalVIP    = montoVIP + montoVIP2x1;
  const totalClub   = monto3m + monto6m + monto12m + montoApt;
  const total       = totalVIP + totalClub;
  const cantVIP     = n(shift.ventasVIP) + n(shift.ventasVIP2x1);
  const cantClub    = n(shift.venta3meses) + n(shift.venta6meses) + n(shift.venta12meses) + n(shift.apartados);
  const cantTotal   = cantVIP + cantClub;
  return { montoVIP, montoVIP2x1, monto3m, monto6m, monto12m, montoApt, totalVIP, totalClub, total, cantVIP, cantClub, cantTotal };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionTitle({ label, accent }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
      color: accent ? '#e53e3e' : 'var(--app-text-subtle)',
      borderBottom: `2px solid ${accent ? '#e53e3e30' : 'var(--app-border-light)'}`,
      paddingBottom: 7, marginBottom: 10,
    }}>
      {label}
    </div>
  );
}

function InputRow({ label, subtitle, value, onChange, calc, currency, isAmt }) {
  const inp = {
    width: 80, background: 'var(--app-surface-2)', border: '1.5px solid var(--app-border)',
    borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600,
    color: 'var(--app-text)', outline: 'none', textAlign: 'right', boxSizing: 'border-box',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', alignItems: 'center', gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <input
        type="number" min="0" value={value} onChange={e => onChange(e.target.value)}
        placeholder="0" style={inp}
        onFocus={e => e.target.style.borderColor = '#e53e3e'}
        onBlur={e => e.target.style.borderColor = 'var(--app-border)'}
      />
      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: n(value) > 0 ? 'var(--app-text)' : '#d1d5db' }}>
        {isAmt ? fmt(n(value), currency) : (calc !== undefined ? fmt(calc, currency) : '')}
      </div>
    </div>
  );
}

function DisplayRow({ label, subtitle, qty, monto, currency }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', alignItems: 'center', gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: qty > 0 ? 'var(--app-text)' : '#d1d5db' }}>
        {qty > 0 ? qty.toLocaleString('es-MX') : '—'}
      </div>
      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: monto > 0 ? 'var(--app-text)' : '#d1d5db' }}>
        {monto > 0 ? fmt(monto, currency) : '—'}
      </div>
    </div>
  );
}

function Subtotal({ qty, monto, currency }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', borderRadius: 8, background: 'var(--app-surface-alt)', marginTop: 4,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>
        Subtotal {qty > 0 ? `(${qty.toLocaleString('es-MX')} ventas)` : ''}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{fmt(monto, currency)}</span>
    </div>
  );
}

function TotalRow({ label, qty, monto, currency, big }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: big ? '10px 12px' : '7px 12px',
      borderRadius: big ? 10 : 8,
      background: big ? '#e53e3e08' : 'transparent',
      border: big ? '1px solid #e53e3e20' : 'none',
    }}>
      <div>
        <div style={{ fontSize: big ? 13 : 12, fontWeight: big ? 800 : 600, color: big ? 'var(--app-text)' : 'var(--app-text-2)' }}>
          {label}
        </div>
        {qty !== undefined && (
          <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>
            {qty.toLocaleString('es-MX')} ventas
          </div>
        )}
      </div>
      <span style={{ fontSize: big ? 15 : 13, fontWeight: 800, color: big ? '#e53e3e' : 'var(--app-text)' }}>
        {typeof monto === 'string' ? monto : fmt(monto, currency)}
      </span>
    </div>
  );
}

// ── Form for mañana / tarde ─────────────────────────────────────────────────
function ShiftForm({ shift, setShift, P, currency }) {
  const set = (k, v) => setShift(p => ({ ...p, [k]: v }));
  const m = calcMetrics(shift, P);
  return (
    <div>
      <SectionTitle label="Asistencia" />
      <div style={{ marginBottom: 20 }}>
        <InputRow label="Total asistentes" value={shift.asistencia} onChange={v => set('asistencia', v)} currency={currency} />
      </div>

      <SectionTitle label="Ventas VIP" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <InputRow label="VIP" subtitle={`${fmt(P.vip, currency)} c/u`} value={shift.ventasVIP} onChange={v => set('ventasVIP', v)} calc={m.montoVIP} currency={currency} />
        <InputRow label="VIP 2x1" subtitle={`${fmt(P.vip2x1, currency)} c/u`} value={shift.ventasVIP2x1} onChange={v => set('ventasVIP2x1', v)} calc={m.montoVIP2x1} currency={currency} />
        {m.cantVIP > 0 && <Subtotal qty={m.cantVIP} monto={m.totalVIP} currency={currency} />}
      </div>

      <SectionTitle label="Ventas Club" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <InputRow label="Club 3 meses" subtitle={`${fmt(P.club3, currency)} c/u`} value={shift.venta3meses} onChange={v => set('venta3meses', v)} calc={m.monto3m} currency={currency} />
        <InputRow label="Club 6 meses" subtitle={`${fmt(P.club6, currency)} c/u`} value={shift.venta6meses} onChange={v => set('venta6meses', v)} calc={m.monto6m} currency={currency} />
        <InputRow label="Club 12 meses" subtitle={`${fmt(P.club12, currency)} c/u`} value={shift.venta12meses} onChange={v => set('venta12meses', v)} calc={m.monto12m} currency={currency} />
        <InputRow label="Apartados" subtitle="Cantidad" value={shift.apartados} onChange={v => set('apartados', v)} currency={currency} />
        <InputRow label="Monto apartados" subtitle="Total variable" value={shift.montoApartados} onChange={v => set('montoApartados', v)} isAmt currency={currency} />
        {m.cantClub > 0 && <Subtotal qty={m.cantClub} monto={m.totalClub} currency={currency} />}
      </div>

      {(m.cantTotal > 0 || n(shift.asistencia) > 0) && (
        <>
          <SectionTitle label="Resumen" accent />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {n(shift.asistencia) > 0 && <TotalRow label="Asistencia" monto={`${n(shift.asistencia).toLocaleString('es-MX')} personas`} currency={currency} />}
            {m.cantVIP > 0  && <TotalRow label="Total VIP"  qty={m.cantVIP}  monto={m.totalVIP}  currency={currency} />}
            {m.cantClub > 0 && <TotalRow label="Total Club" qty={m.cantClub} monto={m.totalClub} currency={currency} />}
            {m.cantTotal > 0 && <TotalRow label="Club + VIP" qty={m.cantTotal} monto={m.total} currency={currency} big />}
          </div>
        </>
      )}
    </div>
  );
}

// ── Total view (read-only sum) ──────────────────────────────────────────────
function TotalView({ mañana, tarde, P, currency, gasto }) {
  const total = sumShifts(mañana, tarde);
  const m  = calcMetrics(mañana, P);
  const t  = calcMetrics(tarde,  P);
  const tt = calcMetrics(total,  P);

  const roasClub  = tt.totalClub  > 0 && gasto > 0 ? (gasto / tt.totalClub  * 100) : null;
  const roasTotal = tt.total      > 0 && gasto > 0 ? (gasto / tt.total      * 100) : null;

  const hayData = tt.cantTotal > 0 || n(total.asistencia) > 0;

  if (!hayData) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--app-text-subtle)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 6 }}>Sin datos todavía</div>
        <div style={{ fontSize: 13 }}>Ingresa los resultados en las pestañas Mañana y Tarde.</div>
      </div>
    );
  }

  const ColHeader = ({ label }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', textAlign: 'right', letterSpacing: 0.4 }}>{label}</div>
  );

  return (
    <div>
      {/* Asistencia */}
      {(n(total.asistencia) > 0) && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle label="Asistencia" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <span />
            <ColHeader label="Mañana" />
            <ColHeader label="Tarde" />
            <ColHeader label="Total" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--app-text-2)' }}>Asistentes</span>
            <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(mañana.asistencia) > 0 ? n(mañana.asistencia).toLocaleString('es-MX') : '—'}</span>
            <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(tarde.asistencia) > 0 ? n(tarde.asistencia).toLocaleString('es-MX') : '—'}</span>
            <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{n(total.asistencia).toLocaleString('es-MX')}</span>
          </div>
        </div>
      )}

      {/* VIP */}
      {tt.cantVIP > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle label="Ventas VIP" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <span />
            <ColHeader label="Mañana" />
            <ColHeader label="Tarde" />
            <ColHeader label="Total" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['VIP',     'ventasVIP',    m.montoVIP,    t.montoVIP,    tt.montoVIP],
              ['VIP 2x1', 'ventasVIP2x1', m.montoVIP2x1, t.montoVIP2x1, tt.montoVIP2x1],
            ].map(([label, key, monM, monT, monTT]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>{fmt(P[key === 'ventasVIP' ? 'vip' : 'vip2x1'], currency)} c/u</div>
                </div>
                <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(mañana[key]) > 0 ? `${n(mañana[key])} · ${fmt(monM, currency)}` : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(tarde[key]) > 0 ? `${n(tarde[key])} · ${fmt(monT, currency)}` : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: (n(mañana[key]) + n(tarde[key])) > 0 ? 'var(--app-text)' : '#d1d5db' }}>{(n(mañana[key]) + n(tarde[key])) > 0 ? fmt(monTT, currency) : '—'}</span>
              </div>
            ))}
            <Subtotal qty={tt.cantVIP} monto={tt.totalVIP} currency={currency} />
          </div>
        </div>
      )}

      {/* Club */}
      {tt.cantClub > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle label="Ventas Club" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <span />
            <ColHeader label="Mañana" />
            <ColHeader label="Tarde" />
            <ColHeader label="Total" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['3 meses',    'venta3meses',   P.club3,  m.monto3m,  t.monto3m,  tt.monto3m],
              ['6 meses',    'venta6meses',   P.club6,  m.monto6m,  t.monto6m,  tt.monto6m],
              ['12 meses',   'venta12meses',  P.club12, m.monto12m, t.monto12m, tt.monto12m],
            ].map(([label, key, precio, monM, monT, monTT]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>{fmt(precio, currency)} c/u</div>
                </div>
                <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(mañana[key]) > 0 ? `${n(mañana[key])} · ${fmt(monM, currency)}` : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(tarde[key]) > 0 ? `${n(tarde[key])} · ${fmt(monT, currency)}` : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: (n(mañana[key]) + n(tarde[key])) > 0 ? 'var(--app-text)' : '#d1d5db' }}>{(n(mañana[key]) + n(tarde[key])) > 0 ? fmt(monTT, currency) : '—'}</span>
              </div>
            ))}
            {/* Apartados */}
            {(n(mañana.apartados) + n(tarde.apartados)) > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>Apartados</div>
                  <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>Monto variable</div>
                </div>
                <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(mañana.apartados) > 0 ? `${n(mañana.apartados)} · ${fmt(n(mañana.montoApartados), currency)}` : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(tarde.apartados) > 0 ? `${n(tarde.apartados)} · ${fmt(n(tarde.montoApartados), currency)}` : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: 'var(--app-text)' }}>{fmt(tt.montoApt, currency)}</span>
              </div>
            )}
            <Subtotal qty={tt.cantClub} monto={tt.totalClub} currency={currency} />
          </div>
        </div>
      )}

      {/* Resumen total */}
      {tt.cantTotal > 0 && (
        <>
          <SectionTitle label="Resumen total" accent />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tt.cantVIP  > 0 && <TotalRow label="Total VIP"  qty={tt.cantVIP}  monto={tt.totalVIP}  currency={currency} />}
            {tt.cantClub > 0 && <TotalRow label="Total Club" qty={tt.cantClub} monto={tt.totalClub} currency={currency} />}
            <TotalRow label="Club + VIP" qty={tt.cantTotal} monto={tt.total} currency={currency} big />
            {roasClub  !== null && <TotalRow label="ROAS Club"        monto={`${roasClub.toFixed(2)}%`}  currency={currency} />}
            {roasTotal !== null && <TotalRow label="ROAS Club + VIP"  monto={`${roasTotal.toFixed(2)}%`} currency={currency} />}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ResultadosDrawer({ evento, regiones, onClose, onSave }) {
  const isUSD    = evento.region === 'USA' || evento.region === 'CAN';
  const currency = isUSD ? 'USD' : 'MXN';
  const P        = PRECIOS[currency];

  const [res, setRes]     = useState(() => loadRes(evento.resultados));
  const [turno, setTurno] = useState('total');

  const setShift = (turnoKey) => (updater) =>
    setRes(p => ({ ...p, [turnoKey]: typeof updater === 'function' ? updater(p[turnoKey]) : updater }));

  const regionObj = regiones?.find(r => r.id === evento.region);
  const gasto     = evento.presupuestoGastado || 0;

  const TABS = [
    { key: 'total',   label: 'Total'  },
    { key: 'mañana',  label: 'Mañana' },
    { key: 'tarde',   label: 'Tarde'  },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '100vw',
        background: 'var(--app-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 0', borderBottom: '1px solid var(--app-border-light)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--app-text-subtle)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
                Resultados del evento
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--app-text)', lineHeight: 1.2 }}>{evento.nombre}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {regionObj && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: regionObj.color + '22', color: regionObj.color, borderRadius: 6, padding: '2px 8px' }}>
                    {regionObj.label}
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, background: isUSD ? '#2563eb18' : '#16a34a18', color: isUSD ? '#2563eb' : '#16a34a', borderRadius: 6, padding: '2px 8px' }}>
                  {currency}
                </span>
                {gasto > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>
                    Gasto: {fmt(gasto, currency)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--app-text-subtle)', lineHeight: 1, padding: '4px 6px' }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setTurno(tab.key)}
                style={{
                  padding: '9px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: turno === tab.key ? 700 : 500,
                  color: turno === tab.key ? '#e53e3e' : 'var(--app-text-muted)',
                  borderBottom: `2px solid ${turno === tab.key ? '#e53e3e' : 'transparent'}`,
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: -1,
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {turno === 'total' && (
            <TotalView mañana={res.mañana} tarde={res.tarde} P={P} currency={currency} gasto={gasto} />
          )}
          {turno === 'mañana' && (
            <ShiftForm shift={res.mañana} setShift={setShift('mañana')} P={P} currency={currency} />
          )}
          {turno === 'tarde' && (
            <ShiftForm shift={res.tarde} setShift={setShift('tarde')} P={P} currency={currency} />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--app-border-light)',
          flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {turno === 'total'
            ? <span style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>Vista de solo lectura · edita en Mañana o Tarde</span>
            : <span style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>Turno {turno}</span>
          }
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{ padding: '9px 18px', background: 'transparent', border: '1.5px solid var(--app-border)', borderRadius: 10, fontSize: 14, fontWeight: 500, color: 'var(--app-text-muted)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={() => onSave(evento.id, res)} disabled={turno === 'total'}
              style={{ padding: '9px 24px', background: turno === 'total' ? '#fca5a5' : '#e53e3e', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: turno === 'total' ? 'not-allowed' : 'pointer' }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
