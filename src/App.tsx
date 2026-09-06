import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Droplets,
  FlaskConical,
  Gauge,
  GraduationCap,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Target,
  TriangleAlert,
} from "lucide-react";
import { useSimulation } from "./sim/useSimulation.ts";
import { why } from "./sim/engine.ts";
import { DIAGNOSES, MISSIONS, PRESETS } from "./sim/scenarios.ts";
import type { PresetId } from "./sim/scenarios.ts";
import { LABS, LAB_PRESETS, LESSONS } from "./content/lessons.ts";
import type { LabId, Lesson } from "./content/lessons.ts";
import { Schematic } from "./components/Schematic.tsx";
import { Controls, Cockpit, Inspector } from "./components/Controls.tsx";
import { LabPanel } from "./components/LabPanel.tsx";
import { Exam, Learning } from "./components/Learning.tsx";
import { Model } from "./components/Model.tsx";
import { Chart, fmt, Metric, Panel } from "./components/Primitives.tsx";

type Tab = "sim" | "labs" | "learn" | "faults" | "missions" | "exam" | "model";
const NAV = [
  { id: "sim" as Tab, label: "Simülasyon", icon: Gauge },
  { id: "labs" as Tab, label: "Deneyler", icon: FlaskConical },
  { id: "learn" as Tab, label: "Öğrenme", icon: BookOpen },
  { id: "faults" as Tab, label: "Arıza teşhisi", icon: TriangleAlert },
  { id: "missions" as Tab, label: "Görevler", icon: Target },
  { id: "exam" as Tab, label: "Sınav provası", icon: GraduationCap },
  { id: "model" as Tab, label: "Model & kaynaklar", icon: CircleHelp },
];
export default function App() {
  const sim = useSimulation(),
    v = sim.view,
    s = sim.state;
  const [tab, setTab] = useState<Tab>("sim"),
    [lab, setLab] = useState<LabId>("normal"),
    [selected, setSelected] = useState("tank"),
    [presetId, setPresetId] = useState<PresetId>("normal");
  const [whyPanel, setWhyPanel] = useState<{ topic: string; custom?: string } | null>(null),
    [autoExplain, setAutoExplain] = useState(true);
  const [diagnosis, setDiagnosis] = useState(0),
    [answer, setAnswer] = useState<number | undefined>(),
    [mission, setMission] = useState<number | null>(null),
    [mistakes, setMistakes] = useState(0),
    [leakAnswer, setLeakAnswer] = useState(""),
    [result, setResult] = useState<{
      score: number;
      time: number;
      changes: number;
      mistakes: number;
    } | null>(null);
  const [missionFeedback, setMissionFeedback] = useState("");
  const whyRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (whyPanel) whyRef.current?.showModal();
    else whyRef.current?.close();
  }, [whyPanel]);
  const openWhy = (topic: string, custom?: string) =>
    setWhyPanel({
      topic,
      custom:
        tab === "faults" && answer === undefined && !custom
          ? "Bu vaka cevaplanmadan modelin arıza kaydı ve gerçek kütle bilançosu açılmaz. Gösterilen quantity, pump status, command/actual position ve engine flow değerlerini karşılaştır; 20× hızda eğilimi izle."
          : custom,
    });
  const load = (id: PresetId) => {
    sim.dispatch({ type: "preset", id });
    setPresetId(id);
    setWhyPanel(null);
  };
  const openLab = (id: LabId) => {
    setLab(id);
    setTab("labs");
    load(LAB_PRESETS[id]);
    setSelected(LESSONS.find((l) => l.lab === id)?.focus ?? id);
  };
  const openLesson = (lesson: Lesson) => {
    setLab(lesson.lab as LabId);
    setTab("labs");
    load(lesson.preset);
    setSelected(lesson.focus);
  };
  const loadDiagnosis = (n: number) => {
    setDiagnosis(n);
    setAnswer(undefined);
    load(DIAGNOSES[n].preset);
  };
  const chooseTab = (id: Tab) => {
    setTab(id);
    if (id === "faults" && tab !== "faults") loadDiagnosis(diagnosis);
  };
  const presetLabs: Partial<Record<PresetId, LabId>> = {
    crossfeed: "crossfeed",
    left: "crossfeed",
    right: "crossfeed",
    valve: "crossfeed",
    imbalance: "transfer",
    transferFail: "transfer",
    center: "center",
    centerFail: "center",
    pressure: "pressure",
    vent: "vent",
    drain: "drain",
    jettison: "jettison",
    trim: "trim",
    refuel: "refuel",
    defuel: "refuel",
    inerting: "inerting",
    sensor: "indications",
    leak: "indications",
  };
  const activeLab = tab === "sim" ? (presetLabs[presetId] ?? "normal") : lab;
  const isSim = ["sim", "labs", "faults", "missions"].includes(tab);
  const secret = tab === "faults" && answer === undefined;
  const startMission = (n: number) => {
    setMission(n);
    setMistakes(0);
    setLeakAnswer("");
    setResult(null);
    setMissionFeedback("");
    load(MISSIONS[n].preset);
  };
  const evaluateMission = () => {
    if (mission === null) return;
    const success = MISSIONS[mission].check(s) && (mission !== 3 || leakAnswer === "L");
    if (success) {
      setResult({
        score: Math.max(0, 100 - mistakes * 15 - Math.max(0, sim.changes - 8) * 2),
        time: sim.wall,
        changes: sim.changes,
        mistakes,
      });
      setMissionFeedback("Görev koşulları sağlandı.");
      if (!sim.paused) sim.dispatch({ type: "pause" });
    } else {
      setMistakes(mistakes + 1);
      setMissionFeedback(
        mission === 3 && s.time < 20
          ? "Henüz 20 simülasyon saniyesi kanıt toplanmadı."
          : "Görev koşulları henüz sağlanmıyor. Akışları, konfigürasyonu ve hedefi yeniden karşılaştır.",
      );
    }
  };
  return (
    <>
      <a href="#main" className="skip-link">
        İçeriğe geç
      </a>
      <header className="site-header">
        <a href="./" className="brand">
          <span className="brand-mark">
            <Droplets size={25} />
          </span>
          FUEL SYSTEM <span>/ LAB</span>
        </a>
        <div className="course">
          HEE 305 <i /> HAVA ARACI SİSTEMLERİ–II
        </div>
        <a
          className="family-link"
          href="https://muhammetarbag.github.io/hydraulic-lab/"
          target="_blank"
          rel="noreferrer"
        >
          Hydraulic Lab <ArrowUpRight size={14} />
        </a>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <span className="eyebrow">AIRCRAFT FUEL SYSTEM LAB / ATA 28 + ATA 47</span>
            <h1>
              Kaynağı izle<span>.</span> Sistemi yönet<span>.</span>
            </h1>
            <p>Yakıtın yolunu kur. Dengeyi değiştir. Arızayı belirtilerinden çöz.</p>
          </div>
          <div className="hero-side">
            <span>
              <i className="status-dot" /> GENERIC TRANSPORT AIRCRAFT
            </span>
            <small>Interactive Fuel Systems Laboratory</small>
            <button
              onClick={() => {
                chooseTab("labs");
                setLab("normal");
                load("cold");
              }}
            >
              İlk beslemeyi kur <ChevronRight size={16} />
            </button>
          </div>
        </section>
        <nav className="main-nav" aria-label="Eğitim modları">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => chooseTab(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        {isSim && (
          <>
            <div className="sim-toolbar">
              <div className="mode-buttons" aria-label="Çalışma modu">
                {[
                  ["NORMAL", "normal"],
                  ["ABNORMAL", "left"],
                  ["EMERGENCY", "emergency"],
                ].map(([name, id]) => (
                  <button
                    key={name}
                    disabled={tab === "faults" || (tab === "missions" && mission !== null)}
                    onClick={() => load(id as PresetId)}
                    className={id === presetId ? "active" : ""}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {tab !== "faults" && (
                <label className="preset-picker">
                  PRESET
                  <select
                    aria-label="Senaryo preset"
                    value={presetId}
                    disabled={tab === "missions" && mission !== null}
                    onChange={(e) => load(e.target.value as PresetId)}
                  >
                    {PRESETS.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="time-controls">
                <span data-testid="sim-time">T+ {fmt(s.time, 1)} s</span>
                <button
                  aria-label={sim.paused ? "Devam et" : "Duraklat"}
                  onClick={() => sim.dispatch({ type: "pause" })}
                >
                  {sim.paused ? <Play size={15} /> : <Pause size={15} />}
                </button>
                {[1, 5, 20].map((speed) => (
                  <button
                    key={speed}
                    aria-pressed={sim.speed === speed}
                    onClick={() => sim.dispatch({ type: "speed", speed })}
                  >
                    {speed}×
                  </button>
                ))}
                <button
                  aria-label="Sistemi sıfırla"
                  onClick={() => {
                    if (tab === "faults") loadDiagnosis(diagnosis);
                    else if (tab === "missions" && mission !== null) startMission(mission);
                    else load(presetId);
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
            {tab === "labs" && (
              <div className="lab-switcher" aria-label="Deney seçimi">
                {LABS.map(([id, title, sub]) => (
                  <button
                    key={id}
                    className={lab === id ? "active" : ""}
                    onClick={() => openLab(id)}
                  >
                    <span>{title}</span>
                    <small>{sub}</small>
                  </button>
                ))}
              </div>
            )}
            {tab === "faults" && (
              <Panel
                title="Belirtileri oku. Olası arızayı seç."
                eyebrow={`FAULT DIAGNOSIS / VAKA ${diagnosis + 1}`}
                className="diagnosis-panel"
              >
                <div className="diagnosis-layout">
                  <div>
                    <div className="choice-row">
                      <label>
                        Vaka
                        <select
                          aria-label="Teşhis vakası"
                          value={diagnosis}
                          onChange={(e) => loadDiagnosis(Number(e.target.value))}
                        >
                          {DIAGNOSES.map((_, i) => (
                            <option value={i} key={i}>
                              Vaka {i + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() =>
                          loadDiagnosis((diagnosis + 1 + Math.floor(Math.random() * 7)) % 8)
                        }
                      >
                        <Shuffle size={16} />
                        Rastgele vaka
                      </button>
                    </div>
                    <p>{DIAGNOSES[diagnosis].symptom}</p>
                    <p className="muted">
                      Önce kokpit, trend ve konum geri bildirimlerini incele. Simülasyon aşağıda
                      çalışıyor.
                    </p>
                  </div>
                  <div>
                    <h3>En olası arıza nedir?</h3>
                    <div className="diagnosis-options">
                      {DIAGNOSES[diagnosis].options.map((text, i) => (
                        <button
                          key={text}
                          disabled={answer !== undefined}
                          className={
                            answer !== undefined
                              ? i === DIAGNOSES[diagnosis].correct
                                ? "correct"
                                : i === answer
                                  ? "incorrect"
                                  : ""
                              : ""
                          }
                          onClick={() => setAnswer(i)}
                        >
                          {String.fromCharCode(65 + i)} · {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {answer !== undefined && (
                  <div className="diagnosis-reasons" role="status">
                    <h3>
                      {answer === DIAGNOSES[diagnosis].correct
                        ? "Doğru teşhis."
                        : "Kanıtları yeniden değerlendir."}
                    </h3>
                    {DIAGNOSES[diagnosis].reasons.map((r, i) => (
                      <p key={r}>
                        <b>
                          {String.fromCharCode(65 + i)} ·{" "}
                          {i === DIAGNOSES[diagnosis].correct ? "DOĞRU" : "DAHA ZAYIF"}
                        </b>{" "}
                        {r}
                      </p>
                    ))}
                    <button onClick={() => loadDiagnosis((diagnosis + 1) % 8)}>
                      Sonraki vaka →
                    </button>
                  </div>
                )}
              </Panel>
            )}
            {tab === "missions" && (
              <Panel title="Sistemi çalışır durumda tut." eyebrow="MISSION CONTROL">
                <div className="mission-cards">
                  {MISSIONS.map((m, i) => (
                    <button
                      key={m.title}
                      className={mission === i ? "active" : ""}
                      onClick={() => startMission(i)}
                    >
                      <span className="eyebrow">CHALLENGE 0{i + 1}</span>
                      <h3>{m.title}</h3>
                      <span>{m.objective}</span>
                    </button>
                  ))}
                </div>
                {mission !== null && (
                  <div className="mission-current">
                    <h3>{MISSIONS[mission].title}</h3>
                    <p>{MISSIONS[mission].objective}</p>
                    {mission === 3 && (
                      <label>
                        Kaçak olasılığı
                        <select
                          aria-label="Kaçak yeri"
                          value={leakAnswer}
                          onChange={(e) => setLeakAnswer(e.target.value)}
                        >
                          <option value="">Kanıt sonrası seç</option>
                          <option value="L">Sol tank gövdesi</option>
                          <option value="C">Center tank</option>
                          <option value="R">Sağ motor hattı</option>
                          <option value="none">Kaçak yok</option>
                        </select>
                      </label>
                    )}
                    <button
                      className="primary"
                      disabled={result !== null}
                      onClick={evaluateMission}
                    >
                      Görevi değerlendir
                    </button>
                    <p role="status">{missionFeedback}</p>
                    {result ? (
                      <div className="metrics compact">
                        <Metric label="SCORE" value={String(result.score)} unit="/100" />
                        <Metric label="MISTAKES" value={String(result.mistakes)} />
                        <Metric label="TIME" value={fmt(result.time, 1)} unit="s" />
                        <Metric label="CONFIG CHANGES" value={String(result.changes)} />
                      </div>
                    ) : (
                      <p className="footnote">
                        Süre {fmt(sim.wall, 1)} gerçek çalışma saniyesi · {sim.changes}{" "}
                        konfigürasyon değişikliği · {mistakes} başarısız değerlendirme. Hızlandırma
                        kullanılabilir. Her başarısız değerlendirme −15; 8 değişiklik üstündeki her
                        değişiklik −2 puan.
                      </p>
                    )}
                  </div>
                )}
              </Panel>
            )}
            <section className="metrics overview" aria-label="Sistem özeti">
              <Metric
                label="TOTAL FUEL"
                value={fmt(Object.values(v.indicated).reduce((a, b) => a + b, 0))}
                unit="kg"
                note="Gösterilen · trim dahil"
              />
              <Metric
                label="ENGINE CONSUMPTION"
                value={fmt(v.flow.L + v.flow.R)}
                unit="kg/h"
                note="Anlık toplam motor akışı"
              />
              <Metric
                label="FUEL IMBALANCE"
                value={fmt(Math.abs(v.indicated.R - v.indicated.L))}
                unit="kg"
                caution={Math.abs(v.indicated.R - v.indicated.L) > 1000}
                note="Gösterilen kanat farkı"
              />
              <Metric
                label="CURRENT CG"
                value={secret ? "—" : fmt(v.cgMac, 2)}
                unit="%MAC"
                note="Öğretim modeli · gerçek kütleden"
              />
              <Metric
                label="EST. ENDURANCE"
                value={secret ? "—" : v.endurance === null ? "—" : fmt(v.endurance, 2)}
                unit="h"
                note="Usable/flow · erişim/rezerv dahil değil"
              />
            </section>
            <div className="workspace-grid">
              <div className="workbench">
                <Schematic sim={sim} selected={selected} select={setSelected} concealed={secret} />
                <Controls sim={sim} autoExplain={autoExplain} onWhy={openWhy} />
                {tab !== "faults" && (
                  <LabPanel
                    id={
                      tab === "missions" && mission !== null
                        ? mission === 1
                          ? "transfer"
                          : mission === 4
                            ? "jettison"
                            : mission === 2
                              ? "center"
                              : mission === 3
                                ? "indications"
                                : "crossfeed"
                        : activeLab
                    }
                    sim={sim}
                    onWhy={openWhy}
                  />
                )}
              </div>
              <aside className="right-rail">
                <Cockpit sim={sim} onWhy={openWhy} />
                <Inspector selected={selected} onSelect={setSelected} onWhy={openWhy} />
                <label className="explanation-check">
                  <input
                    type="checkbox"
                    checked={autoExplain}
                    onChange={(e) => setAutoExplain(e.target.checked)}
                  />
                  Kumanda değişiminde kısa açıklama
                </label>
              </aside>
            </div>
            <Panel
              title="Telemetri"
              eyebrow="SON 60 ÇALIŞMA SANİYESİ · 5 ÖRNEK / SANİYE"
              action={<Activity size={19} />}
            >
              <div className="telemetry-grid">
                {(
                  [
                    { field: "total", label: "Total fuel", unit: "kg" },
                    { field: "left", label: "Left tank", unit: "kg" },
                    { field: "right", label: "Right tank", unit: "kg" },
                    { field: "center", label: "Center tank", unit: "kg" },
                    { field: "pressure", label: "Engine 1 inlet pressure", unit: "psi" },
                    { field: "flow", label: "Total engine flow", unit: "kg/h" },
                    { field: "cg", label: "CG position", unit: "%MAC" },
                    { field: "vent", label: "Left tank pressure", unit: "kPa" },
                  ] as const
                )
                  .filter(
                    (item) =>
                      !secret || !["total", "left", "right", "center", "cg"].includes(item.field),
                  )
                  .map((item) => (
                    <Chart key={item.field} samples={sim.samples} {...item} />
                  ))}
              </div>
              <p className="telemetry-note">
                Yatay eksen gerçek çalışma süresi; süreç {sim.speed}× hızda.{" "}
                {secret
                  ? "Teşhis sırasında gerçek kütle grafikleri gizlidir; cockpit göstergelerinin eğilimini izle."
                  : "Quantity grafikleri modelin gerçek kütlesidir; sensör arızasında cockpit ile ayrışabilir."}{" "}
                Bekleme ve duraklatma geçmişe sahte örnek eklemez.
              </p>
            </Panel>
            {!secret && (
              <details className="ledger">
                <summary>
                  Kütle bilançosu & konfigürasyon kaydı{" "}
                  <span>Hata {v.balanceError.toExponential(2)} kg</span>
                </summary>
                <div className="ledger-values">
                  {[
                    ["Başlangıç", s.ledger.initial],
                    ["+ Refuel", s.ledger.refuel],
                    ["− Engine burn", s.ledger.burn],
                    ["− Leak", s.ledger.leak],
                    ["− Jettison", s.ledger.jettison],
                    ["− Defuel", s.ledger.defuel],
                    ["− Drain (fuel)", s.ledger.drain],
                    ["= Mevcut yakıt", v.total],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <b>{fmt(Number(value), 3)} kg</b>
                    </div>
                  ))}
                </div>
                <p>İç transferlerin net toplam etkisi 0 kg. Su ayrı L hesabında.</p>
                <ol>
                  {sim.events.length ? (
                    sim.events.map((e, i) => <li key={`${i}-${e}`}>{e}</li>)
                  ) : (
                    <li>Henüz konfigürasyon değişikliği yok.</li>
                  )}
                </ol>
              </details>
            )}
          </>
        )}
        <div hidden={tab !== "learn"}>
          <Learning onExperiment={openLesson} />
        </div>
        <div hidden={tab !== "exam"}>
          <Exam />
        </div>
        {tab === "model" && <Model />}
        <footer>
          <span>
            <Droplets size={16} /> Aircraft Fuel System Lab · HEE 305 · ATA 28 / ATA 47
          </span>
          <p>Bu simülasyon genel eğitim amaçlıdır. Gerçek fuel logic uçak tipine göre değişir.</p>
          <p>
            This application is an educational simulation. It is not approved maintenance data. It
            must not be used for aircraft operation, maintenance or troubleshooting. Always refer to
            the applicable AMM, FIM, TSM, IPC and approved aircraft documentation for real aircraft
            maintenance.
          </p>
          <button onClick={() => setTab("model")}>
            Model sınırları ve kaynaklar <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      <dialog
        ref={whyRef}
        className="why-dialog"
        onCancel={() => setWhyPanel(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setWhyPanel(null);
        }}
      >
        <div>
          <span className="eyebrow">WHY? / MEVCUT SİSTEM DURUMU</span>
          <button aria-label="Açıklamayı kapat" onClick={() => setWhyPanel(null)}>
            ×
          </button>
        </div>
        <h2>Neden böyle oldu?</h2>
        <p>{whyPanel && (whyPanel.custom ?? why(s, whyPanel.topic))}</p>
        <small>Bu açıklama mevcut simülasyon durumundan üretilir.</small>
      </dialog>
    </>
  );
}
