import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Ticket,
  QrCode,
  Plus,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Navigation,
  ExternalLink,
  Upload,
  Wallet,
  CreditCard,
  ShieldCheck,
  Users,
  Trash2,
  ScanLine,
  Crosshair,
  Loader2,
  Sparkles,
  Share2,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { useApp, phonesMatch } from '../context/AppContext';
import { OutsideCategory, OutsideParty, OutsideRsvp } from '../types';
import { openPaystackPopup } from '../services/paystack';
import { getSocket } from '../services/socket';
import { compressChatMediaImage } from '../utils/imageUtils';
import {
  fetchOutsidePartiesFromDb,
  createOutsidePartyInDb,
  fetchOutsideRsvpsFromDb,
  createOutsideRsvpInDb,
  isSupabaseConfigured,
} from '../services/supabase';

interface OutsideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OutsideTab = 'discover' | 'map' | 'passes' | 'host';
type PricingFilter = 'all' | 'free' | 'paid';

const CITY_OPTIONS: { label: string; lat: number; lng: number }[] = [
  { label: 'Lagos Island', lat: 6.4281, lng: 3.4219 },
  { label: 'Lagos Mainland', lat: 6.5569, lng: 3.3489 },
  { label: 'Abuja', lat: 9.0765, lng: 7.479 },
  { label: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { label: 'Ibadan', lat: 7.3775, lng: 3.947 },
];

const CATEGORY_OPTIONS: { id: OutsideCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Vibes' },
  { id: 'party', label: 'Party' },
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'concert', label: 'Concert' },
  { id: 'rave', label: 'Rave' },
  { id: 'tech_mixer', label: 'Tech Mixer' },
  { id: 'hangout', label: 'Hangout' },
];

const CATEGORY_LABELS: Record<OutsideCategory, string> = {
  party: 'Party',
  rooftop: 'Rooftop',
  concert: 'Concert',
  rave: 'Underground Rave',
  tech_mixer: 'Tech Mixer',
  hangout: 'Hangout',
};

const PRESET_FLYERS: { id: string; label: string; url: string }[] = [
  {
    id: 'rooftop',
    label: 'Lagos Rooftop',
    url: '/src/assets/images/outside_lagos_rooftop_1794936815220.jpg',
  },
  {
    id: 'concert',
    label: 'Abuja Concert',
    url: '/src/assets/images/outside_abuja_concert_1794936814833.jpg',
  },
  {
    id: 'rave',
    label: 'Warehouse Rave',
    url: '/src/assets/images/outside_underground_rave_1794936815211.jpg',
  },
];

