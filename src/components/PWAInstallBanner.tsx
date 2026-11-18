import React, { useState } from 'react';
import { Download, X, Share, Smartphone, Monitor, CheckCircle } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, or not installable and not iOS, or dismissed, hide
  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await installApp();
    }
  };

  return (
    <>
      {/* Floating Bottom/Top PWA Banner */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 float-in">
        <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="CCTV AI"
              className="w-12 h-12 rounded-xl border border-cyan-400/30 flex-shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                Install CCTV AI App
                <span className="hidden xs:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-400/30">
                  PWA
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Full-screen CCTV alerts for mobile & desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl float-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
                <Smartphone className="w-5 h-5" />
                Install on iPhone / iPad
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apple Safari requires adding to home screen through the share sheet:
            </p>

            <div className="space-y-3 bg-slate-800/70 p-3.5 rounded-xl border border-slate-700 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong className="text-cyan-300">Share button</strong> (box with arrow <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" />) at the bottom of Safari.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="text-cyan-300">Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  3
                </span>
                <span>
                  Tap <strong className="text-cyan-300">Add</strong> in the top-right corner.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
