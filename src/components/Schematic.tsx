import type { KeyboardEvent, ReactNode } from "react";
import { CAPACITY, tankName, usable } from "../sim/engine.ts";
import type { Sim } from "../sim/useSimulation.ts";
import type { PumpId, Side, TankId } from "../sim/types.ts";
import { fmt, Panel } from "./Primitives.tsx";

function Pipe({ d, rate = 0, kind = "feed" }: { d: string; rate?: number; kind?: string }) {
  return (
    <g>
      <path d={d} className="pipe-base" />
      {Math.abs(rate) > 0.001 && (
        <path
          d={d}
          className={`pipe-flow ${kind}`}
          style={{ animationDirection: rate < 0 ? "reverse" : "normal" }}
        />
      )}
    </g>
  );
}
function Part({
  name,
  kind,
  select,
  selected,
  children,
}: {
  name: string;
  kind: string;
  selected: string;
  select: (kind: string) => void;
  children: ReactNode;
}) {
  return (
    <g
      className={`schematic-part ${selected === kind ? "selected-part" : ""}`}
      tabIndex={0}
      role="button"
      aria-label={`${name} ayrıntıları`}
      onClick={() => select(kind)}
      onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(kind);
        }
      }}
    >
      {children}
      <title>{name} · ayrıntıları aç</title>
    </g>
  );
}
export function Schematic({
  sim,
  selected,
  select,
  concealed = false,
}: {
  sim: Sim;
  selected: string;
  select: (kind: string) => void;
  concealed?: boolean;
}) {
  const s = sim.state,
    v = sim.view;
  const sourceRate = (tank: TankId, leg?: Side) =>
    v.paths
      .filter((p) => p.source === tank && (!leg || p.leg === leg))
      .reduce((n, p) => n + p.rate, 0);
  const cross = v.paths
    .filter((p) => p.leg !== p.engine)
    .reduce((n, p) => n + p.rate * (p.leg === "L" ? 1 : -1), 0);
  const tanks = [
    { id: "L" as const, x: 105, y: 157 },
    { id: "C" as const, x: 395, y: 128 },
    { id: "R" as const, x: 675, y: 157 },
  ];
  const part = (kind: string, name: string, children: ReactNode) => (
    <Part kind={kind} name={name} selected={selected} select={select}>
      {children}
    </Part>
  );
  function valve(x: number, y: number, open: boolean, kind: string, name: string) {
    return part(
      kind,
      name,
      <g className={open ? "valve-open" : "valve-closed"}>
        <circle className="part-surface" cx={x} cy={y} r="13" />
        <path
          d={(kind === "transfer" ? !open : open) ? `M${x} ${y - 9}v18` : `M${x - 9} ${y}h18`}
          stroke="currentColor"
          strokeWidth="3"
        />
      </g>,
    );
  }
  const pump = (id: PumpId, x: number, y: number) =>
    part(
      "pump",
      id,
      <g className={`pump ${v.pumpStatus[id].toLowerCase()}`}>
        <circle className="part-surface" cx={x} cy={y} r="19" />
        <path
          d={`M${x - 8} ${y + 6}L${x} ${y - 9}L${x + 8} ${y + 6}Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <text x={x} y={y + 35} textAnchor="middle" className="tiny">
          {id} · {v.pumpStatus[id]}
        </text>
      </g>,
    );
  return (
    <Panel
      title="İnteraktif yakıt şeması"
      eyebrow="ATA 28 / SYSTEM ARCHITECTURE"
      className="schematic-panel"
      action={
        <span className="live">
          <i />
          {sim.paused ? "DURAKLATILDI" : "CANLI MODEL"}
        </span>
      }
    >
      <div className={`schematic-wrap ${sim.paused ? "paused" : ""}`}>
        <svg viewBox="0 0 1000 595" role="group" aria-label="Uçak yakıt sistemi interaktif şeması">
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".6" fill="#2a4052" />
            </pattern>
            <linearGradient id="fuelFill" x2="0" y2="1">
              <stop stopColor="#628b96" stopOpacity=".24" />
              <stop offset="1" stopColor="#93c5d4" stopOpacity=".1" />
            </linearGradient>
          </defs>
          <rect width="1000" height="595" fill="url(#dots)" />
          <path
            className="aircraft-outline"
            d="M500 10Q526 34 528 109L535 177 948 357 948 384 537 285 535 465 633 532 633 550 523 516 515 575 485 575 477 516 367 550 367 532 465 465 463 285 52 384 52 357 465 177 472 109Q474 34 500 10Z"
          />
          <text x="25" y="29" className="diagram-label">
            GENERIC TWIN ENGINE
          </text>
          <text x="25" y="47" className="tiny">
            Şematik · ölçeksiz · komponentleri seç
          </text>
          <Pipe d="M215 157V95H785V157" rate={v.transferRate} kind="transfer" />
          {valve(500, 95, v.transferActual, "transfer", "Transfer valfi")}
          {part(
            "transfer",
            "Transfer pompası",
            <g>
              <rect className="part-surface" x="338" y="82" width="36" height="26" rx="4" />
              <text x="356" y="100" textAnchor="middle">
                P
              </text>
            </g>,
          )}
          <text x="595" y="84" className="diagram-label transfer-label">
            TRANSFER · {fmt(Math.abs(v.transferRate))} kg/h
          </text>
          <Pipe d="M615 185H642V49H568" rate={v.trimRate} kind="transfer" />
          {part(
            "trim",
            "Trim tank",
            <g>
              <rect className="part-surface" x="457" y="24" width="111" height="49" rx="6" />
              <rect
                x="461"
                y={69 - (s.tanks.T.q / CAPACITY.T) * 39}
                width="103"
                height={(s.tanks.T.q / CAPACITY.T) * 39}
                fill="#ad986733"
              />
              <text x="512" y="44" textAnchor="middle" className="tiny">
                TRIM TANK
              </text>
              <text x="512" y="61" textAnchor="middle">
                {fmt(s.tanks.T.q)} kg
              </text>
            </g>,
          )}
          {tanks.map(({ id, x, y }) => (
            <g key={id}>
              {part(
                "vent",
                `${tankName(id)} vent`,
                <g>
                  <path
                    d={`M${x + 30} ${y}v-31h-26`}
                    className={`vent-line ${s.faults.vent === id && !concealed ? "blocked" : ""}`}
                  />
                  <circle className="part-surface" cx={x} cy={y - 31} r="9" />
                  <text x={x + 18} y={y - 37} className="tiny">
                    VENT
                  </text>
                </g>,
              )}
              {part(
                "tank",
                `${tankName(id)} tankı`,
                <g>
                  <rect
                    x={x}
                    y={y}
                    width="220"
                    height="123"
                    rx="8"
                    className="tank-shell part-surface"
                  />
                  <rect
                    x={x + 3}
                    y={
                      y + 120 - ((concealed ? v.indicated[id] : s.tanks[id].q) / CAPACITY[id]) * 114
                    }
                    width="214"
                    height={((concealed ? v.indicated[id] : s.tanks[id].q) / CAPACITY[id]) * 114}
                    rx="4"
                    fill="url(#fuelFill)"
                  />
                  <text x={x + 16} y={y + 25} className="diagram-label">
                    {id === "C" ? "CENTER TANK" : id === "L" ? "LEFT WING TANK" : "RIGHT WING TANK"}
                  </text>
                  <text x={x + 16} y={y + 59} className="tank-quantity">
                    {fmt(v.indicated[id])}
                    <tspan className="tiny"> kg</tspan>
                  </text>
                  <text x={x + 16} y={y + 80} className="tiny">
                    {concealed ? "INDICATED QUANTITY" : `USABLE ${fmt(usable(s, id))} kg`} ·{" "}
                    {fmt(s.tanks[id].temp, 0)}°C
                  </text>
                  <rect x={x + 68} y={y + 98} width="84" height="23" rx="3" className="collector" />
                  <text x={x + 110} y={y + 114} textAnchor="middle" className="tiny">
                    COLLECTOR
                  </text>
                </g>,
              )}
              {part(
                "quantity",
                `${tankName(id)} quantity sensörü`,
                <g>
                  <circle className="part-surface" cx={x + 196} cy={y + 53} r="12" />
                  <text x={x + 196} y={y + 58} textAnchor="middle" className="tiny">
                    Q
                  </text>
                </g>,
              )}
              {part(
                "temperature",
                `${tankName(id)} sıcaklık sensörü`,
                <g>
                  <circle className="part-surface" cx={x + 196} cy={y + 87} r="12" />
                  <text x={x + 196} y={y + 92} textAnchor="middle" className="tiny">
                    T
                  </text>
                </g>,
              )}
            </g>
          ))}
          {(["L", "R"] as const).map((side) => {
            const xs = side === "L" ? [155, 265] : [725, 835];
            const mx = side === "L" ? 230 : 770;
            return (
              <g key={side}>
                {xs.map((x, i) => {
                  const id = `${side}${i + 1}` as PumpId;
                  return (
                    <g key={id}>
                      <Pipe d={`M${x} 280V304`} rate={v.pumpFlow[id]} />
                      <Pipe d={`M${x} 342V378H${mx}V420`} rate={v.pumpFlow[id]} />
                      {pump(id, x, 323)}
                      {part(
                        "check",
                        `${id} check valve`,
                        <path
                          className="check-symbol"
                          d={`M${x - 7} 365l7 9 7-9ZM${x - 8} 377h16`}
                        />,
                      )}
                    </g>
                  );
                })}
                {valve(
                  mx,
                  392,
                  s.controls.isolation[side],
                  "isolation",
                  `${side} source isolation`,
                )}
              </g>
            );
          })}
          {(["L", "R"] as const).map((side, i) => {
            const x = i === 0 ? 450 : 560,
              mx = i === 0 ? 230 : 770,
              id = `C${i + 1}` as PumpId;
            return (
              <g key={id}>
                <Pipe d={`M${x} 251V276`} rate={v.pumpFlow[id]} />
                <Pipe
                  d={`M${x} 314V361H${mx + (i === 0 ? 45 : -45)}V420H${mx}`}
                  rate={sourceRate("C", side)}
                />
                {pump(id, x, 295)}
                {part(
                  "check",
                  `${id} check valve`,
                  <path className="check-symbol" d={`M${x - 7} 341l7 9 7-9ZM${x - 8} 353h16`} />,
                )}
              </g>
            );
          })}
          <Pipe d="M230 420H770" rate={cross} />
          {part(
            "crossfeed",
            "Crossfeed valfi",
            <g className={v.crossfeedActual ? "valve-open" : "valve-closed"}>
              <circle className="part-surface" cx="500" cy="420" r="17" />
              <path
                d={v.crossfeedActual ? "M488 420h24" : "M500 408v24"}
                stroke="currentColor"
                strokeWidth="3"
              />
            </g>,
          )}
          <text x="500" y="456" textAnchor="middle" className="diagram-label">
            CROSSFEED
          </text>
          <text x="500" y="474" textAnchor="middle" className="tiny">
            CMD {s.controls.crossfeed ? "OPEN" : "CLOSED"} / ACT{" "}
            {v.crossfeedActual ? "OPEN" : "CLOSED"}
          </text>
          {(["L", "R"] as const).map((side) => {
            const x = side === "L" ? 230 : 770;
            const sources = [
              ...new Set(v.paths.filter((p) => p.engine === side).map((p) => p.source)),
            ];
            return (
              <g key={side}>
                <Pipe d={`M${x} 405V450`} rate={v.flow[side]} />
                <Pipe d={`M${x} 476V516`} rate={v.flow[side]} />
                {valve(x, 463, s.controls.shutoff[side], "shutoff", `${side} motor shutoff`)}
                <text x={x + 27} y="460" className="tiny">
                  SHUTOFF
                </text>
                {part(
                  "engine",
                  `Engine ${side === "L" ? 1 : 2}`,
                  <g
                    className={
                      v.flow[side] < v.demand[side] * 0.95 ? "engine-failed" : "engine-normal"
                    }
                  >
                    <rect
                      className="part-surface"
                      x={x - 85}
                      y="516"
                      width="170"
                      height="55"
                      rx="8"
                    />
                    <text x={x} y="537" textAnchor="middle" className="diagram-label">
                      ENGINE {side === "L" ? 1 : 2} · {fmt(v.flow[side])} kg/h
                    </text>
                    <text x={x} y="556" textAnchor="middle" className="tiny">
                      {sources.length ? sources.join(" + ") + " TANK → ENGINE" : "BESLEME YOK"}
                    </text>
                  </g>,
                )}
                <text x={x} y="495" textAnchor="middle" className="tiny">
                  {fmt(v.pressure[side], 1)} psi
                </text>
              </g>
            );
          })}
          {part(
            "jettison",
            "Wing jettison nozzle",
            <g>
              <path d="M105 240H64L28 281M895 240H936L972 281" className="dump-base" />
              {v.dumpRate > 0 && (
                <g className="jettison-plume">
                  {usable(s, "L") > 0 && (
                    <g>
                      <path d="M64 240L19 294" />
                      <path d="M64 240L33 305" />
                    </g>
                  )}
                  {usable(s, "R") > 0 && (
                    <g>
                      <path d="M936 240L981 294" />
                      <path d="M936 240L967 305" />
                    </g>
                  )}
                </g>
              )}
              <text x="25" y="325" className="tiny">
                JETTISON
              </text>
              <text x="902" y="325" className="tiny">
                JETTISON
              </text>
            </g>,
          )}
          {part(
            "drain",
            "Sol tank drain",
            <g>
              <path d="M106 265H83V296" className="vent-line" />
              <circle cx="83" cy="300" r="7" className="part-surface" />
            </g>,
          )}
        </svg>
      </div>
      <div className="schematic-legend">
        <span>
          <i className="key-feed" />
          Engine feed
        </span>
        <span>
          <i className="key-transfer" />
          Tank transferi
        </span>
        <span>
          <i className="key-off" />
          Akış yok
        </span>
        <span>Check valve: ▷| · Collector ana tank miktarına dahil</span>
      </div>
    </Panel>
  );
}
