import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Scanlines } from '@/components/custom/Scanlines';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

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
import DatePlanner from '@/pages/DatePlanner';
import Achievements from '@/pages/Achievements';
import AuthPage from '@/pages/AuthPage';
import CoupleConnect from '@/pages/CoupleConnect';

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
// AUTH ROUTE: Hanya bisa diakses saat belum login
// ============================================================
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

// ============================================================
// CONNECT ROUTE: Hanya untuk user yang sudah login tapi belum connect
// ============================================================
const ConnectRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isConnected } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isConnected) return <Navigate to="/home" replace />;
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
        <Route path="/" element={<LoadingScreen />} />
        <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
        <Route path="/connect" element={<ConnectRoute><CoupleConnect /></ConnectRoute>} />

        {/* Protected Routes (Harus login + connected) */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/couple" element={<ProtectedRoute><Couple /></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
        <Route path="/chapter/:id" element={<ProtectedRoute><ChapterDetail /></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
        <Route path="/music" element={<ProtectedRoute><Music /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="/letter" element={<ProtectedRoute><Letter /></ProtectedRoute>} />
        <Route path="/dateplanner" element={<ProtectedRoute><DatePlanner /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
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
