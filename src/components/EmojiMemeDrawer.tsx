import React, { useState } from 'react';
import { X, Smile, Sparkles, Upload, Trash2, Image as ImageIcon, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MOCK_MEME_TEMPLATES } from '../data/mockData';
import { UserUploadedMeme } from '../types';

const POPULAR_AFRICAN_EMOJIS = [
  '🔥', '😂', '🇳🇬', '🇬🇭', '🇰🇪', '💰', '🙏🏾', '💀', '🏃🏾‍♂️', '👀',
  '🫡', '💯', '🤝', '📦', '⚡️', '🤲🏾', '🙌🏾', '👑', '🎉', '💃🏾',
  '🥘', '🍲', '🍗', '🛍️', '📱', '📞', '✨', '🚨', '⚠️', '❤️',
];

export const EmojiMemeDrawer: React.FC = () => {
  const {
    isEmojiMemeDrawerOpen,
    setIsEmojiMemeDrawerOpen,
    userMemes,
    addUserMeme,
    deleteUserMeme,
    sendMemeFromDrawer,
    sendMemeSticker,
    activeChatId,
    sendMessage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'memes' | 'emojis' | 'stickers'>('memes');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newType, setNewType] = useState<'image' | 'gif'>('image');
  const [mediaPreview, setMediaPreview] = useState<string>('');

  if (!isEmojiMemeDrawerOpen || !activeChatId) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/gif') {
      setNewType('gif');
    } else {
      setNewType('image');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setMediaPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMeme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaPreview) {
      alert('Please upload an image or GIF file from your device');
      return;
    }

    addUserMeme({
      title: newTitle.trim() || 'Custom Meme',
      mediaUrl: mediaPreview,
      type: newType,
      tag: newTag.trim() || 'African Humor',
    });

    setNewTitle('');
    setNewTag('');
    setMediaPreview('');
    setShowUploadForm(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    sendMessage(activeChatId, emoji);
  };

  return (
    <div
      onClick={() => setIsEmojiMemeDrawerOpen(false)}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-end justify-center animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl shadow-2xl max-h-[60vh] h-[420px] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

        {/* Top Tab Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('memes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'memes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>My Memes & GIFs ({userMemes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('emojis')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'emojis'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emojis</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stickers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'stickers'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>Nollywood</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEmojiMemeDrawerOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB 1: User Memes & Upload Drawer */}
        {activeTab === 'memes' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Upload Action Strip */}
            <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Tap any uploaded meme to send in chat
                </h4>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                  Upload reaction memes, viral photos & animated GIFs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Upload</span>
              </button>
            </div>

            {/* Upload Modal Drawer */}
            {showUploadForm && (
              <form onSubmit={handleSaveMeme} className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Upload Meme or GIF from Device
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="text-slate-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Meme title (e.g. No Evidence)"
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tag / Slang (e.g. Cut Soap)"
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer py-2 px-3 bg-white dark:bg-slate-800 border-2 border-dashed border-indigo-400/50 hover:border-indigo-600 rounded-xl text-center text-xs text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>Choose Image or GIF</span>
                    <input
                      type="file"
                      accept="image/*,.gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {mediaPreview && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                      <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!mediaPreview}
                  className="w-full py-2 bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save to My Memes
                </button>
              </form>
            )}

            {/* User Memes Grid */}
            <div className="grid grid-cols-3 gap-2 pb-2">
              {userMemes.map((meme) => (
                <div
                  key={meme.id}
                  onClick={() => sendMemeFromDrawer(activeChatId, meme)}
                  className="group relative rounded-xl overflow-hidden aspect-square bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs hover:scale-[1.02] transition-transform"
                >
                  <img
                    src={meme.mediaUrl}
                    alt={meme.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5">
                    <span className="text-[10px] font-bold text-white truncate">
                      {meme.title}
                    </span>
                    {meme.tag && (
                      <span className="text-[8px] font-mono text-amber-300 truncate">
                        #{meme.tag}
                      </span>
                    )}
                  </div>
                  {meme.type === 'gif' && (
                    <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black font-mono">
                      GIF
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteUserMeme(meme.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: African & Popular Emojis */}
        {activeTab === 'emojis' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs text-slate-400 mb-2 font-medium">Frequently Used African Emojis</div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 text-2xl text-center">
              {POPULAR_AFRICAN_EMOJIS.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-transform active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Nollywood Stickers */}
        {activeTab === 'stickers' && (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-2">
              {MOCK_MEME_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    sendMemeSticker(activeChatId, tmpl);
                    setIsEmojiMemeDrawerOpen(false);
                  }}
                  className="rounded-xl overflow-hidden aspect-square bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs hover:scale-[1.02] transition-transform relative"
                >
                  <img src={tmpl.imageUrl} alt={tmpl.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-center">
                    <span className="text-[9px] font-bold text-white truncate block">
                      {tmpl.topText || tmpl.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
