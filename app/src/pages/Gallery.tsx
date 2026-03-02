import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { photos } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Camera, Sparkles, Loader2 } from 'lucide-react';

type FilterType = 'all' | 'date' | 'travel' | 'food' | 'selfie';

// Optimized Photo Item Component dengan memo
const PhotoItem = memo(({ 
  photo, 
  index, 
  isLoaded, 
  onLoad, 
  onClick 
}: { 
  photo: typeof photos[0]; 
  index: number; 
  isLoaded: boolean; 
  onLoad: (src: string) => void; 
  onClick: () => void;
}) => {
  const getRotation = (idx: number) => {
    const rotations = [-4, -2, 0, 2, 4, -3, 3, -1, 1];
    return rotations[idx % rotations.length];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        delay: (index % 8) * 0.03,
        duration: 0.25,
        layout: { duration: 0.2 }
      }}
      whileHover={{ 
        scale: 1.05, 
        rotate: 0,
        zIndex: 20,
        transition: { duration: 0.15 }
      }}
      className="polaroid cursor-pointer group relative will-change-transform"
      style={{
        transform: `rotate(${getRotation(index)}deg)`,
      }}
      onClick={onClick}
    >
      {/* Skeleton Loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-700/50 rounded-lg animate-pulse" />
      )}
      
      {/* Image Container */}
      <div className="relative overflow-hidden bg-white p-2 md:p-3 pb-10 md:pb-12 shadow-xl">
        <img 
          src={photo.src}
          alt={photo.caption}
          loading="lazy"
          decoding="async"
          onLoad={() => onLoad(photo.src)}
          className={cn(
            "w-full aspect-square object-cover transition-opacity duration-300",
            "group-hover:brightness-110",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            imageRendering: 'pixelated',
            contentVisibility: 'auto'
          }}
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FF69B4]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        
        {/* Caption */}
        <p className="absolute bottom-2 md:bottom-3 left-0 right-0 font-['VT323'] text-xs md:text-sm text-[#1A1A2E] text-center px-2 truncate">
          {photo.caption || `Memory #${photo.id}`}
        </p>
      </div>

      {/* Pin Effect */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
    </motion.div>
  );
});

