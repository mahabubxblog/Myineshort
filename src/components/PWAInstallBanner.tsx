import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isInstalled || isDismissed || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <>
      <div className="absolute top-14 left-3 right-3 z-30 flex items-center justify-between p-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl backdrop-blur-md shadow-xl text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-rose-600/30 text-rose-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold truncate">অ্যাপ হিসেবে ইনস্টল করুন</p>
            <p className="text-[10px] text-zinc-400">মোবাইল অ্যাপের মতো সহজে অফলাইনে দেখতে</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
          >
            <Download className="w-3.5 h-3.5" />
            ইনস্টল
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-5 border border-zinc-700 text-white">
            <h3 className="font-bold text-base mb-2">আইফোনে ইনস্টল করার নিয়ম:</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              1. Safari ব্রাউজারের নিচের <strong>শেয়ার (Share)</strong> আইকনে চাপুন।
              <br />
              2. নিচে স্ক্রোল করে <strong>"Add to Home Screen"</strong> অপশন সিলেক্ট করুন।
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-semibold"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </>
  );
};
