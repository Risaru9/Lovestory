import React, { useRef, useEffect, useCallback } from 'react';
import type { Heart, Particle, FloatingText } from '@/types/game';

interface GameCanvasProps {
  hearts: Heart[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  playerX: number;
  screenShake: number;
  screenFlip: boolean;
  hasShield: boolean;
  isPaused: boolean;
  onPlayerMove: (x: number) => void;
}

// Sprite mapping
const SPRITE_URLS: Record<string, string> = {
  good: '/images/sprites/heart_good.png',
  bad: '/images/sprites/heart_bad.png',
  golden: '/images/sprites/heart_golden.png',
  freeze: '/images/sprites/heart_freeze.png',
  speed: '/images/sprites/heart_speed.png',
  slow: '/images/sprites/heart_slow.png',
  bomb: '/images/sprites/heart_bomb.png',
  rainbow: '/images/sprites/heart_rainbow.png',
  magnet: '/images/sprites/heart_magnet.png',
  shield: '/images/sprites/heart_shield.png',
  player: '/images/sprites/player_basket.png'
};

// Glow colors for heart types
const GLOW_COLORS: Record<string, string> = {
  golden: '#FFD700',
  rainbow: '#FF00FF',
  freeze: '#00FFFF',
  speed: '#00FF00',
  bomb: '#FF0000',
  bad: '#4B0082',
  good: '#FF69B4',
  slow: '#8B4513',
  magnet: '#C0C0C0',
  shield: '#00BFFF'
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  hearts,
  particles,
  floatingTexts,
  playerX,
  screenShake,
  screenFlip,
  hasShield,
  isPaused,
  onPlayerMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadedSpritesRef = useRef<Set<string>>(new Set());

  // Load sprites
  useEffect(() => {
    Object.entries(SPRITE_URLS).forEach(([key, url]) => {
      if (!spritesRef.current.has(key)) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          loadedSpritesRef.current.add(key);
        };
        spritesRef.current.set(key, img);
      }
    });
  }, []);

  // Handle input
  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isPaused) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = clientX - rect.left;
    const percentX = (relativeX / rect.width) * 100;
    
    onPlayerMove(screenFlip ? 100 - percentX : percentX);
  }, [isPaused, onPlayerMove, screenFlip]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Render function
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply screen shake
      ctx.save();
      if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake * 2;
        const shakeY = (Math.random() - 0.5) * screenShake * 2;
        ctx.translate(shakeX, shakeY);
      }
      
      // Apply screen flip
      if (screenFlip) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      // Draw hearts
      hearts.forEach(heart => {
        const sprite = spritesRef.current.get(heart.type);
        if (sprite && loadedSpritesRef.current.has(heart.type)) {
          const x = (heart.x / 100) * canvas.width;
          const y = (heart.y / 100) * canvas.height;
          const size = 48 * heart.scale;
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((heart.rotation * Math.PI) / 180);
          
          // Draw glow for special hearts
          const glowColor = GLOW_COLORS[heart.type];
          if (glowColor) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20;
          }
          
          ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
      });

      // Draw player
      const playerSprite = spritesRef.current.get('player');
      if (playerSprite && loadedSpritesRef.current.has('player')) {
        const x = (playerX / 100) * canvas.width;
        const y = canvas.height - 80;
        const size = 64;
        
        ctx.save();
        
        // Draw shield if active
        if (hasShield) {
          ctx.beginPath();
          ctx.arc(x, y + size / 2, size * 0.8, 0, Math.PI * 2);
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.fillStyle = 'rgba(0, 191, 255, 0.2)';
          ctx.fill();
        }
        
        // Draw player basket
        ctx.shadowColor = '#FF69B4';
        ctx.shadowBlur = 15;
        ctx.drawImage(playerSprite, x - size / 2, y, size, size);
        ctx.restore();
      }

      // Draw particles
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        
        const x = (p.x / 100) * canvas.width;
        const y = (p.y / 100) * canvas.height;
        
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
        } else if (p.shape === 'star') {
          drawStar(ctx, x, y, 5, p.size, p.size / 2);
        }
        ctx.restore();
      });

      // Draw floating texts
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      floatingTexts.forEach(t => {
        const x = (t.x / 100) * canvas.width;
        const y = (t.y / 100) * canvas.height;
        
        ctx.save();
        ctx.globalAlpha = t.life;
        ctx.font = `bold ${20 * t.scale}px "Press Start 2P", monospace`;
        ctx.fillStyle = t.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(t.text, x, y);
        ctx.fillText(t.text, x, y);
        ctx.restore();
      });
      ctx.restore();

      // Draw pause overlay
      if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 40px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      ctx.restore();
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [hearts, particles, floatingTexts, playerX, screenShake, screenFlip, hasShield, isPaused]);

  // Helper function to draw stars
  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      style={{ 
        cursor: isPaused ? 'default' : 'none',
        imageRendering: 'pixelated'
      }}
    />
  );
};
