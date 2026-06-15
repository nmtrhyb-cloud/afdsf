import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Home, 
  Receipt, 
  User, 
  Settings, 
  Shield, 
  ShoppingCart,
  Heart,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartButton from './CartButton';
import { useToast } from '@/hooks/use-toast';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useLanguage } from '../context/LanguageContext';
import TopBar from './TopBar';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { state } = useCart();
  const { user } = useAuth();
  const { t, language, dir } = useLanguage();
  const getItemCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { getSetting } = useUiSettings();

  const getS = (key: string, defaultValue: string) => getSetting(key, defaultValue);

  const whatsappLink = getS('support_whatsapp', 'https://wa.me/967777777777');
  const phoneLink = getS('support_phone', 'tel:+967777777777');
  const shareText = getS('share_text', 'تسوق من متجر طمطوم الآن!');
  const shareUrl = getS('share_url', window.location.origin);
  const headerLogoUrl = getS('header_logo_url', '');
  const sidebarLogoUrl = getS('sidebar_logo_url', '') || headerLogoUrl;
  const appName = getS('app_name', 'طمطوم');
  const appVersion = getS('app_version', '1.0.0');
  const sidebarTagline = getS('sidebar_tagline', 'كل ما تحتاجونه في مكان واحد');
  const supportTitle = getS('text_support_title', 'نحن معك..');

  const showShareButton = getSetting('show_share_button') !== 'false';
  const showContactButton = getSetting('show_contact_button') !== 'false';
  const showPrivacyButton = getSetting('show_privacy_button') !== 'false';
  const bottomBarEnabled = getSetting('bottom_bar_enabled') !== 'false';

  const isAdminPage = location.startsWith('/admin');
  const isDeliveryPage = location.startsWith('/delivery');
  const isDriverPage = location.startsWith('/driver');

  if (isAdminPage || isDeliveryPage || isDriverPage) {
    return <>{children}</>;
  }

  const sidebarMenuItems = [
    { icon: Heart, label: language === 'ar' ? 'المفضلة' : 'Favorites', path: '/favorites' },
    { icon: User, label: language === 'ar' ? 'حسابي' : 'My Account', path: '/profile' },
    { icon: Settings, label: language === 'ar' ? 'الإعدادات' : 'Settings', path: '/settings' },
    ...(showPrivacyButton ? [{ icon: Shield, label: language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy', path: '/privacy' }] : []),
  ];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: appName,
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      toast({
        title: language === 'ar' ? 'تم النسخ' : 'Copied',
        description: language === 'ar' ? 'تم نسخ رابط المتجر' : 'Store link copied',
      });
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  return (
    <div className="bg-background min-h-screen flex flex-col pb-16 md:pb-0" dir={dir}>
      <TopBar />
      {location !== '/' && <Navbar />}

      {/* Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <button id="sidebar-trigger" className="hidden" />
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] p-0 flex flex-col border-none shadow-2xl bg-white">
          
          {/* Header: Logo + Tagline */}
          <div className="bg-white pt-8 pb-4 px-6 relative">
            <button
              onClick={() => setSidebarOpen(false)}
              className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors`}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-4 mt-2">
              {sidebarLogoUrl ? (
                <img
                  src={sidebarLogoUrl}
                  alt={appName}
                  className="h-28 w-auto object-contain"
                />
              ) : (
                <div className="text-5xl font-black tracking-tighter select-none leading-none">
                  <span className="text-[#388e3c]">طم</span><span className="text-[#d32f2f]">طوم</span>
                </div>
              )}
            </div>

            {/* Tagline */}
            <p className="text-center text-xl font-black text-gray-800 leading-snug px-2">
              {sidebarTagline}
            </p>
          </div>

          {/* Green Divider */}
          <div className="mx-6 h-0.5 bg-[#388e3c] rounded-full" />

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-1">
              {sidebarMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? 'bg-green-50 text-[#388e3c]'
                        : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon Box */}
                    <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${
                      isActive ? 'bg-[#388e3c]/10' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-[#388e3c]' : 'text-gray-600'}`} />
                    </div>
                    {/* Label */}
                    <span className={`text-lg font-bold flex-1 text-right ${isActive ? 'text-[#388e3c]' : 'text-gray-800'}`}>
                      {item.label}
                    </span>
                    {/* Active indicator */}
                    {isActive && (
                      language === 'ar'
                        ? <ChevronLeft className="h-4 w-4 text-[#388e3c]" />
                        : <ChevronRight className="h-4 w-4 text-[#388e3c]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-6 border-t border-gray-100">
            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mb-4">
              {showShareButton && (
                <button
                  onClick={handleShare}
                  className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                >
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
              )}
              {showContactButton && (
                <button
                  onClick={() => window.open(whatsappLink, '_blank')}
                  className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-green-50 shadow-sm transition-colors"
                >
                  <MessageCircle className="h-5 w-5 text-[#388e3c]" />
                </button>
              )}
            </div>
            {/* Version */}
            <p className="text-[11px] text-center text-gray-400 font-bold uppercase tracking-widest">
              {appName.toUpperCase()} MARKET V{appVersion}
            </p>
          </div>

        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {bottomBarEnabled && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t z-50 md:hidden flex items-center justify-around h-16 px-6 pb-2 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[1.5rem]">
          <button
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${location === '/' ? 'text-[#388e3c] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home className={`h-6 w-6 ${location === '/' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">الرئيسية</span>
            {location === '/' && <div className="h-1 w-4 bg-[#388e3c] rounded-full mt-0.5" />}
          </button>

          <button
            onClick={() => setLocation('/orders')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${location === '/orders' ? 'text-[#388e3c] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Receipt className={`h-6 w-6 ${location === '/orders' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">طلباتي</span>
            {location === '/orders' && <div className="h-1 w-4 bg-[#388e3c] rounded-full mt-0.5" />}
          </button>

          {/* Support Center Button */}
          <div className="relative -mt-10">
            <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
              <DialogTrigger asChild>
                <button className="flex flex-col items-center group">
                  <div className="bg-gradient-to-br from-[#388e3c] to-[#2e7d32] text-white p-4 rounded-2xl shadow-2xl shadow-[#388e3c]/40 border-4 border-white transform transition-transform group-hover:scale-110 active:scale-95">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-t-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                <div className="h-32 bg-gradient-to-br from-[#388e3c] to-[#2e7d32] p-8 flex items-end">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">{supportTitle}</h2>
                </div>
                <div className="p-8 space-y-4">
                  <p className="text-gray-500 font-bold mb-6 text-center">اختر وسيلة التواصل المناسبة لك</p>
                  <div className="grid gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex items-center justify-between px-6 rounded-2xl border-2 border-green-50 hover:bg-green-50 hover:border-green-200 group transition-all"
                      onClick={() => { window.open(whatsappLink, '_blank'); setSupportOpen(false); }}
                    >
                      <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors">
                        <MessageCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 text-right mr-4">
                        <p className="font-black text-xl text-gray-900">واتساب</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">تحدث مباشرة</p>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-300" />
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex items-center justify-between px-6 rounded-2xl border-2 border-blue-50 hover:bg-blue-50 hover:border-blue-200 group transition-all"
                      onClick={() => { window.location.href = phoneLink; setSupportOpen(false); }}
                    >
                      <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <PhoneCall className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 text-right mr-4">
                        <p className="font-black text-xl text-gray-900">اتصال</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">مكالمة فورية</p>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-300" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <button
            onClick={() => setLocation('/favorites')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${location === '/favorites' ? 'text-[#d32f2f] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Heart className={`h-6 w-6 ${location === '/favorites' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">المفضلة</span>
            {location === '/favorites' && <div className="h-1 w-4 bg-[#d32f2f] rounded-full mt-0.5" />}
          </button>

          <button
            onClick={() => setLocation(user ? '/profile' : '/auth')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${location === '/profile' ? 'text-[#388e3c] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <User className={`h-6 w-6 ${location === '/profile' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">حسابي</span>
            {location === '/profile' && <div className="h-1 w-4 bg-[#388e3c] rounded-full mt-0.5" />}
          </button>
        </div>
      )}

      {/* Desktop Footer */}
      <footer className="hidden md:block bg-white border-t py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-right">
            <div className="text-3xl font-black tracking-tighter mb-2">
              <span className="text-[#388e3c]">طم</span><span className="text-[#d32f2f]">طوم</span>
            </div>
            <p className="text-sm text-gray-500">{sidebarTagline}</p>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-lg mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><button onClick={() => setLocation('/favorites')} className="hover:text-[#388e3c] transition-colors">المفضلة</button></li>
              <li><button onClick={() => setLocation('/orders')} className="hover:text-[#388e3c] transition-colors">طلباتي</button></li>
              <li><button onClick={() => setLocation('/profile')} className="hover:text-[#388e3c] transition-colors">حسابي</button></li>
              <li><button onClick={() => setLocation('/privacy')} className="hover:text-[#388e3c] transition-colors">سياسة الخصوصية</button></li>
            </ul>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-lg mb-4">تواصل معنا</h4>
            <div className="flex gap-3 justify-end">
              <button onClick={handleShare} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <Share2 className="h-5 w-5 text-gray-600" />
              </button>
              <button onClick={() => window.open(whatsappLink, '_blank')} className="p-2.5 bg-green-100 hover:bg-green-200 rounded-full transition-colors">
                <MessageCircle className="h-5 w-5 text-[#388e3c]" />
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-6 border-t">
          <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
            {appName.toUpperCase()} MARKET V{appVersion} — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>

      {/* Mobile Floating Cart Button */}
      {getItemCount() > 0 && (
        <div className="md:hidden">
          <CartButton />
        </div>
      )}
    </div>
  );
}
