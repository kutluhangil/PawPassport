/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Upload, 
  Image as ImageIcon, 
  MapPin, 
  Download, 
  RefreshCw, 
  Loader2, 
  Plane, 
  Camera, 
  Plus, 
  Trash2, 
  Settings,
  Info,
  ChevronDown,
  AlertCircle,
  X,
  Share2,
  Wand2,
  Music,
  VolumeX,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Joyride, STATUS, Step } from 'react-joyride';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, query, onSnapshot, deleteDoc } from 'firebase/firestore';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type Subject = {
  id: string;
  name: string;
  type: 'character' | 'object';
  objectCategory?: string;
  data: string;
  mimeType: string;
  url: string;
  isSaved?: boolean;
};

type Adventure = {
  id: string;
  prompt: string;
  description: string;
  imageUrl?: string;
  loading: boolean;
  error?: string;
  aspectRatio: string;
  isFavorite?: boolean;
};

type Toast = {
  id: string;
  message: string;
  type: 'error' | 'success';
};

const ASPECT_RATIOS = [
  "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "4:1", "1:4", "8:1", "1:8"
];

const RESOLUTIONS = ["512px", "1K", "2K", "4K"];

const CATEGORIZED_SUGGESTIONS = {
  "Adventure": [
    "My pet hiking the Inca Trail to Machu Picchu.",
    "My pet surfing the giant waves in Nazaré, Portugal.",
    "My pet hot air ballooning over Cappadocia, Turkey.",
    "My pet riding a gondola in Venice, Italy."
  ],
  "Historical": [
    "My pet exploring the ruins of the Colosseum in Rome.",
    "My pet sitting grandly in front of the Taj Mahal.",
    "My pet walking along the Great Wall of China.",
    "My pet discovering the ancient pyramids of Giza."
  ],
  "Sci-Fi & Space": [
    "My pet walking on the surface of Mars in a tiny spacesuit.",
    "My pet driving a futuristic flying car in a cyberpunk city.",
    "My pet floating in zero gravity aboard the International Space Station."
  ],
  "Chill Vibes": [
    "My pet relaxing in a hammock on a pristine beach in the Maldives.",
    "My pet enjoying a pastry at a quaint cafe in Paris.",
    "My pet meditating in a zen garden in Kyoto."
  ]
};

const staticFilesUrl = 'https://www.gstatic.com/aistudio/starter-apps/pet_passport/';

interface TemplateImage {
  id: string;
  imageUrl: string;
  location: string;
  template_description: string;
  aspect_ratio: string;
}

const TEMPLATE_IMAGES: TemplateImage[] = [
  {
    id: '1',
    imageUrl: staticFilesUrl + 'example_snoo.png',
    location: "Durdle Door, Dorset",
    template_description: "Snoo wearing sunglasses",
    aspect_ratio: "3:4"
  },
  {
    id: '2',
    imageUrl: staticFilesUrl + 'example_nigel.png',
    location: "Lapland, Finland",
    template_description: "Nigel with a christmas hat and scarf",
    aspect_ratio: "3:4"
  },
  {
    id: '3',
    imageUrl: staticFilesUrl + 'example_multi.png',
    location: "Richmond Park, London",
    template_description: "Nigel and Dougie enjoying a picnic",
    aspect_ratio: "3:4"
  },
];

