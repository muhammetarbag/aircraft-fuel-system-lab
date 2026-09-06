import test from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  ARM,
  balanceError,
  CAPACITY,
  derive,
  initialState,
  MODEL,
  patchControls,
  PUMPS,
  RESIDUAL,
  TANKS,
  total,
  why,
} from "../src/sim/engine.ts";
import { DIAGNOSES, MISSIONS, PRESETS, preset } from "../src/sim/scenarios.ts";
import { QUESTIONS } from "../src/content/questions.ts";
import { LAB_PRESETS, LESSONS, PARTS } from "../src/content/lessons.ts";
import type { State } from "../src/sim/types.ts";
const close = (a: number, b: number, tolerance = 1e-6): void =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);
const still = (s: State): State => {
  s.controls.demand = { L: 0, R: 0 };
  return s;
};
const rebalance = (s: State): State => {
  s.ledger.initial = total(s);
  return s;
};
const conserved = (s: State): void => {
  close(balanceError(s), 0, 1e-5);
  for (const id of TANKS) {
    assert.ok(Number.isFinite(s.tanks[id].q));
    assert.ok(s.tanks[id].q >= -1e-8);
    assert.ok(s.tanks[id].q <= CAPACITY[id] + 1e-8);
  }
};

test("starting refuel at or below current total stays stopped", () => {
  let s = preset("refuel");
  s = patchControls(s, { refuelTarget: 1000, service: "refuel" });
  assert.equal(s.controls.service, "off");
  close(derive(s).serviceRate, 0);
  close(total(advance(s, 10)), 1000);
});

