import { advance, derive, initialState, total } from "./engine.ts";
import type { State } from "./types.ts";

export const PRESETS = [
  ["normal", "Normal Cruise"],
  ["cold", "Normal beslemeyi kur"],
  ["left", "Left Pump Failure"],
  ["right", "Right Pump Failure"],
  ["imbalance", "Fuel Imbalance"],
  ["center", "Center Tank Feed"],
  ["crossfeed", "Crossfeed Operation"],
  ["leak", "Fuel Leak"],
  ["vent", "Vent Failure"],
  ["jettison", "Fuel Jettison"],
  ["trim", "Trim Transfer"],
  ["refuel", "Refueling"],
  ["emergency", "Emergency Fuel Configuration"],
  ["valve", "Crossfeed Valve Stuck"],
  ["sensor", "Quantity Sensor Failure"],
  ["centerFail", "Center Pump Failure"],
  ["transferFail", "Transfer Valve Failure"],
  ["pressure", "Pressure vs Flow"],
  ["drain", "Drain / Water"],
  ["inerting", "Inerting"],
  ["defuel", "Defueling"],
] as const;
export type PresetId = (typeof PRESETS)[number][0];
export function preset(id: PresetId): State {
  let s = initialState();
  if (id === "cold") {
    for (const p of Object.keys(s.controls.pumps) as (keyof typeof s.controls.pumps)[])
      s.controls.pumps[p] = false;
    s.controls.shutoff = { L: false, R: false };
  }
  if (id === "left" || id === "crossfeed" || id === "valve" || id === "emergency")
    s.faults.pumps = ["L1", "L2"];
  if (id === "right") s.faults.pumps = ["R1", "R2"];
  if (id === "crossfeed") s.controls.crossfeed = true;
  if (id === "imbalance" || id === "transferFail") {
    s.tanks.L.q = 1200;
    s.tanks.R.q = 2800;
    s.tanks.C.q = 0;
  }
  if (id === "center" || id === "centerFail") {
    s.controls.pumps.C1 = true;
    s.controls.pumps.C2 = true;
  }
  if (id === "centerFail") s.faults.pumps = ["C1", "C2"];
  if (id === "leak") s.faults.leak = "L";
  if (id === "vent") {
    s.faults.vent = "L";
    s = advance(s, 240);
  }
  if (id === "jettison") {
    s.tanks.L.q = 4500;
    s.tanks.R.q = 4500;
    s.tanks.C.q = 5000;
  }
  if (id === "trim") {
    s.tanks.C.q = 6000;
    s.controls.demand = { L: 0, R: 0 };
  }
  if (id === "refuel" || id === "defuel" || id === "drain") {
    s.controls.ground = true;
    s.controls.demand = { L: 0, R: 0 };
  }
  if (id === "refuel") {
    s.tanks.L.q = 500;
    s.tanks.R.q = 500;
    s.tanks.C.q = 0;
  }
  if (id === "emergency") {
    s.tanks.L.q = 1800;
    s.tanks.R.q = 700;
    s.tanks.C.q = 0;
    s.faults.pumps.push("R1");
    s.faults.leak = "L";
  }
  if (id === "valve") {
    s.faults.crossfeedStuck = true;
    s.controls.crossfeed = true;
  }
  if (id === "sensor") {
    s.faults.sensor = "L";
    s.faults.frozenQuantity = 4200;
    s.tanks.L.q = 3700;
  }
  if (id === "transferFail") {
    s.faults.transferStuck = true;
    s.controls.transfer = "R-L";
  }
  if (id === "pressure") {
    s.controls.restriction.L = 0.65;
    s.controls.demand.L = 3000;
  }
  s.ledger = { initial: total(s), burn: 0, refuel: 0, leak: 0, jettison: 0, defuel: 0, drain: 0 };
  s.time = 0;
  return s;
}

