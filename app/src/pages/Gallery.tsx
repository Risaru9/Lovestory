import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { photos } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Camera, Sparkles } from 'lucide-react';

type FilterType = 'all' | 'date' | 'travel' | 'food' | 'selfie';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<typeof photos[0] | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filters: { value: FilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'ALL', icon: '📷' },
    { value: 'date', label: 'DATE', icon: '💕' },
    { value: 'travel', label: 'TRAVEL', icon: '✈️' },
    { value: 'food', label: 'FOOD', icon: '🍽️' },
    { value: 'selfie', label: 'SELFIE', icon: '🤳' },
  ];

  const filteredPhotos = activeFilter === 'all' 
    ? photos 
    : photos.filter(photo => photo.category === activeFilter);

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);

  // Intersection Observer untuk infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && visibleCount < filteredPhotos.length) {
          setIsLoading(true);
          // Delay sedikit untuk smooth loading
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + 12, filteredPhotos.length));
            setIsLoading(false);
          }, 300);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [visibleCount, filteredPhotos.length, isLoading]);

  // Reset visible count saat ganti filter
  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setVisibleCount(24);
    setLoadedImages(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle image load
  const handleImageLoad = useCallback((src: string) => {
    setLoadedImages(prev => new Set(prev).add(src));
  }, []);

  // Get random rotation untuk polaroid effect
  const getRotation = (index: number) => {
    const rotations = [-4, -2, 0, 2, 4, -3, 3, -1, 1];
    return rotations[index % rotations.length];
  };

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

  return (
    <div className="min-h-screen bg-[#1A1A2E] overflow-x-hidden">
      {/* Animated Background */}
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
          
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#FF69B4] animate-pulse" />
            <h1 className="font-['Press_Start_2P'] text-lg md:text-xl text-white tracking-wider">
              MEMORY ALBUM
            </h1>
            <Sparkles className="w-5 h-5 text-[#FF69B4] animate-pulse delay-150" />
          </div>

          <div className="w-24 flex justify-end">
            <span className="font-['VT323'] text-[#00CED1] text-lg">
              {filteredPhotos.length} pics
            </span>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {filters.map((filter, index) => (
            <motion.button
              key={filter.value}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => handleFilterChange(filter.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-2 px-5 py-3 font-["Press_Start_2P"] text-xs',
                'border-2 rounded-lg transition-all duration-300 shadow-lg',
                activeFilter === filter.value
                  ? 'bg-[#FF69B4] border-[#FF69B4] text-white shadow-[#FF69B4]/40'
                  : 'bg-[#16213E] border-[#00CED1]/50 text-white/70 hover:border-[#00CED1] hover:text-white hover:shadow-[#00CED1]/20'
              )}
            >
              <span className="text-lg">{filter.icon}</span>
              {filter.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center gap-6 mb-8 font-['VT323'] text-white/60"
        >
          <div className="flex items-center gap-2">
            <Camera size={18} />
            <span>Showing {visiblePhotos.length} of {filteredPhotos.length}</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2 text-[#FF69B4]">
            <Heart size={18} fill="currentColor" />
            <span>{Math.round((loadedImages.size / visiblePhotos.length) * 100) || 0}% loaded</span>
          </div>
        </motion.div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {visiblePhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  delay: (index % 12) * 0.05,
                  duration: 0.3,
                  layout: { duration: 0.3 }
                }}
                whileHover={{ 
                  scale: 1.08, 
                  rotate: 0,
                  zIndex: 10,
                  transition: { duration: 0.2 }
                }}
                className={cn(
                  "polaroid cursor-pointer group relative",
                  !loadedImages.has(photo.src) && "animate-pulse"
                )}
                style={{
                  transform: `rotate(${getRotation(index)}deg)`,
                }}
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Loading Skeleton */}
                {!loadedImages.has(photo.src) && (
                  <div className="absolute inset-0 bg-gray-700/50 rounded-lg animate-pulse" />
                )}
                
                {/* Image Container */}
                <div className="relative overflow-hidden bg-white p-3 pb-12 shadow-xl">
                  <img 
                    src={photo.src}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => handleImageLoad(photo.src)}
                    className={cn(
                      "w-full aspect-square object-cover transition-all duration-500",
                      "group-hover:brightness-110 group-hover:contrast-105",
                      loadedImages.has(photo.src) ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                      imageRendering: 'pixelated'
                    }}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#FF69B4]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Caption */}
                  <p className="absolute bottom-3 left-0 right-0 font-['VT323'] text-sm text-[#1A1A2E] text-center px-2 truncate">
                    {photo.caption || `Memory #${photo.id}`}
                  </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Load More Trigger */}
        {visibleCount < filteredPhotos.length && (
          <div 
            ref={loadMoreRef}
            className="h-32 flex flex-col items-center justify-center mt-12 gap-4"
          >
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-[#FF69B4] rounded-full"
                  animate={{ 
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.6,
                    delay: i * 0.2 
                  }}
                />
              ))}
            </div>
            <p className="font-['VT323'] text-white/50 text-lg">Loading more memories...</p>
          </div>
        )}

        {/* Empty State */}
        {filteredPhotos.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Camera className="w-20 h-20 text-white/20 mx-auto mb-6" />
            <p className="font-['Press_Start_2P'] text-white/40 text-lg mb-2">
              NO PHOTOS FOUND
            </p>
            <p className="font-['VT323'] text-white/30 text-xl">
              Try selecting a different filter
            </p>
          </motion.div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Navigation Arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
              disabled={filteredPhotos.findIndex(p => p.id === selectedPhoto.id) === 0}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white disabled:opacity-20 transition-all hover:scale-110 z-50"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
              disabled={filteredPhotos.findIndex(p => p.id === selectedPhoto.id) === filteredPhotos.length - 1}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white disabled:opacity-20 transition-all hover:scale-110 z-50"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-[#FF69B4] transition-colors z-50"
              >
                <X size={32} />
              </motion.button>

              {/* Image Counter */}
              <div className="absolute -top-12 left-0 font-['Press_Start_2P'] text-xs text-white/50">
                {filteredPhotos.findIndex(p => p.id === selectedPhoto.id) + 1} / {filteredPhotos.length}
              </div>

              {/* Polaroid Container */}
              <div className="polaroid transform rotate-0 max-h-[80vh] overflow-hidden shadow-2xl">
                <img 
                  src={selectedPhoto.src}
                  alt={selectedPhoto.caption}
                  className="w-auto max-h-[70vh] object-contain pixel-art bg-white p-4"
                  style={{ imageRendering: 'pixelated' }}
                />
                
                {/* Caption Area */}
                <div className="bg-white p-4 pt-0">
                  <p className="font-['VT323'] text-2xl text-[#1A1A2E] text-center">
                    {selectedPhoto.caption || `Memory #${selectedPhoto.id}`}
                  </p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Heart className="w-5 h-5 text-[#FF69B4] fill-current" />
                    <span className="font-['VT323'] text-[#FF69B4]">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Keyboard Hint */}
              <p className="mt-6 font-['VT323'] text-white/30 text-lg">
                Use ← → arrow keys to navigate • ESC to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;