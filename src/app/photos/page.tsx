'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Camera, Trash2, ArrowLeftRight, X } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { addPhoto, getPhotos, deletePhoto, ProgressPhoto } from '@/lib/photoStorage';

type PhotoType = 'front' | 'side' | 'back';

export default function PhotosPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedType, setSelectedType] = useState<PhotoType | 'all'>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<[ProgressPhoto | null, ProgressPhoto | null]>([null, null]);
  const [showViewer, setShowViewer] = useState<ProgressPhoto | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    const allPhotos = await getPhotos();
    setPhotos(allPhotos);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;
      await addPhoto({
        date: format(new Date(), 'yyyy-MM-dd'),
        type,
        imageData,
      });
      loadPhotos();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    await deletePhoto(id);
    loadPhotos();
    setShowViewer(null);
  };

  const handleCompareSelect = (photo: ProgressPhoto) => {
    if (comparePhotos[0] === null) {
      setComparePhotos([photo, null]);
    } else if (comparePhotos[1] === null) {
      setComparePhotos([comparePhotos[0], photo]);
    } else {
      setComparePhotos([photo, null]);
    }
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const filteredPhotos = selectedType === 'all'
    ? photos
    : photos.filter(p => p.type === selectedType);

  const groupedByDate = filteredPhotos.reduce((acc, photo) => {
    if (!acc[photo.date]) acc[photo.date] = [];
    acc[photo.date].push(photo);
    return acc;
  }, {} as Record<string, ProgressPhoto[]>);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Progress Photos</h1>
          <p className="text-gray-400 text-sm">Document your journey</p>
        </div>
        <Button
          onClick={() => setCompareMode(!compareMode)}
          variant={compareMode ? 'primary' : 'secondary'}
          size="sm"
        >
          <ArrowLeftRight size={16} className="mr-1" />
          Compare
        </Button>
      </div>

      {/* Compare View */}
      {compareMode && (
        <Card className="mb-4" glow>
          <p className="text-sm text-gray-400 mb-3">
            {comparePhotos[0] ? 'Select second photo' : 'Select first photo'}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[3/4] bg-[#1a1a24] rounded-xl overflow-hidden">
              {comparePhotos[0] ? (
                <img
                  src={comparePhotos[0].imageData}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Before
                </div>
              )}
            </div>
            <div className="aspect-[3/4] bg-[#1a1a24] rounded-xl overflow-hidden">
              {comparePhotos[1] ? (
                <img
                  src={comparePhotos[1].imageData}
                  alt="After"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  After
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
              Clear Selection
            </Button>
          )}
        </Card>
      )}

      {/* Add Photo Buttons */}
      {!compareMode && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['front', 'side', 'back'] as PhotoType[]).map((type) => (
            <label key={type} className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e, type)}
              />
              <Card className="text-center py-4 hover:bg-[#1a1a24]">
                <Camera size={24} className="mx-auto mb-1 text-[#8b5cf6]" />
                <p className="text-sm capitalize">{type}</p>
              </Card>
            </label>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {(['all', 'front', 'side', 'back'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              selectedType === type
                ? 'bg-[#8b5cf6] text-white'
                : 'bg-[#1a1a24] text-gray-400'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      {Object.entries(groupedByDate).length > 0 ? (
        Object.entries(groupedByDate).map(([date, datePhotos]) => (
          <div key={date} className="mb-6">
            <p className="text-sm text-gray-400 mb-2">
              {format(new Date(date), 'MMMM d, yyyy')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {datePhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => compareMode ? handleCompareSelect(photo) : setShowViewer(photo)}
                  className={`aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative group ${
                    compareMode && (comparePhotos[0]?.id === photo.id || comparePhotos[1]?.id === photo.id)
                      ? 'ring-2 ring-[#8b5cf6]'
                      : ''
                  }`}
                >
                  <img
                    src={photo.imageData}
                    alt={`${photo.type} - ${photo.date}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-xs capitalize">{photo.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <Card className="text-center py-12">
          <Camera size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No photos yet</p>
          <p className="text-sm text-gray-500">Take your first progress photo!</p>
        </Card>
      )}

      {/* Photo Viewer Modal */}
      {showViewer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setShowViewer(null)}
            className="absolute top-4 right-4 p-2 text-white"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => handleDelete(showViewer.id)}
            className="absolute top-4 left-4 p-2 text-red-400"
          >
            <Trash2 size={24} />
          </button>
          <img
            src={showViewer.imageData}
            alt="Progress photo"
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
          />
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-white font-medium capitalize">{showViewer.type}</p>
            <p className="text-gray-400 text-sm">
              {format(new Date(showViewer.date), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
