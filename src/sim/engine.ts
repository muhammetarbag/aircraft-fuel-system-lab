import type {
  Controls,
  FeedPath,
  MainTank,
  PumpId,
  Side,
  Snapshot,
  State,
  Tank,
  TankId,
  Warning,
} from "./types.ts";

export const TANKS: TankId[] = ["L", "C", "R", "T"];
export const MAINS: MainTank[] = ["L", "C", "R"];
export const DUMP_TANKS: Side[] = ["L", "R"];
export const PUMPS: PumpId[] = ["L1", "L2", "C1", "C2", "R1", "R2"];
export const CAPACITY = { L: 6000, C: 8000, R: 6000, T: 2000 };
export const RESIDUAL = { L: 40, C: 30, R: 40, T: 20 };
export const ARM = { L: 16, C: 15, R: 16, T: 32 };
export const MODEL = {
  dryWeight: 60000,
  dryArm: 16,
  landingWeight: 66000,
  macStart: 14,
  macLength: 6,
  forwardMac: 25,
  aftMac: 40,
  pumpCapacity: 3600,
  transferRate: 30000,
  trimRate: 12000,
  dumpRate: 60000,
  refuelRate: 60000,
  defuelRate: 45000,
};
export const tankName = (id: TankId): string =>
  ({ L: "Sol kanat", C: "Merkez", R: "Sağ kanat", T: "Trim" })[id];
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
export const usable = (s: State, id: TankId): number => Math.max(0, s.tanks[id].q - RESIDUAL[id]);
export const total = (s: State): number => TANKS.reduce((n, id) => n + s.tanks[id].q, 0);
export const density = (t: number): number => 800 / (1 + 0.00095 * (t - 15));
export const ullage = (id: TankId, t: Tank): number =>
  Math.max(0.15, (CAPACITY[id] / 800) * 1.08 - t.q / density(t.temp));
export const balanceError = (s: State): number =>
  total(s) -
  (s.ledger.initial +
    s.ledger.refuel -
    s.ledger.burn -
    s.ledger.leak -
    s.ledger.jettison -
    s.ledger.defuel -
    s.ledger.drain);

export function initialState(): State {
  const state: State = {
    time: 0,
    tanks: {
      L: { q: 4200, temp: 15, pressure: 0, water: 2 },
      C: { q: 3000, temp: 15, pressure: 0, water: 0 },
      R: { q: 4200, temp: 15, pressure: 0, water: 0 },
      T: { q: 0, temp: 15, pressure: 0, water: 0 },
    },
    controls: {
      pumps: { L1: true, L2: true, C1: false, C2: false, R1: true, R2: true },
      crossfeed: false,
      shutoff: { L: true, R: true },
      isolation: { L: true, R: true },
      demand: { L: 2000, R: 2000 },
      restriction: { L: 0, R: 0 },
      capability: 1,
      transfer: "off",
      transferPump: true,
      transferValve: true,
      trim: "off",
      jettison: false,
      dumpTarget: 6000,
      service: "off",
      ground: false,
      refuelTarget: 12000,
      ambient: 15,
      inerting: false,
      drain: false,
    },
    faults: {
      pumps: [],
      crossfeedStuck: false,
      transferStuck: false,
      vent: null,
      leak: null,
      leakRate: 7200,
      sensor: null,
      frozenQuantity: 4200,
    },
    ledger: { initial: 11400, refuel: 0, burn: 0, leak: 0, jettison: 0, defuel: 0, drain: 0 },
    oxygen: 21,
    waterDrained: 0,
  };
  return state;
}

export function patchControls(s: State, patch: Partial<Controls>): State {
  const controls = { ...s.controls, ...patch };
  if (!controls.ground) {
    controls.service = "off";
    controls.drain = false;
  }
  if (controls.ground) controls.jettison = false;
  if (
    controls.service === "refuel" &&
    (total(s) >= controls.refuelTarget || MAINS.every((id) => s.tanks[id].q >= CAPACITY[id]))
  )
    controls.service = "off";
  if (controls.service === "defuel" && TANKS.every((id) => usable(s, id) <= 0))
    controls.service = "off";
  if (controls.service !== "off") {
    controls.transfer = "off";
    controls.trim = "off";
    controls.drain = false;
  }
  return { ...s, controls };
}

