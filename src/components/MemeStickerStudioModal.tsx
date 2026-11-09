import React, { useState } from 'react';
import { X, Sparkles, Send, Tag, Smile, Type } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MemeSticker } from '../types';
import { MOCK_MEME_TEMPLATES } from '../data/mockData';

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
];

export const MemeStickerStudioModal: React.FC = () => {
  const {
    isMemeStudioOpen,
    setIsMemeStudioOpen,
    sendMemeSticker,
    activeChatId,
  } = useApp();

  const [selectedTemplate, setSelectedTemplate] = useState<MemeSticker>(MOCK_MEME_TEMPLATES[0]);
  const [topText, setTopText] = useState(MOCK_MEME_TEMPLATES[0].topText || '');
  const [bottomText, setBottomText] = useState(MOCK_MEME_TEMPLATES[0].bottomText || '');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!isMemeStudioOpen) return null;

  const handleSelectTemplate = (template: MemeSticker) => {
    setSelectedTemplate(template);
    setTopText(template.topText || '');
    setBottomText(template.bottomText || '');
  };

  const handleApplySlang = (slang: string) => {
    setBottomText(slang);
  };

  const handleSend = () => {
    if (!activeChatId) {
      alert('Please open a chat to send this sticker!');
      return;
    }

    const customMeme: MemeSticker = {
      ...selectedTemplate,
      id: `meme_custom_${Date.now()}`,
      topText,
      bottomText,
    };

    sendMemeSticker(activeChatId, customMeme);
    setIsMemeStudioOpen(false);
  };

  const filteredTemplates = activeCategory === 'All'
    ? MOCK_MEME_TEMPLATES
    : MOCK_MEME_TEMPLATES.filter((m) => m.cultureOrigin === activeCategory);

  return (
    <div
      onClick={() => setIsMemeStudioOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Meme & Sticker Studio
              </h3>
              <p className="text-[10px] text-slate-400">
                Nollywood viral frames & African slang generator
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Live Sticker Preview Card */}
          <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-900 shadow-md border-2 border-indigo-500/40 flex items-center justify-center">
            <img
              src={selectedTemplate.imageUrl}
              alt={selectedTemplate.title}
              className="w-full h-full object-cover"
            />
            {/* Top Text Overlay */}
            {topText && (
              <div className="absolute top-2 inset-x-2 text-center pointer-events-none">
                <span className="font-black text-lg sm:text-xl uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] stroke-black font-sans px-2 py-0.5 rounded">
                  {topText}
                </span>
              </div>
            )}
            {/* Bottom Text Overlay */}
            {bottomText && (
              <div className="absolute bottom-3 inset-x-2 text-center pointer-events-none">
                <span className="font-black text-lg sm:text-xl uppercase tracking-wider text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-sans px-2 py-0.5 rounded">
                  {bottomText}
                </span>
              </div>
            )}
            {/* Origin Badge */}
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
              {selectedTemplate.cultureOrigin}
            </span>
          </div>

          {/* Quick African Slang Pills */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Tap Viral African Slangs to Apply</span>
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {POPULAR_SLANGS.map((slang) => (
                <button
                  key={slang}
                  type="button"
                  onClick={() => handleApplySlang(slang)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60 transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
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
                <Type className="w-3 h-3" /> Top Text
              </label>
              <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="TOP TEXT..."
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs uppercase font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <Type className="w-3 h-3" /> Bottom Text
              </label>
              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="BOTTOM TEXT..."
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs uppercase font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['All', 'Nollywood', 'Street Banter', 'Pidgin Slang'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Nollywood Template Grid */}
          <div className="grid grid-cols-3 gap-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`rounded-xl overflow-hidden cursor-pointer border-2 transition-all aspect-square relative ${
                  selectedTemplate.id === template.id
                    ? 'border-indigo-600 scale-[1.03] shadow-md'
                    : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={template.imageUrl}
                  alt={template.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white px-1 py-0.5 truncate text-center font-semibold">
                  {template.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#121020] flex gap-2">
          <button
            type="button"
            onClick={() => setIsMemeStudioOpen(false)}
            className="py-2.5 px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
          >
            <Send className="w-4 h-4" />
            <span>Send Sticker to Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
