import React, { useState, useRef, useCallback } from 'react';
import {
  PawPrint,
  Heart,
  MessageCircle,
  ShoppingBag,
  Camera,
  X,
  Plus,
  MapPin,
  Tag,
  ChevronRight,
  Users,
  Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ForumPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  timeAgo: string;
  text: string;
  imageBase64?: string;
  category: ForumCategory;
  likeCount: number;
  commentCount: number;
  liked: boolean;
}

interface PetListing {
  id: string;
  title: string;
  price: number;
  location: string;
  breed: string;
  age: string;
  category: ShopCategory;
  description: string;
  sellerName: string;
  sellerPhone: string;
  photoBase64: string;
  rating: number;
}

type ForumCategory = 'All' | 'Dogs' | 'Cats' | 'Birds' | 'Fish' | 'Reptiles' | 'Small Pets';
type ShopCategory = 'Dogs' | 'Cats' | 'Birds' | 'Fish' | 'Reptiles' | 'Accessories' | 'Vet Services';
type ActiveTab = 'forum' | 'shop';

interface PetShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Live Data (No Mocks) ───────────────────────────────────────────────────

const INITIAL_POSTS: ForumPost[] = [];
const INITIAL_LISTINGS: PetListing[] = [];

const FORUM_CATEGORIES: ForumCategory[] = ['All', 'Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles', 'Small Pets'];
const SHOP_CATEGORIES: ShopCategory[] = ['Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles', 'Accessories', 'Vet Services'];

const CATEGORY_EMOJI: Record<string, string> = {
  All: '🐾',
  Dogs: '🐶',
  Cats: '🐱',
  Birds: '🦜',
  Fish: '🐠',
  Reptiles: '🦎',
  'Small Pets': '🐹',
  Accessories: '🛍️',
  'Vet Services': '🏥',
};

// ─── Image Compression ───────────────────────────────────────────────────────

function compressImage(file: File, maxSize = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CategoryPill: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
      active
        ? 'bg-purple-600 text-white shadow-md'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
    }`}
  >
    <span>{CATEGORY_EMOJI[label]}</span>
    <span>{label}</span>
  </button>
);

const PostCard: React.FC<{
  post: ForumPost;
  onLike: (id: string) => void;
}> = ({ post, onLike }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xl">
        {post.authorAvatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{post.authorName}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{post.timeAgo}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            {CATEGORY_EMOJI[post.category]} {post.category}
          </span>
        </div>
      </div>
    </div>

    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed mb-3">{post.text}</p>

    {post.imageBase64 && (
      <div className="mb-3 rounded-lg overflow-hidden">
        <img src={post.imageBase64} alt="Post" className="w-full object-cover max-h-64" />
      </div>
    )}

    <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
      <button
        onClick={() => onLike(post.id)}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          post.liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-400'
        }`}
      >
        <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
        <span>{post.likeCount}</span>
      </button>
      <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 transition-colors">
        <MessageCircle className="w-4 h-4" />
        <span>{post.commentCount}</span>
      </button>
    </div>
  </div>
);

