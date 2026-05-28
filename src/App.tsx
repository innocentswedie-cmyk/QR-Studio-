import React, { useState, useEffect } from 'react';
import { QrCode, Camera, History, Sparkles, Smartphone, Download, HelpCircle, ArrowRightCircle, ExternalLink, Lightbulb, UserCheck, ShieldAlert, Laptop, Play } from 'lucide-react';
import ScannerHub from './components/ScannerHub';
import GeneratorStudio from './components/GeneratorStudio';
import RedirectPortal from './components/RedirectPortal';
import { HistoryItem } from './types';

export default function App() {
  // Query management for redirect routing
  const [currentMode, setCurrentMode] = useState<'app' | 'redirect'>('app');
  const [redirectConfig, setRedirectConfig] = useState<string>('');
  
  // Dashboard navigation tab active
  const [activeTab, setActiveTab] = useState<'generator' | 'scanner' | 'history'>('generator');
  
  // Global LocalStorage QR history state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Bridge scanned QR straight into Creator Inputs for refinement
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);

  // Initialize query parameter lookups & localStorage logs
  useEffect(() => {
    // 1. Process potential redirect triggers
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const config = params.get('config');

    if (mode === 'redirect' && config) {
      setCurrentMode('redirect');
      setRedirectConfig(config);
    } else {
      setCurrentMode('app');
    }

    // 2. Fetch browser storage logs
    const saved = localStorage.getItem('qr_studio_history_logs');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.warn('Could not read history logs', e);
      }
    }
  }, []);

  // Update localStorage logs helper
  const saveHistoryLogs = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem('qr_studio_history_logs', JSON.stringify(items));
  };

  const handleAddHistoryItem = (item: HistoryItem) => {
    const updated = [item, ...history];
    saveHistoryLogs(updated);
  };

  const handleClearHistory = () => {
    saveHistoryLogs([]);
  };

  const handleBridgeScannerValue = (url: string) => {
    setBridgeUrl(url);
    setActiveTab('generator');
  };

  // If redirectMode is active, bypass normal layouts completely.
  if (currentMode === 'redirect') {
    return <RedirectPortal configParam={redirectConfig} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      
      {/* Dynamic Header Navbar Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left aligned branding logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
                <QrCode className="h-5 w-5 animate-pulse-slow" />
              </div>
              <div>
                <span className="font-heading font-extrabold text-sm text-gray-900 tracking-tight block leading-none">
                  App QR Studio
                </span>
                <span className="text-[10px] font-mono font-medium text-indigo-600 tracking-wider">UNIVERSAL DUAL DIRECTS</span>
              </div>
            </div>

            {/* Middle navigation tabs */}
            <nav className="flex items-center space-x-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-100/70">
              <button
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${
                  activeTab === 'generator'
                    ? 'bg-white text-indigo-700 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-800 bg-transparent'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" /> Designer QR
              </button>

              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${
                  activeTab === 'scanner'
                    ? 'bg-white text-indigo-700 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-800 bg-transparent'
                }`}
              >
                <Camera className="h-3.5 w-3.5" /> Web Scanner
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-700 shadow-xs border border-gray-100'
                    : 'text-gray-500 hover:text-gray-800 bg-transparent'
                }`}
              >
                <History className="h-3.5 w-3.5" /> History List
              </button>
            </nav>

            {/* Right side static feedback tag */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-widest bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                v1.1 Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Active View Module Router */}
        {activeTab === 'generator' && (
          <GeneratorStudio 
            onAddHistory={handleAddHistoryItem}
            initialUrl={bridgeUrl}
            onClearInitialUrl={() => setBridgeUrl(null)}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerHub 
            onAddHistory={handleAddHistoryItem}
            onLoadInGenerator={handleBridgeScannerValue}
            history={history}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'history' && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-50 pb-5">
              <div>
                <h2 className="text-xl font-sans font-bold text-gray-900 tracking-tight">QR Generation History</h2>
                <p className="text-xs text-gray-400 mt-1">Review all your historically compiled or scanned QR files in one place.</p>
              </div>
              
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 font-semibold text-xs border border-rose-100 hover:bg-rose-50 text-rose-700 rounded-xl transition-colors select-none"
                >
                  Clear History Database
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto space-y-4">
                <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                  <QrCode className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-800">Your layout list is completely empty</h3>
                  <p className="text-xs text-gray-400">
                    Generated download setups and scanned payloads appear here for future lookups.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    className="border border-gray-100 bg-gray-50/10 hover:bg-white rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.type === 'scan'
                            ? 'bg-teal-50 text-teal-700 border border-teal-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {item.type === 'scan' ? 'Scanned' : 'Created'}
                        </span>
                        
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-gray-900 truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <p className="font-mono text-[10px] text-gray-400 break-all select-all hover:text-slate-700 transition-colors line-clamp-2">
                          {item.url}
                        </p>
                      </div>

                      {item.universalDetails && (
                        <div className="border border-indigo-50 bg-indigo-50/10 rounded-xl p-3 space-y-1.5">
                          <span className="text-[9px] font-bold text-indigo-600 block uppercase tracking-wider">Redirection Directory</span>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                            <div>
                              <span className="font-medium text-gray-400 block">iOS target:</span>
                              <span className="truncate block font-semibold text-gray-600 select-all" title={item.universalDetails.iosUrl}>
                                {item.universalDetails.iosUrl}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-400 block">Android target:</span>
                              <span className="truncate block font-semibold text-gray-600 select-all" title={item.universalDetails.androidUrl}>
                                {item.universalDetails.androidUrl}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                      <button
                        onClick={() => {
                          if (item.type === 'scan') {
                            handleBridgeScannerValue(item.url);
                          } else {
                            // If generated, switch and load target parameters in generators
                            setBridgeUrl(item.url);
                            setActiveTab('generator');
                          }
                        }}
                        className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-gray-100 text-slate-700 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-colors select-none"
                      >
                        <Sparkles className="h-3 w-3 text-indigo-600" /> Open in Designer
                      </button>

                      {item.url.startsWith('http') && (
                        <a
                          href={item.url}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors select-none"
                        >
                          Launch Url <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Informative Platform Guidelines Grid */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 lg:p-8 space-y-6 shadow-lg border border-indigo-900/40 relative overflow-hidden">
          {/* Subtle grid mesh graphics background */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

          <div className="flex items-start gap-4 relative z-10">
            <div className="h-10 w-10 bg-indigo-700/60 rounded-xl flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
              <Lightbulb className="h-5 w-5 text-indigo-300 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-md font-sans font-bold tracking-tight">App Directory Optimization Guidelines</h3>
                <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                  Maximizing download rates begins with convenient scanner compatibility. Keep QR contrast values high and include universal redirect wrappers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">1. Universal Links</span>
                  <p className="text-[11px] leading-relaxed text-indigo-200/80">
                    Use our "Smart Redirect QR" configuration to pack multiple targets into a single symbol. One code serves all iOS and Android smartphone scanners perfectly.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">2. Scanner Branding</span>
                  <p className="text-[11px] leading-relaxed text-indigo-200/80">
                    Adding descriptive center logo overlays (like default App Store symbols) increases user scanner confidence and improves design conversion values.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">3. Fallback Layouts</span>
                  <p className="text-[11px] leading-relaxed text-indigo-200/80">
                    Desktop clients parsing your universal smart link shouldn't render faulty configurations. Our portal provides responsive catalog grids with fast download options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Humble Footer Block */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <QrCode className="h-4 w-4 text-indigo-600" />
            <span>© 2026 App QR Studio Hub. All codes generated securely client-side.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Safety Standards</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Client Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
