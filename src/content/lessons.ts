import type { PresetId } from "../sim/scenarios.ts";
export interface Lesson {
  title: string;
  english: string;
  concept: string;
  role: string;
  focus: string;
  lab: string;
  preset: PresetId;
  steps: string[];
  interpretation: string;
}
export const LESSONS: Lesson[] = [
  {
    title: "Sistemin bütünü",
    english: "Architecture",
    concept:
      "Yakıt sistemi depolar, besler, dağılımı yönetir ve durumunu bildirir. Bir tankta yakıt olması motorun ona erişebildiği anlamına gelmez.",
    role: "Kaynak → pompa → check valve → manifold → shutoff → engine feed zincirini takip et.",
    focus: "tank",
    lab: "normal",
    preset: "cold",
    steps: [
      "L1 pompasını aç; manifold basıncını oku.",
      "Sol shutoffu aç; Engine 1 akışını ve sol quantity azalmasını izle.",
      "R1 ve sağ shutoff ile ikinci motorun yolunu kur.",
    ],
    interpretation:
      "Basınç açık bir tüketim yolu olmadan bulunabilir. Akış animasyonu yalnız hesaplanan debi varsa hareket eder.",
  },
  {
    title: "Tanklar ve depolama",
    english: "Tanks & storage",
    concept:
      "Wing ve center tanklar farklı yerleşimlerde yakıt depolar. Integral tank yapının bir parçasıdır; bladder ve rigid tank çözümleri de bulunur.",
    role: "Baffles çalkalanmayı sınırlar. Collector/feeder bölmesi pompa girişinde yerel yakıt birikimini destekler. Buradaki collector ana tank kütlesine dahildir; ayrı bir sonsuz rezerv değildir.",
    focus: "tank",
    lab: "center",
    preset: "center",
    steps: [
      "Center pump flow ve wing pump flow değerlerini karşılaştır.",
      "İki center pompasını kapat; kaynak etiketlerinin değiştiğini gör.",
      "Usable ile total quantity farkını oku.",
    ],
    interpretation:
      "Bu model center önceliği seçer. Gerçek sistem doğrudan feed, transfer jet pump veya farklı öncelikler kullanabilir.",
  },
  {
    title: "Pompa, basınç ve besleme",
    english: "Pump · pressure · flow",
    concept:
      "Basınç enerji düzeyini, debi birim zamandaki yakıt hareketini anlatır. Booster pump düşük basınçlı aircraft feed tarafındadır; motorun yüksek basınçlı metering/injection sistemi burada çözülmez.",
    role: "Boost kaynağı motor girişine yeterli yakıt sağlar; negatif tank basıncı emiş koşullarını bozabilir.",
    focus: "pump",
    lab: "pressure",
    preset: "pressure",
    steps: [
      "Engine 1 demand değerini artır.",
      "Hat kısıtlamasını %0 ile %80 arasında değiştir.",
      "Pump outlet ve engine inlet basınçlarını, talep ve ulaşan flow ile karşılaştır.",
    ],
    interpretation:
      "Pompa tarafında yüksek basınç varken kısıtlama üzerinde basınç kaybı ve motor tarafında debi açığı görülebilir.",
  },
  {
    title: "Valfler ve manifoldlar",
    english: "Valves & manifolds",
    concept:
      "Shutoff beslemeyi keser; isolation bir kaynak kolunu ayırır; check valve geri akışı sınırlar. Komut ile gerçek konum farklı büyüklüklerdir.",
    role: "Feed manifoldları kullanılabilir kaynakları motor yollarına bağlar. Paralel pompalar basınçlarını zorunlu olarak toplamaz.",
    focus: "shutoff",
    lab: "normal",
    preset: "normal",
    steps: [
      "Sol shutoffu kapat; pump outlet ve engine flow değerlerini izle.",
      "Shutoffu aç, sol isolationı kapat.",
      "Crossfeed açarak sağ kaynağın ulaşabildiği yolu gözle.",
    ],
    interpretation:
      "Sağlam pompa yeterli değildir; kaynak ile motor arasında kesintisiz açık bir yol gerekir.",
  },
  {
    title: "Çapraz besleme",
    english: "Crossfeed",
    concept:
      "Crossfeed, bir kaynağın karşı motor tarafına ulaşmasına izin verir. Bir dolum/transfer bağlantısı değildir.",
    role: "Bu eğitim ağında iki manifoldun bağlantısını açar; yeterli pompa kapasitesi ve uygun shutoff konumları gerekir.",
    focus: "crossfeed",
    lab: "crossfeed",
    preset: "normal",
    steps: [
      "L1 ve L2 komutlarını OFF yap.",
      "Engine 1 düşük basınç/akış belirtisini gör.",
      "Crossfeed aç; sağ tankın iki motoru beslediği okları izle.",
    ],
    interpretation:
      "Sol quantity kendiliğinden artmaz. Sağ tankın tüketimi artar; iki motor için yeterli sağ kaynak kapasitesi gerekir.",
  },
  {
    title: "Transfer ve yanal denge",
    english: "Transfer & imbalance",
    concept:
      "Transfer kaynak tanktan çıkarır, hedef tanka ekler. Yanal dengesizlik kanatların kütle farkıyla ilişkilidir.",
    role: "Bu birleşik eğitim modelinde özel tanklar arası transfer donanımı vardır. Her transport uçağında böyle bir wing-to-wing hat bulunmaz.",
    focus: "transfer",
    lab: "transfer",
    preset: "imbalance",
    steps: [
      "Başlangıçtaki 1600 kg farkı oku.",
      "R → L transfer seç; sağ azalışını ve sol artışını izle.",
      "AUTO ile eşitlenmeyi dene; ardından crossfeed ile tüketimden dengelemenin farkını tartış.",
    ],
    interpretation:
      "300 kg sağdan sola taşımak farkı 600 kg azaltır. İç transfer toplam yakıtı değiştirmez; eşzamanlı engine burn toplamı azaltır.",
  },
  {
    title: "Gösterge ve ikazlar",
    english: "Indication & warning",
    concept:
      "Quantity stok, fuel flow değişim hızı, pressure besleme koşulu, temperature ise yakıtın termal durumudur. Tek bir gösterge bütün sistemi anlatmaz.",
    role: "Kapasitanslı quantity ölçümü yakıt/hava dielektrik farkından yararlanabilir; yoğunluk/sıcaklık kompanzasyonu tasarıma bağlıdır.",
    focus: "quantity",
    lab: "indications",
    preset: "sensor",
    steps: [
      "20× hız seç ve sol quantity değerini izle.",
      "Normal engine flow ile donmuş quantity arasındaki tutarsızlığı bul.",
      "Eğitim gerçek miktarını açıp göstergeyle karşılaştır.",
    ],
    interpretation:
      "Bu modelde quantity sensörü donması gerçek kütleyi veya motor tüketimini durdurmaz. Göstergeye dayalı low-fuel ikazı da yanıltılabilir.",
  },
  {
    title: "Venting ve contamination",
    english: "Venting · drain",
    concept:
      "Vent, tüketim ve sıcaklık değişiminde gaz alışverişi sağlar. Surge bölgesi genleşme/taşan yakıt için tampon olabilir; ana yakıt deposu değildir.",
    role: "Serbest su yakıttan daha yoğundur ve ideal çökelmede tankın altına iner. Çözünmüş su ve emülsiyon bu çizimin kapsamı dışındadır.",
    focus: "vent",
    lab: "vent",
    preset: "normal",
    steps: [
      "Sol venti tıka; 20× hızda tank Δp eğrisini izle.",
      "Venti aç; basıncın ortama yaklaşmasını gör.",
      "Drain laboratuvarında dip numunesini aç; önce su sonra yakıt çıkışını izle.",
    ],
    interpretation:
      "Tank vakumu pompaların emiş kapasitesini düşürebilir. Gerçek bakım AMM ve approved maintenance data ile yapılır.",
  },
  {
    title: "Yakıt jettison",
    english: "Fuel jettison / dumping",
    concept:
      "Jettison, donanımlı uçakta yakıtı dışarı atarak kütleyi azaltır. Her uçakta bulunmaz ve her ağırlık probleminde aynı çözüm uygulanmaz.",
    role: "Bu modelde iki wing tankına bağlı nozzle vardır; motor feedinden ayrı idealize bir çıkış yolu kullanılır.",
    focus: "jettison",
    lab: "jettison",
    preset: "jettison",
    steps: [
      "74.000 kg başlangıç ağırlığını örnek 66.000 kg MLW ile karşılaştır.",
      "Jettison aç ve 20× hızda nozzle çıkışını izle.",
      "Hedefte otomatik kesilen akışı ve devam eden engine consumptionı ayır.",
    ],
    interpretation:
      "Çıkan yakıt ledgerda jettison olarak ayrı sayılır. Buradaki hız, hedef ve MLW bir gerçek uçak prosedürü değildir.",
  },
  {
    title: "Yakıt tankı inerting",
    english: "ATA 47 · NEA",
    concept:
      "Ullage içindeki yakıt buharı/hava karışımının yanıcılığı oksijen ve sıcaklık gibi değişkenlere bağlıdır. NEA oksijen oranını azaltır.",
    role: "Azotça zengin hava gaz boşluğuna verilir; sıvı yakıt kütlesi artmaz. Ateşleme önleme önlemleri önemini korur.",
    focus: "inerting",
    lab: "inerting",
    preset: "inerting",
    steps: [
      "NORMAL AIR modunda yaklaşık %21 O₂ değerini gör.",
      "NEA modunu aç; gaz boşluğundaki O₂ eğilimini izle.",
      "Normal havaya dön ve zaman içindeki değişimi karşılaştır.",
    ],
    interpretation:
      "Örnek %9 asimptotu yalnız görsel öğretim hedefidir. Onaylı inert limit, güvenlik sertifikası veya gerçek NGS performansı değildir.",
  },
  {
    title: "Boylamsal denge ve trim",
    english: "Longitudinal balance · CG",
    concept:
      "CG, ortak bir datuma göre kütle momentlerinin toplamının toplam kütleye bölümüdür: Σ(m×arm)/Σm.",
    role: "Arka trim tankına yakıt göndermek ağırlığı değiştirmeden momenti artırır; CG arkaya kayar. Kontrol stratejisi ve limitler tipe bağlıdır.",
    focus: "trim",
    lab: "trim",
    preset: "trim",
    steps: [
      "Motor demand sıfırken merkezden trim tankına aktar.",
      "Her tankın kolunu, momentini ve güncel CGyi karşılaştır.",
      "İleri transfer ile CGyi geri getir; örnek forward/aft sınırlarını izle.",
    ],
    interpretation:
      "15 m koldan 32 m kola taşınan 1000 kg, momenti 17.000 kg·m artırır. %MAC için ayrıca MAC başlangıcı/uzunluğu gerekir.",
  },
  {
    title: "Yer hizmetleri",
    english: "Refuel & defuel",
    concept:
      "Refuel sistem sınırından içeri, defuel dışarı kütle hareketidir. Pressure ve gravity refueling farklı giriş düzenleridir.",
    role: "Bu panel yer modunda hedef quantity ve tank kapasitesi ile ikmali sınırlar. Gerçek panel dizisi, bonding ve bakım uygulaması öğretilmez.",
    focus: "service",
    lab: "refuel",
    preset: "refuel",
    steps: [
      "12.000 kg hedef seç ve refuel başlat.",
      "Kanatlar → center sırasını ve hedefte durmayı izle.",
      "Defuel moduna geç; toplam ile ayrı çıkış sayacını karşılaştır.",
    ],
    interpretation:
      "Bu model önce kanatları simetrik 4000 kg seviyesine, sonra centerı doldurur. Gerçek dolum sırası uçak tipine bağlıdır.",
  },
  {
    title: "Abnormal ve emergency",
    english: "Redundancy & configuration",
    concept:
      "Yedeklilik bir arıza sonrasında kullanılabilir alternatif sağlar. Ortak tank kaybı, iki pompa ve açık valf bulunmasına rağmen beslemeyi sınırlayabilir.",
    role: "NORMAL sağlam başlar, ABNORMAL tek bir arıza olgusu yükler; EMERGENCY sol kaynak kaybını, kaçağı ve sınırlı sağ kaynağı birleştirir.",
    focus: "pump",
    lab: "normal",
    preset: "emergency",
    steps: [
      "İki motorun toplam talebini çalışan pompa kapasitesiyle karşılaştır.",
      "Crossfeed ve shutoffların erişim etkisini gözle.",
      "Kaynağı izole etmenin tank kaçağını neden durdurmadığını tartış.",
    ],
    interpretation:
      "Açık yol kapasite yaratmaz. Gerçek uçakta burada denenen konfigürasyonlar uygulanamaz; onaylı doküman gerekir.",
  },
  {
    title: "Arıza teşhisi",
    english: "Fault diagnosis",
    concept:
      "Bir arıza olasılığını birden çok göstergeyle sınamak gerekir. Komut, konum, basınç ve quantity eğilimleri farklı türde kanıt sağlar.",
    role: "Teşhis modu sekiz vaka sunar; önce belirtiler görünür, cevap ve diğer seçeneklerin gerekçeleri seçimden sonra açılır.",
    focus: "quantity",
    lab: "indications",
    preset: "leak",
    steps: [
      "Quantity düşüşünü engine consumptionla karşılaştır.",
      "Transfer, jettison ve yer servisinin etkin olup olmadığını kontrol et.",
      "Teşhis modunda dört seçenekten birini seç; gerekçeleri değerlendir.",
    ],
    interpretation:
      "Bu modelde tank kaçağı ile donmuş sensör farklı davranır. Gerçek teşhis daha çok veri ve FIM/TSM gerektirir.",
  },
  {
    title: "Final sınavına hazırlık",
    english: "System reasoning",
    concept:
      "Önce akış yolunu kur, sonra kapasiteyi ve ölçüm tutarlılığını değerlendir. Bir büyüklük değişiyorsa giriş ve çıkış bilançosunu açıkla.",
    role: "60 özgün soru; temel kavramlar, sistem ilişkileri ve arıza muhakemesi. Part-66 style educational practice questions.",
    focus: "tank",
    lab: "normal",
    preset: "normal",
    steps: [
      "Kütle bilançosundaki her terimi bul.",
      "Üç seviyede soruları çöz; yanlış konularına geri dön.",
      "Görevlerde süreyi ve yaptığın konfigürasyon değişikliklerini değerlendir.",
    ],
    interpretation:
      "Bu içerik resmî Part-66 soruları değildir. Doğru yanıt kadar gerekçeyi ve modelin sınırlarını bilmek önemlidir.",
  },
];

