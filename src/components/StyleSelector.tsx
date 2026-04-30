import React from 'react';
import { Sparkles } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
  t: any;
}

const STYLES = [
  { id: '', name: 'Default', icon: '🎨' },
  { id: 'cinematic photorealistic, 8k, highly detailed', name: 'Cinematic', icon: '🎬' },
  { id: 'pixar 3d animation style, cute, vibrant colors', name: 'Pixar', icon: '🧸' },
  { id: 'vintage travel poster illustration, flat design', name: 'Vintage Poster', icon: '📍' },
  { id: 'cyberpunk neon aesthetic, futuristic, glowing', name: 'Cyberpunk', icon: '🌃' },
  { id: 'watercolor painting style, soft edges, artistic', name: 'Watercolor', icon: '🖌️' },
  { id: 'studio Ghibli anime style, lush landscapes', name: 'Ghibli', icon: '☁️' },
  { id: 'oil painting, thick brushstrokes, classical', name: 'Oil Painting', icon: '🖼️' },
];

export default function StyleSelector({ selectedStyle, onSelectStyle, t }: StyleSelectorProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
        <Sparkles className="w-3 h-3" /> {t.stylePreset}
      </h4>
      <div className="flex flex-wrap gap-2">
        {STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => onSelectStyle(style.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              selectedStyle === style.id
                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-gray-900 dark:text-white'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#D4AF37]/50'
            }`}
          >
            <span>{style.icon}</span>
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
}