function formatEventDate(isoStr: string): string {
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return 'Upcoming';
  return dt.toLocaleString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDefaultDateTimeInput(): string {
  const d = new Date(Date.now() + 48 * 3_600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`;
}

function mapSupabasePartyRow(row: any): OutsideParty {
  return {
    id: String(row.id),
    organizerId: String(row.organizer_id || 'agc_host'),
    organizerName: String(row.organizer_name || 'AGC Host'),
    organizerPhone: row.organizer_phone ? String(row.organizer_phone) : undefined,
    organizerVerified: Boolean(row.organizer_verified),
    title: String(row.title || 'Outside Event'),
    description: String(row.description || ''),
    category: (['party', 'concert', 'rave', 'tech_mixer', 'rooftop', 'hangout'].includes(row.category)
      ? row.category
      : 'party') as OutsideCategory,
    city: String(row.city || 'Lagos Island'),
    venueName: String(row.venue_name || 'Venue TBA'),
    address: String(row.address || ''),
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
    isPaid: Boolean(row.is_paid),
    ticketPrice: Number(row.ticket_price || 0),
    currency: (row.currency || 'NGN') as OutsideParty['currency'],
    maxCapacity: row.max_capacity ? Number(row.max_capacity) : null,
    rsvpCount: Number(row.rsvp_count || 0),
    flyerUrl: String(row.flyer_url || PRESET_FLYERS[0].url),
    eventDate: String(row.event_date || new Date().toISOString()),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapSupabaseRsvpRow(row: any): OutsideRsvp {
  return {
    id: String(row.id),
    partyId: String(row.party_id),
    userId: String(row.user_id || ''),
    userName: String(row.user_name || 'Guest'),
    userPhone: row.user_phone ? String(row.user_phone) : undefined,
    ticketCode: String(row.ticket_code),
    status: (row.status || 'confirmed') as OutsideRsvp['status'],
    paymentMethod: (row.payment_method || 'free') as OutsideRsvp['paymentMethod'],
    paymentReference: row.payment_reference ? String(row.payment_reference) : undefined,
    amountPaid: Number(row.amount_paid || 0),
    checkedInAt: row.checked_in_at ? String(row.checked_in_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export const OutsideModal: React.FC<OutsideModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    wallet,
    refreshWalletFromServer,
    addDeviceMediaStatus,
    formatPrice,
  } = useApp();

  const isAdmin =
    currentUser.role === 'admin' ||
    currentUser.isAdmin === true ||
    currentUser.phoneNumber === '+2340000000000';

  const [activeTab, setActiveTab] = useState<OutsideTab>('discover');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<OutsideCategory | 'all'>('all');
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [parties, setParties] = useState<OutsideParty[]>([]);
  const [myRsvps, setMyRsvps] = useState<OutsideRsvp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Map view active pin
  const [focusedPartyId, setFocusedPartyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active ticket pass viewer + QR data URL
  const [activePassModal, setActivePassModal] = useState<{
    rsvp: OutsideRsvp;
    party?: OutsideParty;
  } | null>(null);
  const [passQrUrl, setPassQrUrl] = useState<string>('');

  // Paid checkout confirmation sheet
  const [checkoutParty, setCheckoutParty] = useState<OutsideParty | null>(null);
  const [isBookingId, setIsBookingId] = useState<string | null>(null);

  // Create event form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<OutsideCategory>('party');
  const [formCity, setFormCity] = useState('Lagos Island');
  const [formVenue, setFormVenue] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState<string>('6.4281');
  const [formLng, setFormLng] = useState<string>('3.4219');
  const [formDateTime, setFormDateTime] = useState<string>(getDefaultDateTimeInput);
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [formPrice, setFormPrice] = useState('5000');
  const [formCapacity, setFormCapacity] = useState('200');
  const [formDescription, setFormDescription] = useState('');
  const [formFlyerUrl, setFormFlyerUrl] = useState(PRESET_FLYERS[0].url);
  const [formShareToStory, setFormShareToStory] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isLocatingHost, setIsLocatingHost] = useState(false);

  // Gate Scanner / Check-In verification
  const [scanPartyId, setScanPartyId] = useState<string>('');
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [isVerifyingTicket, setIsVerifyingTicket] = useState(false);
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    rsvp?: OutsideRsvp;
    partyTitle?: string;
  } | null>(null);

  const loadOutsideData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [partiesResp, rsvpsResp, sbParties, sbRsvps] = await Promise.all([
        fetch('/api/outside/parties').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(
          `/api/outside/rsvps?userId=${encodeURIComponent(currentUser.id)}&userPhone=${encodeURIComponent(
            currentUser.phoneNumber || ''
          )}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        isSupabaseConfigured ? fetchOutsidePartiesFromDb() : Promise.resolve({ data: null, error: null }),
        isSupabaseConfigured
          ? fetchOutsideRsvpsFromDb(currentUser.id, currentUser.phoneNumber)
          : Promise.resolve({ data: null, error: null }),
      ]);

      const serverList: OutsideParty[] = Array.isArray(partiesResp?.parties) ? partiesResp.parties : [];
      const sbList: OutsideParty[] = Array.isArray(sbParties?.data)
        ? sbParties.data.map(mapSupabasePartyRow)
        : [];

      // Merge uniquely by id, preferring server counts
      const mergedMap = new Map<string, OutsideParty>();
      sbList.forEach((p) => mergedMap.set(p.id, p));
      serverList.forEach((p) => mergedMap.set(p.id, p));
      const mergedParties = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
      setParties(mergedParties);

      const serverRsvps: OutsideRsvp[] = Array.isArray(rsvpsResp?.rsvps) ? rsvpsResp.rsvps : [];
      const sbRsvpList: OutsideRsvp[] = Array.isArray(sbRsvps?.data)
        ? sbRsvps.data.map(mapSupabaseRsvpRow)
        : [];
      const rsvpMap = new Map<string, OutsideRsvp>();
      sbRsvpList.forEach((r) => rsvpMap.set(r.ticketCode, r));
      serverRsvps.forEach((r) => rsvpMap.set(r.ticketCode, r));
      setMyRsvps(
        Array.from(rsvpMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, currentUser.phoneNumber]);

  useEffect(() => {
    if (!isOpen) return;
    loadOutsideData();
  }, [isOpen, loadOutsideData]);

  // Real-time Socket.IO sync
  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();
    if (!socket) return;

    const onPartyCreated = (party: OutsideParty) => {
      if (!party?.id) return;
      setParties((prev) => {
        const next = [party, ...prev.filter((p) => p.id !== party.id)];
        return next.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      });
    };
    const onPartyDeleted = ({ id }: { id: string }) => {
      if (!id) return;
      setParties((prev) => prev.filter((p) => p.id !== id));
      setMyRsvps((prev) => prev.filter((r) => r.partyId !== id));
    };
    const onRsvpUpdated = (payload: { partyId?: string; rsvpCount?: number; rsvp?: OutsideRsvp }) => {
      if (payload?.partyId && typeof payload.rsvpCount === 'number') {
        setParties((prev) =>
          prev.map((p) => (p.id === payload.partyId ? { ...p, rsvpCount: payload.rsvpCount! } : p))
        );
      }
      if (payload?.rsvp) {
        const updated = payload.rsvp;
        const belongsToMe =
          updated.userId === currentUser.id ||
          (updated.userPhone && phonesMatch(updated.userPhone, currentUser.phoneNumber));
        if (belongsToMe) {
          setMyRsvps((prev) => [updated, ...prev.filter((r) => r.ticketCode !== updated.ticketCode)]);
        }
      }
    };

    socket.on('outside_party_created', onPartyCreated);
    socket.on('outside_party_deleted', onPartyDeleted);
    socket.on('outside_rsvp_updated', onRsvpUpdated);
    return () => {
      socket.off('outside_party_created', onPartyCreated);
      socket.off('outside_party_deleted', onPartyDeleted);
      socket.off('outside_rsvp_updated', onRsvpUpdated);
    };
  }, [isOpen, currentUser.id, currentUser.phoneNumber]);

  // Generate QR Pass image when activePassModal opens
  useEffect(() => {
    if (!activePassModal?.rsvp?.ticketCode) {
      setPassQrUrl('');
      return;
    }
    const { rsvp, party } = activePassModal;
    const qrPayload = JSON.stringify({
      type: 'AGC_OUTSIDE_PASS',
      ticketCode: rsvp.ticketCode,
      partyId: rsvp.partyId,
      event: party?.title || 'Outside Event',
      attendee: rsvp.userName,
    });
    QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      color: { dark: '#18181b', light: '#ffffff' },
    })
      .then((url) => setPassQrUrl(url))
      .catch(() => setPassQrUrl(''));
  }, [activePassModal]);

  const rsvpByPartyId = useMemo(() => {
    const map = new Map<string, OutsideRsvp>();
    myRsvps.forEach((r) => {
      if (r.status !== 'cancelled') map.set(r.partyId, r);
    });
    return map;
  }, [myRsvps]);

  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parties.filter((p) => {
      if (selectedCity !== 'All Cities' && p.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (pricingFilter === 'free' && p.isPaid && p.ticketPrice > 0) return false;
      if (pricingFilter === 'paid' && (!p.isPaid || p.ticketPrice <= 0)) return false;
      if (q) {
        const hay = `${p.title} ${p.venueName} ${p.address} ${p.city} ${p.organizerName} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [parties, selectedCity, selectedCategory, pricingFilter, searchQuery]);

  const hostedByMeParties = useMemo(() => {
    return parties.filter(
      (p) =>
        isAdmin ||
        p.organizerId === currentUser.id ||
        (p.organizerPhone && phonesMatch(p.organizerPhone, currentUser.phoneNumber))
    );
  }, [parties, isAdmin, currentUser.id, currentUser.phoneNumber]);

  const focusedMapParty = useMemo(() => {
    if (focusedPartyId) {
      const hit = filteredParties.find((p) => p.id === focusedPartyId) || parties.find((p) => p.id === focusedPartyId);
      if (hit) return hit;
    }
    return filteredParties.find((p) => p.lat !== null && p.lng !== null) || filteredParties[0] || null;
  }, [focusedPartyId, filteredParties, parties]);

  if (!isOpen) return null;

  const flashNotice = (msg: string) => {
    setActionError(null);
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleCopyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  const completeRsvpBooking = async (
    party: OutsideParty,
    paymentMethod: 'free' | 'wallet' | 'paystack',
    paymentReference?: string
  ) => {
    setIsBookingId(party.id);
    setActionError(null);
    try {
      const res = await fetch('/api/outside/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: party.id,
          userId: currentUser.id,
          userName: currentUser.fullName || 'AGC Guest',
          userPhone: currentUser.phoneNumber,
          paymentMethod,
          paymentReference,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.rsvp) {
        setActionError(data?.error || 'Could not complete RSVP.');
        return;
      }

      const newRsvp: OutsideRsvp = data.rsvp;
      setMyRsvps((prev) => [newRsvp, ...prev.filter((r) => r.ticketCode !== newRsvp.ticketCode)]);
      if (typeof data.rsvpCount === 'number') {
        setParties((prev) =>
          prev.map((p) => (p.id === party.id ? { ...p, rsvpCount: data.rsvpCount } : p))
        );
      }

      if (isSupabaseConfigured) {
        createOutsideRsvpInDb({
          party_id: party.id,
          user_id: currentUser.id,
          user_name: currentUser.fullName || 'AGC Guest',
          user_phone: currentUser.phoneNumber,
          ticket_code: newRsvp.ticketCode,
          payment_method: paymentMethod,
          payment_reference: newRsvp.paymentReference,
          amount_paid: newRsvp.amountPaid,
        }).catch(() => {});
      }

      if (paymentMethod !== 'free') {
        refreshWalletFromServer().catch(() => {});
      }

      setCheckoutParty(null);
      setActivePassModal({ rsvp: newRsvp, party });
      flashNotice(
        data.alreadyBooked
          ? `Your existing pass (${newRsvp.ticketCode}) is ready.`
          : `Pass confirmed! Code: ${newRsvp.ticketCode}`
      );
    } catch (err: any) {
      setActionError(err?.message || 'Network error while booking pass.');
    } finally {
      setIsBookingId(null);
    }
  };

  const handleTriggerPartyAction = (party: OutsideParty) => {
    const existing = rsvpByPartyId.get(party.id);
    if (existing) {
      setActivePassModal({ rsvp: existing, party });
      return;
    }
    if (party.isPaid && party.ticketPrice > 0) {
      setActionError(null);
      setCheckoutParty(party);
    } else {
      completeRsvpBooking(party, 'free');
    }
  };

  const handlePayWithPaystack = (party: OutsideParty) => {
    const userEmail =
      currentUser.email ||
      `${(currentUser.phoneNumber || 'guest').replace(/\D/g, '') || 'guest'}@agc.africa`;
    setIsBookingId(party.id);
    setActionError(null);

    openPaystackPopup({
      email: userEmail,
      amount: party.ticketPrice,
      currency: party.currency || 'NGN',
      metadata: {
        type: 'outside_ticket',
        partyId: party.id,
        partyTitle: party.title,
        userId: currentUser.id,
        phoneNumber: currentUser.phoneNumber,
      },
      onSuccess: (resp) => {
        completeRsvpBooking(party, 'paystack', resp.reference);
      },
      onClose: () => {
        setIsBookingId(null);
      },
      onError: (err) => {
        setIsBookingId(null);
        setActionError(err.message || 'Unable to launch Paystack checkout.');
      },
    });
  };

  const handleCitySelectInForm = (cityLabel: string) => {
    setFormCity(cityLabel);
    const preset = CITY_OPTIONS.find((c) => c.label === cityLabel);
    if (preset) {
      setFormLat(String(preset.lat));
      setFormLng(String(preset.lng));
    }
  };

  const handleDetectHostGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setActionError('GPS location is unavailable in this browser. Using selected city pin.');
      return;
    }
    setIsLocatingHost(true);
    setActionError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(5));
        setFormLng(pos.coords.longitude.toFixed(5));
        setIsLocatingHost(false);
        flashNotice('Pinned current venue coordinates.');
      },
      () => {
        setIsLocatingHost(false);
        setActionError('Could not read GPS signal; using city coordinates.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressChatMediaImage(file);
      setFormFlyerUrl(compressed);
    } catch {
      setActionError('Could not process selected flyer image.');
    }
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!formTitle.trim() || !formVenue.trim() || !formAddress.trim() || !formDateTime) {
      setActionError('Fill in event title, venue name, street address, and date/time.');
      return;
    }

    const parsedLat = parseFloat(formLat);
    const parsedLng = parseFloat(formLng);
    const parsedPrice = formIsPaid ? Math.max(100, Number(formPrice) || 0) : 0;
    const parsedCap = formCapacity.trim() ? Math.max(1, Number(formCapacity) || 0) : null;
    const eventIso = new Date(formDateTime).toISOString();

    setIsCreating(true);
    try {
      const payload = {
        organizerId: currentUser.id,
        organizerName: currentUser.fullName || 'AGC Host',
        organizerPhone: currentUser.phoneNumber,
        organizerAvatar: currentUser.avatarUrl,
        organizerVerified: Boolean(
          currentUser.verificationBadge || currentUser.role === 'admin' || currentUser.role === 'creator'
        ),
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        city: formCity,
        venueName: formVenue.trim(),
        address: formAddress.trim(),
        lat: Number.isFinite(parsedLat) ? parsedLat : null,
        lng: Number.isFinite(parsedLng) ? parsedLng : null,
        isPaid: formIsPaid && parsedPrice > 0,
        ticketPrice: parsedPrice,
        currency: 'NGN' as const,
        maxCapacity: parsedCap,
        flyerUrl: formFlyerUrl || PRESET_FLYERS[0].url,
        eventDate: eventIso,
      };

      const res = await fetch('/api/outside/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.party) {
        setActionError(data?.error || 'Could not publish event.');
        return;
      }

      const created: OutsideParty = data.party;
      setParties((prev) =>
        [created, ...prev.filter((p) => p.id !== created.id)].sort(
          (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        )
      );

      if (isSupabaseConfigured) {
        createOutsidePartyInDb({
          id: created.id,
          organizer_id: created.organizerId,
          organizer_name: created.organizerName,
          organizer_phone: created.organizerPhone,
          organizer_verified: created.organizerVerified,
          title: created.title,
          description: created.description,
          category: created.category,
          city: created.city,
          venue_name: created.venueName,
          address: created.address,
          lat: created.lat,
          lng: created.lng,
          is_paid: created.isPaid,
          ticket_price: created.ticketPrice,
          currency: created.currency,
          max_capacity: created.maxCapacity,
          flyer_url: created.flyerUrl,
          event_date: created.eventDate,
        }).catch(() => {});
      }

      if (formShareToStory) {
        const priceLabel = created.isPaid
          ? `₦${created.ticketPrice.toLocaleString()} tickets`
          : 'Free RSVP';
        addDeviceMediaStatus(
          `OUTSIDE (${created.city}): ${created.title} @ ${created.venueName} · ${formatEventDate(
            created.eventDate
          )} · ${priceLabel}. Grab your pass in Updates → Outside!`,
          created.flyerUrl,
          'image'
        );
      }

      setFormTitle('');
      setFormVenue('');
      setFormAddress('');
      setFormDescription('');
      setActiveTab('discover');
      setSelectedCity('All Cities');
      flashNotice(`"${created.title}" is live on Outside!`);
    } catch (err: any) {
      setActionError(err?.message || 'Error publishing event.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/outside/parties/${encodeURIComponent(partyId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorPhone: currentUser.phoneNumber,
          actorId: currentUser.id,
          isAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setActionError(data?.error || 'Could not remove event.');
        return;
      }
      setParties((prev) => prev.filter((p) => p.id !== partyId));
      flashNotice('Event removed from Outside.');
    } catch {
      setActionError('Network error deleting event.');
    }
  };

  const handleVerifyGateTicket = async (codeOverride?: string) => {
    const raw = (codeOverride ?? scanCodeInput).trim();
    if (!raw) {
      setScanResult({ ok: false, message: 'Enter or upload a ticket QR code first.' });
      return;
    }

    let extractedCode = raw;
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.ticketCode) extractedCode = String(parsed.ticketCode);
      } catch {}
    }

    setIsVerifyingTicket(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/outside/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: extractedCode.toUpperCase(),
          partyId: scanPartyId || undefined,
          scannerPhone: currentUser.phoneNumber,
          scannerId: currentUser.id,
          isAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setScanResult({ ok: false, message: data?.error || 'Invalid or unauthorized ticket pass.' });
        return;
      }
      setScanResult({
        ok: true,
        message: data.alreadyCheckedIn
          ? `Already checked in earlier (${data.rsvp.userName}).`
          : `Verified & Checked In: ${data.rsvp.userName}`,
        rsvp: data.rsvp,
        partyTitle: data.partyTitle,
      });
      setScanCodeInput('');
    } catch {
      setScanResult({ ok: false, message: 'Network error verifying ticket code.' });
    } finally {
      setIsVerifyingTicket(false);
    }
  };

  const handleDecodeQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (decoded?.data) {
          handleVerifyGateTicket(decoded.data);
        } else {
          setScanResult({ ok: false, message: 'No QR code detected in that image.' });
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setScanResult({ ok: false, message: 'Could not read uploaded QR image.' });
    };
    img.src = url;
  };

  const buildOsmEmbedUrl = (lat: number, lng: number) => {
    const delta = 0.012;
    const minLon = (lng - delta).toFixed(5);
    const minLat = (lat - delta).toFixed(5);
    const maxLon = (lng + delta).toFixed(5);
    const maxLat = (lat + delta).toFixed(5);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-zinc-950 text-white rounded-t-3xl sm:rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Editorial Header */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-zinc-950 via-violet-950/70 to-zinc-950 border-b border-zinc-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-violet-300 font-display uppercase">
                  Outside
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Nightlife &amp; Events
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Concerts, rooftops, raves &amp; meetups — RSVP QR passes &amp; city map pins.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Filter by city"
                className="min-h-[38px] bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                <option value="All Cities">All Cities</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 transition-colors"
                aria-label="Close Outside"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {(
              [
                { id: 'discover', label: 'Discover', icon: Sparkles },
                { id: 'map', label: 'Map Pins', icon: MapPin },
                { id: 'passes', label: `Passes (${myRsvps.length})`, icon: QrCode },
                { id: 'host', label: 'Host / Scan', icon: Plus },
              ] as { id: OutsideTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setActiveTab(tab.id);
                  }}
                  className={`min-h-[40px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold transition-colors border ${
                    active
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate tabular-nums">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inline Feedback Banner */}
        {(actionError || actionNotice) && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center justify-between gap-2 border-b shrink-0 ${
              actionError
                ? 'bg-rose-950/60 border-rose-900 text-rose-200'
                : 'bg-emerald-950/60 border-emerald-900 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {actionError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span className="truncate">{actionError || actionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActionNotice(null);
              }}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ─── TAB 1: DISCOVER FEED ─────────────────────────────────────── */}
          {activeTab === 'discover' && (
            <>
              {/* Search + Pricing Segmented Control */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search venue, party, DJ, Lagos, Abuja..."
                    className="w-full min-h-[42px] pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="grid grid-cols-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'free', label: 'Free RSVP' },
                      { id: 'paid', label: 'Paid' },
                    ] as { id: PricingFilter; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPricingFilter(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        pricingFilter === opt.id
                          ? 'bg-violet-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter Row (interactive controls only) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {isLoading && parties.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                  <span className="text-xs">Loading live events across Nigeria...</span>
                </div>
              ) : filteredParties.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-3">
                  <p className="text-sm font-bold text-white">No events match your current filters</p>
                  <p className="text-xs text-zinc-400">
                    Try switching cities or host your own Lagos / Abuja hangout on Outside.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('host')}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Host an Event</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredParties.map((party) => {
                    const myPass = rsvpByPartyId.get(party.id);
                    const isFull = Boolean(party.maxCapacity && party.rsvpCount >= party.maxCapacity);
                    const canDelete =
                      isAdmin ||
                      party.organizerId === currentUser.id ||
                      (party.organizerPhone && phonesMatch(party.organizerPhone, currentUser.phoneNumber));

                    return (
                      <article
                        key={party.id}
                        className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg"
                      >
                        {/* Flyer Media Frame */}
                        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-violet-950 via-zinc-900 to-amber-950 overflow-hidden">
                          <img
                            src={party.flyerUrl}
                            alt={party.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
                                {CATEGORY_LABELS[party.category] || 'Event'} · {party.city}
                              </p>
                              <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                                {party.title}
                              </h3>
                            </div>
                            <span
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-extrabold tabular-nums ${
                                party.isPaid && party.ticketPrice > 0
                                  ? 'bg-amber-400 text-zinc-950'
                                  : 'bg-emerald-400 text-zinc-950'
                              }`}
                            >
                              {party.isPaid && party.ticketPrice > 0
                                ? formatPrice(party.ticketPrice)
                                : 'FREE RSVP'}
                            </span>
                          </div>
                        </div>

                        {/* Card Details & Actions */}
                        <div className="p-4 space-y-3">
                          {party.description && (
                            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                              {party.description}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
                              <span className="truncate tabular-nums">
                                {formatEventDate(party.eventDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="truncate">
                                {party.venueName} · {party.address}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 min-w-0">
                              <span className="font-semibold text-zinc-200 truncate">
                                Hosted by {party.organizerName}
                              </span>
                              {party.organizerVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              )}
                              <span className="text-zinc-600">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Users className="w-3.5 h-3.5 text-zinc-500" />
                                {party.rsvpCount}
                                {party.maxCapacity ? `/${party.maxCapacity}` : ''} going
                              </span>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setFocusedPartyId(party.id);
                                  setActiveTab('map');
                                }}
                                className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Pin</span>
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParty(party.id)}
                                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-300 transition-colors"
                                  aria-label={`Delete ${party.title}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={(isFull && !myPass) || isBookingId === party.id}
                                onClick={() => handleTriggerPartyAction(party)}
                                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors ${
                                  myPass
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : isFull
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                                }`}
                              >
                                {isBookingId === party.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : myPass ? (
                                  <QrCode className="w-3.5 h-3.5" />
                                ) : (
                                  <Ticket className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {myPass
                                    ? 'View QR Pass'
                                    : isFull
                                    ? 'Sold Out'
                                    : party.isPaid && party.ticketPrice > 0
                                    ? `Get Ticket`
                                    : 'RSVP Free'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ─── TAB 2: INTERACTIVE MAP PINS & DIRECTIONS ─────────────────── */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              {focusedMapParty && focusedMapParty.lat !== null && focusedMapParty.lng !== null ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  <div className="relative h-60 w-full bg-zinc-900">
                    <iframe
                      title={`Map pin for ${focusedMapParty.venueName}`}
                      src={buildOsmEmbedUrl(focusedMapParty.lat, focusedMapParty.lng)}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-800">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {focusedMapParty.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {focusedMapParty.venueName} · {focusedMapParty.address}
                      </p>
                      <p className="text-[10px] font-mono tabular-nums text-violet-300 mt-0.5">
                        {focusedMapParty.lat.toFixed(5)}, {focusedMapParty.lng.toFixed(5)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            `dir_${focusedMapParty.id}`,
                            `${focusedMapParty.venueName}, ${focusedMapParty.address} (${focusedMapParty.lat?.toFixed(5)}, ${focusedMapParty.lng?.toFixed(5)})`
                          )
                        }
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        {copiedKey === `dir_${focusedMapParty.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === `dir_${focusedMapParty.id}` ? 'Copied' : 'Copy Directions'}</span>
                      </button>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${focusedMapParty.lat}&mlon=${focusedMapParty.lng}#map=16/${focusedMapParty.lat}/${focusedMapParty.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400">
                  No map-pinned events found for {selectedCity}.
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Event Pins ({filteredParties.length})
                </h4>
                {filteredParties.map((p) => {
                  const selected = focusedMapParty?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFocusedPartyId(p.id)}
                      className={`w-full text-left p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        selected
                          ? 'bg-violet-950/40 border-violet-500'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          <MapPin className={`w-4 h-4 ${selected ? 'text-violet-400' : 'text-amber-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{p.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {p.venueName} · {p.city}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-zinc-300 shrink-0">
                        {p.isPaid && p.ticketPrice > 0 ? formatPrice(p.ticketPrice) : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── TAB 3: MY RSVP QR PASSES ─────────────────────────────────── */}
          {activeTab === 'passes' && (
            <div className="space-y-3">
              {myRsvps.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-3">
                  <QrCode className="w-8 h-8 text-violet-400 mx-auto" />
                  <p className="text-sm font-bold text-white">No active passes yet</p>
                  <p className="text-xs text-zinc-400">
                    RSVP to a free hangout or grab a ticket in Discover to generate your gate QR pass.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white"
                  >
                    Browse Events
                  </button>
                </div>
              ) : (
                myRsvps.map((rsvp) => {
                  const party = parties.find((p) => p.id === rsvp.partyId);
                  return (
                    <div
                      key={rsvp.id}
                      className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
                          {rsvp.status === 'checked_in' ? 'Checked In' : 'Confirmed Entry Pass'} ·{' '}
                          <span className="font-mono">{rsvp.ticketCode}</span>
                        </p>
                        <h4 className="text-sm font-extrabold text-white truncate">
                          {party?.title || 'Outside Event'}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {party
                            ? `${party.venueName} · ${formatEventDate(party.eventDate)}`
                            : `Booked ${formatEventDate(rsvp.createdAt)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePassModal({ rsvp, party })}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Open Pass</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── TAB 4: HOST EVENT + GATE SCANNER CHECK-IN ────────────────── */}
          {activeTab === 'host' && (
            <div className="space-y-5">
              {/* Gate Scanner Section (for hosts & admins) */}
              <section className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                      <ScanLine className="w-4 h-4 text-violet-400" />
                      <span>Gate Pass Check-In Scanner</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Verify guest ticket codes or upload a guest QR screenshot at the door.
                    </p>
                  </div>
                </div>

                {hostedByMeParties.length > 0 && (
                  <select
                    value={scanPartyId}
                    onChange={(e) => setScanPartyId(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Any of my hosted events</option>
                    {hostedByMeParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.rsvpCount} passes)
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanCodeInput}
                    onChange={(e) => setScanCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter ticket code e.g. OUT-7K9M2P"
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingTicket}
                    onClick={() => handleVerifyGateTicket()}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shrink-0"
                  >
                    {isVerifyingTicket ? 'Checking...' : 'Check In'}
                  </button>
                </div>

                <label className="min-h-[40px] w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-dashed border-zinc-700 hover:border-violet-500 text-xs text-zinc-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-violet-400" />
                  <span>Scan Guest QR Image from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDecodeQrImage}
                    className="hidden"
                  />
                </label>

                {scanResult && (
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      scanResult.ok
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-800 text-rose-200'
                    }`}
                  >
                    <p className="font-bold">{scanResult.message}</p>
                    {scanResult.partyTitle && (
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Event: {scanResult.partyTitle} · Code: {scanResult.rsvp?.ticketCode}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* Host / Create New Outside Event Form */}
              <form
                onSubmit={handleCreateParty}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Post a New Event to Outside</h3>
                    <p className="text-[11px] text-zinc-400">
                      Open to all AGC members — verified accounts carry a host verification badge.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Event Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Lekki Rooftop Sundown & Amapiano"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Vibe / Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as OutsideCategory)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      {CATEGORY_OPTIONS.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">City</label>
                    <select
                      value={formCity}
                      onChange={(e) => handleCitySelectInForm(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      {CITY_OPTIONS.map((c) => (
                        <option key={c.label} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Venue Name</label>
                    <input
                      type="text"
                      required
                      value={formVenue}
                      onChange={(e) => setFormVenue(e.target.value)}
                      placeholder="e.g. Moist Beach Club"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formDateTime}
                      onChange={(e) => setFormDateTime(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Street Address</label>
                  <input
                    type="text"
                    required
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. Ligali Ayorinde St, Victoria Island"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Lat</label>
                    <input
                      type="text"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Lng</label>
                    <input
                      type="text"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectHostGps}
                    disabled={isLocatingHost}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 inline-flex items-center justify-center gap-1"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-violet-400" />
                    <span>{isLocatingHost ? 'Locating' : 'Use GPS'}</span>
                  </button>
                </div>

                {/* Paid vs Free Toggle + Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Entry Type</label>
                    <div className="grid grid-cols-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setFormIsPaid(false)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold ${
                          !formIsPaid ? 'bg-emerald-600 text-white' : 'text-zinc-400'
                        }`}
                      >
                        Free RSVP
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsPaid(true)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold ${
                          formIsPaid ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'
                        }`}
                      >
                        Paid
                      </button>
                    </div>
                  </div>
                  {formIsPaid && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-400">Ticket Price (₦)</label>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs tabular-nums text-white"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">Max Capacity</label>
                    <input
                      type="number"
                      min={1}
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      placeholder="200"
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs tabular-nums text-white"
                    />
                  </div>
                </div>

                {/* Flyer Presets or Device Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-zinc-400">Event Flyer</label>
                    <label className="text-[11px] font-bold text-violet-400 hover:text-violet-300 cursor-pointer inline-flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload Custom Flyer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFlyerUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_FLYERS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFormFlyerUrl(preset.url)}
                        className={`relative rounded-xl overflow-hidden border aspect-[4/3] ${
                          formFlyerUrl === preset.url ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-zinc-800'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white truncate">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Lineup / Dress Code / Notes</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="DJ lineup, door rules, table info..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formShareToStory}
                    onChange={(e) => setFormShareToStory(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Also drop event flyer teaser to my 24h Updates Story</span>
                </label>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full min-h-[46px] py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-extrabold text-white transition-colors"
                >
                  {isCreating ? 'Publishing Event...' : 'Publish to Outside'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ─── SUB-MODAL: PAID TICKET CHECKOUT (WALLET / PAYSTACK) ────────── */}
        {checkoutParty && (
          <div
            className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setCheckoutParty(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Ticket Checkout
                  </p>
                  <h3 className="text-base font-extrabold text-white">{checkoutParty.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {checkoutParty.venueName} · {formatEventDate(checkoutParty.eventDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutParty(null)}
                  className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
                  aria-label="Close checkout"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">1x General Admission Pass</span>
                <span className="text-lg font-black tabular-nums text-white">
                  {formatPrice(checkoutParty.ticketPrice)}
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isBookingId === checkoutParty.id}
                  onClick={() => completeRsvpBooking(checkoutParty, 'wallet')}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold flex items-center justify-between transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <span>Pay with AGC Wallet</span>
                  </span>
                  <span className="tabular-nums opacity-90">
                    Bal: {formatPrice(wallet.availableBalance || 0)}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isBookingId === checkoutParty.id}
                  onClick={() => handlePayWithPaystack(checkoutParty)}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-extrabold flex items-center justify-between transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Pay with Paystack (Card / Transfer)</span>
                  </span>
                  <span className="text-emerald-400">Instant Pass</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL: DIGITAL QR ENTRY PASS ─────────────────────────── */}
        {activePassModal && (
          <div
            className="fixed inset-0 z-[60] bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setActivePassModal(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
                  Outside Digital Pass
                </span>
                <button
                  type="button"
                  onClick={() => setActivePassModal(null)}
                  className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
                  aria-label="Close pass"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white">
                  {activePassModal.party?.title || 'Outside Entry Pass'}
                </h3>
                {activePassModal.party && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {activePassModal.party.venueName} · {formatEventDate(activePassModal.party.eventDate)}
                  </p>
                )}
              </div>

              <div className="mx-auto w-56 h-56 rounded-2xl bg-white p-3 flex items-center justify-center">
                {passQrUrl ? (
                  <img
                    src={passQrUrl}
                    alt={`QR Pass ${activePassModal.rsvp.ticketCode}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
                )}
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
                <p className="text-[11px] text-zinc-400">Gate Verification Code</p>
                <p className="text-xl font-black font-mono tracking-widest text-white">
                  {activePassModal.rsvp.ticketCode}
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold">
                  {activePassModal.rsvp.status === 'checked_in'
                    ? 'Checked In at Gate'
                    : `Valid for ${activePassModal.rsvp.userName}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText('pass_code', activePassModal.rsvp.ticketCode)
                  }
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'pass_code' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'pass_code' ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activePassModal.party) {
                      addDeviceMediaStatus(
                        `Catch me Outside at ${activePassModal.party.title} (${activePassModal.party.venueName}, ${activePassModal.party.city})! Check Updates → Outside to grab your pass.`,
                        activePassModal.party.flyerUrl,
                        'image'
                      );
                      flashNotice('Shared event promo to your Updates Story!');
                    }
                  }}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Story</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
