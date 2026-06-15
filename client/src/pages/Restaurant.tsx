import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowRight, 
  Star, 
  ChevronLeft, 
  Filter, 
  ArrowUpDown,
  LayoutGrid,
  Menu as ListMenu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MenuItemCard from '../components/MenuItemCard';
import type { Restaurant, MenuItem } from '@shared/schema';

export default function Restaurant() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('recommend');

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', id],
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/restaurants', id, 'menu'],
  });

  const menuCategories = menuItems 
    ? Array.from(new Set(menuItems.map(item => item.category))) 
    : [];
  
  // Removed automatic category selection to show all products by default
  /* 
  useEffect(() => {
    if (menuItems && menuCategories.length > 0 && !selectedMenuCategory) {
      setSelectedMenuCategory(menuCategories[0]);
    }
  }, [menuItems, menuCategories, selectedMenuCategory]);
  */
  
  const filteredMenuItems = menuItems?.filter(item => {
    if (selectedMenuCategory && item.category !== selectedMenuCategory) return false;
    return true;
  }) || [];

  // Sort items
  const sortedItems = [...filteredMenuItems].sort((a, b) => {
    if (sortBy === 'price-asc') return parseFloat(String(a.price)) - parseFloat(String(b.price));
    if (sortBy === 'price-desc') return parseFloat(String(b.price)) - parseFloat(String(a.price));
    return 0;
  });

  if (restaurantLoading) return <div className="p-8 animate-pulse">جاري التحميل...</div>;
  if (!restaurant) return <div className="p-8 text-center">المتجر غير موجود</div>;

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* 1. Breadcrumbs - Minimal */}
      <div className="container mx-auto px-4 py-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
        <button onClick={() => setLocation('/')} className="hover:text-black transition-colors">HOME</button>
        <span>/</span>
        <span className="text-black">{restaurant.name}</span>
      </div>

      {/* 2. Store Header (Hero) - Integrated Design */}
      <div className="relative h-64 md:h-[400px] overflow-hidden group mb-12">
        <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end items-center text-white px-4 pb-12 text-center">
          <Badge className="mb-4 bg-primary text-white rounded-none px-4 py-1 font-black text-xs uppercase tracking-widest">متجر رسمي</Badge>
          <h1 className="text-4xl md:text-7xl font-black mb-4 uppercase tracking-tighter drop-shadow-2xl">{restaurant.name}</h1>
          <p className="text-sm md:text-xl max-w-2xl opacity-80 font-light leading-relaxed mb-6">{restaurant.description}</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white text-black px-4 py-2 font-black text-sm">
              <Star className="h-4 w-4 fill-current text-yellow-400" />
              <span>{restaurant.rating}</span>
            </div>
            <div className="bg-black/50 backdrop-blur-md border border-white/20 px-4 py-2 text-xs font-bold">
              توصيل: {restaurant.deliveryTime}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* 3. Sidebar Filters */}
          <aside className="w-full lg:w-64 shrink-0 space-y-10">
            <div>
              <h3 className="font-black text-sm mb-6 flex items-center gap-2 border-b-2 border-black pb-2 uppercase tracking-widest">
                <Filter className="h-4 w-4" /> التصنيفات
              </h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setSelectedMenuCategory(null)}
                    className={`w-full text-right py-3 px-4 transition-all font-bold text-sm uppercase tracking-wider ${!selectedMenuCategory ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    عرض الكل
                  </button>
                </li>
                {menuCategories.map(cat => (
                  <li key={cat}>
                    <button 
                      onClick={() => setSelectedMenuCategory(cat)}
                      className={`w-full text-right py-3 px-4 transition-all font-bold text-sm uppercase tracking-wider ${selectedMenuCategory === cat ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-black text-xl mb-6 flex items-center gap-2 border-b-2 border-black pb-2 uppercase tracking-wider">
                المقاسات
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['XXS', 'XS', 'S', 'M', 'L', 'XL'].map(size => (
                  <button key={size} className="border-2 border-gray-100 py-3 text-xs font-bold hover:border-black transition-all text-gray-800">
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400" className="w-full h-auto opacity-80 grayscale hover:opacity-100 transition-opacity" />
            </div>
          </aside>

          {/* 4. Main Product Area */}
          <div className="flex-1">
            {/* Sorting Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b pb-6">
              <div className="flex items-center gap-8 w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button 
                  onClick={() => setSortBy('recommend')}
                  className={`text-sm font-black pb-2 border-b-2 transition-all uppercase tracking-tighter ${sortBy === 'recommend' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  التوصية
                </button>
                <button 
                  onClick={() => setSortBy('newest')}
                  className={`text-sm font-black pb-2 border-b-2 transition-all uppercase tracking-tighter ${sortBy === 'newest' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  الأحدث
                </button>
                <button 
                  onClick={() => setSortBy('price-asc')}
                  className={`text-sm font-black pb-2 border-b-2 transition-all uppercase tracking-tighter ${sortBy === 'price-asc' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  السعر: تصاعدي
                </button>
                <button 
                  onClick={() => setSortBy('price-desc')}
                  className={`text-sm font-black pb-2 border-b-2 transition-all uppercase tracking-tighter ${sortBy === 'price-desc' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  السعر: تنازلي
                </button>
              </div>
              
              <div className="flex items-center gap-6 shrink-0">
                <span className="text-sm font-bold text-gray-400 uppercase">{sortedItems.length} منتج</span>
                <div className="flex border-2 border-gray-100 rounded-none overflow-hidden">
                  <button className="p-2.5 bg-gray-50"><LayoutGrid className="h-4 w-4" /></button>
                  <button className="p-2.5 hover:bg-gray-50"><ListMenu className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {menuLoading ? (
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-4">
                    <div className="aspect-[3/4] bg-gray-100 rounded-none" />
                    <div className="h-4 bg-gray-100 w-1/2" />
                    <div className="h-4 bg-gray-100 w-3/4" />
                  </div>
                ))
              ) : sortedItems.length > 0 ? (
                sortedItems.map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    restaurantId={restaurant.id}
                    restaurantName={restaurant.name}
                  />
                ))
              ) : (
                <div className="col-span-full py-32 text-center">
                  <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">لا توجد منتجات متاحة حالياً</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
