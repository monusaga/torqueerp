import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, RefreshCw, AlertCircle, ScanBarcode, FileText, Upload } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiRequest } from '../lib/api';

interface ScannerResult {
  partNumber?: string;
  partName?: string;
  mrp?: number;
  barcode?: string;
  confidence?: Record<string, number>;
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: ScannerResult) => void;
  mode?: 'BARCODE' | 'OCR' | 'BOTH';
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode = 'BOTH',
}) => {
  const [activeTab, setActiveTab] = useState<'BARCODE' | 'OCR'>(mode === 'OCR' ? 'OCR' : 'BARCODE');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  
  // OCR Review State
  const [extractedData, setExtractedData] = useState<ScannerResult | null>(null);
  const [reviewFields, setReviewFields] = useState({
    partNumber: '',
    partName: '',
    mrp: '',
    barcode: '',
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'BARCODE') {
        startBarcodeScanner();
      } else {
        startCameraStream();
      }
    } else {
      stopAllStreams();
      setExtractedData(null);
    }
    return () => {
      stopAllStreams();
    };
  }, [isOpen, activeTab]);

  const stopAllStreams = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startBarcodeScanner = async () => {
    setErrorMsg(null);
    await stopAllStreams();
    try {
      const html5QrCode = new Html5Qrcode('barcode-reader-elem');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopAllStreams();
          onConfirm({ barcode: decodedText, partNumber: decodedText });
        },
        (_errorMessage) => {
          // in progress
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Barcode camera access error:', err);
      setErrorMsg('Camera access unavailable or permission denied. You can manually enter details.');
    }
  };

  const startCameraStream = async () => {
    setErrorMsg(null);
    await stopAllStreams();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
    } catch (err: any) {
      console.warn('OCR camera stream error:', err);
      setErrorMsg('Camera not available or permission denied. Use "Upload Label Photo Instead" below.');
    }
  };

  // Reads the label text on the device with Tesseract.js, then lets the
  // server turn that text into part number / name / MRP fields. The server
  // never sees the image. Logged-in users hit the tenant endpoint; the public
  // landing-page demo uses the no-database /ocr/demo endpoint.
  const showReview = (result: ScannerResult) => {
    setExtractedData(result);
    setReviewFields({
      partNumber: result.partNumber || '',
      partName: result.partName || '',
      mrp: result.mrp ? result.mrp.toString() : '',
      barcode: result.barcode || '',
    });
  };

  const prepareCanvasForOcr = (source: CanvasImageSource, width: number, height: number) => {
    // Upscale small frames and convert to high-contrast grayscale: Tesseract
    // reads printed labels far more reliably this way.
    const canvas = canvasRef.current || document.createElement('canvas');
    const scale = Math.min(2, Math.max(1, 1600 / Math.max(width, height)));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, (g - 128) * 1.5 + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  const runOcr = async (canvas: HTMLCanvasElement) => {
    setIsProcessingOcr(true);
    setErrorMsg(null);
    setOcrProgress('Loading OCR engine...');
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(canvas, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(`Reading text ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const text = (data?.text || '').trim();
      if (text.length < 3) {
        setErrorMsg('No readable text found. Hold the label flat, fill the frame, use good light and try again, or type the details below.');
        showReview({});
        return;
      }

      const loggedIn = !!localStorage.getItem('torque_token');
      const res = await apiRequest<{
        extracted: {
          partNumber: { value: string | null; confidence: number };
          partName: { value: string | null; confidence: number };
          mrp: { value: number | null; confidence: number };
          barcode: { value: string | null; confidence: number };
        };
      }>(loggedIn ? '/ocr/process' : '/ocr/demo', {
        method: 'POST',
        body: JSON.stringify({ text: text.slice(0, loggedIn ? 20000 : 4000) }),
      });

      const ex = res.extracted;
      const result: ScannerResult = {
        partNumber: ex.partNumber.value || '',
        partName: ex.partName.value || '',
        mrp: ex.mrp.value || 0,
        barcode: ex.barcode.value || '',
        confidence: {
          partNumber: ex.partNumber.value ? ex.partNumber.confidence : 0,
          partName: ex.partName.value ? ex.partName.confidence : 0,
          mrp: ex.mrp.value ? ex.mrp.confidence : 0,
          barcode: ex.barcode.value ? ex.barcode.confidence : 0,
        },
      };
      if (!result.partNumber && !result.partName && !result.mrp) {
        setErrorMsg('Text was read but no part number, name or MRP was recognised. Please check the fields below.');
      }
      showReview(result);
    } catch (err: any) {
      console.warn('OCR failed:', err);
      setErrorMsg(
        err?.message
          ? `OCR could not finish: ${err.message}. You can type the details below.`
          : 'OCR could not finish (check your internet connection). You can type the details below.'
      );
      // Never show made-up sample data as if it had been scanned.
      showReview({});
    } finally {
      setIsProcessingOcr(false);
      setOcrProgress('');
    }
  };

  const captureAndProcessOcr = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setErrorMsg('Camera is not ready yet. Wait a second, or upload a photo of the label instead.');
      return;
    }
    const canvas = prepareCanvasForOcr(video, video.videoWidth, video.videoHeight);
    await stopAllStreams();
    await runOcr(canvas);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose a photo (JPG or PNG) of the label.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = prepareCanvasForOcr(bitmap, bitmap.width, bitmap.height);
      bitmap.close?.();
      await stopAllStreams();
      await runOcr(canvas);
    } catch (err) {
      console.warn('Photo decode failed:', err);
      setErrorMsg('This photo could not be opened. Try a JPG or PNG image.');
    }
  };

  const handleFinalConfirm = () => {
    onConfirm({
      partNumber: reviewFields.partNumber,
      partName: reviewFields.partName,
      mrp: parseFloat(reviewFields.mrp) || 0,
      barcode: reviewFields.barcode,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <ScanBarcode className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-base text-slate-900 uppercase">Smart Camera Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selectors */}
        {mode === 'BOTH' && !extractedData && (
          <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('BARCODE')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                activeTab === 'BARCODE'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanBarcode className="w-4 h-4 text-amber-400" />
              <span>Barcode / QR</span>
            </button>
            <button
              onClick={() => setActiveTab('OCR')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                activeTab === 'OCR'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Label OCR Text</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!extractedData ? (
            <div className="space-y-4">
              {activeTab === 'BARCODE' ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-300 aspect-square flex flex-col items-center justify-center">
                  <div id="barcode-reader-elem" className="w-full h-full"></div>
                  <div className="absolute bottom-3 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-md">
                    Align barcode within scanner frame
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-300 aspect-square flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-dashed border-amber-400/80 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-900 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm">
                      Hold label flat & well lit
                    </span>
                  </div>
                  <button
                    disabled={isProcessingOcr}
                    onClick={captureAndProcessOcr}
                    className="absolute bottom-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-xl shadow-lg flex items-center space-x-2 transition"
                  >
                    {isProcessingOcr ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>{ocrProgress || 'Reading text...'}</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Capture & Extract</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              {activeTab === 'OCR' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    disabled={isProcessingOcr}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 border border-slate-200"
                  >
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>{isProcessingOcr ? ocrProgress || 'Reading text...' : 'Upload Label Photo Instead'}</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Human Review Screen (Critical Safety Rule) */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
                ✨ <strong>OCR Verification:</strong> Review and adjust extracted fields before confirming.
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-bold">Part Number</label>
                    {(extractedData.confidence?.partNumber ?? 0) > 0 && (
                      <span className="text-xs text-emerald-700 font-mono font-bold">
                        {extractedData.confidence?.partNumber}% confidence
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={reviewFields.partNumber}
                    onChange={(e) =>
                      setReviewFields({ ...reviewFields, partNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900"
                    placeholder="e.g. RAH00140/B"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-bold">Part Name / Description</label>
                    {(extractedData.confidence?.partName ?? 0) > 0 && (
                      <span className="text-xs text-emerald-700 font-mono font-bold">
                        {extractedData.confidence?.partName}% confidence
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={reviewFields.partName}
                    onChange={(e) =>
                      setReviewFields({ ...reviewFields, partName: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:border-slate-900"
                    placeholder="e.g. Front Disc Brake Pads"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-bold">MRP (₹)</label>
                    {(extractedData.confidence?.mrp ?? 0) > 0 && (
                      <span className="text-xs text-emerald-700 font-mono font-bold">
                        {extractedData.confidence?.mrp}% confidence
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={reviewFields.mrp}
                    onChange={(e) =>
                      setReviewFields({ ...reviewFields, mrp: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-slate-900"
                    placeholder="550"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setExtractedData(null);
                    startCameraStream();
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1 border border-slate-200"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirm}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-wider text-xs transition shadow-md flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Confirm & Apply</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
