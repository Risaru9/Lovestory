import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-mixtapes';

interface Song {
  name: string;
  artist: string;
}

interface Mixtape {
  id: string;
  title: string;
  songs: Song[];
  createdAt: string;
  traded: boolean;
  tradedAt: string | null;
}

const loadMixtapes = (): Mixtape[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveMixtapes = (data: Mixtape[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

const EMPTY_SONGS: Song[] = Array.from({ length: 5 }, () => ({ name: '', artist: '' }));

const MixtapeTrading: React.FC = () => {
  const navigate = useNavigate();
  const [mixtapes, setMixtapes] = useState<Mixtape[]>(loadMixtapes);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSongs, setFormSongs] = useState<Song[]>(EMPTY_SONGS.map((s) => ({ ...s })));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    saveMixtapes(mixtapes);
  }, [mixtapes]);

  const updateSong = useCallback((index: number, field: 'name' | 'artist', value: string) => {
    setFormSongs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim()) return;
    const validSongs = formSongs.filter((s) => s.name.trim());
    if (validSongs.length === 0) return;

    const newMixtape: Mixtape = {
      id: `mixtape-${Date.now()}`,
      title: formTitle.trim(),
      songs: validSongs.map((s) => ({ name: s.name.trim(), artist: s.artist.trim() })),
      createdAt: new Date().toISOString(),
      traded: false,
      tradedAt: null,
    };

    setMixtapes((prev) => [newMixtape, ...prev]);
    setFormTitle('');
    setFormSongs(EMPTY_SONGS.map((s) => ({ ...s })));
    setShowForm(false);

    playSound(440, 0.08);
    setTimeout(() => playSound(554, 0.08), 80);
    setTimeout(() => playSound(659, 0.1), 160);
    setTimeout(() => playSound(880, 0.15), 240);

    try {
      await addRelationshipXP(5, 'trust');
    } catch (_e) { /* silent */ }
  }, [formTitle, formSongs]);

  const handleTrade = useCallback((id: string) => {
    setMixtapes((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, traded: !m.traded, tradedAt: !m.traded ? new Date().toISOString() : null }
          : m
      )
    );
    playSound(523, 0.1);
    setTimeout(() => playSound(784, 0.12), 100);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setMixtapes((prev) => prev.filter((m) => m.id !== id));
    playSound(220, 0.15);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    playSound(440, 0.06);
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

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
              MIXTAPE 📼
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {/* Top cassette visual */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 text-center">
          <div className="text-3xl mb-2 select-none">🎵📼🎵</div>
          <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">
            MIXTAPE TRADING
          </p>
          <p className="font-['VT323'] text-base text-[#a0a0b0] mt-1">
            Buat playlist kasete dan berikan ke pasanganmu
          </p>
        </div>

        {/* Create button */}
        <div className="flex justify-center">
          <PixelButton
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'secondary' : 'primary'}
            size="md"
            className="text-[9px]"
          >
            {showForm ? '✕ TUTUP FORM' : '+ BUAT MIXTAPE BARU'}
          </PixelButton>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-4">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ffb300]">MIXTAPE BARU</p>

            {/* Title */}
            <div>
              <label className="font-['VT323'] text-base text-[#a0a0b0] block mb-1">Judul Mixtape</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="contoh: Lagu Malam Kita..."
                maxLength={40}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 placeholder-[#a0a0b0]/50 focus:outline-none focus:border-[#ff69b4]"
              />
            </div>

            {/* Song slots */}
            <div className="space-y-3">
              {formSongs.map((song, i) => (
                <div key={i} className="bg-[#1a1a2a] border-4 border-[#000000] p-3">
                  <p className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-2">
                    {i < 3 ? 'SIDE A' : 'SIDE B'} — TRACK {i + 1}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={song.name}
                      onChange={(e) => updateSong(i, 'name', e.target.value)}
                      placeholder="Judul lagu"
                      maxLength={50}
                      className="flex-1 bg-[#0c0a18] border-2 border-[#000000] text-[#ffffff] font-['VT323'] text-base px-2 py-1.5 placeholder-[#a0a0b0]/40 focus:outline-none focus:border-[#ff69b4]"
                    />
                    <input
                      type="text"
                      value={song.artist}
                      onChange={(e) => updateSong(i, 'artist', e.target.value)}
                      placeholder="Artis"
                      maxLength={30}
                      className="w-1/3 bg-[#0c0a18] border-2 border-[#000000] text-[#ffffff] font-['VT323'] text-base px-2 py-1.5 placeholder-[#a0a0b0]/40 focus:outline-none focus:border-[#ff69b4]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <PixelButton
                onClick={handleCreate}
                variant="accent"
                size="md"
                disabled={!formTitle.trim() || formSongs.every((s) => !s.name.trim())}
                className="text-[9px]"
              >
                📼 BUAT MIXTAPE (+5 Trust XP)
              </PixelButton>
            </div>
          </div>
        )}

        {/* Mixtape list */}
        {mixtapes.length === 0 && !showForm && (
          <div className="bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-6 text-center">
            <p className="text-3xl mb-3 select-none">📼</p>
            <p className="font-['VT323'] text-lg text-[#a0a0b0]">
              Belum ada mixtape. Buat yang pertama!
            </p>
          </div>
        )}

        <div className="space-y-4">
          {mixtapes.map((mixtape) => (
            <div key={mixtape.id} className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] overflow-hidden">
              {/* Cassette card */}
              <button
                onClick={() => toggleExpand(mixtape.id)}
                className="w-full p-4 text-left hover:bg-[#1a1a2a] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Cassette visual with reels */}
                  <div className="shrink-0 w-16 h-10 bg-[#1a1a2a] border-2 border-[#000000] rounded-lg relative flex items-center justify-center gap-3">
                    {/* Left reel */}
                    <div className="w-3 h-3 rounded-full border-2 border-[#ff69b4] bg-[#0c0a18]" />
                    {/* Right reel */}
                    <div className="w-3 h-3 rounded-full border-2 border-[#ff69b4] bg-[#0c0a18]" />
                    {/* Tape window */}
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-[#0c0a18] border border-[#000000] rounded-sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-['Press_Start_2P'] text-[9px] text-[#ffffff] truncate">
                      {mixtape.title}
                    </p>
                    <p className="font-['VT323'] text-sm text-[#a0a0b0] mt-0.5">
                      {mixtape.songs.length} lagu · {formatTime(mixtape.createdAt)}
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {mixtape.traded && (
                      <span className="font-['Press_Start_2P'] text-[7px] text-[#ffb300]">TRADED 💝</span>
                    )}
                    <span className="font-['VT323'] text-sm text-[#a0a0b0]">
                      {expandedId === mixtape.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded song list */}
              {expandedId === mixtape.id && (
                <div className="border-t-4 border-[#000000] p-4 bg-[#1a1a2a] space-y-3">
                  {/* Side A */}
                  {mixtape.songs.slice(0, 3).length > 0 && (
                    <div>
                      <p className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-2">
                        ▶ SIDE A
                      </p>
                      {mixtape.songs.slice(0, 3).map((song, i) => (
                        <div key={i} className="flex items-baseline gap-2 py-1">
                          <span className="font-['VT323'] text-sm text-[#a0a0b0] shrink-0 w-4">{i + 1}.</span>
                          <span className="font-['VT323'] text-lg text-[#ffffff]">{song.name}</span>
                          {song.artist && (
                            <span className="font-['VT323'] text-base text-[#a0a0b0]">— {song.artist}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Side B */}
                  {mixtape.songs.slice(3).length > 0 && (
                    <div>
                      <p className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-2">
                        ▶ SIDE B
                      </p>
                      {mixtape.songs.slice(3).map((song, i) => (
                        <div key={i} className="flex items-baseline gap-2 py-1">
                          <span className="font-['VT323'] text-sm text-[#a0a0b0] shrink-0 w-4">{i + 4}.</span>
                          <span className="font-['VT323'] text-lg text-[#ffffff]">{song.name}</span>
                          {song.artist && (
                            <span className="font-['VT323'] text-base text-[#a0a0b0]">— {song.artist}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2 border-t-2 border-[#000000]">
                    <PixelButton
                      onClick={() => handleTrade(mixtape.id)}
                      variant={mixtape.traded ? 'secondary' : 'primary'}
                      size="sm"
                      className="text-[8px]"
                    >
                      {mixtape.traded ? '↩ TARIK KEMBALI' : '💝 BERIKAN KE PARTNER'}
                    </PixelButton>
                    <PixelButton
                      onClick={() => handleDelete(mixtape.id)}
                      variant="secondary"
                      size="sm"
                      className="text-[8px]"
                    >
                      🗑️ HAPUS
                    </PixelButton>
                  </div>

                  {mixtape.traded && mixtape.tradedAt && (
                    <p className="font-['VT323'] text-sm text-[#ffb300]">
                      Diberikan pada: {formatTime(mixtape.tradedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center pb-4">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            Setiap mixtape baru memberikan +5 Trust XP 🎵
          </p>
        </div>
      </div>
    </div>
  );
};

export default MixtapeTrading;
