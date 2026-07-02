import React, { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, Camera, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { PixelButton } from '@/components/custom/PixelButton';
import { photos } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';
import { getPhotos, addPhoto } from '@/lib/db';

type PhotoItemType = (typeof photos)[number];
type FilterType = 'all' | 'date' | 'travel' | 'food' | 'selfie';

const INITIAL_VISIBLE = 16;
const LOAD_MORE_STEP = 12;

const FILTERS: Array<{
  value: FilterType;
  label: string;
  emoji: string;
}> = [
  { value: 'all', label: 'ALL', emoji: '✨' },
  { value: 'date', label: 'DATE', emoji: '💕' },
  { value: 'travel', label: 'TRAVEL', emoji: '✈️' },
  { value: 'food', label: 'FOOD', emoji: '🍜' },
  { value: 'selfie', label: 'SELFIE', emoji: '📸' },
];

const getPhotoLabel = (photo: PhotoItemType) => {
  if (photo.caption?.trim()) return photo.caption;
  return `Kenangan ${photo.category}`;
};

const FilterButton = memo(function FilterButton({
  active,
  label,
  emoji,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  emoji: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all duration-200',
        'font-["Press_Start_2P"] text-[10px] md:text-xs shadow-sm',
        active
          ? 'bg-[#FF69B4] text-white border-[#FF69B4] shadow-[0_0_20px_rgba(255,105,180,0.25)]'
          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:border-white/20'
      )}
      aria-pressed={active}
    >
      <span className="text-base">{emoji}</span>
      <span>{label}</span>
      <span className="font-['VT323'] text-sm opacity-80">({count})</span>
    </button>
  );
});

