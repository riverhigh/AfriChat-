import React, { useState } from 'react';
import {
  Search,
  Store,
  MapPin,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MOCK_PRODUCTS } from '../data/mockData';
import { Product } from '../types';

export const MarketplaceView: React.FC = () => {
  const { openCheckout, openChatWithProduct, formatPrice } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | 'textiles' | 'electronics' | 'beauty' | 'fashion'>('all');

  const filteredProducts = MOCK_PRODUCTS.filter((prod) => {
    const matchesSearch =
      prod.title.toLowerCase().includes(search.toLowerCase()) ||
      prod.sellerName.toLowerCase().includes(search.toLowerCase()) ||
      prod.description.toLowerCase().includes(search.toLowerCase()) ||
      prod.location.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCat !== 'all' && prod.category !== selectedCat) return false;
    return true;
  });

  return (
    <div className="flex flex-col pb-24 bg-white dark:bg-black min-h-[calc(100vh-130px)]">
      {/* Prominent Page Title */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          Stores
        </h2>
      </div>

      {/* Search Header */}
      <div className="p-3 bg-white dark:bg-black border-b border-slate-100 dark:border-neutral-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores, Ankara, gadgets, skincare..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-neutral-900 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-transparent dark:border-neutral-800"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'textiles', label: 'Fabrics & Ankara' },
            { id: 'electronics', label: 'Phones & Gadgets' },
            { id: 'beauty', label: 'Shea & Beauty' },
            { id: 'fashion', label: 'Streetwear' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id as any)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                selectedCat === cat.id
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800'
                  : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent dark:border-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="p-3 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Featured Stores & Verified Inventories
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((product: Product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-neutral-950 rounded-2xl border border-slate-200/80 dark:border-neutral-800 overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-100 dark:bg-neutral-900">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-md backdrop-blur-xs font-medium">
                    {product.condition}
                  </span>
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                    <Store className="w-3.5 h-3.5" />
                    <span className="truncate">{product.sellerName}</span>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1 mt-1">
                    {product.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{product.location}</span>
                  </div>

                  <div className="mt-2 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                    {formatPrice(product.price, product.currency)}
                  </div>
                </div>
              </div>

              <div className="p-3 pt-0 grid grid-cols-2 gap-2">
                <button
                  onClick={() => openChatWithProduct(product.sellerId, product)}
                  className="py-2 px-3 bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-transparent dark:border-neutral-800"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Message</span>
                </button>

                <button
                  onClick={() => openCheckout(product)}
                  className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs shadow-purple-600/30"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Buy (Escrow)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
