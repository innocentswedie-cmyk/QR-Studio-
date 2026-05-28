import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Sparkles, Download, Copy, Check, Apple, Play, Compass, Smartphone, Palette, Settings, Upload, Eye, History, Layers, AlertCircle, Share2, QrCode } from 'lucide-react';
import { UniversalRedirectConfig, QRStyle, HistoryItem } from '../types';
import { encodeUniversalConfig } from '../utils';

interface GeneratorStudioProps {
  onAddHistory: (item: HistoryItem) => void;
  initialUrl?: string | null;
  onClearInitialUrl: () => void;
}

export default function GeneratorStudio({ onAddHistory, initialUrl, onClearInitialUrl }: GeneratorStudioProps) {
  // Mode selection: standalone stores vs universal dynamic links
  const [contentType, setContentType] = useState<'single' | 'universal'>('single');
  
  // Single configuration
  const [singleUrl, setSingleUrl] = useState<string>('https://apps.apple.com/us/app/google-maps/id585027354');
  
  // Universal configuration
  const [universalConfig, setUniversalConfig] = useState<UniversalRedirectConfig>({
    appName: 'My Mobile App',
    iosUrl: 'https://apps.apple.com/us/app/google-maps/id585027354',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.maps',
    fallbackUrl: 'https://maps.google.com',
    logoType: 'none'
  });

  // QR design setup
  const [qrStyle, setQrStyle] = useState<QRStyle>({
    darkColor: '#0f172a', // Slate 900
    lightColor: '#ffffff',
    margin: 4,
    logoType: 'none',
    customLogo: undefined,
    logoSize: 0.22 // standard safe center overlay ratio
  });

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [customLogoName, setCustomLogoName] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If a URL was loaded direct from scanner, update standalone inputs
  useEffect(() => {
    if (initialUrl) {
      setContentType('single');
      setSingleUrl(initialUrl);
      onClearInitialUrl();
    }
  }, [initialUrl]);

  // Generate targets string to encode in QR
  const getEncodedString = (): string => {
    if (contentType === 'single') {
      return singleUrl.trim();
    } else {
      // Create redirect URL leading to current website instance
      const origin = window.location.origin + window.location.pathname;
      const b64Data = encodeUniversalConfig(universalConfig);
      return `${origin}?mode=redirect&config=${b64Data}`;
    }
  };

  // Redraw QR Code on style update
  useEffect(() => {
    renderQRCode();
  }, [singleUrl, universalConfig, contentType, qrStyle]);

  const renderQRCode = async () => {
    if (!canvasRef.current) return;
    setIsRendering(true);

    try {
      const payload = getEncodedString();
      if (!payload) {
        setIsRendering(false);
        return;
      }

      // 1. First render high resolution base QR
      const canvas = canvasRef.current;
      await QRCode.toCanvas(canvas, payload, {
        color: {
          dark: qrStyle.darkColor,
          light: qrStyle.lightColor
        },
        margin: qrStyle.margin,
        width: 450, // High-quality dimension
        errorCorrectionLevel: 'H' // Critical for center logos to keep readable
      });

      // 2. Draw overlay custom graphics in center
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (qrStyle.logoType !== 'none') {
          await drawCenterLogo(ctx, canvas.width);
        }
      }
    } catch (err) {
      console.error('QR rendering error', err);
    } finally {
      setIsRendering(false);
    }
  };

  const drawCenterLogo = (ctx: CanvasRenderingContext2D, size: number): Promise<void> => {
    return new Promise((resolve) => {
      const cx = size / 2;
      const cy = size / 2;
      const logoWidth = size * qrStyle.logoSize;
      
      // Draw background shield containing logo
      ctx.save();
      ctx.fillStyle = qrStyle.lightColor;
      
      // Draw slightly larger white pill/box so dots around it are masked
      const pad = logoWidth * 0.18;
      const rx = cx - (logoWidth / 2) - pad;
      const ry = cy - (logoWidth / 2) - pad;
      const rSize = logoWidth + (pad * 2);
      
      // Draw rounded mask
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(rx, ry, rSize, rSize, rSize * 0.25) : ctx.rect(rx, ry, rSize, rSize);
      ctx.fill();
      
      // Draw dark subtle divider border if bg is light
      if (qrStyle.lightColor.toLowerCase() === '#ffffff' || qrStyle.lightColor.toLowerCase() === '#fff') {
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      const drawDefaultBadge = (color: string, drawSymbol: (x: number, y: number, w: number) => void) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        const boxX = cx - (logoWidth / 2);
        const boxY = cy - (logoWidth / 2);
        ctx.roundRect ? ctx.roundRect(boxX, boxY, logoWidth, logoWidth, logoWidth * 0.22) : ctx.rect(boxX, boxY, logoWidth, logoWidth);
        ctx.fill();

        // Draw child vectors
        drawSymbol(cx, cy, logoWidth);
        ctx.restore();
        resolve();
      };

      if (qrStyle.logoType === 'appstore') {
        // App store color theme (Apple Blue)
        drawDefaultBadge('#0071e3', (x, y, w) => {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = w * 0.12;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Stylized central white glyph 'A'
          const scale = w * 0.22;
          ctx.beginPath();
          ctx.moveTo(x, y - scale * 0.8);
          ctx.lineTo(x + scale * 0.7, y + scale * 0.8);
          ctx.moveTo(x - scale * 0.7, y + scale * 0.8);
          ctx.lineTo(x + scale * 0.3, y - scale * 0.6);
          
          ctx.moveTo(x - scale * 0.5, y + scale * 0.25);
          ctx.lineTo(x + scale * 0.5, y + scale * 0.25);
          ctx.stroke();
        });
      } else if (qrStyle.logoType === 'playstore') {
        // Play store color theme (Darker charcoal background containing colorful logo)
        drawDefaultBadge('#1f2937', (x, y, w) => {
          const s = w * 0.25;
          ctx.fillStyle = '#34d399'; // Green arrow tip
          ctx.beginPath();
          ctx.moveTo(x - s, y - s);
          ctx.lineTo(x + s * 1.2, y);
          ctx.lineTo(x - s, y + s);
          ctx.closePath();
          ctx.fill();
        });
      } else if (qrStyle.logoType === 'download') {
        // Classic install badge (emerald background)
        drawDefaultBadge('#10b981', (x, y, w) => {
          ctx.fillStyle = '#ffffff';
          const sw = w * 0.16;
          // Down arrow
          ctx.beginPath();
          ctx.rect(x - sw/2, y - w*0.25, sw, w*0.3);
          ctx.moveTo(x - sw * 1.5, y + w*0.05);
          ctx.lineTo(x, y + w*0.35);
          ctx.lineTo(x + sw * 1.5, y + w*0.05);
          ctx.closePath();
          ctx.fill();
        });
      } else if (qrStyle.logoType === 'custom' && qrStyle.customLogo) {
        // Render uploaded file base64
        const img = new Image();
        img.onload = () => {
          ctx.save();
          // Draw image inside center bounds
          ctx.beginPath();
          const targetX = cx - (logoWidth / 2);
          const targetY = cy - (logoWidth / 2);
          
          // Clip to round rectangle for neatness
          ctx.roundRect ? ctx.roundRect(targetX, targetY, logoWidth, logoWidth, logoWidth * 0.22) : ctx.rect(targetX, targetY, logoWidth, logoWidth);
          ctx.clip();
          ctx.drawImage(img, targetX, targetY, logoWidth, logoWidth);
          ctx.restore();
          resolve();
        };
        img.onerror = () => {
          resolve();
        };
        img.src = qrStyle.customLogo;
      } else {
        resolve();
      }
    });
  };

  // Upload own logo wrapper
  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomLogoName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setQrStyle(prev => ({
            ...prev,
            logoType: 'custom',
            customLogo: event.target?.result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save layout to local history
  const logGeneratedToHistory = () => {
    const platform = contentType === 'single' ? 'unknown' : 'universal';
    const primaryUrl = getEncodedString();
    
    // Add custom descriptive title
    const title = contentType === 'single' 
      ? `QR: ${singleUrl.substring(0, 32)}...` 
      : `Universal: ${universalConfig.appName}`;

    onAddHistory({
      id: Math.random().toString(36).substring(2, 11),
      type: 'generate',
      timestamp: Date.now(),
      title,
      url: primaryUrl,
      platform,
      universalDetails: contentType === 'universal' ? {
        appName: universalConfig.appName,
        iosUrl: universalConfig.iosUrl,
        androidUrl: universalConfig.androidUrl,
        fallbackUrl: universalConfig.fallbackUrl
      } : undefined
    });
  };

  // Download high-DPI QR as image
  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    logGeneratedToHistory();

    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${contentType === 'single' ? 'app' : universalConfig.appName.replace(/\s+/g, '_')}_download_qr.png`;
    link.href = url;
    link.click();
  };

  // Format link helper copy
  const copyEmbedCode = () => {
    const url = getEncodedString();
    const code = `<a href="${url}" target="_blank"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}" alt="Scan to install app" /></a>`;
    navigator.clipboard.writeText(code);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const copyUrlLink = () => {
    navigator.clipboard.writeText(getEncodedString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Switch types resets
  const selectQuickTemplate = (platform: 'ios' | 'android') => {
    setContentType('single');
    if (platform === 'ios') {
      setSingleUrl('https://apps.apple.com/us/app/google-maps/id585027354');
      setQrStyle(prev => ({ ...prev, logoType: 'appstore' }));
    } else {
      setSingleUrl('https://play.google.com/store/apps/details?id=com.google.android.apps.maps');
      setQrStyle(prev => ({ ...prev, logoType: 'playstore' }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Design Configuration Controls (Left Hand Side) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Core Settings Mode Block */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-4">
            <QrCode className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-sans font-semibold text-gray-900 leading-none">QR Code Target Configuration</h2>
              <p className="text-xs text-gray-400 mt-1">Configure whether this QR should point to a single platform, or adapt dynamically.</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <button
              onClick={() => setContentType('single')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold select-none transition-all ${
                contentType === 'single'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-100'
                  : 'text-gray-500 hover:text-gray-900 bg-transparent'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Standalone Store URL
            </button>
            <button
              onClick={() => setContentType('universal')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold select-none transition-all ${
                contentType === 'universal'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-100'
                  : 'text-gray-500 hover:text-gray-900 bg-transparent'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Universal Smart Redirect QR
            </button>
          </div>

          {/* SINGLE URL INPUTS */}
          {contentType === 'single' ? (
            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">App Store or Android Play Link</label>
                <div className="relative">
                  <input
                    type="url"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    placeholder="https://apps.apple.com/us/app/... or https://play.google.com/..."
                    className="w-full text-xs py-3 pl-3 pr-20 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium">Link</span>
                  </div>
                </div>
              </div>

              {/* Fast presets */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Store Templates</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => selectQuickTemplate('ios')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-100 hover:bg-slate-50 text-xs font-medium text-slate-700"
                  >
                    <Apple className="h-3.5 w-3.5 text-slate-900" /> App Store Prep
                  </button>
                  <button 
                    onClick={() => selectQuickTemplate('android')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-100 hover:bg-slate-50 text-xs font-medium text-slate-700"
                  >
                    <Play className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" /> Google Play Prep
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* UNIVERSAL MULTI-PLATFORM INPUTS */
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/30 flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-indigo-900">How "Smart Redirect" Works</h4>
                  <p className="text-[10px] text-indigo-700 leading-relaxed">
                    This single intelligent QR code automatically checks whether the scanning visitor is running Android or iOS, and routes them straight to their default app catalog!
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Target Mobile App Name</label>
                <input
                  type="text"
                  value={universalConfig.appName}
                  onChange={(e) => setUniversalConfig(prev => ({ ...prev, appName: e.target.value }))}
                  placeholder="e.g. Acme Messenger"
                  className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Apple className="h-3 w-3 text-slate-600" /> Apple App Store URL (iOS)
                  </label>
                  <input
                    type="url"
                    value={universalConfig.iosUrl}
                    onChange={(e) => setUniversalConfig(prev => ({ ...prev, iosUrl: e.target.value }))}
                    placeholder="https://apps.apple.com/us/app/..."
                    className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Play className="h-3 w-3 text-emerald-600 fill-emerald-600" /> Google Play Store URL (Android)
                  </label>
                  <input
                    type="url"
                    value={universalConfig.androidUrl}
                    onChange={(e) => setUniversalConfig(prev => ({ ...prev, androidUrl: e.target.value }))}
                    placeholder="https://play.google.com/store/apps/..."
                    className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Desktop or Fallback Site (Web)</label>
                <input
                  type="url"
                  value={universalConfig.fallbackUrl}
                  onChange={(e) => setUniversalConfig(prev => ({ ...prev, fallbackUrl: e.target.value }))}
                  placeholder="https://mywebsite.com"
                  className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* CUSTOM LAYOUT LOOKS (COLOR, PALETTE & BRAND SELECTION) */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-4">
            <Palette className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-md font-sans font-semibold text-gray-900 leading-none font-sans">Brand Styling & Central Logo</h2>
              <p className="text-xs text-gray-400 mt-1">Blend primary brand colors and include default App Store badges.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Color controls */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Dark QR Code Foreground</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2.5 bg-gray-50/50">
                <input
                  type="color"
                  value={qrStyle.darkColor}
                  onChange={(e) => setQrStyle(prev => ({ ...prev, darkColor: e.target.value }))}
                  className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                />
                <input 
                  type="text"
                  value={qrStyle.darkColor}
                  onChange={(e) => setQrStyle(prev => ({ ...prev, darkColor: e.target.value }))}
                  className="bg-transparent border-0 outline-none focus:ring-0 text-xs font-mono p-0 block w-full text-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Light QR Code Background</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2.5 bg-gray-50/50">
                <input
                  type="color"
                  value={qrStyle.lightColor}
                  onChange={(e) => setQrStyle(prev => ({ ...prev, lightColor: e.target.value }))}
                  className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                />
                <input 
                  type="text"
                  value={qrStyle.lightColor}
                  onChange={(e) => setQrStyle(prev => ({ ...prev, lightColor: e.target.value }))}
                  className="bg-transparent border-0 outline-none focus:ring-0 text-xs font-mono p-0 block w-full text-gray-700"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Margin padding slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Margin Padding</label>
                <span className="text-xs font-semibold text-gray-600 font-mono">{qrStyle.margin}px border</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={qrStyle.margin}
                onChange={(e) => setQrStyle(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600 bg-gray-100 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Logo scaling slider */}
            {qrStyle.logoType !== 'none' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Central Logo Scale</label>
                  <span className="text-xs font-semibold text-gray-600 font-mono">{Math.round(qrStyle.logoSize * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="28"
                  value={Math.round(qrStyle.logoSize * 100)}
                  onChange={(e) => setQrStyle(prev => ({ ...prev, logoSize: parseInt(e.target.value) / 100 }))}
                  className="w-full accent-indigo-600 bg-gray-100 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Centered Graphic Badge Selector */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Central Icon Cover Badge</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setQrStyle(prev => ({ ...prev, logoType: 'none' }))}
                className={`py-2 px-3 border rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 select-none transition-colors ${
                  qrStyle.logoType === 'none'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                    : 'border-gray-200 hover:bg-slate-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="h-4 w-4" /> None
              </button>
              
              <button
                onClick={() => setQrStyle(prev => ({ ...prev, logoType: 'appstore' }))}
                className={`py-2 px-3 border rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 select-none transition-colors ${
                  qrStyle.logoType === 'appstore'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                    : 'border-gray-200 hover:bg-slate-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                <Apple className="h-4 w-4" /> App Store
              </button>

              <button
                onClick={() => setQrStyle(prev => ({ ...prev, logoType: 'playstore' }))}
                className={`py-2 px-3 border rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 select-none transition-colors ${
                  qrStyle.logoType === 'playstore'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                    : 'border-gray-200 hover:bg-slate-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                <Play className="h-4 w-4" /> Google Play
              </button>

              <button
                onClick={() => setQrStyle(prev => ({ ...prev, logoType: 'download' }))}
                className={`py-2 px-3 border rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 select-none transition-colors ${
                  qrStyle.logoType === 'download'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                    : 'border-gray-200 hover:bg-slate-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                <Download className="h-4 w-4" /> Install Arrow
              </button>
            </div>

            {/* Custom file uploading logo */}
            <div className="mt-3.5 pt-3 border-t border-gray-50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-sans font-semibold text-gray-700 block">Custom Center Brand Logo</span>
                <p className="text-[10px] text-gray-400 mt-0.5">Upload a square PNG or JPG to position in the center shield.</p>
              </div>

              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleCustomLogoUpload} 
                  className="hidden" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    qrStyle.logoType === 'custom' 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' 
                      : 'bg-white hover:bg-slate-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <Upload className="h-3 w-3" />
                  {qrStyle.logoType === 'custom' && customLogoName ? 'Change Logo' : 'Upload File'}
                </button>
              </div>
            </div>
            
            {qrStyle.logoType === 'custom' && customLogoName && (
              <p className="text-[10px] text-emerald-600 mt-1 font-mono">✓ Loaded: {customLogoName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Digital Visual Rendering & Download Port (Right Hand Side) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-bold block mb-4">Designer Studio Output</span>

          {/* QR Container Frame */}
          <div className="relative p-5 rounded-2xl bg-gray-50/50 border border-gray-100 shadow-inner flex items-center justify-center aspect-square max-w-[280px]">
            {isRendering && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            )}
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className="mt-6 w-full space-y-3">
            {/* Download Button triggering browser storage logs too */}
            <button
              onClick={handleDownload}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/15 select-none cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download Lossless PNG (450px)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyUrlLink}
                className="py-2.5 px-3 border border-gray-100 hover:bg-gray-50 text-[11px] font-semibold text-gray-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors select-none"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-gray-400" /> Copy Target URL
                  </>
                )}
              </button>

              <button
                onClick={copyEmbedCode}
                className="py-2.5 px-3 border border-gray-100 hover:bg-gray-50 text-[11px] font-semibold text-gray-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors select-none"
              >
                {copiedEmbed ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied Embed!
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-gray-400" /> HTML Embed Code
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-5 w-full border-t border-gray-50 pt-4 text-left">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">QR Target Link Verification</span>
            <p className="font-mono text-[10px] text-gray-400 break-all bg-gray-50 rounded p-2.5 border border-gray-100 line-clamp-2">
              {getEncodedString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