PhotoItem.displayName = 'PhotoItem';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<typeof photos[0] | null>(null);
  const [visibleCount, setVisibleCount] = useState(12); // Mulai dengan 12 saja
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [displayedPhotos, setDisplayedPhotos] = useState<typeof photos>([]);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const imageCache = useRef<Map<string, boolean>>(new Map());

  const filters: { value: FilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'ALL', icon: '📷' },
    { value: 'date', label: 'DATE', icon: '💕' },
    { value: 'travel', label: 'TRAVEL', icon: '✈️' },
    { value: 'food', label: 'FOOD', icon: '🍽️' },
    { value: 'selfie', label: 'SELFIE', icon: '🤳' },
  ];

  // Filter photos dengan useMemo untuk optimasi
  const filteredPhotos = React.useMemo(() => {
    return activeFilter === 'all' 
      ? photos 
      : photos.filter(photo => photo.category === activeFilter);
  }, [activeFilter]);

  // Update displayed photos ketika filter atau visibleCount berubah
  useEffect(() => {
    setDisplayedPhotos(filteredPhotos.slice(0, visibleCount));
  }, [filteredPhotos, visibleCount]);

  // Intersection Observer untuk infinite scroll dengan throttling
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && visibleCount < filteredPhotos.length) {
          setIsLoading(true);
          // Gunakan requestAnimationFrame untuk smooth loading
          requestAnimationFrame(() => {
            setTimeout(() => {
              setVisibleCount(prev => {
                const next = Math.min(prev + 8, filteredPhotos.length);
                return next;
              });
              setIsLoading(false);
            }, 100);
          });
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '200px' // Mulai load lebih awal
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [visibleCount, filteredPhotos.length, isLoading]);

  // Reset dan cleanup saat ganti filter
  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setVisibleCount(12);
    setLoadedImages(new Set());
    imageCache.current.clear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle image load dengan caching
  const handleImageLoad = useCallback((src: string) => {
    if (!imageCache.current.has(src)) {
      imageCache.current.set(src, true);
      setLoadedImages(prev => {
        const newSet = new Set(prev);
        newSet.add(src);
        return newSet;
      });
    }
  }, []);

  // Preload next batch images
  useEffect(() => {
    const nextBatch = filteredPhotos.slice(visibleCount, visibleCount + 8);
    nextBatch.forEach(photo => {
      const img = new Image();
      img.src = photo.src;
    });
  }, [visibleCount, filteredPhotos]);

  // Navigation dalam modal
  const handlePrevPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentIndex - 1]);
    }
  }, [selectedPhoto, filteredPhotos]);

  const handleNextPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentIndex + 1]);
    }
  }, [selectedPhoto, filteredPhotos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') setSelectedPhoto(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, handlePrevPhoto, handleNextPhoto]);

  // "View More" manual button handler
  const handleLoadMore = useCallback(() => {
    if (!isLoading && visibleCount < filteredPhotos.length) {
      setIsLoading(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 12, filteredPhotos.length));
        setIsLoading(false);
      }, 150);
    }
  }, [isLoading, visibleCount, filteredPhotos.length]);

  const currentPhotoIndex = selectedPhoto 
    ? filteredPhotos.findIndex(p => p.id === selectedPhoto.id) 
    : -1;

  return (
    <div className="min-h-screen bg-[#1A1A2E] overflow-x-hidden">
      {/* Optimized Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pixel-bg.png')] bg-repeat opacity-5" />
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#FF69B4]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-[#00CED1]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-[#1A1A2E]/95 backdrop-blur-md border-b-4 border-[#FF69B4] shadow-lg shadow-[#FF69B4]/20"
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto p-4">
          <PixelButton 
            onClick={() => navigate('/home')} 
            variant="secondary" 
            size="sm"
            className="hover:scale-105 transition-transform"
          >
            ← MENU
          </PixelButton>
          
          <div className="flex items-center gap-2 md:gap-3">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#FF69B4] animate-pulse" />
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg lg:text-xl text-white tracking-wider">
              MEMORY ALBUM
            </h1>
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#FF69B4] animate-pulse delay-150" />
          </div>

          <div className="w-20 md:w-24 flex justify-end">
            <span className="font-['VT323'] text-[#00CED1] text-base md:text-lg">
              {filteredPhotos.length} pics
            </span>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 py-6 md:py-8">
        {/* Filter Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 md:mb-10"
        >
          {filters.map((filter, index) => (
            <motion.button
              key={filter.value}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => handleFilterChange(filter.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-3 font-["Press_Start_2P"] text-[10px] md:text-xs',
                'border-2 rounded-lg transition-all duration-200 shadow-lg',
                activeFilter === filter.value
                  ? 'bg-[#FF69B4] border-[#FF69B4] text-white shadow-[#FF69B4]/40'
                  : 'bg-[#16213E] border-[#00CED1]/50 text-white/70 hover:border-[#00CED1] hover:text-white'
              )}
            >
              <span className="text-base md:text-lg">{filter.icon}</span>
              <span className="hidden sm:inline">{filter.label}</span>
              <span className="sm:hidden">{filter.label.slice(0, 3)}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center gap-4 md:gap-6 mb-6 md:mb-8 font-['VT323'] text-white/60 text-sm md:text-base"
        >
          <div className="flex items-center gap-1.5 md:gap-2">
            <Camera size={16} className="md:w-[18px] md:h-[18px]" />
            <span>{displayedPhotos.length} / {filteredPhotos.length}</span>
          </div>
          <div className="w-px h-3 md:h-4 bg-white/20" />
          <div className="flex items-center gap-1.5 md:gap-2 text-[#FF69B4]">
            <Heart size={16} className="md:w-[18px] md:h-[18px]" fill="currentColor" />
            <span>{Math.round((loadedImages.size / Math.max(displayedPhotos.length, 1)) * 100)}% loaded</span>
          </div>
        </motion.div>

        {/* Photo Grid dengan contain intrinsic size */}
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8"
          style={{ contentVisibility: 'auto' }}
        >
          <AnimatePresence mode="popLayout">
            {displayedPhotos.map((photo, index) => (
              <PhotoItem
                key={`${photo.id}-${activeFilter}`}
                photo={photo}
                index={index}
                isLoaded={loadedImages.has(photo.src)}
                onLoad={handleImageLoad}
                onClick={() => setSelectedPhoto(photo)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Load More Section */}
        {visibleCount < filteredPhotos.length && (
          <div className="mt-8 md:mt-12 flex flex-col items-center gap-4">
            {/* Auto Load Trigger (hidden) */}
            <div ref={loadMoreRef} className="h-4 w-full" />
            
            {/* Manual Load Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLoadMore}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg font-['Press_Start_2P'] text-xs",
                "bg-[#16213E] border-2 border-[#00CED1] text-white",
                "hover:bg-[#00CED1]/20 transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <span>📸</span>
                  Load More ({filteredPhotos.length - visibleCount} remaining)
                </>
              )}
            </motion.button>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 md:w-3 md:h-3 bg-[#FF69B4] rounded-full"
                    animate={{ 
                      y: [0, -8, 0],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.6,
                      delay: i * 0.15 
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* End of List Message */}
        {visibleCount >= filteredPhotos.length && filteredPhotos.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 md:py-12"
          >
            <Heart className="w-8 h-8 md:w-12 md:h-12 text-[#FF69B4] mx-auto mb-3 animate-pulse" fill="currentColor" />
            <p className="font-['VT323'] text-white/50 text-lg md:text-xl">
              All memories loaded! 💕
            </p>
          </motion.div>
        )}

        {/* Empty State */}
        {filteredPhotos.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 md:py-20"
          >
            <Camera className="w-16 h-16 md:w-20 md:h-20 text-white/20 mx-auto mb-4 md:mb-6" />
            <p className="font-['Press_Start_2P'] text-white/40 text-sm md:text-lg mb-2">
              NO PHOTOS FOUND
            </p>
            <p className="font-['VT323'] text-white/30 text-lg md:text-xl">
              Try selecting a different filter
            </p>
          </motion.div>
        )}
      </main>

      {/* Optimized Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-3 md:p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Navigation Arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
              disabled={currentPhotoIndex === 0}
              className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-2 md:p-3 text-white/50 hover:text-white disabled:opacity-20 transition-all hover:scale-110 z-50"
            >
              <svg width="32" height="32" className="md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
              disabled={currentPhotoIndex === filteredPhotos.length - 1}
              className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-2 md:p-3 text-white/50 hover:text-white disabled:opacity-20 transition-all hover:scale-110 z-50"
            >
              <svg width="32" height="32" className="md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-10 md:-top-12 right-0 p-2 text-white/70 hover:text-[#FF69B4] transition-colors z-50"
              >
                <X size={28} className="md:w-8 md:h-8" />
              </motion.button>

              {/* Image Counter */}
              <div className="absolute -top-10 md:-top-12 left-0 font-['Press_Start_2P'] text-[10px] md:text-xs text-white/50">
                {currentPhotoIndex + 1} / {filteredPhotos.length}
              </div>

              {/* Polaroid Container */}
              <div className="polaroid transform rotate-0 max-h-[80vh] overflow-hidden shadow-2xl bg-white">
                <img 
                  src={selectedPhoto.src}
                  alt={selectedPhoto.caption}
                  className="w-auto max-h-[60vh] md:max-h-[70vh] object-contain p-3 md:p-4"
                  style={{ imageRendering: 'pixelated' }}
                />
                
                {/* Caption Area */}
                <div className="bg-white px-4 pb-4 pt-0">
                  <p className="font-['VT323'] text-xl md:text-2xl text-[#1A1A2E] text-center">
                    {selectedPhoto.caption || `Memory #${selectedPhoto.id}`}
                  </p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Heart className="w-4 h-4 md:w-5 md:h-5 text-[#FF69B4] fill-current" />
                    <span className="font-['VT323'] text-[#FF69B4] text-sm md:text-base">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Keyboard Hint */}
              <p className="mt-4 md:mt-6 font-['VT323'] text-white/30 text-sm md:text-lg">
                ← → to navigate • ESC to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;