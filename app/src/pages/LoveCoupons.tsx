import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-love-coupons';

interface Coupon {
  id: string;
  title: string;
  claimed: boolean;
  claimedAt: string | null;
  isCustom: boolean;
}

const DEFAULT_COUPONS: Omit<Coupon, 'id'>[] = [
  { title: 'Kupon Pijat Gratis 💆', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Pilih Film 🎬', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Sarapan di Tempat Tidur 🍳', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Jalan-Jalan Malam 🌙', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Pelukan 5 Menit 🤗', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Masak Bersama 🍳', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Bebas Marah 1 Hari 😇', claimed: false, claimedAt: null, isCustom: false },
  { title: 'Kupon Kencan Surprise 🎁', claimed: false, claimedAt: null, isCustom: false },
];

const createDefaultCoupons = (): Coupon[] =>
  DEFAULT_COUPONS.map((c, i) => ({
    ...c,
    id: `coupon-default-${i}`,
  }));

const loadCoupons = (): Coupon[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createDefaultCoupons();
  } catch {
    return createDefaultCoupons();
  }
};

const saveCoupons = (coupons: Coupon[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
};

const playSound = (freq: number = 440, duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_e) { /* silent */ }
};

const LoveCoupons: React.FC = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [claimAnim, setClaimAnim] = useState<string | null>(null);

  useEffect(() => {
    saveCoupons(coupons);
  }, [coupons]);

  const handleClaim = useCallback(async (id: string) => {
    const coupon = coupons.find((c) => c.id === id);
    if (!coupon) return;

    const wasClaimed = coupon.claimed;

    setCoupons((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              claimed: !c.claimed,
              claimedAt: !c.claimed ? new Date().toISOString() : null,
            }
          : c
      )
    );

    setClaimAnim(id);
    setTimeout(() => setClaimAnim(null), 500);

    if (!wasClaimed) {
      playSound(523, 0.1);
      setTimeout(() => playSound(784, 0.15), 100);
      try {
        await addRelationshipXP(10, 'trust');
      } catch (_e) { /* silent */ }
    } else {
      playSound(330, 0.1);
    }
  }, [coupons]);

  const handleAddCoupon = useCallback(() => {
    if (!newTitle.trim()) return;

    const newCoupon: Coupon = {
      id: `coupon-custom-${Date.now()}`,
      title: newTitle.trim(),
      claimed: false,
      claimedAt: null,
      isCustom: true,
    };

    setCoupons((prev) => [...prev, newCoupon]);
    setNewTitle('');
    setShowAdd(false);
    playSound(660, 0.1);
    setTimeout(() => playSound(880, 0.12), 100);
  }, [newTitle]);

  const handleDelete = useCallback((id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    playSound(220, 0.15);
  }, []);

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const claimedCount = coupons.filter((c) => c.claimed).length;

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              LOVE COUPONS 🎟️
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {/* Stats bar */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex justify-between items-center">
          <div>
            <p className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4]">KUPON DIKLAIM</p>
            <p className="font-['VT323'] text-xl text-[#ffb300]">{claimedCount} / {coupons.length}</p>
          </div>
          <PixelButton onClick={() => setShowAdd(!showAdd)} variant="accent" size="sm" className="text-[9px]">
            {showAdd ? '✕ BATAL' : '+ BUAT KUPON'}
          </PixelButton>
        </div>

        {/* Add custom coupon form */}
        {showAdd && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
            <p className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] mb-3">KUPON BARU</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCoupon()}
                placeholder="Nama kupon..."
                maxLength={50}
                className="flex-1 bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 placeholder-[#a0a0b0]/50 focus:outline-none focus:border-[#ff69b4]"
              />
              <PixelButton
                onClick={handleAddCoupon}
                variant="primary"
                size="sm"
                disabled={!newTitle.trim()}
                className="text-[9px]"
              >
                TAMBAH
              </PixelButton>
            </div>
          </div>
        )}

        {/* Coupon grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={[
                'relative border-4 shadow-[4px_4px_0_#000000] p-4 transition-all duration-200',
                coupon.claimed
                  ? 'bg-[#1a1a2a] border-[#000000] opacity-75'
                  : 'bg-[#1a1a2a] border-[#000000]',
                claimAnim === coupon.id ? 'scale-95' : '',
              ].join(' ')}
              style={{
                borderStyle: 'dashed',
              }}
            >
              {/* Perforated edge effect */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-4 h-4 rounded-full bg-[#0c0a18]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-4 h-4 rounded-full bg-[#0c0a18]" />

              <div className="flex justify-between items-start mb-2">
                <p className="font-['VT323'] text-xl text-[#ffffff] leading-tight pr-2">
                  {coupon.title}
                </p>
                {coupon.isCustom && (
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="font-['VT323'] text-sm text-[#a0a0b0] hover:text-[#ff69b4] shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>

              {coupon.claimed && coupon.claimedAt && (
                <p className="font-['VT323'] text-sm text-[#a0a0b0] mb-2">
                  Diklaim: {formatTime(coupon.claimedAt)}
                </p>
              )}

              <div className="flex justify-between items-center mt-2">
                <span
                  className={[
                    "font-['Press_Start_2P'] text-[7px]",
                    coupon.claimed ? 'text-[#ffb300]' : 'text-[#a0a0b0]',
                  ].join(' ')}
                >
                  {coupon.claimed ? 'SUDAH DIKLAIM ✓' : 'BELUM DIKLAIM'}
                </span>
                <button
                  onClick={() => handleClaim(coupon.id)}
                  className={[
                    "font-['Press_Start_2P'] text-[8px] px-3 py-1.5 border-2 border-[#000000] transition-colors",
                    coupon.claimed
                      ? 'bg-[#a0a0b0] text-[#000000] hover:bg-[#ffffff]'
                      : 'bg-[#ff69b4] text-[#ffffff] hover:bg-[#ff1493]',
                  ].join(' ')}
                >
                  {coupon.claimed ? 'UNDO' : 'KLAIM!'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pb-4">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            Setiap klaim memberikan +10 Trust XP 🤝
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoveCoupons;
