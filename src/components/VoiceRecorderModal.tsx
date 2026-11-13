import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Send, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Web Speech API type declarations (not in all TS lib versions)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
declare const webkitSpeechRecognition: new () => SpeechRecognitionInstance;
declare const SpeechRecognition: new () => SpeechRecognitionInstance;

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ isOpen, onClose }) => {
  const { activeChatId, sendVoiceNote, language } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Map AGC language codes to BCP-47 for Web Speech API
  const langMap: Record<string, string> = {
    en: 'en-NG',
    pcm: 'en-NG',   // Nigerian Pidgin — closest available
    yo: 'yo-NG',
    ha: 'ha-NG',
    sw: 'sw-KE',
    fr: 'fr-FR',
  };

  // RULE 2 & RULE 3: Explicitly stop all audio tracks and cleanup on unmount / cancel
  const stopAllMediaTracks = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('Error stopping audio track:', e);
        }
      });
      mediaStreamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }

    setIsRecording(false);
  };

  // RULE 3: Handle component unmounting safely
  useEffect(() => {
    return () => {
      stopAllMediaTracks();
    };
  }, []);

  // When modal closes, immediately kill any active recording & audio tracks
  useEffect(() => {
    if (!isOpen) {
      stopAllMediaTracks();
      setSeconds(0);
      setLiveTranscript('');
    }
  }, [isOpen]);

  // RULE 1: navigator.mediaDevices.getUserMedia is ONLY triggered inside onClick/mouseDown
  const startRecordingAudio = async () => {
    try {
      setPermissionError(null);
      stopAllMediaTracks();
      setLiveTranscript('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Start MediaRecorder to capture audio blob
      try {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start(250); // collect chunks every 250ms
      } catch (_) {
        // MediaRecorder fallback — some browsers (Firefox mobile) may not support all formats
      }

      // Start Web Speech API for free live transcription (Chrome/Android — no API key needed)
      const SpeechRecognitionCtor = (typeof SpeechRecognition !== 'undefined' ? SpeechRecognition : typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : null);
      if (SpeechRecognitionCtor) {
        const rec = new SpeechRecognitionCtor();
        rec.lang = langMap[language] || 'en-NG';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: SpeechRecognitionEvent) => {
          let full = '';
          for (let i = 0; i < e.results.length; i++) {
            full += e.results[i][0].transcript;
          }
          setLiveTranscript(full);
        };
        rec.onerror = () => {};  // silently ignore (mic already captured)
        rec.onend = () => {};
        try { rec.start(); } catch (_) {}
        recognitionRef.current = rec;
      }

      setIsRecording(true);
      setSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied or busy.';
      console.warn('Microphone permission request error:', err);
      setPermissionError(msg);
      stopAllMediaTracks();
    }
  };

  const handleStopRecording = () => {
    stopAllMediaTracks();
  };

  const handleSend = () => {
    if (!activeChatId) return;
    const dur = Math.max(2, seconds);

    // Build ephemeral blob URL for sender's in-tab playback
    let audioDataUrl: string | undefined;
    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioDataUrl = URL.createObjectURL(blob);
    }

    // transcript is whatever the Web Speech API captured (empty string if unsupported)
    sendVoiceNote(activeChatId, dur, liveTranscript, audioDataUrl);
    audioChunksRef.current = [];
    stopAllMediaTracks();
    onClose();
  };

  const handleClose = () => {
    stopAllMediaTracks();
    onClose();
  };

  if (!isOpen) return null;

  const hasTranscript = liveTranscript.trim().length > 0;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-[#150a26] rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-purple-900/40 text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-display">
              Voice Note
            </h3>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">· expires 24h</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {permissionError && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Waveform & Duration */}
        <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 h-12 mb-2">
            {[30, 60, 90, 40, 80, 50, 100, 45, 85, 70, 40, 75, 60, 90, 35].map((h, i) => (
              <span
                key={i}
                style={{
                  height: isRecording ? `${Math.max(10, (h * ((seconds % 3) + 1)) / 3)}px` : '10px',
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isRecording ? 'bg-purple-600 dark:bg-purple-400' : 'bg-slate-300 dark:bg-purple-900/40'
                }`}
              />
            ))}
          </div>

          <div className="font-mono text-2xl font-black text-slate-900 dark:text-white">
            0:{seconds < 10 ? `0${seconds}` : seconds}
          </div>

          {!isRecording && seconds === 0 && (
            <p className="text-[11px] text-purple-400/80 mt-1 font-medium">
              Tap &ldquo;Start Recording&rdquo; to begin
            </p>
          )}
        </div>

        {/* Live transcript preview (Web Speech API — shown as it comes in while recording) */}
        {isRecording && (
          <div className="min-h-[36px] p-2.5 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl text-xs text-slate-600 dark:text-purple-200/80 italic leading-relaxed border border-purple-200/40 dark:border-purple-900/30">
            {hasTranscript ? (
              <span>&ldquo;{liveTranscript}&rdquo;</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 not-italic">🎤 Transcribing…</span>
            )}
          </div>
        )}

        {/* After stopping: show note that transcript is hidden in bubble until tapped */}
        {!isRecording && seconds > 0 && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>💬</span>
            <span>Transcript hidden in bubble — recipient taps <strong>Transcribe</strong> to reveal.</span>
          </div>
        )}

        {/* Actions (onClick only triggers mic access) */}
        <div className="flex items-center gap-2 pt-1">
          {isRecording ? (
            <button
              type="button"
              onClick={handleStopRecording}
              className="flex-1 py-3 bg-slate-100 dark:bg-purple-900/40 hover:bg-slate-200 text-slate-800 dark:text-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-purple-500/20"
            >
              <Square className="w-4 h-4 fill-current text-rose-500" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecordingAudio}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-sm"
            >
              <Mic className="w-4 h-4" />
              <span>{seconds > 0 ? 'Record again' : 'Start Recording'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={seconds === 0}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
