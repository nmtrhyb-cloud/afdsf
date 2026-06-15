import React, { useState } from 'react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const [show, setShow] = useState(true);

  if (settingsLoading) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const splashImageUrl = getSetting('splash_image_url', 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=800');
  const logoUrl = getSetting('logo_url', '');
  const splashTitle = getSetting('splash_title', 'مرحباً بك في طمطوم');
  const splashSubtitle = getSetting('splash_subtitle', 'خضروات وفواكه طازجة تصلك لباب بيتك بأعلى جودة وأفضل سعر');

  const handleStart = () => {
    setShow(false);
    setTimeout(onFinish, 500); // Allow animation to finish
  };

  if (!show) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col transition-opacity duration-500 overflow-hidden">
      {/* Top Image Section with Professional Resize */}
      <div className="h-[50vh] md:h-[55vh] relative overflow-hidden rounded-b-[3rem] md:rounded-b-[5rem] shadow-2xl">
        <img 
          src={splashImageUrl} 
          alt="Splash" 
          className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Floating Logo on Image for better branding */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-20 md:h-28 object-contain drop-shadow-2xl" />
          ) : (
            <div className="text-4xl md:text-6xl flex items-center font-black tracking-tighter select-none bg-white/10 backdrop-blur-md px-8 py-3 rounded-3xl border border-white/20 text-white">
              <span className="text-white">طم</span>
              <span className="text-white/80">طوم</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Content Section */}
      <div className="flex-1 flex flex-col items-center justify-between p-8 md:p-12 text-center relative z-10 bg-white">
        <div className="w-full max-w-md space-y-6 pt-4">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
            {splashTitle}
          </h1>
          
          <p className="text-lg md:text-xl font-medium text-gray-500 leading-relaxed max-w-[320px] md:max-w-md mx-auto">
            {splashSubtitle}
          </p>
        </div>

        {/* Action Button */}
        <div className="w-full max-w-sm pb-10 md:pb-16">
          <Button 
            onClick={handleStart}
            className="w-full h-16 md:h-20 rounded-[2rem] text-xl md:text-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-[0_20px_50px_rgba(56,142,60,0.3)] flex items-center justify-center gap-4 active:scale-95 transition-all group border-b-4 border-primary-dark"
          >
            ابدأ الآن
            <ChevronLeft className="h-7 w-7 group-hover:-translate-x-2 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
