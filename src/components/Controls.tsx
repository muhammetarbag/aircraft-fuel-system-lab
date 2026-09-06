import { PUMPS } from "../sim/engine.ts";
import { PARTS } from "../content/lessons.ts";
import type { Controls as ControlState, Side } from "../sim/types.ts";
import type { Sim } from "../sim/useSimulation.ts";
import { fmt, Panel, Toggle, Why } from "./Primitives.tsx";
export function Controls({
  sim,
  onWhy,
  autoExplain,
}: {
  sim: Sim;
  onWhy: (topic: string) => void;
  autoExplain: boolean;
}) {
  const c = sim.state.controls;
  const set = (patch: Partial<ControlState>, message: string) => {
    sim.dispatch({ type: "control", patch, message });
    if (autoExplain)
      onWhy(
        patch.crossfeed !== undefined
          ? "crossfeed"
          : patch.isolation
            ? "isolation"
            : patch.shutoff
              ? "shutoff"
              : patch.pumps
                ? "pump"
                : "service",
      );
  };
  return (
    <Panel
      title="Kumanda paneli"
      eyebrow="CONFIGURATION"
      action={<Why onClick={() => onWhy("pressure")} />}
    >
      <div className="controls-grid">
        {(["L", "C", "R"] as const).map((side) => (
          <div className="control-group" key={side}>
            <span className="eyebrow">
              {side === "L" ? "LEFT" : side === "R" ? "RIGHT" : "CENTER"} BOOST PUMPS
            </span>
            {PUMPS.filter((p) => p[0] === side).map((p) => (
              <Toggle
                key={p}
                label={`${side === "L" ? "LEFT" : side === "R" ? "RIGHT" : "CENTER"} PUMP ${p[1]}`}
                sub={`${sim.view.pumpStatus[p]} · ${fmt(sim.view.pumpHead[p], 1)} psi`}
                value={c.pumps[p]}
                onChange={() =>
                  set(
                    { pumps: { ...c.pumps, [p]: !c.pumps[p] } },
                    `${p} → ${!c.pumps[p] ? "ON" : "OFF"}`,
                  )
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="valve-controls">
        <Toggle
          label="CROSSFEED VALVE"
          value={c.crossfeed}
          sub={`Actual: ${sim.view.crossfeedActual ? "OPEN" : "CLOSED"}`}
          onChange={() => {
            set({ crossfeed: !c.crossfeed }, `CROSSFEED → ${!c.crossfeed ? "OPEN" : "CLOSED"}`);
          }}
        />
        {(["L", "R"] as Side[]).map((side) => (
          <Toggle
            key={side}
            label={`${side === "L" ? "LEFT" : "RIGHT"} ENGINE SHUTOFF`}
            sub={c.shutoff[side] ? "OPEN" : "CLOSED"}
            value={c.shutoff[side]}
            onChange={() =>
              set(
                { shutoff: { ...c.shutoff, [side]: !c.shutoff[side] } },
                `${side} SHUTOFF değişti`,
              )
            }
          />
        ))}
      </div>
      <details className="secondary-controls">
        <summary>Kaynak izolasyonu ve uçak durumu</summary>
        <div className="controls-grid">
          {(["L", "R"] as Side[]).map((side) => (
            <Toggle
              key={side}
              label={`${side} SOURCE ISOLATION`}
              value={c.isolation[side]}
              onChange={() =>
                set(
                  { isolation: { ...c.isolation, [side]: !c.isolation[side] } },
                  `${side} ISOLATION değişti`,
                )
              }
            />
          ))}
          <Toggle
            label="YER MODU"
            sub="Yerde motor talebi 0; jettison kilitli"
            value={c.ground}
            onChange={() => set({ ground: !c.ground }, `Uçak ${!c.ground ? "yerde" : "uçuşta"}`)}
          />
        </div>
      </details>
    </Panel>
  );
}
export function Cockpit({
  sim,
  onWhy,
}: {
  sim: Sim;
  onWhy: (topic: string, explanation?: string) => void;
}) {
  const v = sim.view,
    c = sim.state.controls;
  return (
    <Panel title="Yakıt durumu" eyebrow="COCKPIT / INDICATED" className="cockpit">
      <div className="cockpit-quantities">
        {(["L", "C", "R"] as const).map((id) => (
          <div key={id}>
            <small>{id === "L" ? "LEFT" : id === "R" ? "RIGHT" : "CENTER"}</small>
            <strong data-testid={`quantity-${id}`}>{fmt(v.indicated[id])}</strong>
            <small>kg</small>
          </div>
        ))}
      </div>
      <div className="cockpit-total">
        <span>
          TOTAL FUEL <small>trim dahil</small>
        </span>
        <b>
          {fmt(Object.values(v.indicated).reduce((a, b) => a + b, 0))} <small>kg</small>
        </b>
      </div>
      <div className="engine-displays">
        {(["L", "R"] as const).map((side, i) => (
          <div key={side}>
            <span className="eyebrow">ENGINE {i + 1}</span>
            <b
              data-testid={`feed-${side}`}
              className={v.flow[side] < v.demand[side] * 0.95 ? "warning-text" : ""}
            >
              {fmt(v.flow[side])} <small>kg/h</small>
            </b>
            <span>
              {fmt(v.pressure[side], 1)} psi / <small>talep {fmt(v.demand[side])}</small>
            </span>
            <meter
              aria-label={`Engine ${i + 1} talep karşılama`}
              min={0}
              max={1}
              value={v.demand[side] ? v.flow[side] / v.demand[side] : 0}
            />
          </div>
        ))}
      </div>
      <div className="position-list">
        <span>
          CROSSFEED <b>{v.crossfeedActual ? "OPEN" : "CLOSED"}</b>
        </span>
        <span>
          SHUTOFF L / R{" "}
          <b>
            {c.shutoff.L ? "OPEN" : "CLOSED"} / {c.shutoff.R ? "OPEN" : "CLOSED"}
          </b>
        </span>
        <span>
          FUEL TEMP L / R{" "}
          <b>
            {fmt(sim.state.tanks.L.temp)} / {fmt(sim.state.tanks.R.temp)} °C
          </b>
        </span>
      </div>
      <div className="warning-stack" aria-label="Sistem ikazları">
        {v.warnings.length ? (
          v.warnings.map((w) => (
            <button
              key={w.code}
              className={`warning-row ${w.level}`}
              onClick={() => onWhy("warning", w.why)}
            >
              <span>△ {w.code}</span>
              <small>WHY?</small>
            </button>
          ))
        ) : (
          <div className="status-normal">● FEED CONFIGURATION NORMAL</div>
        )}
      </div>
      <p className="footnote">
        İkazlar canlı durumdan üretilir. Eşikler bu öğretim modeline aittir.
      </p>
    </Panel>
  );
}
export function Inspector({
  selected,
  onSelect,
  onWhy,
}: {
  selected: string;
  onSelect: (s: string) => void;
  onWhy: (s: string) => void;
}) {
  const part = PARTS[selected] ?? PARTS.tank;
  return (
    <Panel
      title={part.title}
      eyebrow="KOMPONENT İNCELEMESİ"
      action={<Why onClick={() => onWhy(selected)} />}
    >
      <div className="inspector-content">
        <label className="sr-only" htmlFor="component-select">
          Komponent seç
        </label>
        <select id="component-select" value={selected} onChange={(e) => onSelect(e.target.value)}>
          {Object.entries(PARTS).map(([id, p]) => (
            <option key={id} value={id}>
              {p.title}
            </option>
          ))}
        </select>
        <p>{part.function}</p>
        <dl>
          {[
            ["INPUT", part.input],
            ["OUTPUT", part.output],
            ["NORMAL STATE", part.normal],
            ["FAILURE EFFECT", part.failure],
            ["RELATED WARNINGS", part.warnings],
          ].map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
