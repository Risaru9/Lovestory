import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { DialogBox } from '@/components/custom/DialogBox';
import { getChapterById, chapters } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';

const ChapterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chapter = getChapterById(Number(id));
  
  const [showAchievement, setShowAchievement] = useState(false);
  const [flippedPhoto, setFlippedPhoto] = useState<string | null>(null);

  if (!chapter) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-['Press_Start_2P'] text-2xl text-white mb-4">
            Chapter Not Found
          </h1>
          <PixelButton onClick={() => navigate('/timeline')}>
            BACK TO TIMELINE
          </PixelButton>
        </div>
      </div>
    );
  }

  const currentIndex = chapters.findIndex(c => c.id === chapter.id);
  const prevChapter = chapters[currentIndex - 1];
  const nextChapter = chapters[currentIndex + 1];

  const handlePhotoClick = (photoId: string) => {
    setFlippedPhoto(flippedPhoto === photoId ? null : photoId);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      {/* Header */}
      <div className="bg-[#1A1A2E]/90 border-b-4 border-[#FF69B4] p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <PixelButton onClick={() => navigate('/timeline')} variant="secondary" size="sm">
            ← BACK
          </PixelButton>
          <h1 className="font-['Press_Start_2P'] text-xs md:text-sm text-white text-center">
            MONTH {chapter.month}
          </h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chapter Title */}
        <div className="text-center mb-8">
          <h2 className="font-['Press_Start_2P'] text-xl md:text-2xl text-[#FFD700] mb-2">
            {chapter.title}
          </h2>
          <p className="font-['VT323'] text-lg text-white/70">
            {chapter.date}
          </p>
        </div>

        {/* Main Image */}
        <div className="relative mb-8 group">
          <div className="border-4 border-[#FF69B4] overflow-hidden shadow-[0_0_30px_rgba(255,105,180,0.3)]">
            <img 
              src={chapter.image}
              alt={chapter.title}
              className="w-full h-64 md:h-96 object-cover pixel-art transition-transform group-hover:scale-105"
            />
          </div>
          
          {/* Achievement Badge */}
          <div 
            className={`
              absolute -top-4 -right-4 
              bg-[#FFD700] border-4 border-[#1A1A2E]
              p-3 rounded-full
              cursor-pointer transition-transform hover:scale-110
              ${showAchievement ? 'animate-bounce' : ''}
            `}
            onClick={() => setShowAchievement(!showAchievement)}
          >
            <img 
              src="/images/ui/star-icon.png" 
              alt="Achievement"
              className="w-8 h-8 pixel-art"
            />
          </div>
        </div>

        {/* Achievement Popup */}
        {showAchievement && (
          <div className="mb-6 p-4 bg-[#FFD700]/20 border-2 border-[#FFD700] rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <img 
                src="/images/ui/star-icon.png" 
                alt="Star"
                className="w-8 h-8 pixel-art"
              />
              <div>
                <p className="font-['Press_Start_2P'] text-xs text-[#FFD700]">
                  ACHIEVEMENT UNLOCKED!
                </p>
                <p className="font-['VT323'] text-white">
                  {chapter.achievement}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Story Dialog */}
        <div className="mb-8">
          <DialogBox text={chapter.story} />
        </div>

        {/* Photos Gallery */}
        {chapter.photos && chapter.photos.length > 0 && (
          <div className="mb-8">
            <h3 className="font-['Press_Start_2P'] text-sm text-white mb-4">
              MEMORIES
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {chapter.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative cursor-pointer perspective-1000"
                  onClick={() => handlePhotoClick(photo.id)}
                >
                  <div 
                    className={cn(
                      'polaroid transition-transform duration-500',
                      flippedPhoto === photo.id ? 'rotate-y-180' : ''
                    )}
                  >
                    {flippedPhoto === photo.id ? (
                      <div className="aspect-square bg-[#1A1A2E] flex items-center justify-center rotate-y-180">
                        <p className="font-['VT323'] text-white text-center p-2">
                          {photo.caption}
                        </p>
                      </div>
                    ) : (
                      <img 
                        src={photo.src}
                        alt={photo.caption}
                        className="w-full aspect-square object-cover pixel-art"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {prevChapter ? (
            <PixelButton 
              onClick={() => navigate(`/chapter/${prevChapter.id}`)}
              variant="secondary"
              size="sm"
            >
              ← PREV
            </PixelButton>
          ) : (
            <div />
          )}
          
          <span className="font-['Press_Start_2P'] text-xs text-white/50">
            {currentIndex + 1} / {chapters.length}
          </span>
          
          {nextChapter ? (
            <PixelButton 
              onClick={() => navigate(`/chapter/${nextChapter.id}`)}
              size="sm"
            >
              NEXT →
            </PixelButton>
          ) : (
            <div />
          )}
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default ChapterDetail;
