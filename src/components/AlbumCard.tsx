import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Download, Share2, Trash2, MapPin, Sparkles } from 'lucide-react';
import { Adventure } from '../types';

interface AlbumCardProps {
  dest: Adventure;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (url: string, name: string) => void;
  onShare: (dest: Adventure) => void;
  t: any;
}

export default function AlbumCard({ dest, onFavorite, onDelete, onDownload, onShare, t }: AlbumCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
      className="premium-frame group relative"
      style={{ 
        perspective: '1000px'
      }}
    >
      <div className="premium-frame-content flex flex-col bg-white dark:bg-[#121217]">
        <div 
          className="relative aspect-square overflow-hidden"
          style={{
            transform: `rotateY(${mousePos.x * 10}deg) rotateX(${mousePos.y * -10}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          {dest.imageUrl ? (
            <img 
              src={dest.imageUrl} 
              alt={dest.prompt} 
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                dest.filter === 'vintage' ? 'sepia contrast-125' : 
                dest.filter === 'grayscale' ? 'grayscale' : 
                dest.filter === 'retro' ? 'hue-rotate-15 saturate-150' : ''
              }`}
            />
          ) : (
            <div className="w-full h-full bg-black/5 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[#D4AF37] animate-pulse" />
            </div>
          )}
          
          {/* Action Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
            <button 
              onClick={() => onFavorite(dest.id)}
              className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                dest.isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'
              }`}
            >
              <Heart className={`w-5 h-5 ${dest.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={() => onDownload(dest.imageUrl!, `adventure-${dest.id}`)}
              className="p-3 rounded-full bg-white/20 text-white hover:bg-white/40 transition-all transform hover:scale-110"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onShare(dest)}
              className="p-3 rounded-full bg-white/20 text-white hover:bg-white/40 transition-all transform hover:scale-110"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3 h-3 text-[#D4AF37]" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 truncate uppercase tracking-wider">{dest.prompt}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">{dest.description}</p>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 dark:border-white/5">
            <span className="text-[10px] font-mono text-gray-400">
              {new Date(parseInt(dest.id)).toLocaleDateString()}
            </span>
            <button 
              onClick={() => onDelete(dest.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
