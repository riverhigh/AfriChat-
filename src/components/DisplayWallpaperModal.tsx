import React, { useState } from 'react';
import {
  Type,
  Image,
  Upload,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Sliders,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppFontSize } from '../types';

interface DisplayWallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_WALLPAPERS = [
  {
    id: 'ankara',
    title: 'Ankara Heritage',
    url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'lagos_night',
    title: 'Lagos Neon Skyline',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'kente',
    title: 'Kente Weave Texture',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'charcoal',
    title: 'Charcoal Minimalist',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  },
];

export const DisplayWallpaperModal: React.FC<DisplayWallpaperModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    fontSize,
    setFontSize,
    chatWallpaper,
    setChatWallpaper,
    isDarkMode,
    toggleDarkMode,
  } = useApp();

  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB. Please choose a smaller photo.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setChatWallpaper(result);
    };
    reader.readAsDataURL(file);
  };

  const fontOptions: { id: AppFontSize; label: string; desc: string; sizePx: string }[] = [
    { id: 'small', label: 'Small', desc: '14px compact', sizePx: '14px' },
    { id: 'normal', label: 'Normal', desc: '16px default', sizePx: '16px' },
    { id: 'large', label: 'Large', desc: '18px comfortable', sizePx: '18px' },
    { id: 'huge', label: 'Huge', desc: '20px high visibility', sizePx: '20px' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-neutral-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Text Size & Chat Wallpaper
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                Adjust text scale and customize chat background
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 1. TEXT SIZE ADJUSTER */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Text Size Scaling
              </h4>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {fontOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFontSize(opt.id)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    fontSize === opt.id
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-[1.02]'
                      : 'border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[9px] opacity-80 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Live Size Preview Box */}
            <div className="mt-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">
                Live Preview at {fontSize.toUpperCase()}:
              </span>
              <p className="text-slate-800 dark:text-neutral-100 font-medium leading-relaxed">
                "Bros, the original Dutch wax fabric has landed! We hold payment in AfriChat Escrow until you confirm delivery."
              </p>
            </div>
          </div>

          {/* 2. CHAT BACKGROUND & DEVICE UPLOAD */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Chat Background Wallpaper
                </h4>
              </div>

              {chatWallpaper && (
                <button
                  type="button"
                  onClick={() => setChatWallpaper(null)}
                  className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              )}
            </div>

            {/* Device Image Upload Button */}
            <label className="w-full p-4 rounded-2xl border-2 border-dashed border-purple-400/50 dark:border-purple-600/40 hover:bg-purple-500/5 transition-colors flex flex-col items-center justify-center cursor-pointer text-center group">
              <div className="w-10 h-10 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Upload Image from Device
              </span>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                PNG, JPG, or WebP photo up to 8MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadError && (
              <p className="text-xs text-rose-500 font-medium mt-1">
                {uploadError}
              </p>
            )}

            {/* Preset African Wallpapers */}
            <div className="mt-3">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                Or Select African & Dark Presets:
              </span>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_WALLPAPERS.map((preset) => {
                  const isSelected = chatWallpaper === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setChatWallpaper(preset.url)}
                      className={`relative h-20 rounded-2xl overflow-hidden border-2 text-left transition-transform active:scale-95 group ${
                        isSelected
                          ? 'border-purple-600 ring-2 ring-purple-500/40'
                          : 'border-slate-200 dark:border-neutral-800'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                        <span className="text-[11px] font-bold text-white leading-tight">
                          {preset.title}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-purple-600 rounded-full text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat preview with selected wallpaper */}
            <div className="mt-4 p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 relative overflow-hidden bg-slate-900 min-h-[110px] flex flex-col justify-end">
              {chatWallpaper ? (
                <>
                  <img
                    src={chatWallpaper}
                    alt="Wallpaper"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black opacity-90" />
              )}

              <div className="relative z-10 space-y-1.5">
                <div className="self-start max-w-[80%] bg-white/95 dark:bg-neutral-800/95 text-slate-900 dark:text-white p-2 rounded-2xl rounded-bl-xs text-xs shadow-md">
                  Hello! How much for the sneakers?
                </div>
                <div className="self-end ml-auto max-w-[80%] bg-purple-600 text-white p-2 rounded-2xl rounded-br-xs text-xs shadow-md">
                  ₦35,000 via Paystack Escrow. Order confirmed!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-neutral-950 border-t border-slate-200 dark:border-neutral-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
