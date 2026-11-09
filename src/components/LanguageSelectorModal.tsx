import React from 'react';
import { X, Check, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LanguageCode } from '../types';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, setLanguage } = useApp();

  if (!isOpen) return null;

  const languages: { code: LanguageCode; name: string; native: string; region: string; flag: string }[] = [
    {
      code: 'pcm',
      name: 'Nigerian Pidgin',
      native: 'Naija / West Africa Gist',
      region: 'Nigeria, Ghana, Cameroon',
      flag: '🇳🇬',
    },
    {
      code: 'en',
      name: 'English',
      native: 'Standard English',
      region: 'Pan-African & Global',
      flag: '🌍',
    },
    {
      code: 'sw',
      name: 'Kiswahili',
      native: 'Kiswahili Sanifu',
      region: 'Kenya, Tanzania, Uganda, DRC',
      flag: '🇰🇪',
    },
    {
      code: 'yo',
      name: 'Yorùbá',
      native: 'Èdè Yorùbá',
      region: 'Southwest Nigeria, Benin',
      flag: '🇳🇬',
    },
    {
      code: 'ha',
      name: 'Hausa',
      native: 'Harshen Hausa',
      region: 'Northern Nigeria, Niger, Ghana',
      flag: '🇳🇬',
    },
    {
      code: 'fr',
      name: 'Français',
      native: 'Français d’Afrique',
      region: 'Côte d’Ivoire, Senegal, Cameroon',
      flag: '🇨🇮',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-[#18152e] rounded-2xl p-4 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              App Language
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {languages.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                onClick={() => {
                  setLanguage(item.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 text-slate-900 dark:text-slate-100 font-medium'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{item.flag}</span>
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.native}</div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
