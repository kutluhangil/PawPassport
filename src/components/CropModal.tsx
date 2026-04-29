import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

interface CropModalProps {
  imageUrl: string;
  onClose: () => void;
  onCropSave: (croppedBase64: string) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export default function CropModal({ imageUrl, onClose, onCropSave }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      const image = await createImage(imageUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      onCropSave(base64Image);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 dark:bg-white dark:bg-[#121217] rounded-3xl p-6 w-full max-w-lg border border-black/10 dark:border-white/10 shadow-2xl flex flex-col h-[80vh] max-h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display text-gray-900 dark:text-white">Crop Image</h2>
          <button onClick={onClose} className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-black/10 dark:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative flex-1 rounded-xl overflow-hidden bg-black/50 mb-4">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            classes={{ containerClassName: 'crop-container' }}
          />
        </div>

        <div className="mb-4">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[#D4AF37]"
          />
        </div>

        <div className="flex justify-end gap-3 mt-auto">
          <button onClick={onClose} className="px-6 py-2 rounded-full border border-black/10 dark:border-white/10 text-gray-900 dark:text-white hover:bg-black/5 dark:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 rounded-full bg-[#D4AF37] text-white dark:text-black font-semibold hover:bg-[#ebd273] transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <Check className="w-4 h-4" /> Save Crop
          </button>
        </div>
      </div>
    </div>
  );
}
