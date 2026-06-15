import React, { useEffect, useMemo, useState } from 'react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { prefetchBootstrap } from '@/lib/bootstrap';
import tamtomLogo from '@assets/wasel-logo.png';

interface SplashScreenProps {
  onFinish: () => void;
}

const MIN_SPLASH_MS = 600;
const MAX_BOOTSTRAP_MS = 3000;

const PARTICLE_COUNT = 22;
const TWINKLE_COUNT = 14;
const RAY_COUNT = 12;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const { user } = useAuth();
  const [show, setShow] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const phone = user?.phone || localStorage.getItem('customer_phone') || '';
    const customerId = user?.id || '';

    const bootPromise = prefetchBootstrap({ phone, customerId, force: true });
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, MAX_BOOTSTRAP_MS));

    Promise.race([bootPromise, timeoutPromise]).finally(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      setTimeout(() => {
        if (!cancelled) setReady(true);
      }, remaining);
    });

    return () => { cancelled = true; };
  }, [user?.id, user?.phone]);

  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: 20 + Math.random() * 60,
      size: 3 + Math.random() * 6,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 4,
      hue: Math.random() > 0.5 ? '#E53935' : '#43A047',
    })), []);

  const twinkles = useMemo(() =>
    Array.from({ length: TWINKLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 2.4,
    })), []);

  const rays = useMemo(() =>
    Array.from({ length: RAY_COUNT }, (_, i) => ({
      id: i,
      angle: (360 / RAY_COUNT) * i,
      delay: (i * 0.15) % 4,
    })), []);

  if (settingsLoading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] z-[9999] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E53935]"></div>
      </div>
    );
  }

  const logoUrl = getSetting('splash_image_url') || getSetting('logo_url') || tamtomLogo;
  const splashTitle = getSetting('splash_title') || 'طمطوم';
  const splashSubtitle = getSetting('splash_subtitle') || 'أطعم بكل حب، نوصّل بكل سرعة';
  const buttonText = getSetting('splash_button_text') || 'ابدأ الآن';

  const handleStart = () => {
    setShow(false);
    setTimeout(onFinish, 500);
  };

  if (!show) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] z-[9999] transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col transition-opacity duration-500 overflow-hidden" style={{ background: 'linear-gradient(160deg, #0A0A0A 0%, #1A0505 40%, #051A05 100%)' }}>
      {/* خلفية شبكية */}
      <div className="absolute inset-0 splash-bg-mesh pointer-events-none" />

      {/* إشعاعات لونية */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#E53935] opacity-20 blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#43A047] opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-[#E53935] opacity-8 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* نجوم متلألئة */}
      <div className="absolute inset-0 pointer-events-none">
        {twinkles.map((t) => (
          <span
            key={t.id}
            className="absolute rounded-full bg-white splash-twinkle"
            style={{
              left: `${t.left}%`,
              top: `${t.top}%`,
              width: `${t.size}px`,
              height: `${t.size}px`,
              animationDelay: `${t.delay}s`,
              boxShadow: '0 0 8px rgba(255,255,255,0.8)',
            }}
          />
        ))}
      </div>

      {/* خطوط سرعة */}
      <div className="absolute inset-0 overflow-hidden opacity-50 pointer-events-none">
        <div className="absolute top-1/4 right-0 h-1 w-32 bg-gradient-to-l from-[#E53935] to-transparent rounded-full splash-speed-line" />
        <div className="absolute top-1/3 right-0 h-0.5 w-24 bg-gradient-to-l from-[#43A047] to-transparent rounded-full splash-speed-line" style={{ animationDelay: '0.4s' }} />
        <div className="absolute top-1/2 right-0 h-1 w-40 bg-gradient-to-l from-[#E53935] to-transparent rounded-full splash-speed-line" style={{ animationDelay: '0.8s' }} />
        <div className="absolute top-2/3 right-0 h-0.5 w-28 bg-gradient-to-l from-[#43A047] to-transparent rounded-full splash-speed-line" style={{ animationDelay: '1.2s' }} />
      </div>

      {/* قسم الشعار */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="relative">
          {/* أشعة ضوئية */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-80 h-80">
              {rays.map((ray) => (
                <div
                  key={ray.id}
                  className="absolute top-1/2 left-1/2 origin-center splash-ray"
                  style={{
                    width: '2px',
                    height: '180px',
                    marginTop: '-90px',
                    marginLeft: '-1px',
                    background: ray.id % 2 === 0
                      ? 'linear-gradient(to top, transparent, #E53935 60%, transparent)'
                      : 'linear-gradient(to top, transparent, #43A047 60%, transparent)',
                    transform: `rotate(${ray.angle}deg)`,
                    animationDelay: `${ray.delay}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* موجات صدى */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-48 h-48 rounded-full border-2 border-[#E53935] splash-pulse-ring" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-[#43A047] splash-pulse-ring" style={{ animationDelay: '1s' }} />
            <div className="absolute w-48 h-48 rounded-full border-2 border-[#E53935] splash-pulse-ring" style={{ animationDelay: '2s' }} />
          </div>

          {/* الشعار */}
          <div className="relative splash-logo-enter">
            {/* هالة توهج */}
            <div className="absolute inset-0 bg-[#E53935] rounded-full blur-[80px] opacity-40 scale-90" />
            <div className="absolute inset-0 bg-[#43A047] rounded-full blur-[120px] opacity-25 scale-110" />

            {/* حلقات مدارية */}
            <div className="absolute inset-0 -m-4 md:-m-6 rounded-full border-2 border-dashed border-[#E53935]/50 splash-rotate-slow pointer-events-none" />
            <div className="absolute inset-0 -m-10 md:-m-12 rounded-full border border-[#43A047]/25 splash-rotate-reverse pointer-events-none" />
            <div className="absolute inset-0 -m-16 md:-m-20 rounded-full border border-dotted border-[#E53935]/20 splash-rotate-medium pointer-events-none" />

            {/* الشعار */}
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <img
                src={logoUrl}
                alt="طمطوم - Tam Tom"
                className="relative w-full h-full object-contain drop-shadow-[0_25px_60px_rgba(229,57,53,0.65)] splash-float"
                data-testid="img-splash-logo"
              />
              <div className="absolute inset-0 splash-shimmer rounded-full pointer-events-none" />
            </div>

            {/* نجوم على الحلقة الداخلية */}
            <div className="absolute inset-0 -m-4 md:-m-6 splash-rotate-slow pointer-events-none">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#E53935] shadow-[0_0_15px_rgba(229,57,53,1)]" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              <span className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-[#43A047] shadow-[0_0_10px_rgba(67,160,71,0.9)]" />
              <span className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#43A047] shadow-[0_0_10px_rgba(67,160,71,0.9)]" />
            </div>

            {/* نجوم على الحلقة الخارجية */}
            <div className="absolute inset-0 -m-10 md:-m-12 splash-rotate-reverse pointer-events-none">
              <span className="absolute top-1/4 right-0 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="absolute bottom-1/4 left-0 w-1.5 h-1.5 rounded-full bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.9)]" />
            </div>
          </div>

          {/* جسيمات ملونة */}
          <div className="absolute inset-0 -m-32 pointer-events-none">
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute rounded-full splash-particle"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: p.hue,
                  boxShadow: `0 0 ${p.size * 2}px ${p.hue}`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* العنوان */}
        <div className="mt-12 text-center space-y-3 splash-text-enter">
          <h1
            className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(229,57,53,0.5)]"
            data-testid="text-splash-title"
            aria-label={splashTitle}
          >
            {splashTitle.split('').map((ch, i) => (
              <span
                key={i}
                className="splash-letter"
                style={{ animationDelay: `${1 + i * 0.12}s` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </h1>

          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#E53935]" />
            <p className="text-[#E53935] text-xs md:text-sm font-bold tracking-[0.4em]">TAM TOM</p>
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#43A047]" />
          </div>
          <p className="text-base md:text-lg font-medium text-white/75 leading-relaxed max-w-[320px] md:max-w-md mx-auto pt-2">
            {splashSubtitle}
          </p>
        </div>
      </div>

      {/* زر البدء */}
      <div className="w-full px-8 pb-10 md:pb-14 relative z-10 splash-button-enter">
        <div className="max-w-sm mx-auto">
          <Button
            onClick={handleStart}
            disabled={!ready}
            data-testid="button-splash-start"
            className="w-full h-16 md:h-[68px] rounded-2xl text-lg md:text-xl font-black text-white shadow-[0_15px_40px_rgba(229,57,53,0.45)] flex items-center justify-center gap-3 active:scale-95 transition-all group disabled:opacity-70 disabled:cursor-not-allowed border border-white/10 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #E53935 0%, #43A047 100%)' }}
          >
            {ready ? (
              <>
                <span className="relative z-10">{buttonText}</span>
                <ChevronLeft className="h-6 w-6 group-hover:-translate-x-2 transition-transform relative z-10" />
                <span className="absolute inset-0 splash-shimmer" />
              </>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="flex gap-1">
                  <span className="splash-loading-dot inline-block w-1.5 h-1.5 rounded-full bg-white" style={{ animationDelay: '0s' }} />
                  <span className="splash-loading-dot inline-block w-1.5 h-1.5 rounded-full bg-white" style={{ animationDelay: '0.2s' }} />
                  <span className="splash-loading-dot inline-block w-1.5 h-1.5 rounded-full bg-white" style={{ animationDelay: '0.4s' }} />
                </span>
                <span>جاري التحميل</span>
              </span>
            )}
          </Button>
          <p className="text-center text-white/40 text-xs mt-4 font-medium tracking-wide">
            © 2026 طمطوم · جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
