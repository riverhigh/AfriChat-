import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Scan,
  X,
  Flashlight,
  FlashlightOff,
  Upload,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  UserPlus,
  Camera,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { useApp } from '../context/AppContext';
import { DeviceContact } from '../types';

export const ScanQrModal: React.FC = () => {
  const {
    isScanQrModalOpen,
    setIsScanQrModalOpen,
    currentUser,
    addNewDeviceContact,
    startChatWithContact,
    deviceContacts,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'scan' | 'my_qr'>('my_qr');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scanResult, setScanResult] = useState<{
    name: string;
    phone: string;
    avatar?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isAdmin = currentUser.role === 'admin' || currentUser.phoneNumber === '+2340000000000';

  // Generate real unique QR code image for this specific user (universal clickable AGC link)
  useEffect(() => {
    if (!currentUser.phoneNumber) return;

    const contactPayload = encodeURIComponent(
      JSON.stringify({
        app: 'AGC',
        name: currentUser.fullName,
        phone: currentUser.phoneNumber,
        avatar: currentUser.avatarUrl,
        timestamp: Date.now(),
      })
    );

    const qrPayload = `${window.location.origin}/#contact=${contactPayload}`;

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#16082f',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [currentUser]);

  // RULE 3: Component unmount & modal close cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isScanQrModalOpen || activeTab !== 'scan') {
      stopCamera();
    }
  }, [isScanQrModalOpen, activeTab]);

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setIsCameraActive(true);
        requestAnimationFrame(tickScanner);
      }
    } catch (err: any) {
      console.warn('Camera access note (fallback available):', err);
      setIsCameraActive(false);
    }
  };

  // RULE 2: Explicitly stop all media tracks
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
          t.enabled = false;
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Continuous frame analysis for QR code
  const tickScanner = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDecodedQr(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickScanner);
  };

  const handleDecodedQr = (rawText: string) => {
    try {
      const text = rawText.trim();

      // 1. URL with #contact=... or ?contact=...
      if (text.includes('contact=')) {
        const match = text.match(/contact=([^&#]+)/);
        if (match) {
          const jsonStr = decodeURIComponent(match[1]);
          const parsed = JSON.parse(jsonStr);
          if (parsed.phone) {
            const contact = addNewDeviceContact(
              parsed.name || 'AGC User',
              parsed.phone,
              'Scanned via AGC QR',
              true,
              parsed.avatar
            );
            setScanResult({
              name: contact.name,
              phone: contact.normalizedPhoneNumber,
              avatar: contact.avatar,
            });
            stopCamera();
            return;
          }
        }
      }

      // 2. URL with #call=... or #user=... or ?phone=...
      if (text.includes('call=') || text.includes('user=') || text.includes('phone=')) {
        const match = text.match(/(?:call|user|phone)=([^&#]+)/);
        if (match) {
          const phone = decodeURIComponent(match[1]);
          const contact = addNewDeviceContact(`Contact ${phone.slice(-4)}`, phone, 'Added via AGC QR', true);
          setScanResult({
            name: contact.name,
            phone: contact.normalizedPhoneNumber,
            avatar: contact.avatar,
          });
          stopCamera();
          return;
        }
      }

      // 3. Raw JSON format
      if (text.startsWith('{') && text.endsWith('}')) {
        const parsed = JSON.parse(text);
        if (parsed.phone) {
          const contact = addNewDeviceContact(
            parsed.name || 'AGC User',
            parsed.phone,
            'Scanned via AGC QR',
            true,
            parsed.avatar
          );
          setScanResult({
            name: contact.name,
            phone: contact.normalizedPhoneNumber,
            avatar: contact.avatar,
          });
          stopCamera();
          return;
        }
      }

      // 4. Try phone regex match
      const phoneMatch = text.match(/\+?\d{10,14}/);
      if (phoneMatch) {
        const phone = phoneMatch[0];
        const contact = addNewDeviceContact(`Contact ${phone.slice(-4)}`, phone, 'Added via QR Scanner', true);
        setScanResult({
          name: contact.name,
          phone: contact.normalizedPhoneNumber,
          avatar: contact.avatar,
        });
        stopCamera();
        return;
      }

      setErrorMessage(`Scanned: "${text.slice(0, 40)}" (Not a valid AGC contact QR)`);
    } catch (e) {
      setErrorMessage('Could not process this QR code.');
    }
  };

  // Handle photo upload scan
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedQr(code.data);
          } else {
            setErrorMessage('No valid QR code found in this image.');
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCopyLink = () => {
    const contactPayload = encodeURIComponent(
      JSON.stringify({
        app: 'AGC',
        name: currentUser.fullName,
        phone: currentUser.phoneNumber,
        avatar: currentUser.avatarUrl,
        timestamp: Date.now(),
      })
    );
    const link = `${window.location.origin}/#contact=${contactPayload}`;
    navigator.clipboard?.writeText?.(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStartChatWithScanned = () => {
    if (!scanResult) return;
    const existing = deviceContacts.find(
      (c) => c.normalizedPhoneNumber === scanResult.phone || c.rawPhoneNumber === scanResult.phone
    );
    if (existing) {
      setIsScanQrModalOpen(false);
      startChatWithContact(existing);
    } else {
      const contact = addNewDeviceContact(scanResult.name, scanResult.phone, '', true, scanResult.avatar);
      setIsScanQrModalOpen(false);
      startChatWithContact(contact);
    }
  };

  if (!isScanQrModalOpen) return null;

  return (
    <div
      onClick={() => setIsScanQrModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#120726] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-purple-900/50 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Modal Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-purple-900/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Scan & AGC QR Code
              </h3>
              <p className="text-[10px] text-purple-300/70">
                Connect instantly with contacts and verified merchants
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsScanQrModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-purple-950/40 mx-4 mt-3 rounded-2xl shrink-0 border border-purple-500/20">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan');
              setScanResult(null);
              startCamera();
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-purple-300/70'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('my_qr');
              stopCamera();
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'my_qr'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-purple-300/70'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>My Unique QR</span>
          </button>
        </div>

        {/* Scan Result Banner */}
        {scanResult && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs animate-in zoom-in-95 space-y-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">{scanResult.name}</span>
                <span className="text-[11px] font-mono text-emerald-300">{scanResult.phone}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartChatWithScanned}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start Chat Now</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'scan' ? (
            <div className="flex flex-col items-center">
              {/* Interactive Camera Viewfinder */}
              <div className="relative w-full aspect-square max-w-[280px] rounded-3xl overflow-hidden bg-black border-2 border-purple-500/50 shadow-2xl flex flex-col items-center justify-center">
                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  autoPlay
                  playsInline
                  muted
                />

                {/* Placeholder when camera inactive */}
                {!isCameraActive && (
                    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-4 text-center z-10">
                      <Scan className="w-12 h-12 text-purple-400 mx-auto mb-2 opacity-80" />
                      <p className="text-xs text-white/90 font-medium mb-3">Camera is paused</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        Start Camera Scanner
                      </button>
                      <p className="text-[10px] text-purple-300/60 mt-3">
                        Or tap Gallery below to scan an image
                      </p>
                    </div>
                  )}

                {/* Corner Finder Brackets */}
                <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-purple-500 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-purple-500 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-purple-500 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-purple-500 rounded-br-lg pointer-events-none" />

                {/* Laser scan bar */}
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#a855f7] animate-pulse pointer-events-none" />

                {/* Controls overlay */}
                <div className="absolute bottom-3 inset-x-4 flex items-center justify-between z-20">
                  <button
                    type="button"
                    onClick={() => setFlashlightOn(!flashlightOn)}
                    className="p-2.5 rounded-full bg-black/70 text-white backdrop-blur-xs hover:bg-black/90 transition-colors"
                    title="Toggle Flashlight"
                  >
                    {flashlightOn ? (
                      <Flashlight className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FlashlightOff className="w-4 h-4 text-white/70" />
                    )}
                  </button>

                  <label
                    className="p-2.5 rounded-full bg-black/70 text-white backdrop-blur-xs hover:bg-black/90 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Scan image from gallery"
                  >
                    <Upload className="w-4 h-4 text-purple-300" />
                    <span className="text-[11px] pr-1">Gallery</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* My Unique QR Code Card */
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[320px] p-5 rounded-3xl bg-gradient-to-b from-purple-950/40 via-[#160a2b] to-[#110624] border border-purple-500/30 shadow-2xl flex flex-col items-center text-center relative">
                {/* User Avatar */}
                <div className="relative mb-2">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 shadow-lg"
                  />
                  <span className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                    ✓
                  </span>
                </div>

                <h4 className="text-base font-bold text-white leading-tight font-display">
                  {currentUser.fullName || 'AGC User'}
                </h4>
                <p className="text-xs font-mono font-semibold text-purple-300/80 mt-0.5">
                  {currentUser.phoneNumber}
                </p>

                {/* Real Dynamic Unique QR Code */}
                <div className="p-3 bg-white rounded-2xl shadow-xl my-4 flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="My Unique QR"
                      className="w-48 h-48 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  )}
                </div>

                {/* Only admin can see UID. Regular users cannot see UID! */}
                {isAdmin ? (
                  <div className="w-full bg-purple-950/60 border border-purple-500/40 py-2 px-3 rounded-xl flex items-center justify-between font-mono text-xs">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      Admin View · UID:
                    </span>
                    <span className="text-white font-mono text-[11px] truncate max-w-[170px]">
                      {currentUser.id}
                    </span>
                  </div>
                ) : (
                  <div className="w-full bg-purple-950/30 border border-purple-500/20 py-2 px-3 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-purple-300 text-[11px] font-medium">AGC Digital ID</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Peer</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-[320px] grid grid-cols-2 gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-purple-900/40"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Connect with me on AGC',
                        text: `Scan my AGC QR code or call me at ${currentUser.phoneNumber}`,
                        url: window.location.origin,
                      }).catch(() => {});
                    } else {
                      handleCopyLink();
                    }
                  }}
                  className="py-3 px-3 rounded-2xl border border-purple-500/30 hover:bg-purple-900/20 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
