import React, { useState } from 'react';
import { X, Upload, Check, Loader2 } from 'lucide-react';
import { updateProfile, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserProfileModal({ user, onClose, onUpdate }: UserProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPEG and PNG are allowed for profile picture.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // extremely compressed base64 (approx 10-20KB max)
        setPhotoURL(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });
      setSuccess('Profile updated successfully!');
      onUpdate();
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 dark:bg-white dark:bg-[#121217] rounded-3xl p-8 w-full max-w-md border border-black/10 dark:border-white/10 shadow-2xl flex flex-col relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-black/10 dark:bg-white/10 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-display text-gray-900 dark:text-white mb-6">Your Profile</h2>
        
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-black/10 dark:border-white/10 group bg-black/50 mb-4 cursor-pointer">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-display text-3xl">
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Upload className="w-6 h-6 text-gray-900 dark:text-white mb-1" />
              <span className="text-[10px] uppercase tracking-widest text-gray-800 dark:text-gray-200">Change</span>
              <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handlePhotoUpload} />
            </label>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-xs">{user.email}</p>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-600 dark:text-gray-300 mb-2">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              placeholder="How should we call you?"
            />
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-400 text-sm mt-2">{success}</p>}
        </div>

        <div className="mt-8">
          <button 
            disabled={loading}
            onClick={handleSave} 
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
