import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { TypewriterText } from '@/components/custom/TypewriterText';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const Letter: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useLocalStorage('gameState', { replyLetter: '' });
  const [reply, setReply] = useState(gameState.replyLetter || '');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const letterContent = `Sayangku,

Tidak terasa kita sudah menjalani hubungan sejauh ini. Rasanya seperti baru kemarin kita bertemu, tapi sekaligus rasanya sudah mengenalmu seumur hidup.

Setiap hari bersamamu adalah berkat. Setiap tawa yang kita bagikan adalah harta yang tak ternilai. Setiap momen, baik suka maupun duka, telah membuat kita semakin kuat.

Terima kasih untuk cinta kamu yang memang terkadang naik turun, tapi aku memahaminya karena keadaan terkadang tidak selalu seperti yang kita inginkan, namun aku tetap berterimakasih dan menghargainya.

Terima kasih untuk dukunganmu di saat-saat sulit. Terima kasih untuk setiap senyum, pelukan, dan kata-kata manis yang selalu membuat hariku lebih cerah.

Aku berjanji akan terus mencintaimu, menghargaimu, dan berusaha menjadi yang terbaik untukmu. Ini bukan akhir, melainkan awal dari perjalanan yang lebih panjang.

sayang. Aku mencintaimu, hari ini, besok, dan selamanya.

Dengan segenap cintaku,
Aku 💕`;

  const handleSubmitReply = () => {
    setGameState({ ...gameState, replyLetter: reply });
    setIsSubmitted(true);
    setTimeout(() => setShowReplyForm(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      {/* Header */}
      <div className="bg-[#1A1A2E]/90 border-b-4 border-[#FF69B4] p-4">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            ← MENU
          </PixelButton>
          <h1 className="font-['Press_Start_2P'] text-lg text-white">
            LOVE LETTER
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Typewriter */}
        <div className="flex justify-center mb-8">
          <div className="text-6xl animate-bounce">📝</div>
        </div>

        {/* Letter Paper */}
        <div className="bg-[#FFF8DC] border-4 border-[#8B4513] p-8 shadow-lg">
          {/* Letterhead */}
          <div className="text-center mb-6">
            <h2 className="font-['Press_Start_2P'] text-sm text-[#8B4513] mb-2">
              SURAT CINTA
            </h2>
            <div className="w-24 h-1 bg-[#8B4513] mx-auto" />
          </div>

          {/* Letter Content */}
          <div className="font-['VT323'] text-xl text-[#1A1A2E] leading-relaxed whitespace-pre-line">
            <TypewriterText text={letterContent} speed={30} />
          </div>

          {/* Decorative hearts */}
          <div className="flex justify-center gap-2 mt-8">
            <span className="text-[#FF69B4] animate-pulse">💕</span>
            <span className="text-[#FF69B4] animate-pulse" style={{ animationDelay: '0.2s' }}>💕</span>
            <span className="text-[#FF69B4] animate-pulse" style={{ animationDelay: '0.4s' }}>💕</span>
          </div>
        </div>

        {/* Reply Section */}
        <div className="mt-8 text-center">
          {!showReplyForm ? (
            <PixelButton onClick={() => setShowReplyForm(true)}>
              💌 TULIS BALASAN
            </PixelButton>
          ) : (
            <div className="bg-[#1A1A2E] border-4 border-[#FF69B4] p-6">
              {!isSubmitted ? (
                <>
                  <h3 className="font-['Press_Start_2P'] text-sm text-white mb-4">
                    TULIS BALASANMU
                  </h3>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Tulis balasanmu di sini..."
                    className="w-full h-32 p-4 bg-[#0A0A1A] border-2 border-[#FF69B4] text-white font-['VT323'] text-lg resize-none focus:outline-none focus:border-[#FFD700]"
                  />
                  <div className="flex justify-center gap-4 mt-4">
                    <PixelButton onClick={() => setShowReplyForm(false)} variant="secondary" size="sm">
                      BATAL
                    </PixelButton>
                    <PixelButton onClick={handleSubmitReply} size="sm">
                      KIRIM 💕
                    </PixelButton>
                  </div>
                </>
              ) : (
                <div className="animate-bounce">
                  <p className="font-['Press_Start_2P'] text-lg text-[#FFD700]">
                    ✅ BALASAN TERSIMPAN!
                  </p>
                  <p className="font-['VT323'] text-white mt-2">
                    Terima kasih untuk balasannya sayang 💕
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Saved Reply */}
        {gameState.replyLetter && !showReplyForm && (
          <div className="mt-8 bg-[#FF69B4]/20 border-2 border-[#FF69B4] p-6">
            <h3 className="font-['Press_Start_2P'] text-xs text-[#FF69B4] mb-4">
              BALASANMU:
            </h3>
            <p className="font-['VT323'] text-white whitespace-pre-line">
              {gameState.replyLetter}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Letter;
