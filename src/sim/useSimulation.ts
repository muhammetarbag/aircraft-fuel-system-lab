import { useEffect, useReducer } from "react";
import { advance, derive, patchControls } from "./engine.ts";
import { preset } from "./scenarios.ts";
import type { PresetId } from "./scenarios.ts";
import type { Controls, Faults, Sample, State } from "./types.ts";
export interface Simulation {
  state: State;
  samples: Sample[];
  speed: number;
  paused: boolean;
  wall: number;
  changes: number;
  events: string[];
}
type Action =
  | { type: "tick"; dt: number }
  | { type: "preset"; id: PresetId }
  | { type: "control"; patch: Partial<Controls>; message: string }
  | { type: "fault"; patch: Partial<Faults> }
  | { type: "speed"; speed: number }
  | { type: "pause" };
function sample(state: State, wall: number): Sample {
  const v = derive(state);
  return {
    wall,
    sim: state.time,
    total: v.total,
    left: state.tanks.L.q,
    right: state.tanks.R.q,
    center: state.tanks.C.q,
    pressure: v.pressure.L,
    flow: v.flow.L + v.flow.R,
    cg: v.cgMac,
    vent: state.tanks.L.pressure,
  };
}
function init(): Simulation {
  const state = preset("normal");
  return {
    state,
    samples: [sample(state, 0)],
    speed: 1,
    paused: false,
    wall: 0,
    changes: 0,
    events: [],
  };
}
function reducer(current: Simulation, action: Action): Simulation {
  if (action.type === "preset") {
    const state = preset(action.id);
    return { ...init(), state, samples: [sample(state, 0)], speed: current.speed };
  }
  if (action.type === "speed") return { ...current, speed: action.speed };
  if (action.type === "pause") return { ...current, paused: !current.paused };
  if (action.type === "control")
    return {
      ...current,
      state: patchControls(current.state, action.patch),
      changes: current.changes + 1,
      events: [`${current.state.time.toFixed(0)}s · ${action.message}`, ...current.events].slice(
        0,
        12,
      ),
    };
  if (action.type === "fault")
    return {
      ...current,
      state: { ...current.state, faults: { ...current.state.faults, ...action.patch } },
    };
  if (current.paused) return current;
  const state = advance(current.state, action.dt * current.speed),
    wall = current.wall + action.dt;
  return {
    ...current,
    state,
    wall,
    samples: [...current.samples.filter((s) => s.wall > wall - 60), sample(state, wall)],
  };
}
export function useSimulation() {
  const [sim, dispatch] = useReducer(reducer, undefined, init);
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.4, (now - last) / 1000);
      last = now;
      if (!document.hidden) dispatch({ type: "tick", dt });
    }, 200);
    return () => clearInterval(id);
  }, []);
  return { ...sim, view: derive(sim.state), dispatch };
}
export type Sim = ReturnType<typeof useSimulation>;