interface Source {
  tank: MainTank;
  leg: Side;
  pumps: PumpId[];
  available: number;
  capacity: number;
  head: number;
}

// A steady supply network is solved first; integration is an independent step.
// Wing sources are isolated by their outlet valves. Center legs each have a pump.
export function derive(s: State, dt = 0.2): Snapshot {
  const c = s.controls,
    f = s.faults;
  const crossfeedActual = c.crossfeed && !f.crossfeedStuck;
  const transferActual = c.transferValve && !f.transferStuck;
  const flow = { L: 0, R: 0 },
    pressure = { L: 0, R: 0 },
    manifold = { L: 0, R: 0 };
  const demand = { L: c.ground ? 0 : c.demand.L, R: c.ground ? 0 : c.demand.R };
  const remaining = {
    L: c.shutoff.L ? Math.min(demand.L, 6000 * (1 - c.restriction.L) ** 2) : 0,
    R: c.shutoff.R ? Math.min(demand.R, 6000 * (1 - c.restriction.R) ** 2) : 0,
  };
  const pumpHead = {} as Record<PumpId, number>,
    pumpFlow = {} as Record<PumpId, number>,
    pumpInlet = {} as Record<PumpId, number>,
    pumpStatus = {} as Snapshot["pumpStatus"];
  const factor = (id: MainTank): number => clamp((s.tanks[id].pressure + 20) / 20, 0, 1);
  for (const p of PUMPS) {
    const id = p[0] as MainTank;
    pumpStatus[p] = f.pumps.includes(p)
      ? "FAIL"
      : !c.pumps[p]
        ? "OFF"
        : usable(s, id) < 1e-7 || factor(id) < 0.01
          ? "DRY"
          : "ON";
    pumpInlet[p] = s.tanks[id].pressure * 0.145 + (s.tanks[id].q / CAPACITY[id]) * 1.2;
    pumpHead[p] = pumpStatus[p] === "ON" ? (id === "C" ? 45 : 40) * c.capability * factor(id) : 0;
    pumpFlow[p] = 0;
  }
  const sources: Source[] = [
    { tank: "C", leg: "L", pumps: ["C1"], available: 0, capacity: 0, head: 0 },
    { tank: "C", leg: "R", pumps: ["C2"], available: 0, capacity: 0, head: 0 },
    { tank: "L", leg: "L", pumps: ["L1", "L2"], available: 0, capacity: 0, head: 0 },
    { tank: "R", leg: "R", pumps: ["R1", "R2"], available: 0, capacity: 0, head: 0 },
  ];
  const tankBudget = Object.fromEntries(
    MAINS.map((id) => [id, (usable(s, id) * 3600) / Math.max(dt, 0.001)]),
  ) as Record<MainTank, number>;
  for (const src of sources) {
    const running = src.pumps.filter((p) => pumpStatus[p] === "ON");
    src.capacity = running.length * MODEL.pumpCapacity * c.capability * factor(src.tank);
    src.available = src.tank !== "C" && !c.isolation[src.leg] ? 0 : src.capacity;
    src.head = Math.max(...src.pumps.map((p) => pumpHead[p]));
  }
  const paths: FeedPath[] = [];
  const allocate = (src: Source, engine: Side): void => {
    const amount = Math.min(src.available, tankBudget[src.tank], remaining[engine]);
    if (amount <= 1e-8) return;
    paths.push({ source: src.tank, leg: src.leg, engine, rate: amount });
    src.available -= amount;
    tankBudget[src.tank] -= amount;
    remaining[engine] -= amount;
    flow[engine] += amount;
    const active = src.pumps.filter((p) => pumpStatus[p] === "ON");
    for (const p of active) pumpFlow[p] += amount / active.length;
  };
  // Chosen teaching priority: center first, then own wing, then opposite wing.
  for (const group of [sources.slice(0, 2), sources.slice(2)]) {
    for (const src of group) allocate(src, src.leg);
    if (crossfeedActual) for (const src of group) allocate(src, src.leg === "L" ? "R" : "L");
  }
  for (const src of sources) {
    const active = src.pumps.filter((p) => pumpStatus[p] === "ON");
    const utilization = src.capacity
      ? active.reduce((n, p) => n + pumpFlow[p], 0) / src.capacity
      : 0;
    const head = src.head * (1 - 0.25 * utilization ** 2);
    for (const p of active) pumpHead[p] = head;
    if (src.capacity > 0 && (src.tank === "C" || c.isolation[src.leg])) {
      manifold[src.leg] = Math.max(manifold[src.leg], head);
      if (crossfeedActual) {
        const other = src.leg === "L" ? "R" : "L";
        manifold[other] = Math.max(manifold[other], head * 0.97);
      }
    }
  }
  for (const side of ["L", "R"] as const)
    pressure[side] = c.shutoff[side] ? manifold[side] * (1 - c.restriction[side]) ** 2 : 0;
  const mass = total(s),
    weight = MODEL.dryWeight + mass;
  const cg =
    (MODEL.dryWeight * MODEL.dryArm + TANKS.reduce((n, id) => n + s.tanks[id].q * ARM[id], 0)) /
    weight;
  const imbalance = s.tanks.R.q - s.tanks.L.q;
  let transferRate = 0;
  if (c.transferPump && transferActual && c.service === "off") {
    const mode =
      c.transfer === "auto" ? (imbalance > 1 ? "R-L" : imbalance < -1 ? "L-R" : "off") : c.transfer;
    if (mode !== "off") {
      const from: Side = mode === "L-R" ? "L" : "R",
        to: Side = from === "L" ? "R" : "L";
      const rate = Math.min(
        MODEL.transferRate,
        (usable(s, from) * 3600) / dt,
        ((CAPACITY[to] - s.tanks[to].q) * 3600) / dt,
        c.transfer === "auto" ? ((Math.abs(imbalance) / 2) * 3600) / dt : Infinity,
      );
      transferRate = Math.max(0, rate) * (from === "L" ? 1 : -1);
    }
  }
  let trimRate = 0;
  if (c.trim !== "off" && c.service === "off") {
    const from = c.trim === "aft" ? "C" : "T",
      to = c.trim === "aft" ? "T" : "C";
    trimRate =
      Math.max(
        0,
        Math.min(
          MODEL.trimRate,
          (usable(s, from) * 3600) / dt,
          ((CAPACITY[to] - s.tanks[to].q) * 3600) / dt,
        ),
      ) * (c.trim === "aft" ? 1 : -1);
  }
  const dumpable = DUMP_TANKS.reduce((n, id) => n + usable(s, id), 0);
  const dumpRate =
    c.jettison && !c.ground
      ? Math.max(
          0,
          Math.min(MODEL.dumpRate, ((mass - c.dumpTarget) * 3600) / dt, (dumpable * 3600) / dt),
        )
      : 0;
  const serviceRate = !c.ground
    ? 0
    : c.service === "refuel"
      ? Math.max(
          0,
          Math.min(
            MODEL.refuelRate,
            ((c.refuelTarget - mass) * 3600) / dt,
            (MAINS.reduce((n, id) => n + CAPACITY[id] - s.tanks[id].q, 0) * 3600) / dt,
          ),
        )
      : c.service === "defuel"
        ? -Math.min(MODEL.defuelRate, (TANKS.reduce((n, id) => n + usable(s, id), 0) * 3600) / dt)
        : 0;
  const indicated = Object.fromEntries(
    TANKS.map((id) => [id, f.sensor === id ? f.frozenQuantity : s.tanks[id].q]),
  ) as Record<TankId, number>;
  const warnings: Warning[] = [];
  const warn = (code: string, why: string, level: "caution" | "warning" = "caution"): void => {
    warnings.push({ code, why, level });
  };
  for (const side of ["L", "R"] as const) {
    if (demand[side] > 0 && (pressure[side] < 10 || flow[side] < demand[side] * 0.95))
      warn(
        `${side} LOW PRESSURE / FEED`,
        `${side} motor talebi ${demand[side].toFixed(0)} kg/h, ulaşan ${flow[side].toFixed(0)} kg/h; giriş ${pressure[side].toFixed(1)} psi. Kaynak, izolasyon, shutoff ve restriction konumlarını karşılaştır.`,
        "warning",
      );
    if (indicated[side] < 600)
      warn(
        `${side} LOW FUEL`,
        `${tankName(side)} göstergesi öğretim eşiği 600 kg altında. Quantity bir ölçümdür; arızada gerçek kütleden farklı olabilir.`,
      );
  }
  if (Math.abs(indicated.R - indicated.L) > 1000)
    warn(
      "FUEL IMBALANCE",
      `Gösterilen kanat farkı ${Math.abs(indicated.R - indicated.L).toFixed(0)} kg; öğretim eşiği 1000 kg. Crossfeed tüketim kaynağını, transfer doğrudan tank dağılımını değiştirir.`,
    );
  if (f.pumps.length)
    warn(
      "PUMP FAIL",
      `Arıza geri bildirimi: ${f.pumps.join(", ")}. Yedek pompanın kullanılabilirliği ayrı kontrol edilir.`,
    );
  if (c.crossfeed !== crossfeedActual)
    warn(
      "VALVE DISAGREE",
      "Crossfeed OPEN komutu var fakat konum geri bildirimi CLOSED. Komut, gerçek konum değildir.",
    );
  if (c.transfer !== "off" && c.transferValve && !transferActual)
    warn(
      "TRANSFER VALVE DISAGREE",
      "Transfer valfine OPEN komutu verildi; gerçek konum CLOSED. Tanklar arası akış oluşmaz.",
    );
  if (
    (c.pumps.C1 || c.pumps.C2) &&
    ((c.pumps.C1 && pumpHead.C1 < 10) || (c.pumps.C2 && pumpHead.C2 < 10))
  )
    warn(
      "CENTER TANK LOW PRESSURE",
      "Açılması istenen merkez pompa kolunda yeterli çıkış basıncı yok. Yakıt kullanılabilirliğini ve pompa durumunu birlikte oku.",
    );
  if (MAINS.some((id) => s.tanks[id].temp < -35 || s.tanks[id].temp > 50))
    warn(
      "FUEL TEMP",
      "Sıcaklık öğretim aralığı −35…50 °C dışında. Bu değerler bir yakıt türünün donma noktası veya uçak limiti değildir.",
    );
  for (const id of MAINS)
    if (Math.abs(s.tanks[id].pressure) > 3)
      warn(
        `${id} TANK PRESSURE`,
        `${tankName(id)} tankı ortamdan ${s.tanks[id].pressure.toFixed(2)} kPa farklı. Hacim/sıcaklık değişimi vent ile dengelenemiyor.`,
      );
  const cgMac = ((cg - MODEL.macStart) / MODEL.macLength) * 100;
  if (cgMac < MODEL.forwardMac || cgMac > MODEL.aftMac)
    warn(
      "CG OUTSIDE DEMO RANGE",
      `CG ${cgMac.toFixed(1)} %MAC; yalnız bu modelin ${MODEL.forwardMac}–${MODEL.aftMac} %MAC aralığı dışında.`,
    );
  const use = TANKS.reduce((n, id) => n + usable(s, id), 0);
  return {
    total: mass,
    usable: use,
    weight,
    cg,
    cgMac,
    imbalance,
    lateralCg: (imbalance * 7) / weight,
    endurance: flow.L + flow.R > 0 ? use / (flow.L + flow.R) : null,
    indicated,
    crossfeedActual,
    transferActual,
    flow,
    demand,
    pressure,
    manifold,
    pumpHead,
    pumpFlow,
    pumpInlet,
    pumpStatus,
    paths,
    transferRate,
    trimRate,
    dumpRate,
    serviceRate,
    leakRate: f.leak ? Math.min(f.leakRate, (s.tanks[f.leak].q * 3600) / dt) : 0,
    warnings,
    balanceError: balanceError(s),
  };
}