export const LABS = [
  ["normal", "Normal besleme", "Tanktan motora ilk yol"],
  ["crossfeed", "Crossfeed", "Bir kaynak, iki motor"],
  ["transfer", "Transfer & imbalance", "Kütleyi tanklar arasında taşı"],
  ["center", "Center tank", "Kaynak önceliğini gör"],
  ["pressure", "Pressure ≠ Flow", "Talep, kapasite, kısıtlama"],
  ["vent", "Venting", "Tankın nefes alması"],
  ["drain", "Drain & water", "Dipteki iki sıvı"],
  ["jettison", "Jettison", "Ağırlık azaltma"],
  ["inerting", "Inerting", "Ullage ve oksijen"],
  ["trim", "Trim & CG", "Momentleri yönet"],
  ["refuel", "Refuel / defuel", "Yer servis paneli"],
  ["indications", "Indications", "Göstergenin arkasındaki gerçek"],
] as const;
export type LabId = (typeof LABS)[number][0];
export const LAB_PRESETS: Record<LabId, PresetId> = {
  normal: "cold",
  crossfeed: "normal",
  transfer: "imbalance",
  center: "center",
  pressure: "pressure",
  vent: "normal",
  drain: "drain",
  jettison: "jettison",
  inerting: "inerting",
  trim: "trim",
  refuel: "refuel",
  indications: "sensor",
};

