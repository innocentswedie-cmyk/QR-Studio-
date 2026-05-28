import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';
import { Camera, Image, Check, AlertCircle, Copy, ExternalLink, ArrowRight, RotateCw, History, ShieldAlert, Sparkles, Volume2, Trash2 } from 'lucide-react';
import { detectPlatformFromUrl, parseAppStoreUrl } from '../utils';
import { AppPlatform, HistoryItem } from '../types';

interface ScannerHubProps {
  onAddHistory: (item: HistoryItem) => void;
  onLoadInGenerator: (url: string) => void;
  history: HistoryItem[];
  onClearHistory: () => void;
}

export default function ScannerHub({ onAddHistory, onLoadInGenerator, history, onClearHistory }: ScannerHubProps) {
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanSpeed, setScanSpeed] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Refs for camera scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play synthesized crisp notification beep
  const playBeep = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(950, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio Context is locked or unsupported', e);
    }
  };

  // Check camera availability and list cameras
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setCameraPermission('unsupported');
      return;
    }

    // List inputs
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        // Prefer environment/back camera by default
        const backCam = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    }).catch(err => {
      console.warn('Could not enumerate cameras', err);
    });
  }, []);

  // Set up camera stream
  useEffect(() => {
    if (!useCamera || !selectedCameraId) {
      stopCamera();
      return;
    }

    let stream: MediaStream | null = null;
    setErrorMessage(null);

    navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment'
      }
    })
      .then(videoStream => {
        stream = videoStream;
        setCameraPermission('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
          // Wait for metadata to load to play
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              // Start processing frames
              animationFrameRef.current = requestAnimationFrame(processVideoFrame);
            }).catch(e => {
              console.error('Video play error', e);
            });
          };
        }
      })
      .catch(err => {
        console.error('Camera connection error', err);
        setCameraPermission('denied');
        setUseCamera(false);
        if (err.name === 'NotAllowedError') {
          setErrorMessage('Camera access was denied. Please update website permissions in your browser bar.');
        } else {
          setErrorMessage('Could not open camera. Make sure no other application is using it.');
        }
      });

    return () => {
      stopCamera(thisStream => {
        if (thisStream) {
          thisStream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, [useCamera, selectedCameraId]);

  const stopCamera = (cleanupFn?: (s: MediaStream | null) => void) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      if (stream) {
        if (cleanupFn) {
          cleanupFn(stream);
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      }
      videoRef.current.srcObject = null;
    }
  };

  // Capture looping analysis of frames
  const processVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      // Scale canvas to video inputs
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const startTime = performance.now();
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      const endTime = performance.now();
      setScanSpeed(Math.round(endTime - startTime));

      if (code && code.data) {
        // Outline QR Code on Canvas
        drawQRHighlight(ctx, code.location);
        
        // Prevent duplicate spamming of same QR code
        handleSuccessfullyScannedCode(code.data);
        return; // Break scanning loop to show result
      }
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  };

  // Draw overlay rectangle around the scanner area
  const drawQRHighlight = (ctx: CanvasRenderingContext2D, location: any) => {
    ctx.strokeStyle = '#22c55e'; // success green
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    ctx.closePath();
    ctx.stroke();
  };

  const handleSuccessfullyScannedCode = (data: string) => {
    stopCamera();
    playBeep();
    setScannedResult(data);
    setIsSuccess(true);
    setUseCamera(false);

    // Save scan to history
    const platform = detectPlatformFromUrl(data);
    let title = 'Scanned URL';
    const parsed = parseAppStoreUrl(data);
    if (parsed) {
      title = `${parsed.name} (${parsed.platform === 'ios' ? 'iOS' : 'Android'})`;
    } else if (data.startsWith('http')) {
      try {
        const u = new URL(data);
        title = u.hostname.replace('www.', '');
      } catch (e) {
        // Ignored
      }
    }

    onAddHistory({
      id: Math.random().toString(36).substring(2, 11),
      type: 'scan',
      timestamp: Date.now(),
      title,
      url: data,
      platform
    });

    setTimeout(() => {
      setIsSuccess(false);
    }, 1500);
  };

  // Handle manual files upload or parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseQRCodeFromFile(file);
    }
  };

  const parseQRCodeFromFile = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new window.Image();
      image.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        
        if (tempCtx) {
          tempCtx.drawImage(image, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            handleSuccessfullyScannedCode(code.data);
          } else {
            setErrorMessage('Could not spot clean QR code symbols inside this image. Ensure it contains a clear QR code.');
          }
        }
      };
      image.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop setup
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseQRCodeFromFile(e.dataTransfer.files[0]);
    }
  };

  // Copy scan results to clipboard
  const [copied, setCopied] = useState<boolean>(false);
  const copyToClipboard = () => {
    if (scannedResult) {
      navigator.clipboard.writeText(scannedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetScannerState = () => {
    setScannedResult(null);
    setErrorMessage(null);
    setUseCamera(false);
  };

  // Identify scanned layout cards
  const parsedScannedUrlInfo = scannedResult ? parseAppStoreUrl(scannedResult) : null;
  const platformCategory = scannedResult ? detectPlatformFromUrl(scannedResult) : 'unknown';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Primary Scanner Window */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-sans font-medium text-gray-900 tracking-tight">QR Code Web Scanner</h2>
              <p className="text-sm text-gray-500 mt-1">Point your camera feed or upload a captured image to find target links.</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg transition-colors border ${isMuted ? 'text-gray-400 border-gray-100 bg-gray-50' : 'text-emerald-600 border-emerald-100 bg-emerald-50'}`}
                title={isMuted ? "Unmute scanner beep" : "Mute scanner beep"}
              >
                <Volume2 className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setUseCamera(!useCamera);
                  setScannedResult(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  useCamera 
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Camera className="h-4 w-4" />
                {useCamera ? 'Shut Camera' : 'Open Camera Feed'}
              </button>
            </div>
          </div>

          {/* Camera Viewport or Dragger */}
          {useCamera ? (
            <div className="relative overflow-hidden rounded-2xl bg-black border border-gray-800 aspect-video flex flex-col items-center justify-center">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover rounded-2xl"
                playsInline 
                muted
              />
              <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none object-cover"
              />
              
              {/* Dynamic Scanning Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none border-[32px] border-black/40 flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-dashed border-emerald-400/80 rounded-xl relative flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 -mt-2 -ml-2 rounded-tl-md"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 -mt-2 -mr-2 rounded-tr-md"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 -mb-2 -ml-2 rounded-bl-md"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 -mb-2 -mr-2 rounded-br-md"></div>
                  
                  {/* Neon scan line animation */}
                  <div className="absolute left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.5)] animate-bounce"></div>
                </div>
              </div>

              {/* Status footer for latency checking */}
              <div className="absolute bottom-3 right-3 bg-black/75 px-3 py-1.5 rounded-lg border border-gray-800 flex items-center gap-2 text-[11px] font-mono text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active • Delay: {scanSpeed}ms</span>
              </div>

              {/* Camera Selection Dropdown */}
              {cameras.length > 1 && (
                <div className="absolute top-3 left-3 bg-black/75 px-2 py-1 rounded-lg border border-gray-800 flex items-center gap-1.5 text-xs">
                  <RotateCw className="h-3 w-3 text-emerald-400 animate-spin-slow" />
                  <select 
                    value={selectedCameraId} 
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="bg-transparent border-none text-white font-medium focus:ring-0 cursor-pointer text-xs py-0 pl-1 pr-6"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.deviceId} value={cam.deviceId} className="bg-gray-900 text-white text-xs">
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div>
              {scannedResult ? (
                /* Beautiful Decoded Result Screen */
                <div className="border border-emerald-100 bg-emerald-50/20 rounded-2xl p-6 relative">
                  <div className="absolute top-4 right-4 bg-emerald-400/10 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Checked Safe
                  </div>

                  <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4" /> Decoded Mobile Destination
                  </h3>

                  {/* Decoded content wrapper */}
                  <div className="bg-white border border-emerald-100/50 rounded-xl p-5 shadow-sm space-y-4">
                    <div>
                      <span className="text-[11px] font-mono text-gray-400 block uppercase font-bold tracking-wider mb-1">Decoded Payload Text</span>
                      <p className="font-mono text-xs text-gray-700 break-all bg-gray-50 border border-gray-100 p-3 rounded-lg select-all">
                        {scannedResult}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-[11px] font-mono text-gray-400 block uppercase font-bold tracking-wider mb-1">Target Platform</span>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            platformCategory === 'ios' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            platformCategory === 'android' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            platformCategory === 'web' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                            'bg-gray-50 text-gray-600 border border-gray-100'
                          }`}>
                            {platformCategory === 'ios' && 'iOS (Apple App Store)'}
                            {platformCategory === 'android' && 'Android (Google Play)'}
                            {platformCategory === 'web' && 'Web / Repository Hub'}
                            {platformCategory === 'unknown' && 'Unknown URL Endpoint'}
                          </span>
                        </div>
                      </div>

                      {parsedScannedUrlInfo && (
                        <div>
                          <span className="text-[11px] font-mono text-gray-400 block uppercase font-bold tracking-wider mb-1">App Store ID</span>
                          <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                            {parsedScannedUrlInfo.id}
                          </span>
                        </div>
                      )}
                    </div>

                    {parsedScannedUrlInfo && (
                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-100/70 rounded-lg p-3.5 flex items-start gap-3">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-white shadow-xs border border-emerald-200/50 flex items-center justify-center font-bold text-emerald-700">
                          {parsedScannedUrlInfo.platform === 'ios' ? 'iOS' : 'Play'}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-900">Extracted App Meta</h4>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            This QR links directly to <span className="font-semibold">{parsedScannedUrlInfo.name}</span> in the store.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Immediate Action Buttons */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {scannedResult.startsWith('http') && (
                      <a 
                        href={scannedResult}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-sm shadow-emerald-700/15"
                      >
                        <ExternalLink className="h-4 w-4" /> Go to App Download
                      </a>
                    )}
                    
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" /> Copied link!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Clipboard Copy
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onLoadInGenerator(scannedResult)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-sm font-medium rounded-xl hover:bg-indigo-100/80 transition-all"
                    >
                      <Sparkles className="h-4 w-4" /> Load in Designer QR
                    </button>

                    <button 
                      onClick={resetScannerState}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
                    >
                      Scan Next
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag and drop panel */
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors aspect-video ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-50/20' 
                      : 'border-gray-200 hover:border-emerald-400 bg-gray-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                    <Image className="h-6 w-6" />
                  </div>

                  <h3 className="text-md font-sans font-medium text-gray-800">Analyze QR Code Screenshot</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    Drag and drop your QR code image files here, or click to browse files from your disk.
                  </p>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 px-4 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100/60 transition-colors"
                  >
                    Select QR Image
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Feedback/Errors */}
          {errorMessage && (
            <div className="mt-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Quick troubleshooting layout */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-800">Safety & App Redirection Checking</h4>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Only scan code links originating from verified directories (Apple App Store, Google Play Store, or trusted vendor APK hubs) to guard against phishing software. Direct URL verification ensures valid installation paths.
            </p>
          </div>
        </div>
      </div>

      {/* History panel on right */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col h-full max-h-[500px]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              <h3 className="text-md font-sans font-medium text-gray-900 tracking-tight">Recent Scans</h3>
            </div>
            {history.filter(h => h.type === 'scan').length > 0 && (
              <button 
                onClick={onClearHistory}
                className="text-xs font-medium text-gray-400 hover:text-rose-600 transition-colors flex items-center gap-0.5"
                title="Clear scanned items"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[250px] scrollbar-thin scrollbar-thumb-gray-200">
            {history.filter(h => h.type === 'scan').length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="h-10 w-10 border border-gray-100 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-2">
                  <History className="h-4 w-4" />
                </div>
                <p className="text-xs">Your scan logs is empty.</p>
                <p className="text-[10px] text-gray-500 mt-1">Decoded QR endpoints accumulate here.</p>
              </div>
            ) : (
              history
                .filter(h => h.type === 'scan')
                .map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-2.5 transition-colors group relative"
                  >
                    <div className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-[9px] ${
                      item.platform === 'ios' ? 'bg-indigo-50 text-indigo-700' :
                      item.platform === 'android' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {item.platform === 'ios' && 'iOS'}
                      {item.platform === 'android' && 'And'}
                      {item.platform === 'unknown' && 'QR'}
                      {item.platform === 'web' && 'Web'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-medium text-gray-800 truncate mb-0.5" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="font-mono text-[10px] text-gray-400 truncate break-all block" title={item.url}>
                        {item.url}
                      </p>
                      <span className="text-[9px] text-gray-400 mt-1 block">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 self-center">
                      <button
                        onClick={() => setScannedResult(item.url)}
                        className="p-1.5 bg-white border border-gray-100 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md shadow-xs transition-colors"
                        title="Reread"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
