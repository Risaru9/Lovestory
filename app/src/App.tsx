import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Scanlines } from '@/components/custom/Scanlines';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import { useState, useEffect } from 'react';

// Pages
import LoadingScreen from '@/pages/LoadingScreen';
import Home from '@/pages/Home';
import Couple from '@/pages/Couple';
import Timeline from '@/pages/Timeline';
import ChapterDetail from '@/pages/ChapterDetail';
import Gallery from '@/pages/Gallery';
import Music from '@/pages/Music';
import Game from '@/pages/Game';
import Letter from '@/pages/Letter';
import InvitationLetter from '@/pages/InvitationLetter';
import Achievements from '@/pages/Achievements';

function App() {
  const [rainbowMode, setRainbowMode] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useKonamiCode(() => {
    setRainbowMode(true);
    setShowSecret(true);
    setTimeout(() => setShowSecret(false), 5000);
  });

  useEffect(() => {
    if (rainbowMode) {
      document.body.classList.add('rainbow-mode');
    } else {
      document.body.classList.remove('rainbow-mode');
    }
  }, [rainbowMode]);

  return (
    <Router>
      <div className={`min-h-screen bg-[#1A1A2E] ${rainbowMode ? 'rainbow-mode' : ''}`}>
        <Scanlines enabled={true} />
        
        {/* Secret Message */}
        {showSecret && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-[#FF69B4] border-4 border-white p-8 text-center animate-bounce">
            <h2 className="font-['Press_Start_2P'] text-white text-xl mb-4">
              🌈 SECRET UNLOCKED! 🌈
            </h2>
            <p className="font-['VT323'] text-white text-2xl">
              Kamu menemukan kode rahasia!<br/>
              Cintaku padamu tak terbatas! 💕
            </p>
          </div>
        )}
        
        <Routes>
          <Route path="/" element={<LoadingScreen />} />
          <Route path="/home" element={<Home />} />
          <Route path="/couple" element={<Couple />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/chapter/:id" element={<ChapterDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/music" element={<Music />} />
          <Route path="/game" element={<Game />} />
          <Route path="/letter" element={<Letter />} />
          <Route path="/invitationletter" element={<InvitationLetter />} />
          <Route path="/achievements" element={<Achievements />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
