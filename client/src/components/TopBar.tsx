import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  ShoppingCart, 
  Heart, 
  User, 
  Search,
  Menu as MenuIcon,
  X,
  Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const TopBar: React.FC = () => {
  const [, setLocation] = useLocation();
  const { state } = useCart();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const logoUrl = getSetting('header_logo_url') || getSetting('logo_url', '');

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

  const Logo = () => (
    <div 
      className="cursor-pointer shrink-0"
      onClick={() => setLocation('/')}
    >
      {settingsLoading ? (
        <div className="h-10 md:h-16 w-24 bg-gray-100 animate-pulse rounded-lg" />
      ) : logoUrl ? (
        <img src={logoUrl} alt="طمطوم" className="h-10 md:h-16 w-auto object-contain" />
      ) : (
        <div className="text-2xl md:text-4xl font-black tracking-tighter select-none">
          <span className="text-[#388e3c]">طم</span><span className="text-[#d32f2f]">طوم</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border-b sticky top-0 z-50">
      {/* Desktop & Tablet Header */}
      <div className="container mx-auto px-4 py-3 hidden md:flex items-center justify-between gap-8">
        {/* Right side in RTL (Logo) */}
        <Logo />

        {/* Center: Search Bar */}
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

        {/* Left side in RTL (Icons) */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation(user ? '/profile' : '/auth')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            title={t('account')}
          >
            <User className="h-7 w-7 text-gray-700" />
          </button>
          
          <button 
            onClick={() => setLocation('/favorites')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            title={t('favorites')}
          >
            <Heart className="h-7 w-7 text-gray-700" />
          </button>

          <button 
            onClick={handleOpenCart}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            title={t('cart')}
          >
            <div className="relative">
              <ShoppingCart className="h-7 w-7 text-gray-700" />
              {getItemCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#d32f2f] text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
                  {getItemCount()}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Header (App Style) */}
      <div className="container mx-auto px-4 py-3 flex md:hidden items-center justify-between gap-2">
        {/* Menu (Right in RTL) */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-12 w-12 shrink-0" 
          onClick={() => document.getElementById('sidebar-trigger')?.click()}
        >
          <MenuIcon className="h-8 w-8 text-gray-700" />
        </Button>

        {/* Search & Icons Group */}
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <form onSubmit={handleSearch} className="flex-1">
            <input 
              className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold h-10"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="flex items-center gap-1.5 border-r pr-2">
            <button onClick={() => setLocation('/favorites')} className="p-1 relative">
              <Heart className="h-7 w-7 text-gray-600" />
            </button>
            <button onClick={handleOpenCart} className="p-1 relative">
              <ShoppingCart className="h-7 w-7 text-gray-600" />
              {getItemCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {getItemCount()}
                </span>
              )}
            </button>
            <button onClick={() => setLocation(user ? '/profile' : '/auth')} className="p-1">
              <User className="h-7 w-7 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Logo (Left in RTL) */}
        <div className="shrink-0">
          <Logo />
        </div>
      </div>

      {/* Remove the separate Mobile Search Bar as it's now integrated */}
      {/* <div className="md:hidden px-4 pb-3"> ... </div> */}
    </div>
  );
};

export default TopBar;
