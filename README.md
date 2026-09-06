# Aircraft Fuel System Lab

**HEE 305 — ATA 28 / ATA 47 Interactive Fuel Systems Laboratory**

Erciyes Üniversitesi Havacılık Elektrik ve Elektroniği öğrencilerinin Hava Aracı Sistemleri–II yakıt sistemi konularını deneyerek çalışabilmesi için bağımsız Türkçe eğitim uygulaması. Üniversite veya uçak üreticisi onayı iddiası yoktur.

Hydraulic Lab ile aynı Barlow Condensed / IBM Plex ailesini, koyu mühendislik panellerini, modüler simülasyon yapısını ve açıklamalı soru yaklaşımını paylaşır. Kendi yakıt ağı, ders içeriği ve arayüzü vardır.

## Çalıştırma

Node.js 22.18+; doğrulanan yerel sürüm Node.js 26.8.1.

```sh
npm ci
npm run dev
```

Yerel uygulama: http://127.0.0.1:3028/

```sh
npm test             # deterministik model, kütle, senaryo ve içerik testleri
npm run build        # TypeScript kontrolü + statik dist/
npm run test:e2e     # üretilmiş dist/ üzerinde tarayıcı testleri
npm run check        # model + build + tarayıcı
```

Linux'ta `/usr/bin/chromium` varsa kullanılır; yoksa `npx playwright install chromium` ile test tarayıcısı kurulabilir. `test:e2e` önce alınmış build gerektirir. Test sunucusu yalnız `127.0.0.1:3128` üzerinde, gerçek Pages benzeri `/aircraft-fuel-system-lab/` alt yolundan dosya sunar; bulunmayan varlığa HTML fallback yapmaz.

## Ürün kapsamı

- Büyük SVG uçak/yakıt şeması; sol, center, sağ ve trim tankları; altı pompa; check, isolation, shutoff, crossfeed, transfer ve nozzle bağlantıları. Akışlar tek simülasyon durumundan gelir. Kapalı yol veya sıfır talep üzerinde sahte akış çizilmez.
- 12 deney: normal besleme; crossfeed; transfer/imbalance; center; pressure/flow; vent; drain/water; jettison; inerting; trim/CG; refuel/defuel; indications.
- 15 öğrenme bölümü. Her bölümde kavram, görev, ilgili parçayı vurgulayan deney, yorum ve 3 açıklamalı mini quiz sorusu.
- 8 teşhis vakası; dörder seçenek ve her seçenek için ayrı gerekçe. Arıza cevabı seçilmeden gerçek kütle grafikleri/bilançosu ve arıza adı açılmaz. Pompa geri bildirimi ve ikazlar gözlemlenebilir kanıt olarak kalır.
- 60 özgün soru, 3 seviye, puanlama, seviye filtresi, soru haritası, yanlış konu listesi ve yeniden başlatma. Mini quiz soruları konuya göre bu bankadan seçilir. Resmî Part-66 soru bankası değildir.
- 5 görev: feed kurtarma, denge, center kaynak kaybı, kaçak teşhisi ve iniş ağırlığı. Sonuçta puan, başarısız değerlendirme sayısı, gerçek çalışma süresi ve konfigürasyon değişikliği sayısı gösterilir. Görev puanı: 100 − 15×başarısız değerlendirme − 2×max(0,değişiklik−8).
- NORMAL/ABNORMAL/EMERGENCY; 21 hazır başlangıç durumu; duraklat/1×/5×/20×; 16 tür komponent bilgi kartı; duruma bağlı WHY açıklamaları.
- Son 60 çalışma saniyesi için gerçek örneklerden 8 grafik. Duraklatmada ve gizli tarayıcı sekmesinde simülasyon ilerlemez. 20× hızda 60 çalışma saniyesi 1200 simülasyon saniyesini temsil eder.
- Tamamen yerel çalışma: backend, hesap, API anahtarı veya veri gönderimi yok. Fontlar paketlerden derlenir; dış CDN gerektirmez. Sınav/öğrenme yanıtları sekmeler arasında korunur; sayfa yenilenince sıfırlanır.

## Dosya yapısı

