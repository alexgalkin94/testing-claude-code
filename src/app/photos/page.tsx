'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Camera, Trash2, ArrowLeftRight, X, Cloud, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface Photo {
  url: string;
  pathname: string;
  date: string;
  uploadedAt: string;
}

// Body outline SVG component for camera overlay - clean minimal design
function BodyOutline() {
  return (
    <svg
      viewBox="0 0 100 220"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity: 0.5, padding: '10%' }}
    >
      {/* Head - simple circle */}
      <circle cx="50" cy="18" r="12" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" />

      {/* Neck */}
      <line x1="50" y1="30" x2="50" y2="38" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" />

      {/* Shoulders - horizontal line */}
      <line x1="25" y1="42" x2="75" y2="42" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" />

      {/* Torso outline */}
      <path
        d="M 25 42 L 22 100 Q 22 115, 30 125 L 35 130"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />
      <path
        d="M 75 42 L 78 100 Q 78 115, 70 125 L 65 130"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />

      {/* Waist/Hip line */}
      <path
        d="M 35 130 Q 50 135, 65 130"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />

      {/* Left leg */}
      <path
        d="M 38 130 L 35 175 L 32 210"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />

      {/* Right leg */}
      <path
        d="M 62 130 L 65 175 L 68 210"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />

      {/* Left arm */}
      <path
        d="M 25 42 L 15 75 L 10 110"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />

      {/* Right arm */}
      <path
        d="M 75 42 L 85 75 L 90 110"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 2"
      />

      {/* Center alignment line */}
      <line x1="50" y1="0" x2="50" y2="220" stroke="white" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.3" />

      {/* Horizontal guides */}
      <line x1="0" y1="42" x2="100" y2="42" stroke="white" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.2" />
      <line x1="0" y1="130" x2="100" y2="130" stroke="white" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.2" />
    </svg>
  );
}

