import React, { useEffect, useState } from 'react';
import { Smartphone, Apple, Play, ExternalLink, HelpCircle, Compass, Check, Sparkles, ArrowRightCircle } from 'lucide-react';
import { UniversalRedirectConfig } from '../types';
import { decodeUniversalConfig, detectUserOS } from '../utils';

interface RedirectPortalProps {
  configParam: string;
}

export default function RedirectPortal({ configParam }: RedirectPortalProps) {
  const [config, setConfig] = useState<UniversalRedirectConfig | null>(null);
  const [detectedOS, setDetectedOS] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [redirectStatus, setRedirectStatus] = useState<'loading' | 'redirecting' | 'failed' | 'manual'>('loading');
  const [countdown, setCountdown] = useState<number>(3);
  const [targetUrl, setTargetUrl] = useState<string>('');

  useEffect(() => {
    if (!configParam) {
      setRedirectStatus('failed');
      return;
    }

    const decoded = decodeUniversalConfig(configParam);
    if (!decoded) {
      setRedirectStatus('failed');
      return;
    }

    setConfig(decoded);
    const os = detectUserOS();
    setDetectedOS(os);

    // Pick target store URL
    let destination = decoded.fallbackUrl || window.location.origin;
    if (os === 'ios' && decoded.iosUrl) {
      destination = decoded.iosUrl;
    } else if (os === 'android' && decoded.androidUrl) {
      destination = decoded.androidUrl;
    }

    setTargetUrl(destination);
    setRedirectStatus('redirecting');
  }, [configParam]);

  // Handle countdown and replacement redirect triggers
  useEffect(() => {
    if (redirectStatus !== 'redirecting' || !targetUrl) return;

    // Instant trigger or slight delay for UI polish 
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [redirectStatus, targetUrl]);

  const triggerRedirect = () => {
    if (targetUrl) {
      window.location.replace(targetUrl);
    }
  };

  if (redirectStatus === 'failed') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-100 p-8 rounded-2xl shadow-sm text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-heading font-bold text-gray-900">Unrecognized Universal Link</h2>
          <p className="text-xs text-gray-500">
            The link parameters appear to be corrupt or incomplete. Please regenerate your smart unified download QR code.
          </p>
          <a
            href={window.location.origin}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Go to Generator Hub
          </a>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Sleek App Branding Frame */}
        <div className="p-8 pb-6 text-center border-b border-gray-50 space-y-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center shadow-inner border border-indigo-200/40 relative">
            <span className="text-2xl font-black text-indigo-700 uppercase">
              {config.appName.substring(0, 2)}
            </span>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
              <Sparkles className="h-2.5 w-2.5 text-white animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{config.appName}</h1>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">Automated Platform Redirector</p>
          </div>
        </div>

        {/* Action / State Core Block */}
        <div className="p-8 space-y-6">
          {detectedOS !== 'desktop' ? (
            /* MOBILE ROUTE - EXPLAIN AUTOMATED REDIRECT */
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Active Link Detection</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Target Device Detected:{' '}
                  <span className="font-semibold text-gray-900 border border-slate-200 px-2 py-0.5 rounded-md bg-slate-50">
                    {detectedOS === 'ios' ? 'Apple Device (iOS)' : 'Android Phone'}
                  </span>
                </p>
                
                <p className="text-sm font-medium text-slate-700 leading-normal">
                  Redirecting you to the {detectedOS === 'ios' ? 'Apple App Store' : 'Google Play Store'} in <span className="font-bold text-indigo-600 font-mono text-base">{countdown}</span> seconds...
                </p>
              </div>

              {/* Progress visual bar */}
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-1000 rounded-full"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>

              <button
                onClick={triggerRedirect}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Go Directly Now <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* DESKTOP VIEW - MULTI-STORE DIRECTORY SELECTOR */
            <div className="space-y-5">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Desk Client Spotted</h4>
                  <p className="text-[10px] text-amber-700 leading-normal">
                    To download the software catalog directly to your mobile, use your camera, or pick from the direct catalog options below.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Direct Download Portals</span>
                
                {config.iosUrl && (
                  <a
                    href={config.iosUrl}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center">
                        <Apple className="h-4 w-4 fill-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700">iOS App Store Catalog</h4>
                        <p className="text-[10px] text-gray-400">Install file on Apple iPhone / iPad</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                  </a>
                )}

                {config.androidUrl && (
                  <a
                    href={config.androidUrl}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-400 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Play className="h-4 w-4 fill-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700">Google Play Store Catalog</h4>
                        <p className="text-[10px] text-gray-400">Install file on Android smartphone</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </a>
                )}

                {config.fallbackUrl && (
                  <a
                    href={config.fallbackUrl}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-gray-400 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <Compass className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700">Developer Web Console</h4>
                        <p className="text-[10px] text-gray-400">Launch standard desktop landing site</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Small subtle footer credit card */}
      <span className="text-[10px] text-gray-400/80 mt-6 flex items-center gap-1.5 font-sans">
        Powered by <strong className="font-semibold text-gray-500">App QR Studio Generator</strong>
      </span>
    </div>
  );
}