test("normal feed uses independent wing sources and exact hourly consumption", () => {
  const s = initialState(),
    v = derive(s);
  assert.deepEqual(
    v.paths.map((p) => [p.source, p.engine]),
    [
      ["L", "L"],
      ["R", "R"],
    ],
  );
  const next = advance(s, 90);
  close(s.tanks.L.q - next.tanks.L.q, 50);
  close(s.tanks.R.q - next.tanks.R.q, 50);
  close(next.ledger.burn, 100);
  conserved(next);
});
test("normal startup: pressure before opening shutoff, flow only after", () => {
  let s = preset("cold");
  s.controls.pumps.L1 = true;
  let v = derive(s);
  assert.ok(v.manifold.L > 30);
  close(v.flow.L, 0);
  s.controls.shutoff.L = true;
  v = derive(s);
  close(v.flow.L, 2000);
  assert.ok(v.pressure.L > 10);
});
test("crossfeed rescues lost left pumps without refilling left tank", () => {
  let s = preset("left");
  close(derive(s).flow.L, 0);
  s.controls.crossfeed = true;
  const v = derive(s);
  close(v.flow.L, 2000);
  assert.ok(v.paths.some((p) => p.source === "R" && p.engine === "L"));
  const n = advance(s, 60);
  close(n.tanks.L.q, s.tanks.L.q);
  close(s.tanks.R.q - n.tanks.R.q, 4000 / 60);
  conserved(n);
});
test("crossfeed without demand transfers no mass between tanks", () => {
  const s = still(preset("imbalance"));
  s.controls.crossfeed = true;
  const n = advance(s, 60);
  close(n.tanks.L.q, s.tanks.L.q);
  close(n.tanks.R.q, s.tanks.R.q);
  assert.equal(derive(n).paths.length, 0);
});
test("one failed parallel pump preserves feed but reduces capacity", () => {
  const s = initialState();
  s.faults.pumps = ["L1"];
  close(derive(s).flow.L, 2000);
  s.controls.demand.L = 5000;
  close(derive(s).flow.L, MODEL.pumpCapacity);
  assert.equal(derive(s).pumpStatus.L1, "FAIL");
});
test("crossfeed does not create capacity with only one right pump", () => {
  const s = preset("left");
  s.controls.crossfeed = true;
  s.faults.pumps.push("R1");
  const v = derive(s);
  close(v.flow.L + v.flow.R, 3600);
  assert.ok(v.flow.L < 2000);
});
test("stuck crossfeed command creates disagreement and no opposing flow", () => {
  const s = preset("valve"),
    v = derive(s);
  assert.equal(v.crossfeedActual, false);
  close(v.flow.L, 0);
  assert.ok(v.warnings.some((w) => w.code === "VALVE DISAGREE"));
  assert.match(why(s, "crossfeed"), /konum CLOSED/);
});
test("closed isolation blocks wing but leaves the separate center path usable", () => {
  const s = initialState();
  s.controls.isolation.L = false;
  close(derive(s).flow.L, 0);
  s.controls.pumps.C1 = true;
  close(derive(s).flow.L, 2000);
  assert.ok(derive(s).paths.every((p) => p.source !== "L"));
});
test("transfer moves source to destination and reduces imbalance by twice mass", () => {
  const s = still(preset("imbalance"));
  s.controls.transfer = "R-L";
  const n = advance(s, 36);
  close(n.tanks.L.q - s.tanks.L.q, 300);
  close(s.tanks.R.q - n.tanks.R.q, 300);
  close(derive(n).imbalance, 1000);
  close(total(n), total(s));
  conserved(n);
});
test("AUTO transfer stops at balance without oscillation", () => {
  const s = still(preset("imbalance"));
  s.controls.transfer = "auto";
  const n = advance(s, 120);
  close(derive(n).imbalance, 0);
  close(derive(n).transferRate, 0);
  conserved(n);
});
test("transfer pump OFF or stuck valve prevents transfer", () => {
  for (const kind of ["pump", "valve"]) {
    const s = still(preset("imbalance"));
    s.controls.transfer = "R-L";
    if (kind === "pump") s.controls.transferPump = false;
    else s.faults.transferStuck = true;
    const n = advance(s, 90);
    close(n.tanks.L.q, s.tanks.L.q);
    close(derive(n).transferRate, 0);
  }
});
test("transfer stops at source residual and destination capacity", () => {
  let s = still(initialState());
  s.tanks.R.q = 5999;
  s.controls.transfer = "L-R";
  s = rebalance(s);
  let n = advance(s, 100);
  close(n.tanks.R.q, 6000);
  conserved(n);
  s = still(initialState());
  s.tanks.L.q = 40.01;
  s.controls.transfer = "L-R";
  s = rebalance(s);
  n = advance(s, 100);
  close(n.tanks.L.q, 40);
  conserved(n);
});
test("center priority displaces wing burn and center empty falls back", () => {
  let s = preset("center");
  const v = derive(s);
  assert.ok(v.paths.every((p) => p.source === "C"));
  s.tanks.C.q = 30.01;
  s = rebalance(s);
  s = advance(s, 1);
  assert.ok(derive(s).paths.every((p) => p.source !== "C"));
  assert.ok(derive(s).warnings.some((w) => w.code === "CENTER TANK LOW PRESSURE"));
  conserved(s);
});
test("center pump failure leaves fuel present and wing feed working", () => {
  const s = preset("centerFail"),
    v = derive(s);
  assert.ok(s.tanks.C.q > 100);
  close(v.pumpFlow.C1 + v.pumpFlow.C2, 0);
  close(v.flow.L + v.flow.R, 4000);
});
test("restriction separates high upstream pressure from low delivered flow", () => {
  const s = preset("pressure"),
    v = derive(s);
  assert.ok(v.pumpHead.L1 > 30);
  assert.ok(v.flow.L < 1000);
  assert.ok(v.pressure.L < 10);
  assert.ok(v.warnings.some((w) => w.code.startsWith("L LOW")));
});
test("vent blockage produces vacuum from consumption and recovers when opened", () => {
  let s = initialState();
  s.faults.vent = "L";
  s = advance(s, 240);
  assert.ok(s.tanks.L.pressure < -3);
  const vacuum = s.tanks.L.pressure;
  s.faults.vent = null;
  s = advance(s, 20);
  assert.ok(Math.abs(s.tanks.L.pressure) < Math.abs(vacuum) / 100);
  conserved(s);
});
test("thermal expansion affects tank pressure without creating fuel", () => {
  const s = still(initialState());
  s.faults.vent = "L";
  s.controls.ambient = 60;
  const n = advance(s, 120);
  assert.ok(n.tanks.L.temp > 30);
  assert.ok(n.tanks.L.pressure > 0);
  close(total(n), total(s));
  conserved(n);
});
test("drain removes settled water first, then fuel and only on ground", () => {
  let s = preset("drain");
  s.controls.drain = true;
  const a = advance(s, 10);
  close(a.waterDrained, 1.5);
  close(a.ledger.drain, 0);
  const b = advance(a, 10);
  close(b.waterDrained, 2);
  assert.ok(b.ledger.drain > 0);
  conserved(b);
  s = patchControls(s, { ground: false });
  assert.equal(s.controls.drain, false);
});
test("leak causes excess tank decrease independent of engine flow", () => {
  const s = preset("leak"),
    n = advance(s, 60);
  close(n.ledger.leak, 120);
  close(n.ledger.burn, 4000 / 60);
  close(s.tanks.L.q - n.tanks.L.q, 120 + 2000 / 60);
  conserved(n);
});
test("tank leak persists after engine shutoff and can empty residual fuel", () => {
  let s = still(preset("leak"));
  s.tanks.L.q = 2;
  s.controls.shutoff.L = false;
  s = rebalance(s);
  const n = advance(s, 10);
  close(n.tanks.L.q, 0);
  close(n.ledger.leak, 2);
  conserved(n);
});
test("frozen quantity does not freeze actual fuel or mass ledger", () => {
  const s = preset("sensor"),
    n = advance(s, 60);
  close(derive(n).indicated.L, 4200);
  assert.ok(n.tanks.L.q < s.tanks.L.q);
  assert.ok(n.ledger.burn > 0);
  conserved(n);
});
test("jettison decreases wing fuel/aircraft weight with its own ledger", () => {
  const s = still(preset("jettison"));
  s.controls.jettison = true;
  const n = advance(s, 60);
  close(n.ledger.jettison, 1000);
  close(total(s) - total(n), 1000);
  close(s.tanks.C.q, n.tanks.C.q);
  close(derive(s).weight - derive(n).weight, 1000);
  conserved(n);
});
test("jettison reaches target without overshoot and is inhibited on ground", () => {
  let s = still(preset("jettison"));
  s.controls.jettison = true;
  s.controls.dumpTarget = 13990;
  const n = advance(s, 10);
  close(total(n), 13990);
  close(derive(n).dumpRate, 0);
  s = patchControls(s, { ground: true });
  assert.equal(s.controls.jettison, false);
  close(derive(s).dumpRate, 0);
});
test("inerting reduces oxygen without changing fuel mass", () => {
  const s = still(initialState());
  s.controls.inerting = true;
  let n = advance(s, 120);
  assert.ok(n.oxygen < 15 && n.oxygen > 9);
  close(total(s), total(n));
  n.controls.inerting = false;
  const o = n.oxygen;
  n = advance(n, 120);
  assert.ok(n.oxygen > o && n.oxygen < 21);
});
test("trim transfer conserves mass and CG equals mass moments", () => {
  const s = preset("trim");
  s.controls.trim = "aft";
  const n = advance(s, 300);
  close(n.tanks.T.q, 1000);
  close(total(s), total(n));
  close(derive(n).cg - derive(s).cg, (1000 * (ARM.T - ARM.C)) / derive(n).weight);
  conserved(n);
  n.controls.trim = "forward";
  const back = advance(n, 300);
  close(back.tanks.T.q, RESIDUAL.T);
  conserved(back);
});
test("refuel reaches exact target, respects capacity and fills wings symmetrically", () => {
  let s = preset("refuel");
  s.controls.service = "refuel";
  s = advance(s, 900);
  close(total(s), 12000);
  close(s.tanks.L.q, s.tanks.R.q);
  assert.equal(s.controls.service, "off");
  close(s.ledger.refuel, 11000);
  conserved(s);
  s.controls.refuelTarget = 99999;
  s.controls.service = "refuel";
  s = advance(s, 900);
  close(total(s), 20000);
  conserved(s);
});
test("defuel is a separate mass exit and cannot cross residuals", () => {
  const s = preset("defuel");
  s.controls.service = "defuel";
  const n = advance(s, 1200);
  for (const id of TANKS) assert.ok(n.tanks[id].q >= Math.min(s.tanks[id].q, RESIDUAL[id]) - 1e-6);
  assert.equal(n.controls.service, "off");
  assert.ok(n.ledger.defuel > 11000);
  conserved(n);
});
test("ground servicing mode excludes transfer and flight services", () => {
  let s = initialState();
  s = patchControls(s, { service: "refuel" });
  assert.equal(s.controls.service, "off");
  s = patchControls(s, {
    ground: true,
    service: "refuel",
    transfer: "L-R",
    trim: "aft",
    drain: true,
  });
  assert.equal(s.controls.transfer, "off");
  assert.equal(s.controls.trim, "off");
  assert.equal(s.controls.drain, false);
  close(derive(s).demand.L, 0);
});
test("all presets remain finite, bounded, deterministic and conserve mass", () => {
  for (const [id] of PRESETS) {
    const s = preset(id),
      a = advance(s, 240),
      b = advance(s, 240);
    conserved(a);
    assert.deepEqual(a, b);
    const v = derive(a);
    for (const n of [v.cg, v.total, v.weight, v.flow.L, v.flow.R, v.pressure.L, v.pressure.R])
      assert.ok(Number.isFinite(n), id);
  }
});
test("mixed simultaneous processes preserve external ledger over randomized controls", () => {
  let s = initialState(),
    seed = 137;
  const random = (): number => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 180; i++) {
    const p = PUMPS[Math.floor(random() * PUMPS.length)];
    s.controls.pumps[p] = random() > 0.3;
    s.controls.crossfeed = random() > 0.5;
    s.controls.transfer = random() > 0.5 ? "L-R" : "R-L";
    s.controls.trim = random() > 0.5 ? "aft" : "forward";
    s.controls.jettison = random() > 0.6;
    s.faults.leak = random() > 0.5 ? "L" : null;
    s.controls.restriction.L = random() * 0.7;
    s = advance(s, 3);
    conserved(s);
  }
});
test("advance does not mutate input and rejects invalid time", () => {
  const s = initialState(),
    copy = structuredClone(s);
  advance(s, 1);
  assert.deepEqual(s, copy);
  for (const n of [-1, NaN, Infinity, 3601]) assert.throws(() => advance(s, n), RangeError);
});
test("question bank has 60 unique valid questions, 15 topics and 3 levels", () => {
  assert.equal(QUESTIONS.length, 60);
  assert.equal(new Set(QUESTIONS.map((q) => q.prompt)).size, 60);
  for (const q of QUESTIONS) {
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.correct >= 0 && q.correct < 4);
    assert.ok(q.explanation.length > 45);
  }
  assert.equal(new Set(QUESTIONS.map((q) => q.topic)).size, 15);
  assert.equal(new Set(QUESTIONS.map((q) => q.level)).size, 3);
  assert.ok(QUESTIONS.filter((q) => q.level === 3).length >= 20);
});
test("all 15 lessons provide experiment, component, interpretation and at least 3 questions", () => {
  assert.equal(LESSONS.length, 15);
  LESSONS.forEach((l, i) => {
    assert.ok(l.lab in LAB_PRESETS);
    assert.ok(l.focus in PARTS);
    assert.ok(l.steps.length >= 3);
    assert.ok(l.interpretation.length > 50);
    assert.ok(QUESTIONS.filter((q) => q.topic === i + 1).length >= 3);
  });
});
test("eight diagnoses have separate presets and reasons for all four options", () => {
  assert.equal(DIAGNOSES.length, 8);
  assert.equal(new Set(DIAGNOSES.map((d) => d.preset)).size, 8);
  for (const d of DIAGNOSES) {
    assert.equal(d.options.length, 4);
    assert.equal(d.reasons.length, 4);
    assert.ok(d.reasons.every((r) => r.length > 30));
  }
});
test("all five mission targets are achievable through controls", () => {
  let s = preset("left");
  s.controls.crossfeed = true;
  assert.ok(MISSIONS[0].check(s));
  s = preset("imbalance");
  s.controls.transfer = "auto";
  s = advance(s, 100);
  assert.ok(MISSIONS[1].check(s));
  s = preset("centerFail");
  s.controls.pumps.C1 = false;
  s.controls.pumps.C2 = false;
  assert.ok(MISSIONS[2].check(s));
  assert.ok(MISSIONS[3].check(advance(preset("leak"), 20)));
  s = preset("jettison");
  s.controls.jettison = true;
  s = advance(s, 480);
  s.controls.jettison = false;
  assert.ok(MISSIONS[4].check(s));
  conserved(s);
});
