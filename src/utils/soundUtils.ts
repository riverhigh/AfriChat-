/**
 * AGC Sound Utilities — Modern UI Synthesized Chimes, Tones & Pings via Web Audio API
 */

export type NotificationSound =
  | 'chime'
  | 'pulse'
  | 'bubble'
  | 'marimba'
  | 'breeze'
  | 'bell'
  | 'harp'
  | 'radar'
  | 'crystal'
  | 'zen';

// Backward compatibility alias
export type AnimalSound = NotificationSound;

export interface SoundOption {
  id: NotificationSound;
  label: string;
  category: 'Modern' | 'Subtle' | 'Melodic' | 'Classic';
  icon: string;
}

export const NOTIFICATION_SOUNDS: SoundOption[] = [
  { id: 'chime',   label: 'Soft Chime',   category: 'Modern',  icon: '✨' },
  { id: 'pulse',   label: 'Warm Pulse',   category: 'Modern',  icon: '🟣' },
  { id: 'bubble',  label: 'Water Pop',    category: 'Subtle',  icon: '🫧' },
  { id: 'breeze',  label: 'Air Sweep',    category: 'Subtle',  icon: '🍃' },
  { id: 'marimba', label: 'Marimba Tap',  category: 'Melodic', icon: '🎵' },
  { id: 'harp',    label: 'Harp Arp',     category: 'Melodic', icon: '🪕' },
  { id: 'crystal', label: 'Crystal Tone', category: 'Melodic', icon: '💎' },
  { id: 'bell',    label: 'Desk Bell',    category: 'Classic', icon: '🔔' },
  { id: 'radar',   label: 'Echo Radar',   category: 'Classic', icon: '📡' },
  { id: 'zen',     label: 'Zen Bowl',     category: 'Classic', icon: '🧘' },
];

// Compatibility alias for existing imports
export const ANIMAL_SOUNDS = NOTIFICATION_SOUNDS.map(s => ({
  id: s.id,
  label: s.label,
  emoji: s.icon,
}));

export function playSwooshSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

export function playNotificationSound(type: NotificationSound | string = 'chime') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;

    const playTone = (
      freq: number,
      start: number,
      dur: number,
      wave: OscillatorType = 'sine',
      vol = 0.25,
      freqEnd?: number
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, t + start);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + start + dur);
      g.gain.setValueAtTime(vol, t + start);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.02);
    };

    // Normalize legacy animal ids to new sleek sounds
    const soundKey = (type === 'meow' ? 'chime' :
      type === 'bark' ? 'pulse' :
      type === 'moo' ? 'zen' :
      type === 'oink' ? 'bubble' :
      type === 'quack' ? 'marimba' :
      type === 'rooster' ? 'crystal' :
      type === 'frog' ? 'radar' :
      type === 'elephant' ? 'breeze' :
      type === 'lion' ? 'harp' :
      type === 'monkey' ? 'bell' : type) as NotificationSound;

    switch (soundKey) {
      case 'chime':
        // Modern dual high chime (C6 -> G6)
        playTone(1046.5, 0, 0.15, 'sine', 0.25);
        playTone(1567.98, 0.08, 0.28, 'sine', 0.22);
        break;

      case 'pulse':
        // Warm round UI pulse
        playTone(320, 0, 0.06, 'triangle', 0.3, 480);
        playTone(480, 0.05, 0.18, 'sine', 0.25, 240);
        break;

      case 'bubble':
        // Delicate water droplet pop
        playTone(600, 0, 0.04, 'sine', 0.25, 1200);
        playTone(1200, 0.03, 0.08, 'sine', 0.15, 800);
        break;

      case 'breeze':
        // Smooth airy harmonic slide
        playTone(523.25, 0, 0.12, 'sine', 0.18, 659.25);
        playTone(659.25, 0.08, 0.22, 'sine', 0.2, 783.99);
        break;

      case 'marimba':
        // Organic wooden mallet note pair
        playTone(587.33, 0, 0.09, 'triangle', 0.35);
        playTone(880, 0.08, 0.16, 'triangle', 0.3);
        break;

      case 'harp':
        // 3-note ascending harp glissando
        playTone(523.25, 0, 0.12, 'sine', 0.2);
        playTone(659.25, 0.06, 0.15, 'sine', 0.2);
        playTone(783.99, 0.12, 0.25, 'sine', 0.25);
        break;

      case 'crystal':
        // High pure crystal bell
        playTone(1318.51, 0, 0.25, 'sine', 0.25);
        playTone(1760, 0.05, 0.35, 'sine', 0.18);
        break;

      case 'bell':
        // Clear subtle desk bell ping
        playTone(1174.66, 0, 0.35, 'sine', 0.3);
        playTone(2349.32, 0, 0.15, 'sine', 0.08);
        break;

      case 'radar':
        // Digital ambient radar blip
        playTone(880, 0, 0.05, 'sine', 0.25);
        playTone(1760, 0.08, 0.18, 'sine', 0.2);
        break;

      case 'zen':
        // Deep soothing singing bowl vibration
        playTone(261.63, 0, 0.45, 'sine', 0.35);
        playTone(523.25, 0.02, 0.35, 'sine', 0.15);
        break;

      default:
        playTone(1046.5, 0, 0.15, 'sine', 0.25);
        playTone(1567.98, 0.08, 0.25, 'sine', 0.2);
        break;
    }
  } catch (_) {}
}

// Backward compatibility alias for playAnimalSound
export const playAnimalSound = playNotificationSound;

export function getNotificationSound(): NotificationSound {
  const saved = localStorage.getItem('AGC_notification_sound') as any;
  if (!saved) return 'chime';
  // Map legacy animal names if stored in user's browser localStorage
  const map: Record<string, NotificationSound> = {
    meow: 'chime',
    bark: 'pulse',
    moo: 'zen',
    oink: 'bubble',
    quack: 'marimba',
    rooster: 'crystal',
    frog: 'radar',
    elephant: 'breeze',
    lion: 'harp',
    monkey: 'bell',
  };
  return map[saved] || (saved as NotificationSound) || 'chime';
}

export function setNotificationSound(sound: NotificationSound | string) {
  localStorage.setItem('AGC_notification_sound', sound);
}

export function playCreditWinChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      const start = now + idx * 0.065;
      const dur = idx === notes.length - 1 ? 0.38 : 0.16;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  } catch (_) {}
}

