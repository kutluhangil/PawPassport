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
  Heart,
  Check,
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  Crop,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Joyride, STATUS, Step } from 'react-joyride';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { collection, doc, setDoc, query, onSnapshot, deleteDoc } from 'firebase/firestore';
import CropModal from './components/CropModal';
import UserProfileModal from './components/UserProfileModal';

const saveAs = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
};

// Firestore Error Handler
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  subjectNames?: string[];
  subjectTypes?: string[];
  filter?: string;
  animation?: string;
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

import { dict } from './translations';

export default function App() {
  const [lang, setLang] = useState<'en' | 'tr'>('tr');
  const t = dict[lang];
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('minikgezgin-subjects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [destinations, setDestinations] = useState<Adventure[]>(() => {
    const saved = localStorage.getItem('minikgezgin-destinations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  
  const [pastDestinations, setPastDestinations] = useState<Adventure[][]>([]);
  const [futureDestinations, setFutureDestinations] = useState<Adventure[][]>([]);

  const undo = () => {
    if (pastDestinations.length === 0) return;
    const previous = pastDestinations[pastDestinations.length - 1];
    setPastDestinations(p => p.slice(0, p.length - 1));
    setFutureDestinations(f => [destinations, ...f]);
    setDestinations(previous);
  };

  const redo = () => {
    if (futureDestinations.length === 0) return;
    const next = futureDestinations[0];
    setFutureDestinations(f => f.slice(1));
    setPastDestinations(p => [...p, destinations]);
    setDestinations(next);
  };
  const [currentDestination, setCurrentDestination] = useState(() => localStorage.getItem('minikgezgin-draft-destination') || '');
  const [currentDescription, setCurrentDescription] = useState(() => localStorage.getItem('minikgezgin-draft-description') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('');
  const [seed, setSeed] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'passport'>('grid');
  const [hasStarted, setHasStarted] = useState(() => {
    return localStorage.getItem('minikgezgin-started') === 'true';
  });

  const [subjectPresets, setSubjectPresets] = useState<{name: string, subjects: Subject[]}[]>(() => {
    const saved = localStorage.getItem('minikgezgin-subject-presets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('minikgezgin-theme') as 'dark'|'light') || 'dark');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('minikgezgin-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

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

  // Fetch initial data from Firestore when user logs in
  useEffect(() => {
    if (!currentUser) return;
    let isInitialLoad = true;
    try {
      const unsub = onSnapshot(doc(db, 'users', currentUser.uid, 'data', 'appData'), (docSnap) => {
        if (docSnap.exists() && isInitialLoad) {
          const data = docSnap.data();
          if (data.subjects && data.subjects.length > 0) setSubjects(data.subjects);
          if (data.destinations && data.destinations.length > 0) setDestinations(data.destinations);
          if (data.subjectPresets && data.subjectPresets.length > 0) setSubjectPresets(data.subjectPresets);
          isInitialLoad = false;
        }
      }, (err) => {
        console.error("Firestore sync error:", err);
      });
      return () => unsub();
    } catch(err) {
      console.error(err);
    }
  }, [currentUser]);

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
    return localStorage.getItem('minikgezgin-tour-seen') !== 'true';
  });

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'character' | 'object'>('all');
  const [subjectNameFilter, setSubjectNameFilter] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState<'all' | 'favorites'>('all');
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [generateProgress, setGenerateProgress] = useState(0);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Drafts
  useEffect(() => {
    localStorage.setItem('minikgezgin-draft-destination', currentDestination);
  }, [currentDestination]);

  useEffect(() => {
    localStorage.setItem('minikgezgin-draft-description', currentDescription);
  }, [currentDescription]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('minikgezgin-tour-seen', 'true');
    }
  };

  const tourSteps: Step[] = [
    {
      target: 'body',
      content: t.tourHero,
      placement: 'center',
    },
    {
      target: '.tour-step-upload',
      content: t.tourUpload,
    },
    {
      target: '.tour-step-destination',
      content: t.tourDest,
    },
    {
      target: '.tour-step-ai-ideas',
      content: t.tourIdeas,
    },
    {
      target: '.tour-step-advanced',
      content: t.tourAdvanced,
    },
    {
      target: '.tour-step-generate',
      content: t.tourGenerate,
    }
  ];

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportName, setExportName] = useState('minikgezgin_album');
  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>('zip');
  const [exportIncludeDescriptions, setExportIncludeDescriptions] = useState(true);
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);
  
  const handleOpenExport = () => {
    setExportSelectedIds(destinations.filter(d => d.imageUrl && !d.loading).map(d => d.id));
    setShowExportDialog(true);
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exportSelectedIds.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);
    const loadedDests = destinations.filter(d => exportSelectedIds.includes(d.id) && d.imageUrl && !d.loading);

    try {
      if (exportFormat === 'zip') {
        const zip = new JSZip();
        for (let i = 0; i < loadedDests.length; i++) {
          setExportProgress(Math.round((i / loadedDests.length) * 100));
          const dest = loadedDests[i];
          if (!dest.imageUrl) continue;
          
          let contentStr = '';
          if (exportIncludeDescriptions) {
             contentStr = `Destination: ${dest.prompt}\nDescription: ${dest.description || ''}`;
          }

          const response = await fetch(dest.imageUrl);
          const blob = await response.blob();
          
          let filename = dest.prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          if (filename.length > 50) filename = filename.substring(0, 50);
          
          zip.file(`${filename}_${dest.id}.jpg`, blob);
          if (exportIncludeDescriptions && contentStr) {
             zip.file(`${filename}_${dest.id}.txt`, contentStr);
          }
        }
        
        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
           setExportProgress(Math.round(metadata.percent));
        });
        saveAs(content, `${exportName || 'album'}.zip`);
        addToast('Travel album ZIP downloaded!', 'success');
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', format: 'a5' });
        let isFirstPage = true;

        for (let i = 0; i < loadedDests.length; i++) {
          setExportProgress(Math.round(((i) / loadedDests.length) * 100));
          const dest = loadedDests[i];
          if (!dest.imageUrl) continue;
          
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const response = await fetch(dest.imageUrl);
          const blob = await response.blob();
          
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // Style the passport page
          pdf.setFillColor('#121217'); // Dark Background
          pdf.rect(0, 0, 210, 148, 'F'); // A5 landscape

          pdf.setTextColor('#D4AF37'); // Gold Text
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(22);
          pdf.text("MinikGezgin Official Visa", 10, 20);

          // Add Image like a stamp
          pdf.addImage(base64, 'JPEG', 10, 30, 90, 90); 

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12);
          pdf.setTextColor('#FFFFFF');
          pdf.text(`ISSUED: ${new Date().toLocaleDateString()}`, 110, 40);
          pdf.text(`DESTINATION:`, 110, 55);
          pdf.setTextColor('#D4AF37');
          pdf.setFontSize(14);
          pdf.text(dest.prompt, 110, 65, { maxWidth: 90 });

          if (exportIncludeDescriptions && dest.description) {
            pdf.setFontSize(10);
            pdf.setTextColor('#AAAAAA');
            pdf.text(dest.description, 110, 80, { maxWidth: 90 });
          }
          
          pdf.setDrawColor('#D4AF37');
          pdf.setLineWidth(0.5);
          pdf.line(10, 130, 200, 130);
          
          // Machine readable zone mockup
          pdf.setFont('courier', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor('#555555');
          const str1 = `P<MGZ${dest.prompt.substring(0, 20).toUpperCase().replace(/[^A-Z]/g, '<')}<<<<<<<<<<<<<<<<<<<<<<<`;
          const str2 = `A1B2C3D4E5${new Date().getFullYear()}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`;
          pdf.text(str1.substring(0, 44), 10, 138);
          pdf.text(str2.substring(0, 44), 10, 145);
        }
        setExportProgress(100);

        pdf.save(`${exportName || 'album'}.pdf`);
        addToast('Travel album PDF downloaded!', 'success');
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to export travel album.', 'error');
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
      setTimeout(() => setExportProgress(0), 1000);
    }
  };

  const [sharingDestination, setSharingDestination] = useState<Adventure | null>(null);

  const filteredDestinations = destinations.filter(d => {
    if (locationFilter && !d.prompt.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (dateFilter === 'today') {
      if (new Date(parseInt(d.id)).toDateString() !== new Date().toDateString()) return false;
    }
    if (dateFilter === 'week') {
      if (new Date(parseInt(d.id)) <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return false;
    }
    if (typeFilter !== 'all') {
      if (!d.subjectTypes || !d.subjectTypes.includes(typeFilter)) return false;
    }
    if (subjectNameFilter) {
      const namesJoined = (d.subjectNames || []).join(' ').toLowerCase();
      if (!namesJoined.includes(subjectNameFilter.toLowerCase())) return false;
    }
    if (historyViewMode === 'favorites') {
      if (!d.isFavorite) return false;
    }
    return true;
  }).sort((a, b) => {
    if (historySortOrder === 'newest') return parseInt(b.id) - parseInt(a.id);
    return parseInt(a.id) - parseInt(b.id);
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
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  // Save to localStorage & Firestore effects
  useEffect(() => {
    localStorage.setItem('minikgezgin-subjects', JSON.stringify(subjects));
    if (subjects.length > 0) {
      localStorage.setItem('minikgezgin-started', 'true');
      setHasStarted(true);
    }
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid, 'data', 'appData'), { subjects }, { merge: true }).catch(err => console.error(err));
    }
  }, [subjects, currentUser]);

  useEffect(() => {
    localStorage.setItem('minikgezgin-destinations', JSON.stringify(destinations));
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid, 'data', 'appData'), { destinations }, { merge: true }).catch(err => console.error(err));
    }
  }, [destinations, currentUser]);

  useEffect(() => {
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid, 'data', 'appData'), { subjectPresets }, { merge: true }).catch(err => console.error(err));
    }
  }, [subjectPresets, currentUser]);
  
  // Config state
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("9:16");
  const [selectedResolution, setSelectedResolution] = useState("1K");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'character' | 'object'>('character');

  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (files: File[]) => {
    if (!files.length) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const newSubjects: Subject[] = [];

    let completed = 0;

    files.forEach((file, index) => {
      if (!validTypes.includes(file.type)) {
        addToast(`Skipped ${file.name} - invalid type`, 'error');
        completed++;
        if (completed === files.length && newSubjects.length > 0) {
          setSubjects(prev => [...prev, ...newSubjects]);
          setHasStarted(true);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        const newSubject: Subject = {
          id: Date.now().toString() + index,
          name: uploadType === 'character' ? `Pet ${subjects.filter(s => s.type === 'character').length + newSubjects.filter(s=>s.type === 'character').length + 1}` : `Object ${subjects.filter(s => s.type === 'object').length + newSubjects.filter(s=>s.type === 'object').length + 1}`,
          type: uploadType,
          data: base64Data,
          mimeType: file.type,
          url: base64String
        };

        newSubjects.push(newSubject);
        completed++;
        
        if (completed === files.length) {
          setSubjects(prev => [...prev, ...newSubjects]);
          setHasStarted(true);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files || []));
  };

  const removeSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const toggleSaveSubject = async (subject: Subject) => {
    if (!currentUser) return addToast("Please sign in to save subjects!", "error");
    try {
      if (subject.isSaved) {
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'subjects', subject.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/subjects/${subject.id}`);
        }
        setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, isSaved: false } : s));
      } else {
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'subjects', subject.id), {
            userId: currentUser.uid,
            name: subject.name,
            type: subject.type,
            objectCategory: subject.objectCategory || '',
            url: subject.url
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/subjects/${subject.id}`);
        }
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
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'destinations', dest.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/destinations/${dest.id}`);
        }
        setDestinations(prev => prev.map(d => d.id === dest.id ? { ...d, isFavorite: false } : d));
      } else {
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'destinations', dest.id), {
            userId: currentUser.uid,
            destination: dest.prompt,
            description: dest.description || '',
            imageUrl: dest.imageUrl,
            createdAt: parseInt(dest.id),
            isFavorite: true,
            subjectNames: dest.subjectNames || [],
            subjectTypes: dest.subjectTypes || []
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/destinations/${dest.id}`);
        }
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
    }, error => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/subjects`);
    });

    // Sync destinations
    const unsubDest = onSnapshot(query(collection(db, 'users', currentUser.uid, 'destinations')), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setDestinations(prev => {
            if (prev.find(d => d.id === change.doc.id)) return prev.map(d => d.id === change.doc.id ? { ...d, isFavorite: true } : d);
            return [...prev, { id: change.doc.id, prompt: data.destination, description: data.description, imageUrl: data.imageUrl, loading: false, aspectRatio: '9:16', isFavorite: true, subjectNames: data.subjectNames, subjectTypes: data.subjectTypes }];
          });
        }
      });
    }, error => {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/destinations`);
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
      subjectNames: subjects.map(s => s.name),
      subjectTypes: subjects.map(s => s.type)
    };

    setPastDestinations(p => [...p, destinations]);
    setFutureDestinations([]);
    setDestinations(prev => [newAdventure, ...prev]);
    setIsGenerating(true);
    setGenerateProgress(0);

    let progressInterval = setInterval(() => {
      setGenerateProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 5) + 2;
      });
    }, 500);

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
      const errorMessage = (error?.message || error?.toString() || "Failed to generate image").toLowerCase();
      
      let specificError = "Failed to generate image. " + (error?.message || "");
      if (errorMessage.includes("requested entity was not found") || errorMessage.includes("404") || errorMessage.includes("api key") || errorMessage.includes("api_key")) {
        specificError = "API Key Issue: Please check your Gemini API key in settings or generate a new one.";
        addToast(specificError, 'error');
        setShowKeyDialog(true);
      } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
        specificError = "Quota exceeded: You might need to wait a moment or check your API limits.";
        addToast(specificError, 'error');
      } else if (errorMessage.includes("blocked") || errorMessage.includes("safety")) {
        specificError = "Safety block: The generation was blocked by safety filters. Please try modifying your scene description.";
        addToast(specificError, 'error');
      } else {
        specificError = "Generation failed: " + (error?.message || "Unknown error") + ". Please modify your request.";
        addToast(specificError, 'error');
      }

      setDestinations(prev => prev.map(adv => 
        adv.id === newAdventure.id ? { ...adv, loading: false, error: specificError } : adv
      ));
    } finally {
      clearInterval(progressInterval);
      setGenerateProgress(100);
      setIsGenerating(false);
      setTimeout(() => setGenerateProgress(0), 1000);
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

  const handleDownloadImage = (url: string, prefix: string = 'minikgezgin', format: 'png' | 'jpeg' = 'png') => {
    const link = document.createElement('a');
    if (format === 'jpeg' && url.startsWith('data:image/png')) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(img, 0, 0);
           link.href = canvas.toDataURL('image/jpeg', 0.9);
           link.download = `${prefix}-${Date.now()}.jpg`;
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
        }
      };
      img.src = url;
    } else {
      link.href = url;
      link.download = `${prefix}-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareImage = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'minikgezgin.png', { type: 'image/png' });
        await navigator.share({
          title: `MinikGezgin: ${title}`,
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
        handleDownloadImage(dest.imageUrl, `minikgezgin-${index + 1}`);
      }
    });
  };

  const handleRestart = () => {
    setSubjects([]);
    setDestinations([]);
    setCurrentDestination('');
    setCurrentDescription('');
    setHasStarted(false);
    localStorage.removeItem('minikgezgin-started');
    localStorage.removeItem('minikgezgin-subjects');
    localStorage.removeItem('minikgezgin-destinations');
  };

  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const handleOpenSelectKey = async () => {
    setIsKeyLoading(true);
    try {
    await (window as any).aistudio?.openSelectKey();
    setShowKeyDialog(false);
    } finally {
      setIsKeyLoading(false);
    }
  };

  const characterCount = subjects.filter(s => s.type === 'character').length;
  const objectCount = subjects.filter(s => s.type === 'object').length;

  
  return (
    <>
      <audio ref={audioRef} loop src="https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3" />
      <div className="fixed bottom-4 left-4 z-[999] flex items-center gap-3 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-lg hover:shadow-xl transition-all">
        <button onClick={toggleMusic} className="text-white hover:text-[#D4AF37] transition focus:outline-none cursor-pointer">
          {isMusicPlaying ? <Music className="w-5 h-5"/> : <VolumeX className="w-5 h-5" />}
        </button>
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 accent-[#D4AF37]"
        />
      </div>

      {!hasStarted ? (
        <div className="relative min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-[#FAFAFA] font-sans overflow-x-hidden transition-colors">
        
        
        {/* Background glow effects */}
        <div className="absolute top-0 inset-x-0 h-[800px] pointer-events-none atmosphere z-0 opacity-50 dark:opacity-100 mix-blend-multiply dark:mix-blend-normal"></div>

        <nav className="relative z-20 flex justify-between items-center py-6 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
             <Plane className="w-6 h-6 text-[#D4AF37]" />
             <span className="font-display text-xl tracking-wider uppercase text-gray-900 dark:text-gray-100">MinikGezgin 🐾</span>
             {!hasStarted && (
               <button onClick={() => setShowAboutModal(true)} className="ml-4 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#D4AF37] transition-colors border border-black/10 dark:border-white/10 rounded-full px-3 py-1">About</button>
             )}
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-full p-1 border border-black/10 dark:border-white/10">
               <button 
                 onClick={() => setLang('tr')} 
                 className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${lang === 'tr' ? 'bg-[#D4AF37] text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white'}`}
               >
                 TR
               </button>
               <button 
                 onClick={() => setLang('en')} 
                 className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${lang === 'en' ? 'bg-[#D4AF37] text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white'}`}
               >
                 EN
               </button>
             </div>
            {currentUser ? (
                <button onClick={() => setHasStarted(true)} className="nav-pill text-[#D4AF37] border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 cursor-pointer transition">
                  {t.enterStudio}
                </button>
            ) : (
               <button onClick={handleLogin} className="nav-pill hover:bg-black/5 dark:bg-white/5 cursor-pointer transition text-gray-900 dark:text-white">{t.signIn}</button>
            )}
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-32">
           <div className="text-center max-w-4xl mx-auto mb-32">
             <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md mb-8">
               <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
               <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">{t.poweredBy}</span>
             </motion.div>
             
             <motion.h1 
                initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
                className="text-[12vw] md:text-8xl font-display font-light leading-[0.9] tracking-tight mb-8"
             >
                {t.title.split(',')[0]}<br/><span className="text-[#D4AF37] italic" style={{ fontFamily: 'Georgia, serif' }}>{t.title.split(',')[1] || ''}</span>
             </motion.h1>
             <motion.p
                initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
                className="text-lg md:text-xl font-sans text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed mb-12"
             >
               {t.subtitle}
             </motion.p>
             
             <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <button 
                onClick={() => setHasStarted(true)}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-display font-medium text-lg tracking-wider rounded-full hover:scale-105 transition-all duration-300 shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
               >
                 <span>{t.startBtn}</span>
                 <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
               </button>
             </motion.div>
           </div>

           {/* Features / Demo Gallery */}
           <div className="grid md:grid-cols-2 gap-16 items-center mb-32 border-t border-black/10 dark:border-white/10 pt-24">
             <div className="space-y-12">
               <h2 className="text-4xl md:text-5xl font-display font-light tracking-tight text-gray-900 dark:text-white mb-8">{t.howItWorks.split(' ')[0]} <span className="italic text-[#D4AF37]" style={{ fontFamily: 'Georgia, serif' }}>{t.howItWorks.split(' ').slice(1).join(' ')}</span></h2>
               <div className="space-y-8">
                 {[
                   { step: '01', title: t.step1, desc: t.step1Desc },
                   { step: '02', title: t.step2, desc: t.step2Desc },
                   { step: '03', title: t.step3, desc: t.step3Desc }
                 ].map((item) => (
                   <div key={item.step} className="flex gap-6 border-b border-black/10 dark:border-white/10 pb-8 group">
                     <span className="font-mono text-2xl text-gray-500 dark:text-gray-400 group-hover:text-[#D4AF37] transition-colors">{item.step}</span>
                     <div>
                       <h3 className="text-xl font-display uppercase tracking-wider mb-2 text-gray-900 dark:text-gray-100">{item.title}</h3>
                       <p className="font-sans text-gray-600 dark:text-gray-300 leading-relaxed font-normal">{item.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
             <div className="relative">
               <div className="grid grid-cols-2 gap-4 relative z-10">
                 {TEMPLATE_IMAGES.slice(0, 4).map((img, idx) => (
                   <motion.div 
                     key={img.id}
                     initial={{opacity:0, y:20}}
                     whileInView={{opacity:1,y:0}}
                     viewport={{once:true}}
                     transition={{delay: idx * 0.1}}
                     className={`rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 premium-frame ${idx % 2 !== 0 ? 'mt-12' : ''}`}
                     style={{ aspectRatio: img.aspect_ratio.replace(':', '/') }}
                   >
                     <div className="premium-frame-content relative group">
                        <img src={img.imageUrl} alt={img.location} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                           <p className="font-display text-lg text-gray-900 dark:text-white">{img.location}</p>
                           <p className="font-sans text-xs text-[#D4AF37] opacity-80">{img.template_description}</p>
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             </div>
           </div>

           {/* Call to action */}
           <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-[#0a0a0c] p-12 md:p-24 text-center shadow-[0_0_100px_rgba(212,175,55,0.05)] mt-16">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-[#0a0a0c] to-black opacity-80 pointer-events-none"></div>
              
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              
              <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center mb-8 border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                   <Plane className="w-8 h-8 text-[#D4AF37]" />
                 </div>
                 
                 <h2 className="text-5xl md:text-6xl font-display font-light mb-6 text-gray-900 dark:text-white tracking-tight">
                    {t.journey.split(' ')[0]} {t.journey.split(' ')[1]} <span className="italic text-[#D4AF37]" style={{ fontFamily: 'Georgia, serif' }}>{t.journey.split(' ').slice(2).join(' ')}</span>
                 </h2>
                 
                 <p className="font-sans text-lg text-gray-600 dark:text-gray-300 mb-12 font-normal max-w-lg leading-relaxed">
                    {t.join}
                 </p>
                 
                 <button 
                   onClick={() => setHasStarted(true)}
                   className="group relative inline-flex items-center justify-center px-10 py-5 font-display text-lg tracking-widest uppercase overflow-hidden rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-[#FAFAFA] transition-all hover:scale-105 active:scale-95 duration-300 shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255,0.15)] focus:outline-none focus:ring-4 focus:ring-white/20"
                 >
                   <span className="mr-3 font-medium">{t.getStarted}</span>
                   <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </button>

                 <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
                   <span className="block w-16 border-b border-[#D4AF37]/50"></span>
                   <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                   <span className="block w-16 border-b border-[#D4AF37]/50"></span>
                 </div>
              </div>
           </div>
        </main>
      </div>
      ) : (
        <>
      <div className="absolute top-4 right-4 z-50">
        {currentUser ? (
          <div className="flex items-center gap-3 bg-black/50 border border-black/10 dark:border-white/10 rounded-full py-1.5 px-2 pr-4 shadow-lg backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-gray-900 dark:text-white font-bold uppercase overflow-hidden">
              {currentUser.photoURL ? <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" /> : currentUser.email?.[0] || 'U'}
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{currentUser.displayName || currentUser.email?.split('@')[0]}</div>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="ml-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white transition-colors"
            >
              {t.editProfile}
            </button>
            <button
              onClick={handleLogout}
              className="ml-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-red-400 transition-colors"
            >
              {t.signOut}
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#FBBF24] text-gray-900 dark:text-white border border-[#D4AF37] rounded-full py-2 px-4 shadow-lg font-bold transition-colors cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none"
          >
            <span>{t.signInToSave}</span>
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

    <div className="max-w-6xl mx-auto pl-4 pr-6 sm:px-8 py-12 relative z-10">
      <div className="absolute top-6 right-6 sm:right-8 z-50 flex items-center gap-4">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-gray-900 dark:bg-black/5 dark:bg-white/5 transition-colors cursor-pointer text-gray-900 dark:text-white">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {currentUser ? (
          <button onClick={() => setShowProfileModal(true)} className="p-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-gray-900 dark:bg-black/5 dark:bg-white/5 transition-colors cursor-pointer text-gray-900 dark:text-white">
             {currentUser.photoURL ? <img src={currentUser.photoURL} alt="profile" className="w-5 h-5 rounded-full object-cover" /> : <UserIcon className="w-5 h-5" />}
          </button>
        ) : null}
      </div>
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-white dark:bg-[#121217] min-w-[280px] sm:min-w-[300px] max-w-[calc(100vw-2rem)]`}
            >
              <div className={`p-2 rounded-full ${toast.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-sm font-sans font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="text-center mb-16 pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-4 premium-glow">
          <Plane className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none font-display text-transparent bg-clip-text bg-gradient-to-br from-[#FAFAFA] to-white/40">
          MinikGezgin 🐾
        </h1>
        <p className="text-lg md:text-xl font-sans font-medium text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mt-2">
          Küçük patileri büyük maceralara taşı — Gemini 3.1 Flash Image ile
        </p>
      </header>

      <AnimatePresence>
        {showExportDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#121217] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => setShowExportDialog(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/10 dark:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-3xl font-display text-gray-900 dark:text-white mb-6">{t.exportAlbum}</h2>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Export Name</label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    className="w-full bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Format</label>
                    <div className="flex gap-2">
                       <button onClick={() => setExportFormat('zip')} className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${exportFormat === 'zip' ? 'bg-[#D4AF37] text-gray-900 dark:text-white border-[#D4AF37]' : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10'}`}>ZIP Archive</button>
                       <button onClick={() => setExportFormat('pdf')} className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${exportFormat === 'pdf' ? 'bg-[#D4AF37] text-gray-900 dark:text-white border-[#D4AF37]' : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10'}`}>PDF Document</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="includeDescriptions" checked={exportIncludeDescriptions} onChange={e => setExportIncludeDescriptions(e.target.checked)} className="w-5 h-5 accent-[#D4AF37] rounded" />
                  <label htmlFor="includeDescriptions" className="text-gray-800 dark:text-gray-200 font-sans font-medium">Include descriptions</label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">
                    Select Images ({exportSelectedIds.length} / {destinations.filter(d => d.imageUrl && !d.loading).length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                     {destinations.filter(d => d.imageUrl && !d.loading).map(dest => (
                       <div key={dest.id} onClick={() => setExportSelectedIds(prev => prev.includes(dest.id) ? prev.filter(id => id !== dest.id) : [...prev, dest.id])} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${exportSelectedIds.includes(dest.id) ? 'border-[#D4AF37]' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                         <img src={dest.imageUrl} alt={dest.prompt} className="w-full h-full object-cover" />
                         {exportSelectedIds.includes(dest.id) && <div className="absolute top-2 right-2 bg-[#D4AF37] text-gray-900 dark:text-white p-1 rounded-full"><Check className="w-3 h-3" /></div>}
                       </div>
                     ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-4 border-t border-black/10 dark:border-white/10">
                <button
                  onClick={handleExportSubmit}
                  disabled={isExporting || exportSelectedIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#FBBF24] text-gray-900 dark:text-white py-4 rounded-xl font-display font-medium text-xl tracking-wider transition-all disabled:opacity-50 focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none"
                >
                  {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                  {isExporting ? `Export (${exportProgress}%)` : `Export ${exportSelectedIds.length} Items`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel rounded-3xl shadow-2xl max-w-lg w-full p-8 relative border border-white/20 bg-white/95 dark:bg-[#121217]/95"
            >
              <button 
                onClick={() => setShowAboutModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-600 dark:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mb-4 border border-[#D4AF37]/30">
                  <Plane className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display text-gray-900 dark:text-white">MinikGezgin 🐾</h2>
              </div>
              
              <div className="space-y-4 font-sans text-gray-600 dark:text-gray-300">
                <p>
                  <strong>MinikGezgin</strong> is your ultimate tool to transform everyday photos of your pets (and their favorite objects) into breathtaking travel memories. 
                </p>
                <p>
                  Built to celebrate the adventurers in our lives, even if they never leave the backyard. We use cutting-edge generative AI to place your subjects into fully rendered, beautiful scenes anywhere in the world.
                </p>
                <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-xl mt-6">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-[#D4AF37]" /> AI Model Powered</h3>
                  <p className="text-sm">
                    MinikGezgin leverages <strong>Gemini 3.1 Flash Image</strong> for generating extremely fast and visually stunning, highly photorealistic composite imagery based on your prompts and uploaded assets.
                  </p>
                </div>
              </div>

              <div className="space-x-4 mt-8 flex">
                <a href="/about" className="flex-1 py-3 bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white font-bold rounded-xl text-center border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  More About Us
                </a>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity flex-1"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
<AnimatePresence>
        {showKeyDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
            >
              <button 
                onClick={() => setShowKeyDialog(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/10 dark:bg-white/10 rounded-full transition-colors cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mb-6 border border-[#D4AF37]/30">
                  <Settings className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display text-gray-900 dark:text-white mb-4">API Key Configuration</h2>
                {process.env.GEMINI_API_KEY && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 py-2 px-4 rounded-full w-fit mx-auto mb-4 border border-green-500/20 font-medium">
                    <Check className="w-4 h-4" /> Default API Key Loaded
                  </div>
                )}
                <p className="font-sans font-medium text-gray-600 dark:text-gray-300 mb-6">
                  To generate Gemini 3.1 Flash Image images, you need to select a paid Gemini API key. 
                  This ensures the best performance for your pet's adventure.
                </p>
                
                <div className="bg-red-500/10 rounded-2xl p-4 mb-8 text-left border border-red-500/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Paid Project Required!
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    Imagen 3 generation requires a <strong className="text-gray-900 dark:text-white font-bold">PAID project</strong>. If your API key uses the free tier, image generation will fail!
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 mt-2">
                    Manage your keys and billing directly here:{' '}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline font-bold text-[#D4AF37] hover:text-gray-900 dark:text-white transition-colors block mt-1 break-all"
                    >
                      https://aistudio.google.com/app/apikey
                    </a>
                  </p>
                </div>

                <button 
                  onClick={handleOpenSelectKey}
                  disabled={isKeyLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-2xl bg-[#D4AF37] text-gray-900 dark:text-white font-display text-xl tracking-wider hover:bg-[#FBBF24] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50"
                >
                  {isKeyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Select Custom API Key
                </button>
              </div>
            </motion.div>
          </div>
        )}



        {sharingDestination && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#121217] border border-black/10 dark:border-white/10 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSharingDestination(null)}
                className="absolute top-4 right-4 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-display mb-4 text-gray-900 dark:text-white">{t.share}</h2>
              <img src={sharingDestination.imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl mb-6 shadow-lg" />
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const text = encodeURIComponent(`Check out my pet's adventure to ${sharingDestination.prompt}! 🐾 #minikgezgin #petadventures #aigenerated`);
                    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1A91DA] text-gray-900 dark:text-white py-3 rounded-xl transition-all font-sans font-bold shadow-lg cursor-pointer"
                >
                  {t.shareX}
                </button>
                <button 
                  onClick={async () => {
                    handleDownloadImage(sharingDestination.imageUrl!, `minikgezgin-${sharingDestination.id}`);
                    addToast("Image downloaded! You can now open Instagram and post it.", "success");
                    setSharingDestination(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 hover:opacity-90 text-gray-900 dark:text-white py-3 rounded-xl transition-all font-sans font-bold shadow-lg cursor-pointer"
                >
                  Download for Instagram
                </button>
                <button 
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        const response = await fetch(sharingDestination.imageUrl!);
                        const blob = await response.blob();
                        const file = new File([blob], 'minikgezgin.png', { type: 'image/png' });
                        await navigator.share({
                          title: `MinikGezgin: ${sharingDestination.prompt}`,
                          text: `Check out my pet's adventure to ${sharingDestination.prompt}! 🐾 #minikgezgin #petadventures`,
                          files: [file]
                        });
                      } catch (err) {
                        console.error(err);
                      }
                    } else {
                      addToast("Native sharing not supported here.", "error");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white py-3 rounded-xl border border-black/10 dark:border-white/10 transition-all font-sans font-bold shadow-lg cursor-pointer"
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
          <div 
            className={`tour-step-upload glass-panel p-6 rounded-3xl shadow-xl transition-all duration-300 ring-2 ${isDragging ? 'ring-[#D4AF37] bg-black/10 dark:bg-white/10 scale-105' : 'ring-transparent'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <h2 className="text-2xl font-display mb-4 flex items-center justify-between text-gray-900 dark:text-white">
              <span>1. Upload subjects {isDragging && <span className="text-sm ml-2 text-[#D4AF37]">Drop images here</span>}</span>
            </h2>
            <h3 className="mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">{characterCount}/10 {t.pets} • {objectCount}/20 {t.objects}</span>
            </h3>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {subjects.length === 0 && (
                <div className="text-center py-8 border border-dashed border-black/10 dark:border-white/10 rounded-2xl bg-black/20">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                  <p className="text-sm font-sans font-medium text-white dark:text-black/40 dark:text-white/40">No subjects added yet</p>
                </div>
              )}
              {subjects.map((s, idx) => (
                <div key={s.id} className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5 group hover:border-[#D4AF37]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img src={s.url} alt={s.name} className="w-full h-full object-cover rounded-lg border border-black/10 dark:border-white/10" />
                      <div className="absolute -top-2 -left-2 bg-[#D4AF37] text-gray-900 dark:text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        img_{idx}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <input 
                        type="text" 
                        value={s.name}
                        onChange={(e) => updateSubjectName(s.id, e.target.value)}
                        placeholder={s.type === 'character' ? "Pet's name..." : "Specify object type (e.g. Toy Car)..."}
                        className="w-full bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none border-b border-transparent focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 rounded px-1 transition-all placeholder:text-gray-500 dark:text-gray-400 placeholder:font-normal"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <select 
                          value={s.type} 
                          onChange={(e) => updateSubjectType(s.id, e.target.value as 'character' | 'object')}
                          className="bg-transparent text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300 focus:outline-none border-b border-black/20 dark:border-white/20 focus:border-[#D4AF37] cursor-pointer outline-none"
                        >
                          <option value="character" className="bg-white dark:bg-[#121217]">{t.pet}</option>
                          <option value="object" className="bg-white dark:bg-[#121217]">{t.object}</option>
                        </select>
                        {s.type === 'object' && (
                          <select 
                            value={s.objectCategory || 'Toy'}
                            onChange={(e) => updateSubjectCategory(s.id, e.target.value)}
                            className="bg-transparent text-[10px] uppercase tracking-widest text-[#D4AF37] focus:outline-none border-b border-[#D4AF37]/30 focus:border-[#D4AF37] cursor-pointer outline-none"
                          >
                            <option value="Toy" className="bg-white dark:bg-[#121217]">Toy</option>
                            <option value="Accessory" className="bg-white dark:bg-[#121217]">Accessory</option>
                            <option value="Food" className="bg-white dark:bg-[#121217]">Food</option>
                            <option value="Prop" className="bg-white dark:bg-[#121217]">Prop</option>
                            <option value="Other" className="bg-white dark:bg-[#121217]">Other</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <button 
                        onClick={() => toggleSaveSubject(s)}
                        className={`p-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg focus:opacity-100 focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer ${s.isSaved ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:bg-white/10 hover:text-gray-900 dark:text-white'}`}
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
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 font-display text-lg tracking-wider text-gray-900 dark:text-white hover:bg-black/10 dark:bg-white/10 hover:border-black/20 dark:border-white/20 transition-all disabled:opacity-50 focus:ring-2 focus:ring-white/30 focus:outline-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t.addCh}
              </button>
              <button 
                disabled={objectCount >= 20}
                onClick={() => {
                  setUploadType('object');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 font-display text-lg tracking-wider text-gray-900 dark:text-white hover:bg-black/10 dark:bg-white/10 hover:border-black/20 dark:border-white/20 transition-all disabled:opacity-50 focus:ring-2 focus:ring-white/30 focus:outline-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t.addObj}
              </button>
            </div>

            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-black/10 dark:border-white/10">
               <div className="flex justify-between items-center relative">
                 <button 
                   onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                   className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:text-gray-900 dark:text-white transition-colors"
                 >
                   {t.loadPreset}
                 </button>
                 <button 
                   onClick={() => {
                      if(subjects.length === 0) return;
                      const name = prompt(t.savePresetPrompt);
                      if(name) {
                        const newPresets = [...subjectPresets, {name, subjects}];
                        setSubjectPresets(newPresets);
                        localStorage.setItem('minikgezgin-subject-presets', JSON.stringify(newPresets));
                        addToast(`${t.presetSaved.replace('!', '')} "${name}"!`, 'success');
                      }
                   }}
                   disabled={subjects.length === 0}
                   className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white transition-colors disabled:opacity-50"
                 >
                   {t.savePreset}
                 </button>
                 
               </div>
               {showPresetsMenu && subjectPresets.length > 0 && (
                 <div className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl p-3 grid gap-2">
                    {subjectPresets.map((preset, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-black/5 dark:bg-white/5 rounded-lg">
                        <span className="font-sans font-medium text-gray-900 dark:text-gray-100">{preset.name}</span>
                        <div className="flex gap-2">
                           <button onClick={() => { setSubjects(preset.subjects); setShowPresetsMenu(false); }} className="text-[#D4AF37] hover:text-[#FBBF24]">{t.load}</button>
                           <button onClick={() => {
                             const newPresets = subjectPresets.filter((_, i) => i !== idx);
                             setSubjectPresets(newPresets);
                             localStorage.setItem('minikgezgin-subject-presets', JSON.stringify(newPresets));
                           }} className="text-red-400 hover:text-red-300">{t.del}</button>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              multiple
            />
          </div>

          {/* Configuration */}
          {showAdvanced && (
            <div className="glass-panel p-6 rounded-3xl shadow-xl">
              <h2 className="text-xl font-display mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                <Settings className="w-5 h-5 text-[#D4AF37]" />
                {t.advancedSettings}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">{t.aspectRatio}</label>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map(r => {
                      const [w, h] = r.split(':').map(Number);
                      return (
                        <button
                          key={r}
                          onClick={() => setSelectedAspectRatio(r)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${selectedAspectRatio === r ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-gray-900 dark:text-white' : 'border-black/10 dark:border-white/10 bg-black/30 text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:bg-white/5 hover:text-gray-800 dark:text-gray-200'}`}
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">{t.stylePreset}</label>
                  <div className="relative">
                    <select 
                      value={stylePreset}
                      onChange={(e) => setStylePreset(e.target.value)}
                      className="w-full appearance-none bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-gray-900 dark:text-white focus:outline-none cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                    >
                      <option value="" className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">None (Auto)</option>
                      <option value="Photorealistic" className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">Photorealistic</option>
                      <option value="Cinematic" className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">Cinematic</option>
                      <option value="Anime" className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">Anime</option>
                      <option value="Watercolor" className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">Watercolor</option>
                      <option value="3D Cartoon" className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">3D Cartoon</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-600 dark:text-gray-300" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Negative Prompt</label>
                  <input 
                    type="text" 
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g. text, watermark, blurry..."
                    className="w-full bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Seed (Optional)</label>
                  <input 
                    type="number" 
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Resolution</label>
                  <div className="relative">
                    <select 
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value)}
                      className="w-full appearance-none bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-3 px-4 font-sans font-medium text-gray-900 dark:text-white focus:outline-none cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                    >
                      {RESOLUTIONS.map(r => <option key={r} value={r} className="bg-white dark:bg-[#121217] text-gray-900 dark:text-white">{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleRestart}
            className="w-full py-4 px-6 rounded-2xl border border-black/10 dark:border-white/10 font-display text-xl tracking-wider hover:bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:text-white transition-all flex items-center justify-center gap-2 glass-panel shadow-sm hover:shadow-md focus:ring-2 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer"
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
              <h2 className="text-2xl font-display text-gray-900 dark:text-white flex items-center gap-3">
                <MapPin className="w-6 h-6 text-[#D4AF37]" />
                2. Plan their Adventure
              </h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="tour-step-advanced flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white transition-colors border-b border-black/10 dark:border-white/10 hover:border-white/50 focus:ring-2 focus:ring-[#D4AF37]/30 focus:outline-none focus:border-transparent rounded px-1 cursor-pointer pb-1"
              >
                <Settings className="w-4 h-4" />
                {showAdvanced ? t.hideAdvancedSettings : t.showAdvancedSettings}
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
                  className="w-full bg-transparent border-b border-black/10 dark:border-white/10 py-3 text-2xl text-gray-900 dark:text-white focus:outline-none focus:border-[#D4AF37] font-sans font-medium hover:border-white/30 focus:ring-0 placeholder:text-white dark:text-black/20 dark:text-white/20 transition-colors"
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
                    className="w-full bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl p-5 text-gray-900 dark:text-white min-h-[120px] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-sans font-medium resize-none placeholder:text-white dark:text-black/20 dark:text-white/20 transition-all shadow-inner"
                    disabled={isGenerating}
                  />
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={pastDestinations.length === 0 || isGenerating}
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-3 rounded-xl font-bold text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  >
                    {t.undo}
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={futureDestinations.length === 0 || isGenerating}
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-3 rounded-xl font-bold text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  >
                    {t.redo}
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!currentDestination.trim() || subjects.length === 0 || isGenerating}
                  className="relative overflow-hidden tour-step-generate w-full sm:w-auto bg-[#D4AF37] text-gray-900 dark:text-white px-6 sm:px-12 py-4 rounded-2xl font-display text-xl tracking-widest disabled:opacity-50 disabled:grayscale hover:bg-[#FBBF24] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 focus:ring-4 focus:ring-[#D4AF37]/30 focus:outline-none cursor-pointer"
                >
                  {isGenerating && <div className="absolute inset-y-0 left-0 bg-white/30 dark:bg-black/20 transition-all duration-300 pointer-events-none" style={{ width: `${generateProgress}%` }}></div>}
                  <div className="relative z-10 flex items-center justify-center gap-3">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating... {generateProgress}%
                    </>
                  ) : (
                    <>
                      <Plane className="w-5 h-5" />
                      {t.generate}
                    </>
                  )}
                  </div>
                </button>
              </div>
            </form>

            <div className="tour-step-ai-ideas mt-8 pt-8 border-t border-black/10 dark:border-white/10 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold uppercase tracking-wider text-[#D4AF37]">Inspiration:</p>
                <button
                  type="button"
                  onClick={generateSuggestions}
                  disabled={isGeneratingSuggestions || subjects.length === 0}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white bg-[#D4AF37] px-3 py-1.5 rounded-full hover:bg-[#FBBF24] transition-colors focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer disabled:opacity-50"
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
                             className="text-left text-xs py-2 px-4 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 text-gray-900 dark:text-white transition-all font-sans font-medium focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer"
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
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 mb-3">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {items.map((suggestion, idx) => {
                          const petName = subjects.find(s => s.type === 'character')?.name || "My pet";
                          const displaySuggestion = suggestion.replace("My pet", petName);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCurrentDestination(displaySuggestion)}
                              className="text-left text-xs py-2 px-4 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-[#D4AF37]/50 hover:bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:text-white transition-all font-sans font-medium focus:ring-2 focus:ring-[#D4AF37]/50 focus:outline-none cursor-pointer"
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
                <h2 className="text-3xl sm:text-4xl font-display text-gray-900 dark:text-white">{t.album}</h2>
                <div className="flex items-center gap-4">
                  {destinations.some(d => d.imageUrl) && (
                    <button 
                      onClick={handleOpenExport}
                      className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#D4AF37] hover:text-gray-900 dark:text-white border-b border-transparent hover:border-white pb-1 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      {t.exportAlbum}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent min-w-[150px] flex-1"
                />
                <input
                  type="text"
                  placeholder="Subject name..."
                  value={subjectNameFilter}
                  onChange={(e) => setSubjectNameFilter(e.target.value)}
                  className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent min-w-[150px] flex-1"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent"
                >
                  <option value="all" className="bg-white dark:bg-[#121217]">All Subjects</option>
                  <option value="character" className="bg-white dark:bg-[#121217]">{t.pets}</option>
                  <option value="object" className="bg-white dark:bg-[#121217]">{t.objects}</option>
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent"
                >
                  <option value="all" className="bg-white dark:bg-[#121217]">All Time</option>
                  <option value="today" className="bg-white dark:bg-[#121217]">Today</option>
                  <option value="week" className="bg-white dark:bg-[#121217]">This Week</option>
                </select>
                <select
                  value={historyViewMode}
                  onChange={(e) => setHistoryViewMode(e.target.value as any)}
                  className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent"
                >
                  <option value="all" className="bg-white dark:bg-[#121217]">Full History</option>
                  <option value="favorites" className="bg-white dark:bg-[#121217]">Favorites Only</option>
                </select>
                <select
                  value={historySortOrder}
                  onChange={(e) => setHistorySortOrder(e.target.value as any)}
                  className="bg-black/50 border border-black/10 dark:border-white/10 rounded-xl py-2 px-4 font-sans font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent"
                >
                  <option value="newest" className="bg-white dark:bg-[#121217]">Newest First</option>
                  <option value="oldest" className="bg-white dark:bg-[#121217]">Oldest First</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {filteredDestinations.map((dest) => (
                  <div key={dest.id} className="premium-frame cursor-default group">
                    <div className="premium-frame-content p-4 min-w-0 overflow-hidden flex flex-col h-full bg-white dark:bg-[#121217]">
                      <div 
                        className="bg-black/60 rounded-xl border border-white/5 overflow-hidden relative flex items-center justify-center mb-5 w-full shadow-inner"
                        style={{ aspectRatio: dest.aspectRatio.replace(':', '/') }}
                      >
                        {dest.loading ? (
                          <div className="absolute inset-0 bg-gray-200 dark:bg-black/40 animate-pulse rounded-xl flex flex-col items-center justify-center p-6 overflow-hidden">
                            <div className="absolute inset-y-0 left-0 w-1/2 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent skew-x-[-20deg]" />
                            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mb-4 text-[#D4AF37] flex-shrink-0" />
                            <p className="font-sans font-medium text-sm sm:text-base text-gray-600 dark:text-gray-300 break-words text-center w-full max-w-[80%] line-clamp-3 mb-2 z-10 relative">
                              Generating snap of {dest.prompt}
                            </p>
                            <div className="w-3/4 bg-gray-300 dark:bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden shadow-inner flex items-center justify-start border border-black/5 dark:border-white/5 z-10 relative">
                              <div className="bg-[#D4AF37] h-full transition-all duration-300" style={{ width: `${generateProgress}%` }}></div>
                            </div>
                            <span className="text-xs text-[#D4AF37] mt-2 font-mono z-10 relative">{generateProgress}%</span>
                          </div>
                        ) : dest.error ? (
                          <div className="text-center text-red-400 px-6 py-8">
                            <p className="font-bold mb-2">Adventure Failed</p>
                            <p className="text-sm opacity-80">{dest.error}</p>
                          </div>
                        ) : dest.imageUrl ? (
                          <>
                            <div className={`w-full h-full filter-${dest.filter || 'none'} animate-${dest.animation || 'none'}`}>
                              <img 
                                src={dest.imageUrl} 
                                alt={dest.prompt}
                                className="w-full h-full object-cover rounded-xl transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                              />
                            </div>
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
                        <h3 className="font-display text-xl tracking-wider text-gray-900 dark:text-gray-100 break-words">{dest.prompt}</h3>
                        {dest.description && (
                          <p className="font-sans font-medium text-sm text-[#D4AF37]/80 line-clamp-2 mt-2 break-words">
                            "{dest.description}"
                          </p>
                        )}
                        {dest.imageUrl && (
                          <div className="flex items-center gap-2 mt-4">
                            <select 
                              value={dest.filter || 'none'}
                              onChange={(e) => {
                                setDestinations(prev => prev.map(d => d.id === dest.id ? {...d, filter: e.target.value} : d));
                              }}
                              className="bg-black/50 border border-black/10 dark:border-white/10 rounded-md py-1 px-2 text-xs font-sans text-gray-900 dark:text-white focus:outline-none"
                            >
                              <option value="none">No Filter</option>
                              <option value="vintage">Vintage</option>
                              <option value="retro">Retro</option>
                              <option value="grayscale">Black and White</option>
                            </select>
                            <select 
                              value={dest.animation || 'none'}
                              onChange={(e) => {
                                setDestinations(prev => prev.map(d => d.id === dest.id ? {...d, animation: e.target.value} : d));
                              }}
                              className="bg-black/50 border border-black/10 dark:border-white/10 rounded-md py-1 px-2 text-xs font-sans text-gray-900 dark:text-white focus:outline-none"
                            >
                              <option value="none">Static</option>
                              <option value="parallax">Parallax</option>
                              <option value="shimmer">Shimmer</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between px-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Gemini 3.1 Flash Image</span>
                          <span className="text-[10px] font-mono text-white dark:text-black/40 dark:text-white/40">{new Date(parseInt(dest.id)).toLocaleString()}</span>
                        </div>
                        {dest.imageUrl && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavoriteDestination(dest)}
                              className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 ${dest.isFavorite ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:bg-white/10 hover:text-gray-900 dark:text-white'}`}
                              title={dest.isFavorite ? "Remove Favorite" : "Save as Favorite"}
                            >
                              <Heart className="w-4 h-4" fill={dest.isFavorite ? "currentColor" : "none"} />
                            </button>
                            <div className="relative group">
                              <button
                                className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#D4AF37] hover:bg-black/10 dark:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                                title="Download Image"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-full mb-2 right-0 hidden group-hover:flex flex-col gap-1 bg-white dark:bg-[#121217] border border-black/10 dark:border-white/10 rounded-lg shadow-xl p-1 z-50">
                                <button onClick={() => handleDownloadImage(dest.imageUrl!, `pet-passport-${dest.id}`, 'png')} className="px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-black/10 dark:bg-white/10 rounded text-left w-full whitespace-nowrap">PNG</button>
                                <button onClick={() => handleDownloadImage(dest.imageUrl!, `pet-passport-${dest.id}`, 'jpeg')} className="px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-black/10 dark:bg-white/10 rounded text-left w-full whitespace-nowrap">JPEG</button>
                              </div>
                            </div>
                            <button
                              onClick={() => setSharingDestination(dest)}
                              className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#D4AF37] hover:bg-black/10 dark:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
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
      )}
    </>
  );
}
