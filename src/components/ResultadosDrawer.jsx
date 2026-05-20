import { useState } from 'react';

const PRECIOS = {
  MXN: { vip: 1000, vip2x1: 1500, club3: 9997, club6: 12997, club12: 14997 },
  USD: { vip: 59,   vip2x1: 99,   club3: 1499,  club6: 1799,  club12: 1999  },
};

const APT_ROW   = { monto: '', cantidad: '' };
// VIP ventas ahora son nivel evento (no por turno)
const SHIFT_INIT = {
  asistencia: '', asistenciaVIP: '',
  venta3meses: '', venta6meses: '', venta12meses: '',
  apartados: [{ ...APT_ROW }],
};
const RES_INIT = {
  mañana:      { ...SHIFT_INIT, apartados: [{ ...APT_ROW }] },
  tarde:       { ...SHIFT_INIT, apartados: [{ ...APT_ROW }] },
  ventasVIP:   '',
  ventasVIP2x1: '',
};

function migrateShift(raw) {
  if (!raw) return { ...SHIFT_INIT, apartados: [{ ...APT_ROW }] };
  let apartados;
  if (Array.isArray(raw.apartados)) {
    apartados = raw.apartados;
  } else {
    const qty = Number(raw.apartados) || 0;
    const total = Number(raw.montoApartados) || 0;
    const perUnit = qty > 0 && total > 0 ? Math.round(total / qty) : total;
    apartados = (qty > 0 || total > 0) ? [{ monto: perUnit || '', cantidad: qty || '' }] : [{ ...APT_ROW }];
  }
  const { montoApartados: _r, ventasVIP: _v, ventasVIP2x1: _v2, ...rest } = raw;
  return { ...SHIFT_INIT, ...rest, apartados };
}

function loadRes(raw) {
  if (!raw) return RES_INIT;
  if (raw.mañana !== undefined || raw.tarde !== undefined) {
    // Migrar ventasVIP al nivel evento si estaban en mañana
    const ventasVIP    = raw.ventasVIP    ?? raw.mañana?.ventasVIP    ?? '';
    const ventasVIP2x1 = raw.ventasVIP2x1 ?? raw.mañana?.ventasVIP2x1 ?? '';
    return { mañana: migrateShift(raw.mañana), tarde: migrateShift(raw.tarde), ventasVIP, ventasVIP2x1 };
  }
  return { mañana: migrateShift(raw), tarde: { ...SHIFT_INIT, apartados: [{ ...APT_ROW }] }, ventasVIP: raw.ventasVIP || '', ventasVIP2x1: raw.ventasVIP2x1 || '' };
}

function n(v) { return Number(v) || 0; }