const ListingCard: React.FC<{
  listing: PetListing;
  onContact: (listing: PetListing) => void;
}> = ({ listing, onContact }) => {
  const hasPhoto = listing.photoBase64 && listing.photoBase64.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="h-40 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center relative">
        {hasPhoto ? (
          <img src={listing.photoBase64} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{CATEGORY_EMOJI[listing.category]}</span>
        )}
        <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 rounded-full px-2 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
          ₦{listing.price.toLocaleString()}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{listing.title}</h3>

        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <Tag className="w-3 h-3" />
          <span>{listing.breed}</span>
          <span>·</span>
          <span>{listing.age}</span>
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{listing.location}</span>
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-yellow-500">
          <Star className="w-3 h-3 fill-current" />
          <span className="font-medium">{listing.rating}</span>
          <span className="text-gray-400 ml-1">· {listing.sellerName}</span>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 flex-1">{listing.description}</p>

        <button
          onClick={() => onContact(listing)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contact Seller
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ─── New Post Form ────────────────────────────────────────────────────────────

const NewPostForm: React.FC<{
  onSubmit: (text: string, imageBase64: string | undefined, category: ForumCategory) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [category, setCategory] = useState<ForumCategory>('Dogs');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setImageBase64(compressed);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), imageBase64, category);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-purple-200 dark:border-purple-700 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">New Post</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {FORUM_CATEGORIES.filter((c) => c !== 'All').map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              category === c
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {CATEGORY_EMOJI[c]} {c}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share something about your pet..."
        rows={3}
        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
      />

      {imageBase64 && (
        <div className="relative mt-2 rounded-lg overflow-hidden">
          <img src={imageBase64} alt="Preview" className="w-full max-h-40 object-cover" />
          <button
            onClick={() => setImageBase64(undefined)}
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
          disabled={uploading}
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Add Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
};

// ─── New Listing Form ─────────────────────────────────────────────────────────

const NewListingForm: React.FC<{
  onSubmit: (listing: Omit<PetListing, 'id' | 'sellerPhone' | 'rating'>) => void;
  onCancel: () => void;
  sellerName: string;
}> = ({ onSubmit, onCancel, sellerName }) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ShopCategory>('Dogs');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setPhotoBase64(compressed);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !price || !location.trim()) return;
    onSubmit({
      title: title.trim(),
      price: parseInt(price, 10) || 0,
      category,
      location: location.trim(),
      description: description.trim(),
      breed: breed.trim(),
      age: age.trim(),
      photoBase64,
      sellerName,
    });
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">List a Pet / Service</h2>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Photo */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative h-32 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors"
          >
            {photoBase64 ? (
              <img src={photoBase64} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <Camera className="w-7 h-7 text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">{uploading ? 'Uploading…' : 'Tap to add photo'}</span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {SHOP_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    category === c
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {CATEGORY_EMOJI[c]} {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title *</label>
            <input
              className={inputClass}
              placeholder="e.g. Pure Breed German Shepherd"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price (₦) *</label>
              <input
                className={inputClass}
                placeholder="e.g. 50000"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location *</label>
              <input
                className={inputClass}
                placeholder="e.g. Lagos, VI"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Breed</label>
              <input
                className={inputClass}
                placeholder="e.g. Labrador"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Age</label>
              <input
                className={inputClass}
                placeholder="e.g. 8 weeks"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <textarea
              className={`${inputClass} resize-none`}
              placeholder="Describe your pet, health status, vaccinations…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !price || !location.trim()}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            Publish Listing
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PetShopModal: React.FC<PetShopModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setActiveChatId, setActiveTab } = useApp();

  // Tab state
  const [activeTab, setLocalActiveTab] = useState<ActiveTab>('forum');

  // Forum state
  const [posts, setPosts] = useState<ForumPost[]>(INITIAL_POSTS);
  const [selectedForumCategory, setSelectedForumCategory] = useState<ForumCategory>('All');
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  // Shop state
  const [listings, setListings] = useState<PetListing[]>(INITIAL_LISTINGS);
  const [selectedShopCategory, setSelectedShopCategory] = useState<ShopCategory | 'All'>('All');
  const [showNewListingForm, setShowNewListingForm] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLike = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );
  }, []);

  const handleNewPost = useCallback(
    (text: string, imageBase64: string | undefined, category: ForumCategory) => {
      const displayName = currentUser?.fullName || currentUser?.phoneNumber || 'You';
      const masked = displayName.length > 6 ? displayName.slice(0, -3) + '***' : displayName;
      const newPost: ForumPost = {
        id: `p${Date.now()}`,
        authorName: masked,
        authorAvatar: '🐾',
        timeAgo: 'just now',
        text,
        imageBase64,
        category,
        likeCount: 0,
        commentCount: 0,
        liked: false,
      };
      setPosts((prev) => [newPost, ...prev]);
      setShowNewPostForm(false);
    },
    [currentUser]
  );

  const handleNewListing = useCallback(
    (data: Omit<PetListing, 'id' | 'sellerPhone' | 'rating'>) => {
      const newListing: PetListing = {
        ...data,
        id: `l${Date.now()}`,
        sellerPhone: currentUser?.phoneNumber || '',
        rating: 5.0,
      };
      setListings((prev) => [newListing, ...prev]);
      setShowNewListingForm(false);
    },
    [currentUser]
  );

  const handleContactSeller = useCallback(
    (listing: PetListing) => {
      if (!listing.sellerPhone) return;
      setActiveChatId(listing.sellerPhone);
      setActiveTab('chats');
      onClose();
    },
    [setActiveChatId, setActiveTab, onClose]
  );

  // ── Filtered Data ─────────────────────────────────────────────────────────

  const filteredPosts =
    selectedForumCategory === 'All' ? posts : posts.filter((p) => p.category === selectedForumCategory);

  const filteredListings =
    selectedShopCategory === 'All'
      ? listings
      : listings.filter((l) => l.category === (selectedShopCategory as ShopCategory));

  // ── Render guard ──────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const sellerDisplayName = (() => {
    const raw = currentUser?.fullName || currentUser?.phoneNumber || 'You';
    return raw.length > 6 ? raw.slice(0, -3) + '***' : raw;
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center px-4 pt-safe-top pt-4 pb-3 gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-md">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Pet Hub</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Forum & Marketplace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex px-4 pb-0 gap-1">
            {(['forum', 'shop'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setLocalActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'forum' ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
                {tab === 'forum' ? 'Forum' : 'Shop'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {/* ════ FORUM TAB ════ */}
          {activeTab === 'forum' && (
            <div className="flex flex-col h-full">
              {/* Category bar */}
              <div className="bg-white dark:bg-gray-900 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-gray-800">
                {FORUM_CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat}
                    label={cat}
                    active={selectedForumCategory === cat}
                    onClick={() => setSelectedForumCategory(cat)}
                  />
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* New Post button / form */}
                {showNewPostForm ? (
                  <NewPostForm
                    onSubmit={handleNewPost}
                    onCancel={() => setShowNewPostForm(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowNewPostForm(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Share something about your pet…</span>
                  </button>
                )}

                {/* Posts */}
                {filteredPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <PawPrint className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No posts in this category yet.</p>
                    <p className="text-xs mt-1">Be the first to share!</p>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} onLike={handleLike} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════ SHOP TAB ════ */}
          {activeTab === 'shop' && (
            <div className="flex flex-col h-full">
              {/* Category bar + List button */}
              <div className="bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Browse Listings</span>
                  <button
                    onClick={() => setShowNewListingForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    List a Pet
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(['All', ...SHOP_CATEGORIES] as Array<'All' | ShopCategory>).map((cat) => (
                    <CategoryPill
                      key={cat}
                      label={cat}
                      active={selectedShopCategory === cat}
                      onClick={() => setSelectedShopCategory(cat)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {filteredListings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No listings in this category.</p>
                    <button
                      onClick={() => setShowNewListingForm(true)}
                      className="mt-3 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                    >
                      Add First Listing
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onContact={handleContactSeller}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Listing modal (stacked above) */}
      {showNewListingForm && (
        <NewListingForm
          sellerName={sellerDisplayName}
          onSubmit={handleNewListing}
          onCancel={() => setShowNewListingForm(false)}
        />
      )}
    </>
  );
};

export default PetShopModal;
