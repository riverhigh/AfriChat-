import React, { useState, useEffect } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ isOpen, onClose }) => {
  const { activeChatId, sendVoiceNote, language } = useApp();
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [transcriptPreview, setTranscriptPreview] = useState('');

  const sampleTranscripts: Record<string, string[]> = {
    pcm: [
      "How far! Abeg I wan confirm if the material go fit reach my place before 4pm today?",
      "Good afternoon! Please lock the escrow for the two yards, my dispatch rider go come pick am.",
      "Oga Kofi, make you help me pack the charger together with the phone make nothing shake.",
    ],
    sw: [
      "Habari yako! Tafadhali nahitaji kuthibitisha kama mzigo utafika kabla ya saa kumi leo jioni.",
      "Nimependa rangi ya kijani. Naomba unihifadhie nitaweka pesa kwenye Escrow sasa hivi.",
    ],
    en: [
      "Hello! I am confirming whether this can be dispatched to my office address today via Escrow.",
      "Please hold the item for me, I have deposited the payment in the AfriChat Escrow Vault.",
    ],
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && isRecording) {
      setSeconds(0);
      const chosenList = sampleTranscripts[language] || sampleTranscripts.pcm;
      const randomPrompt = chosenList[Math.floor(Math.random() * chosenList.length)];
      setTranscriptPreview(randomPrompt);

      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, isRecording, language]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!activeChatId) return;
    const dur = Math.max(3, seconds);
    sendVoiceNote(activeChatId, dur, transcriptPreview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-[#18152e] rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Voice Message
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Waveform & Duration */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#11101e] flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 h-10 mb-2">
            {[30, 60, 90, 40, 80, 50, 100, 45, 85, 70, 40, 75, 60, 90, 35].map((h, i) => (
              <span
                key={i}
                style={{
                  height: isRecording ? `${Math.max(10, (h * (seconds % 3 + 1)) / 3)}px` : '12px',
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isRecording ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
            0:{seconds < 10 ? `0${seconds}` : seconds}
          </div>
        </div>

        {/* Live speech-to-text transcript preview */}
        <div className="p-3 bg-slate-50 dark:bg-[#11101e] rounded-xl text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed border border-slate-200/50 dark:border-slate-800">
          &ldquo;{transcriptPreview}&rdquo;
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isRecording ? (
            <button
              onClick={() => setIsRecording(false)}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsRecording(true);
                setSeconds(0);
              }}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Mic className="w-4 h-4" />
              <span>Record again</span>
            </button>
          )}

          <button
            onClick={handleSend}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
