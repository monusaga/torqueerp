import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  QrCode,
  ShieldCheck,
  Zap,
  Camera,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Sparkles,
  FileCheck,
  Package,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const DownloadAppPage: React.FC = () => {
  const [downloadInitiated, setDownloadInitiated] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Real QR code encoding this site's actual APK URL, so scanning it from a
  // phone downloads directly (the phone must be able to reach this host).
  const apkUrl = `${window.location.origin}/downloads/MonuSagar-v1.3.0.apk`;

  useEffect(() => {
    QRCode.toDataURL(apkUrl, {
      width: 352,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [apkUrl]);

  const appInfo = {
    name: 'Monu Sagar Android',
    version: '1.3.0',
    versionCode: 4,
    size: '71.4 MB',
    minAndroid: 'Android 8.0 (Oreo) or higher',
    targetAndroid: 'Android 15 (API 35/36)',
    releaseDate: 'August 2026',
    packageId: 'com.torqueerp.app',
    sha256: '0c49ee7f985e4216e0679867f1e1036a1f0d6620da0c20d23e3f34fd6f6b7ac5',
  };

  // Primary download is the static file: it is bundled with the web app itself,
  // so it works even when the API backend is unreachable. The API stream at
  // /api/v1/downloads/android remains available as a mirror.
  const handleDownload = () => {
    setDownloadInitiated(true);
    try {
      const link = document.createElement('a');
      link.href = '/downloads/MonuSagar-v1.3.0.apk';
      link.setAttribute('download', 'MonuSagar-v1.3.0.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = '/api/v1/downloads/android';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200 py-16 lg:py-24">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-slate-200 rounded-full blur-3xl opacity-40 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Details & Download CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Official Android Release v{appInfo.version}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  Carry Your Entire Spare Parts Garage <br />
                  <span className="text-amber-600">In Your Pocket.</span>
                </h1>

                <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">
                  Transform your Android smartphone into a high-speed POS terminal, hardware barcode scanner, real-time stock ledger, and billing machine with the native Monu Sagar Android app.
                </p>

                {/* Primary Download Button Card */}
                <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/15 border border-slate-800 space-y-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Latest Release</div>
                      <div className="text-lg font-black text-white flex items-center space-x-2">
                        <span>Monu Sagar APK</span>
                        <span className="text-xs bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded">v{appInfo.version}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Size: <span className="text-white font-bold">{appInfo.size}</span></div>
                      <div>Min: <span className="text-white font-bold">{appInfo.minAndroid}</span></div>
                    </div>
                  </div>

                  <a
                    href="/downloads/MonuSagar-v1.3.0.apk"
                    download="MonuSagar-v1.3.0.apk"
                    onClick={() => setDownloadInitiated(true)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base py-4 px-6 rounded-xl transition duration-150 flex items-center justify-center space-x-3 shadow-lg shadow-amber-500/25 active:scale-[0.99] cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-slate-950" />
                    <span>Download Android APK (Direct Install)</span>
                  </a>

                  {downloadInitiated && (
                    <div className="bg-amber-500/20 border border-amber-500/40 p-3 rounded-lg flex items-center space-x-2 text-xs text-amber-300">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      <span>Downloading `MonuSagar-v1.3.0.apk`. Follow the installation steps below!</span>
                    </div>
                  )}

                  <div className="text-center text-[11px] text-slate-400">
                    Having trouble?{' '}
                    <a
                      href="/api/v1/downloads/android"
                      download="MonuSagar-v1.3.0.apk"
                      className="text-amber-400 hover:text-amber-300 font-bold underline ml-1"
                    >
                      Click here for API Mirror Download Link
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>100% Virus & Malware Free</span>
                    </span>
                    <span>Package: {appInfo.packageId}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Hardware Camera Scanner</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Sub-Second POS Counter</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Real-Time Cloud Sync</span>
                  </div>
                </div>
              </div>

              {/* Right Column: QR Code & Mobile Visual Card */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="bg-white border-2 border-slate-200 p-8 rounded-3xl shadow-xl w-full max-w-sm text-center space-y-6">
                  <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                    <Smartphone className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Scan from Phone</h3>
                    <p className="text-xs text-slate-500 mt-1">Point your Android camera here to download directly onto your device</p>
                  </div>

                  {/* Real QR Code encoding this site's APK download URL */}
                  <div className="bg-white p-3 rounded-2xl mx-auto inline-block shadow-inner border border-slate-200">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR code linking to the Monu Sagar APK download" className="w-44 h-44" />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                        Generating QR…
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 truncate">
                    {apkUrl.replace(/^https?:\/\//, '')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STEP BY STEP INSTALLATION GUIDE */}
        <section className="py-16 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-xs uppercase tracking-widest font-black text-amber-600">Quick Installation</h2>
              <p className="text-3xl font-black text-slate-900 mt-2">How to Install in 4 Simple Steps</p>
              <p className="text-slate-600 text-sm mt-2">No complicated setup. Download, tap install, and start running sales.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Tap Download APK</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click the amber download button above or scan the QR code using your mobile phone camera.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Allow Unknown Sources</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If prompted by Chrome/Android security, toggle <em>"Allow from this source"</em> to allow direct APK installation.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Tap Install</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tap the downloaded <code className="text-slate-800 font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">MonuSagar-v1.3.0.apk</code> file in your notifications or Downloads folder and tap <strong>Install</strong>.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-lg mb-4">
                  4
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Log In & Start Billing</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open Monu Sagar, log in with your email & password, and start scanning barcodes or making sales immediately!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* NATIVE MOBILE CAPABILITIES */}
        <section className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-xs uppercase tracking-widest font-black text-amber-600">Built for Garage Speed</h2>
              <p className="text-3xl font-black text-slate-900 mt-2">Native Android Advantages</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">CameraX & Google ML Kit</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ultra-responsive barcode detection and OCR label reading directly via hardware camera with 0ms cloud lag.
                </p>
              </div>

              <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Jetpack Compose UI</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Modern, fluid 120Hz native Material 3 interface optimized for one-handed operation on the counter or shop floor.
                </p>
              </div>

              <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Encrypted JWT Session</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enterprise-grade tenant boundary isolation and persistent authentication secured by Android KeyStore.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
export default DownloadAppPage;
