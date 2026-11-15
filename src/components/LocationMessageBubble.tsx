import React, { useState } from 'react';
import { MapPin, ExternalLink, Copy, Check, Navigation } from 'lucide-react';
import { ChatMessage, LocationPinMeta } from '../types';

interface LocationMessageBubbleProps {
  msg: ChatMessage;
  isUser: boolean;
}

const PURPOSE_LABELS: Record<NonNullable<LocationPinMeta['purpose']>, string> = {
  delivery: 'Delivery Drop-off',
  meetup: 'Meetup Point',
  artisan_call: 'Artisan Service Pin',
  general: 'Shared Pin Location',
};

export const LocationMessageBubble: React.FC<LocationMessageBubbleProps> = ({ msg, isUser }) => {
  const [copied, setCopied] = useState(false);

  const rawMeta = msg.metadata || {};
  const lat = Number(msg.locationData?.latitude ?? rawMeta.latitude);
  const lng = Number(msg.locationData?.longitude ?? rawMeta.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const addressName =
    msg.locationData?.addressName ||
    (typeof rawMeta.address_name === 'string' ? rawMeta.address_name : undefined) ||
    'Pinned Delivery / Meeting Point';
  const landmarkNote =
    msg.locationData?.landmarkNote ||
    (typeof rawMeta.landmark_note === 'string' ? rawMeta.landmark_note : undefined);
  const accuracyMeters =
    msg.locationData?.accuracyMeters ??
    (typeof rawMeta.accuracy_meters === 'number' ? rawMeta.accuracy_meters : undefined);
  const purpose: NonNullable<LocationPinMeta['purpose']> =
    msg.locationData?.purpose ||
    (rawMeta.purpose as LocationPinMeta['purpose']) ||
    'general';

  const delta = 0.0055;
  const minLon = (lng - delta).toFixed(6);
  const minLat = (lat - delta).toFixed(6);
  const maxLon = (lng + delta).toFixed(6);
  const maxLat = (lat + delta).toFixed(6);

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  const handleCopyCoords = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(coordStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="space-y-2.5 min-w-[250px] max-w-[295px] select-none"
    >
      {/* Header Title + Coordinates */}
      <div
        className={`flex items-center justify-between gap-2 pb-1.5 border-b ${
          isUser ? 'border-white/20' : 'border-black/10 dark:border-white/10'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
          <MapPin
            className={`w-4 h-4 shrink-0 ${
              isUser ? 'text-amber-300' : 'text-rose-600 dark:text-rose-400'
            }`}
          />
          <span className="truncate">{PURPOSE_LABELS[purpose] || 'Shared Pin Location'}</span>
        </div>
        <span
          className={`font-mono tabular-nums text-[10px] shrink-0 ${
            isUser ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </div>

      {/* Zero-Cost OpenStreetMap Interactive Preview + Stylized Fallback */}
      <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-800 border border-black/15 dark:border-white/10">
        {/* Stylized SVG/CSS street-grid fallback visible behind iframe or when offline */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.22),_rgba(15,23,42,0.95))] flex flex-col items-center justify-center text-center p-3"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="w-9 h-9 rounded-full bg-rose-600/20 border border-rose-400/50 flex items-center justify-center mb-1">
            <MapPin className="w-5 h-5 text-rose-400" />
          </div>
          <span className="text-[11px] font-semibold text-white">Map Pin Ready</span>
          <span className="text-[10px] font-mono tabular-nums text-slate-300">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>

        <iframe
          title={`Map pin for ${addressName}`}
          src={osmEmbedUrl}
          loading="lazy"
          className="relative z-10 w-full h-full border-0 pointer-events-none"
        />

        {/* Tap overlay to launch full interactive maps */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${addressName} in Maps`}
          className="absolute inset-0 z-20 flex items-end justify-between p-2.5 bg-gradient-to-t from-black/75 via-black/15 to-transparent hover:from-black/85 transition-colors"
        >
          <span className="text-[11px] font-semibold text-white flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tap to open directions</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-white/90 shrink-0" />
        </a>
      </div>

      {/* Address & Optional Landmark Metadata (Unboxed Typography) */}
      <div className="space-y-0.5">
        <p
          className={`text-xs font-semibold leading-snug break-words ${
            isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {addressName}
        </p>
        {landmarkNote && (
          <p
            className={`text-[11px] leading-snug break-words ${
              isUser ? 'text-purple-100' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {landmarkNote}
          </p>
        )}
        <div
          className={`text-[10px] font-mono tabular-nums flex items-center gap-1.5 pt-0.5 ${
            isUser ? 'text-purple-200' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span>OpenStreetMap Pin</span>
          {accuracyMeters && accuracyMeters > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>±{Math.round(accuracyMeters)}m GPS</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons (Single-line, >= 40px touch target) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
            isUser
              ? 'bg-white text-purple-700 hover:bg-purple-50'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>Open Maps</span>
        </a>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleCopyCoords}
            className={`flex-1 min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition-colors ${
              isUser
                ? 'bg-white/15 hover:bg-white/25 text-white'
                : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100'
            }`}
            title="Copy GPS coordinates"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Coords</span>
              </>
            )}
          </button>
          <a
            href={osmDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View on OpenStreetMap"
            aria-label="View on OpenStreetMap"
            className={`min-h-[40px] min-w-[40px] px-2 rounded-xl flex items-center justify-center transition-colors ${
              isUser
                ? 'bg-white/15 hover:bg-white/25 text-white'
                : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
