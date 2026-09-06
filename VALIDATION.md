# Teslim doğrulaması — 6 Eylül 2026

## Doğrulanan sonuç

- **36/36 model ve içerik testi** başarılı (`npm test`).
- **18/18 tarayıcı testi** başarılı; son çalışma 25,6 saniye (`npm run test:e2e`).
- `npm run build`: TypeScript strict/no-unused kontrolü ve Vite statik build başarılı.
- Üretim bağımlılığı denetimi: `npm audit --omit=dev --audit-level=moderate` → 0 vulnerability.
- Ek oxlint kaynak/test kontrolü: uyarı veya hata yok.
- Yerel Node.js: 26.8.1; tarayıcı: sistem Chromium, Playwright test runner.

## Model kanıtı

Normal tüketim birim dönüşümü, pompa öncesi/sonrası basınç, kapalı shutoff, iki yönlü crossfeed kaynağı, tek pompa yedekliliği, sınırlı pompa kapasitesi, command/actual ayrımı, isolation, center önceliği/boşalması/arızası, transfer kütle korunumu/denge/kapasite sınırı, vent vakumu ve iyileşmesi, termal genleşme, su öncelikli drain, leak, donmuş sensör, jettison hedefte kesme/yer kilidi, inerting, trim moment hesabı, refuel hedef/kapasite, defuel residual, servis kilitleri ve beş görevin ulaşılabilirliği test edildi.

21 presetin her biri iki kez 240 simülasyon saniyesi çalıştırıldı: aynı girişte aynı sonuç, sonlu değerler, negatif olmayan miktarlar ve kapasite sınırları kontrol edildi. Rastgele ama tekrarlanabilir kontrol kombinasyonlarında eşzamanlı tüketim, transfer, trim, kaçak ve jettison ile ledger farkının `1e-5 kg` altında kaldığı doğrulandı.

## Tarayıcı kanıtı

- Testler dev sunucusu yerine üretim `dist/` dosyalarını `http://127.0.0.1:3128/aircraft-fuel-system-lab/` alt yolundan açtı.
- Ana sayfa JS/CSS/font/ikon yüklemelerinde HTTP hatası ve console/runtime hatası görülmedi.
- Pompa kapatma → sol feed kaybı → crossfeed ile sağdan besleme kontrol edildi.
- Tek pompa arızasında L2'nin 3000 kg/h talebi karşılaması doğrulandı.
- Tank transferinin kaynağı azaltıp hedefi artırması, kaçak miktarındaki fazladan azalma, quantity sensörünün donması ve jettison nozzlesın akışa göre görünmesi kontrol edildi.
- Tüm kaynaklar kapalıyken feed animasyonları sıfırlandı; pause miktarı/zamanı durdurdu, 20× hızda tüketim ilerledi.
- 12 deney paneli, 15 dersin üçer mini quiz sorusu, vurgulanmış deney bağlantısı ve 8 teşhis vakasının dörder gerekçesi doğrulandı.
- Final sınavındaki 60 sorunun tamamı yanıtlandı: 60/60 puan, sekmeler arasında yanıtların korunması, sonuç ekranı ve yeni sınav sıfırlaması doğrulandı.
- Görev puanlaması başarısız değerlendirme sonrası gerçek konfigürasyon değişikliğiyle tamamlandı.
- Klavyeyle parça seçimi, WHY açma/ESC ile kapatma, otomatik açıklamalar kapalıyken elle WHY ve teşhis sırasında cevabın gizli kalması test edildi.
- 390 px mobil / 768 px tablet görünümünde belge yatay taşması yok; pompa kontrolleri, deney, öğrenme ve sınava erişim çalışıyor. Küçük ekranda büyük şema kendi kutusunda yatay kaydırılabilir.
- 1440 px masaüstü, trim/CG sayfası ve mobil ekran görüntüleri gözle incelendi.

## GitHub Pages sınırı

Statik çıktı yaklaşık 1,2 MB; JS/CSS referansları `./assets/` biçiminde ve `.nojekyll` mevcut. Uygulama backend, haricî font servisi veya gizli değişken istemiyor.

`.github/workflows/pages.yml` model testleri, build, bağımlılık denetimi ve üretim tarayıcı testlerinden sonra `dist/` yayınlayacak şekilde hazırlandı. Bu rapor ilk yerel teslimin kanıtıdır; yayın öncesinde uzak GitHub deposu ve halka açık URL doğrulaması kapsam dışındaydı. Sonraki yayınların durumunu [GitHub Actions](https://github.com/muhammetarbag/aircraft-fuel-system-lab/actions) üzerinden, uygulamayı [GitHub Pages](https://muhammetarbag.github.io/aircraft-fuel-system-lab/) üzerinden kontrol edebilirsin.

Görseller ve fizik genel öğretim modelidir; gerçek uçak operasyonu/bakımı için doğrulama değildir. Ayrıntılı sınırlar uygulamanın Model & kaynaklar ekranında ve README.md dosyasında bulunur.
