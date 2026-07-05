import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

type DreamStatus = 'impian' | 'dalam_proses' | 'tercapai';

interface Dream {
  id: string;
  title: string;
  description: string;
  category: string;
  status: DreamStatus;
  createdAt: string;
}

const STORAGE_KEY = 'lovestory-dream-vault';

const CATEGORIES = [
  { value: 'rumah', label: 'Rumah 🏠', icon: '🏠' },
  { value: 'liburan', label: 'Liburan ✈️', icon: '✈️' },
  { value: 'karier', label: 'Karier 💼', icon: '💼' },
  { value: 'keluarga', label: 'Keluarga 👨‍👩‍👧', icon: '👨‍👩‍👧' },
  { value: 'lainnya', label: 'Lainnya 🌟', icon: '🌟' },
];

const STATUS_CONFIG: Record<DreamStatus, { label: string; color: string; borderColor: string }> = {
  impian: { label: 'Impian', color: '#1a1a2a', borderColor: '#000000' },
  dalam_proses: { label: 'Dalam Proses', color: '#1a1a3a', borderColor: '#ff69b4' },
  tercapai: { label: 'Tercapai!', color: '#1a2a1a', borderColor: '#ffb300' },
};

const NEXT_STATUS: Record<DreamStatus, DreamStatus> = {
  impian: 'dalam_proses',
  dalam_proses: 'tercapai',
  tercapai: 'impian',
};

const playSound = (freq: number = 440, duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  } catch (e) { /* silent */ }
};

const loadDreams = (): Dream[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return [];
};

