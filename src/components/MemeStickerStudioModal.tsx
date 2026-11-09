import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Upload,
  Type,
  Scissors,
  Sliders,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MemeSticker } from '../types';

const POPULAR_SLANGS = [
  'NO EVIDENCE YOU GO EXPLAIN TAYA!',
  'WHO DEY BREATHE?!',
  'CUT SOAP FOR ME OH',
  'INVESTOR VIBES ONLY',
  'I CAN EXPLAIN...',
  'GOD WHEN?!',
  'E CHOKE!',
  'WAHALA DEY PRO MAX',
  'SHEGE PRO MAX',
  'PRESSURE TI WA',
  'IDAN NO DEY QUEUE',
];

export const MemeStickerStudioModal: React.FC = () => {
  const {
    isMemeStudioOpen,
    setIsMemeStudioOpen,
    sendMemeSticker,
    activeChatId,
    userMemes,
    addUserMeme,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Uploaded media state (no hardcoded presets)
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);
  const [originalMediaUrl, setOriginalMediaUrl] = useState<string | null>(null);
  const [mediaTitle, setMediaTitle] = useState('My Custom Sticker');
  const [isGif, setIsGif] = useState(false);

  // Background removal state
  const [removeBackground, setRemoveBackground] = useState(false);
  const [tolerance, setTolerance] = useState(38);
  const [whiteOutline, setWhiteOutline] = useState(true);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Meme text overlay
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Process Background Removal using HTML5 Canvas
  useEffect(() => {
    if (!originalMediaUrl) return;

    if (!removeBackground) {
      setCurrentMediaUrl(originalMediaUrl);
      return;
    }

    // Run BG removal algorithm
    setIsProcessingBg(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalMediaUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 600;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setIsProcessingBg(false);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Sample 4 corners to estimate the background color
      const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ];

      let bgR = 0;
      let bgG = 0;
      let bgB = 0;

      corners.forEach(([x, y]) => {
        const idx = (y * width + x) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      });

      bgR = Math.round(bgR / corners.length);
      bgG = Math.round(bgG / corners.length);
      bgB = Math.round(bgB / corners.length);

      const tolSq = tolerance * tolerance * 3;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean distance in RGB color space
        const distSq = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;

        if (distSq < tolSq) {
          // Transparent
          data[i + 3] = 0;
        } else if (distSq < tolSq * 1.5) {
          // Soft feather edge
          const alphaRatio = (distSq - tolSq) / (tolSq * 0.5);
          data[i + 3] = Math.round(data[i + 3] * Math.min(1, Math.max(0, alphaRatio)));
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Optional die-cut white sticker stroke border
      if (whiteOutline) {
        const outlineCanvas = document.createElement('canvas');
        outlineCanvas.width = width;
        outlineCanvas.height = height;
        const oCtx = outlineCanvas.getContext('2d');
        if (oCtx) {
          oCtx.shadowColor = '#ffffff';
          oCtx.shadowBlur = 4;
          for (let dx = -3; dx <= 3; dx += 1.5) {
            for (let dy = -3; dy <= 3; dy += 1.5) {
              if (dx * dx + dy * dy <= 9) {
                oCtx.drawImage(canvas, dx, dy);
              }
            }
          }
          oCtx.drawImage(canvas, 0, 0);
          setCurrentMediaUrl(outlineCanvas.toDataURL('image/png'));
          setIsProcessingBg(false);
          return;
        }
      }

      setCurrentMediaUrl(canvas.toDataURL('image/png'));
      setIsProcessingBg(false);
    };

    img.onerror = () => {
      setIsProcessingBg(false);
      setCurrentMediaUrl(originalMediaUrl);
    };
  }, [originalMediaUrl, removeBackground, tolerance, whiteOutline]);

  if (!isMemeStudioOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    const isImageGif = fileType.includes('gif') || file.name.endsWith('.gif');
    setIsGif(isImageGif);
    setMediaTitle(file.name.replace(/\.[^/.]+$/, '').slice(0, 24));

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const result = event.target.result;
        setOriginalMediaUrl(result);
        setCurrentMediaUrl(result);
        setRemoveBackground(false); // default to original on fresh upload
        showToast('Media uploaded from device! Toggle "Remove Background" to make a transparent sticker.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplySlang = (slang: string) => {
    setBottomText(slang);
  };

  const handleSend = () => {
    if (!currentMediaUrl) {
      alert('Please upload a meme, GIF, or photo from your device first!');
      return;
    }

    if (!activeChatId) {
      alert('Please open a chat to send this sticker!');
      return;
    }

    const customMeme: MemeSticker = {
      id: `meme_custom_${Date.now()}`,
      title: mediaTitle || 'Custom Sticker',
      imageUrl: currentMediaUrl,
      category: removeBackground ? 'Sticker' : 'Meme',
      topText,
      bottomText,
      cultureOrigin: 'User Created',
    };

    // Save into personal sticker pack in AppContext
    addUserMeme({
      title: mediaTitle || 'Custom Sticker',
      mediaUrl: currentMediaUrl,
      type: isGif ? 'gif' : 'image',
      tag: 'My Sticker',
    });

    sendMemeSticker(activeChatId, customMeme);
    setIsMemeStudioOpen(false);
  };

  return (
    <div
      onClick={() => setIsMemeStudioOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-neutral-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
              <Scissors className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-display">
                Meme & Sticker Studio
              </h3>
              <p className="text-[10px] text-slate-400">
                Upload device memes & GIFs · Auto background eraser sticker maker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMemeStudioOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mx-4 mt-2 p-2 rounded-xl bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload From Device Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!currentMediaUrl ? (
            /* Empty State: Prompt User to Upload */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-purple-400/50 dark:border-purple-500/30 rounded-3xl bg-purple-50/40 dark:bg-purple-950/20 text-center cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-all space-y-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Upload Meme, GIF or Photo
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mx-auto mt-1">
                  Choose any image or GIF from your phone or device. You can erase the background with 1 click to turn it into an authentic transparent sticker!
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md pointer-events-none"
              >
                Select from Device
              </button>
            </div>
          ) : (
            /* Live Sticker Preview Card with Transparency Checkerboard */
            <div className="space-y-3">
              <div className="relative rounded-3xl overflow-hidden aspect-4/3 shadow-lg border-2 border-purple-500/40 flex items-center justify-center bg-slate-900">
                {/* Checkerboard Pattern for transparent sticker preview */}
                <div
                  className="absolute inset-0 opacity-40 [background-image:linear-gradient(45deg,#2e2e38_25%,transparent_25%),linear-gradient(-45deg,#2e2e38_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#2e2e38_75%),linear-gradient(-45deg,transparent_75%,#2e2e38_75%)] [background-size:20px_20px] [background-position:0_0,0_10px,10px_-10px,-10px_0px]"
                />

                <img
                  src={currentMediaUrl}
                  alt={mediaTitle}
                  className="relative max-h-full max-w-full object-contain z-10 drop-shadow-xl"
                />

                {/* Top Text Overlay */}
                {topText && (
                  <div className="absolute top-2 inset-x-2 text-center pointer-events-none z-20">
                    <span className="font-black text-lg sm:text-xl uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] stroke-black px-2 py-0.5 rounded font-sans">
                      {topText}
                    </span>
                  </div>
                )}

                {/* Bottom Text Overlay */}
                {bottomText && (
                  <div className="absolute bottom-3 inset-x-2 text-center pointer-events-none z-20">
                    <span className="font-black text-lg sm:text-xl uppercase tracking-wider text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] px-2 py-0.5 rounded font-sans">
                      {bottomText}
                    </span>
                  </div>
                )}

                {/* Badge */}
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1">
                  <span className="text-[10px] font-mono text-white bg-black/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {removeBackground ? '✨ Transparent Sticker' : isGif ? 'GIF Meme' : 'Uploaded Meme'}
                  </span>
                </div>

                {/* Change photo button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold rounded-xl backdrop-blur-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Change File</span>
                </button>
              </div>

              {/* Remove Background Sticker Controls */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Remove Background (Sticker Mode)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                        Auto-cutout transparent background with clean sticker edges
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={removeBackground}
                      onChange={(e) => setRemoveBackground(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {removeBackground && (
                  <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 space-y-2.5 animate-in slide-in-from-top-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3 h-3" /> Cutout Tolerance:
                      </span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{tolerance}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-600 dark:text-neutral-400">
                        Add Vinyl White Sticker Outline
                      </span>
                      <input
                        type="checkbox"
                        checked={whiteOutline}
                        onChange={(e) => setWhiteOutline(e.target.checked)}
                        className="accent-purple-600 w-4 h-4 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick African Slang Pills */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Tap African Slang to Apply as Caption</span>
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {POPULAR_SLANGS.map((slang) => (
                <button
                  key={slang}
                  type="button"
                  onClick={() => handleApplySlang(slang)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-slate-200 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60 transition-colors shrink-0 border border-slate-200 dark:border-neutral-800"
                >
                  {slang}
                </button>
              ))}
            </div>
          </div>

          {/* Text Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <Type className="w-3 h-3" /> Top Text (Optional)
              </label>
              <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="TOP TEXT..."
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs uppercase font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <Type className="w-3 h-3" /> Bottom Text (Optional)
              </label>
              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="BOTTOM TEXT..."
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs uppercase font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* User's Previously Uploaded Stickers/Memes Pack */}
          {userMemes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <span className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 block">
                Your Saved Stickers & Memes ({userMemes.length})
              </span>
              <div className="grid grid-cols-4 gap-2">
                {userMemes.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setOriginalMediaUrl(m.mediaUrl);
                      setCurrentMediaUrl(m.mediaUrl);
                      setMediaTitle(m.title);
                    }}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer relative bg-slate-900 ${
                      currentMediaUrl === m.mediaUrl
                        ? 'border-purple-600 scale-105 shadow-md'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={m.mediaUrl}
                      alt={m.title}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-black flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3.5 bg-slate-200 dark:bg-neutral-900 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-neutral-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New</span>
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!currentMediaUrl}
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send Sticker to Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