function take(s: State, id: TankId, requested: number, floor = RESIDUAL[id]): number {
  const amount = clamp(requested, 0, Math.max(0, s.tanks[id].q - floor));
  s.tanks[id].q -= amount;
  return amount;
}
function move(s: State, from: TankId, to: TankId, amount: number): void {
  s.tanks[to].q += take(s, from, Math.min(amount, CAPACITY[to] - s.tanks[to].q));
}
function withdraw(s: State, ids: TankId[], amount: number): number {
  const sum = ids.reduce((n, id) => n + usable(s, id), 0);
  return sum <= 0
    ? 0
    : ids.reduce((n, id) => n + take(s, id, (Math.min(amount, sum) * usable(s, id)) / sum), 0);
}

function integrate(s: State, dt: number): void {
  const view = derive(s, dt),
    hours = dt / 3600,
    c = s.controls;
  const old = structuredClone(s.tanks);
  for (const path of view.paths) s.ledger.burn += take(s, path.source, path.rate * hours);
  if (view.transferRate)
    move(
      s,
      view.transferRate > 0 ? "L" : "R",
      view.transferRate > 0 ? "R" : "L",
      Math.abs(view.transferRate) * hours,
    );
  if (view.trimRate)
    move(
      s,
      view.trimRate > 0 ? "C" : "T",
      view.trimRate > 0 ? "T" : "C",
      Math.abs(view.trimRate) * hours,
    );
  if (s.faults.leak) s.ledger.leak += take(s, s.faults.leak, view.leakRate * hours, 0);
  if (view.dumpRate)
    s.ledger.jettison += withdraw(
      s,
      DUMP_TANKS,
      Math.min(view.dumpRate * hours, Math.max(0, total(s) - c.dumpTarget)),
    );
  if (view.serviceRate > 0) {
    let remaining = Math.min(view.serviceRate * hours, Math.max(0, c.refuelTarget - total(s)));
    // Symmetric wing filling to 4 t each, then center, then remaining wing room.
    for (const target of [4000, 6000]) {
      if (target === 6000) {
        const q = Math.min(remaining, CAPACITY.C - s.tanks.C.q);
        s.tanks.C.q += q;
        s.ledger.refuel += q;
        remaining -= q;
      }
      const wings: Side[] = s.tanks.L.q <= s.tanks.R.q ? ["L", "R"] : ["R", "L"];
      const low = wings[0],
        high = wings[1];
      const catchUp = Math.min(
        remaining,
        Math.max(0, Math.min(target, s.tanks[high].q) - s.tanks[low].q),
      );
      s.tanks[low].q += catchUp;
      s.ledger.refuel += catchUp;
      remaining -= catchUp;
      const shared = Math.min(
        remaining / 2,
        Math.max(0, target - s.tanks.L.q),
        Math.max(0, target - s.tanks.R.q),
      );
      for (const side of wings) s.tanks[side].q += shared;
      remaining -= shared * 2;
      s.ledger.refuel += shared * 2;
    }
    if (
      total(s) >= c.refuelTarget - 1e-5 ||
      MAINS.every((id) => s.tanks[id].q >= CAPACITY[id] - 1e-5)
    )
      c.service = "off";
  }
  if (view.serviceRate < 0) {
    s.ledger.defuel += withdraw(s, TANKS, -view.serviceRate * hours);
    if (TANKS.every((id) => usable(s, id) < 1e-6)) c.service = "off";
  }
  if (c.drain && c.ground && c.service === "off") {
    const water = Math.min(s.tanks.L.water, 0.15 * dt);
    s.tanks.L.water -= water;
    s.waterDrained += water;
    const fuelTime = dt - water / 0.15;
    s.ledger.drain += take(s, "L", fuelTime * 0.12, 0);
  }
  for (const id of TANKS) {
    const tank = s.tanks[id];
    tank.temp += (c.ambient - tank.temp) * (1 - Math.exp(-dt / 120));
    if (s.faults.vent === id) {
      // Sealed ullage: ideal-gas P*V/T relation; absolute P, displayed relative P.
      tank.pressure =
        ((((101.3 + old[id].pressure) * ullage(id, old[id])) / ullage(id, tank)) *
          (tank.temp + 273.15)) /
          (old[id].temp + 273.15) -
        101.3;
    } else tank.pressure *= Math.exp(-dt / 2);
  }
  s.oxygen += ((c.inerting ? 9 : 21) - s.oxygen) * (1 - Math.exp(-dt / (c.inerting ? 70 : 120)));
  s.time += dt;
}

