/**
 * AGC Sound Utilities — Web Audio API generated sounds (no external files)
 */

export type AnimalSound =
  | 'meow'
  | 'bark'
  | 'moo'
  | 'oink'
  | 'quack'
  | 'rooster'
  | 'frog'
  | 'elephant'
  | 'lion'
  | 'monkey';

export const ANIMAL_SOUNDS: { id: AnimalSound; label: string; emoji: string }[] = [
  { id: 'meow',     label: 'Cat Meow',    emoji: '🐱' },
  { id: 'bark',     label: 'Dog Bark',    emoji: '🐶' },
  { id: 'moo',      label: 'Cow Moo',     emoji: '🐄' },
  { id: 'oink',     label: 'Pig Oink',    emoji: '🐷' },
  { id: 'quack',    label: 'Duck Quack',  emoji: '🦆' },
  { id: 'rooster',  label: 'Rooster',     emoji: '🐓' },
  { id: 'frog',     label: 'Frog Croak',  emoji: '🐸' },
  { id: 'elephant', label: 'Elephant',    emoji: '🐘' },
  { id: 'lion',     label: 'Lion Roar',   emoji: '🦁' },
  { id: 'monkey',   label: 'Monkey',      emoji: '🐒' },
];

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

export function playAnimalSound(type: AnimalSound = 'meow') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;

    const note = (
      freq: number,
      start: number,
      dur: number,
      wave: OscillatorType = 'sine',
      vol = 0.3,
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
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.01);
    };

    switch (type) {
      case 'meow':
        note(700, 0, 0.08); note(550, 0.07, 0.22, 'sine', 0.25, 400);
        break;
      case 'bark':
        note(300, 0, 0.07, 'sawtooth', 0.4); note(240, 0.09, 0.1, 'sawtooth', 0.3);
        break;
      case 'moo':
        note(140, 0, 0.6, 'sine', 0.4, 110); note(110, 0.3, 0.4, 'sine', 0.3);
        break;
      case 'oink':
        note(380, 0, 0.09, 'triangle', 0.3); note(330, 0.08, 0.14, 'triangle', 0.25);
        break;
      case 'quack':
        note(480, 0, 0.07, 'sawtooth', 0.3, 400); note(420, 0.09, 0.09, 'sawtooth', 0.25);
        break;
      case 'rooster':
        note(500, 0, 0.1); note(800, 0.1, 0.1); note(600, 0.2, 0.25, 'sine', 0.25, 400);
        break;
      case 'frog':
        note(180, 0, 0.05, 'square', 0.3); note(220, 0.07, 0.05, 'square', 0.25); note(180, 0.14, 0.05, 'square', 0.2);
        break;
      case 'elephant':
        note(90, 0, 0.7, 'sawtooth', 0.5, 70); note(110, 0.1, 0.5, 'sawtooth', 0.35);
        break;
      case 'lion':
        note(90, 0, 0.35, 'sawtooth', 0.5); note(70, 0.25, 0.5, 'sawtooth', 0.4, 50);
        break;
      case 'monkey':
        note(600, 0, 0.07); note(900, 0.08, 0.07); note(600, 0.16, 0.07); note(900, 0.24, 0.07);
        break;
    }
  } catch (_) {}
}

export function getNotificationSound(): AnimalSound {
  return (localStorage.getItem('AGC_notification_sound') as AnimalSound) || 'meow';
}

export function setNotificationSound(sound: AnimalSound) {
  localStorage.setItem('AGC_notification_sound', sound);
}