```text
src/
  sim/
    types.ts           # tank, kontrol, arıza, ledger ve çıktı sözleşmeleri
    engine.ts          # saf besleme çözümü, kütle integrasyonu, CG, uyarılar, WHY
    scenarios.ts       # presetler, sekiz teşhis, beş görev kabul koşulu
    useSimulation.ts   # UI adaptörü, zaman, eylemler ve son 60 s örnekleri
  content/
    lessons.ts         # 15 bölüm, 12 deney, 16 komponent
    questions.ts       # 60 benzersiz soru, yanıtlar ve açıklamalar
  components/
    Schematic.tsx      # model çıktısıyla beslenen SVG ağ
    Controls.tsx       # kumandalar, kokpit ve komponent inceleme
    LabPanel.tsx       # özel deneylerin kontrolleri ve canlı görselleri
    Learning.tsx       # ders, mini quiz ve final exam
    Model.tsx          # kaynaklar ve model sınırları
    Primitives.tsx     # göstergeler, aralık kontrolleri, gerçek örnek grafikleri
  App.tsx              # sayfa/mod navigasyonu ve görev UI durumu
  main.tsx             # React başlangıcı ve yerel fontlar
  styles.css
tests/
  simulation.test.ts   # 36 model/içerik kabul testi
  application.spec.ts  # 18 tarayıcı testi: akışlar, responsive, console
  static_server.py    # gerçek statik dosya ve alt yol doğrulaması
.github/workflows/pages.yml
```

## Fizik ve sistem sözleşmesi

Bu, özel donanımları aynı şemada birleştiren genel bir eğitim modelidir. Tüm transport uçaklarında bu donanımların birlikte bulunduğunu ima etmez.

| Parametre                           | Öğretim değeri                            |
| ----------------------------------- | ----------------------------------------- |
| Tank kapasiteleri L / C / R / T     | 6000 / 8000 / 6000 / 2000 kg              |
| Unusable tabanı L / C / R / T       | 40 / 30 / 40 / 20 kg                      |
| Pompa kapasitesi                    | 3600 kg/h / pompa                         |
| Wing / center nominal boost head    | 40 / 45 psi                               |
| Tank transfer / trim flow           | 30.000 / 12.000 kg/h                      |
| Maksimum jettison / refuel / defuel | 60.000 / 60.000 / 45.000 kg/h             |
| Dry aircraft                        | 60.000 kg, arm 16 m                       |
| Tank arm L / C / R / T              | 16 / 15 / 16 / 32 m                       |
| MAC başlangıcı / uzunluğu           | 14 / 6 m                                  |
| Örnek CG aralığı                    | %25–40 MAC                                |
| Örnek MLW                           | 66.000 kg                                 |
| Quantity low / imbalance eşiği      | 600 / 1000 kg                             |
| Örnek fuel temperature aralığı      | −35…50 °C; donma noktası iddiası değildir |

`derive` açık topolojiyi ve kaynak kapasitelerini çözer; `advance` 0,2 s alt adımlarla kütleyi günceller. Center kaynakları, sonra kendi wing kaynağı, ardından açık crossfeed üzerinden kalan karşı kaynak kapasitesi seçilir. Bu öncelik kuralı gerçek basınç yarışmasının ayrıntılı fizik çözümü değildir.

Her çıkış gerçek çekilebilen miktarla sınırlanır. İç transfer toplamı değiştirmez. Ledger bağımsız olarak şu kimliği denetler:

```text
current = initial + refuel − burn − leak − jettison − defuel − drain
error = total(tanks) − current
```

