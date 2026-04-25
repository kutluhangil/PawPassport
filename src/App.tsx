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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type Subject = {
  id: string;
  name: string;
  type: 'character' | 'object';
  data: string;
  mimeType: string;
  url: string;
};

type Adventure = {
  id: string;
  prompt: string;
  description: string;
  imageUrl?: string;
  loading: boolean;
  error?: string;
  aspectRatio: string;
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

const SUGGESTIONS = [
  "My pet sitting on a boat in the Ha Long Bay karst islands.",
  "My pet exploring the red torii gates of the Fushimi Inari Shrine.",
  "My pet in front of the 'leaning' houses of Amsterdam."
];

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [destinations, setDestinations] = useState<Adventure[]>([]);
  const [currentDestination, setCurrentDestination] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  
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

  const updateSubjectName = (id: string, name: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, name } : s));
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
              Additional Details: ${description}. 
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

  const handleDownloadAlbum = () => {
    destinations.forEach((dest, index) => {
      if (dest.imageUrl) {
        const link = document.createElement('a');
        link.href = dest.imageUrl;
        link.download = `pet-passport-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleRestart = () => {
    setSubjects([]);
    setDestinations([]);
    setCurrentDestination('');
    setCurrentDescription('');
    setHasStarted(false);
  };

  const handleOpenSelectKey = async () => {
    await (window as any).aistudio?.openSelectKey();
    setShowKeyDialog(false);
  };

  const characterCount = subjects.filter(s => s.type === 'character').length;
  const objectCount = subjects.filter(s => s.type === 'object').length;

  if (!hasStarted) {
    return (
      <div className="max-w-6xl mx-auto pl-4 pr-6 sm:px-8 py-12">
        <header className="text-center mb-20 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border border-[#4E342E]/10 mb-2 shadow-lg"
          >
            <Plane className="w-8 h-8 text-[#4E342E]" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl sm:text-7xl md:text-8xl font-display text-transparent bg-clip-text bg-gradient-to-br from-[#4E342E] to-[#8D6E63] drop-shadow-sm"
          >
            PawPassport
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl font-sans font-medium text-[#6D4C41] max-w-2xl mx-auto"
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
              className={`rainbow-frame cursor-pointer group ${
                idx === 0 ? 'md:-rotate-2' : idx === 1 ? 'md:translate-y-8' : 'md:rotate-2'
              }`}
              onClick={() => {
                setUploadType('character');
                fileInputRef.current?.click();
              }}
            >
              <div className="rainbow-frame-content p-4 transition-transform duration-300">
                <div 
                  className="rounded-xl overflow-hidden mb-5 bg-[#F5F5DC] border border-[#D7CCC8]"
                  style={{ aspectRatio: img.aspect_ratio.replace(':', '/') }}
                >
                  <img 
                    src={img.imageUrl} 
                    alt={img.location} 
                    className="w-full h-full object-cover rounded-xl transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-display text-xl tracking-wider text-[#4E342E] uppercase">{img.location}</h3>
                  <div className="font-sans font-medium text-[#8D6E63] text-sm line-clamp-2 mt-2">
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
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl border border-[#D7CCC8] text-center shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"></div>
            <h2 className="text-3xl font-display mb-4 text-[#4E342E] relative z-10">Start Your Adventure</h2>
            <p className="font-sans font-medium text-[#6D4C41] mb-8 relative z-10">
              Upload a clear photo of your pet to begin their global journey.
            </p>
            
            <button 
              onClick={() => {
                setUploadType('character');
                fileInputRef.current?.click();
              }}
              className="relative z-10 w-full flex items-center justify-center gap-3 py-5 px-8 rounded-2xl bg-[#4E342E] text-white font-display text-xl tracking-wider hover:bg-[#3E2723] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-[#4E342E]/30 focus:outline-none cursor-pointer shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Upload Pet Photo
            </button>

            <div className="relative z-10 mt-8 text-xs leading-relaxed text-left text-[#8D6E63] space-y-3 font-sans font-medium">
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
    );
  }

  return (
    <div className="max-w-6xl mx-auto pl-4 pr-6 sm:px-8 py-12">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border border-[#D7CCC8] shadow-lg bg-white min-w-[280px] sm:min-w-[300px] max-w-[calc(100vw-2rem)]`}
            >
              <div className={`p-2 rounded-full ${toast.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-sm font-sans font-medium text-[#4E342E] leading-tight">
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer text-[#4E342E]"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="text-center mb-16 pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-[#4E342E]/10 mb-4 shadow-sm">
          <Plane className="w-6 h-6 text-[#4E342E]" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none font-display text-[#4E342E]">
          PawPassport
        </h1>
        <p className="text-lg md:text-xl font-sans font-medium text-[#6D4C41] max-w-2xl mx-auto mt-2">
          Send your furry friends on a global adventure with Gemini 3.1 Flash Image
        </p>
      </header>

      <AnimatePresence>
        {showKeyDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#FDFBF7]/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-[#D7CCC8] shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
            >
              <button 
                onClick={() => setShowKeyDialog(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer text-[#8D6E63] hover:text-[#4E342E]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFE082]/30 text-[#FF8F00] mb-6 border border-[#FFE082]">
                  <Settings className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-display text-[#4E342E] mb-4">API Key Required</h2>
                <p className="font-sans font-medium text-[#6D4C41] mb-6">
                  To generate Gemini 3.1 Flash Image images, you need to select a paid Gemini API key. 
                  This ensures the best performance for your pet's adventure.
                </p>
                
                <div className="bg-[#FFF8E1] rounded-2xl p-4 mb-8 text-left border border-[#FFE082]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#FF8F00] mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Important
                  </p>
                  <p className="text-sm leading-relaxed text-[#6D4C41]">
                    Please select an API key from a paid Google Cloud project. 
                    You can manage your keys and billing at the{' '}
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline font-bold text-[#FF8F00] hover:text-[#FF6F00] transition-colors"
                    >
                      Gemini API Billing docs
                    </a>.
                  </p>
                </div>

                <button 
                  onClick={handleOpenSelectKey}
                  className="w-full py-4 px-8 rounded-2xl bg-[#4E342E] text-white font-display text-xl tracking-wider hover:bg-[#3E2723] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-[#4E342E]/20 focus:outline-none cursor-pointer shadow-lg"
                >
                  Select API Key
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
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#D7CCC8] shadow-xl">
            <h2 className="text-2xl font-display mb-4 flex items-center justify-between text-[#4E342E]">
              <span>1. Upload subjects</span>
            </h2>
            <h3 className="mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#8D6E63]">{characterCount}/5 Pets • {objectCount}/14 Objects</span>
            </h3>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {subjects.length === 0 && (
                <div className="text-center py-8 border border-dashed border-[#D7CCC8] rounded-2xl bg-[#F5F5DC]/30">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-[#8D6E63]" />
                  <p className="text-sm font-sans font-medium text-[#8D6E63]">No subjects added yet</p>
                </div>
              )}
              {subjects.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-[#D7CCC8] group shadow-sm hover:border-[#8D6E63] transition-colors">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img src={s.url} alt={s.name} className="w-full h-full object-cover rounded-lg border border-[#D7CCC8]" />
                    <div className="absolute -top-2 -left-2 bg-[#FF8F00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      img_{idx}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input 
                      type="text" 
                      value={s.name}
                      onChange={(e) => updateSubjectName(s.id, e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-[#4E342E] focus:outline-none border-b border-transparent focus:border-[#FF8F00] focus:ring-2 focus:ring-[#FF8F00]/20 rounded px-1 transition-all"
                    />
                    <div className="text-[10px] uppercase tracking-widest text-[#8D6E63] px-1 mt-0.5">{s.type}</div>
                  </div>
                  <button 
                    onClick={() => removeSubject(s.id)}
                    className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-lg focus:opacity-100 focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                disabled={characterCount >= 5}
                onClick={() => {
                  setUploadType('character');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#D7CCC8] bg-[#F5F5DC] font-display text-lg tracking-wider text-[#4E342E] hover:bg-[#EFEBE0] hover:shadow-sm transition-all disabled:opacity-50 focus:ring-2 focus:ring-[#4E342E]/30 focus:outline-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Pet
              </button>
              <button 
                disabled={objectCount >= 14}
                onClick={() => {
                  setUploadType('object');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#D7CCC8] bg-[#F5F5DC] font-display text-lg tracking-wider text-[#4E342E] hover:bg-[#EFEBE0] hover:shadow-sm transition-all disabled:opacity-50 focus:ring-2 focus:ring-[#4E342E]/30 focus:outline-none cursor-pointer"
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
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#D7CCC8] shadow-xl">
              <h2 className="text-xl font-display mb-6 flex items-center gap-2 text-[#4E342E]">
                <Settings className="w-5 h-5 text-[#8D6E63]" />
                Edit settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#8D6E63] mb-2">Aspect Ratio</label>
                  <div className="relative">
                    <select 
                      value={selectedAspectRatio}
                      onChange={(e) => setSelectedAspectRatio(e.target.value)}
                      className="w-full appearance-none bg-white border border-[#D7CCC8] rounded-xl py-3 px-4 font-sans font-medium text-[#4E342E] focus:outline-none cursor-pointer focus:ring-2 focus:ring-[#FF8F00]/50 focus:border-transparent transition-all"
                    >
                      {ASPECT_RATIOS.map(r => <option key={r} value={r} className="bg-white text-[#4E342E]">{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#8D6E63]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#8D6E63] mb-2">Resolution</label>
                  <div className="relative">
                    <select 
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value)}
                      className="w-full appearance-none bg-white border border-[#D7CCC8] rounded-xl py-3 px-4 font-sans font-medium text-[#4E342E] focus:outline-none cursor-pointer focus:ring-2 focus:ring-[#FF8F00]/50 focus:border-transparent transition-all"
                    >
                      {RESOLUTIONS.map(r => <option key={r} value={r} className="bg-white text-[#4E342E]">{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#8D6E63]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleRestart}
            className="w-full py-4 px-6 rounded-2xl border border-[#D7CCC8] font-display text-xl tracking-wider hover:bg-[#F5F5DC] hover:text-[#4E342E] transition-all flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md focus:ring-2 focus:ring-[#4E342E]/30 focus:outline-none cursor-pointer text-[#6D4C41]"
          >
            <RefreshCw className="w-5 h-5" />
            Reset Adventure
          </button>
        </div>

        {/* Right Column: Prompt & Results */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-10 rounded-3xl border border-[#D7CCC8] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FF8F00] to-transparent opacity-30"></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-display text-[#4E342E] flex items-center gap-3">
                <MapPin className="w-6 h-6 text-[#FF8F00]" />
                2. Plan their Adventure
              </h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8D6E63] hover:text-[#4E342E] transition-colors border-b border-[#D7CCC8] hover:border-[#4E342E] focus:ring-2 focus:ring-[#FF8F00]/30 focus:outline-none focus:border-transparent rounded px-1 cursor-pointer pb-1"
              >
                <Settings className="w-4 h-4" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#8D6E63] mb-3">Destination</label>
                <input
                  type="text"
                  value={currentDestination}
                  onChange={(e) => setCurrentDestination(e.target.value)}
                  placeholder="e.g. The Great Wall of China"
                  className="w-full bg-transparent border-b border-[#D7CCC8] py-3 text-2xl text-[#4E342E] focus:outline-none focus:border-[#FF8F00] font-sans font-medium hover:border-[#8D6E63] focus:ring-0 placeholder:text-[#D7CCC8] transition-colors"
                  disabled={isGenerating}
                />
              </div>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#8D6E63] mb-3">Scene Description</label>
                  <textarea
                    value={currentDescription}
                    onChange={(e) => setCurrentDescription(e.target.value)}
                    placeholder="Describe the scene, lighting, and what the subjects are doing..."
                    className="w-full bg-white border border-[#D7CCC8] rounded-2xl p-5 text-[#4E342E] min-h-[120px] focus:outline-none focus:border-[#FF8F00] focus:ring-2 focus:ring-[#FF8F00]/20 font-sans font-medium resize-none placeholder:text-[#D7CCC8] transition-all shadow-inner"
                    disabled={isGenerating}
                  />
                </motion.div>
              )}

              <div className="flex justify-end items-center pt-2">
                <button 
                  type="submit"
                  disabled={!currentDestination.trim() || subjects.length === 0 || isGenerating}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#FF8F00] to-[#FF5722] text-white px-6 sm:px-12 py-4 rounded-2xl font-display text-xl tracking-widest disabled:opacity-50 disabled:grayscale hover:shadow-[0_0_30px_rgba(255,143,0,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 focus:ring-4 focus:ring-[#FF8F00]/30 focus:outline-none cursor-pointer"
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

            <div className="mt-8 pt-8 border-t border-[#D7CCC8] relative z-10">
              <p className="text-sm font-bold uppercase tracking-wider text-[#8D6E63] mb-4">Inspiration:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion, idx) => {
                  const petName = subjects.find(s => s.type === 'character')?.name || "My pet";
                  const displaySuggestion = suggestion.replace("My pet", petName);
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentDestination(displaySuggestion)}
                      className="text-left text-xs py-2 px-4 rounded-full border border-[#D7CCC8] bg-[#F5F5DC] hover:border-[#FF8F00] hover:bg-white text-[#6D4C41] hover:text-[#4E342E] transition-all font-sans font-medium focus:ring-2 focus:ring-[#FF8F00]/50 focus:outline-none cursor-pointer"
                    >
                      "{displaySuggestion}"
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {destinations.length > 0 && (
            <div className="pt-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
                <h2 className="text-3xl sm:text-4xl font-display text-[#4E342E]">Travel Album</h2>
                {destinations.some(d => d.imageUrl) && (
                  <button 
                    onClick={handleDownloadAlbum}
                    className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#8D6E63] hover:text-[#4E342E] border-b border-[#D7CCC8] hover:border-[#4E342E] pb-1 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {destinations.map((dest) => (
                  <div key={dest.id} className="rainbow-frame cursor-default group">
                    <div className="rainbow-frame-content p-4 min-w-0 overflow-hidden flex flex-col h-full bg-[#FDFBF7]">
                      <div 
                        className="bg-[#EFEBE0] rounded-xl border border-[#D7CCC8] overflow-hidden relative flex items-center justify-center mb-5 w-full shadow-inner"
                        style={{ aspectRatio: dest.aspectRatio.replace(':', '/') }}
                      >
                        {dest.loading ? (
                          <div className="text-center p-4 sm:p-8 flex flex-col items-center justify-center w-full h-full text-[#4E342E]">
                            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mb-4 text-[#FF8F00] flex-shrink-0" />
                            <p className="font-sans font-medium text-sm sm:text-base text-[#8D6E63] break-words w-full line-clamp-3">
                              Generating snap of {dest.prompt}
                            </p>
                          </div>
                        ) : dest.error ? (
                          <div className="text-center text-red-500 px-6 py-8">
                            <p className="font-bold mb-2">Adventure Failed</p>
                            <p className="text-sm opacity-80">{dest.error}</p>
                          </div>
                        ) : dest.imageUrl ? (
                          <>
                            <img 
                              src={dest.imageUrl} 
                              alt={dest.prompt}
                              className="w-full h-full object-cover rounded-xl transition-transform duration-700 hover:scale-[1.03]"
                            />
                            <div className="absolute -bottom-2 -right-4 w-28 h-28 opacity-80 mix-blend-multiply pointer-events-none transform -rotate-12 group-hover:-rotate-6 transition-transform duration-500 z-20">
                              <svg viewBox="0 0 100 100" className="w-full h-full text-[#4E342E] fill-current">
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
                        <h3 className="font-display text-xl tracking-wider text-[#4E342E] break-words">{dest.prompt}</h3>
                        {dest.description && (
                          <p className="font-sans font-medium text-sm text-[#8D6E63] line-clamp-2 mt-2 break-words">
                            "{dest.description}"
                          </p>
                        )}
                      </div>
                      <div className="mt-5 pt-4 border-t border-[#D7CCC8] flex justify-between items-center px-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF8F00]">Gemini 3.1 Flash Image</span>
                        <span className="text-[10px] font-mono text-[#8D6E63]">{new Date(parseInt(dest.id)).toLocaleString()}</span>
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
  );
}
