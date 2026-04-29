<div align="center">

```
 /\_____/\
(  🐱  🐱 )    M i n i k   G e z g i n
 ( o   o )   ~~~~~~~~~~~~~~~~~~~~~~~~
  =( Y )=    Küçük Patilerle Büyük Maceralar
   )   (
  (_)-(_)
```

### 🐾 Küçük Patilerle Büyük Maceralar

*Evcil hayvanlarınızın günlük fotoğraflarını nefes kesici seyahat anılarına dönüştürün. AI ile.*

---

[![Version](https://img.shields.io/badge/version-1.0.0-C8FF00?style=flat-square&labelColor=0A0A0B)](https://github.com/kutluhangil/MinikGezgin)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0A0A0B)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-white?style=flat-square&logo=react&logoColor=white&labelColor=0A0A0B)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white&labelColor=0A0A0B)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_DB-FFCA28?style=flat-square&logo=firebase&logoColor=black&labelColor=0A0A0B)](https://firebase.google.com/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-AI-4285F4?style=flat-square&logo=google&logoColor=white&labelColor=0A0A0B)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/license-MIT-C8FF00?style=flat-square&labelColor=0A0A0B)](LICENSE)

---

[**Uygulamaya Git**](https://freelora.app) · [**Hata Bildir**](https://github.com/kutluhangil/MinikGezgin/issues) · [**Özellik İste**](https://github.com/kutluhangil/MinikGezgin/issues/new)

</div>

---

## MinikGezgin Nedir?

<details open>
<summary><strong>Türkçe Açıklama</strong></summary>
<br>

MinikGezgin 🐾, evcil hayvanlarınızın günlük fotoğraflarını nefes kesici seyahat anılarına dönüştürmenizi sağlayan bir yapay zeka web uygulamasıdır. Google'ın güçlü **Gemini Flash Image** modelini kullanarak, evcil hayvanlarınızı Paris'ten Mars'a kadar hayal edebileceğiniz her yere gönderebilirsiniz.

**Neden MinikGezgin?**
- Evden çıkmadan dünyanın her yerinde (ve uzayda!) fotoğraflar oluşturun
- Kendi evcil hayvanlarınızı (Pet) ve eşyalarınızı (Object) sisteme tanıtın
- Yapay zeka ile mükemmel aydınlatma, gölgelendirme ve arka plana uyum
- Seyahat albümünüzü oluşturun, paylaşın veya PDF / ZIP olarak dışa aktarın

</details>

MinikGezgin 🐾 is an AI-powered web application that lets you transform everyday photos of your pets into breathtaking travel memories. Powered by Google's **Gemini Flash Image** model, you can send your pets anywhere—from Paris to Mars.

---

## Özellikler

| # | Özellik | Açıklama |
|---|---------|----------|
| 🐈 | **Karakter ve Nesne Ekleme** | Evcil hayvanlarınızın ve eşyalarınızın fotoğraflarını yükleyerek yapay zekaya tanıtın. |
| 🌍 | **Sonsuz Hedef Seçeneği** | Dilediğiniz mekanı ve atmosferi (örn. "Eyfel Kulesi", "Tokyo Sokakları") belirterek eşsiz görseller üretin. |
| 🎨 | **Stil Şablonları & Ayarlar** | Cinematic, Cyberpunk, Watercolor gibi stil filtreleri, Çözünürlük ve Aspect Ratio (1:1, 16:9 vs.) ayarı. |
| 🎞️ | **Filtre ve Animasyonlar** | Oluşturulan resimlere Sepia, B&W (Siyah Beyaz) ve Vintage gibi filtreler; Parallax, Shimmer gibi animasyonlar ekleyin. |
| 📖 | **Seyahat Albümü** | Yaratılan tüm anıları kendi dijital albümünüzde toplayın, dilediklerinizi favorilere ekleyin. |
| 📦 | **Dışa Aktarma (Export)** | Oluşturduğunuz dijital pasaport anılarınızı tek tıkla PDF veya ZIP formatında indirin, dilerseniz PNG/JPEG indirin. |
| ✨ | **Gemini AI Altyapısı** | `@google/genai` ile güçlü istem oluşturma ve kusursuz görüntü harmanlama yetenekleri. |
| 🌍 | **Çoklu Dil** | Türkçe (TR) ve İngilizce (EN) arayüz desteği. |
| 🔐 | **Cloud Storage & Auth** | Firebase desteğiyle resimlerinizi ve albümünüzü güvenle bulutta saklayın. |
| 📱 | **Responsive** | Masaüstü cihazlar ve modern mobil cihazlar için optimize edilmiş akıcı arayüz. |

---

## Ekran Görüntüleri

> `public/og.png` oluşturulduktan sonra buraya gerçek ekran görüntüleri eklenecek.

| Stüdyo | Seyahat Albümü | Gelişmiş Ayarlar |
|-----------|-----------|----------|
| *(yakında)* | *(yakında)* | *(yakında)* |

---

## Teknoloji Yığını

```
Frontend & Core
├── React 19
├── TypeScript 5 (strict mode)
├── Tailwind CSS 4.0 
├── Vite 6
├── Framer Motion 12 (Motion/React - animasyonlar)
└── Lucide React (İkonlar)

AI & Image Generation
├── @google/genai (Gemini 3.1 Flash Image)
└── HTML5 Canvas API (İstemci tabanlı görsel süreçler)

Data, Auth & Backend Services
├── Firebase Auth (Kimlik doğrulama)
├── Firebase Client (Firestore/Storage veritabanı eşitlemeleri)
├── JSZip / FileSaver.js (Albüm dışa aktarımı)
└── jsPDF (PDF export)

Infrastructure
├── Google Cloud Run (Hosting)
└── AI Studio Build Environment
```

---

## Kurulum ve Başlangıç

### Gereksinimler

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Firebase** projesi (Auth ve Firestore için)
- **Gemini API Anahtarı** (Resim oluşturabilmek için)

### Yerel Geliştirme

```bash
# Repoyu klonla
git clone https://github.com/kutluhangil/MinikGezgin.git
cd MinikGezgin

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env.local
# .env.local dosyasına değişkenlerini ekle (Firebase ve Gemini API Key)

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

---

## Ortam Değişkenleri

Uygulamanın çalışması için aşağıdaki anahtarları ortamınıza tanımlamanız gerekir:

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | ✅ (kaydetme işlemleri için) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | ✅ |
| `GEMINI_API_KEY` | Gemini AI (Google Gen AI) anahtarı | ✅ |

*(Not: Ortamınızda kendi Firebase ayarlarınız ve API anahtarınızı yapılandırmayı unutmayın.)*

---

## Yol Haritası

### v1.0 — MVP ✅

- [x] Karakter ve nesne yükleme
- [x] AI Görüntü üretimi (Gemini API entegrasyonu)
- [x] Stüdyo araçları (en/boy oranı, çözünürlük ayarı)
- [x] Görüntülere stil ve filtre ekleme
- [x] Seyahat Albümü panosu ve favoriler
- [x] Albümü ZIP veya PDF olarak Dışa Aktarma
- [x] Firebase (Auth ve Cloud Storage)
- [x] Türkçe (TR) ve İngilizce (EN) çoklu dil desteği
- [x] X/Twitter paylaşımı
- [x] Akıllı asistan ipucu butonu ve Onboarding (Joyride)

### v1.1 — Yakında

- [ ] Sosyal Feed Akışı — Kullanıcıların en iyi maceralarını oylarıyla paylaştığı global akış.
- [ ] Özel arka plan silici araç entegrasyonu
- [ ] Mükemmel post-prodüksiyon ayarları (Pozlama, doygunluk)
- [ ] Otomatik "Travel VLOG" video slaytları oluşturma (Video Gen)

---

## Katkıda Bulunma

1. Bu repoyu fork'la
2. Feature branch oluştur: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerini commit et: `git commit -m 'feat: yeni özellik ekle'`
4. Branch'ini push et: `git push origin feature/yeni-ozellik`
5. Pull Request aç

Lütfen kodunuzu `npm run lint` testlerine tabi tuttuğunuzdan ve genel mimari yapıya uygun (Vite/TS/React 19) değişiklikler yaptığınızdan emin olun. 

---

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında dağıtılmaktadır.

---

<div align="center">

🐾 **Built with love by [kutluhangil](https://github.com/kutluhangil/MinikGezgin)** 🐾

*Minik patilerin büyük maceraları için yapıldı.*

[![GitHub](https://img.shields.io/badge/GitHub-kutluhangil-C8FF00?style=flat-square&logo=github&logoColor=white&labelColor=0A0A0B)](https://github.com/kutluhangil/MinikGezgin)

</div>
