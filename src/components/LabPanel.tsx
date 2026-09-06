import { useState } from "react";
import { ARM, CAPACITY, MODEL, PUMPS, TANKS, density, tankName } from "../sim/engine.ts";
import { LABS, LESSONS } from "../content/lessons.ts";
import type { LabId } from "../content/lessons.ts";
import type { Controls, Side } from "../sim/types.ts";
import type { Sim } from "../sim/useSimulation.ts";
import { Chart, fmt, Metric, Panel, Range, Toggle, Why } from "./Primitives.tsx";

export function LabPanel({ id, sim, onWhy }: { id: LabId; sim: Sim; onWhy: (s: string) => void }) {
  const s = sim.state,
    v = sim.view,
    c = s.controls;
  const [showTruth, setShowTruth] = useState(false);
  const set = (patch: Partial<Controls>, message: string) =>
    sim.dispatch({ type: "control", patch, message });
  const title = LABS.find((l) => l[0] === id)![1];
  const lesson = LESSONS.find((l) => l.lab === id);
  const imbalance = Math.abs(v.imbalance);
  return (
    <Panel
      title={title}
      eyebrow="DENEY TEZGAHI"
      className="experiment"
      action={<Why onClick={() => onWhy(id)} />}
    >
      {lesson && <p className="experiment-intro">{lesson.concept}</p>}
      {id === "normal" && (
        <div className="experiment-body">
          <h3>Yakıt tanktan motora nasıl ulaşır?</h3>
          <div className="step-cards">
            {[
              ["1", "L1 veya L2 pompasını aç", c.pumps.L1 || c.pumps.L2],
              ["2", "Sol feed manifoldunu basınçlandır", v.manifold.L > 10],
              ["3", "Sol motor shutoffunu aç", c.shutoff.L],
              ["4", "Motor tüketimi ve quantityyi izle", s.ledger.burn > 0 && v.flow.L > 0],
              ["5", "Sağ kaynak ve motor yolunu kur", v.flow.R >= v.demand.R && v.demand.R > 0],
            ].map(([n, text, done]) => (
              <div key={String(n)} className={done ? "step-done" : ""}>
                <b>{done ? "✓" : n}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <p>
            Her iki tarafın kontrolleri yukarıdaki kumanda panelinde. Pompa çıkışı basınçlanabilir;
            shutoff açılmadan motora debi oluşmaz.
          </p>
        </div>
      )}
      {id === "crossfeed" && (
        <div className="experiment-body">
          <div className="compare-grid">
            <div>
              <span className="eyebrow">CROSSFEED</span>
              <h3>Besleme kaynağını değiştir</h3>
              <p>
                Sol pompaları OFF yap, sağ pompaları ON bırak, crossfeed aç. Sağ tankın iki motora
                giden akışını izle.
              </p>
              <b data-testid="cross-route">
                {v.paths.some((p) => p.leg !== p.engine)
                  ? "KARŞI TARAFA AKIŞ VAR"
                  : "KARŞI TARAFA AKIŞ YOK"}
              </b>
            </div>
            <div>
              <span className="eyebrow">FUEL TRANSFER</span>
              <h3>Yakıtı başka tanka taşı</h3>
              <p>
                Özel transfer hattı kaynak quantityyi azaltır, hedef quantityyi artırır. Crossfeed
                bu tank dolum işlevini yapmaz.
              </p>
              <b>Crossfeed ≠ Fuel Transfer</b>
            </div>
          </div>
          <div className="route-readout">
            {v.paths.map((p, i) => (
              <span key={i}>
                {p.source} TANK → {p.leg !== p.engine ? "CROSSFEED → " : ""}ENGINE{" "}
                {p.engine === "L" ? 1 : 2} <b>{fmt(p.rate)} kg/h</b>
              </span>
            ))}
          </div>
        </div>
      )}
      {id === "transfer" && (
        <div className="experiment-body">
          <svg
            className="balance-plane"
            viewBox="0 0 700 190"
            role="img"
            aria-label={`Kanat yakıt farkı ${fmt(imbalance)} kg; ağırlık momenti çizimi, gerçek bank açısı değildir`}
          >
            <path
              d="M350 15L369 75 640 136 640 150 369 112 365 154 412 173 412 183 350 173 288 183 288 173 335 154 331 112 60 150 60 136 331 75Z"
              fill="#233642"
              stroke="#728896"
            />
            <circle
              cx="188"
              cy="104"
              r={12 + (s.tanks.L.q / 6000) * 26}
              fill="#93c5d4"
              fillOpacity=".5"
            />
            <circle
              cx="512"
              cy="104"
              r={12 + (s.tanks.R.q / 6000) * 26}
              fill="#d5b675"
              fillOpacity=".5"
            />
            <text x="188" y="55" textAnchor="middle">
              LEFT {fmt(s.tanks.L.q)} kg
            </text>
            <text x="512" y="55" textAnchor="middle">
              RIGHT {fmt(s.tanks.R.q)} kg
            </text>
          </svg>
          <div className="metrics compact">
            <Metric
              label="KANAT FARKI"
              value={fmt(imbalance)}
              unit="kg"
              caution={imbalance > 1000}
            />
            <Metric
              label="YANAL CG"
              value={fmt(v.lateralCg, 3)}
              unit="m"
              note="+ sağ / − sol; dry lateral CG = 0"
            />
            <Metric label="TRANSFER FLOW" value={fmt(Math.abs(v.transferRate))} unit="kg/h" />
          </div>
          <div className="choice-row" role="group" aria-label="Transfer yönü">
            {[
              ["off", "OFF"],
              ["L-R", "L → R"],
              ["R-L", "R → L"],
              ["auto", "AUTO dengele"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                aria-pressed={c.transfer === mode}
                onClick={() => set({ transfer: mode as Controls["transfer"] }, `Transfer ${mode}`)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="two-col">
            <Toggle
              label="TRANSFER PUMP"
              value={c.transferPump}
              onChange={() => set({ transferPump: !c.transferPump }, "Transfer pompası değişti")}
            />
            <Toggle
              label="TRANSFER VALVE"
              sub={`Actual ${v.transferActual ? "OPEN" : "CLOSED"}`}
              value={c.transferValve}
              onChange={() => set({ transferValve: !c.transferValve }, "Transfer valfi değişti")}
            />
          </div>
          <p>
            Dağılım grafiği gerçek bank açısı veya uçuş dinamiği değildir. Eşzamanlı motor tüketimi
            ayrıca düşülür. Bu wing-to-wing donanım her uçakta bulunmaz.
          </p>
        </div>
      )}
      {id === "center" && (
        <div className="experiment-body">
          <div className="metrics compact">
            <Metric label="CENTER QUANTITY" value={fmt(s.tanks.C.q)} unit="kg" />
            <Metric
              label="CENTER → ENGINES"
              value={fmt(v.pumpFlow.C1 + v.pumpFlow.C2)}
              unit="kg/h"
            />
            <Metric
              label="WING → ENGINES"
              value={fmt(v.pumpFlow.L1 + v.pumpFlow.L2 + v.pumpFlow.R1 + v.pumpFlow.R2)}
              unit="kg/h"
            />
          </div>
          <p>
            Bu modelde center kaynakları önceliklidir. Center kullanılamazsa, açık ve yeterli wing
            kaynakları beslemeyi devralır. Center boşken ON komutu verilmiş pompa kolu düşük basınç
            gösterir.
          </p>
          <Toggle
            label="CENTER PUMP FAILURE"
            value={s.faults.pumps.includes("C1")}
            onChange={() =>
              sim.dispatch({
                type: "fault",
                patch: {
                  pumps: s.faults.pumps.includes("C1")
                    ? s.faults.pumps.filter((p) => p[0] !== "C")
                    : [...s.faults.pumps.filter((p) => p[0] !== "C"), "C1", "C2"],
                },
              })
            }
          />
          <p className="model-note">
            Bu simülasyon genel eğitim amaçlıdır. Gerçek fuel logic uçak tipine göre değişir.
          </p>
        </div>
      )}
      {id === "pressure" && (
        <div className="experiment-body">
          <div className="two-col">
            {(["L", "R"] as Side[]).map((side, i) => (
              <Range
                key={side}
                label={`Engine ${i + 1} demand`}
                value={c.demand[side]}
                max={5000}
                step={100}
                unit="kg/h"
                onChange={(n) =>
                  set({ demand: { ...c.demand, [side]: n } }, `${side} motor talebi ${n} kg/h`)
                }
              />
            ))}
            <Range
              label="Sol hat kısıtlaması"
              value={c.restriction.L * 100}
              max={100}
              unit="%"
              onChange={(n) =>
                set({ restriction: { ...c.restriction, L: n / 100 } }, `Hat kısıtlaması %${n}`)
              }
            />
            <Range
              label="Pompa kapasite çarpanı"
              value={c.capability * 100}
              min={10}
              max={100}
              unit="%"
              onChange={(n) => set({ capability: n / 100 }, `Pompa kapasitesi %${n}`)}
            />
            <Toggle
              label="L1 PUMP FAILURE"
              value={s.faults.pumps.includes("L1")}
              onChange={() =>
                sim.dispatch({
                  type: "fault",
                  patch: {
                    pumps: s.faults.pumps.includes("L1")
                      ? s.faults.pumps.filter((p) => p !== "L1")
                      : [...s.faults.pumps, "L1"],
                  },
                })
              }
              sub="Tek pompa kaybını yedek L2 ile karşılaştır"
            />
          </div>
          <div className="table-scroll">
            <table>
              <caption>Aircraft boost / feed tarafı · yaklaşık model</caption>
              <thead>
                <tr>
                  <th>Pompa</th>
                  <th>Inlet psi(g)</th>
                  <th>Outlet psi</th>
                  <th>Flow kg/h</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PUMPS.map((p) => (
                  <tr key={p}>
                    <td>{p}</td>
                    <td>{fmt(v.pumpInlet[p], 1)}</td>
                    <td>{fmt(v.pumpHead[p], 1)}</td>
                    <td>{fmt(v.pumpFlow[p])}</td>
                    <td>{v.pumpStatus[p]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Inlet göreli basıncı, tank Δp ve basitleştirilmiş statik yükten gelir. Basınç eğrisi,
            kavitasyon ve motor metering ünitesi ayrıntılı çözülmez.
          </p>
        </div>
      )}
      {id === "vent" && (
        <div className="experiment-body">
          <div className="two-col">
            <div>
              <Toggle
                label="SOL VENT TIKALI"
                value={s.faults.vent === "L"}
                onChange={() =>
                  sim.dispatch({
                    type: "fault",
                    patch: { vent: s.faults.vent === "L" ? null : "L" },
                  })
                }
              />
              <Range
                label="Çevre sıcaklığı"
                value={c.ambient}
                min={-50}
                max={65}
                unit="°C"
                onChange={(n) => set({ ambient: n }, `Çevre ${n}°C`)}
              />
              <p>
                Tank Δp <b>{fmt(s.tanks.L.pressure, 2)} kPa</b> · sıvı hacmi{" "}
                <b>{fmt(s.tanks.L.q / density(s.tanks.L.temp), 2)} m³</b>
              </p>
              <p>
                Vent açıkken hava alışverişi basıncı dengeler. Kapalıyken gaz için P×V/T ilişkisi
                kullanılır; sıcaklık değişimi yakıt genleşmesini de etkiler.
              </p>
            </div>
            <Chart
              samples={sim.samples}
              field="vent"
              label="Tank pressure vs time"
              unit="kPa"
              color="#d5b675"
            />
          </div>
          <div className="vent-sketch">
            <span>ATMOSFER</span>
            <span className={s.faults.vent === "L" ? "warning-text" : "normal-text"}>
              {s.faults.vent === "L" ? "── ✕ BLOCKED ──" : "⇄ VENT / SURGE ⇄"}
            </span>
            <span>
              ULLAGE
              <br />
              {fmt(s.tanks.L.pressure, 2)} kPa
            </span>
          </div>
          <p>
            Surge tank, termal genişleme veya yakıt hareketiyle vent hattına gelen sıvıyı geçici
            olarak karşılayabilir. Bu model surge içindeki sıvı akışını ve gerçek overboard taşmayı
            çözmez.
          </p>
        </div>
      )}
      {id === "drain" && (
        <div className="experiment-body">
          <div className="two-col">
            <div className="drain-vessel">
              <div className="fuel-layer">YAKIT · ρ ≈ {fmt(density(s.tanks.L.temp))} kg/m³</div>
              <div
                className="water-layer"
                style={{ height: Math.max(0, (s.tanks.L.water / 2) * 50) }}
              >
                {s.tanks.L.water > 0.3 ? "SU · ρ ≈ 1000 kg/m³" : ""}
              </div>
              <div
                className={`drain-stream ${c.drain && !sim.paused && (s.tanks.L.water > 0 || s.tanks.L.q > 0) ? "flowing" : ""}`}
              >
                {c.drain
                  ? s.tanks.L.water > 0
                    ? "SU ↓"
                    : s.tanks.L.q > 0
                      ? "YAKIT ↓"
                      : "AKIŞ YOK"
                  : "DRAIN CLOSED"}
              </div>
            </div>
            <div>
              <Toggle
                label="DRAIN POINT"
                disabled={!c.ground}
                value={c.drain}
                onChange={() => set({ drain: !c.drain }, "Drain değişti")}
              />
              <p>
                Kalan serbest su <b>{fmt(s.tanks.L.water, 2)} L</b>
              </p>
              <p>
                Toplanan su <b>{fmt(s.waterDrained, 2)} L</b>
              </p>
              <p>
                Çıkan yakıt <b>{fmt(s.ledger.drain, 2)} kg</b>
              </p>
              <p>
                Su sayacı yakıt ledgerından ayrıdır. Katman yüksekliği görünürlük için
                abartılmıştır.
              </p>
            </div>
          </div>
          <p className="model-note">
            Bu laboratuvar eğitim amaçlıdır. Gerçek aircraft maintenance işlemleri AMM ve approved
            maintenance data ile yapılır.
          </p>
        </div>
      )}
      {id === "jettison" && (
        <div className="experiment-body">
          <div className="metrics compact">
            <Metric label="AIRCRAFT WEIGHT" value={fmt(v.weight)} unit="kg" />
            <Metric label="ÖRNEK MAX LANDING WEIGHT" value={fmt(MODEL.landingWeight)} unit="kg" />
            <Metric
              label="FAZLA AĞIRLIK"
              value={fmt(Math.max(0, v.weight - MODEL.landingWeight))}
              unit="kg"
              caution={v.weight > MODEL.landingWeight}
            />
          </div>
          <div className="two-col">
            <Toggle
              label="FUEL JETTISON"
              disabled={c.ground}
              value={c.jettison}
              sub={c.ground ? "Yerde kilitli" : `Akış ${fmt(v.dumpRate)} kg/h`}
              onChange={() => set({ jettison: !c.jettison }, "Jettison değişti")}
            />
            <Range
              label="Jettison toplam yakıt hedefi"
              value={c.dumpTarget}
              min={2000}
              max={14000}
              step={100}
              unit="kg"
              onChange={(n) => set({ dumpTarget: n }, `Dump hedefi ${n} kg`)}
            />
          </div>
          <p>
            Yalnız bugünkü debiler 10 dakika sürerse doğrusal ağırlık eğilimi:{" "}
            <b>
              {fmt(Math.max(MODEL.dryWeight, v.weight - (v.dumpRate + v.flow.L + v.flow.R) / 6))} kg
            </b>
            . Hedefte kesme bu basit eğilime dahil değildir; performans/iniş tahmini olarak
            kullanılamaz.
          </p>
          <p>
            Dump ile çıkan <b>{fmt(s.ledger.jettison, 1)} kg</b> · motorlarda tüketilen{" "}
            <b>{fmt(s.ledger.burn, 1)} kg</b>. Tüm uçaklarda jettison donanımı bulunmaz.
          </p>
        </div>
      )}
      {id === "inerting" && (
        <div className="experiment-body">
          <div className="two-col">
            <div className="ullage-vessel">
              <span>ULLAGE / GAZ BOŞLUĞU</span>
              <strong>
                {fmt(s.oxygen, 1)}
                <small>% O₂</small>
              </strong>
              <div className="gas-dots">
                {Array.from({ length: 40 }, (_, i) => (
                  <i
                    key={i}
                    className={i < Math.round((s.oxygen / 100) * 40) ? "oxygen" : "nitrogen"}
                  />
                ))}
              </div>
              <div className="fuel-layer">SIVI YAKIT</div>
            </div>
            <div>
              <div className="choice-row">
                <button
                  aria-pressed={!c.inerting}
                  onClick={() => set({ inerting: false }, "NORMAL AIR")}
                >
                  NORMAL AIR
                </button>
                <button
                  aria-pressed={c.inerting}
                  onClick={() => set({ inerting: true }, "NEA aktif")}
                >
                  NITROGEN-ENRICHED AIR
                </button>
              </div>
              <h3>Oksijen ↓ · yanıcılık olasılığı ↓</h3>
              <p>
                O₂ (amber) ve azot/diğer gazlar (mavi) şematiktir. Yakıt buharı ve ateşleme
                kaynakları da riskte rol oynar. Yakıt miktarı inerting açılmasıyla artmaz.
              </p>
              <p className="model-note">
                %9 örnek asimptot; gerçek uçak limiti değildir. “Güvenli tank” kararı üretilmez.
              </p>
            </div>
          </div>
        </div>
      )}
      {id === "trim" && (
        <div className="experiment-body">
          <svg
            className="trim-plane"
            viewBox="0 0 800 220"
            role="img"
            aria-label={`Boylamsal CG ${fmt(v.cgMac, 2)} yüzde MAC`}
          >
            <path
              d="M48 99Q37 91 61 79L116 60H617L688 17H716L699 70 755 88 749 107H137Z"
              fill="#243845"
              stroke="#8a9ca8"
            />
            <path d="M343 84L462 105 445 116 320 102Z" fill="#506875" />
            <rect x="304" y="73" width="64" height="21" fill="#93c5d4" fillOpacity=".4" />
            <rect
              x="640"
              y="74"
              width="40"
              height="17"
              fill="#d5b675"
              fillOpacity={0.15 + (s.tanks.T.q / CAPACITY.T) * 0.8}
            />
            <text x="304" y="49">
              MAIN · 15–16 m
            </text>
            <text x="630" y="132">
              TRIM · 32 m
            </text>
            <path d="M80 172H720" stroke="#344b5b" strokeWidth="9" />
            <path
              d={`M${80 + (MODEL.forwardMac / 60) * 640} 172H${80 + (MODEL.aftMac / 60) * 640}`}
              stroke="#6d9b98"
              strokeWidth="9"
            />
            {[
              [MODEL.forwardMac, "FORWARD"],
              [MODEL.aftMac, "AFT"],
            ].map(([value, label]) => (
              <g key={label}>
                <path d={`M${80 + (Number(value) / 60) * 640} 160v24`} stroke="#a1b2b8" />
                <text x={80 + (Number(value) / 60) * 640} y="207" textAnchor="middle">
                  {label} {value}%
                </text>
              </g>
            ))}
            <path
              d={`M${80 + (Math.max(0, Math.min(60, v.cgMac)) / 60) * 640} 143v38`}
              stroke="#e4c57c"
              strokeWidth="3"
            />
            <text
              x={80 + (Math.max(0, Math.min(60, v.cgMac)) / 60) * 640}
              y="142"
              textAnchor="middle"
            >
              CG {fmt(v.cgMac, 2)}%
            </text>
          </svg>
          <div className="choice-row">
            <button
              aria-pressed={c.trim === "aft"}
              onClick={() => set({ trim: "aft" }, "Trim arkaya")}
            >
              MAIN → TRIM
            </button>
            <button
              aria-pressed={c.trim === "off"}
              onClick={() => set({ trim: "off" }, "Trim durdu")}
            >
              DURDUR
            </button>
            <button
              aria-pressed={c.trim === "forward"}
              onClick={() => set({ trim: "forward" }, "Trim ileri")}
            >
              TRIM → MAIN
            </button>
          </div>
          <div className="metrics compact">
            <Metric label="AIRCRAFT WEIGHT" value={fmt(v.weight)} unit="kg" />
            <Metric label="FUEL WEIGHT" value={fmt(v.total)} unit="kg" />
            <Metric label="CURRENT CG" value={fmt(v.cg, 3)} unit="m" />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Bileşen</th>
                  <th>Kütle kg</th>
                  <th>Arm m</th>
                  <th>Moment kg·m</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Dry aircraft</td>
                  <td>{fmt(MODEL.dryWeight)}</td>
                  <td>{MODEL.dryArm}</td>
                  <td>{fmt(MODEL.dryWeight * MODEL.dryArm)}</td>
                </tr>
                {TANKS.map((t) => (
                  <tr key={t}>
                    <td>{tankName(t)}</td>
                    <td>{fmt(s.tanks[t].q, 1)}</td>
                    <td>{ARM[t]}</td>
                    <td>{fmt(s.tanks[t].q * ARM[t], 1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Σmoment / Σmass</td>
                  <td colSpan={3}>
                    {fmt(v.weight * v.cg, 1)} / {fmt(v.weight, 1)} = {fmt(v.cg, 3)} m
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p>
            MAC başlangıcı 14 m, uzunluğu 6 m. Öğretim aralığı %25–40 MAC. Dry aircraft ve bütün
            kollar varsayımsaldır; gerçek performans aracı değildir.
          </p>
        </div>
      )}
      {id === "refuel" && (
        <div className="experiment-body">
          <div className="service-panel">
            <span className="eyebrow">GROUND SERVICING PANEL</span>
            <Toggle
              label="YERDE"
              value={c.ground}
              onChange={() => set({ ground: !c.ground }, "Yer modu değişti")}
            />
            <Range
              label="Hedef toplam yakıt"
              value={c.refuelTarget}
              min={1000}
              max={20000}
              step={500}
              unit="kg"
              onChange={(n) => set({ refuelTarget: n }, `Refuel hedefi ${n} kg`)}
            />
            <div className="choice-row">
              <button
                disabled={!c.ground}
                aria-pressed={c.service === "refuel"}
                onClick={() => set({ service: "refuel" }, "Refuel başladı")}
              >
                REFUEL BAŞLAT
              </button>
              <button
                aria-pressed={c.service === "off"}
                onClick={() => set({ service: "off" }, "Servis durdu")}
              >
                DURDUR
              </button>
              <button
                disabled={!c.ground}
                aria-pressed={c.service === "defuel"}
                onClick={() => set({ service: "defuel" }, "Defuel başladı")}
              >
                DE-FUEL BAŞLAT
              </button>
            </div>
            <div className={`service-path ${v.serviceRate !== 0 && !sim.paused ? "active" : ""}`}>
              <span>{v.serviceRate < 0 ? "TOPLAMA" : "YAKIT KAYNAĞI"}</span>
              <b>{v.serviceRate < 0 ? "← ← ←" : v.serviceRate > 0 ? "→ → →" : "— — —"}</b>
              <span>REFUEL MANIFOLD</span>
              <b>{fmt(Math.abs(v.serviceRate))} kg/h</b>
            </div>
            <div className="tank-bars">
              {(["L", "C", "R"] as const).map((t) => (
                <label key={t}>
                  {tankName(t)}
                  <progress max={CAPACITY[t]} value={s.tanks[t].q} />
                  <b>
                    {fmt(s.tanks[t].q)} / {fmt(CAPACITY[t])} kg
                  </b>
                </label>
              ))}
            </div>
            <p>
              {c.service === "off"
                ? "Servis kapalı; hedef ve kapasite koruması etkin."
                : c.service === "refuel"
                  ? "Dolum devam ediyor; hedefe veya kapasiteye ulaşınca durur."
                  : "Defuel devam ediyor; unusable tabanı korunur."}
            </p>
          </div>
          <div className="compare-grid">
            <div>
              <h3>Pressure refueling</h3>
              <p>
                Haricî basınç kaynağı ve dolum manifoldları kullanılır. Panel yalnız bu kavramsal
                toplu dolumu modeller.
              </p>
            </div>
            <div>
              <h3>Gravity refueling</h3>
              <p>
                Yakıt tank dolum ağzından yerçekimi yardımıyla girer. Giriş geometrisi ve gerçek
                prosedür bu modelde çözülmez.
              </p>
            </div>
          </div>
        </div>
      )}
      {id === "indications" && (
        <div className="experiment-body">
          <Toggle
            label="Eğitim gerçek miktarını göster"
            value={showTruth}
            onChange={() => setShowTruth(!showTruth)}
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tank</th>
                  <th>Gösterilen kg</th>
                  <th>{showTruth ? "Gerçek kg" : "Eğitim miktarı"}</th>
                </tr>
              </thead>
              <tbody>
                {TANKS.map((t) => (
                  <tr key={t}>
                    <td>{tankName(t)}</td>
                    <td>{fmt(v.indicated[t], 1)}</td>
                    <td>{showTruth ? fmt(s.tanks[t].q, 1) : "GİZLİ"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Beklenen engine burn: <b>{fmt(s.ledger.burn, 2)} kg</b>. Gerçek uçakta “gerçek miktarı
            göster” düğmesi yoktur; burada ölçüm ile model gerçeğini ayırmak içindir.
          </p>
          <Range
            label="Çevre sıcaklığı"
            value={c.ambient}
            min={-50}
            max={65}
            unit="°C"
            onChange={(n) => set({ ambient: n }, `Çevre ${n}°C`)}
          />
        </div>
      )}
      {lesson && (
        <details className="interpretation">
          <summary>Sonucu yorumla · Neden böyle oldu?</summary>
          <p>{lesson.interpretation}</p>
          <ol>
            {lesson.steps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </details>
      )}
    </Panel>
  );
}
