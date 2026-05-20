import { useState } from 'react';

const PRECIOS = {
  MXN: { vip: 1000, vip2x1: 1500, club3: 9997, club6: 12997, club12: 14997 },
  USD: { vip: 59,   vip2x1: 99,   club3: 1499,  club6: 1799,  club12: 1999  },
};

const RES_INIT = {
  asistencia: '', ventasVIP: '', ventasVIP2x1: '',
  venta3meses: '', venta6meses: '', venta12meses: '',
  apartados: '', montoApartados: '',
};

function n(v) { return Number(v) || 0; }

function fmt(val, currency) {
  if (!val) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
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

function Subtotal({ label, qty, monto, currency }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', borderRadius: 8, background: 'var(--app-surface-alt)',
      marginTop: 4,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>
        Subtotal {qty > 0 ? `(${qty.toLocaleString('es-MX')} ventas)` : ''}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{fmt(monto, currency)}</span>
    </div>
  );
}

function TotalRow({ label, qty, monto, currency, big, highlight }) {
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function ResultadosDrawer({ evento, regiones, onClose, onSave }) {
  const isUSD   = evento.region === 'USA' || evento.region === 'CAN';
  const currency = isUSD ? 'USD' : 'MXN';
  const P       = PRECIOS[currency];

  const [res, setRes] = useState({ ...RES_INIT, ...(evento.resultados || {}) });
  const set = (k, v) => setRes(p => ({ ...p, [k]: v }));

  // Calculated values
  const montoVIP    = n(res.ventasVIP)    * P.vip;
  const montoVIP2x1 = n(res.ventasVIP2x1) * P.vip2x1;
  const monto3m     = n(res.venta3meses)  * P.club3;
  const monto6m     = n(res.venta6meses)  * P.club6;
  const monto12m    = n(res.venta12meses) * P.club12;
  const montoApt    = n(res.montoApartados);

  const totalVIP  = montoVIP + montoVIP2x1;
  const totalClub = monto3m + monto6m + monto12m + montoApt;
  const total     = totalVIP + totalClub;

  const cantVIP  = n(res.ventasVIP) + n(res.ventasVIP2x1);
  const cantClub = n(res.venta3meses) + n(res.venta6meses) + n(res.venta12meses) + n(res.apartados);
  const cantTotal = cantVIP + cantClub;

  const gasto = evento.presupuestoGastado || 0;
  const roasClub  = totalClub  > 0 ? (gasto / totalClub  * 100) : null;
  const roasTotal = total       > 0 ? (gasto / total       * 100) : null;

  const regionObj = regiones?.find(r => r.id === evento.region);
  const hayData   = cantTotal > 0 || n(res.asistencia) > 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100vw',
        background: 'var(--app-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--app-border-light)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Asistencia */}
          <SectionTitle label="Asistencia" />
          <div style={{ marginBottom: 20 }}>
            <InputRow
              label="Total asistentes"
              value={res.asistencia}
              onChange={v => set('asistencia', v)}
              currency={currency}
            />
          </div>

          {/* VIP */}
          <SectionTitle label="Ventas VIP" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <InputRow
              label="VIP"
              subtitle={`${fmt(P.vip, currency)} c/u`}
              value={res.ventasVIP}
              onChange={v => set('ventasVIP', v)}
              calc={montoVIP}
              currency={currency}
            />
            <InputRow
              label="VIP 2x1"
              subtitle={`${fmt(P.vip2x1, currency)} c/u`}
              value={res.ventasVIP2x1}
              onChange={v => set('ventasVIP2x1', v)}
              calc={montoVIP2x1}
              currency={currency}
            />
            {cantVIP > 0 && <Subtotal label="" qty={cantVIP} monto={totalVIP} currency={currency} />}
          </div>

          {/* Club */}
          <SectionTitle label="Ventas Club" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <InputRow
              label="Club 3 meses"
              subtitle={`${fmt(P.club3, currency)} c/u`}
              value={res.venta3meses}
              onChange={v => set('venta3meses', v)}
              calc={monto3m}
              currency={currency}
            />
            <InputRow
              label="Club 6 meses"
              subtitle={`${fmt(P.club6, currency)} c/u`}
              value={res.venta6meses}
              onChange={v => set('venta6meses', v)}
              calc={monto6m}
              currency={currency}
            />
            <InputRow
              label="Club 12 meses"
              subtitle={`${fmt(P.club12, currency)} c/u`}
              value={res.venta12meses}
              onChange={v => set('venta12meses', v)}
              calc={monto12m}
              currency={currency}
            />
            <InputRow
              label="Apartados"
              subtitle="Cantidad"
              value={res.apartados}
              onChange={v => set('apartados', v)}
              currency={currency}
            />
            <InputRow
              label="Monto apartados"
              subtitle="Total variable"
              value={res.montoApartados}
              onChange={v => set('montoApartados', v)}
              isAmt
              currency={currency}
            />
            {cantClub > 0 && <Subtotal label="" qty={cantClub} monto={totalClub} currency={currency} />}
          </div>

          {/* Totales */}
          {hayData && (
            <>
              <SectionTitle label="Resumen" accent />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {n(res.asistencia) > 0 && (
                  <TotalRow label="Asistencia" monto={`${n(res.asistencia).toLocaleString('es-MX')} personas`} currency={currency} />
                )}
                {cantVIP > 0 && (
                  <TotalRow label="Total VIP" qty={cantVIP} monto={totalVIP} currency={currency} />
                )}
                {cantClub > 0 && (
                  <TotalRow label="Total Club" qty={cantClub} monto={totalClub} currency={currency} />
                )}
                {cantTotal > 0 && (
                  <TotalRow label="Club + VIP" qty={cantTotal} monto={total} currency={currency} big />
                )}
                {gasto > 0 && roasClub !== null && cantClub > 0 && (
                  <TotalRow label="ROAS Club" monto={`${roasClub.toFixed(2)}%`} currency={currency} />
                )}
                {gasto > 0 && roasTotal !== null && cantTotal > 0 && (
                  <TotalRow label="ROAS Club + VIP" monto={`${roasTotal.toFixed(2)}%`} currency={currency} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--app-border-light)',
          flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose}
            style={{ padding: '9px 18px', background: 'transparent', border: '1.5px solid var(--app-border)', borderRadius: 10, fontSize: 14, fontWeight: 500, color: 'var(--app-text-muted)', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => onSave(evento.id, res)}
            style={{ padding: '9px 24px', background: '#e53e3e', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
      </div>
    </>
  );
}
