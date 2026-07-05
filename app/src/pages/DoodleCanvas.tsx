import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-doodle-canvas';
const GRID_SIZE = 16;
const CELL_SIZE = 20;

const PALETTE_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Blue', hex: '#0000ff' },
  { name: 'Green', hex: '#00ff00' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Pink', hex: '#ff69b4' },
  { name: 'Purple', hex: '#8b00ff' },
];

const EMPTY_COLOR = '';

interface SavedArtwork {
  id: string;
  name: string;
  grid: string[][];
  createdAt: string;
}

interface DoodleData {
  currentGrid: string[][];
  savedArtworks: SavedArtwork[];
}

const createEmptyGrid = (): string[][] =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY_COLOR));

const loadData = (): DoodleData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      currentGrid: parsed.currentGrid || createEmptyGrid(),
      savedArtworks: parsed.savedArtworks || [],
    };
  }
  return { currentGrid: createEmptyGrid(), savedArtworks: [] };
};

const saveData = (data: DoodleData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const playSaveSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
    osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.24);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (_e) { /* ignored */ }
};

const playClickSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_e) { /* ignored */ }
};

const DoodleCanvas: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DoodleData>(loadData);
  const [selectedColor, setSelectedColor] = useState(PALETTE_COLORS[6].hex); // Pink default
  const [isEraser, setIsEraser] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [artworkName, setArtworkName] = useState('');
  const [showReward, setShowReward] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [viewingArtwork, setViewingArtwork] = useState<SavedArtwork | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  const paintCell = useCallback((row: number, col: number) => {
    setData(prev => {
      const newGrid = prev.currentGrid.map(r => [...r]);
      newGrid[row][col] = isEraser ? EMPTY_COLOR : selectedColor;
      return { ...prev, currentGrid: newGrid };
    });
  }, [selectedColor, isEraser]);

  const handleCellMouseDown = (row: number, col: number) => {
    setIsPainting(true);
    paintCell(row, col);
    playClickSound();
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isPainting) {
      paintCell(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsPainting(false);
  };

  // Touch handling for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const row = element.getAttribute('data-row');
      const col = element.getAttribute('data-col');
      if (row !== null && col !== null) {
        paintCell(parseInt(row), parseInt(col));
      }
    }
  }, [paintCell]);

  const handleClearAll = () => {
    setData(prev => ({
      ...prev,
      currentGrid: createEmptyGrid(),
    }));
  };

  const handleSaveArtwork = async () => {
    const name = artworkName.trim() || `Artwork ${data.savedArtworks.length + 1}`;
    const artwork: SavedArtwork = {
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      grid: data.currentGrid.map(r => [...r]),
      createdAt: new Date().toISOString(),
    };

    setData(prev => ({
      ...prev,
      savedArtworks: [artwork, ...prev.savedArtworks],
    }));

    await addRelationshipXP(5, 'intimacy');
    playSaveSound();
    setArtworkName('');
    setShowReward(true);
    setTimeout(() => setShowReward(false), 3000);
  };

  const handleDeleteArtwork = (id: string) => {
    setData(prev => ({
      ...prev,
      savedArtworks: prev.savedArtworks.filter(a => a.id !== id),
    }));
  };

  const handleLoadArtwork = (artwork: SavedArtwork) => {
    setData(prev => ({
      ...prev,
      currentGrid: artwork.grid.map(r => [...r]),
    }));
    setViewingArtwork(null);
    setShowGallery(false);
  };

  // Render a mini grid preview
  const renderMiniGrid = (grid: string[][], size: number = 6) => {
    const cellSize = size;
    return (
      <div
        className="border-2 border-[#000000] inline-block"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell || '#0c0a18',
              }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              DOODLE DUET
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
              Gambarlah bersama pasanganmu
            </p>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Reward Notification */}
      {showReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121224] border-4 border-[#000000] p-4 text-center shadow-[4px_4px_0_#000000] animate-bounce w-[90%] max-w-sm">
          <div className="font-['Press_Start_2P'] text-[#ffb300] text-[9px] mb-2 font-bold">
            🎨 ARTWORK SAVED!
          </div>
          <p className="font-['VT323'] text-white text-lg font-bold">
            Karya tersimpan! +5 Intimacy XP 💖
          </p>
        </div>
      )}

      {/* Viewing Artwork Modal */}
      {viewingArtwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-6 max-w-md w-full space-y-4 text-center">
            <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold">
              {viewingArtwork.name}
            </h3>
            <p className="font-['VT323'] text-xs text-[#a0a0b0]">
              {new Date(viewingArtwork.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="flex justify-center">
              {renderMiniGrid(viewingArtwork.grid, 14)}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <PixelButton onClick={() => handleLoadArtwork(viewingArtwork)} size="sm" className="text-[8px]">
                📂 LOAD KE CANVAS
              </PixelButton>
              <PixelButton onClick={() => setViewingArtwork(null)} variant="secondary" size="sm" className="text-[8px]">
                TUTUP
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {/* Color Palette */}
        <div className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mr-2 select-none">
                WARNA:
              </span>
              {PALETTE_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => { setSelectedColor(c.hex); setIsEraser(false); }}
                  className={`w-8 h-8 border-2 transition-all ${
                    !isEraser && selectedColor === c.hex
                      ? 'border-[#ffb300] scale-110 shadow-[2px_2px_0_#000000]'
                      : 'border-[#000000] hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`font-['Press_Start_2P'] text-[7px] px-3 py-2 border-2 border-[#000000] transition-all select-none ${
                  isEraser
                    ? 'bg-[#ffb300] text-[#000000] shadow-[2px_2px_0_#000000]'
                    : 'bg-[#1a1a2a] text-[#a0a0b0] hover:bg-[#222235]'
                }`}
              >
                🧹 ERASER
              </button>
              <button
                onClick={handleClearAll}
                className="font-['Press_Start_2P'] text-[7px] px-3 py-2 border-2 border-[#000000] bg-[#1a1a2a] text-[#a0a0b0] hover:bg-[#222235] transition-all select-none"
              >
                🗑️ CLEAR
              </button>
            </div>
          </div>
          {/* Current tool indicator */}
          <div className="mt-2 flex items-center gap-2">
            <span className="font-['VT323'] text-sm text-[#a0a0b0] select-none">Tool saat ini:</span>
            {isEraser ? (
              <span className="font-['VT323'] text-sm text-[#ffb300]">🧹 Eraser</span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 border border-[#000000] inline-block" style={{ backgroundColor: selectedColor }} />
                <span className="font-['VT323'] text-sm text-[#ffffff]">
                  {PALETTE_COLORS.find(c => c.hex === selectedColor)?.name}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000] flex justify-center">
          <div
            ref={canvasRef}
            className="border-2 border-[#000000] select-none touch-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              cursor: isEraser ? 'crosshair' : 'pointer',
            }}
            onTouchMove={handleTouchMove}
          >
            {data.currentGrid.map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  data-row={ri}
                  data-col={ci}
                  onMouseDown={() => handleCellMouseDown(ri, ci)}
                  onMouseEnter={() => handleCellMouseEnter(ri, ci)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setIsPainting(true);
                    paintCell(ri, ci);
                    playClickSound();
                  }}
                  className="border border-[#1a1a2a]/30 hover:border-[#ff69b4]/50 transition-colors"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: cell || '#0c0a18',
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Save Section */}
        <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000]">
          <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-3 font-bold select-none">
            💾 SIMPAN KARYA
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={artworkName}
              onChange={(e) => setArtworkName(e.target.value)}
              placeholder="Nama artwork..."
              className="flex-1 px-3 py-2 bg-[#1a1a2a] border-2 border-[#000000] text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-lg placeholder-[#a0a0b0]/40"
            />
            <PixelButton onClick={handleSaveArtwork} size="sm" className="text-[8px] shrink-0">
              🎨 SAVE
            </PixelButton>
          </div>
        </div>

        {/* Gallery Toggle */}
        <div className="text-center">
          <PixelButton
            onClick={() => setShowGallery(!showGallery)}
            variant="secondary"
            size="sm"
            className="text-[8px]"
          >
            {showGallery ? '▲ TUTUP GALERI' : `▼ GALERI (${data.savedArtworks.length})`}
          </PixelButton>
        </div>

        {/* Gallery */}
        {showGallery && (
          <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000] space-y-4">
            <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold border-b-2 border-[#000000] pb-2 select-none">
              🖼️ GALERI ARTWORK
            </h3>

            {data.savedArtworks.length === 0 && (
              <div className="text-center py-6">
                <span className="text-3xl select-none block mb-2">🎨</span>
                <p className="font-['VT323'] text-base text-[#a0a0b0]">
                  Belum ada artwork tersimpan. Mulai menggambar!
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.savedArtworks.map(artwork => (
                <div
                  key={artwork.id}
                  className="bg-[#1a1a2a] border-2 border-[#000000] p-2 shadow-[2px_2px_0_#000000] cursor-pointer hover:border-[#ff69b4] transition-colors"
                  onClick={() => setViewingArtwork(artwork)}
                >
                  <div className="flex justify-center mb-2">
                    {renderMiniGrid(artwork.grid, 8)}
                  </div>
                  <p className="font-['Press_Start_2P'] text-[6px] text-[#ffffff] text-center truncate">
                    {artwork.name}
                  </p>
                  <p className="font-['VT323'] text-[10px] text-[#a0a0b0] text-center">
                    {new Date(artwork.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                  <div className="flex justify-center mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteArtwork(artwork.id); }}
                      className="font-['VT323'] text-[10px] text-[#a0a0b0] hover:text-[#ff69b4]"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DoodleCanvas;