- Basınç/debi ayrıdır. Motor talebi ve kısıtlama akışı sınırlar; pompa basıncı basit bir yük eğrisiyle düşer. Kapalı motor shutoffunda pompa çıkışı basınçlı olabilir ama engine flow sıfırdır.
- Source isolation yalnız wing pompa kolunu keser; center ve karşı kaynağın bağlantısı ayrı değerlendirilir. Check valfler ideal tek yönlüdür; ayrı arıza türleri yoktur.
- Collector ana tank kütlesine dahildir. Ayrı feeder dolum dinamiği, jet pump, slosh, su darbesi, ayrıntılı kavitasyon ve engine high-pressure metering/combustion çözülmez.
- Transfer, trim, ground service ve jettison için ideal özel donanım varsayılır. Transfer kaynak/kapasiteyle; servicing hedef/kapasiteyle; jettison hedef/usable ile sınırlandırılır.
- Jettison bu mimaride yalnız sol/sağ wing tanklarından çekilir; center ve trim doğrudan dump edilmez. Her nozzle kendi wing akışını gösterir. Gerçek dump donanımı ve mantığı tipe bağlıdır.
- Refuel önce kanatları simetrik 4000 kg seviyesine, sonra centerı, sonra kalan wing kapasitesini doldurur. Bu sıra evrensel değildir. Ground service modunda motor talebi sıfır, jettison kapalı, transfer/trim/drain kilitlidir.
- Vent kapalı gaz hacmi için mutlak basınçla P×V/T kullanılır. Tank basıncı atmosferden fark olarak kPa gösterilir. Yakıtın sıcaklığa bağlı yoğunluğu yaklaşık modellenir; buhar dengesi ve surge/overflow akışları çözülmez.
- Serbest çökelmiş su ayrı L hesabıdır. Su yakıt ledgerına veya aircraft weight hesabına eklenmez. Drain yerde önce suyu sonra yakıtı çıkarır; katman oranı görünürlük için abartılır.
- Inerting yalnız ullage O₂ konsantrasyonunun %21 ile örnek %9 asimptotu arasında değişimini gösterir. Gerçek limit, yanıcılık hesabı, NGS performansı veya güvenlik doğrulaması değildir.
- Endurance kullanılabilir kütle / anlık motor tüketimi oranıdır. Arızalı kaynak erişimi, rezerv, alternatif meydan, uçuş profili veya performans hesaba katılmaz.
- Tank gövdesi kaçağı motor shutoff kapansa da sürer. Quantity sensörü arızasında gerçek kütle ile gösterge ayrılır; miktara bağlı ikazlar göstergeyi kullandığından yanıltılabilir.

## GitHub Pages

Yayın adresleri:

- [Aircraft Fuel System Lab](https://muhammetarbag.github.io/aircraft-fuel-system-lab/)
- [Tüm laboratuvarlar](https://muhammetarbag.github.io/)
- [GitHub deposu](https://github.com/muhammetarbag/aircraft-fuel-system-lab)

1. Bu klasörü kendi GitHub deposunun kökü olarak kullan.
2. Repository Settings → Pages → Source: **GitHub Actions** seç.
3. `main` veya `master` güncellemesi ya da workflow_dispatch ile iş akışını başlat.

İş akışı kilitli kurulumu, model/içerik testlerini, üretim bağımlılığı denetimini, typecheck/build ve statik tarayıcı testlerini tamamladıktan sonra `dist/` klasörünü yayınlar. Pull requestlerde yalnız doğrular. Son yayın durumunu deponun Actions sekmesinden kontrol edebilirsin; yerel test kaydı VALIDATION.md içindedir.

Vite `base: './'` ile tüm JS/CSS/font/ikon referansları göreli üretilir; depo adına bağımlı mutlak `/assets/` yolu yoktur. SPA sunucu yönlendirmesi gerekmez; sekmeler UI durumudur. `public/.nojekyll` statik çıktıya kopyalanır.

## Kaynaklar

- [FAA AMT Airframe Handbook Vol. 2, Chapter 14](https://www.faa.gov/sites/faa.gov/files/2022-06/amt_airframe_hb_vol_2.pdf)
- [FAA fuel tank safety / ullage](https://www.faa.gov/lessons_learned/transport_airplane/accidents/N93119)
- [Airbus Safety First — Fuel Leak Management in Flight](https://safetyfirst.airbus.com/fuel-leak-management-in-flight/)
- [Airbus Safety First — Avoiding Fuel Spills on A320 Family Aircraft](https://safetyfirst.airbus.com/avoiding-fuel-spills-on-a320-family-aircraft/)

Kaynaklar kavramsal referanstır; özel uçak limitleri ve operasyonel adımlar uygulamaya taşınmaz. **Exact implementation depends on aircraft type.**

## Eğitim sınırı

This application is an educational simulation.

It is not approved maintenance data.

It must not be used for aircraft operation, maintenance or troubleshooting.

Always refer to the applicable AMM, FIM, TSM, IPC and approved aircraft documentation for real aircraft maintenance.
