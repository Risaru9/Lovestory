import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Scanlines } from '@/components/custom/Scanlines';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

// Pages
import LandingPage from '@/pages/LoadingScreen'; // LoadingScreen is now LandingPage
import Home from '@/pages/Home';
import Couple from '@/pages/Couple';
import Timeline from '@/pages/Timeline';
import ChapterDetail from '@/pages/ChapterDetail';
import Gallery from '@/pages/Gallery';
import Music from '@/pages/Music';
import Game from '@/pages/Game';
import Letter from '@/pages/Letter';
import DatePlanner from '@/pages/DatePlanner';
import MapTracker from '@/pages/MapTracker';
import Achievements from '@/pages/Achievements';
import AuthPage from '@/pages/AuthPage';
import CoupleConnect from '@/pages/CoupleConnect';
import CheckIn from '@/pages/CheckIn';
import Chat from '@/pages/Chat';
import TimeCapsule from '@/pages/TimeCapsule';
import QuizQuest from '@/pages/QuizQuest';
import DoodleCanvas from '@/pages/DoodleCanvas';
import FortuneWheel from '@/pages/FortuneWheel';
import DreamVault from '@/pages/DreamVault';
import ProfilePage from '@/pages/Profile';
import MobileOnly from '@/pages/MobileOnly';

// ============================================================
// Protected Route: Hanya bisa diakses setelah login & connected
// ============================================================
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isConnected } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <p className="font-['Press_Start_2P'] text-[#FF69B4] text-xs animate-pulse">
          LOADING...
        </p>
      </div>
    );
  }

  // Belum login → ke halaman auth
  if (!user) return <Navigate to="/auth" replace />;

  // Sudah login tapi belum connect dengan pasangan → ke halaman connect
  if (!isConnected) return <Navigate to="/connect" replace />;

  return <>{children}</>;
};

// ============================================================
// Profile Protected Route: Hanya butuh login (pairing bisa diatur di profile)
// ============================================================
const ProfileProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <p className="font-['Press_Start_2P'] text-[#FF69B4] text-xs animate-pulse">
          LOADING...
        </p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// ============================================================
// Mobile or Feature Wrapper: Batasi fitur game/chat ke native mobile app saja
// ============================================================
const MobileOrFeature: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Jika berjalan sebagai aplikasi native Android/iOS (Capacitor), buka fitur.
  // Jika dibuka lewat browser web biasa, arahkan ke halaman MobileOnly notice.
  if (Capacitor.isNativePlatform()) {
    return <>{children}</>;
  }
  return <MobileOnly />;
};

// ============================================================
// AUTH ROUTE: Hanya bisa diakses saat belum login
// ============================================================
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/profile" replace />;
  return <>{children}</>;
};

// ============================================================
// CONNECT ROUTE: Hanya untuk user yang sudah login tapi belum connect
// ============================================================
const ConnectRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isConnected } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isConnected) return <Navigate to="/profile" replace />;
  return <>{children}</>;
};

// ============================================================
// MAIN APP CONTENT
// ============================================================
function AppContent() {
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
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
        <Route path="/connect" element={<ConnectRoute><CoupleConnect /></ConnectRoute>} />
        
        {/* Profile Protected Route (Hanya butuh login) */}
        <Route path="/profile" element={<ProfileProtectedRoute><ProfilePage /></ProfileProtectedRoute>} />

        {/* Protected Gameplay Routes (Dibatasi di Web, Aktif di Native Mobile App) */}
        <Route path="/home" element={<ProtectedRoute><MobileOrFeature><Home /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/couple" element={<ProtectedRoute><MobileOrFeature><Couple /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute><MobileOrFeature><Timeline /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/chapter/:id" element={<ProtectedRoute><MobileOrFeature><ChapterDetail /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><MobileOrFeature><Gallery /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/music" element={<ProtectedRoute><MobileOrFeature><Music /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><MobileOrFeature><Game /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/letter" element={<ProtectedRoute><MobileOrFeature><Letter /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/dateplanner" element={<ProtectedRoute><MobileOrFeature><DatePlanner /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MobileOrFeature><MapTracker /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><MobileOrFeature><Achievements /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/checkin" element={<ProtectedRoute><MobileOrFeature><CheckIn /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><MobileOrFeature><Chat /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/timecapsule" element={<ProtectedRoute><MobileOrFeature><TimeCapsule /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/quizquest" element={<ProtectedRoute><MobileOrFeature><QuizQuest /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/doodle" element={<ProtectedRoute><MobileOrFeature><DoodleCanvas /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/fortunewheel" element={<ProtectedRoute><MobileOrFeature><FortuneWheel /></MobileOrFeature></ProtectedRoute>} />
        <Route path="/dreamvault" element={<ProtectedRoute><MobileOrFeature><DreamVault /></MobileOrFeature></ProtectedRoute>} />

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// ============================================================
// ROOT APP dengan AuthProvider wrapper
// ============================================================
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
