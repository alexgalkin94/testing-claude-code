'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Camera, Trash2, ArrowLeftRight, X, Cloud, Loader2, Lock } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface Photo {
  url: string;
  pathname: string;
  date: string;
  uploadedAt: string;
}

// Auth token for API access
const AUTH_TOKEN_KEY = 'cutboard_auth_token';
const DEFAULT_TOKEN = 'alex_secret_2024';

function getAuthToken(): string {
  if (typeof window === 'undefined') return DEFAULT_TOKEN;
  return localStorage.getItem(AUTH_TOKEN_KEY) || DEFAULT_TOKEN;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<[Photo | null, Photo | null]>([null, null]);
  const [showViewer, setShowViewer] = useState<Photo | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/photos', {
        headers: { 'x-auth-token': getAuthToken() },
      });
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date', format(new Date(), 'yyyy-MM-dd'));

      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'x-auth-token': getAuthToken() },
        body: formData,
      });

      if (response.ok) {
        await loadPhotos();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (photo: Photo) => {
    try {
      const response = await fetch('/api/photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': getAuthToken(),
        },
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
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-[#1a1a24] rounded w-1/2 mb-4"></div>
        <div className="h-32 bg-[#1a1a24] rounded-2xl mb-4"></div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[3/4] bg-[#1a1a24] rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fortschrittsfotos</h1>
          <p className="text-gray-400 text-sm">Dokumentiere deine Reise</p>
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
          <p className="text-sm text-gray-400 mb-3">
            {comparePhotos[0] ? 'Wähle zweites Foto' : 'Wähle erstes Foto'}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[3/4] bg-[#1a1a24] rounded-xl overflow-hidden">
              {comparePhotos[0] ? (
                <img
                  src={comparePhotos[0].url}
                  alt="Vorher"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Vorher
                </div>
              )}
            </div>
            <div className="aspect-[3/4] bg-[#1a1a24] rounded-xl overflow-hidden">
              {comparePhotos[1] ? (
                <img
                  src={comparePhotos[1].url}
                  alt="Nachher"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
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

      {/* Add Photo Button */}
      {!compareMode && (
        <label className="cursor-pointer block mb-4">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <Card className="text-center py-6 hover:bg-[#1a1a24] border-dashed border-2 border-white/10">
            {uploading ? (
              <>
                <Loader2 size={32} className="mx-auto mb-2 text-[#8b5cf6] animate-spin" />
                <p className="text-sm text-gray-400">Wird hochgeladen...</p>
              </>
            ) : (
              <>
                <Camera size={32} className="mx-auto mb-2 text-[#8b5cf6]" />
                <p className="font-medium">Foto aufnehmen</p>
                <p className="text-xs text-gray-400 mt-1">
                  <Cloud size={12} className="inline mr-1" />
                  Wird in der Cloud gespeichert
                </p>
              </>
            )}
          </Card>
        </label>
      )}

      {/* Photo Grid */}
      {Object.entries(groupedByDate).length > 0 ? (
        Object.entries(groupedByDate)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, datePhotos]) => (
            <div key={date} className="mb-6">
              <p className="text-sm text-gray-400 mb-2">
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
                        ? 'ring-2 ring-[#8b5cf6]'
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
          <Camera size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Noch keine Fotos</p>
          <p className="text-sm text-gray-500 mt-1">Mach dein erstes Fortschrittsfoto!</p>
        </Card>
      )}

      {/* Photo Viewer Modal */}
      {showViewer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setShowViewer(null)}
            className="absolute top-4 right-4 p-2 text-white"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => handleDelete(showViewer)}
            className="absolute top-4 left-4 p-2 text-red-400"
          >
            <Trash2 size={24} />
          </button>
          <img
            src={showViewer.url}
            alt="Fortschrittsfoto"
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
          />
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-gray-400 text-sm">
              {showViewer.date && showViewer.date !== 'Unbekannt'
                ? format(new Date(showViewer.date), 'd. MMMM yyyy', { locale: de })
                : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
