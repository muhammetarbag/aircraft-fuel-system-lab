import { Panel } from "./Primitives.tsx";
export function Model() {
  return (
    <div className="model-page">
      <span className="eyebrow">MODEL / KAPSAM / KAYNAKLAR</span>
      <h1>
        Ne hesaplıyoruz?
        <br />
        Neyi varsayıyoruz?
      </h1>
      <p className="lead">
        Genel bir transport-category eğitim mimarisi. Bir Boeing veya Airbus tipinin kopyası
        değildir.
      </p>
      <div className="two-col">
        <Panel title="Açık model sözleşmesi">
          <div className="prose">
            <ul>
              <li>
                Tanklar: sol 6000, center 8000, sağ 6000, trim 2000 kg. Unusable taban: 40 / 30 / 40
                / 20 kg.
              </li>
              <li>
                Wing kaynakları kendi motorunu, center kolları öncelikle aynı taraf motorunu besler.
                Crossfeed açıkken kalan kapasite karşıya geçebilir. Basınç rekabeti ayrıntılı bir
                akışkan ağı olarak çözülmez.
              </li>
              <li>
                Paralel pompa kapasitesi 3600 kg/h/pompa. Nominal wing/center basıncı 40/45 psi;
                yükle basitleştirilmiş bir düşüş eğrisi vardır.
              </li>
              <li>
                Wing source isolation yalnız wing pompa kolunu keser. Center kollarının check
                valfleri ideal tek yönlüdür.
              </li>
              <li>
                Tank-to-tank transfer ve trim transfer özel, ideal donanımlardır. Collector ana
                tankın içinde çizilir; slosh, jet pump ve geçici feeder dolumu çözülmez.
              </li>
              <li>
                Vent kapalıyken kapalı gaz için P×V/T ilişkisi; açıkken ortama üstel yaklaşım
                kullanılır. Sıvı termal genleşmesi yaklaşık yoğunlukla temsil edilir.
              </li>
              <li>
                Jettison sol ve sağ wing tanklarından usable miktarlarına orantılı çekilir; center
                ve trim bu modelde doğrudan dump edilmez. Şemadaki iki nozzle toplam çıkışı temsil
                eder; boru basınç kayıpları çözülmez.
              </li>
              <li>
                NEA örnek O₂ asimptotu %9; sertifikalı bir limit veya gerçek NGS performansı
                değildir.
              </li>
            </ul>
          </div>
        </Panel>
        <Panel title="Kütle korunumu">
          <div className="prose">
            <div className="formula">
              Q(t+dt) = Q(t)
              <br />+ refuel + incoming transfer
              <br />− outgoing transfer − engine burn
              <br />− leak − jettison − defuel − drain
            </div>
            <p>
              İç transfer, tüm tanklar toplandığında birbirini götürür. Her dış çıkış gerçek
              çekilebilen kütleyle sınırlandırılır; tanklar negatif olmaz.
            </p>
            <p>
              Tank gövdesi kaçağı unusable yakıtı da boşaltabilir. Motor shutoff bu deliği kapatmaz.
              Su ayrı litre sayacıdır; yakıt bilançosuna eklenmez.
            </p>
            <p>
              0,2 saniyelik alt adımlar kullanılır; hız 1× / 5× / 20×. Grafikler son 60 çalışma
              saniyesindeki gerçek örnekleri tutar. Duraklatmada ve arka plan sekmesinde zaman
              ilerlemez.
            </p>
            <p>
              Endurance = toplam usable / anlık motor tüketimi. Arızada tüm tank yakıtına erişim,
              rezerv ve değişen demand dikkate alınmaz; yalnız stok oranıdır.
            </p>
            <p>
              CG = Σ(kg × arm) / Σkg. Dry aircraft 60.000 kg, arm 16 m; örnek MLW 66.000 kg. MAC
              başlangıcı 14 m ve uzunluğu 6 m.
            </p>
          </div>
        </Panel>
      </div>
      <Panel title="Teknik referanslar ve okuma rotası">
        <div className="source-list">
          <a
            href="https://www.faa.gov/sites/faa.gov/files/2022-06/amt_airframe_hb_vol_2.pdf"
            target="_blank"
            rel="noreferrer"
          >
            <b>FAA · AMT Airframe Handbook, Volume 2</b>
            <span>
              Chapter 14: Aircraft Fuel System. Tank, pompa, valf, vent ve gösterge prensipleri.
            </span>
          </a>
          <a
            href="https://www.faa.gov/lessons_learned/transport_airplane/accidents/N93119"
            target="_blank"
            rel="noreferrer"
          >
            <b>FAA · Fuel tank safety & ullage</b>
            <span>
              Ullage, yanıcılık ve oksijen azaltmanın kavramsal temeli. Gerçek olayın uçak verileri
              simülasyona aktarılmadı.
            </span>
          </a>
          <a
            href="https://safetyfirst.airbus.com/fuel-leak-management-in-flight/"
            target="_blank"
            rel="noreferrer"
          >
            <b>Airbus Safety First · Fuel Leak Management</b>
            <span>
              Yakıt miktarı, tüketim ve dengesizlik belirtilerini birlikte okuma. Operasyonel
              adımlar burada kullanılmaz.
            </span>
          </a>
          <a
            href="https://safetyfirst.airbus.com/avoiding-fuel-spills-on-a320-family-aircraft/"
            target="_blank"
            rel="noreferrer"
          >
            <b>Airbus Safety First · Refuelling / transfer etkileşimi</b>
            <span>
              Farklı transfer mimarileri ve dolumun etkileşebileceğine ilişkin tip örneği; genel bir
              dolum sırası olarak alınmaz.
            </span>
          </a>
        </div>
        <p className="prose">
          Kaynaklar kavramsal doğruluk için kullanıldı. Sayısal simülasyon parametreleri ve soru
          bankası bu eğitim ürünü için oluşturuldu. Exact implementation depends on aircraft type.
        </p>
      </Panel>
      <div className="disclaimer">
        <h2>Eğitim sınırı</h2>
        <p>This application is an educational simulation.</p>
        <p>It is not approved maintenance data.</p>
        <p>It must not be used for aircraft operation, maintenance or troubleshooting.</p>
        <p>
          Always refer to the applicable AMM, FIM, TSM, IPC and approved aircraft documentation for
          real aircraft maintenance.
        </p>
        <p>
          Erciyes Üniversitesi ile resmî onay veya ortaklık iddiası yoktur. HEE 305 için bağımsız
          çalışma materyalidir.
        </p>
      </div>
    </div>
  );
}
