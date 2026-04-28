# PawPassport - Kurulum ve Vercel Canlıya Alma Rehberi

## 1. "GEMINI_API_KEY" Nasıl Alınır?

Google'ın yapay zeka servisini kullanabilmek için izlemeniz gereken tek seferlik, çok kolay bir adımdır:

1. Tarayıcınızdan **Google AI Studio - API Key** platform sayfasına gidin.
2. Mevcut Google / Gmail hesabınızla giriş yapın.
3. Ekranda sol üst ya da orta kısımdaki **"Create API Key"** (API Anahtarı Oluştur) butonuna tıklayın.
4. Eğer sistem size proje sorarsa *"Create API key in new project"* (Yeni projede oluştur) seçeneğini işaretleyin.
5. `AIzaSy...` harfleriyle başlayan uzun bir metin/şifre oluşturulacak. Ekrandaki Copy (Kopyala) simgesine tıklayarak bu kodu alın.
   
İşte Vercel'de `GEMINI_API_KEY` olan kısma, **Value** değeri olarak yapıştıracağınız karakter dizisi budur.

---

## 2. Vercel İçin Canlıya Alma (Deploy) Adımları

Projenizde routing sorunlarını önlemek adına `vercel.json` dosyası ayarlanmıştır. Artık Vercel'e doğrudan yükleyebilirsiniz:

1. Yeni bir sekmede **Vercel**'e giriş yapın (Github ile bağlanın).
2. Sağ üstten **"Add New..." > "Project"** deyin.
3. PawPassport reponuzu (veyahut Github'a attığınız projeyi) bulup yanındaki **Import** butonuna tıklayın.
4. **Framework Preset** alanı otomatik olarak "Vite" seçilecektir, değiştirmeyin.
5. Biraz aşağıda **"Environment Variables"** bölümünü genişletin. Burası çok kritik, Firebase ve Gemini bağlantılarını burada tanımlayacağız!
6. Şu keyleri (anahtarları) sol tarafa, değerlerini sağ tarafa ekleyip tek tek **Add** yapın:
   - `GEMINI_API_KEY` → (Yukarıda Google'dan aldığınız anahtar)
   - `VITE_FIREBASE_API_KEY` → (Firebase Konsol > Proje Ayarlarından aldığınız web API key)
   - `VITE_FIREBASE_AUTH_DOMAIN` → (örn. pawpassport.firebaseapp.com)
   - `VITE_FIREBASE_PROJECT_ID` → (örn. pawpassport)
7. Son olarak **Deploy** butonuna basın! Saniyeler içinde projeyi kurup size canlı, paylaşılabilir URL'nizi (`https://proje-adi.vercel.app`) verecek.