export const PARTS: Record<
  string,
  {
    title: string;
    function: string;
    input: string;
    output: string;
    normal: string;
    failure: string;
    warnings: string;
  }
> = {
  tank: {
    title: "Yakıt tankı / collector",
    function:
      "Yakıtı depolar; yerel collector, besleme girişindeki yakıt toplanmasını temsil eder.",
    input: "Refuel ve atanmış transfer hatları",
    output: "Pump inlet, transfer, drain ve donanımlıysa jettison",
    normal: "Yeterli usable fuel, açık vent; collector aynı tank kütlesine dahildir.",
    failure: "Kaçak, contamination veya yetersiz giriş koşulu beslemeyi bozar.",
    warnings: "LOW FUEL · TANK PRESSURE",
  },
  pump: {
    title: "Boost pump",
    function: "Aircraft feed hattına enerji ekler. İki paralel pompa yedek kaynak/kapasite sağlar.",
    input: "Tank kullanılabilir yakıtı, elektrik ve uygun emiş koşulları",
    output: "Basınçlı kaynak kolu; debi talep ve topolojiye bağlı",
    normal: "Komut ON ve sağlam; sıfır talepte akış sıfır olabilir.",
    failure: "Kaynak kapasitesi azalır; yedek veya karşı taraftan besleme değerlendirilebilir.",
    warnings: "PUMP FAIL · LOW PRESSURE",
  },
  crossfeed: {
    title: "Crossfeed valve",
    function: "Sol ve sağ engine feed manifoldlarını bağlar.",
    input: "Bir taraftaki kullanılabilir basınçlı kaynak",
    output: "Karşı engine feed tarafına olası akış",
    normal: "Normal bağımsız beslemede CLOSED; kullanım tipe bağlıdır.",
    failure: "Stuck CLOSED konumunda OPEN komutu bağlantı kurmaz.",
    warnings: "VALVE DISAGREE · LOW PRESSURE",
  },
  shutoff: {
    title: "Engine fuel shutoff",
    function: "Motor besleme yolunu açar veya keser.",
    input: "Feed manifold",
    output: "Motorun aircraft-side yakıt girişi",
    normal: "Bu modelde çalışan motor için OPEN.",
    failure: "Kapalı konum beslemeyi keser; yukarıdaki tank kaçağını durdurmaz.",
    warnings: "LOW PRESSURE / FEED",
  },
  isolation: {
    title: "Source isolation valve",
    function: "Wing pompa kaynağını feed manifoldundan ayırır.",
    input: "Wing boost pump çıkışı",
    output: "Aynı taraf feed manifold",
    normal: "Kaynak kullanılacaksa OPEN.",
    failure: "Kapalı yol sağlam kaynağı motordan ayırır.",
    warnings: "LOW PRESSURE / FEED",
  },
  check: {
    title: "Check valve",
    function: "Basınçlı bir kaynaktan başka pompa/tanka ters akışı engeller.",
    input: "Pompa çıkışı",
    output: "Tek yönlü kaynak yolu",
    normal: "İleri yönde uygun basınç farkında geçiş.",
    failure:
      "Gerçek bir sızdırma/takılma arızası ters akış veya besleme kaybı yaratabilir; burada ideal sağlam elemandır.",
    warnings: "Etkilediği kola bağlı; doğrudan bir check-valve ikazı varsayılmaz.",
  },
  transfer: {
    title: "Transfer pump & valve",
    function: "Atanmış kaynak tanktan hedef tanka yakıt taşır.",
    input: "Kaynak usable fuel ve transfer pompası",
    output: "Hedef tank; kapasiteyle sınırlı",
    normal: "Pompa ON, valf actual OPEN ve geçerli yön.",
    failure: "Kapalı takılan valfte komut var, akış yok.",
    warnings: "TRANSFER VALVE DISAGREE · FUEL IMBALANCE",
  },
  vent: {
    title: "Vent / surge bağlantısı",
    function: "Yakıt tüketimi ve termal genleşmede basınç dengelenmesini sağlar.",
    input: "Ortam havası; tank gaz hacmi",
    output: "Kontrollü hava alışverişi; surge bölgesi geçici taşmayı karşılayabilir",
    normal: "Tank Δp yaklaşık sıfır.",
    failure: "Tıkanma vakum veya aşırı basınç oluşturabilir.",
    warnings: "TANK PRESSURE; dolaylı LOW PRESSURE",
  },
  quantity: {
    title: "Fuel quantity indication",
    function: "Yakıt miktarı hakkında ölçüm sunar; gerçek kütleyle aynı şey değildir.",
    input: "Tank sensörü ve tasarıma bağlı kompanzasyon",
    output: "Gösterilen tank/total quantity",
    normal: "Bu eğitim modelinde gerçek kg ile eşleşir.",
    failure: "Donmuş sensör tüketim sürerken sabit miktar gösterebilir.",
    warnings: "Göstergeye bağlı LOW FUEL / FUEL IMBALANCE yanıltılabilir.",
  },
  temperature: {
    title: "Fuel temperature sensor",
    function: "Yakıtın termal durumunu bildirir.",
    input: "Tank sıcaklığı",
    output: "°C gösterimi",
    normal: "Yakıt/çevre arasında zamanla ısı dengesi.",
    failure:
      "Gerçek sensör arızası yanlış değer verebilir; bu model sensör sıcaklık arızasını çözmez.",
    warnings: "FUEL TEMP; eşikler yalnız öğretim içindir.",
  },
  jettison: {
    title: "Jettison valve & nozzle",
    function: "Donanımlı uçakta yakıtı dışarı atarak kütleyi azaltır.",
    input: "Sol ve sağ wing tankları (bu model)",
    output: "Wing nozzles üzerinden dışarı kütle",
    normal: "Kapalı; modelde yerde kilitli ve hedef korumalı.",
    failure: "Gerçek arıza kesilememe/akış kaybı olabilir; burada valf ideal kabul edilir.",
    warnings: "Quantity değişimi ve ağırlık; gerçek ikazlar tipe bağlı.",
  },
  engine: {
    title: "Engine fuel feed",
    function: "Motor talebinin aircraft supply tarafından karşılanmasını gösterir.",
    input: "Açık shutoff sonrasındaki basınç ve kütle akışı",
    output: "Engine consumption; toplam yakıttan çıkarılır",
    normal: "Ulaşan flow talebi karşılar.",
    failure: "Yetersiz flow/pressure feed kaybıdır. Combustion ve restart dinamiği çözülmez.",
    warnings: "LOW PRESSURE / FEED",
  },
  trim: {
    title: "Trim tank",
    function: "Yakıtın boylamsal dağılımı üzerinden CGyi etkiler.",
    input: "Merkezden arka transfer",
    output: "Merkeze ileri transfer; bu modelde doğrudan engine feed yok",
    normal: "Toplam ağırlık ve moment birlikte izlenir.",
    failure: "Ulaşılamayan trim yakıtı ve sınır dışı CG farklı problemler olabilir.",
    warnings: "CG OUTSIDE DEMO RANGE",
  },
  service: {
    title: "Refuel / defuel panel",
    function: "Yer modunda uçak içine/dışına yakıt hareketini yönetir.",
    input: "Haricî kaynak veya uçak tankları",
    output: "Hedef miktara kadar dolum veya defuel çıkışı",
    normal: "Servis modları karşılıklı dışlanır; tank kapasitesi korunur.",
    failure: "Gerçek sensör/valf arızası aşırı dolum yaratabilir; burada kapasite koruması ideal.",
    warnings: "Bu panel bakım prosedürü değildir.",
  },
  inerting: {
    title: "NEA / ullage",
    function: "Gaz boşluğuna azotça zengin hava vererek oksijen oranını azaltır.",
    input: "Kavramsal NEA kaynağı; gerçek ayırıcı performansı modellenmez",
    output: "Ullage oksijen konsantrasyonu",
    normal: "Yakıt kütlesini değiştirmeden O₂ düşüşü.",
    failure: "NEA kaybında oksijen hava seviyesine yaklaşabilir.",
    warnings: "Burada sertifikalı inert veya güvenli etiketi üretilmez.",
  },
  drain: {
    title: "Drain point",
    function: "İdeal çökelmiş su ve sonrasında yakıtın alt noktadan çıkışını gösterir.",
    input: "Sol tank sump bölgesi",
    output: "Önce su (L), sonra yakıt (kg)",
    normal: "Kapalı; eğitimde yalnız yerde açılabilir.",
    failure: "Açık bırakılırsa su sonrası yakıt kaybı sürer.",
    warnings: "Gerçek işlem yalnız AMM ve approved maintenance data ile.",
  },
};
