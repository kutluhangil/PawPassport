/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MinikGezgin v1.1.0 — Refactor & Feature Pack
*/

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Upload, 
  MapPin, 
  Download, 
  RefreshCw, 
  Loader2, 
  Plane, 
  Camera, 
  Plus, 
  Trash2, 
  Settings,
  X,
  Share2,
  Wand2,
  Music,
  VolumeX,
  Heart,
  Check,
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, query, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';

// Types & Components
import { Subject, Adventure, Toast, OperationType } from './types';
import Navigation from './components/Navigation';
import StyleSelector from './components/StyleSelector';
import AlbumCard from './components/AlbumCard';
import ToastContainer from './components/ToastContainer';
import { CardSkeleton, SubjectSkeleton } from './components/SkeletonLoader';
import CropModal from './components/CropModal';
import UserProfileModal from './components/UserProfileModal';
import { dict } from './translations';

// Helper: Save Blob
const saveAs = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  link.href = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof blob !== 'string') setTimeout(() => URL.revokeObjectURL(link.href), 100);
};

// Helper: Firestore Error
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    userId: auth.currentUser?.uid,
    operationType,
    path
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(errInfo.error);
}

// Lazy AI client
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured.');
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

const ASPECT_RATIOS = ["1:1", "9:16", "16:9", "3:4", "4:3"];
const RESOLUTIONS = ["1K", "2K"];

