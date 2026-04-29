<div align="center">

```
███╗   ███╗██╗███╗   ██╗██╗██╗  ██╗ ██████╗ ███████╗███████╗ ██████╗ ██╗███╗   ██╗
████╗ ████║██║████╗  ██║██║██║ ██╔╝██╔════╝ ██╔════╝╚══███╔╝██╔════╝ ██║████╗  ██║
██╔████╔██║██║██╔██╗ ██║██║█████╔╝ ██║  ███╗█████╗    ███╔╝ ██║  ███╗██║██╔██╗ ██║
██║╚██╔╝██║██║██║╚██╗██║██║██╔═██╗ ██║   ██║██╔══╝   ███╔╝  ██║   ██║██║██║╚██╗██║
██║ ╚═╝ ██║██║██║ ╚████║██║██║  ██╗╚██████╔╝███████╗███████╗╚██████╔╝██║██║ ╚████║
╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝
```

### Your Pet's AI-Powered Passport to the World 🐾

*Evcil hayvanlarınızı yapay zeka gücüyle dünyanın her köşesine taşıyın — tek fotoğrafla.*

---

[![Version](https://img.shields.io/badge/version-1.0.0-D4AF37?style=flat-square&labelColor=0A0A0B)](https://github.com/kutluhangil/MinikGezgin)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0A0A0B)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black&labelColor=0A0A0B)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=0A0A0B)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black&labelColor=0A0A0B)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-3.1_Flash_Image-4285F4?style=flat-square&logo=google&logoColor=white&labelColor=0A0A0B)](https://ai.google.dev/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-white?style=flat-square&logo=vercel&logoColor=black&labelColor=0A0A0B)](https://minik-gezgin.vercel.app/)
[![License: MIT](https://img.shields.io/badge/license-MIT-D4AF37?style=flat-square&labelColor=0A0A0B)](LICENSE)

---

**[🌐 Live Demo](https://minik-gezgin.vercel.app/)**

</div>

---

## What is MinikGezgin?

<details open>
<summary><strong>Türkçe Açıklama</strong></summary>
<br>

MinikGezgin, evcil hayvanlarınızın fotoğraflarını yapay zeka ile dünya genelindeki ikonik mekânlara yerleştiren bir seyahat albümü uygulamasıdır. Tek bir fotoğraf yükleyin, hedef belirleyin — gerisini Gemini halleder.

**Neden MinikGezgin?** Bahçeyi hiç terk etmeden Machu Picchu'ya tırmanan, Venedik'te gondolda sallanan ya da Mars'ta yürüyen evcil hayvanınızın fotoğrafını saniyeler içinde elde edin.

</details>
<br>

**MinikGezgin** is an AI-powered travel album studio that transforms ordinary pet photos into breathtaking, photorealistic travel memories. Upload a photo of your pet (or any subject), pick a destination anywhere on Earth — or beyond — and let **Gemini 3.1 Flash Image** render a stunning composite scene in seconds.

Built for pet owners, creators, and anyone who believes adventure should have no limits.

---

## Features

| # | Feature | Description |
|---|---------|-------------|
| 🤖 | **AI Image Generation** | Powered by Gemini 3.1 Flash Image — photorealistic composites from a single upload |
| 🌍 | **Infinite Destinations** | Type any location, scene, or concept — from the Colosseum to a cyberpunk city |
| 💡 | **AI Inspiration Engine** | Generate creative travel ideas tailored to your pet's name and style |
| 🖼️ | **Travel Album** | Auto-saved gallery with filters, favorites, sorting, and export |
| 🎨 | **Image Filters & FX** | Apply Vintage, Retro, Grayscale filters and Parallax/Shimmer animations |
| 🌗 | **Dark & Light Mode** | Premium warm-cream light mode and deep-space dark mode |
| 🌐 | **Bilingual UI** | Full Turkish and English interface — switch instantly |
| 👤 | **Google Auth** | Sign in with Google to sync your album across devices via Firebase |
| 📤 | **Export & Share** | Download individual stamps or bulk-export your full album as a ZIP |
| 📱 | **Mobile-First** | Fully responsive — works beautifully on phones, tablets, and desktops |
| 🎯 | **Guided Onboarding** | Interactive step-by-step tour for first-time users |

---

## Tech Stack

```
Frontend & UI
├── React 18          (Functional Components, Hooks, AnimatePresence)
├── TypeScript        (strict mode)
├── Tailwind CSS v4   (Custom design tokens, dark/light mode)
├── Framer Motion     (Page transitions and micro-animations)
├── Lucide React      (Icon system)
└── Vite 5            (Fast build & HMR)

AI & Generation
├── Google Generative AI  (@google/genai — Gemini 3.1 Flash Image)
├── Text-to-Image         (Subject-aware compositional rendering)
└── AI Suggestion Engine  (Dynamic idea generation per pet)

Auth & Backend
├── Firebase Auth         (Google Sign-In)
├── Cloud Firestore       (User profiles, saved destinations, favorites)
└── Firebase Storage      (Profile assets)

Deployment
├── Vercel                (CI/CD, edge deployment)
└── GitHub Actions        (Automated deploys on push)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                       │
│       (React, Landing Page, Studio, Album, Modals)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     App State Layer                         │
│   (useState, useEffect, localStorage, Firebase sync)        │
│                                                             │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ Subject Mgmt  │  │  Destination   │  │  Album Store  │  │
│  │ (Upload/Crop) │  │  (Prompt+Desc) │  │ (Filter/Sort) │  │
│  └───────────────┘  └────────────────┘  └───────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────▼──────┐  ┌─────────▼──────┐  ┌────────▼───────┐
│   Gemini API   │  │  Firebase Auth │  │   Firestore    │
│ (Image+Ideas)  │  │ (Google OAuth) │  │ (User + Album) │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

## Getting Started

### Requirements

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey) *(Paid project required for image generation)*
- **Firebase Project** — [Create one here](https://console.firebase.google.com/)

### Local Development

```bash
# Clone the repository
git clone https://github.com/kutluhangil/MinikGezgin.git
cd MinikGezgin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your API keys (see below)

# Start the development server
npm run dev
```

App runs at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the project root:

```env
# Gemini AI — Required for image generation
# NOTE: Image generation requires a PAID Google Cloud project!
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase — Required for Auth and Firestore
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Deployment on Vercel

Vercel is the fastest way to deploy MinikGezgin. Follow these steps:

### Step 1 — Push to GitHub
Ensure your project is pushed to a GitHub repository (public or private).

### Step 2 — Import to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New" → "Project"**.
3. Select your `MinikGezgin` repository and click **"Import"**.

### Step 3 — Configure Environment Variables
In the **"Environment Variables"** section, add all variables from your `.env` file:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

### Step 4 — Deploy
Click **"Deploy"**. Vercel will build and publish your app in ~1–2 minutes.

### Step 5 — Authorize Domain in Firebase
Go to **Firebase Console → Authentication → Settings → Authorized Domains** and add your Vercel URL (e.g., `minik-gezgin.vercel.app`).

### Continuous Deployment
Every `git push` to `main` will automatically trigger a new Vercel deployment. No manual steps needed.

---

## Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → **Google Sign-In**
3. Enable **Cloud Firestore** (start in production mode, then apply rules)
4. Register a **Web App** and copy the config values to your `.env`

### Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## License

This project is distributed under the [MIT License](LICENSE).

---

<div align="center">

**Built with care by [kutluhangil](https://github.com/kutluhangil/)**

*Where code meets wanderlust. 🐾✈️*

[![GitHub](https://img.shields.io/badge/GitHub-kutluhangil-D4AF37?style=flat-square&logo=github&logoColor=white&labelColor=0A0A0B)](https://github.com/kutluhangil)
[![Live](https://img.shields.io/badge/Live-minik--gezgin.vercel.app-D4AF37?style=flat-square&logo=vercel&logoColor=white&labelColor=0A0A0B)](https://minik-gezgin.vercel.app/)

</div>