export interface Diagnosis {
  preset: PresetId;
  symptom: string;
  options: string[];
  correct: number;
  reasons: string[];
}
export const DIAGNOSES: Diagnosis[] = [
  {
    preset: "left",
    symptom: "Motor 1 talep ediyor; besleme yeterli mi? Pompa geri bildirimini incele.",
    options: [
      "Sol boost pompalarında kayıp",
      "Sağ tank quantity sensörü",
      "Trim tankı aşırı dolu",
      "Jettison açık",
    ],
    correct: 0,
    reasons: [
      "L1/L2 FAIL ve sol feed kaybı birlikte sol kaynak kaybını gösterir. Sağ kaynak ve crossfeed yolu uygunsa bu modelde besleme yeniden kurulabilir.",
      "Sağ quantity arızası sol pompalarda FAIL üretmez.",
      "Trim miktarı ve CG bu vakada normaldir; sol pompa durumunu açıklamaz.",
      "Jettison kapalıdır ve sol pompa geri bildirimini değiştirmez.",
    ],
  },
  {
    preset: "valve",
    symptom: "Crossfeed komutunu, gerçek konumu ve motor 1 feed basıncını karşılaştır.",
    options: [
      "Sol shutoff kapalı",
      "Crossfeed valfi kapalı takılı",
      "Merkez tank boş",
      "Sağ boost basıncı aşırı yüksek",
    ],
    correct: 1,
    reasons: [
      "Sol shutoff OPEN; uyuşmazlık crossfeed üzerindedir.",
      "OPEN komutu / CLOSED konumu, takılı valfi gösterir. Bir anahtar komutu akış yolunun açıldığını kanıtlamaz.",
      "Merkez yakıtı vardır; sağdan sola geçişi engelleyen kanıt valf konumudur.",
      "Sağ pompa çıkışı normal öğretim aralığındadır; fazla basınç valfi OPEN yapmaz.",
    ],
  },
  {
    preset: "leak",
    symptom: "20× hızda quantity eğilimini izle. Tank azalmasını motor tüketimiyle karşılaştır.",
    options: [
      "İki motorun talebi artmış",
      "Sol tanktan dış kaçak",
      "Crossfeed kendi kendine transfer yapıyor",
      "Trim geri transferi",
    ],
    correct: 1,
    reasons: [
      "Motor flow değerleri normal talepte kalır; eksik kütleyi açıklayamaz.",
      "Sol tank kaybı, motor 1 yakıt tüketiminden daha fazladır. Kaçak olasılığı doğar; gerçek uçakta ek kanıt ve onaylı teşhis verisi gerekir.",
      "Crossfeed bir tanktan diğerine dolum yapmaz; kapalıdır.",
      "Trim transferi kapalı ve trim quantity sabittir.",
    ],
  },
  {
    preset: "imbalance",
    symptom: "Sol/sağ quantity farkını ve feed göstergelerini birlikte yorumla.",
    options: [
      "Venting kaybı",
      "Crossfeed position disagree",
      "Yakıt dağılımı dengesizliği",
      "Her iki motorda feed kaybı",
    ],
    correct: 2,
    reasons: [
      "Tank basınçları ortama yakındır; vent kaybı kanıtı yok.",
      "Crossfeed command/actual uyumludur.",
      "Kanatlarda 1200 / 2800 kg başlangıç dağılımı vardır. Feed normal olsa bile yanal kütle farkı önemlidir.",
      "Her iki motora talep kadar akış gelir.",
    ],
  },
  {
    preset: "vent",
    symptom: "Tank Δp, pompa komutu ve motor basıncının zaman içindeki ilişkisini incele.",
    options: [
      "Quantity sensörü donmuş",
      "Merkez check valve ters takılı",
      "Sol vent tıkalı",
      "Jettison hedefe ulaştı",
    ],
    correct: 2,
    reasons: [
      "Quantity değişir; donmuş göstergeden farklı olarak tank Δp negatiftir.",
      "Merkez kollar devrede değildir; böyle bir arıza bu vaka için tanımlanmamıştır.",
      "Yakıt tüketilirken tank basıncı ortamın altına iner; tıkalı vent emiş koşullarını ve pompa kapasitesini bozabilir.",
      "Jettison kapalıdır; hedefe ulaşmak tankı vakuma sokmaz.",
    ],
  },
  {
    preset: "sensor",
    symptom: "Motor akışı sürerken sol quantity göstergesini 20× hızda izle.",
    options: [
      "Sol motor hiç tüketmiyor",
      "Sol quantity sensörü donmuş",
      "Sağ tankta kaçak",
      "Transfer valfi açık",
    ],
    correct: 1,
    reasons: [
      "Sol motorun flow göstergesi tüketim gösterir.",
      "Gösterge sabitken akış ve hesaplanan tüketim ilerler. Cevaptan sonra eğitim amaçlı gerçek kütleyi karşılaştır.",
      "Sağ tankın değişimi sağ motor tüketimiyle uyumludur.",
      "Transfer kapalıdır; sol tankı tüketim kadar dolduran bir akış yok.",
    ],
  },
  {
    preset: "centerFail",
    symptom: "Merkezde yakıt var. Açılması istenen merkez pompaları ne gösteriyor?",
    options: [
      "Merkez boost kaynak kaybı",
      "Merkez tank tamamen boş",
      "Her iki wing pump kapalı",
      "Crossfeed açık takılı",
    ],
    correct: 0,
    reasons: [
      "C1/C2 FAIL ve center low pressure, yakıt varken merkezden feed oluşmamasını açıklar. Kanat yedeği motorları besleyebilir.",
      "Merkez quantity sıfır değildir.",
      "Wing pumps ON ve kanat kaynaklı engine feed görünür.",
      "Crossfeed kapalıdır; center FAIL nedenini açıklamaz.",
    ],
  },
  {
    preset: "transferFail",
    symptom: "Transfer komutu var; source/destination quantity ve actual position ne gösteriyor?",
    options: [
      "Hedef tank dolu",
      "Kaynak tank boş",
      "Motor shutoff kapalı",
      "Transfer valfi kapalı takılı",
    ],
    correct: 3,
    reasons: [
      "Hedef sol tankta kapasite vardır.",
      "Sağ kaynakta usable fuel vardır.",
      "Shutoff motor beslemesidir; bağımsız transfer yolunu açmaz.",
      "Transfer OPEN komutu / CLOSED gerçek konum ve sıfır transfer akışı bu arızayla tutarlıdır.",
    ],
  },
];