const saveDreams = (dreams: Dream[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
};

const getCategoryIcon = (category: string): string => {
  return CATEGORIES.find(c => c.value === category)?.icon || '🌟';
};

const DreamVault: React.FC = () => {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState<Dream[]>(loadDreams);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('rumah');

  useEffect(() => {
    saveDreams(dreams);
  }, [dreams]);

  const handleAddDream = useCallback(async () => {
    if (!title.trim()) return;

    playSound(523, 0.12);

    const newDream: Dream = {
      id: `dream-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      category,
      status: 'impian',
      createdAt: new Date().toISOString(),
    };

    setDreams(prev => [newDream, ...prev]);
    setTitle('');
    setDescription('');
    setCategory('rumah');
    setShowForm(false);

    // Award +10 Intimacy XP
    try { await addRelationshipXP(10, 'intimacy'); } catch { /* silent */ }
  }, [title, description, category]);

  const handleToggleStatus = useCallback(async (id: string) => {
    let becameTercapai = false;
    setDreams(prev => prev.map(d => {
      if (d.id !== id) return d;
      const nextStatus = NEXT_STATUS[d.status];
      if (nextStatus === 'tercapai') becameTercapai = true;
      return { ...d, status: nextStatus };
    }));

    if (becameTercapai) {
      playSound(784, 0.2);
      setTimeout(() => playSound(1047, 0.2), 150);
      // Award +20 Trust XP
      try { await addRelationshipXP(20, 'trust'); } catch { /* silent */ }
    } else {
      playSound(440, 0.1);
    }
  }, []);

  const handleDeleteDream = useCallback((id: string) => {
    playSound(220, 0.15);
    setDreams(prev => prev.filter(d => d.id !== id));
  }, []);

  const totalDreams = dreams.length;
  const achievedCount = dreams.filter(d => d.status === 'tercapai').length;

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
              DREAM VAULT
            </h1>
          </div>
          <PixelButton onClick={() => setShowForm(!showForm)} variant="primary" size="sm" className="text-[9px] shrink-0">
            {showForm ? '✕' : '+ NEW'}
          </PixelButton>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {/* Stats Bar */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <span className="font-['Press_Start_2P'] text-[8px] text-[#a0a0b0]">
              {totalDreams} IMPIAN
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="font-['Press_Start_2P'] text-[8px] text-[#ffb300]">
              {achievedCount} TERCAPAI
            </span>
          </div>
        </div>

        {/* Add Dream Form */}
        {showForm && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
            <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2">IMPIAN BARU</h2>

            <div>
              <label className="font-['VT323'] text-sm text-[#a0a0b0] block mb-1">Judul</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Mimpimu apa?"
                maxLength={60}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/40"
              />
            </div>

            <div>
              <label className="font-['VT323'] text-sm text-[#a0a0b0] block mb-1">Deskripsi</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ceritakan lebih detail..."
                maxLength={200}
                rows={3}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 outline-none focus:border-[#ff69b4] resize-none placeholder:text-[#a0a0b0]/40"
              />
            </div>

            <div>
              <label className="font-['VT323'] text-sm text-[#a0a0b0] block mb-1">Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 outline-none focus:border-[#ff69b4]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <PixelButton onClick={handleAddDream} variant="primary" size="sm" disabled={!title.trim()} className="text-[9px] flex-1">
                SIMPAN +10 XP
              </PixelButton>
              <PixelButton onClick={() => setShowForm(false)} variant="secondary" size="sm" className="text-[9px]">
                BATAL
              </PixelButton>
            </div>
          </div>
        )}

        {/* Dream Cards Grid */}
        {dreams.length === 0 ? (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-8 text-center">
            <div className="text-4xl mb-3">🌙</div>
            <p className="font-['Press_Start_2P'] text-[9px] text-[#a0a0b0] mb-2">BELUM ADA IMPIAN</p>
            <p className="font-['VT323'] text-base text-[#a0a0b0]">
              Tekan + NEW untuk menambah impian bersama
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dreams.map(dream => {
              const config = STATUS_CONFIG[dream.status];
              const isTercapai = dream.status === 'tercapai';
              return (
                <div
                  key={dream.id}
                  className="relative border-4 shadow-[4px_4px_0_#000000] p-4 transition-all duration-200"
                  style={{
                    backgroundColor: config.color,
                    borderColor: config.borderColor,
                  }}
                >
                  {/* Sparkle for Tercapai */}
                  {isTercapai && (
                    <div className="absolute -top-2 -right-2 text-lg animate-pulse">✨</div>
                  )}

                  {/* Category & Status */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xl">{getCategoryIcon(dream.category)}</span>
                    <button
                      onClick={() => handleToggleStatus(dream.id)}
                      className={[
                        'font-[\'Press_Start_2P\'] text-[7px] px-2 py-1 border-2 border-[#000000] transition-colors',
                        dream.status === 'impian' ? 'bg-[#0c0a18] text-[#a0a0b0] hover:bg-[#ff69b4] hover:text-[#000000]' : '',
                        dream.status === 'dalam_proses' ? 'bg-[#ff69b4] text-[#000000] hover:bg-[#ffb300]' : '',
                        dream.status === 'tercapai' ? 'bg-[#ffb300] text-[#000000] hover:bg-[#0c0a18] hover:text-[#a0a0b0]' : '',
                      ].join(' ')}
                    >
                      {config.label}
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className={[
                    "font-['Press_Start_2P'] text-[8px] leading-relaxed mb-2",
                    isTercapai ? 'text-[#ffb300]' : 'text-[#ffffff]',
                  ].join(' ')}>
                    {dream.title}
                  </h3>

                  {/* Description */}
                  {dream.description && (
                    <p className="font-['VT323'] text-sm text-[#a0a0b0] mb-3 leading-tight">
                      {dream.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-[#000000]/30">
                    <span className="font-['VT323'] text-xs text-[#a0a0b0]/60">
                      {new Date(dream.createdAt).toLocaleDateString('id-ID')}
                    </span>
                    <button
                      onClick={() => handleDeleteDream(dream.id)}
                      className="font-['VT323'] text-xs text-[#a0a0b0]/40 hover:text-[#ff69b4] transition-colors"
                    >
                      hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* XP Info */}
        <div className="bg-[#1a1a2a] border-4 border-[#000000] p-3 text-center">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            Tambah impian: +10 Intimacy XP · Tercapai: +20 Trust XP
          </p>
        </div>
      </div>
    </div>
  );
};

export default DreamVault;
