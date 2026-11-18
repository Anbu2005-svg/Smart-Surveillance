import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if running in standalone mode (installed PWA)
  const checkIsStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneMQ = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandaloneMQ || isIosStandalone;
  }, []);

  // Detect iOS Safari
  const isIOS = typeof window !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  useEffect(() => {
    setIsInstalled(checkIsStandalone());

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            setRegistration(reg);

            // Check for service worker updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setHasUpdate(true);
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration error:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // Listen for BeforeInstallPrompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Online / Offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkIsStandalone]);

  // Trigger browser install prompt
  const installApp = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Install prompt error:', err);
      return false;
    }
  };

  // Trigger service worker update
  const updateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ action: 'skipWaiting' });
    }
    window.location.reload();
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    hasUpdate,
    isIOS,
    installApp,
    updateApp,
  };
}