export const MISSIONS = [
  {
    title: "Motor 1 beslemesini geri getir",
    preset: "left" as PresetId,
    objective: "Motor 1 en az %95 talep akışına ve 10 psi giriş basıncına ulaşsın.",
    check: (s: State): boolean => {
      const v = derive(s);
      return v.demand.L > 0 && v.flow.L >= v.demand.L * 0.95 && v.pressure.L >= 10;
    },
  },
  {
    title: "Kanatları dengele",
    preset: "imbalance" as PresetId,
    objective: "Her iki motor beslenirken kanat farkını 200 kg altına indir.",
    check: (s: State): boolean => {
      const v = derive(s);
      return Math.abs(v.imbalance) < 200 && v.flow.L >= 1900 && v.flow.R >= 1900;
    },
  },
  {
    title: "Merkez kaynağı kaybedildi",
    preset: "centerFail" as PresetId,
    objective:
      "Arızalı merkez pompalarının komutunu OFF yap; iki motoru kanatlardan beslemeyi koru.",
    check: (s: State): boolean => {
      const v = derive(s);
      return !s.controls.pumps.C1 && !s.controls.pumps.C2 && v.flow.L >= 1900 && v.flow.R >= 1900;
    },
  },
  {
    title: "Eksik kütlenin kaynağını bul",
    preset: "leak" as PresetId,
    objective: "20 simülasyon saniyesi kanıt topla, ardından kaçağın yerini seç.",
    check: (s: State): boolean => s.time >= 20,
  },
  {
    title: "İniş ağırlığını değerlendir",
    preset: "jettison" as PresetId,
    objective:
      "Örnek MLW 66.000 kg altına in, iki motorun beslemesini koru, jettison komutunu kapat.",
    check: (s: State): boolean => {
      const v = derive(s);
      return v.weight <= 66000 && !s.controls.jettison && v.flow.L >= 1900 && v.flow.R >= 1900;
    },
  },
];