const GalleryCard = memo(function GalleryCard({
  photo,
  onClick,
}: {
  photo: PhotoItemType;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const label = getPhotoLabel(photo);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#FF69B4]/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 300px',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
      aria-label={`Open photo ${label}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#111827]">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
        )}

        <img
          src={photo.src}
          alt={label}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-all duration-500',
            loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]',
            'group-hover:scale-105'
          )}
          style={{ imageRendering: 'auto' }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

        <div className="absolute top-3 left-3">
          <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 font-['VT323'] text-sm uppercase tracking-wide text-white/90 backdrop-blur-sm">
            {photo.category}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-['VT323'] text-xl leading-tight text-white line-clamp-2">
            {label}
          </p>
        </div>
      </div>
    </button>
  );
});

function PhotoModal({
  photo,
  currentIndex,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  photo: PhotoItemType;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const label = getPhotoLabel(photo);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-3 text-white/80 transition hover:bg-white/10 hover:text-white"
        aria-label="Previous photo"
      >
        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-3 text-white/80 transition hover:bg-white/10 hover:text-white"
        aria-label="Next photo"
      >
        <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      <div
        className="relative w-full max-w-6xl overflow-y-auto max-h-[90vh] rounded-3xl border border-white/10 bg-[#111827] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/40 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Close photo preview"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="absolute left-4 top-4 z-10 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-['Press_Start_2P'] text-[10px] text-white/80">
          {currentIndex + 1} / {total}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex min-h-[320px] items-center justify-center bg-black">
            <img
              src={photo.src}
              alt={label}
              className="max-h-[78vh] w-full object-contain"
            />
          </div>

          <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0f172a] p-6">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-[#FF69B4]/30 bg-[#FF69B4]/10 px-3 py-1 font-['VT323'] text-base uppercase text-[#FF69B4]">
                {photo.category}
              </div>

              <h3 className="font-['Press_Start_2P'] text-sm md:text-base leading-relaxed text-white">
                MEMORY DETAIL
              </h3>

              <p className="mt-4 font-['VT323'] text-2xl leading-snug text-white">
                {label}
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-white/70">
                <Heart className="h-4 w-4 text-[#FF69B4] fill-current" />
                <span className="font-['VT323'] text-lg">Our special memory</span>
              </div>

              <div className="flex items-center gap-2 text-white/50">
                <ImageIcon className="h-4 w-4" />
                <span className="font-['VT323'] text-lg">Gunakan tombol kiri/kanan untuk navigasi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Gallery: React.FC = () => {
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Custom Photos state
  const [allPhotos, setAllPhotos] = useState<PhotoItemType[]>(photos);

  // Form upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadCategory, setUploadCategory] = useState<FilterType>('date');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadCustomPhotos = async () => {
      try {
        const customPhotos = await getPhotos();
        const formattedCustom = customPhotos.map((p) => ({
          id: p.id,
          src: p.src || '',
          caption: p.caption,
          category: p.category,
        }));
        setAllPhotos([...formattedCustom, ...photos]);
      } catch (err) {
        console.error("Gagal memuat foto kustom:", err);
      }
    };
    loadCustomPhotos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const added = await addPhoto(
        uploadFile,
        uploadCaption,
        uploadCategory === 'all' ? 'date' : (uploadCategory as any)
      );
      
      const formatted = {
        id: added.id,
        src: added.src || '',
        caption: added.caption,
        category: added.category,
      };
      
      setAllPhotos((prev) => [formatted, ...prev]);
      
      setUploadFile(null);
      setUploadCaption('');
      setUploadCategory('date');
      setShowUploadModal(false);
    } catch (err) {
      console.error("Gagal mengunggah foto:", err);
      alert("Gagal mengunggah foto, silakan coba lagi.");
    } finally {
      setIsUploading(false);
    }
  };

  const filterCounts = useMemo(() => {
    return {
      all: allPhotos.length,
      date: allPhotos.filter((photo) => photo.category === 'date').length,
      travel: allPhotos.filter((photo) => photo.category === 'travel').length,
      food: allPhotos.filter((photo) => photo.category === 'food').length,
      selfie: allPhotos.filter((photo) => photo.category === 'selfie').length,
    };
  }, [allPhotos]);

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'all') return allPhotos;
    return allPhotos.filter((photo) => photo.category === activeFilter);
  }, [activeFilter, allPhotos]);

  const displayedPhotos = useMemo(() => {
    return filteredPhotos.slice(0, visibleCount);
  }, [filteredPhotos, visibleCount]);

  const selectedPhoto =
    selectedIndex !== null && filteredPhotos[selectedIndex]
      ? filteredPhotos[selectedIndex]
      : null;

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setVisibleCount(INITIAL_VISIBLE);
    setSelectedIndex(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, filteredPhotos.length));
  };

  const handlePrevPhoto = () => {
    if (!filteredPhotos.length) return;
    setSelectedIndex((prev) => {
      if (prev === null) return 0;
      return prev === 0 ? filteredPhotos.length - 1 : prev - 1;
    });
  };

  const handleNextPhoto = () => {
    if (!filteredPhotos.length) return;
    setSelectedIndex((prev) => {
      if (prev === null) return 0;
      return prev === filteredPhotos.length - 1 ? 0 : prev + 1;
    });
  };

  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPhoto]);

  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedIndex(null);
      if (event.key === 'ArrowLeft') handlePrevPhoto();
      if (event.key === 'ArrowRight') handleNextPhoto();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, filteredPhotos.length]);

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= filteredPhotos.length) {
      setSelectedIndex(null);
    }
  }, [filteredPhotos.length, selectedIndex]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,105,180,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(0,206,209,0.10),_transparent_30%)]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1020]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
              MEMORY GALLERY
            </h1>
            <p className="mt-1 font-['VT323'] text-base text-white/60">
              Koleksi momen terbaik kita
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PixelButton onClick={() => setShowUploadModal(true)} size="sm" className="text-[10px] md:text-xs">
              + PHOTO
            </PixelButton>
            <div className="hidden sm:block min-w-[64px] text-right">
              <span className="font-['VT323'] text-lg text-[#00CED1]">
                {filteredPhotos.length} pics
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:py-10">
        <section className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF69B4]/20 bg-[#FF69B4]/10 px-3 py-1 text-[#FF69B4]">
                <Heart className="h-4 w-4 fill-current" />
                <span className="font-['VT323'] text-lg">Our Memory Space</span>
              </div>

              <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl leading-relaxed text-white">
                Semua kenangan kita tersimpan di sini
              </h2>

              <p className="mt-4 max-w-2xl font-['VT323'] text-xl leading-snug text-white/70">
                Jelajahi perjalanan kita lewat foto-foto terbaik. Pilih kategori, buka detail foto,
                dan nikmati galeri yang lebih rapi, cepat, dan nyaman dilihat.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/50">TOTAL</div>
                <div className="mt-2 font-['VT323'] text-3xl text-white">{photos.length}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/50">SHOWING</div>
                <div className="mt-2 font-['VT323'] text-3xl text-white">{displayedPhotos.length}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/50">FILTER</div>
                <div className="mt-2 font-['VT323'] text-2xl uppercase text-white">{activeFilter}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 flex flex-wrap justify-center gap-3">
          {FILTERS.map((filter) => (
            <FilterButton
              key={filter.value}
              active={activeFilter === filter.value}
              label={filter.label}
              emoji={filter.emoji}
              count={filterCounts[filter.value]}
              onClick={() => handleFilterChange(filter.value)}
            />
          ))}
        </section>

        {filteredPhotos.length > 0 ? (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-6">
              {displayedPhotos.map((photo, index) => (
                <GalleryCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => setSelectedIndex(index)}
                />
              ))}
            </section>

            {visibleCount < filteredPhotos.length && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="rounded-2xl border border-[#00CED1]/40 bg-[#00CED1]/10 px-6 py-4 font-['Press_Start_2P'] text-xs text-white transition hover:bg-[#00CED1]/20 hover:border-[#00CED1]/60"
                >
                  LOAD MORE ({filteredPhotos.length - visibleCount} remaining)
                </button>
              </div>
            )}

            {visibleCount >= filteredPhotos.length && (
              <div className="py-12 text-center">
                <Heart className="mx-auto mb-3 h-10 w-10 text-[#FF69B4] fill-current" />
                <p className="font-['VT323'] text-2xl text-white/55">All memories loaded 💕</p>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <Camera className="mx-auto mb-5 h-16 w-16 text-white/20" />
            <p className="font-['Press_Start_2P'] text-sm md:text-lg text-white/40">
              NO PHOTOS FOUND
            </p>
            <p className="mt-2 font-['VT323'] text-xl text-white/30">
              Coba pilih filter yang lain
            </p>
          </div>
        )}
      </main>

      {selectedPhoto && selectedIndex !== null && (
        <PhotoModal
          photo={selectedPhoto}
          currentIndex={selectedIndex}
          total={filteredPhotos.length}
          onClose={() => setSelectedIndex(null)}
          onPrev={handlePrevPhoto}
          onNext={handleNextPhoto}
        />
      )}

      {/* Retro Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-4 border-[#FF69B4] bg-[#111327] p-6 shadow-[0_0_30px_rgba(255,105,180,0.3)]">
            <h2 className="font-['Press_Start_2P'] text-sm md:text-base text-white mb-6 text-center">
              ADD NEW MEMORY
            </h2>
            
            <form onSubmit={handleUploadPhoto} className="space-y-4 font-['VT323'] text-xl">
              <div>
                <label className="block text-[#FFD700] mb-2 font-['Press_Start_2P'] text-[10px]">
                  CHOOSE IMAGE FILE
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white text-base file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-['Press_Start_2P'] file:bg-[#FF69B4] file:text-white file:cursor-pointer hover:file:brightness-110"
                />
              </div>

              <div>
                <label className="block text-[#FFD700] mb-2 font-['Press_Start_2P'] text-[10px]">
                  CAPTION / MEMORY INFO
                </label>
                <input
                  type="text"
                  placeholder="Tulis caption memori kencan kita..."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF69B4] text-lg"
                />
              </div>

              <div>
                <label className="block text-[#FFD700] mb-2 font-['Press_Start_2P'] text-[10px]">
                  CATEGORY
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as FilterType)}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF69B4] text-lg"
                >
                  <option value="date" className="bg-[#111327]">💕 DATE</option>
                  <option value="travel" className="bg-[#111327]">✈️ TRAVEL</option>
                  <option value="food" className="bg-[#111327]">🍜 FOOD</option>
                  <option value="selfie" className="bg-[#111327]">📸 SELFIE</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <PixelButton
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadCaption('');
                  }}
                  variant="secondary"
                  className="flex-1 text-xs"
                >
                  CANCEL
                </PixelButton>
                
                <PixelButton
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="flex-1 text-xs"
                >
                  {isUploading ? 'SAVING...' : 'UPLOAD'}
                </PixelButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;