export default function App() {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('pawpassport-subjects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [destinations, setDestinations] = useState<Adventure[]>(() => {
    const saved = localStorage.getItem('pawpassport-destinations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [currentDestination, setCurrentDestination] = useState(() => localStorage.getItem('pawpassport-draft-destination') || '');
  const [currentDescription, setCurrentDescription] = useState(() => localStorage.getItem('pawpassport-draft-description') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('');
  const [seed, setSeed] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'passport'>('grid');
  const [hasStarted, setHasStarted] = useState(() => {
    return localStorage.getItem('pawpassport-started') === 'true';
  });
  
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName
        }, { merge: true });
      }
    });
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      addToast('Failed to sign in', 'error');
    }
  };

  const handleLogout = () => signOut(auth);

  const [runTour, setRunTour] = useState(() => {
    return localStorage.getItem('pawpassport-tour-seen') !== 'true';
  });

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Drafts
  useEffect(() => {
    localStorage.setItem('pawpassport-draft-destination', currentDestination);
  }, [currentDestination]);

  useEffect(() => {
    localStorage.setItem('pawpassport-draft-description', currentDescription);
  }, [currentDescription]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('pawpassport-tour-seen', 'true');
    }
  };

  const tourSteps: Step[] = [
    {
      target: 'body',
      content: 'Welcome to PawPassport! Send your pets on a global adventure with stunning AI-generated photos.',
      placement: 'center',
    },
    {
      target: '.tour-step-upload',
      content: 'Upload clear photos of your pets or objects. Ensure good lighting and a visible subject!',
    },
    {
      target: '.tour-step-destination',
      content: 'Enter a famous global location where you want your pet to travel.',
    },
    {
      target: '.tour-step-ai-ideas',
      content: 'Stuck? Let our AI suggest some creative travel ideas based on your pet and destination.',
    },
    {
      target: '.tour-step-advanced',
      content: 'Want more control? Configure aspect ratio, stylistic presets, or add negative prompts here.',
    },
    {
      target: '.tour-step-generate',
      content: 'Click here to capture the moment!',
    }
  ];

  const handleExportZip = async () => {
    if (destinations.length === 0) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      const loadedDests = destinations.filter(d => d.imageUrl && !d.loading);
      for (let i = 0; i < loadedDests.length; i++) {
        const dest = loadedDests[i];
        if (!dest.imageUrl) continue;
        const response = await fetch(dest.imageUrl);
        const blob = await response.blob();
        
        let filename = dest.prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        if (filename.length > 50) filename = filename.substring(0, 50);
        
        zip.file(`${filename}_${dest.id}.jpg`, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'pawpassport_album.zip');
      addToast('Travel album downloaded!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to export travel album.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const [sharingDestination, setSharingDestination] = useState<Adventure | null>(null);

  const filteredDestinations = destinations.filter(d => {
    if (locationFilter && !d.prompt.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (dateFilter === 'today') {
      return new Date(parseInt(d.id)).toDateString() === new Date().toDateString();
    }
    if (dateFilter === 'week') {
      return new Date(parseInt(d.id)) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    return true;
  });

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

  const generateSuggestions = async () => {
    if (subjects.length === 0) {
      addToast("Upload a pet or object first to get tailored suggestions!", "error");
      return;
    }
    setIsGeneratingSuggestions(true);
    try {
      const keySelected = await (window as any).aistudio?.hasSelectedApiKey();
      if (!keySelected) {
        setShowKeyDialog(true);
        setIsGeneratingSuggestions(false);
        return;
      }

      const pets = subjects.filter(s => s.type === 'character').map(s => s.name).join(', ') || 'a pet';
      const objects = subjects.filter(s => s.type === 'object').map(s => s.name).join(', ') || 'some items';
      let promptText = `Generate exactly 4 creative and varied travel destination prompt ideas focused on ${pets} traveling, maybe with ${objects}. Make them exciting and short (1 sentence each).`;
      if (currentDestination) {
        promptText += ` Focus around the destination: ${currentDestination}.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText
      });
      const text = response.text || "";
      const ideas = text.split('\n').map(l => l.replace(/^[-*\d.\s]+/, '').trim()).filter(l => l.length > 5).slice(0, 4);
      if (ideas.length > 0) setDynamicSuggestions(ideas);
    } catch(e) {
      addToast("Couldn't generate ideas. Try again later.", "error");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  
  // Save to localStorage effects
  useEffect(() => {
    localStorage.setItem('pawpassport-subjects', JSON.stringify(subjects));
    if (subjects.length > 0) {
      localStorage.setItem('pawpassport-started', 'true');
      setHasStarted(true);
    }
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('pawpassport-destinations', JSON.stringify(destinations));
  }, [destinations]);
  
  // Config state
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("9:16");
  const [selectedResolution, setSelectedResolution] = useState("1K");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'character' | 'object'>('character');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addToast("Please upload a valid image file (.png, .jpg, .jpeg, or .webp)", 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      
      const newSubject: Subject = {
        id: Date.now().toString(),
        name: uploadType === 'character' ? `Pet ${subjects.filter(s => s.type === 'character').length + 1}` : `Object ${subjects.filter(s => s.type === 'object').length + 1}`,
        type: uploadType,
        data: base64Data,
        mimeType: file.type,
        url: base64String
      };

      setSubjects(prev => [...prev, newSubject]);
      setHasStarted(true);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const removeSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const toggleSaveSubject = async (subject: Subject) => {
    if (!currentUser) return addToast("Please sign in to save subjects!", "error");
    try {
      if (subject.isSaved) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'subjects', subject.id));
        setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, isSaved: false } : s));
      } else {
        await setDoc(doc(db, 'users', currentUser.uid, 'subjects', subject.id), {
          userId: currentUser.uid,
          name: subject.name,
          type: subject.type,
          objectCategory: subject.objectCategory || '',
          url: subject.url
        });
        setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, isSaved: true } : s));
        addToast("Subject saved to profile!", "success");
      }
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const toggleFavoriteDestination = async (dest: Adventure) => {
    if (!currentUser) return addToast("Please sign in to save favorites!", "error");
    try {
      if (dest.isFavorite) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'destinations', dest.id));
        setDestinations(prev => prev.map(d => d.id === dest.id ? { ...d, isFavorite: false } : d));
      } else {
        await setDoc(doc(db, 'users', currentUser.uid, 'destinations', dest.id), {
          userId: currentUser.uid,
          destination: dest.prompt,
          description: dest.description || '',
          imageUrl: dest.imageUrl,
          createdAt: parseInt(dest.id),
          isFavorite: true
        });
        setDestinations(prev => prev.map(d => d.id === dest.id ? { ...d, isFavorite: true } : d));
        addToast("Destination saved to profile!", "success");
      }
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  // Sync profile when logged in
  useEffect(() => {
    if (!currentUser) return;
    
    // Sync subjects
    const unsubSub = onSnapshot(query(collection(db, 'users', currentUser.uid, 'subjects')), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setSubjects(prev => {
            if (prev.find(s => s.id === change.doc.id)) return prev.map(s => s.id === change.doc.id ? { ...s, isSaved: true } : s);
            return [...prev, { id: change.doc.id, name: data.name, type: data.type, objectCategory: data.objectCategory, data: '', mimeType: 'image/png', url: data.url, isSaved: true }];
          });
        }
      });
    });

    // Sync destinations
    const unsubDest = onSnapshot(query(collection(db, 'users', currentUser.uid, 'destinations')), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setDestinations(prev => {
            if (prev.find(d => d.id === change.doc.id)) return prev.map(d => d.id === change.doc.id ? { ...d, isFavorite: true } : d);
            return [...prev, { id: change.doc.id, prompt: data.destination, description: data.description, imageUrl: data.imageUrl, loading: false, aspectRatio: '9:16', isFavorite: true }];
          });
        }
      });
    });

    return () => {
      unsubSub();
      unsubDest();
    }
  }, [currentUser]);

  const updateSubjectName = (id: string, name: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const updateSubjectType = (id: string, type: 'character' | 'object') => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, type, objectCategory: type === 'object' ? 'Toy' : undefined, name: type === 'character' ? s.name : '' } : s));
  };
  
  const updateSubjectCategory = (id: string, objectCategory: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, objectCategory } : s));
  };

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const generateAdventure = async (destination: string, description: string) => {
    if (subjects.length === 0) return;

    const newAdventure: Adventure = {
      id: Date.now().toString(),
      prompt: destination,
      description,
      loading: true,
      aspectRatio: selectedAspectRatio,
    };

    setDestinations(prev => [newAdventure, ...prev]);
    setIsGenerating(true);

    try {
      // Final key check before spending tokens
      const keySelected = await (window as any).aistudio?.hasSelectedApiKey();
      if (!keySelected) {
        setShowKeyDialog(true);
        return;
      }

      const config = {
        imageConfig: {
          aspectRatio: selectedAspectRatio,
          imageSize: selectedResolution,
        },
        responseModalities: ['IMAGE', 'TEXT'],
      };

      // Construct subject mapping for the prompt
      const subjectPrompt = subjects.map((s, idx) => {
        const typeLabel = s.type === 'character' ? 'Pet' : 'Object';
        const typeIdx = subjects.filter((sub, i) => sub.type === s.type && i < idx).length + 1;
        return `${s.name} (${typeLabel} ${typeIdx}) = Image ${idx}`;
      }).join(', ');

      let promptModifiers = '';
      if (stylePreset) promptModifiers += `\nStyle: ${stylePreset}.`;
      if (negativePrompt) promptModifiers += `\nEnsure the following are NOT present: ${negativePrompt}.`;
      if (seed) {
        // @ts-ignore
        config.imageConfig.rawConfig = { seed: parseInt(seed) };
      }

      const contents = [
        {
          role: 'user',
          parts: [
            ...subjects.map(s => ({
              inlineData: {
                data: s.data,
                mimeType: s.mimeType,
              }
            })),
            {
              text: `Place these subjects in a famous global location: ${destination}. 
              Subjects: ${subjectPrompt}. 
              Additional Details: ${description}.${promptModifiers}
              Maintain strict subject consistency for characters and objects.
              Adjust the subject composition/pose as appropriate for the scene.
              Use Image Search for an accurate depiction of the landmark.`,
            },
          ],
        },
      ];

      // @ts-ignore - Using internal model name
      const response = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-image-preview",
        config,
        contents,
      });

      let finalImageUrl = '';

      for await (const chunk of response) {
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.inlineData) {
              finalImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
      }

      if (finalImageUrl) {
        setDestinations(prev => prev.map(adv => 
          adv.id === newAdventure.id ? { ...adv, imageUrl: finalImageUrl, loading: false } : adv
        ));
      } else {
        throw new Error("No image generated");
      }

    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error.message || "Failed to generate image";
      
      if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) {
        setShowKeyDialog(true);
      } else {
        addToast(errorMessage, 'error');
      }

      setDestinations(prev => prev.map(adv => 
        adv.id === newAdventure.id ? { ...adv, loading: false, error: errorMessage } : adv
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentDestination.trim() && !isGenerating) {
      generateAdventure(currentDestination.trim(), currentDescription.trim());
      setCurrentDestination('');
      setCurrentDescription('');
    }
  };

  const handleDownloadImage = (url: string, prefix: string = 'pet-passport') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareImage = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'pet-passport.png', { type: 'image/png' });
        await navigator.share({
          title: `PawPassport: ${title}`,
          text: `Check out my pet's adventure to ${title}!`,
          files: [file]
        });
      } catch (err) {
        console.error("Share failed", err);
        addToast("Sharing failed or was cancelled.", "error");
      }
    } else {
      addToast("Web Share API is not supported in this browser.", "error");
    }
  };

  const handleDownloadAlbum = () => {
    destinations.forEach((dest, index) => {
      if (dest.imageUrl) {
        handleDownloadImage(dest.imageUrl, `pet-passport-${index + 1}`);
      }
    });
  };

  const handleRestart = () => {
    setSubjects([]);
    setDestinations([]);
    setCurrentDestination('');
    setCurrentDescription('');
    setHasStarted(false);
    localStorage.removeItem('pawpassport-started');
    localStorage.removeItem('pawpassport-subjects');
    localStorage.removeItem('pawpassport-destinations');
  };

  const handleOpenSelectKey = async () => {
    await (window as any).aistudio?.openSelectKey();
    setShowKeyDialog(false);
  };

  const characterCount = subjects.filter(s => s.type === 'character').length;
  const objectCount = subjects.filter(s => s.type === 'object').length;

  if (!hasStarted) {
    return (
      <>
      <audio ref={audioRef} loop src="https://upload.wikimedia.org/wikipedia/commons/e/e5/Kevin_MacLeod_-_A_Mission.ogg" />
      <div className="max-w-6xl mx-auto pl-4 pr-6 sm:px-8 py-12 relative z-10">
        <header className="text-center mb-20 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 mb-2 premium-glow"
          >
            <Plane className="w-8 h-8 text-[#D4AF37]" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl sm:text-7xl md:text-8xl font-display text-transparent bg-clip-text bg-gradient-to-br from-[#FAFAFA] to-white/40 drop-shadow-lg"
          >
            PawPassport
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl font-sans font-medium text-white/60 max-w-2xl mx-auto"
          >
            Send your furry friends on a global adventure using Gemini 3.1 Flash Image.
          </motion.p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-24 px-4 md:px-0">
          {TEMPLATE_IMAGES.map((img, idx) => (
            <motion.div 
              key={img.id} 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className={`premium-frame cursor-pointer group ${
                idx === 0 ? 'md:-rotate-2' : idx === 1 ? 'md:translate-y-8' : 'md:rotate-2'
              }`}
              onClick={() => {
                setUploadType('character');
                fileInputRef.current?.click();
              }}
            >
              <div className="premium-frame-content p-4 transition-transform duration-300">
                <div 
                  className="rounded-xl overflow-hidden mb-5 bg-black/40 border border-white/5 shadow-inner"
                  style={{ aspectRatio: img.aspect_ratio.replace(':', '/') }}
                >
                  <img 
                    src={img.imageUrl} 
                    alt={img.location} 
                    className="w-full h-full object-cover rounded-xl transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-display text-xl tracking-wide text-white/90 uppercase">{img.location}</h3>
                  <div className="font-sans font-medium text-[#D4AF37]/80 text-sm line-clamp-2 mt-2">
                    "{img.template_description}"
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-md mx-auto"
        >
          <div className="glass-panel p-10 rounded-3xl text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 to-transparent"></div>
            <h2 className="text-3xl font-display mb-4 text-[#D4AF37] relative z-10">Start Your Adventure</h2>
            <p className="font-sans font-medium text-white/60 mb-8 relative z-10">
              Upload a clear photo of your pet to begin their global journey.
            </p>
            
            <button 
              onClick={() => {
                setUploadType('character');
                fileInputRef.current?.click();
              }}
              className="relative z-10 w-full flex items-center justify-center gap-3 py-5 px-8 rounded-2xl bg-white text-black font-display font-medium text-xl tracking-wider hover:bg-white/90 transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-white/30 focus:outline-none cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              <Upload className="w-5 h-5" />
              Upload Pet Photo
            </button>

            <div className="relative z-10 mt-8 text-xs leading-relaxed text-left text-white/40 space-y-3 font-sans font-medium">
              <p>
                By using this feature, you confirm that you have the necessary rights to any content that you upload. 
                Do not generate content that infringes on others' intellectual property or privacy rights. 
                Your use of this generative AI service is subject to our Prohibited Use Policy.
              </p>
              <p>
                Please note that uploads from Google Workspace may be used to develop and improve Google products and services in accordance with our terms.
              </p>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
            />
          </div>
        </motion.div>
      </div>
      </>
    );
  }

  return (
    <>
      <audio ref={audioRef} loop src="https://upload.wikimedia.org/wikipedia/commons/e/e5/Kevin_MacLeod_-_A_Mission.ogg" />
      <div className="absolute top-4 right-4 z-50">
        {currentUser ? (
          <div className="flex items-center gap-3 bg-black/50 border border-white/10 rounded-full py-1.5 px-2 pr-4 shadow-lg backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold uppercase overflow-hidden">
              {currentUser.photoURL ? <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" /> : currentUser.email?.[0] || 'U'}
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="text-sm font-bold text-white truncate max-w-[120px]">{currentUser.displayName || currentUser.email?.split('@')[0]}</div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#FBBF24] text-black border border-[#D4AF37] rounded-full py-2 px-4 shadow-lg font-bold transition-colors cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none"
          >
            <span>Sign In to Save</span>
          </button>
        )}
      </div>

      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        onEvent={handleJoyrideCallback}
        options={{
          primaryColor: '#D4AF37',
          backgroundColor: '#121217',
          textColor: '#fff',
          arrowColor: '#121217',
          showProgress: true
        }}
        styles={{
          options: {
            primaryColor: '#D4AF37'
          }
        } as any}
      />
      <button 
        onClick={toggleMusic}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-[#D4AF37] shadow-xl transition hover:-translate-y-1"
        title="Toggle Music"
      >
        {isMusicPlaying ? <Music className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

    <div className="max-w-6xl mx-auto pl-4 pr-6 sm:px-8 py-12 relative z-10">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-[#121217] min-w-[280px] sm:min-w-[300px] max-w-[calc(100vw-2rem)]`}
            >
              <div className={`p-2 rounded-full ${toast.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-sm font-sans font-medium text-white/90 leading-tight">
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="text-center mb-16 pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4 premium-glow">
          <Plane className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none font-display text-transparent bg-clip-text bg-gradient-to-br from-[#FAFAFA] to-white/40">
          PawPassport
        </h1>
        <p className="text-lg md:text-xl font-sans font-medium text-white/50 max-w-2xl mx-auto mt-2">
          Send your furry friends on a global adventure with Gemini 3.1 Flash Image
        </p>
      </header>

      <AnimatePresence>
        {showKeyDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
            >
              <button 
                onClick={() => setShowKeyDialog(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mb-6 border border-[#D4AF37]/30">
                  <Settings className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display text-white mb-4">API Key Required</h2>
                <p className="font-sans font-medium text-white/60 mb-6">
                  To generate Gemini 3.1 Flash Image images, you need to select a paid Gemini API key. 
                  This ensures the best performance for your pet's adventure.
                </p>
                
                <div className="bg-red-500/10 rounded-2xl p-4 mb-8 text-left border border-red-500/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Paid Project Required!
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">
                    Imagen 3 generation requires a <strong className="text-white font-bold">PAID project</strong>. If your API key uses the free tier, image generation will fail!
                  </p>
                  <p className="text-sm leading-relaxed text-white/80 mt-2">
                    Manage your keys and billing directly here:{' '}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline font-bold text-[#D4AF37] hover:text-white transition-colors block mt-1 break-all"
                    >
                      https://aistudio.google.com/app/apikey
                    </a>
                  </p>
                </div>

                <button 
                  onClick={handleOpenSelectKey}
                  className="w-full py-4 px-8 rounded-2xl bg-[#D4AF37] text-black font-display text-xl tracking-wider hover:bg-[#FBBF24] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                >
                  Select API Key
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {sharingDestination && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#121217] border border-white/10 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSharingDestination(null)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-display mb-4 text-white">Share Adventure</h2>
              <img src={sharingDestination.imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl mb-6 shadow-lg" />
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const text = encodeURIComponent(`Check out my pet's adventure to ${sharingDestination.prompt}! #pawpassport #petadventures #aigenerated`);
                    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1A91DA] text-white py-3 rounded-xl transition-all font-sans font-bold shadow-lg cursor-pointer"
                >
                  Share to X / Twitter
                </button>
                <button 
                  onClick={async () => {
                    handleDownloadImage(sharingDestination.imageUrl!, `pawpassport-${sharingDestination.id}`);
                    addToast("Image downloaded! You can now open Instagram and post it.", "success");
                    setSharingDestination(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 hover:opacity-90 text-white py-3 rounded-xl transition-all font-sans font-bold shadow-lg cursor-pointer"
                >
                  Download for Instagram
                </button>
                <button 
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        const response = await fetch(sharingDestination.imageUrl!);
                        const blob = await response.blob();
                        const file = new File([blob], 'pawpassport.png', { type: 'image/png' });
                        await navigator.share({
                          title: `PawPassport: ${sharingDestination.prompt}`,
                          text: `Check out my pet's adventure to ${sharingDestination.prompt}! #pawpassport #petadventures`,
                          files: [file]
                        });
                      } catch (err) {
                        console.error(err);
                      }
                    } else {
                      addToast("Native sharing not supported here.", "error");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl border border-white/10 transition-all font-sans font-bold shadow-lg cursor-pointer"
                >
                  More Options...
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Subjects & Config */}
        <div className="lg:col-span-4 space-y-8">
          {/* Subject Manager */}
          <div className="tour-step-upload glass-panel p-6 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-display mb-4 flex items-center justify-between text-white">
              <span>1. Upload subjects</span>
            </h2>
            <h3 className="mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">{characterCount}/10 Pets • {objectCount}/20 Objects</span>
            </h3>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {subjects.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl bg-black/20">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-white/30" />
                  <p className="text-sm font-sans font-medium text-white/40">No subjects added yet</p>
                </div>
              )}
              {subjects.map((s, idx) => (
                <div key={s.id} className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5 group hover:border-[#D4AF37]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img src={s.url} alt={s.name} className="w-full h-full object-cover rounded-lg border border-white/10" />
                      <div className="absolute -top-2 -left-2 bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        img_{idx}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input 
                        type="text" 
                        value={s.name}
                        onChange={(e) => updateSubjectName(s.id, e.target.value)}
                        placeholder={s.type === 'character' ? "Pet's name..." : "Specify object type (e.g. Toy Car)..."}
                        className="w-full bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 rounded px-1 transition-all placeholder:text-white/30 placeholder:font-normal"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <select 
                          value={s.type} 
                          onChange={(e) => updateSubjectType(s.id, e.target.value as 'character' | 'object')}
                          className="bg-transparent text-[10px] uppercase tracking-widest text-white/60 focus:outline-none border-b border-white/20 focus:border-[#D4AF37] cursor-pointer outline-none"
                        >
                          <option value="character" className="bg-[#121217]">Pet</option>
                          <option value="object" className="bg-[#121217]">Object</option>
                        </select>
                        {s.type === 'object' && (
                          <select 
                            value={s.objectCategory || 'Toy'}
                            onChange={(e) => updateSubjectCategory(s.id, e.target.value)}
                            className="bg-transparent text-[10px] uppercase tracking-widest text-[#D4AF37] focus:outline-none border-b border-[#D4AF37]/30 focus:border-[#D4AF37] cursor-pointer outline-none"
                          >
                            <option value="Toy" className="bg-[#121217]">Toy</option>
                            <option value="Accessory" className="bg-[#121217]">Accessory</option>
                            <option value="Food" className="bg-[#121217]">Food</option>
                            <option value="Prop" className="bg-[#121217]">Prop</option>
                            <option value="Other" className="bg-[#121217]">Other</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <button 
                        onClick={() => toggleSaveSubject(s)}
                        className={`p-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg focus:opacity-100 focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer ${s.isSaved ? 'text-red-500 hover:bg-red-500/10' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                        title={s.isSaved ? "Remove from Profile" : "Save to Profile"}
                      >
                        <Heart className="w-4 h-4" fill={s.isSaved ? "currentColor" : "none"} />
                      </button>
                      <button 
                        onClick={() => removeSubject(s.id)}
                        className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-lg focus:opacity-100 focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer"
                        title="Delete from list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                disabled={characterCount >= 10}
                onClick={() => {
                  setUploadType('character');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 font-display text-lg tracking-wider text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 focus:ring-2 focus:ring-white/30 focus:outline-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Pet
              </button>
              <button 
                disabled={objectCount >= 20}
                onClick={() => {
                  setUploadType('object');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 bg-white/5 font-display text-lg tracking-wider text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 focus:ring-2 focus:ring-white/30 focus:outline-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Object
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
            />
          </div>

          {/* Configuration */}
          {showAdvanced && (
            <div className="glass-panel p-6 rounded-3xl shadow-xl">
              <h2 className="text-xl font-display mb-6 flex items-center gap-2 text-white">
                <Settings className="w-5 h-5 text-[#D4AF37]" />
                Advanced Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Aspect Ratio</label>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map(r => {
                      const [w, h] = r.split(':').map(Number);
                      return (
                        <button
                          key={r}
                          onClick={() => setSelectedAspectRatio(r)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${selectedAspectRatio === r ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white' : 'border-white/10 bg-black/30 text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                        >
                          <div 
                            className={`border-2 rounded-[2px] ${selectedAspectRatio === r ? 'border-[#D4AF37]' : 'border-white/50'}`}
                            style={{ 
                              width: w >= h ? '16px' : `${16 * (w/h)}px`, 
                              height: h >= w ? '16px' : `${16 * (h/w)}px` 
                            }}
                          />
                          <span className="text-xs font-mono">{r}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Style Preset</label>
                  <div className="relative">
                    <select 
                      value={stylePreset}
                      onChange={(e) => setStylePreset(e.target.value)}
                      className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-white focus:outline-none cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                    >
                      <option value="" className="bg-[#121217] text-white">None (Auto)</option>
                      <option value="Photorealistic" className="bg-[#121217] text-white">Photorealistic</option>
                      <option value="Cinematic" className="bg-[#121217] text-white">Cinematic</option>
                      <option value="Anime" className="bg-[#121217] text-white">Anime</option>
                      <option value="Watercolor" className="bg-[#121217] text-white">Watercolor</option>
                      <option value="3D Cartoon" className="bg-[#121217] text-white">3D Cartoon</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/50" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Negative Prompt</label>
                  <input 
                    type="text" 
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g. text, watermark, blurry..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Seed (Optional)</label>
                  <input 
                    type="number" 
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Resolution</label>
                  <div className="relative">
                    <select 
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value)}
                      className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-white focus:outline-none cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                    >
                      {RESOLUTIONS.map(r => <option key={r} value={r} className="bg-[#121217] text-white">{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleRestart}
            className="w-full py-4 px-6 rounded-2xl border border-white/10 font-display text-xl tracking-wider hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center gap-2 glass-panel shadow-sm hover:shadow-md focus:ring-2 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            Reset Adventure
          </button>
        </div>

        {/* Right Column: Prompt & Results */}
        <div className="lg:col-span-8 space-y-8">
          <div className="tour-step-destination glass-panel p-6 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-30"></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-display text-white flex items-center gap-3">
                <MapPin className="w-6 h-6 text-[#D4AF37]" />
                2. Plan their Adventure
              </h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="tour-step-advanced flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors border-b border-white/10 hover:border-white/50 focus:ring-2 focus:ring-[#D4AF37]/30 focus:outline-none focus:border-transparent rounded px-1 cursor-pointer pb-1"
              >
                <Settings className="w-4 h-4" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3">Destination</label>
                <input
                  type="text"
                  value={currentDestination}
                  onChange={(e) => setCurrentDestination(e.target.value)}
                  placeholder="e.g. The Great Wall of China"
                  className="w-full bg-transparent border-b border-white/10 py-3 text-2xl text-white focus:outline-none focus:border-[#D4AF37] font-sans font-medium hover:border-white/30 focus:ring-0 placeholder:text-white/20 transition-colors"
                  disabled={isGenerating}
                />
              </div>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3">Scene Description</label>
                  <textarea
                    value={currentDescription}
                    onChange={(e) => setCurrentDescription(e.target.value)}
                    placeholder="Describe the scene, lighting, and what the subjects are doing..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white min-h-[120px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-sans font-medium resize-none placeholder:text-white/20 transition-all shadow-inner"
                    disabled={isGenerating}
                  />
                </motion.div>
              )}

              <div className="flex justify-end items-center pt-2">
                <button 
                  type="submit"
                  disabled={!currentDestination.trim() || subjects.length === 0 || isGenerating}
                  className="tour-step-generate w-full sm:w-auto bg-[#D4AF37] text-black px-6 sm:px-12 py-4 rounded-2xl font-display text-xl tracking-widest disabled:opacity-50 disabled:grayscale hover:bg-[#FBBF24] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plane className="w-5 h-5" />
                      3. Generate holiday snap!
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="tour-step-ai-ideas mt-8 pt-8 border-t border-white/10 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold uppercase tracking-wider text-[#D4AF37]">Inspiration:</p>
                <button
                  type="button"
                  onClick={generateSuggestions}
                  disabled={isGeneratingSuggestions || subjects.length === 0}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black bg-[#D4AF37] px-3 py-1.5 rounded-full hover:bg-[#FBBF24] transition-colors focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Generate Ideas
                </button>
              </div>
              
              {dynamicSuggestions.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3">AI Suggestions</h4>
                    <div className="flex flex-wrap gap-2">
                       {dynamicSuggestions.map((suggestion, idx) => (
                           <button
                             key={idx}
                             type="button"
                             onClick={() => setCurrentDestination(suggestion)}
                             className="text-left text-xs py-2 px-4 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 text-white transition-all font-sans font-medium focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer"
                           >
                             "{suggestion}"
                           </button>
                       ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(CATEGORIZED_SUGGESTIONS).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {items.map((suggestion, idx) => {
                          const petName = subjects.find(s => s.type === 'character')?.name || "My pet";
                          const displaySuggestion = suggestion.replace("My pet", petName);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCurrentDestination(displaySuggestion)}
                              className="text-left text-xs py-2 px-4 rounded-full border border-white/10 bg-white/5 hover:border-[#D4AF37]/50 hover:bg-white/10 text-white/70 hover:text-white transition-all font-sans font-medium focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer"
                            >
                              "{displaySuggestion}"
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {destinations.length > 0 && (
            <div className="pt-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
                <h2 className="text-3xl sm:text-4xl font-display text-white">Travel Album</h2>
                {destinations.some(d => d.imageUrl) && (
                  <button 
                    onClick={handleExportZip}
                    disabled={isExporting}
                    className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#D4AF37] hover:text-white border-b border-transparent hover:border-white pb-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? 'Exporting ZIP...' : 'Download All as ZIP'}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent min-w-[200px]"
                />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-black/50 border border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent"
                >
                  <option value="all" className="bg-[#121217]">All Time</option>
                  <option value="today" className="bg-[#121217]">Today</option>
                  <option value="week" className="bg-[#121217]">This Week</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {filteredDestinations.map((dest) => (
                  <div key={dest.id} className="premium-frame cursor-default group">
                    <div className="premium-frame-content p-4 min-w-0 overflow-hidden flex flex-col h-full bg-[#121217]">
                      <div 
                        className="bg-black/60 rounded-xl border border-white/5 overflow-hidden relative flex items-center justify-center mb-5 w-full shadow-inner"
                        style={{ aspectRatio: dest.aspectRatio.replace(':', '/') }}
                      >
                        {dest.loading ? (
                          <div className="text-center p-4 sm:p-8 flex flex-col items-center justify-center w-full h-full text-white">
                            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mb-4 text-[#D4AF37] flex-shrink-0" />
                            <p className="font-sans font-medium text-sm sm:text-base text-white/50 break-words w-full line-clamp-3">
                              Generating snap of {dest.prompt}
                            </p>
                          </div>
                        ) : dest.error ? (
                          <div className="text-center text-red-400 px-6 py-8">
                            <p className="font-bold mb-2">Adventure Failed</p>
                            <p className="text-sm opacity-80">{dest.error}</p>
                          </div>
                        ) : dest.imageUrl ? (
                          <>
                            <img 
                              src={dest.imageUrl} 
                              alt={dest.prompt}
                              className="w-full h-full object-cover rounded-xl transition-transform duration-700 hover:scale-[1.03] opacity-90 group-hover:opacity-100"
                            />
                            <div className="absolute -bottom-2 -right-4 w-28 h-28 opacity-40 mix-blend-screen pointer-events-none transform -rotate-12 group-hover:-rotate-6 transition-transform duration-500 z-20">
                              <svg viewBox="0 0 100 100" className="w-full h-full text-[#D4AF37] fill-current">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 3" />
                                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" />
                                <path d="M50 25 L55 35 L68 35 L58 43 L62 55 L50 48 L38 55 L42 43 L32 35 L45 35 Z" fill="currentColor" className="opacity-80" />
                                <text x="50" y="70" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="sans-serif" fill="currentColor" style={{ textTransform: 'uppercase', letterSpacing: '2px' }}>PASSPORT</text>
                                <text x="50" y="80" textAnchor="middle" fontSize="6" fontWeight="bold" fontFamily="monospace" fill="currentColor">{new Date(parseInt(dest.id)).toLocaleDateString()}</text>
                              </svg>
                            </div>
                          </>
                        ) : null}
                      </div>
                      <div className="px-2 min-w-0 flex-1">
                        <h3 className="font-display text-xl tracking-wider text-white/90 break-words">{dest.prompt}</h3>
                        {dest.description && (
                          <p className="font-sans font-medium text-sm text-[#D4AF37]/80 line-clamp-2 mt-2 break-words">
                            "{dest.description}"
                          </p>
                        )}
                      </div>
                      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between px-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Gemini 3.1 Flash Image</span>
                          <span className="text-[10px] font-mono text-white/40">{new Date(parseInt(dest.id)).toLocaleString()}</span>
                        </div>
                        {dest.imageUrl && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavoriteDestination(dest)}
                              className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 ${dest.isFavorite ? 'text-red-500 hover:bg-red-500/10' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                              title={dest.isFavorite ? "Remove Favorite" : "Save as Favorite"}
                            >
                              <Heart className="w-4 h-4" fill={dest.isFavorite ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={() => handleDownloadImage(dest.imageUrl!, `pet-passport-${dest.id}`)}
                              className="p-2 text-white/50 hover:text-[#D4AF37] hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                              title="Download Image"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSharingDestination(dest)}
                              className="p-2 text-white/50 hover:text-[#D4AF37] hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                              title="Share Image"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
