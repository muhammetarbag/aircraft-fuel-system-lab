export type TankId = "L" | "C" | "R" | "T";
export type MainTank = Exclude<TankId, "T">;
export type Side = "L" | "R";
export type PumpId = "L1" | "L2" | "R1" | "R2" | "C1" | "C2";
export type TransferMode = "off" | "L-R" | "R-L" | "auto";
export type TrimMode = "off" | "aft" | "forward";
export type ServiceMode = "off" | "refuel" | "defuel";
export interface Tank {
  q: number;
  temp: number;
  pressure: number;
  water: number;
}
export interface Controls {
  pumps: Record<PumpId, boolean>;
  crossfeed: boolean;
  shutoff: Record<Side, boolean>;
  isolation: Record<Side, boolean>;
  demand: Record<Side, number>;
  restriction: Record<Side, number>;
  capability: number;
  transfer: TransferMode;
  transferPump: boolean;
  transferValve: boolean;
  trim: TrimMode;
  jettison: boolean;
  dumpTarget: number;
  service: ServiceMode;
  ground: boolean;
  refuelTarget: number;
  ambient: number;
  inerting: boolean;
  drain: boolean;
}
export interface Faults {
  pumps: PumpId[];
  crossfeedStuck: boolean;
  transferStuck: boolean;
  vent: MainTank | null;
  leak: MainTank | null;
  leakRate: number;
  sensor: MainTank | null;
  frozenQuantity: number;
}
export interface Ledger {
  initial: number;
  refuel: number;
  burn: number;
  leak: number;
  jettison: number;
  defuel: number;
  drain: number;
}
export interface State {
  time: number;
  tanks: Record<TankId, Tank>;
  controls: Controls;
  faults: Faults;
  ledger: Ledger;
  oxygen: number;
  waterDrained: number;
}
export interface FeedPath {
  source: MainTank;
  leg: Side;
  engine: Side;
  rate: number;
}
export interface Snapshot {
  total: number;
  usable: number;
  weight: number;
  cg: number;
  cgMac: number;
  imbalance: number;
  lateralCg: number;
  endurance: number | null;
  indicated: Record<TankId, number>;
  crossfeedActual: boolean;
  transferActual: boolean;
  flow: Record<Side, number>;
  demand: Record<Side, number>;
  pressure: Record<Side, number>;
  manifold: Record<Side, number>;
  pumpHead: Record<PumpId, number>;
  pumpFlow: Record<PumpId, number>;
  pumpInlet: Record<PumpId, number>;
  pumpStatus: Record<PumpId, "ON" | "OFF" | "FAIL" | "DRY">;
  paths: FeedPath[];
  transferRate: number;
  trimRate: number;
  dumpRate: number;
  serviceRate: number;
  leakRate: number;
  warnings: Warning[];
  balanceError: number;
}
export interface Warning {
  code: string;
  level: "caution" | "warning";
  why: string;
}
export interface Sample {
  wall: number;
  sim: number;
  total: number;
  left: number;
  right: number;
  center: number;
  pressure: number;
  flow: number;
  cg: number;
  vent: number;
}