// Camera component with body outline overlay
function CameraWithOverlay({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Kamera konnte nicht gestartet werden');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `progress-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={onClose}>Schließen</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <BodyOutline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar with close button */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <X size={22} className="text-white" />
        </button>
        <p className="text-white/70 text-sm">Positioniere dich im Umriss</p>
        <div className="w-10" />
      </div>

      {/* Bottom capture button */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center">
        <button
          onClick={capturePhoto}
          className="w-20 h-20 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg"
        >
          <div className="w-16 h-16 rounded-full border-4 border-zinc-900" />
        </button>
      </div>
    </div>
  );
}

// Zoomable image viewer component
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 1), 5));
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap < 300) {
        handleDoubleClick();
      }
      setLastTap(now);

      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y
        });
      }
    }
  }, [scale, lastTap, position, handleDoubleClick]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max((distance / initialDistance) * initialScale, 1), 5);
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  }, [initialDistance, initialScale, isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setInitialDistance(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[80vh] object-contain rounded-xl select-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
        }}
        draggable={false}
      />
      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<[Photo | null, Photo | null]>([null, null]);
  const [showViewer, setShowViewer] = useState<Photo | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/photos');
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
    setLoading(false);
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date', format(new Date(), 'yyyy-MM-dd'));

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadPhotos();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
    e.target.value = '';
  };

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false);
    await uploadPhoto(file);
  };

  const handleDelete = async (photo: Photo) => {
    try {
      const response = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: photo.url }),
      });

      if (response.ok) {
        await loadPhotos();
        setShowViewer(null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleCompareSelect = (photo: Photo) => {
    if (comparePhotos[0] === null) {
      setComparePhotos([photo, null]);
    } else if (comparePhotos[1] === null) {
      setComparePhotos([comparePhotos[0], photo]);
    } else {
      setComparePhotos([photo, null]);
    }
  };

  // Group photos by date
  const groupedByDate = photos.reduce((acc, photo) => {
    const date = photo.date || 'Unbekannt';
    if (!acc[date]) acc[date] = [];
    acc[date].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 lg:max-w-4xl animate-pulse space-y-4">
        <div className="h-8 bg-zinc-900 rounded w-1/2"></div>
        <div className="h-32 bg-zinc-900 rounded-xl"></div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[3/4] bg-zinc-900 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 lg:p-8 lg:pb-8 lg:max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-zinc-500 text-sm">Dokumentiere deine Reise</p>
          <h1 className="text-xl font-semibold tracking-tight">Fortschrittsfotos</h1>
        </div>
        <Button
          onClick={() => setCompareMode(!compareMode)}
          variant={compareMode ? 'primary' : 'secondary'}
          size="sm"
        >
          <ArrowLeftRight size={16} className="mr-1" />
          Vergleich
        </Button>
      </div>

      {/* Compare View */}
      {compareMode && (
        <Card className="mb-4" glow>
          <p className="text-sm text-zinc-400 mb-3">
            {comparePhotos[0] ? 'Wähle zweites Foto' : 'Wähle erstes Foto'}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[3/4] bg-zinc-800 rounded-xl overflow-hidden">
              {comparePhotos[0] ? (
                <img
                  src={comparePhotos[0].url}
                  alt="Vorher"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  Vorher
                </div>
              )}
            </div>
            <div className="aspect-[3/4] bg-zinc-800 rounded-xl overflow-hidden">
              {comparePhotos[1] ? (
                <img
                  src={comparePhotos[1].url}
                  alt="Nachher"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  Nachher
                </div>
              )}
            </div>
          </div>
          {(comparePhotos[0] || comparePhotos[1]) && (
            <Button
              onClick={() => setComparePhotos([null, null])}
              variant="ghost"
              size="sm"
              className="mt-3 w-full"
            >
              Auswahl löschen
            </Button>
          )}
        </Card>
      )}

      {/* Add Photo Buttons */}
      {!compareMode && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Camera with overlay */}
          <Card
            className="text-center py-6 hover:bg-zinc-800/50 border-dashed border-2 border-zinc-800 cursor-pointer"
            onClick={() => !uploading && setShowCamera(true)}
          >
            {uploading ? (
              <>
                <Loader2 size={28} className="mx-auto mb-2 text-zinc-400 animate-spin" />
                <p className="text-sm text-zinc-400">Hochladen...</p>
              </>
            ) : (
              <>
                <Camera size={28} className="mx-auto mb-2 text-zinc-400" />
                <p className="font-medium text-sm">Mit Overlay</p>
                <p className="text-xs text-zinc-500 mt-1">Körperumriss</p>
              </>
            )}
          </Card>

          {/* File picker / quick photo */}
          <label className="cursor-pointer block">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Card className="text-center py-6 hover:bg-zinc-800/50 border-dashed border-2 border-zinc-800 h-full flex flex-col items-center justify-center">
              {uploading ? (
                <>
                  <Loader2 size={28} className="mx-auto mb-2 text-zinc-400 animate-spin" />
                  <p className="text-sm text-zinc-400">Hochladen...</p>
                </>
              ) : (
                <>
                  <Cloud size={28} className="mx-auto mb-2 text-zinc-400" />
                  <p className="font-medium text-sm">Schnellfoto</p>
                  <p className="text-xs text-zinc-500 mt-1">Ohne Overlay</p>
                </>
              )}
            </Card>
          </label>
        </div>
      )}

      {/* Photo Grid */}
      {Object.entries(groupedByDate).length > 0 ? (
        Object.entries(groupedByDate)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, datePhotos]) => (
            <div key={date} className="mb-6">
              <p className="text-sm text-zinc-400 mb-2">
                {date !== 'Unbekannt'
                  ? format(new Date(date), 'd. MMMM yyyy', { locale: de })
                  : 'Unbekannt'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {datePhotos.map((photo, idx) => (
                  <div
                    key={photo.url + idx}
                    onClick={() => compareMode ? handleCompareSelect(photo) : setShowViewer(photo)}
                    className={`aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative ${
                      compareMode && (comparePhotos[0]?.url === photo.url || comparePhotos[1]?.url === photo.url)
                        ? 'ring-2 ring-white'
                        : ''
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`Fortschritt - ${photo.date}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
      ) : (
        <Card className="text-center py-12">
          <Camera size={48} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-400">Noch keine Fotos</p>
          <p className="text-sm text-zinc-500 mt-1">Mach dein erstes Fortschrittsfoto!</p>
        </Card>
      )}

      {/* Photo Viewer Modal with Zoom */}
      {showViewer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setShowViewer(null)}
            className="absolute top-4 right-4 p-2 text-white z-10"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => handleDelete(showViewer)}
            className="absolute top-4 left-4 p-2 text-red-400 z-10"
          >
            <Trash2 size={24} />
          </button>
          <ZoomableImage
            src={showViewer.url}
            alt="Fortschrittsfoto"
          />
          <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
            <p className="text-zinc-400 text-sm">
              {showViewer.date && showViewer.date !== 'Unbekannt'
                ? format(new Date(showViewer.date), 'd. MMMM yyyy', { locale: de })
                : ''}
            </p>
            <p className="text-zinc-600 text-xs mt-1">Doppeltippen oder Pinch zum Zoomen</p>
          </div>
        </div>
      )}

      {/* Camera with Body Overlay */}
      {showCamera && (
        <CameraWithOverlay
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
