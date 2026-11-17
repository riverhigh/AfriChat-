import { ChatThemeId } from '../types';

export interface ChatThemePreset {
  id: ChatThemeId;
  name: string;
  tagline: string;
  previewGradient: string;
  backgroundStyle: string;
  patternDataUrl?: string;
  accentHex: string;
  isDarkTheme: boolean;
  sentBubbleClass: string;
  headerAccentClass: string;
}

const gridSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M32 0H0v32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/></svg>`
);

const adireSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="none" stroke="rgba(168,85,247,0.12)" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M0 24h48M24 0v48" stroke="rgba(168,85,247,0.07)" stroke-width="1"/></svg>`
);

const circuitSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><path d="M6 6h10v10M38 38H28V28M6 38l10-10M38 6L28 16" fill="none" stroke="rgba(16,185,129,0.14)" stroke-width="1.2"/><circle cx="16" cy="16" r="2" fill="rgba(16,185,129,0.22)"/><circle cx="28" cy="28" r="2" fill="rgba(16,185,129,0.22)"/></svg>`
);

const diagonalBrutalSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M-4 20L20 -4M4 28L28 4" stroke="rgba(244,63,94,0.12)" stroke-width="1.5"/></svg>`
);

export const CHAT_THEME_PRESETS: ChatThemePreset[] = [
  {
    id: 'default',
    name: 'AGC Classic',
    tagline: 'Clean adaptive theme',
    previewGradient: 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)',
    backgroundStyle: '',
    accentHex: '#7c3aed',
    isDarkTheme: false,
    sentBubbleClass: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white',
    headerAccentClass: 'border-slate-200 dark:border-neutral-800',
  },
  {
    id: 'brutalist_obsidian',
    name: 'Brutalist Obsidian',
    tagline: 'Monolith carbon + sharp grid',
    previewGradient: 'linear-gradient(155deg, #050507 0%, #17171f 55%, #09090b 100%)',
    backgroundStyle: 'linear-gradient(155deg, #050507 0%, #14141d 55%, #09090b 100%)',
    patternDataUrl: `url("data:image/svg+xml,${gridSvg}")`,
    accentHex: '#f43f5e',
    isDarkTheme: true,
    sentBubbleClass: 'bg-zinc-900 text-white border border-rose-500/60 shadow-[3px_3px_0px_0px_rgba(244,63,94,0.85)]',
    headerAccentClass: 'border-rose-500/40',
  },
  {
    id: 'neon_lagos',
    name: 'Neon Lagos Night',
    tagline: 'Ultraviolet skyline & cyan pulse',
    previewGradient: 'linear-gradient(145deg, #090218 0%, #2e1065 48%, #0f172a 100%)',
    backgroundStyle: 'linear-gradient(145deg, #090218 0%, #240b52 48%, #091324 100%)',
    patternDataUrl: `url("data:image/svg+xml,${diagonalBrutalSvg}")`,
    accentHex: '#22d3ee',
    isDarkTheme: true,
    sentBubbleClass: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-600 text-white border border-cyan-400/40',
    headerAccentClass: 'border-cyan-400/40',
  },
  {
    id: 'sahara_gold',
    name: 'Sahara Dusk & Gold',
    tagline: 'Deep espresso with warm amber neon',
    previewGradient: 'linear-gradient(145deg, #110b05 0%, #3b1f09 55%, #0c0907 100%)',
    backgroundStyle: 'linear-gradient(145deg, #110b05 0%, #2f1907 55%, #0c0907 100%)',
    patternDataUrl: `url("data:image/svg+xml,${gridSvg}")`,
    accentHex: '#f59e0b',
    isDarkTheme: true,
    sentBubbleClass: 'bg-gradient-to-br from-amber-600 to-orange-700 text-white border border-amber-400/40',
    headerAccentClass: 'border-amber-500/40',
  },
  {
    id: 'emerald_circuit',
    name: 'Emerald Matrix',
    tagline: 'Encrypted cyber-green geometry',
    previewGradient: 'linear-gradient(150deg, #02120c 0%, #063826 52%, #030d0a 100%)',
    backgroundStyle: 'linear-gradient(150deg, #02120c 0%, #052e20 52%, #030d0a 100%)',
    patternDataUrl: `url("data:image/svg+xml,${circuitSvg}")`,
    accentHex: '#10b981',
    isDarkTheme: true,
    sentBubbleClass: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-400/40',
    headerAccentClass: 'border-emerald-500/40',
  },
  {
    id: 'adire_indigo',
    name: 'Adire Indigo Dye',
    tagline: 'Yoruba resist-dye rings in deep slate',
    previewGradient: 'linear-gradient(150deg, #080a1f 0%, #1e1b4b 55%, #0b071c 100%)',
    backgroundStyle: 'linear-gradient(150deg, #080a1f 0%, #1a1744 55%, #0b071c 100%)',
    patternDataUrl: `url("data:image/svg+xml,${adireSvg}")`,
    accentHex: '#a855f7',
    isDarkTheme: true,
    sentBubbleClass: 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border border-purple-400/40',
    headerAccentClass: 'border-purple-500/40',
  },
];

export function getChatThemePreset(themeId?: string | null): ChatThemePreset {
  if (!themeId) return CHAT_THEME_PRESETS[0];
  return CHAT_THEME_PRESETS.find((t) => t.id === themeId) || CHAT_THEME_PRESETS[0];
}
