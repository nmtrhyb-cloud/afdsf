import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Tag,
  Flame,
  Star,
  PackageOpen,
} from 'lucide-react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useCart } from '@/context/CartContext';
import type { Category, SpecialOffer, MenuItem, Restaurant } from '@shared/schema';
import { getAppStatus } from '@/utils/restaurantHours';

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { getSetting } = useUiSettings();
  const { state: cartState, addItem, removeItem, updateQuantity, getItemQuantity } = useCart();

  const [offerIndex, setOfferIndex] = useState(0);
  const sliderTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getS = (key: string, def: string) => getSetting(key) || def;
  const showSection = (key: string) => getSetting(key) !== 'false';

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'open';
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [getSetting]);

  const { data: products = [] } = useQuery<MenuItem[]>({ queryKey: ['/api/products'] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['/api/categories'] });
  const { data: offers = [] } = useQuery<SpecialOffer[]>({ queryKey: ['/api/special-offers'] });
  const { data: restaurants = [] } = useQuery<Restaurant[]>({ queryKey: ['/api/restaurants'] });

  const defaultRestaurant = restaurants[0];

  const activeOffers = (offers || []).filter(o => o.isActive);

  const startSlider = useCallback(() => {
    if (sliderTimer.current) clearInterval(sliderTimer.current);
    if (activeOffers.length > 1) {
      sliderTimer.current = setInterval(() => {
        setOfferIndex(prev => (prev + 1) % activeOffers.length);
      }, 4000);
    }
  }, [activeOffers.length]);

  useEffect(() => {
    startSlider();
    return () => { if (sliderTimer.current) clearInterval(sliderTimer.current); };
  }, [startSlider]);

  const prevOffer = () => { setOfferIndex(prev => (prev - 1 + activeOffers.length) % activeOffers.length); startSlider(); };
  const nextOffer = () => { setOfferIndex(prev => (prev + 1) % activeOffers.length); startSlider(); };

  const filteredProducts = useMemo(() => {
    let list = (products || []).filter(p => p.isAvailable !== false);

    if (selectedCategory !== 'all') {
      list = list.filter(p => {
        const cat = categories.find(c => c.id === selectedCategory);
        if (!cat) return false;
        return p.category === cat.name || p.categoryId === selectedCategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, selectedCategory, categories, searchQuery]);

  const handleAddToCart = (product: MenuItem) => {
    const restaurantId = product.restaurantId || defaultRestaurant?.id || '';
    const restaurantName = defaultRestaurant?.name || 'طمطوم';
    addItem(product, restaurantId, restaurantName);
  };

  const handleDecrement = (product: MenuItem) => {
    const qty = getItemQuantity(product.id);
    if (qty <= 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, qty - 1);
    }
  };

  const currentOffer = activeOffers[offerIndex];
  const activeCategories = categories.filter(c => c.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Categories Strip ─────────────────────────────────────────── */}
      {showSection('show_categories') && (
        <div className="bg-white border-b shadow-sm">
          <div className="flex overflow-x-auto no-scrollbar px-4 py-3 gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex flex-col items-center gap-1.5 shrink-0 min-w-[68px] group`}
            >
              <div className={`w-15 h-15 w-[60px] h-[60px] rounded-2xl flex items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'bg-primary/10 border-primary shadow-sm scale-105' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                <Menu className={`h-6 w-6 ${selectedCategory === 'all' ? 'text-primary' : 'text-gray-400'}`} />
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight ${selectedCategory === 'all' ? 'text-primary' : 'text-gray-500'}`}>
                الكل
              </span>
            </button>

            {showSection('show_wasalni_service') && (
              <button
                onClick={() => setLocation('/wasalni')}
                className="flex flex-col items-center gap-1.5 shrink-0 min-w-[68px]"
              >
                <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center border-2 bg-gradient-to-br from-orange-400 to-orange-600 border-transparent shadow-sm">
                  <span className="text-2xl">🛵</span>
                </div>
                <span className="text-[10px] font-bold text-center leading-tight text-orange-500">
                  {getS('wasalni_service_name', 'وصل لي')}
                </span>
              </button>
            )}

            {activeCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 shrink-0 min-w-[68px]"
              >
                <div className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center border-2 transition-all overflow-hidden ${selectedCategory === cat.id ? 'border-primary shadow-sm scale-105' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    : cat.icon
                      ? <i className={`${cat.icon} text-2xl ${selectedCategory === cat.id ? 'text-primary' : 'text-gray-400'}`} />
                      : <Tag className={`h-6 w-6 ${selectedCategory === cat.id ? 'text-primary' : 'text-gray-400'}`} />
                  }
                </div>
                <span className={`text-[10px] font-bold text-center leading-tight ${selectedCategory === cat.id ? 'text-primary' : 'text-gray-500'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Offers Slider ──────────────────────────────────────────────── */}
      {showSection('show_hero_section') && activeOffers.length > 0 && currentOffer && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-md" style={{ height: activeOffers.length === 1 ? '200px' : '180px' }}>
            {currentOffer.image
              ? <img src={currentOffer.image} alt={currentOffer.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #E53935 0%, #43A047 100%)' }} />
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {currentOffer.showBadge !== false && (
              <div className="absolute top-3 right-3 flex gap-1.5">
                <span className="bg-primary text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                  {currentOffer.badgeText1 || 'عرض خاص'}
                </span>
                {currentOffer.badgeText2 && (
                  <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {currentOffer.badgeText2}
                  </span>
                )}
              </div>
            )}

            <div className="absolute bottom-0 right-0 left-0 p-3 text-right">
              <h3 className="text-white font-black text-sm leading-snug line-clamp-2 mb-1">{currentOffer.title}</h3>
              {currentOffer.description && (
                <p className="text-white/80 text-[11px] line-clamp-1 mb-2">{currentOffer.description}</p>
              )}
              <div className="flex items-center justify-between">
                <button
                  className="bg-white text-primary text-[11px] font-black px-4 py-1.5 rounded-full flex items-center gap-1 shadow"
                  onClick={() => {
                    if (currentOffer.menuItemId) {
                      setLocation(`/category/العروض#product-${currentOffer.menuItemId}`);
                    } else {
                      setLocation('/category/العروض');
                    }
                  }}
                >
                  {getS('btn_shop_now', 'تسوق الآن')}
                  <ChevronLeft className="h-3 w-3" />
                </button>
                {(currentOffer.discountPercent || currentOffer.discountAmount) && (
                  <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    {currentOffer.discountPercent
                      ? `خصم ${currentOffer.discountPercent}%`
                      : `خصم ${currentOffer.discountAmount} ر.ي`}
                  </span>
                )}
              </div>
            </div>

            {activeOffers.length > 1 && (
              <>
                <button onClick={nextOffer} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-all">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={prevOffer} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {activeOffers.map((_, i) => (
                    <button key={i} onClick={() => { setOfferIndex(i); startSlider(); }}
                      className={`rounded-full transition-all ${i === offerIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
                <button
                  className="absolute top-3 left-3 text-white/80 text-[10px] font-bold flex items-center gap-0.5 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full"
                  onClick={() => setLocation('/category/العروض')}
                >
                  كل العروض
                  <ChevronLeft className="h-2.5 w-2.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Search Bar ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-11 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* ── Products Grid ──────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-24">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-bold">{filteredProducts.length} منتج</span>
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-black text-gray-800">
              {selectedCategory === 'all'
                ? 'جميع المنتجات'
                : activeCategories.find(c => c.id === selectedCategory)?.name || 'المنتجات'}
            </span>
          </div>
        </div>

        {/* App closed banner */}
        {!appStatus.isOpen && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-right">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-bold">{appStatus.message || 'المتجر مغلق حالياً، نعود قريباً'}</p>
          </div>
        )}

        {/* Products 2-column grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map(product => {
              const qty = getItemQuantity(product.id);
              const hasDiscount = product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price);

              return (
                <div key={product.id} className="product-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md">
                  {/* Product image */}
                  <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #f0fdf4 100%)' }}>
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}

                    {/* Discount badge */}
                    {hasDiscount && (
                      <div className="absolute top-2 right-2 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow">
                        خصم
                      </div>
                    )}

                    {/* Featured badge */}
                    {product.isFeatured && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-white" />
                      </div>
                    )}

                    {/* Unavailable overlay */}
                    {product.isAvailable === false && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-black bg-black/60 px-3 py-1 rounded-full">غير متوفر</span>
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="p-2.5">
                    <h3 className="font-black text-gray-900 text-sm leading-tight line-clamp-2 mb-1 text-right" dir="rtl">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="text-[11px] text-gray-400 line-clamp-1 mb-1.5 text-right" dir="rtl">
                        {product.description}
                      </p>
                    )}

                    {/* Price row */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col items-start">
                        <span className="text-primary font-black text-base leading-none">
                          {parseFloat(product.price).toFixed(0)} <span className="text-[10px] font-bold">ر.ي</span>
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-gray-400 line-through leading-none mt-0.5">
                            {parseFloat(product.originalPrice!).toFixed(0)}
                          </span>
                        )}
                      </div>

                      {/* Cart control */}
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.isAvailable === false || !appStatus.isOpen}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md active:scale-90 transition-all disabled:opacity-40"
                          style={{ background: product.isAvailable === false || !appStatus.isOpen ? '#9ca3af' : 'linear-gradient(135deg, #E53935 0%, #43A047 100%)' }}
                          aria-label="أضف للسلة"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDecrement(product)}
                            className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-90 transition-all"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-black text-primary">{qty}</span>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white active:scale-90 transition-all"
                            style={{ background: 'linear-gradient(135deg, #E53935 0%, #43A047 100%)' }}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #f0fdf4 100%)' }}>
              <PackageOpen className="h-12 w-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold text-lg">لا توجد منتجات</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? 'جرب كلمة بحث مختلفة' : 'جرب تغيير التصنيف'}
            </p>
          </div>
        )}
      </div>

      {/* ── Floating Cart Button (when cart has items) ──────────────────── */}
      {cartState.items.length > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-40 max-w-sm mx-auto">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openCart'))}
            className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-between px-5 shadow-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #E53935 0%, #43A047 100%)' }}
          >
            <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-black">
              {cartState.items.reduce((s, i) => s + i.quantity, 0)} عنصر
            </span>
            <span>عرض السلة</span>
            <div className="flex items-center gap-1">
              <span>{cartState.subtotal.toFixed(0)} ر.ي</span>
              <ShoppingCart className="h-5 w-5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