const TEMPLATE_IMAGES = [
  { id: '1', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop', location: 'Paris, France', template_description: 'A cute cat enjoying the view of the Eiffel Tower', aspect_ratio: '1:1' },
  { id: '2', imageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1935&auto=format&fit=crop', location: 'Tokyo, Japan', template_description: 'A dog in a traditional kimono walking through Shibuya', aspect_ratio: '9:16' },
  { id: '3', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1974&auto=format&fit=crop', location: 'New York, USA', template_description: 'A pet explorer in Times Square', aspect_ratio: '16:9' },
  { id: '4', imageUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=1988&auto=format&fit=crop', location: 'Venice, Italy', template_description: 'A pet on a gondola in the canals of Venice', aspect_ratio: '4:3' }
];

export default function App() {
  const [lang, setLang] = useState<'en' | 'tr'>('tr');
  const t = dict[lang];
  
  // App State
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('minikgezgin-subjects');
    return saved ? JSON.parse(saved) : [];
  });
  const [destinations, setDestinations] = useState<Adventure[]>(() => {
    const saved = localStorage.getItem('minikgezgin-destinations');
    return saved ? JSON.parse(saved) : [];
  });
  const [pastDestinations, setPastDestinations] = useState<Adventure[][]>([]);

  // Form State
  const [currentDestination, setCurrentDestination] = useState(() => localStorage.getItem('minikgezgin-draft-destination') || '');
  const [currentDescription, setCurrentDescription] = useState(() => localStorage.getItem('minikgezgin-draft-description') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('');
  const [seed, setSeed] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("9:16");
  const [selectedResolution, setSelectedResolution] = useState("1K");
  const [generateProgress, setGenerateProgress] = useState(0);

  // UI State
  const [hasStarted, setHasStarted] = useState(() => localStorage.getItem('minikgezgin-started') === 'true');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('minikgezgin-theme') as 'dark'|'light') || 'dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [bgAccent, setBgAccent] = useState('#D4AF37');

  // Album Filters & Management
  const [locationFilter, setLocationFilter] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState<'all' | 'favorites'>('all');
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic Background Effect
  useEffect(() => {
    if (!currentDestination) {
      setBgAccent('#D4AF37');
      return;
    }
    const dest = currentDestination.toLowerCase();
    if (dest.includes('mars') || dest.includes('desert') || dest.includes('pyramid')) setBgAccent('#ef4444');
    else if (dest.includes('ocean') || dest.includes('ice') || dest.includes('venice')) setBgAccent('#3b82f6');
    else if (dest.includes('forest') || dest.includes('park') || dest.includes('garden')) setBgAccent('#22c55e');
    else if (dest.includes('space') || dest.includes('cyberpunk')) setBgAccent('#a855f7');
    else setBgAccent('#D4AF37');
  }, [currentDestination]);

  // Theme Sync
  useEffect(() => {
    localStorage.setItem('minikgezgin-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Auth Sync
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email || '',
            ...(user.displayName ? { displayName: user.displayName } : {})
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    });
  }, []);

  // Data Persistence
  useEffect(() => {
    localStorage.setItem('minikgezgin-subjects', JSON.stringify(subjects));
    localStorage.setItem('minikgezgin-destinations', JSON.stringify(destinations));
    if (subjects.length > 0) {
      localStorage.setItem('minikgezgin-started', 'true');
    }
  }, [subjects, destinations]);

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      addToast('Failed to sign in', 'error');
    }
  };

  const handleLogout = () => signOut(auth);

  const generateAdventure = async (destination: string, description: string) => {
    if (subjects.length === 0) return;

    const newAdventure: Adventure = {
      id: Date.now().toString(),
      prompt: destination,
      description,
      loading: true,
      aspectRatio: selectedAspectRatio,
      subjectNames: subjects.map(s => s.name),
      subjectTypes: subjects.map(s => s.type)
    };

    setPastDestinations(p => [...p, destinations]);
    setDestinations(prev => [newAdventure, ...prev]);
    setIsGenerating(true);
    setGenerateProgress(0);

    const progressInterval = setInterval(() => {
      setGenerateProgress(prev => prev >= 95 ? prev : prev + Math.floor(Math.random() * 5) + 2);
    }, 500);

    try {
      const config = {
        imageConfig: {
          aspectRatio: selectedAspectRatio,
          imageSize: selectedResolution,
        },
        responseModalities: ['IMAGE', 'TEXT'],
      };

      const contents = [{
        role: 'user',
        parts: [
          ...subjects.map(s => ({ inlineData: { data: s.data, mimeType: s.mimeType } })),
          { text: `Place these subjects in a famous global location: ${destination}. Additional Details: ${description}. ${stylePreset ? `Style: ${stylePreset}` : ''}. Maintain strict subject consistency.` }
        ]
      }];

      const response = await getAI().models.generateContentStream({
        model: "gemini-3.1-flash-image-preview",
        config,
        contents,
      });

      let finalImageUrl = '';
      for await (const chunk of response) {
        const part = chunk.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
          finalImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      if (finalImageUrl) {
        setDestinations(prev => prev.map(adv => adv.id === newAdventure.id ? { ...adv, imageUrl: finalImageUrl, loading: false } : adv));
      } else {
        throw new Error("No image generated");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Generation failed";
      addToast(errorMessage, 'error');
      setDestinations(prev => prev.map(adv => adv.id === newAdventure.id ? { ...adv, loading: false, error: errorMessage } : adv));
    } finally {
      clearInterval(progressInterval);
      setGenerateProgress(100);
      setIsGenerating(false);
      setTimeout(() => setGenerateProgress(0), 1000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAlbumIds.length === 0) return;
    if (!confirm(`${selectedAlbumIds.length} item(s) will be deleted. Are you sure?`)) return;

    setDestinations(prev => prev.filter(d => !selectedAlbumIds.includes(d.id)));
    
    if (currentUser) {
      const batch = writeBatch(db);
      selectedAlbumIds.forEach(id => {
        batch.delete(doc(db, 'users', currentUser.uid, 'destinations', id));
      });
      await batch.commit();
    }
    
    setSelectedAlbumIds([]);
    setIsBulkMode(false);
    addToast("Items deleted successfully", "success");
  };

  const toggleSelectAll = () => {
    if (selectedAlbumIds.length === destinations.length) setSelectedAlbumIds([]);
    else setSelectedAlbumIds(destinations.map(d => d.id));
  };

  const filteredDestinations = useMemo(() => {
    return destinations.filter(d => {
      if (locationFilter && !d.prompt.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (historyViewMode === 'favorites' && !d.isFavorite) return false;
      return true;
    });
  }, [destinations, locationFilter, historyViewMode]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 bg-white dark:bg-[#0a0a0c] selection:bg-[${bgAccent}]/30 selection:text-[${bgAccent}]`}>
      <ToastContainer toasts={toasts} />
      
      {/* Dynamic Aura Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px] transition-colors duration-1000"
          style={{ backgroundColor: bgAccent }}
        />
        <div 
          className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[100px] transition-colors duration-1000"
          style={{ backgroundColor: bgAccent }}
        />
      </div>

      <Navigation 
        t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} 
        currentUser={currentUser} hasStarted={hasStarted} setHasStarted={setHasStarted} 
        onLogin={handleLogin} onShowAbout={() => setShowAboutModal(true)}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pb-20 pt-8">
        {!hasStarted ? (
          <div className="relative z-10 py-10 md:py-20">
            <div className="text-center max-w-4xl mx-auto mb-20">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md mb-8">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">{t.poweredBy}</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-5xl md:text-8xl font-display font-light leading-tight tracking-tight mb-8"
              >
                {t.title.split(',')[0]}<br/><span className="text-[#D4AF37] italic" style={{ fontFamily: 'Georgia, serif' }}>{t.title.split(',')[1] || ''}</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-lg md:text-xl font-sans text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12"
              >
                {t.subtitle}
              </motion.p>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setHasStarted(true)}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-lg rounded-full hover:scale-105 transition-all duration-300 shadow-xl"
                >
                  <span>{t.startBtn}</span>
                  <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </button>
              </motion.div>
            </div>

            {/* Gallery Demo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-32">
              {TEMPLATE_IMAGES.map((img, idx) => (
                <motion.div 
                  key={img.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 premium-frame ${idx % 2 !== 0 ? 'md:mt-12' : ''}`}
                >
                  <div className="premium-frame-content relative group">
                    <img src={img.imageUrl} alt={img.location} className="w-full h-full object-cover aspect-[3/4] opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <p className="font-display text-xl text-white">{img.location}</p>
                      <p className="font-sans text-xs text-[#D4AF37]">{img.template_description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* How it works */}
            <div className="max-w-4xl mx-auto space-y-16 py-20 border-t border-black/5 dark:border-white/5">
              <h2 className="text-4xl md:text-5xl font-display text-center dark:text-white">
                How it <span className="italic text-[#D4AF37]">works</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-12">
                {[
                  { step: '01', title: t.step1, desc: t.step1Desc },
                  { step: '02', title: t.step2, desc: t.step2Desc },
                  { step: '03', title: t.step3, desc: t.step3Desc }
                ].map((item) => (
                  <div key={item.step} className="text-center space-y-4">
                    <span className="text-6xl font-display text-[#D4AF37]/20 block">{item.step}</span>
                    <h3 className="text-xl font-bold dark:text-white uppercase tracking-wider">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column: Studio */}
            <div className="lg:col-span-4 space-y-8">
              <div className="glass-panel p-6 rounded-3xl shadow-xl border border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display text-gray-900 dark:text-white">{t.uploadSubjects}</h2>
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="p-2 rounded-full bg-[#D4AF37] text-gray-900 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <input id="file-upload" type="file" multiple className="hidden" onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        setSubjects(prev => [...prev, {
                          id: Date.now().toString() + Math.random(),
                          name: `Pet ${prev.length + 1}`,
                          type: 'character',
                          data: base64.split(',')[1],
                          mimeType: file.type,
                          url: base64
                        }]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }} />
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {subjects.length === 0 ? <div className="text-center py-10 text-gray-400 italic">No subjects added yet</div> : subjects.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-2xl group border border-transparent hover:border-[#D4AF37]/30 transition-all">
                      <img src={s.url} className="w-12 h-12 rounded-lg object-cover" />
                      <input 
                        value={s.name} 
                        onChange={(e) => setSubjects(prev => prev.map(sub => sub.id === s.id ? {...sub, name: e.target.value} : sub))}
                        className="flex-1 bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
                      />
                      <button onClick={() => setSubjects(prev => prev.filter(sub => sub.id !== s.id))} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Generation */}
            <div className="lg:col-span-8 space-y-8">
              <div className="glass-panel p-8 rounded-3xl shadow-xl border border-black/10 dark:border-white/10 relative overflow-hidden">
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center"
                    >
                      <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mb-6" />
                      <h3 className="text-2xl font-display text-gray-900 dark:text-white mb-2">{t.generatingSnap} {currentDestination}</h3>
                      <div className="w-full max-w-md h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-[#D4AF37]" style={{ width: `${generateProgress}%` }} />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">{generateProgress}%</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#D4AF37]/10 rounded-2xl">
                      <MapPin className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">{t.destination}</label>
                      <input 
                        value={currentDestination}
                        onChange={(e) => setCurrentDestination(e.target.value)}
                        placeholder={t.destinationPlaceholder}
                        className="w-full bg-transparent text-2xl font-display text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-300 dark:placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  <StyleSelector selectedStyle={stylePreset} onSelectStyle={setStylePreset} t={t} />

                  <div className="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#D4AF37] transition-colors flex items-center gap-1 cursor-pointer">
                        {showAdvanced ? t.hideAdvancedSettings : t.showAdvancedSettings} <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <button 
                      onClick={() => generateAdventure(currentDestination, currentDescription)}
                      disabled={!currentDestination || subjects.length === 0 || isGenerating}
                      className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5" /> {t.genBtn}
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.aspectRatio}</label>
                            <select value={selectedAspectRatio} onChange={(e) => setSelectedAspectRatio(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none">
                              {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.resolution}</label>
                            <select value={selectedResolution} onChange={(e) => setSelectedResolution(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none">
                              {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Album Section */}
        {destinations.length > 0 && (
          <div className="mt-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <div>
                <h2 className="text-4xl font-display text-gray-900 dark:text-white mb-2">{t.album}</h2>
                <p className="text-gray-500 text-sm">You have captured {destinations.length} memories</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    placeholder={t.filterByLocation} 
                    value={locationFilter} 
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" 
                  />
                </div>
                <button 
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className={`p-2 rounded-full border transition-all cursor-pointer ${isBulkMode ? 'bg-[#D4AF37] border-[#D4AF37] text-gray-900' : 'border-black/10 dark:border-white/10 text-gray-500'}`}
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isBulkMode && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center justify-between p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl mb-6">
                  <div className="flex items-center gap-4">
                    <button onClick={toggleSelectAll} className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer">
                      {selectedAlbumIds.length === destinations.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      {selectedAlbumIds.length} Selected
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleBulkDelete} disabled={selectedAlbumIds.length === 0} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 cursor-pointer">
                      Delete Selected
                    </button>
                    <button onClick={() => { setIsBulkMode(false); setSelectedAlbumIds([]); }} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg text-sm font-bold cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredDestinations.map(dest => (
                <div key={dest.id} className="relative">
                  {isBulkMode && (
                    <button 
                      onClick={() => setSelectedAlbumIds(prev => prev.includes(dest.id) ? prev.filter(id => id !== dest.id) : [...prev, dest.id])}
                      className="absolute top-4 left-4 z-30 p-1 rounded bg-white shadow-lg text-gray-900 cursor-pointer"
                    >
                      {selectedAlbumIds.includes(dest.id) ? <CheckSquare className="w-6 h-6 text-[#D4AF37]" /> : <Square className="w-6 h-6" />}
                    </button>
                  )}
                  {dest.loading ? <CardSkeleton /> : (
                    <AlbumCard 
                      dest={dest} 
                      t={t}
                      onFavorite={() => setDestinations(prev => prev.map(d => d.id === dest.id ? {...d, isFavorite: !d.isFavorite} : d))}
                      onDelete={(id) => setDestinations(prev => prev.filter(d => d.id !== id))}
                      onDownload={(url, name) => saveAs(url, name)}
                      onShare={(d) => addToast("Sharing coming soon!", "success")}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-10 border-t border-black/5 dark:border-white/5 text-center text-gray-400 text-xs">
        <p>© 2026 MinikGezgin • {t.poweredBy}</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={toggleMusic} className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:text-[#D4AF37] transition-colors cursor-pointer">
            {isMusicPlaying ? <Music className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <audio ref={audioRef} loop src="https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3" />
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel p-8 w-full max-w-2xl rounded-3xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowAboutModal(false)} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-display text-gray-900 dark:text-white mb-6">About MinikGezgin</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                {t.aboutText1}
                <br/><br/>
                {t.aboutText2}
              </p>
              <div className="mt-8 flex justify-end">
                <button onClick={() => setShowAboutModal(false)} className="px-8 py-3 bg-[#D4AF37] text-gray-900 rounded-xl font-bold cursor-pointer hover:scale-105 transition-transform">{t.close}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