function fmt(val, currency) {
  if (!val) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function calcClub(shift, P) {
  const monto3m  = n(shift.venta3meses)  * P.club3;
  const monto6m  = n(shift.venta6meses)  * P.club6;
  const monto12m = n(shift.venta12meses) * P.club12;
  const apts     = shift.apartados || [];
  const montoApt = apts.reduce((s, a) => s + n(a.monto) * n(a.cantidad), 0);
  const cantApt  = apts.reduce((s, a) => s + n(a.cantidad), 0);
  const totalClub = monto3m + monto6m + monto12m + montoApt;
  const cantClub  = n(shift.venta3meses) + n(shift.venta6meses) + n(shift.venta12meses) + cantApt;
  return { monto3m, monto6m, monto12m, montoApt, cantApt, totalClub, cantClub };
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const INP_STYLE = {
  background: 'var(--app-surface-2)', border: '1.5px solid var(--app-border)',
  borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600,
  color: 'var(--app-text)', outline: 'none', textAlign: 'right', boxSizing: 'border-box', width: '100%',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionTitle({ label, accent, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${accent ? '#e53e3e30' : 'var(--app-border-light)'}`, paddingBottom: 7, marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: accent ? '#e53e3e' : 'var(--app-text-subtle)' }}>{label}</span>
      {action}
    </div>
  );
}

function InputRow({ label, subtitle, value, onChange, calc, currency, readOnly }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', alignItems: 'center', gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {readOnly
        ? <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: n(value) > 0 ? 'var(--app-text)' : '#d1d5db' }}>{n(value) > 0 ? n(value).toLocaleString('es-MX') : '—'}</div>
        : <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)} placeholder="0"
            style={{ ...INP_STYLE, width: 80 }}
            onFocus={e => e.target.style.borderColor = '#e53e3e'}
            onBlur={e => e.target.style.borderColor = 'var(--app-border)'} />
      }
      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: calc > 0 ? 'var(--app-text)' : '#d1d5db' }}>
        {calc > 0 ? fmt(calc, currency) : ''}
      </div>
    </div>
  );
}

function Subtotal({ label, qty, monto, currency }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--app-surface-alt)', marginTop: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>{label || 'Subtotal'} {qty > 0 ? `(${qty.toLocaleString('es-MX')} ventas)` : ''}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{fmt(monto, currency)}</span>
    </div>
  );
}

function TotalRow({ label, sub, qty, monto, currency, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: big ? '10px 12px' : '7px 12px', borderRadius: big ? 10 : 8, background: big ? '#e53e3e08' : 'transparent', border: big ? '1px solid #e53e3e20' : 'none' }}>
      <div>
        <div style={{ fontSize: big ? 13 : 12, fontWeight: big ? 800 : 600, color: big ? 'var(--app-text)' : 'var(--app-text-2)' }}>{label}</div>
        {sub  && <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{sub}</div>}
        {qty !== undefined && <div style={{ fontSize: 11, color: 'var(--app-text-subtle)', marginTop: 1 }}>{qty.toLocaleString('es-MX')} ventas</div>}
      </div>
      <span style={{ fontSize: big ? 15 : 13, fontWeight: 800, color: big ? '#e53e3e' : 'var(--app-text)' }}>
        {typeof monto === 'string' ? monto : fmt(monto, currency)}
      </span>
    </div>
  );
}

// ── Apartados multi-row ────────────────────────────────────────────────────────
function ApartadosSection({ apartados, setApartados, currency }) {
  function addRow()         { setApartados(p => [...p, { ...APT_ROW }]); }
  function removeRow(i)     { setApartados(p => p.filter((_, idx) => idx !== i)); }
  function update(i, k, v) { setApartados(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r)); }

  const totalMonto = apartados.reduce((s, a) => s + n(a.monto) * n(a.cantidad), 0);
  const totalCant  = apartados.reduce((s, a) => s + n(a.cantidad), 0);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {apartados.map((apt, i) => {
          const rowTotal = n(apt.monto) * n(apt.cantidad);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--app-text-2)' }}>Apartados</span>
                  {i === 0 ? (
                    <button onClick={addRow} data-tooltip="Agregar apartado"
                      style={{ width: 15, height: 15, background: '#e53e3e', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#c53030'}
                      onMouseLeave={e => e.currentTarget.style.background = '#e53e3e'}>+</button>
                  ) : (
                    <button onClick={() => removeRow(i)}
                      style={{ width: 15, height: 15, background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>×</button>
                  )}
                </div>
                <input type="number" min="0" value={apt.monto} onChange={e => update(i, 'monto', e.target.value)} placeholder="$ monto"
                  style={{ marginTop: 3, width: 100, background: 'transparent', border: 'none', borderBottom: '1px solid var(--app-border)', outline: 'none', fontSize: 11, color: 'var(--app-text-subtle)', padding: '2px 0', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderBottomColor = '#e53e3e'}
                  onBlur={e => e.target.style.borderBottomColor = 'var(--app-border)'} />
              </div>
              <input type="number" min="0" value={apt.cantidad} onChange={e => update(i, 'cantidad', e.target.value)} placeholder="0"
                style={{ ...INP_STYLE, width: 80 }}
                onFocus={e => e.target.style.borderColor = '#e53e3e'}
                onBlur={e => e.target.style.borderColor = 'var(--app-border)'} />
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--app-text)' }}>
                {rowTotal > 0 ? fmt(rowTotal, currency) : ''}
              </div>
            </div>
          );
        })}
      </div>
      {totalCant > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--app-surface-alt)', marginTop: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>Subtotal apartados ({totalCant})</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{fmt(totalMonto, currency)}</span>
        </div>
      )}
    </div>
  );
}

// ── Shift form (Mañana / Tarde) — sin VIP ventas ───────────────────────────────
function ShiftForm({ shift, setShift, P, currency }) {
  const set = (k, v) => setShift(p => ({ ...p, [k]: v }));
  const setApartados = updater => setShift(p => ({
    ...p, apartados: typeof updater === 'function' ? updater(p.apartados || [{ ...APT_ROW }]) : updater,
  }));
  const c = calcClub(shift, P);

  return (
    <div>
      {/* Asistencia */}
      <SectionTitle label="Asistencia" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <InputRow label="Total asistentes" value={shift.asistencia} onChange={v => set('asistencia', v)} currency={currency} />
        <InputRow label="VIP" subtitle="Personas VIP (incluidas en el total)" value={shift.asistenciaVIP} onChange={v => set('asistenciaVIP', v)} currency={currency} />
      </div>

      {/* Club */}
      <SectionTitle label="Ventas Club" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <InputRow label="Club 3 meses"  subtitle={`${fmt(P.club3, currency)} c/u`}  value={shift.venta3meses}  onChange={v => set('venta3meses', v)}  calc={c.monto3m}  currency={currency} />
        <InputRow label="Club 6 meses"  subtitle={`${fmt(P.club6, currency)} c/u`}  value={shift.venta6meses}  onChange={v => set('venta6meses', v)}  calc={c.monto6m}  currency={currency} />
        <InputRow label="Club 12 meses" subtitle={`${fmt(P.club12, currency)} c/u`} value={shift.venta12meses} onChange={v => set('venta12meses', v)} calc={c.monto12m} currency={currency} />
        {c.cantClub - c.cantApt > 0 && <Subtotal label="Subtotal Club" qty={c.cantClub - c.cantApt} monto={c.monto3m + c.monto6m + c.monto12m} currency={currency} />}
      </div>

      <ApartadosSection apartados={shift.apartados || [{ ...APT_ROW }]} setApartados={setApartados} currency={currency} />

      {(c.cantClub > 0 || n(shift.asistencia) > 0) && (
        <>
          <SectionTitle label="Resumen" accent />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {n(shift.asistencia) > 0 && (
              <TotalRow label="Asistencia" sub={n(shift.asistenciaVIP) > 0 ? `VIP: ${n(shift.asistenciaVIP).toLocaleString('es-MX')} (incluidos)` : undefined} monto={`${n(shift.asistencia).toLocaleString('es-MX')} personas`} currency={currency} />
            )}
            {c.cantClub > 0 && <TotalRow label="Total Club" qty={c.cantClub} monto={c.totalClub} currency={currency} big />}
          </div>
        </>
      )}
    </div>
  );
}

// ── Total view ─────────────────────────────────────────────────────────────────
function TotalView({ mañana, tarde, ventasVIP, ventasVIP2x1, setVIP, P, currency, gasto }) {
  const cM = calcClub(mañana, P);
  const cT = calcClub(tarde,  P);

  const totalClub = cM.totalClub + cT.totalClub;
  const cantClub  = cM.cantClub  + cT.cantClub;

  const montoVIP    = n(ventasVIP)    * P.vip;
  const montoVIP2x1 = n(ventasVIP2x1) * P.vip2x1;
  const totalVIP    = montoVIP + montoVIP2x1;
  const cantVIP     = n(ventasVIP) + n(ventasVIP2x1);

  const totalGeneral = totalClub + totalVIP;
  const cantTotal    = cantClub  + cantVIP;

  const roasClub  = gasto > 0 && totalClub    > 0 ? (totalClub    / gasto) : null;
  const roasTotal = gasto > 0 && totalGeneral  > 0 ? (totalGeneral / gasto) : null;

  const totalAsistencia    = n(mañana.asistencia)    + n(tarde.asistencia);
  const totalAsistenciaVIP = n(mañana.asistenciaVIP) + n(tarde.asistenciaVIP);

  const hayData = cantTotal > 0 || totalAsistencia > 0;

  if (!hayData && !ventasVIP && !ventasVIP2x1) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '32px 20px 20px', color: 'var(--app-text-subtle)' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text-2)', marginBottom: 4 }}>Sin datos todavía</div>
          <div style={{ fontSize: 12 }}>Ingresa datos en las pestañas Mañana y Tarde.</div>
        </div>
        <VIPSection ventasVIP={ventasVIP} ventasVIP2x1={ventasVIP2x1} setVIP={setVIP} montoVIP={montoVIP} montoVIP2x1={montoVIP2x1} cantVIP={cantVIP} totalVIP={totalVIP} P={P} currency={currency} />
      </div>
    );
  }

  const ColHdr = ({ label }) => (
    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-subtle)', textAlign: 'right', letterSpacing: 0.4 }}>{label}</span>
  );

  function CompareRow({ label, subtitle, valM, valT, valTT }) {
    const any = valM > 0 || valT > 0;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--app-text-2)' }}>{label}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>{subtitle}</div>}
        </div>
        <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)' }}>{valM > 0 ? fmt(valM, currency) : '—'}</span>
        <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)' }}>{valT > 0 ? fmt(valT, currency) : '—'}</span>
        <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: any ? 'var(--app-text)' : '#d1d5db' }}>{any ? fmt(valTT, currency) : '—'}</span>
      </div>
    );
  }

  const hdrRow = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, marginBottom: 6 }}>
      <span /><ColHdr label="Mañana" /><ColHdr label="Tarde" /><ColHdr label="Total" />
    </div>
  );

  return (
    <div>
      {/* Asistencia */}
      {totalAsistencia > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle label="Asistencia" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--app-text-2)' }}>Total asistentes</span>
              <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(mañana.asistencia) > 0 ? n(mañana.asistencia).toLocaleString('es-MX') : '—'}</span>
              <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(tarde.asistencia) > 0 ? n(tarde.asistencia).toLocaleString('es-MX') : '—'}</span>
              <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>{totalAsistencia.toLocaleString('es-MX')}</span>
            </div>
            {totalAsistenciaVIP > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', gap: 10, alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--app-text-2)' }}>VIP</span>
                  <div style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>Incluidos en total</div>
                </div>
                <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(mañana.asistenciaVIP) > 0 ? n(mañana.asistenciaVIP).toLocaleString('es-MX') : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--app-text-muted)' }}>{n(tarde.asistenciaVIP) > 0 ? n(tarde.asistenciaVIP).toLocaleString('es-MX') : '—'}</span>
                <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>{totalAsistenciaVIP.toLocaleString('es-MX')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIP ventas — editable aquí, nivel evento */}
      <VIPSection ventasVIP={ventasVIP} ventasVIP2x1={ventasVIP2x1} setVIP={setVIP} montoVIP={montoVIP} montoVIP2x1={montoVIP2x1} cantVIP={cantVIP} totalVIP={totalVIP} P={P} currency={currency} />

      {/* Club */}
      {cantClub > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle label="Ventas Club" />
          {hdrRow}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CompareRow label="Club 3 meses"  subtitle={`${fmt(P.club3,  currency)} c/u`} valM={cM.monto3m}  valT={cT.monto3m}  valTT={cM.monto3m  + cT.monto3m} />
            <CompareRow label="Club 6 meses"  subtitle={`${fmt(P.club6,  currency)} c/u`} valM={cM.monto6m}  valT={cT.monto6m}  valTT={cM.monto6m  + cT.monto6m} />
            <CompareRow label="Club 12 meses" subtitle={`${fmt(P.club12, currency)} c/u`} valM={cM.monto12m} valT={cT.monto12m} valTT={cM.monto12m + cT.monto12m} />
            <CompareRow label="Apartados" subtitle={`${cM.cantApt + cT.cantApt} aptos`} valM={cM.montoApt} valT={cT.montoApt} valTT={cM.montoApt + cT.montoApt} />
            <Subtotal qty={cantClub} monto={totalClub} currency={currency} />
          </div>
        </div>
      )}

      {/* Resumen */}
      {cantTotal > 0 && (
        <>
          <SectionTitle label="Resumen total" accent />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cantVIP  > 0 && <TotalRow label="Total VIP"  qty={cantVIP}  monto={totalVIP}  currency={currency} />}
            {cantClub > 0 && <TotalRow label="Total Club" qty={cantClub} monto={totalClub} currency={currency} />}
            <TotalRow label="Club + VIP" qty={cantTotal} monto={totalGeneral} currency={currency} big />
            {roasClub  !== null && <TotalRow label="ROAS Club"       monto={`${roasClub.toFixed(2)}x`}  currency={currency} />}
            {roasTotal !== null && <TotalRow label="ROAS Club + VIP" monto={`${roasTotal.toFixed(2)}x`} currency={currency} />}
          </div>
        </>
      )}
    </div>
  );
}

// ── VIP ventas — editable, nivel evento ───────────────────────────────────────
function VIPSection({ ventasVIP, ventasVIP2x1, setVIP, montoVIP, montoVIP2x1, cantVIP, totalVIP, P, currency }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionTitle label="Ventas VIP" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <InputRow label="VIP" subtitle={`${fmt(P.vip, currency)} c/u`} value={ventasVIP} onChange={v => setVIP('ventasVIP', v)} calc={montoVIP} currency={currency} />
        <InputRow label="VIP 2x1" subtitle={`${fmt(P.vip2x1, currency)} c/u`} value={ventasVIP2x1} onChange={v => setVIP('ventasVIP2x1', v)} calc={montoVIP2x1} currency={currency} />
        {cantVIP > 0 && <Subtotal qty={cantVIP} monto={totalVIP} currency={currency} />}
      </div>
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

  const setShift = turnoKey => updater =>
    setRes(p => ({ ...p, [turnoKey]: typeof updater === 'function' ? updater(p[turnoKey]) : updater }));

  const setVIP = (k, v) => setRes(p => ({ ...p, [k]: v }));

  const regionObj = regiones?.find(r => r.id === evento.region);
  const gasto     = evento.presupuestoGastado || 0;

  const TABS = [{ key: 'total', label: 'Total' }, { key: 'mañana', label: 'Mañana' }, { key: 'tarde', label: 'Tarde' }];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '100vw', background: 'var(--app-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', zIndex: 1001, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 0', borderBottom: '1px solid var(--app-border-light)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--app-text-subtle)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>Resultados del evento</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--app-text)', lineHeight: 1.2 }}>{evento.nombre}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {regionObj && <span style={{ fontSize: 11, fontWeight: 700, background: regionObj.color + '22', color: regionObj.color, borderRadius: 6, padding: '2px 8px' }}>{regionObj.label}</span>}
                <span style={{ fontSize: 11, fontWeight: 700, background: isUSD ? '#2563eb18' : '#16a34a18', color: isUSD ? '#2563eb' : '#16a34a', borderRadius: 6, padding: '2px 8px' }}>{currency}</span>
                {gasto > 0 && <span style={{ fontSize: 11, color: 'var(--app-text-subtle)' }}>Gasto: {fmt(gasto, currency)}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--app-text-subtle)', lineHeight: 1, padding: '4px 6px' }}>×</button>
          </div>
          <div style={{ display: 'flex' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setTurno(tab.key)}
                style={{ padding: '9px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: turno === tab.key ? 700 : 500, color: turno === tab.key ? '#e53e3e' : 'var(--app-text-muted)', borderBottom: `2px solid ${turno === tab.key ? '#e53e3e' : 'transparent'}`, transition: 'color 0.15s, border-color 0.15s', marginBottom: -1 }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {turno === 'total' && (
            <TotalView mañana={res.mañana} tarde={res.tarde} ventasVIP={res.ventasVIP} ventasVIP2x1={res.ventasVIP2x1} setVIP={setVIP} P={P} currency={currency} gasto={gasto} />
          )}
          {turno === 'mañana' && <ShiftForm shift={res.mañana} setShift={setShift('mañana')} P={P} currency={currency} />}
          {turno === 'tarde'  && <ShiftForm shift={res.tarde}  setShift={setShift('tarde')}  P={P} currency={currency} />}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--app-border-light)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--app-text-subtle)' }}>
            {turno === 'total' ? 'VIP editable · Club de solo lectura' : `Turno ${turno}`}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: '1.5px solid var(--app-border)', borderRadius: 10, fontSize: 14, fontWeight: 500, color: 'var(--app-text-muted)', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => onSave(evento.id, res)}
              style={{ padding: '9px 24px', background: '#e53e3e', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
