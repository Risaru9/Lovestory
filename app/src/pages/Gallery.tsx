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
      className="group relative overflow-hidden rounded-2xl border-2 border-white/10 bg-[#090b1e]/85 p-2 text-left shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-[#FF69B4]/40"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 300px',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
      aria-label={`Open photo ${label}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black/40 border border-white/[0.04]">
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
            'h-full w-full object-cover transition-all duration-300',
            loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.01]',
            'group-hover:scale-[1.03]'
          )}
          style={{ imageRendering: 'auto' }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
      </div>

      <div className="mt-2 px-1 pb-1">
        <p className="font-['VT323'] text-base text-white/80 leading-snug line-clamp-1 group-hover:text-white transition-colors">
          {label}
        </p>
        <div className="flex justify-between items-center mt-1">
          <span className="font-['VT323'] text-xs text-white/30 tracking-wider uppercase">
            {photo.category}
          </span>
          <Heart className="w-3.5 h-3.5 text-white/10 group-hover:text-[#FF69B4] group-hover:scale-110 transition-all duration-200 shrink-0" />
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
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#090b1e]/90 p-3 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
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
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#090b1e]/90 p-3 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
        aria-label="Next photo"
      >
        <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      <div
        className="relative w-full max-w-3xl overflow-y-auto max-h-[85vh] rounded-2xl border-4 border-[#1a1a2e] bg-[#090b1e] shadow-[4px_4px_0_#FF69B4,inset_-4px_-4px_0_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 p-2 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Close photo preview"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 px-3 py-1 font-['Press_Start_2P'] text-[8px] text-white/70">
          {currentIndex + 1} / {total}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr]">
          <div className="flex min-h-[300px] items-center justify-center bg-black/30 p-2">
            <img
              src={photo.src}
              alt={label}
              className="max-h-[70vh] w-full object-contain rounded-lg"
            />
          </div>

          <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.08] bg-[#090b1e] p-5">
            <div>
              <div className="mb-3 inline-flex rounded-xl border border-[#FF69B4]/30 bg-[#FF69B4]/10 px-2.5 py-1 font-['VT323'] text-sm uppercase text-[#FF69B4] tracking-wider select-none">
                {photo.category}
              </div>

              <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] tracking-wide uppercase">
                MEMORY DETAIL
              </h3>

              <p className="mt-3 font-['VT323'] text-xl leading-snug text-white/90">
                {label}
              </p>
            </div>

            <div className="mt-6 space-y-2 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-white/70">
                <Heart className="h-3.5 w-3.5 text-[#FF69B4] fill-current animate-pulse" />
                <span className="font-['VT323'] text-base">Momen spesial kita</span>
              </div>

              <div className="flex items-center gap-2 text-white/40">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="font-['VT323'] text-base">Gunakan tombol arah untuk navigasi</span>
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
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,105,180,0.06),_transparent_40%)]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#1A1A2E] bg-[#080b18]/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-white leading-none">
              MEMORY GALLERY
            </h1>
            <p className="mt-1 font-['VT323'] text-xs text-white/50 tracking-wider hidden sm:block">
              Koleksi momen terbaik kita
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PixelButton onClick={() => setShowUploadModal(true)} variant="primary" size="sm" className="text-[9px]">
              + FOTO
            </PixelButton>
            <div className="hidden md:block min-w-[50px] text-right">
              <span className="font-['VT323'] text-base text-[#00FFFF] tracking-wider">
                {filteredPhotos.length} pics
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-6 overflow-y-auto">
        
        {/* Banner Section */}
        <section className="mb-6 rounded-2xl border border-white/[0.06] bg-[#111327]/80 p-4 sm:p-5 shadow-lg">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF69B4]/20 bg-[#FF69B4]/10 px-3 py-0.5 text-[#FF69B4]">
                <Heart className="h-3.5 w-3.5 fill-current animate-pulse" />
                <span className="font-['VT323'] text-sm tracking-wider uppercase">Our Memory Space</span>
              </div>

              <h2 className="font-['Press_Start_2P'] text-[10px] sm:text-xs md:text-sm leading-relaxed text-white tracking-wide">
                Semua kenangan manis kita tersimpan di sini
              </h2>

              <p className="mt-2 font-['VT323'] text-sm sm:text-base leading-normal text-white/60">
                Jelajahi petualangan kita lewat foto. Pilih kategori di bawah ini untuk menyaring memori yang ingin Anda kenang kembali.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-white/[0.05] bg-black/30 p-2.5 text-center">
                <div className="font-['Press_Start_2P'] text-[7px] text-white/40">TOTAL</div>
                <div className="mt-1 font-['VT323'] text-2xl text-white leading-none">{allPhotos.length}</div>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-black/30 p-2.5 text-center">
                <div className="font-['Press_Start_2P'] text-[7px] text-white/40">SHOW</div>
                <div className="mt-1 font-['VT323'] text-2xl text-white leading-none">{displayedPhotos.length}</div>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-black/30 p-2.5 text-center">
                <div className="font-['Press_Start_2P'] text-[7px] text-white/40">FILTER</div>
                <div className="mt-1.5 font-['VT323'] text-sm uppercase text-[#00FFFF] leading-none truncate">{activeFilter}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Tabs */}
        <section className="mb-6 flex flex-wrap justify-center gap-2">
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

        {/* Gallery Cards Grid */}
        {filteredPhotos.length > 0 ? (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-5">
              {displayedPhotos.map((photo, index) => (
                <GalleryCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => setSelectedIndex(index)}
                />
              ))}
            </section>

            {visibleCount < filteredPhotos.length && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="rounded-xl border border-[#00FFFF]/30 bg-[#00FFFF]/10 px-5 py-3.5 font-['Press_Start_2P'] text-[8px] text-white transition hover:bg-[#00FFFF]/20 active:scale-95 duration-100 shadow-sm"
                >
                  LOAD MORE ({filteredPhotos.length - visibleCount} remaining)
                </button>
              </div>
            )}

            {visibleCount >= filteredPhotos.length && (
              <div className="py-10 text-center">
                <Heart className="mx-auto mb-2 h-8 w-8 text-[#FF69B4] fill-current animate-pulse" />
                <p className="font-['VT323'] text-xl text-white/40 tracking-wider">Semua kenangan telah ditampilkan 💕</p>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <Camera className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <p className="font-['Press_Start_2P'] text-[10px] text-white/45">
              TIDAK ADA FOTO DITEMUKAN
            </p>
            <p className="mt-1 font-['VT323'] text-lg text-white/30">
              Silakan ganti penyaring kategori filter Anda
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
          <div className="w-full max-w-md bg-[#090b1e]/98 border-4 border-[#1a1a2e] rounded-2xl p-5 shadow-[4px_4px_0_#FF69B4,inset_-4px_-4px_0_rgba(0,0,0,0.2)] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3 mb-4">
              <h2 className="font-['Press_Start_2P'] text-[9px] text-white tracking-wide uppercase">
                ⚔️ ADD NEW MEMORY
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadCaption('');
                }}
                className="font-['Press_Start_2P'] text-white/45 text-[9px] hover:text-[#FF69B4]"
              >
                [CLOSE]
              </button>
            </div>
            
            <form onSubmit={handleUploadPhoto} className="space-y-4">
              <div>
                <label className="block text-[#FFD700] mb-2 font-['Press_Start_2P'] text-[8px] tracking-wide">
                  CHOOSE IMAGE FILE
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base file:mr-4 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[8px] file:font-['Press_Start_2P'] file:bg-[#FF69B4] file:text-white file:cursor-pointer hover:file:brightness-110"
                />
              </div>

              <div>
                <label className="block text-[#FF69B4] mb-2 font-['Press_Start_2P'] text-[8px] tracking-wide">
                  CAPTION / MEMORY INFO
                </label>
                <input
                  type="text"
                  placeholder="Tulis caption memori kencan kita..."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#FFD700] mb-2 font-['Press_Start_2P'] text-[8px] tracking-wide">
                  CATEGORY
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as FilterType)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                >
                  <option value="date" className="bg-[#111327]">💕 DATE</option>
                  <option value="travel" className="bg-[#111327]">✈️ TRAVEL</option>
                  <option value="food" className="bg-[#111327]">🍜 FOOD</option>
                  <option value="selfie" className="bg-[#111327]">📸 SELFIE</option>
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <PixelButton
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadCaption('');
                  }}
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-[9px]"
                >
                  CANCEL
                </PixelButton>
                
                <PixelButton
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  variant="primary"
                  size="sm"
                  className="flex-1 text-[9px]"
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