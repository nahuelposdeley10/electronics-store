import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { REPORT_PERIODS, STATUS_META, STOCK_STATUS_LABELS } from '../../consts.js'
import { IconChart, IconClock, IconSearchOff } from '@/components/Icons'

import './styles.css'

const SORT_OPTIONS = [
  { value: 'recent', label: 'Últimos agregados' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
]

function SortSelect({ value, onChange, id = 'sort', label = 'Orden' }) {
  return (
    <label className="sort-field">
      <span>{label}</span>
      <select
        id={id}
        value={value || 'recent'}
        onChange={(e) => onChange(e.target.value)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}


function StatusTag({ status }) {
  const meta = STATUS_META[status] || { label: status, Icon: IconClock }
  const { Icon } = meta
  return (
    <span className="status-tag">
      <Icon />
      {meta.label}
    </span>
  )
}


function EmptyNote({ text }) {
  return (
    <div className="empty-note">
      <IconSearchOff />
      <p>{text}</p>
    </div>
  )
}


function ScreenLoading({ label = 'Leyendo la caja…' }) {
  return (
    <div className="dash-screen dash-loading" role="status">
      <span className="load-ring" aria-hidden="true" />
      <p className="load-label">{label}</p>
    </div>
  )
}

function KpiTicket({ label, value, note }) {
  return (
    <div className="kpi-ticket">
      <span className="kpi-hole" aria-hidden="true" />
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value mono">{value}</strong>
      <span className="kpi-note">{note}</span>
    </div>
  )
}


function StockBadge({ status }) {
  return (
    <span className={`stock-badge ${status}`}>{STOCK_STATUS_LABELS[status] || status}</span>
  )
}


function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tip">
      {label ? <div className="chart-tip-label">{label}</div> : null}
      <div className="chart-tip-body">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey}-${i}`} className="chart-tip-row">
            <span
              className="chart-tip-dot"
              style={{ background: entry.color || entry.payload?.fill || '#d7261d' }}
            />
            <em>{entry.name}</em>
            <strong className="mono">{formatter ? formatter(entry.value, entry.dataKey) : entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}


function ChartLegend({ data }) {
  return (
    <div className="chart-legend">
      {data.map((item) => (
        <span key={item.key} className="chart-legend-item">
          <span className="chart-tip-dot" style={{ background: item.color }} />
          {item.label}
          <em className="mono">{item.value}</em>
        </span>
      ))}
    </div>
  )
}


function ReportPeriodBar({ days, onChange }) {
  return (
    <div className="sale-chips" role="group" aria-label="Periodo del reporte">
      {REPORT_PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          className={`sale-chip mono${days === p.days ? ' active' : ''}`}
          onClick={() => onChange(p.days)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}


function ScreenBlocked({ message }) {
  return (
    <div className="dash-screen dash-unlock">
      <div className="unlock-card">
        <span className="unlock-icon">
          <IconChart />
        </span>
        <span className="dash-eyebrow">Algo se trabó</span>
        <h1>No pudimos leer el panel</h1>
        <p>{message}.</p>
      </div>
    </div>
  )
}


function ToggleRow({ label, hint, checked, onChange, disabled = false }) {
  return (
    <label className="set-wrap">
      <span className="set-wrap-txt">
        <strong>{label}</strong>
        {hint && <em>{hint}</em>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  )
}


function ToggleSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <label className="toggle-switch" title={label}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}


function isErrorNote(text) {
  return /(No se pudo|No pod|No tenés|Ya existe|requeridos|inválido|vencida|incorrectas)/i.test(
    text || '',
  )
}


function SettingsNote({ text }) {
  if (!text) return null
  const error = isErrorNote(text)
  return (
    <p className={`sale-note ${error ? 'sale-note-err' : 'sale-note-ok'}`}>
      {text}
    </p>
  )
}


function SetImageField({ label, hint, value, uploading, onFile, onRemove, wide }) {
  return (
    <div className={wide ? 'set-image-box is-wide' : 'set-image-box'}>
      <span className="set-image-label">{label}</span>
      {value ? (
        <a
          className="set-image-preview"
          href={value}
          target="_blank"
          rel="noreferrer"
          title="Abrir imagen completa"
        >
          <img
            src={value}
            alt=""
            className={wide ? 'set-image-fit-cover' : 'set-image-fit-contain'}
          />
        </a>
      ) : (
        <div className="set-image-preview is-empty">
          <span className="set-image-empty">Sin imagen</span>
        </div>
      )}
      <div className="set-image-actions">
        <label className="primary-btn set-image-upload">
          {uploading ? 'Subiendo…' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={onFile}
          />
        </label>
        {value && (
          <>
            <a
              className="ghost-btn set-image-open"
              href={value}
              target="_blank"
              rel="noreferrer"
            >
              Ver
            </a>
            <button type="button" className="ghost-btn" onClick={onRemove}>
              Quitar
            </button>
          </>
        )}
      </div>
      {hint && <em className="set-hint">{hint}</em>}
    </div>
  )
}


function SettingsFetcher({ render }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/settings')
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [])

  if (error) return <ScreenBlocked message={error} />
  if (!data) return <ScreenLoading label="Leyendo ajustes…" />
  return render(data)
}


export { StatusTag, EmptyNote, ScreenLoading, KpiTicket, StockBadge, ChartTip, ChartLegend, ReportPeriodBar, ScreenBlocked, ToggleRow, ToggleSwitch, SettingsNote, SetImageField, SettingsFetcher, SortSelect }