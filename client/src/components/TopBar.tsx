import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  User, 
  Search,
  Menu as MenuIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { CustomerNotificationsPanel } from './CustomerNotificationsPanel';
import tamtomLogo from '@assets/wasel-logo.png';

export const TopBar: React.FC = () => {
  const [, setLocation] = useLocation();
  const { state } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const logoUrl = getSetting('header_logo_url') || getSetting('logo_url') || tamtomLogo;
  const appName = getSetting('app_name') || 'طمطوم';
  const appNameEn = getSetting('app_name_en') || 'TAM TOM';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleOpenCart = () => {
    window.dispatchEvent(new CustomEvent('openCart'));
  };

  const getItemCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="bg-gradient-to-r from-[#0A0A0A] via-[#1A0808] to-[#0A0A0A] border-b border-white/10 hidden md:block shadow-lg">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-8">
          <div 
            className="cursor-pointer shrink-0 flex items-center gap-3 group"
            onClick={() => setLocation('/')}
            data-testid="link-home-logo"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#E53935] rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
              <img
                src={logoUrl}
                alt={appName}
                className="relative h-14 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_15px_rgba(229,57,53,0.5)]"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black text-white tracking-tight">{appName}</span>
              <span className="text-[10px] font-bold text-[#E53935] tracking-[0.35em] mt-1">{appNameEn}</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl">
            <form onSubmit={handleSearch} className="relative group">
              <Input 
                className="w-full pr-12 pl-4 h-12 bg-gray-100 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl transition-all text-base font-bold"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                <Search className="h-6 w-6" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLocation(user ? '/profile' : '/auth')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <User className="h-7 w-7 text-gray-300 hover:text-white transition-colors" />
            </button>

            <button 
              onClick={handleOpenCart}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            >
              <div className="relative">
                <ShoppingCart className="h-7 w-7 text-gray-300 hover:text-white transition-colors" />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#E53935] text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-[#0A0A0A] shadow-lg">
                    {getItemCount()}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1A0808 50%, #0A1A0A 100%)' }}>
        {/* Decorative glow blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#E53935] opacity-15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-[#43A047] opacity-10 blur-3xl pointer-events-none" />

        <div className="relative px-3 py-2.5 flex items-center justify-between gap-2">
          {/* Right side: Menu + Notifications */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-white hover:bg-white/15 shrink-0 rounded-xl" 
              onClick={() => document.getElementById('sidebar-trigger')?.click()}
            >
              <MenuIcon className="h-6 w-6" />
            </Button>
            <CustomerNotificationsPanel />
          </div>

          {/* Center: Brand pill */}
          <div 
            className="flex-1 flex items-center justify-center cursor-pointer"
            onClick={() => setLocation('/')}
            data-testid="link-home-logo-mobile"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="relative">
                <div className="absolute inset-0 bg-[#E53935] rounded-full blur-md opacity-60" />
                <img src={logoUrl} alt={appName} className="relative h-8 w-8 object-contain drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-white font-black text-base">{appName}</span>
                <span className="text-[9px] font-bold text-[#E53935] tracking-[0.3em] mt-0.5">{appNameEn}</span>
              </div>
            </div>
          </div>

          {/* Left side: Search + Cart */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/15 rounded-xl transition-colors"
              aria-label="search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={handleOpenCart}
              className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/15 rounded-xl transition-colors relative"
              aria-label="cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {getItemCount() > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#E53935] text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-black ring-2 ring-[#0A0A0A] shadow-lg">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Expandable */}
        {isSearchOpen && (
          <div className="relative px-3 pb-3 -mt-1">
            <form onSubmit={handleSearch} className="relative">
              <input
                autoFocus
                className="w-full bg-white/95 text-slate-900 placeholder-slate-400 border border-white/30 rounded-2xl px-4 py-2.5 pr-11 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E53935] shadow-lg"
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#E53935] text-white flex items-center justify-center shadow-md">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* Bottom curved decoration */}
        <div className="relative h-3 bg-background rounded-t-3xl -mb-px" />
      </div>
    </div>
  );
};

export default TopBar;
