import React, { useEffect } from 'react';
import { Sun, Sparkles, X } from 'lucide-react';

export type FillLightTone = 'white' | 'warm' | 'soft';
export type FillLightLayout = 'canvas' | 'ring';

export const FILL_LIGHT_TONES: Record<
  FillLightTone,
  {
    label: string;
    hex: string;
    glowRgba: string;
    ringBorder: string;
    swatchClass: string;
  }
> = {
  white: {
    label: 'Pure White',
    hex: '#FFFFFF',
    glowRgba: 'rgba(255, 255, 255, 0.92)',
    ringBorder: 'border-white',
    swatchClass: 'bg-white',
  },
  warm: {
    label: 'Warm Amber',
    hex: '#FFEED4',
    glowRgba: 'rgba(255, 224, 178, 0.92)',
    ringBorder: 'border-amber-100',
    swatchClass: 'bg-amber-100',
  },
  soft: {
    label: 'Soft Glow',
    hex: '#F2F6FF',
    glowRgba: 'rgba(235, 244, 255, 0.92)',
    ringBorder: 'border-slate-100',
    swatchClass: 'bg-sky-50',
  },
};

interface NightLightBackdropProps {
  active: boolean;
  brightness: number; // 50..100
  tone: FillLightTone;
  layout: FillLightLayout;
}

/**
 * Renders the bright Screen Ring Light / Fill-Light luminous backdrop or border glow.
 * Uses a dark base + variable opacity pure-color layer so 100% = full #FFFFFF / #FFEED4
 * without dimming the floating call card itself.
 */
export const NightLightBackdrop: React.FC<NightLightBackdropProps> = ({
  active,
  brightness,
  tone,
  layout,
}) => {
  useEffect(() => {
    if (!active) return;
    let wakeLock: { release?: () => Promise<void> } | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
          const lock = await nav.wakeLock.request('screen');
          if (cancelled) {
            lock.release().catch(() => {});
          } else {
            wakeLock = lock;
          }
        }
      } catch {
        // WakeLock not supported or denied on this browser; non-fatal
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        wakeLock?.release?.().catch(() => {});
      } catch {
        // ignore
      }
    };
  }, [active]);

  if (!active) return null;

  const toneCfg = FILL_LIGHT_TONES[tone];
  const clampedBrightness = Math.min(100, Math.max(50, brightness));
  const layerOpacity = clampedBrightness / 100;

  if (layout === 'ring') {
    return (
      <div className="absolute inset-0 z-[5] pointer-events-none transition-all duration-300">
        <div
          className="absolute inset-0 rounded-[28px] sm:rounded-[36px]"
          style={{
            opacity: layerOpacity,
            boxShadow: `inset 0 0 0 18px ${toneCfg.hex}, inset 0 0 48px 18px ${toneCfg.glowRgba}`,
            border: `6px solid ${toneCfg.hex}`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-[1] pointer-events-none bg-[#09090d] transition-all duration-300"
      aria-hidden="true"
    >
      <div
        className="w-full h-full transition-colors duration-300"
        style={{
          backgroundColor: toneCfg.hex,
          opacity: layerOpacity,
        }}
      />
    </div>
  );
};

interface NightLightControlsBarProps {
  brightness: number;
  onBrightnessChange: (val: number) => void;
  tone: FillLightTone;
  onToneChange: (tone: FillLightTone) => void;
  layout: FillLightLayout;
  onLayoutChange: (layout: FillLightLayout) => void;
  onClose: () => void;
}

export const NightLightTopControls: React.FC<{
  layout: FillLightLayout;
  onLayoutChange: (layout: FillLightLayout) => void;
  onClose: () => void;
}> = ({ layout, onLayoutChange, onClose }) => (
  <div
    data-no-swap="true"
    className="w-full max-w-md mx-auto flex items-center justify-between gap-2 bg-black/75 backdrop-blur-md border border-black/20 px-3 py-2 rounded-2xl shadow-lg text-white"
  >
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
        <Sun className="w-4 h-4 text-amber-300" />
      </div>
      <div className="text-left leading-tight truncate">
        <div className="text-xs font-bold tracking-tight">Night Fill-Light Active</div>
        <div className="text-[10px] text-white/65">Screen light illuminating your face</div>
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onLayoutChange(layout === 'canvas' ? 'ring' : 'canvas')}
        className="px-2.5 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 text-[11px] font-semibold transition-colors"
        title="Switch between Full Canvas Light and Ring Border"
      >
        {layout === 'canvas' ? 'Ring Mode' : 'Full Light'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold transition-colors"
      >
        Turn Off
      </button>
    </div>
  </div>
);

export const NightLightAdjusterPanel: React.FC<
  Pick<NightLightControlsBarProps, 'brightness' | 'onBrightnessChange' | 'tone' | 'onToneChange'>
> = ({ brightness, onBrightnessChange, tone, onToneChange }) => (
  <div
    data-no-swap="true"
    className="w-full max-w-md mx-auto bg-black/75 backdrop-blur-xl border border-white/15 p-3 rounded-2xl shadow-xl space-y-2.5 text-white"
  >
    {/* Color Temperature Row */}
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-bold text-white/75 shrink-0">Tone</span>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {(Object.keys(FILL_LIGHT_TONES) as FillLightTone[]).map((key) => {
          const item = FILL_LIGHT_TONES[key];
          const selected = tone === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToneChange(key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                selected
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full border border-black/20 ${item.swatchClass}`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Brightness Slider Row */}
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-white/75 shrink-0">Brightness</span>
      <input
        type="range"
        min={50}
        max={100}
        step={1}
        value={brightness}
        onChange={(e) => onBrightnessChange(Number(e.target.value))}
        aria-label="Fill-light brightness"
        className="w-full accent-amber-300 cursor-pointer h-1.5 rounded-lg"
      />
      <span className="text-xs font-mono font-bold tabular-nums w-10 text-right">
        {brightness}%
      </span>
    </div>
  </div>
);

interface LowLightSuggestionBannerProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export const LowLightSuggestionBanner: React.FC<LowLightSuggestionBannerProps> = ({
  visible,
  onEnable,
  onDismiss,
}) => {
  if (!visible) return null;
  return (
    <div
      data-no-swap="true"
      className="mx-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-100 text-xs shadow-lg animate-in fade-in"
    >
      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span className="font-medium">Low light detected</span>
      <button
        type="button"
        onClick={onEnable}
        className="px-2.5 py-0.5 rounded-full bg-white text-black font-bold text-[11px] hover:bg-amber-100 transition-colors"
      >
        Turn On Fill-Light
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss low light suggestion"
        className="p-0.5 rounded-full hover:bg-white/15 text-amber-200/80 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
