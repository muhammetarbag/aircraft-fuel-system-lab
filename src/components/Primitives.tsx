import type { ReactNode } from "react";
import type { Sample } from "../sim/types.ts";
export const fmt = (n: number, digits = 0): string =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export function Toggle({
  label,
  value,
  onChange,
  disabled = false,
  sub,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
  sub?: string;
}) {
  return (
    <button
      className={`toggle ${value ? "on" : ""}`}
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    >
      <span>
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <span className="switch-led" aria-hidden="true" />
      <b>{value ? "ON" : "OFF"}</b>
    </button>
  );
}
export function Range({
  label,
  value,
  min = 0,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="range">
      <span>
        {label}
        <b>
          {fmt(value)} <small>{unit}</small>
        </b>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-ends">
        <small>{fmt(min)}</small>
        <small>
          {fmt(max)} {unit}
        </small>
      </span>
    </label>
  );
}
export function Panel({
  title,
  eyebrow,
  children,
  className = "",
  action,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow) && (
        <header className="panel-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  unit,
  note,
  caution = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  caution?: boolean;
}) {
  return (
    <div className={`metric ${caution ? "caution-text" : ""}`}>
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function Why({ onClick }: { onClick: () => void }) {
  return (
    <button className="why" onClick={onClick} aria-label="Neden? WHY">
      WHY?
    </button>
  );
}
export function Chart({
  samples,
  field,
  label,
  unit,
  color = "#93c5d4",
}: {
  samples: Sample[];
  field: keyof Sample;
  label: string;
  unit: string;
  color?: string;
}) {
  const values = samples.map((s) => s[field]);
  let min = Math.min(...values),
    max = Math.max(...values);
  const margin = Math.max((max - min) * 0.1, Math.abs(max) * 0.0005, field === "vent" ? 0.1 : 0.05);
  min -= margin;
  max += margin;
  const end = samples.at(-1)?.wall ?? 0,
    start = end - 60;
  const points = samples
    .map(
      (s) => `${40 + ((s.wall - start) / 60) * 275},${90 - ((s[field] - min) / (max - min)) * 66}`,
    )
    .join(" ");
  return (
    <div className="chart">
      <div>
        <span>{label}</span>
        <b style={{ color }}>
          {fmt(values.at(-1) ?? 0, field === "cg" || field === "vent" ? 2 : 1)}{" "}
          <small>{unit}</small>
        </b>
      </div>
      <svg
        role="img"
        aria-label={`${label}: son 60 çalışma saniyesi, ${samples.length} ölçüm`}
        viewBox="0 0 330 122"
      >
        <path d="M40 24H315M40 57H315M40 90H315" stroke="#243543" fill="none" />
        <text x="1" y="28">
          {fmt(max, 1)}
        </text>
        <text x="1" y="93">
          {fmt(min, 1)}
        </text>
        {samples.length > 1 ? (
          <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        ) : (
          <circle cx="315" cy="57" r="3" fill={color} />
        )}
        <text x="40" y="115">
          −60 s
        </text>
        <text x="282" y="115">
          şimdi
        </text>
      </svg>
    </div>
  );
}
