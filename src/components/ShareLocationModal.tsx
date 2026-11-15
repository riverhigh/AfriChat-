import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Crosshair,
  Send,
  AlertCircle,
  Loader2,
  Navigation,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationPinMeta } from '../types';

const PURPOSE_OPTIONS: { id: NonNullable<LocationPinMeta['purpose']>; label: string }[] = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'meetup', label: 'Meetup' },
  { id: 'artisan_call', label: 'Artisan' },
  { id: 'general', label: 'General' },
];

const QUICK_HUB_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: 'Ikeja City Mall, Lagos', lat: 6.6143, lng: 3.3581 },
  { label: 'Lekki Phase 1, Lagos', lat: 6.4478, lng: 3.4723 },
  { label: 'Wuse II, Abuja', lat: 9.0765, lng: 7.479 },
  { label: 'Osu Oxford St, Accra', lat: 5.5571, lng: -0.1816 },
];

export const ShareLocationModal: React.FC = () => {
  const {
    isShareLocationModalOpen,
    setIsShareLocationModalOpen,
    activeChatId,
    chats,
    sendLocationMessage,
  } = useApp();

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(undefined);
  const [addressName, setAddressName] = useState<string>('');
  const [landmarkNote, setLandmarkNote] = useState<string>('');
  const [purpose, setPurpose] = useState<NonNullable<LocationPinMeta['purpose']>>('delivery');
  const [manualCoordsInput, setManualCoordsInput] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reverseGeocodeOsm = useCallback(async (lat: number, lng: number) => {
    setIsResolvingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4500),
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      const addr = data?.address || {};
      const parts = [
        addr.road || addr.neighbourhood || addr.suburb,
        addr.city || addr.town || addr.state,
        addr.country,
      ].filter(Boolean);
      const formatted = parts.length > 0 ? parts.join(', ') : data?.display_name;
      if (formatted) {
        setAddressName((prev) => prev.trim() || String(formatted).slice(0, 120));
      }
    } catch {
      // Silent fallback when offline or Nominatim rate-limited
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  const detectCurrentGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMsg('Geolocation is not supported in this browser. Pick a hub or enter coordinates below.');
      return;
    }

    setErrorMsg(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(position.coords.accuracy || undefined);
        setManualCoordsInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setIsLocating(false);
        reverseGeocodeOsm(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location permission denied. Allow GPS access or choose a landmark / coordinates below.');
        } else if (err.code === err.TIMEOUT) {
          setErrorMsg('GPS timed out. Retry detection or pick a landmark below.');
        } else {
          setErrorMsg('Unable to read GPS signal right now. Pick a landmark or enter coordinates below.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [reverseGeocodeOsm]);

  useEffect(() => {
    if (isShareLocationModalOpen) {
      setErrorMsg(null);
      detectCurrentGps();
    } else {
      setLatitude(null);
      setLongitude(null);
      setAccuracyMeters(undefined);
      setAddressName('');
      setLandmarkNote('');
      setManualCoordsInput('');
      setErrorMsg(null);
    }
  }, [isShareLocationModalOpen, detectCurrentGps]);

  if (!isShareLocationModalOpen) return null;

  const currentChat = chats.find(
    (c) =>
      c.id === activeChatId ||
      (activeChatId?.startsWith('dm_') && c.phone && activeChatId.includes(c.phone.replace(/\D/g, '')))
  );
  const resolvedChatId = currentChat?.id || activeChatId || '';

  const applyManualCoords = (raw: string) => {
    setManualCoordsInput(raw);
    const parts = raw.split(',').map((p) => Number(p.trim()));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      const [lat, lng] = parts;
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(undefined);
        setErrorMsg(null);
      }
    }
  };

  const handleSelectPreset = (preset: { label: string; lat: number; lng: number }) => {
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setAccuracyMeters(undefined);
    setAddressName(preset.label);
    setManualCoordsInput(`${preset.lat.toFixed(6)}, ${preset.lng.toFixed(6)}`);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedChatId) {
      setErrorMsg('Open a conversation before sharing a pin.');
      return;
    }
    if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setErrorMsg('Detect your GPS pin or enter valid coordinates first.');
      return;
    }

    sendLocationMessage(resolvedChatId, {
      latitude,
      longitude,
      addressName: addressName.trim() || `Pinned Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      landmarkNote: landmarkNote.trim() || undefined,
      accuracyMeters,
      purpose,
      sharedAt: new Date().toISOString(),
    });
    setIsShareLocationModalOpen(false);
  };

  const hasValidCoords = latitude !== null && longitude !== null;
  const delta = 0.0055;
  const osmEmbedUrl = hasValidCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(longitude! - delta).toFixed(6)}%2C${(latitude! - delta).toFixed(6)}%2C${(longitude! + delta).toFixed(6)}%2C${(latitude! + delta).toFixed(6)}&layer=mapnik&marker=${latitude!.toFixed(6)}%2C${longitude!.toFixed(6)}`
    : '';

  return (
    <div
      onClick={() => setIsShareLocationModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display truncate">
                Share Pin Location
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentChat?.name || 'Direct Chat'} · Free OpenStreetMap GPS Pin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsShareLocationModalOpen(false)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Purpose Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pin Purpose
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {PURPOSE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPurpose(opt.id)}
                  className={`min-h-[38px] px-2 py-1.5 rounded-lg font-semibold text-[11px] transition-colors whitespace-nowrap ${
                    purpose === opt.id
                      ? 'bg-white dark:bg-[#231f3d] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Map Preview / GPS Detection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Map Pin Preview
              </span>
              <button
                type="button"
                onClick={detectCurrentGps}
                disabled={isLocating}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 font-semibold text-[11px] flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-60"
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                <span>{isLocating ? 'Getting GPS...' : 'Use Current GPS'}</span>
              </button>
            </div>

            <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
              {hasValidCoords ? (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-slate-300"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                      backgroundSize: '22px 22px',
                    }}
                  >
                    <Navigation className="w-5 h-5 text-purple-400 mb-1" />
                    <span className="text-[11px] font-mono tabular-nums">
                      {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
                    </span>
                  </div>
                  <iframe
                    title="Selected OpenStreetMap pin preview"
                    src={osmEmbedUrl}
                    loading="lazy"
                    className="relative z-10 w-full h-full border-0"
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 text-slate-300 space-y-2">
                  {isLocating ? (
                    <>
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                      <span className="text-xs font-medium">Locating your GPS coordinates...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-6 h-6 text-rose-400" />
                      <span className="text-xs font-medium">
                        Tap &ldquo;Use Current GPS&rdquo; or select a hub below
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {hasValidCoords && (
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                <span>
                  {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
                </span>
                <span>
                  {isResolvingAddress
                    ? 'Resolving street name...'
                    : accuracyMeters
                    ? `±${Math.round(accuracyMeters)}m accuracy`
                    : 'Pin coordinates locked'}
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 flex items-start gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Address & Landmark Note */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location / Address Label
              </label>
              <input
                type="text"
                value={addressName}
                onChange={(e) => setAddressName(e.target.value)}
                placeholder="e.g. Ikeja City Mall, Alausa, Lagos"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Drop-off / Gate Landmark Note (optional)
              </label>
              <input
                type="text"
                value={landmarkNote}
                onChange={(e) => setLandmarkNote(e.target.value)}
                placeholder="e.g. Black gate beside pharmacy, call on arrival"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manual Coordinates (lat, lng) or Quick Hub
              </label>
              <input
                type="text"
                value={manualCoordsInput}
                onChange={(e) => applyManualCoords(e.target.value)}
                placeholder="6.524400, 3.379200"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-2"
              />
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_HUB_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 truncate transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setIsShareLocationModalOpen(false)}
              className="min-h-[44px] py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasValidCoords}
              className="flex-1 min-h-[44px] py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform whitespace-nowrap"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Send Pin Location</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