export function advance(input: State, seconds: number): State {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600)
    throw new RangeError("step must be 0…3600 seconds");
  const s = structuredClone(input);
  let remaining = seconds;
  while (remaining > 1e-9) {
    const dt = Math.min(0.2, remaining);
    integrate(s, dt);
    remaining -= dt;
  }
  s.time = input.time + seconds;
  return s;
}

export function why(s: State, topic: string): string {
  const v = derive(s);
  if (topic === "pump")
    return (
      PUMPS.map(
        (p) =>
          `${p}: ${v.pumpStatus[p]}, çıkış ${v.pumpHead[p].toFixed(1)} psi, flow ${v.pumpFlow[p].toFixed(0)} kg/h`,
      ).join("; ") +
      ". ON komutu tek başına debi kanıtı değildir; yakıt, emiş koşulu, açık hat ve talep birlikte gerekir. Paralel pompalar burada kapasite ve yedeklilik sağlar."
    );
  if (topic === "temperature")
    return `Yakıt sıcaklığı L/C/R: ${MAINS.map((id) => s.tanks[id].temp.toFixed(1)).join(" / ")} °C; çevre ${s.controls.ambient} °C. Yakıt bu çevreye zamanla yaklaşır; sıcaklık değişiminde kütle sabit kalırken yoğunluk ve hacim değişir. FUEL TEMP eşiği gerçek yakıt donma limiti değildir.`;
  if (topic === "service" || topic === "refuel")
    return `Uçak ${s.controls.ground ? "yerde" : "uçuşta"}, servis ${s.controls.service}. Net servis akışı ${v.serviceRate.toFixed(0)} kg/h, hedef ${s.controls.refuelTarget} kg, mevcut ${v.total.toFixed(0)} kg. Yer koşulu, toplam hedef ve ayrı tank kapasiteleri dolumu sınırlar; servicing sırasında transfer devre dışıdır.`;
  if (topic === "indications")
    return `Sol gösterge ${v.indicated.L.toFixed(1)} kg, engine 1 akışı ${v.flow.L.toFixed(0)} kg/h. ${s.faults.sensor ? "Quantity sensörü donmuş; gerçek yakıt tüketilirken gösterge sabit kalıyor." : "Quantity sensörleri bu modelde gerçek tank kütlesini izliyor."} Konum, basınç ve tüketim birlikte değerlendirilmelidir.`;
  if (topic === "center")
    return `Merkezde ${s.tanks.C.q.toFixed(0)} kg var; C1/C2 ${v.pumpStatus.C1}/${v.pumpStatus.C2}, toplam merkez feedi ${(v.pumpFlow.C1 + v.pumpFlow.C2).toFixed(0)} kg/h. Bu model center kaynaklarını öncelikli seçer; başarısız/kapalı/boş kaynak yerine erişilebilir wing kaynağı kullanılır.`;
  if (topic === "check")
    return `Aktif kaynak yolları: ${v.paths.map((p) => `${p.source} → ENG ${p.engine}`).join(", ") || "yok"}. İdeal check valfler bu yollarda geri akışı engeller; açık crossfeed bu nedenle başka bir tanka geriye dolum yapmaz. Check-valve arıza dinamiği bu modelde çözülmez.`;
  if (topic === "isolation" || topic === "shutoff")
    return `Wing isolation L/R ${s.controls.isolation.L ? "OPEN" : "CLOSED"}/${s.controls.isolation.R ? "OPEN" : "CLOSED"}, engine shutoff L/R ${s.controls.shutoff.L ? "OPEN" : "CLOSED"}/${s.controls.shutoff.R ? "OPEN" : "CLOSED"}. Isolation wing kaynağını, shutoff motor yolunu keser. Ulaşan L/R flow ${v.flow.L.toFixed(0)}/${v.flow.R.toFixed(0)} kg/h. Tank gövdesindeki kaçak bu valflerden önce olduğundan devam edebilir.`;
  if (topic === "crossfeed")
    return !s.controls.crossfeed
      ? "Crossfeed CLOSED: sağ ve sol feed manifoldları ayrı. Tanklar arası transfer hattı bundan bağımsız."
      : !v.crossfeedActual
        ? "OPEN komutuna rağmen konum CLOSED. Valf takılı; sağ kaynak sol manifoldla birleşemiyor."
        : `Crossfeed OPEN. Şu an karşı tarafa geçen akış ${v.paths
            .filter((p) => p.leg !== p.engine)
            .reduce((n, p) => n + p.rate, 0)
            .toFixed(0)} kg/h. Açık bağlantı tek başına debi oluşturmaz; kaynak ve talep gerekir.`;
  if (topic === "cg" || topic === "trim")
    return `CG ${v.cg.toFixed(3)} m. Merkez tank kolu ${ARM.C} m, trim kolu ${ARM.T} m; trimde ${s.tanks.T.q.toFixed(0)} kg var. Aynı kütleyi arkaya taşıma toplam ağırlığı değiştirmeden momenti artırır. Motor tüketimi ise hem ağırlığı hem momenti değiştirir.`;
  if (topic === "quantity" || topic === "tank")
    return `Başlangıç ${s.ledger.initial.toFixed(1)} + ikmal ${s.ledger.refuel.toFixed(1)} − motor ${s.ledger.burn.toFixed(1)} − kaçak ${s.ledger.leak.toFixed(1)} − jettison ${s.ledger.jettison.toFixed(1)} − defuel ${s.ledger.defuel.toFixed(1)} − drain ${s.ledger.drain.toFixed(1)} = ${v.total.toFixed(1)} kg. Transfer, toplam kütleyi değiştirmez.`;
  if (topic === "vent")
    return `${tankName(s.faults.vent ?? "L")} tankı Δp=${s.tanks[s.faults.vent ?? "L"].pressure.toFixed(2)} kPa. ${s.faults.vent ? "Vent kapalı: yakıt çıkınca ullage büyür, gaz basıncı düşer. Isınma ters yönde basınç etkisi yapar." : "Vent açık: hava girip çıkarak basıncı ortama yaklaştırır."}`;
  if (topic === "inerting")
    return `Ullage O₂ şu an %${s.oxygen.toFixed(1)}. ${s.controls.inerting ? "NEA, oksijeni azaltıyor." : "Normal hava bileşimine yaklaşılıyor."} Oksijen azalması yanıcılık olasılığını azaltır; ateşleme kaynağı, sıcaklık ve buhar oranı da önemlidir. Bu gösterge bir güvenli işletim limiti değildir.`;
  if (topic === "transfer")
    return `Transfer komutu ${s.controls.transfer}; pompa ${s.controls.transferPump ? "ON" : "OFF"}, gerçek valf ${v.transferActual ? "OPEN" : "CLOSED"}, akış ${Math.abs(v.transferRate).toFixed(0)} kg/h. Kaynakta usable fuel ve hedefte yer yoksa akış durur.`;
  if (topic === "jettison")
    return `Ağırlık ${v.weight.toFixed(0)} kg, örnek MLW ${MODEL.landingWeight} kg. Jettison ${v.dumpRate.toFixed(0)} kg/h. Yerde devre dışı; uçuşta ${s.controls.dumpTarget} kg toplam yakıt hedefinde kesilir. Bu hedef yalnız öğretim modeline aittir.`;
  if (topic === "drain")
    return `Sol tank dibinde ${s.tanks.L.water.toFixed(2)} L su kaldı. Toplanan su ${s.waterDrained.toFixed(2)} L, çıkan yakıt ${s.ledger.drain.toFixed(2)} kg. İdeal çökelme modelinde alttaki su önce çıkar.`;
  return `Sol manifold ${v.manifold.L.toFixed(1)} psi → motor girişi ${v.pressure.L.toFixed(1)} psi; motor talebi ${v.demand.L.toFixed(0)}, ulaşan akış ${v.flow.L.toFixed(0)} kg/h. ${!s.controls.shutoff.L ? "Shutoff kapalı: pompa çıkışında basınç bulunabilir ama motora akış yok." : s.controls.restriction.L > 0.2 ? "Kısıtlama, pompa tarafında basınç varken motor tarafındaki akışı sınırlar." : v.flow.L < v.demand.L ? "Kaynak kapasitesi veya açık besleme yolu talebi karşılamıyor." : "Açık besleme yolu ve pompa kapasitesi talebi karşılıyor."}`;
}
